use std::collections::HashMap;
use std::fs;
use std::io;
use std::process;

// ============================================================================
// TYPE SYSTEM - Rust enums for discriminated union types
// ============================================================================

#[derive(Debug, Clone, PartialEq)]
pub enum TypeDef {
    Primitive(String),
    Optional(Box<TypeDef>),
    Union(Vec<TypeDef>),
}

#[derive(Debug, Clone)]
pub struct Location {
    pub line: usize,
    pub column: usize,
    pub source: String,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub token: String,
    pub location: Location,
}

// Type registry: static mapping of primitive types
fn type_registry() -> HashMap<&'static str, TypeDef> {
    let mut registry = HashMap::new();
    registry.insert("int", TypeDef::Primitive("int".to_string()));
    registry.insert("float", TypeDef::Primitive("float".to_string()));
    registry.insert("bool", TypeDef::Primitive("bool".to_string()));
    registry.insert("char", TypeDef::Primitive("char".to_string()));
    registry.insert("string", TypeDef::Primitive("string".to_string()));
    registry.insert("any", TypeDef::Primitive("any".to_string()));
    registry
}

fn parse_type_annotation(token: &str) -> TypeDef {
    let registry = type_registry();
    if let Some(t) = registry.get(token) {
        return t.clone();
    }
    if token.ends_with('?') {
        let inner = parse_type_annotation(&token[..token.len() - 1]);
        return TypeDef::Optional(Box::new(inner));
    }
    TypeDef::Primitive("any".to_string())
}

fn type_compatible(actual: &TypeDef, expected: &TypeDef) -> bool {
    match (actual, expected) {
        (_, TypeDef::Primitive(e)) if e == "any" => true,
        (TypeDef::Primitive(a), _) if a == "any" => true,
        (TypeDef::Primitive(a), TypeDef::Primitive(e)) => {
            if a == e {
                return true;
            }
            // Allow numeric conversions: int → float
            if a == "int" && e == "float" {
                return true;
            }
            // Allow char → string
            if a == "char" && e == "string" {
                return true;
            }
            false
        }
        (TypeDef::Union(a_types), TypeDef::Union(e_types)) => {
            a_types.iter().all(|t| {
                e_types.iter().any(|e| type_compatible(t, e))
            })
        }
        _ => false,
    }
}

// ============================================================================
// LEXER - Tokenizes Strata source code with location tracking
// ============================================================================

pub struct Lexer {
    input: Vec<char>,
    pos: usize,
    line: usize,
    column: usize,
    line_start: usize,
}

impl Lexer {
    pub fn new(input: &str) -> Self {
        Lexer {
            input: input.chars().collect(),
            pos: 0,
            line: 1,
            column: 1,
            line_start: 0,
        }
    }

    fn peek(&self) -> Option<char> {
        if self.pos < self.input.len() {
            Some(self.input[self.pos])
        } else {
            None
        }
    }

    fn peek_ahead(&self, offset: usize) -> Option<char> {
        let index = self.pos + offset;
        if index < self.input.len() {
            Some(self.input[index])
        } else {
            None
        }
    }

    fn advance(&mut self) -> Option<char> {
        if self.pos >= self.input.len() {
            return None;
        }
        let ch = self.input[self.pos];
        self.pos += 1;

        if ch == '\n' {
            self.line += 1;
            self.column = 1;
            self.line_start = self.pos;
        } else {
            self.column += 1;
        }
        Some(ch)
    }

    fn get_location(&self) -> Location {
        let source = self.input[self.line_start..self.pos]
            .iter()
            .collect::<String>();
        Location {
            line: self.line,
            column: self.column,
            source,
        }
    }

    pub fn next_token(&mut self) -> Result<Option<Token>, String> {
        // Skip whitespace
        while let Some(ch) = self.peek() {
            if ch == ' ' || ch == '\n' || ch == '\r' || ch == '\t' {
                self.advance();
            } else {
                break;
            }
        }

        // Skip comments
        if self.peek() == Some('/') && self.peek_ahead(1) == Some('/') {
            while let Some(ch) = self.peek() {
                if ch == '\n' {
                    break;
                }
                self.advance();
            }
            return self.next_token();
        }

        if self.peek().is_none() {
            return Ok(None);
        }

        let loc = self.get_location();

        // Multi-character operators
        let two_char_ops = vec![
            "==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--"
        ];
        let two_char: String = vec![
            self.peek().unwrap_or(' '),
            self.peek_ahead(1).unwrap_or(' ')
        ]
        .iter()
        .collect();

        if two_char_ops.contains(&two_char.as_str()) {
            self.advance();
            self.advance();
            return Ok(Some(Token {
                token: two_char,
                location: loc,
            }));
        }

        // Identifiers / keywords
        if let Some(ch) = self.peek() {
            if ch.is_alphabetic() || ch == '_' {
                let mut word = String::new();
                while let Some(ch) = self.peek() {
                    if ch.is_alphanumeric() || ch == '_' {
                        word.push(ch);
                        self.advance();
                    } else {
                        break;
                    }
                }
                return Ok(Some(Token {
                    token: word,
                    location: loc,
                }));
            }
        }

        // Strings
        if self.peek() == Some('"') {
            self.advance();
            let mut value = String::new();
            while self.peek().is_some() && self.peek() != Some('"') {
                if self.peek() == Some('\\') {
                    self.advance();
                    if let Some(next) = self.advance() {
                        let escaped = match next {
                            'n' => '\n',
                            't' => '\t',
                            _ => next,
                        };
                        value.push(escaped);
                    }
                } else if let Some(ch) = self.advance() {
                    value.push(ch);
                }
            }
            if self.peek() == Some('"') {
                self.advance();
            }
            return Ok(Some(Token {
                token: format!("\"{}\"", value),
                location: loc,
            }));
        }

        // Character literals
        if self.peek() == Some('\'') {
            self.advance();
            let mut value = String::new();
            while self.peek().is_some() && self.peek() != Some('\'') {
                if let Some(ch) = self.advance() {
                    value.push(ch);
                }
            }
            if self.peek() == Some('\'') {
                self.advance();
            }
            return Ok(Some(Token {
                token: format!("'{}'", value),
                location: loc,
            }));
        }

        // Numbers
        if let Some(ch) = self.peek() {
            if ch.is_numeric() {
                let mut num = String::new();
                while let Some(ch) = self.peek() {
                    if ch.is_numeric() {
                        num.push(ch);
                        self.advance();
                    } else {
                        break;
                    }
                }
                // Check for decimal point
                if self.peek() == Some('.') {
                    if let Some(next_ch) = self.peek_ahead(1) {
                        if next_ch.is_numeric() {
                            num.push('.');
                            self.advance();
                            while let Some(ch) = self.peek() {
                                if ch.is_numeric() {
                                    num.push(ch);
                                    self.advance();
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
                return Ok(Some(Token {
                    token: num,
                    location: loc,
                }));
            }
        }

        // Single-char symbols
        if let Some(ch) = self.advance() {
            return Ok(Some(Token {
                token: ch.to_string(),
                location: loc,
            }));
        }

        Ok(None)
    }
}

// ============================================================================
// AST NODES - Expressions and Statements as Rust enums
// ============================================================================

#[derive(Debug, Clone)]
pub enum Expr {
    Var {
        name: String,
        location: Location,
    },
    Number {
        value: f64,
        location: Location,
    },
    String {
        value: String,
        location: Location,
    },
    Bool {
        value: bool,
        location: Location,
    },
    Call {
        module: String,
        func: String,
        args: Vec<Expr>,
        location: Location,
    },
    Binary {
        op: String,
        left: Box<Expr>,
        right: Box<Expr>,
        location: Location,
    },
    Unary {
        op: String,
        arg: Box<Expr>,
        location: Location,
    },
    Tuple {
        elements: Vec<Expr>,
        location: Location,
    },
}

impl Expr {
    fn location(&self) -> &Location {
        match self {
            Expr::Var { location, .. }
            | Expr::Number { location, .. }
            | Expr::String { location, .. }
            | Expr::Bool { location, .. }
            | Expr::Call { location, .. }
            | Expr::Binary { location, .. }
            | Expr::Unary { location, .. }
            | Expr::Tuple { location, .. } => location,
        }
    }
}

#[derive(Debug, Clone)]
pub enum Stmt {
    Import {
        module: String,
        location: Location,
    },
    Func {
        name: String,
        params: Vec<(String, TypeDef)>,
        return_type: TypeDef,
        body: Vec<Stmt>,
        location: Location,
    },
    VarDecl {
        name: String,
        var_type: Option<TypeDef>,
        value: Option<Expr>,
        mutable: bool,
        location: Location,
    },
    If {
        condition: Expr,
        then_branch: Vec<Stmt>,
        else_branch: Option<Vec<Stmt>>,
        location: Location,
    },
    While {
        condition: Expr,
        body: Vec<Stmt>,
        location: Location,
    },
    For {
        init: Option<Box<Stmt>>,
        condition: Option<Expr>,
        update: Option<Box<Stmt>>,
        body: Vec<Stmt>,
        location: Location,
    },
    Break {
        location: Location,
    },
    Continue {
        location: Location,
    },
    Return {
        value: Option<Expr>,
        location: Location,
    },
    ExprStmt {
        expr: Expr,
        location: Location,
    },
}

impl Stmt {
    fn location(&self) -> &Location {
        match self {
            Stmt::Import { location, .. }
            | Stmt::Func { location, .. }
            | Stmt::VarDecl { location, .. }
            | Stmt::If { location, .. }
            | Stmt::While { location, .. }
            | Stmt::For { location, .. }
            | Stmt::Break { location, .. }
            | Stmt::Continue { location, .. }
            | Stmt::Return { location, .. }
            | Stmt::ExprStmt { location, .. } => location,
        }
    }
}

// ============================================================================
// PARSER - Recursive descent with operator precedence climbing
// ============================================================================

pub struct Parser {
    tokens: Vec<Token>,
    token_idx: usize,
}

impl Parser {
    pub fn new(mut lexer: Lexer) -> Result<Self, String> {
        let mut tokens = Vec::new();
        while let Some(token) = lexer.next_token()? {
            tokens.push(token);
        }
        Ok(Parser {
            tokens,
            token_idx: 0,
        })
    }

    fn current(&self) -> Option<&Token> {
        self.tokens.get(self.token_idx)
    }

    fn peek(&self, offset: usize) -> Option<&Token> {
        self.tokens.get(self.token_idx + offset)
    }

    fn advance(&mut self) {
        self.token_idx += 1;
    }

    fn expect(&mut self, expected: &str) -> Result<Location, String> {
        let current = self.current()
            .ok_or_else(|| format!("Expected '{}', got EOF", expected))?;
        if current.token != expected {
            return Err(format!(
                "Expected '{}', got '{}' at line {}",
                expected, current.token, current.location.line
            ));
        }
        let loc = current.location.clone();
        self.advance();
        Ok(loc)
    }

    fn error(&self, msg: &str) -> String {
        if let Some(current) = self.current() {
            format!(
                "Parse error at line {}, column {}: {}",
                current.location.line, current.location.column, msg
            )
        } else {
            format!("Parse error: {}", msg)
        }
    }

    fn match_token(&self, tokens: &[&str]) -> bool {
        if let Some(current) = self.current() {
            tokens.contains(&current.token.as_str())
        } else {
            false
        }
    }

    fn is_keyword(&self, word: &str) -> bool {
        matches!(
            word,
            "import" | "from" | "func" | "let" | "const" | "var" | "if" | "else"
                | "while" | "for" | "match" | "break" | "continue" | "return" | "true"
                | "false" | "int" | "float" | "bool" | "char" | "string" | "any" | "error"
        )
    }

    pub fn parse_program(&mut self) -> Result<Vec<Stmt>, String> {
        let mut stmts = Vec::new();
        while self.current().is_some() {
            stmts.push(self.parse_stmt()?);
        }
        Ok(stmts)
    }

    fn parse_stmt(&mut self) -> Result<Stmt, String> {
        let current = self.current()
            .ok_or_else(|| self.error("Unexpected EOF"))?;
        let loc = current.location.clone();

        match current.token.as_str() {
            "import" => {
                self.advance();
                let module = self.current()
                    .ok_or_else(|| self.error("Expected module name"))?
                    .token
                    .clone();
                self.advance();
                if self.match_token(&["from"]) {
                    self.advance();
                    self.advance(); // skip package root
                }
                Ok(Stmt::Import { module, location: loc })
            }
            "func" => {
                self.advance();
                let name = self.current()
                    .ok_or_else(|| self.error("Expected function name"))?
                    .token
                    .clone();
                self.advance();
                self.expect("(")?;

                let mut params = Vec::new();
                while !self.match_token(&[")"]) {
                    let param_name = self.current()
                        .ok_or_else(|| self.error("Expected parameter name"))?
                        .token
                        .clone();
                    self.advance();
                    self.expect(":")?;
                    let param_type = self.parse_type()?;
                    params.push((param_name, param_type));
                    if self.match_token(&[","]) {
                        self.advance();
                    }
                }
                self.expect(")")?;
                self.expect("=>")?;
                let return_type = self.parse_type()?;
                self.expect("{")?;

                let mut body = Vec::new();
                while !self.match_token(&["}"]) {
                    body.push(self.parse_stmt()?);
                }
                self.expect("}")?;

                Ok(Stmt::Func {
                    name,
                    params,
                    return_type,
                    body,
                    location: loc,
                })
            }
            "let" | "const" | "var" => {
                let mutable = current.token == "var";
                self.advance();
                let name = self.current()
                    .ok_or_else(|| self.error("Expected variable name"))?
                    .token
                    .clone();
                self.advance();

                let var_type = if self.match_token(&[":"]) {
                    self.advance();
                    Some(self.parse_type()?)
                } else {
                    None
                };

                let value = if self.match_token(&["="]) {
                    self.advance();
                    Some(self.parse_expr()?)
                } else {
                    None
                };

                Ok(Stmt::VarDecl {
                    name,
                    var_type,
                    value,
                    mutable,
                    location: loc,
                })
            }
            "if" => {
                self.advance();
                self.expect("(")?;
                let condition = self.parse_expr()?;
                self.expect(")")?;
                self.expect("{")?;

                let mut then_branch = Vec::new();
                while !self.match_token(&["}"]) {
                    then_branch.push(self.parse_stmt()?);
                }
                self.expect("}")?;

                let else_branch = if self.match_token(&["else"]) {
                    self.advance();
                    self.expect("{")?;
                    let mut branch = Vec::new();
                    while !self.match_token(&["}"]) {
                        branch.push(self.parse_stmt()?);
                    }
                    self.expect("}")?;
                    Some(branch)
                } else {
                    None
                };

                Ok(Stmt::If {
                    condition,
                    then_branch,
                    else_branch,
                    location: loc,
                })
            }
            "while" => {
                self.advance();
                self.expect("(")?;
                let condition = self.parse_expr()?;
                self.expect(")")?;
                self.expect("{")?;

                let mut body = Vec::new();
                while !self.match_token(&["}"]) {
                    body.push(self.parse_stmt()?);
                }
                self.expect("}")?;

                Ok(Stmt::While {
                    condition,
                    body,
                    location: loc,
                })
            }
            "for" => {
                self.advance();
                self.expect("(")?;

                let init = if !self.match_token(&[";"]) {
                    Some(Box::new(self.parse_stmt()?))
                } else {
                    self.advance();
                    None
                };

                let condition = if !self.match_token(&[";"]) {
                    Some(self.parse_expr()?)
                } else {
                    None
                };
                self.expect(";")?;

                let update = if !self.match_token(&[")"]) {
                    Some(Box::new(Stmt::ExprStmt {
                        expr: self.parse_expr()?,
                        location: self.current().unwrap().location.clone(),
                    }))
                } else {
                    None
                };
                self.expect(")")?;
                self.expect("{")?;

                let mut body = Vec::new();
                while !self.match_token(&["}"]) {
                    body.push(self.parse_stmt()?);
                }
                self.expect("}")?;

                Ok(Stmt::For {
                    init,
                    condition,
                    update,
                    body,
                    location: loc,
                })
            }
            "break" => {
                self.advance();
                Ok(Stmt::Break { location: loc })
            }
            "continue" => {
                self.advance();
                Ok(Stmt::Continue { location: loc })
            }
            "return" => {
                self.advance();
                let value = if !self.match_token(&["}"]) && self.current().is_some() {
                    Some(self.parse_expr()?)
                } else {
                    None
                };
                Ok(Stmt::Return { value, location: loc })
            }
            _ => {
                let expr = self.parse_expr()?;
                Ok(Stmt::ExprStmt {
                    expr,
                    location: loc,
                })
            }
        }
    }

    fn parse_type(&mut self) -> Result<TypeDef, String> {
        let token_str = self.current()
            .ok_or_else(|| self.error("Expected type"))?
            .token
            .clone();
        self.advance();
        Ok(parse_type_annotation(&token_str))
    }

    fn parse_expr(&mut self) -> Result<Expr, String> {
        self.parse_or()
    }

    fn parse_or(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_and()?;
        while self.match_token(&["||"]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let right = self.parse_and()?;
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
                location: loc,
            };
        }
        Ok(left)
    }

    fn parse_and(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_equality()?;
        while self.match_token(&["&&"]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let right = self.parse_equality()?;
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
                location: loc,
            };
        }
        Ok(left)
    }

    fn parse_equality(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_relational()?;
        while self.match_token(&["==", "!="]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let right = self.parse_relational()?;
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
                location: loc,
            };
        }
        Ok(left)
    }

    fn parse_relational(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_additive()?;
        while self.match_token(&["<", ">", "<=", ">="]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let right = self.parse_additive()?;
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
                location: loc,
            };
        }
        Ok(left)
    }

    fn parse_additive(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_multiplicative()?;
        while self.match_token(&["+", "-"]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let right = self.parse_multiplicative()?;
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
                location: loc,
            };
        }
        Ok(left)
    }

    fn parse_multiplicative(&mut self) -> Result<Expr, String> {
        let mut left = self.parse_unary()?;
        while self.match_token(&["*", "/", "%"]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let right = self.parse_unary()?;
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
                location: loc,
            };
        }
        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<Expr, String> {
        if self.match_token(&["!", "-", "+", "~"]) {
            let op = self.current().unwrap().token.clone();
            let loc = self.current().unwrap().location.clone();
            self.advance();
            let arg = self.parse_unary()?;
            return Ok(Expr::Unary {
                op,
                arg: Box::new(arg),
                location: loc,
            });
        }
        self.parse_call()
    }

    fn parse_call(&mut self) -> Result<Expr, String> {
        let mut expr = self.parse_primary()?;

        loop {
            if self.match_token(&["."]) {
                let loc = self.current().unwrap().location.clone();
                self.advance();
                let func = self.current()
                    .ok_or_else(|| self.error("Expected function name"))?
                    .token
                    .clone();
                self.advance();
                self.expect("(")?;

                let mut args = Vec::new();
                while !self.match_token(&[")"]) {
                    args.push(self.parse_expr()?);
                    if self.match_token(&[","]) {
                        self.advance();
                    }
                }
                self.expect(")")?;

                let module = match &expr {
                    Expr::Var { name, .. } => name.clone(),
                    _ => String::new(),
                };

                expr = Expr::Call {
                    module,
                    func,
                    args,
                    location: loc,
                };
            } else if self.match_token(&["("]) {
                if let Expr::Var { name, .. } = expr {
                    let loc = self.current().unwrap().location.clone();
                    self.advance();
                    let mut args = Vec::new();
                    while !self.match_token(&[")"]) {
                        args.push(self.parse_expr()?);
                        if self.match_token(&[","]) {
                            self.advance();
                        }
                    }
                    self.expect(")")?;

                    expr = Expr::Call {
                        module: String::new(),
                        func: name,
                        args,
                        location: loc,
                    };
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        Ok(expr)
    }

    fn parse_primary(&mut self) -> Result<Expr, String> {
        let current = self.current()
            .ok_or_else(|| self.error("Unexpected EOF"))?;
        let loc = current.location.clone();

        match current.token.as_str() {
            "(" => {
                self.advance();
                let expr = self.parse_expr()?;
                self.expect(")")?;
                Ok(expr)
            }
            "true" => {
                self.advance();
                Ok(Expr::Bool { value: true, location: loc })
            }
            "false" => {
                self.advance();
                Ok(Expr::Bool {
                    value: false,
                    location: loc,
                })
            }
            token => {
                if token.starts_with('"') {
                    self.advance();
                    let value = token[1..token.len() - 1].to_string();
                    Ok(Expr::String { value, location: loc })
                } else if token.starts_with('\'') {
                    self.advance();
                    let value = token[1..token.len() - 1].to_string();
                    Ok(Expr::String { value, location: loc })
                } else if let Ok(value) = token.parse::<f64>() {
                    self.advance();
                    Ok(Expr::Number { value, location: loc })
                } else if token.chars().next().map_or(false, |c| c.is_alphabetic() || c == '_') {
                    self.advance();
                    Ok(Expr::Var {
                        name: token.to_string(),
                        location: loc,
                    })
                } else {
                    Err(self.error(&format!("Unknown expression: {}", token)))
                }
            }
        }
    }
}

// ============================================================================
// TYPE CHECKER - Compile-time type validation
// ============================================================================

pub struct TypeChecker {
    errors: Vec<String>,
    type_map: HashMap<String, TypeDef>,
}

impl TypeChecker {
    pub fn new() -> Self {
        TypeChecker {
            errors: Vec::new(),
            type_map: HashMap::new(),
        }
    }

    pub fn check(&mut self, stmts: &[Stmt]) -> Vec<String> {
        for stmt in stmts {
            self.check_stmt(stmt);
        }
        self.errors.clone()
    }

    fn check_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::VarDecl {
                name,
                var_type,
                value,
                ..
            } => {
                if let Some(val_expr) = value {
                    let expr_type = self.infer_expr_type(val_expr);
                    let decl_type = var_type.clone().unwrap_or_else(|| expr_type.clone());
                    if !type_compatible(&expr_type, &decl_type) {
                        self.errors.push(format!(
                            "Type mismatch at line {}",
                            stmt.location().line
                        ));
                    }
                    self.type_map.insert(name.clone(), decl_type);
                }
            }
            Stmt::If { condition, .. } => self.check_expr(condition),
            Stmt::While { condition, .. } => self.check_expr(condition),
            Stmt::For { condition, .. } => {
                if let Some(cond) = condition {
                    self.check_expr(cond);
                }
            }
            Stmt::Func { body, .. } => {
                for s in body {
                    self.check_stmt(s);
                }
            }
            Stmt::ExprStmt { expr, .. } => self.check_expr(expr),
            _ => {}
        }
    }

    fn check_expr(&mut self, expr: &Expr) {
        match expr {
            Expr::Binary { left, right, .. } => {
                self.check_expr(left);
                self.check_expr(right);
            }
            Expr::Unary { arg, .. } => self.check_expr(arg),
            Expr::Call { args, .. } => {
                for arg in args {
                    self.check_expr(arg);
                }
            }
            _ => {}
        }
    }

    fn infer_expr_type(&self, expr: &Expr) -> TypeDef {
        match expr {
            Expr::Number { .. } => TypeDef::Primitive("float".to_string()),
            Expr::String { .. } => TypeDef::Primitive("string".to_string()),
            Expr::Bool { .. } => TypeDef::Primitive("bool".to_string()),
            Expr::Var { name, .. } => self.type_map
                .get(name)
                .cloned()
                .unwrap_or_else(|| TypeDef::Primitive("any".to_string())),
            Expr::Binary { op, left, right, .. } => {
                let left_type = self.infer_expr_type(left);
                let right_type = self.infer_expr_type(right);
                if matches!(op.as_str(), "==" | "!=" | "<" | ">" | "<=" | ">=" | "&&" | "||") {
                    TypeDef::Primitive("bool".to_string())
                } else {
                    match (&left_type, &right_type) {
                        (
                            TypeDef::Primitive(l),
                            TypeDef::Primitive(r),
                        ) if l == "float" || r == "float" => {
                            TypeDef::Primitive("float".to_string())
                        }
                        (TypeDef::Primitive(l), _) => {
                            TypeDef::Primitive(l.clone())
                        }
                        _ => TypeDef::Primitive("any".to_string()),
                    }
                }
            }
            Expr::Unary { op, arg, .. } => {
                if op == "!" {
                    TypeDef::Primitive("bool".to_string())
                } else {
                    self.infer_expr_type(arg)
                }
            }
            _ => TypeDef::Primitive("any".to_string()),
        }
    }
}

// ============================================================================
// VALUE and ENVIRONMENT - Variable scoping and binding
// ============================================================================

#[derive(Debug, Clone)]
pub struct Value {
    pub value: Option<f64>, // Simplified: store as f64 or null
    pub var_type: TypeDef,
    pub mutable: bool,
}

pub struct Environment {
    parent: Option<Box<Environment>>,
    variables: HashMap<String, Value>,
}

impl Environment {
    pub fn new() -> Self {
        Environment {
            parent: None,
            variables: HashMap::new(),
        }
    }

    pub fn with_parent(parent: Environment) -> Self {
        Environment {
            parent: Some(Box::new(parent)),
            variables: HashMap::new(),
        }
    }

    pub fn define(
        &mut self,
        name: String,
        value: Option<f64>,
        var_type: TypeDef,
        mutable: bool,
    ) {
        self.variables.insert(
            name,
            Value {
                value,
                var_type,
                mutable,
            },
        );
    }

    pub fn get(&self, name: &str) -> Option<f64> {
        if let Some(val) = self.variables.get(name) {
            val.value
        } else if let Some(parent) = &self.parent {
            parent.get(name)
        } else {
            None
        }
    }

    pub fn set(&mut self, name: &str, value: Option<f64>) -> Result<(), String> {
        if let Some(v) = self.variables.get_mut(name) {
            if !v.mutable {
                return Err(format!("Cannot reassign immutable variable: {}", name));
            }
            v.value = value;
            Ok(())
        } else if let Some(parent) = &mut self.parent {
            parent.set(name, value)
        } else {
            Err(format!("Undefined variable: {}", name))
        }
    }

    pub fn exists(&self, name: &str) -> bool {
        self.variables.contains_key(name)
            || self.parent.as_ref().map_or(false, |p| p.exists(name))
    }
}

// ============================================================================
// INTERPRETER - AST execution engine
// ============================================================================

#[derive(Debug, Clone)]
enum ControlFlow {
    None,
    Break,
    Continue,
    Return(Option<f64>),
}

pub struct Interpreter {
    env: Environment,
    modules: HashMap<String, String>, // Store imported module names
    control_flow: ControlFlow,
}

impl Interpreter {
    pub fn new() -> Self {
        Interpreter {
            env: Environment::new(),
            modules: HashMap::new(),
            control_flow: ControlFlow::None,
        }
    }

    pub fn run(&mut self, stmts: &[Stmt]) -> Result<(), String> {
        for stmt in stmts {
            self.exec_stmt(stmt)?;
            if !matches!(self.control_flow, ControlFlow::None) {
                break;
            }
        }
        Ok(())
    }

    fn exec_stmt(&mut self, stmt: &Stmt) -> Result<(), String> {
        if !matches!(self.control_flow, ControlFlow::None) {
            return Ok(());
        }

        match stmt {
            Stmt::Import { module, .. } => {
                let module_name = if module.starts_with("str.") {
                    module.clone()
                } else {
                    format!("str.{}", module)
                };
                self.modules.insert(module.clone(), module_name);
            }
            Stmt::VarDecl {
                name,
                var_type,
                value,
                mutable,
                ..
            } => {
                let val = value.as_ref().map(|v| self.eval_expr(v)).transpose()?;
                let var_t = var_type.clone().unwrap_or(TypeDef::Primitive("any".to_string()));
                self.env.define(name.clone(), val, var_t, *mutable);
            }
            Stmt::If {
                condition,
                then_branch,
                else_branch,
                ..
            } => {
                if self.is_truthy(self.eval_expr(condition)?) {
                    for s in then_branch {
                        self.exec_stmt(s)?;
                        if !matches!(self.control_flow, ControlFlow::None) {
                            break;
                        }
                    }
                } else if let Some(branch) = else_branch {
                    for s in branch {
                        self.exec_stmt(s)?;
                        if !matches!(self.control_flow, ControlFlow::None) {
                            break;
                        }
                    }
                }
            }
            Stmt::While { condition, body, .. } => {
                while self.is_truthy(self.eval_expr(condition)?) {
                    for s in body {
                        self.exec_stmt(s)?;
                        if !matches!(self.control_flow, ControlFlow::None) {
                            break;
                        }
                    }
                    match self.control_flow {
                        ControlFlow::Break => {
                            self.control_flow = ControlFlow::None;
                            break;
                        }
                        ControlFlow::Continue => {
                            self.control_flow = ControlFlow::None;
                            continue;
                        }
                        _ => {}
                    }
                }
            }
            Stmt::For {
                init,
                condition,
                update,
                body,
                ..
            } => {
                if let Some(init_stmt) = init {
                    self.exec_stmt(init_stmt)?;
                }

                loop {
                    if let Some(cond) = condition {
                        if !self.is_truthy(self.eval_expr(cond)?) {
                            break;
                        }
                    }

                    for s in body {
                        self.exec_stmt(s)?;
                        if !matches!(self.control_flow, ControlFlow::None) {
                            break;
                        }
                    }

                    match self.control_flow {
                        ControlFlow::Break => {
                            self.control_flow = ControlFlow::None;
                            break;
                        }
                        ControlFlow::Continue => {
                            self.control_flow = ControlFlow::None;
                        }
                        _ => {}
                    }

                    if let Some(update_stmt) = update {
                        self.exec_stmt(update_stmt)?;
                    }
                }
            }
            Stmt::Break { .. } => {
                self.control_flow = ControlFlow::Break;
            }
            Stmt::Continue { .. } => {
                self.control_flow = ControlFlow::Continue;
            }
            Stmt::Return { value, .. } => {
                let val = value.as_ref().map(|v| self.eval_expr(v)).transpose()?;
                self.control_flow = ControlFlow::Return(val);
            }
            Stmt::ExprStmt { expr, .. } => {
                self.eval_expr(expr)?;
            }
            Stmt::Func { .. } => {
                // Function definitions would be stored in environment
            }
            _ => {}
        }
        Ok(())
    }

    fn eval_expr(&self, expr: &Expr) -> Result<f64, String> {
        match expr {
            Expr::Number { value, .. } => Ok(*value),
            Expr::String { value, .. } => {
                // Strings represented as NaN for simplicity in this impl
                Ok(f64::NAN)
            }
            Expr::Bool { value, .. } => Ok(if *value { 1.0 } else { 0.0 }),
            Expr::Var { name, .. } => {
                self.env
                    .get(name)
                    .ok_or_else(|| format!("Undefined variable: {}", name))
            }
            Expr::Call {
                module,
                func,
                args,
                ..
            } => {
                // Standard library calls
                let mod_name = if module.starts_with("str.") {
                    module.clone()
                } else {
                    format!("str.{}", module)
                };

                match mod_name.as_str() {
                    "str.math" => {
                        let arg_vals: Result<Vec<_>, _> = args.iter().map(|a| self.eval_expr(a)).collect();
                        let arg_vals = arg_vals?;
                        match func.as_str() {
                            "sqrt" => Ok(arg_vals.get(0).copied().unwrap_or(0.0).sqrt()),
                            "pow" => {
                                let base = arg_vals.get(0).copied().unwrap_or(0.0);
                                let exp = arg_vals.get(1).copied().unwrap_or(0.0);
                                Ok(base.powf(exp))
                            }
                            "abs" => Ok(arg_vals.get(0).copied().unwrap_or(0.0).abs()),
                            "floor" => Ok(arg_vals.get(0).copied().unwrap_or(0.0).floor()),
                            "ceil" => Ok(arg_vals.get(0).copied().unwrap_or(0.0).ceil()),
                            "random" => Ok(rand::random::<f64>()),
                            _ => Err(format!("Unknown math function: {}", func)),
                        }
                    }
                    "str.text" => {
                        // Text operations simplified
                        Ok(f64::NAN)
                    }
                    "str.util" => {
                        match func.as_str() {
                            "randomInt" => {
                                let max = args.get(0).map(|a| self.eval_expr(a).unwrap_or(0.0)).unwrap_or(0.0);
                                Ok((rand::random::<f64>() * max).floor())
                            }
                            _ => Err(format!("Unknown util function: {}", func)),
                        }
                    }
                    "str.io" => {
                        match func.as_str() {
                            "print" | "println" => {
                                for arg in args {
                                    match arg {
                                        Expr::String { value, .. } => print!("{} ", value),
                                        _ => print!("{} ", self.eval_expr(arg).unwrap_or(0.0)),
                                    }
                                }
                                println!();
                                Ok(0.0)
                            }
                            _ => Err(format!("Unknown io function: {}", func)),
                        }
                    }
                    _ => Err(format!("Module not imported: {}", module)),
                }
            }
            Expr::Binary {
                op, left, right, ..
            } => {
                let l = self.eval_expr(left)?;
                let r = self.eval_expr(right)?;
                match op.as_str() {
                    "+" => Ok(l + r),
                    "-" => Ok(l - r),
                    "*" => Ok(l * r),
                    "/" => Ok(l / r),
                    "%" => Ok(l % r),
                    "==" => Ok(if (l - r).abs() < f64::EPSILON { 1.0 } else { 0.0 }),
                    "!=" => Ok(if (l - r).abs() < f64::EPSILON { 0.0 } else { 1.0 }),
                    "<" => Ok(if l < r { 1.0 } else { 0.0 }),
                    ">" => Ok(if l > r { 1.0 } else { 0.0 }),
                    "<=" => Ok(if l <= r { 1.0 } else { 0.0 }),
                    ">=" => Ok(if l >= r { 1.0 } else { 0.0 }),
                    "&&" => Ok(if self.is_truthy(l) && self.is_truthy(r) { 1.0 } else { 0.0 }),
                    "||" => Ok(if self.is_truthy(l) || self.is_truthy(r) { 1.0 } else { 0.0 }),
                    _ => Err(format!("Unknown operator: {}", op)),
                }
            }
            Expr::Unary { op, arg, .. } => {
                let a = self.eval_expr(arg)?;
                match op.as_str() {
                    "-" => Ok(-a),
                    "+" => Ok(a),
                    "!" => Ok(if self.is_truthy(a) { 0.0 } else { 1.0 }),
                    "~" => Ok((a as i64) as f64),
                    _ => Err(format!("Unknown unary operator: {}", op)),
                }
            }
            Expr::Tuple { .. } => Ok(f64::NAN),
        }
    }

    fn is_truthy(&self, value: f64) -> bool {
        !value.is_nan() && value != 0.0 && value != -0.0
    }
}

// ============================================================================
// C CODE GENERATOR - AST to C transpilation
// ============================================================================

pub struct CGenerator {
    lines: Vec<String>,
    declared_vars: std::collections::HashSet<String>,
    indent: usize,
}

impl CGenerator {
    pub fn new() -> Self {
        CGenerator {
            lines: Vec::new(),
            declared_vars: std::collections::HashSet::new(),
            indent: 0,
        }
    }

    pub fn generate(&mut self, stmts: &[Stmt]) -> String {
        self.lines.push("#include <stdio.h>".to_string());
        self.lines.push("#include <math.h>".to_string());
        self.lines.push("#include <stdbool.h>".to_string());
        self.lines.push(String::new());
        self.lines.push("int main() {".to_string());
        self.indent += 1;

        for stmt in stmts {
            self.emit_stmt(stmt);
        }

        self.indent -= 1;
        self.lines.push("  return 0;".to_string());
        self.lines.push("}".to_string());

        self.lines.join("\n")
    }

    fn emit_stmt(&mut self, stmt: &Stmt) {
        let ind = "  ".repeat(self.indent);
        match stmt {
            Stmt::VarDecl {
                name,
                var_type,
                value,
                ..
            } => {
                let type_str = self.type_to_c(var_type.as_ref());
                let init = value
                    .as_ref()
                    .map(|v| format!(" = {}", self.emit_expr(v)))
                    .unwrap_or_default();
                self.lines
                    .push(format!("{}{} {}{};", ind, type_str, name, init));
                self.declared_vars.insert(name.clone());
            }
            Stmt::If {
                condition,
                then_branch,
                else_branch,
                ..
            } => {
                let cond = self.emit_expr(condition);
                self.lines.push(format!("{}if ({}) {{", ind, cond));
                self.indent += 1;
                for s in then_branch {
                    self.emit_stmt(s);
                }
                self.indent -= 1;
                if let Some(branch) = else_branch {
                    self.lines.push(format!("{}}} else {{", ind));
                    self.indent += 1;
                    for s in branch {
                        self.emit_stmt(s);
                    }
                    self.indent -= 1;
                }
                self.lines.push(format!("{}}}", ind));
            }
            Stmt::While { condition, body, .. } => {
                let cond = self.emit_expr(condition);
                self.lines.push(format!("{}while ({}) {{", ind, cond));
                self.indent += 1;
                for s in body {
                    self.emit_stmt(s);
                }
                self.indent -= 1;
                self.lines.push(format!("{}}}", ind));
            }
            Stmt::For {
                init,
                condition,
                update,
                body,
                ..
            } => {
                let init_str = init
                    .as_ref()
                    .and_then(|i| {
                        if let Stmt::VarDecl {
                            name,
                            var_type,
                            value,
                            ..
                        } = &**i
                        {
                            let t = self.type_to_c(var_type.as_ref());
                            let v = value
                                .as_ref()
                                .map(|vv| format!(" = {}", self.emit_expr(vv)))
                                .unwrap_or_default();
                            Some(format!("{} {}{}", t, name, v))
                        } else {
                            None
                        }
                    })
                    .unwrap_or_default();

                let cond_str = condition
                    .as_ref()
                    .map(|c| self.emit_expr(c))
                    .unwrap_or_else(|| "1".to_string());

                let upd_str = update
                    .as_ref()
                    .and_then(|u| {
                        if let Stmt::ExprStmt { expr, .. } = &**u {
                            Some(self.emit_expr(expr))
                        } else {
                            None
                        }
                    })
                    .unwrap_or_default();

                self.lines.push(format!(
                    "{}for ({}; {}; {}) {{",
                    ind, init_str, cond_str, upd_str
                ));
                self.indent += 1;
                for s in body {
                    self.emit_stmt(s);
                }
                self.indent -= 1;
                self.lines.push(format!("{}}}", ind));
            }
            Stmt::Break { .. } => {
                self.lines.push(format!("{}break;", ind));
            }
            Stmt::Continue { .. } => {
                self.lines.push(format!("{}continue;", ind));
            }
            Stmt::Return { value, .. } => {
                if let Some(val) = value {
                    self.lines.push(format!("{}return {};", ind, self.emit_expr(val)));
                } else {
                    self.lines.push(format!("{}return;", ind));
                }
            }
            Stmt::ExprStmt { expr, .. } => {
                self.lines.push(format!("{}{};", ind, self.emit_expr(expr)));
            }
            _ => {}
        }
    }

    fn emit_expr(&self, expr: &Expr) -> String {
        match expr {
            Expr::Number { value, .. } => (*value as i64).to_string(),
            Expr::String { value, .. } => format!("\"{}\"", value),
            Expr::Bool { value, .. } => if *value { "true" } else { "false" }.to_string(),
            Expr::Var { name, .. } => name.clone(),
            Expr::Binary {
                op, left, right, ..
            } => {
                let l = self.emit_expr(left);
                let r = self.emit_expr(right);
                format!("({} {} {})", l, op, r)
            }
            Expr::Unary { op, arg, .. } => {
                let a = self.emit_expr(arg);
                format!("{}{}", op, a)
            }
            Expr::Call {
                module, func, args, ..
            } => {
                let arg_strs = args
                    .iter()
                    .map(|a| self.emit_expr(a))
                    .collect::<Vec<_>>()
                    .join(", ");
                if module == "math" {
                    format!("{}({})", func, arg_strs)
                } else if module == "io" && func == "print" {
                    format!("printf(\"%d\\n\", {})", arg_strs)
                } else {
                    "0".to_string()
                }
            }
            _ => "0".to_string(),
        }
    }

    fn type_to_c(&self, var_type: Option<&TypeDef>) -> String {
        match var_type {
            Some(TypeDef::Primitive(p)) => match p.as_str() {
                "int" => "int",
                "float" => "float",
                "bool" => "bool",
                "char" => "char",
                "string" => "char*",
                _ => "int",
            }
            .to_string(),
            _ => "int".to_string(),
        }
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let file = if args.len() > 1 {
        args[1].clone()
    } else {
        "myprogram.str".to_string()
    };

    match fs::read_to_string(&file) {
        Ok(source) => {
            let lexer = Lexer::new(&source);
            match Parser::new(lexer) {
                Ok(mut parser) => match parser.parse_program() {
                    Ok(program) => {
                        // Type check
                        let mut checker = TypeChecker::new();
                        let type_errors = checker.check(&program);
                        if !type_errors.is_empty() {
                            eprintln!("Type errors:");
                            for error in &type_errors {
                                eprintln!("  {}", error);
                            }
                            process::exit(1);
                        }

                        // Run interpreter
                        let mut interpreter = Interpreter::new();
                        if let Err(e) = interpreter.run(&program) {
                            eprintln!("Error: {}", e);
                            process::exit(1);
                        }

                        // Generate C code
                        let mut cgen = CGenerator::new();
                        let c_code = cgen.generate(&program);
                        if let Err(e) = fs::write("out.c", c_code) {
                            eprintln!("Error writing C code: {}", e);
                            process::exit(1);
                        }
                        println!("✓ C code generated: out.c");
                    }
                    Err(e) => {
                        eprintln!("Error: {}", e);
                        process::exit(1);
                    }
                },
                Err(e) => {
                    eprintln!("Error: {}", e);
                    process::exit(1);
                }
            }
        }
        Err(e) => {
            eprintln!("Error reading file: {}", e);
            process::exit(1);
        }
    }
}

// Note: This Rust implementation uses rand crate for random numbers.
// For demo purposes without external deps, use a simple PRNG or remove random functions.
// Add to Cargo.toml: rand = "0.8"
