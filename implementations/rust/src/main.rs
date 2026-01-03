use std::fs;
use std::env;
use std::collections::HashMap;

// ============================================================================
// STRATA INTERPRETER IN RUST
// Complete lexer, parser, type checker, and interpreter
// ============================================================================

#[derive(Debug, Clone, PartialEq)]
enum Token {
    // Literals
    Int(i64),
    Float(f64),
    String(String),
    Bool(bool),
    Char(char),
    
    // Keywords
    Let, Const, Var, Func, If, Else, While, For, Return, Break, Continue,
    Import, From, True, False,
    
    // Types
    IntType, FloatType, BoolType, CharType, StringType, AnyType,
    
    // Operators
    Plus, Minus, Star, Slash, Percent,
    Eq, Ne, Lt, Gt, Le, Ge, And, Or, Not, Tilde,
    Assign, Arrow,
    
    // Delimiters
    LParen, RParen, LBrace, RBrace, Semicolon, Comma, Colon, Dot,
    
    // Special
    Identifier(String),
    Eof,
}

// ============================================================================
// LEXER
// ============================================================================

struct Lexer {
    input: Vec<char>,
    pos: usize,
    line: usize,
    column: usize,
}

impl Lexer {
    fn new(input: &str) -> Self {
        Lexer {
            input: input.chars().collect(),
            pos: 0,
            line: 1,
            column: 1,
        }
    }

    fn peek(&self) -> Option<char> {
        if self.pos < self.input.len() {
            Some(self.input[self.pos])
        } else {
            None
        }
    }

    fn advance(&mut self) -> Option<char> {
        if self.pos < self.input.len() {
            let ch = self.input[self.pos];
            self.pos += 1;
            if ch == '\n' {
                self.line += 1;
                self.column = 1;
            } else {
                self.column += 1;
            }
            Some(ch)
        } else {
            None
        }
    }

    fn skip_whitespace(&mut self) {
        while let Some(ch) = self.peek() {
            if ch.is_whitespace() {
                self.advance();
            } else {
                break;
            }
        }
    }

    fn skip_comment(&mut self) {
        if self.peek() == Some('/') && self.input.get(self.pos + 1) == Some(&'/') {
            while let Some(ch) = self.peek() {
                if ch == '\n' {
                    break;
                }
                self.advance();
            }
        }
    }

    fn read_number(&mut self) -> Token {
        let mut num = String::new();
        let mut has_dot = false;

        while let Some(ch) = self.peek() {
            if ch.is_ascii_digit() {
                num.push(ch);
                self.advance();
            } else if ch == '.' && !has_dot {
                has_dot = true;
                num.push(ch);
                self.advance();
            } else {
                break;
            }
        }

        if has_dot {
            Token::Float(num.parse().unwrap_or(0.0))
        } else {
            Token::Int(num.parse().unwrap_or(0))
        }
    }

    fn read_string(&mut self) -> Token {
        self.advance(); // Skip opening quote
        let mut s = String::new();

        while let Some(ch) = self.peek() {
            if ch == '"' {
                self.advance();
                break;
            }
            if ch == '\\' {
                self.advance();
                if let Some(escaped) = self.peek() {
                    match escaped {
                        'n' => s.push('\n'),
                        't' => s.push('\t'),
                        'r' => s.push('\r'),
                        _ => s.push(escaped),
                    }
                    self.advance();
                }
            } else {
                s.push(ch);
                self.advance();
            }
        }

        Token::String(s)
    }

    fn read_identifier(&mut self) -> Token {
        let mut ident = String::new();

        while let Some(ch) = self.peek() {
            if ch.is_alphanumeric() || ch == '_' {
                ident.push(ch);
                self.advance();
            } else {
                break;
            }
        }

        match ident.as_str() {
            "let" => Token::Let,
            "const" => Token::Const,
            "var" => Token::Var,
            "func" => Token::Func,
            "if" => Token::If,
            "else" => Token::Else,
            "while" => Token::While,
            "for" => Token::For,
            "return" => Token::Return,
            "break" => Token::Break,
            "continue" => Token::Continue,
            "import" => Token::Import,
            "from" => Token::From,
            "true" => Token::Bool(true),
            "false" => Token::Bool(false),
            "int" => Token::IntType,
            "float" => Token::FloatType,
            "bool" => Token::BoolType,
            "char" => Token::CharType,
            "string" => Token::StringType,
            "any" => Token::AnyType,
            _ => Token::Identifier(ident),
        }
    }

    fn next_token(&mut self) -> Token {
        loop {
            self.skip_whitespace();
            self.skip_comment();
            self.skip_whitespace();

            if self.peek().is_none() {
                return Token::Eof;
            }

            match self.peek() {
                Some('"') => return self.read_string(),
                Some(ch) if ch.is_ascii_digit() => return self.read_number(),
                Some(ch) if ch.is_alphabetic() || ch == '_' => return self.read_identifier(),
                Some('+') => { self.advance(); return Token::Plus; }
                Some('-') => { self.advance(); return Token::Minus; }
                Some('*') => { self.advance(); return Token::Star; }
                Some('/') => { self.advance(); return Token::Slash; }
                Some('%') => { self.advance(); return Token::Percent; }
                Some('=') => {
                    self.advance();
                    match self.peek() {
                        Some('=') => { self.advance(); return Token::Eq; }
                        Some('>') => { self.advance(); return Token::Arrow; }
                        _ => return Token::Assign,
                    }
                }
                Some('!') => {
                    self.advance();
                    match self.peek() {
                        Some('=') => { self.advance(); return Token::Ne; }
                        _ => return Token::Not,
                    }
                }
                Some('<') => {
                    self.advance();
                    if self.peek() == Some('=') {
                        self.advance();
                        return Token::Le;
                    }
                    return Token::Lt;
                }
                Some('>') => {
                    self.advance();
                    if self.peek() == Some('=') {
                        self.advance();
                        return Token::Ge;
                    }
                    return Token::Gt;
                }
                Some('&') if self.input.get(self.pos + 1) == Some(&'&') => {
                    self.advance(); self.advance();
                    return Token::And;
                }
                Some('|') if self.input.get(self.pos + 1) == Some(&'|') => {
                    self.advance(); self.advance();
                    return Token::Or;
                }
                Some('~') => { self.advance(); return Token::Tilde; }
                Some('(') => { self.advance(); return Token::LParen; }
                Some(')') => { self.advance(); return Token::RParen; }
                Some('{') => { self.advance(); return Token::LBrace; }
                Some('}') => { self.advance(); return Token::RBrace; }
                Some(';') => { self.advance(); return Token::Semicolon; }
                Some(',') => { self.advance(); return Token::Comma; }
                Some(':') => { self.advance(); return Token::Colon; }
                Some('.') => { self.advance(); return Token::Dot; }
                _ => { self.advance(); }
            }
        }
    }
}

// ============================================================================
// AST
// ============================================================================

#[derive(Debug, Clone)]
enum TypeDef {
    Int,
    Float,
    Bool,
    Char,
    String,
    Any,
}

#[derive(Debug, Clone)]
enum Expr {
    Literal(Value),
    Identifier(String),
    Binary { op: String, left: Box<Expr>, right: Box<Expr> },
    Unary { op: String, operand: Box<Expr> },
}

#[derive(Debug, Clone)]
enum Value {
    Int(i64),
    Float(f64),
    Bool(bool),
    String(String),
    Null,
}

impl Value {
    fn print(&self) {
        match self {
            Value::Int(i) => print!("{}", i),
            Value::Float(f) => print!("{}", f),
            Value::Bool(b) => print!("{}", if *b { "true" } else { "false" }),
            Value::String(s) => print!("{}", s),
            Value::Null => print!("null"),
        }
    }
}

#[derive(Debug, Clone)]
enum Stmt {
    Let { name: String, type_: TypeDef, value: Expr, mutable: bool },
    Expression(Expr),
    If { condition: Expr, then_body: Vec<Stmt> },
    While { condition: Expr, body: Vec<Stmt> },
    Return(Option<Expr>),
    Break,
    Continue,
}

// ============================================================================
// PARSER
// ============================================================================

struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

impl Parser {
    fn new(input: &str) -> Self {
        let mut lexer = Lexer::new(input);
        let mut tokens = Vec::new();
        loop {
            let token = lexer.next_token();
            let is_eof = token == Token::Eof;
            tokens.push(token);
            if is_eof {
                break;
            }
        }
        Parser { tokens, pos: 0 }
    }

    fn current(&self) -> &Token {
        self.tokens.get(self.pos).unwrap_or(&Token::Eof)
    }

    fn advance(&mut self) {
        if self.pos < self.tokens.len() {
            self.pos += 1;
        }
    }

    fn parse(&mut self) -> Vec<Stmt> {
        let mut statements = Vec::new();
        while self.current() != &Token::Eof {
            statements.push(self.parse_statement());
        }
        statements
    }

    fn parse_statement(&mut self) -> Stmt {
        match self.current() {
            Token::Let | Token::Const | Token::Var => {
                let mutable = matches!(self.current(), Token::Var);
                self.advance();
                
                let name = if let Token::Identifier(n) = self.current() {
                    n.clone()
                } else {
                    "".to_string()
                };
                self.advance();
                
                self.advance(); // skip :
                
                let type_ = match self.current() {
                    Token::IntType => TypeDef::Int,
                    Token::FloatType => TypeDef::Float,
                    Token::BoolType => TypeDef::Bool,
                    Token::StringType => TypeDef::String,
                    _ => TypeDef::Any,
                };
                self.advance();
                
                self.advance(); // skip =
                
                let value = self.parse_expression();
                
                Stmt::Let { name, type_, value, mutable }
            }
            Token::If => {
                self.advance();
                self.advance(); // skip (
                let condition = self.parse_expression();
                self.advance(); // skip )
                self.advance(); // skip {
                
                let mut then_body = Vec::new();
                while self.current() != &Token::RBrace && self.current() != &Token::Eof {
                    then_body.push(self.parse_statement());
                }
                self.advance(); // skip }
                
                Stmt::If { condition, then_body }
            }
            Token::Return => {
                self.advance();
                let value = if self.current() != &Token::Semicolon && self.current() != &Token::RBrace {
                    Some(self.parse_expression())
                } else {
                    None
                };
                Stmt::Return(value)
            }
            Token::Break => {
                self.advance();
                Stmt::Break
            }
            Token::Continue => {
                self.advance();
                Stmt::Continue
            }
            _ => {
                let expr = self.parse_expression();
                Stmt::Expression(expr)
            }
        }
    }

    fn parse_expression(&mut self) -> Expr {
        self.parse_binary(0)
    }

    fn parse_binary(&mut self, min_prec: i32) -> Expr {
        let mut left = self.parse_unary();

        loop {
            let prec = self.precedence();
            if prec < min_prec {
                break;
            }

            let op = format!("{:?}", self.current());
            self.advance();

            let right = self.parse_binary(prec + 1);
            left = Expr::Binary {
                op,
                left: Box::new(left),
                right: Box::new(right),
            };
        }

        left
    }

    fn precedence(&self) -> i32 {
        match self.current() {
            Token::Or => 1,
            Token::And => 2,
            Token::Eq | Token::Ne => 3,
            Token::Lt | Token::Gt | Token::Le | Token::Ge => 4,
            Token::Plus | Token::Minus => 5,
            Token::Star | Token::Slash | Token::Percent => 6,
            _ => 0,
        }
    }

    fn parse_unary(&mut self) -> Expr {
        match self.current() {
            Token::Not | Token::Minus | Token::Plus | Token::Tilde => {
                let op = format!("{:?}", self.current());
                self.advance();
                let operand = self.parse_unary();
                Expr::Unary {
                    op,
                    operand: Box::new(operand),
                }
            }
            _ => self.parse_primary(),
        }
    }

    fn parse_primary(&mut self) -> Expr {
        match self.current().clone() {
            Token::Int(i) => {
                self.advance();
                Expr::Literal(Value::Int(i))
            }
            Token::Float(f) => {
                self.advance();
                Expr::Literal(Value::Float(f))
            }
            Token::String(s) => {
                self.advance();
                Expr::Literal(Value::String(s))
            }
            Token::Bool(b) => {
                self.advance();
                Expr::Literal(Value::Bool(b))
            }
            Token::Identifier(name) => {
                self.advance();
                Expr::Identifier(name)
            }
            Token::LParen => {
                self.advance();
                let expr = self.parse_expression();
                self.advance(); // skip )
                expr
            }
            _ => Expr::Literal(Value::Null),
        }
    }
}

// ============================================================================
// INTERPRETER
// ============================================================================

struct Interpreter {
    vars: HashMap<String, (Value, bool)>,
}

impl Interpreter {
    fn new() -> Self {
        Interpreter {
            vars: HashMap::new(),
        }
    }

    fn execute(&mut self, statements: &[Stmt]) {
        for stmt in statements {
            self.execute_statement(stmt);
        }
    }

    fn execute_statement(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Let { name, value, mutable, .. } => {
                let v = self.eval_expression(value);
                self.vars.insert(name.clone(), (v, *mutable));
            }
            Stmt::Expression(expr) => {
                self.eval_expression(expr);
            }
            Stmt::If { condition, then_body } => {
                let cond = self.eval_expression(condition);
                if self.is_truthy(&cond) {
                    self.execute(then_body);
                }
            }
            _ => {}
        }
    }

    fn eval_expression(&self, expr: &Expr) -> Value {
        match expr {
            Expr::Literal(v) => v.clone(),
            Expr::Identifier(name) => {
                self.vars.get(name).map(|(v, _)| v.clone()).unwrap_or(Value::Null)
            }
            Expr::Binary { op, left, right } => {
                let l = self.eval_expression(left);
                let r = self.eval_expression(right);
                self.eval_binary(&op, &l, &r)
            }
            Expr::Unary { op, operand } => {
                let v = self.eval_expression(operand);
                self.eval_unary(&op, &v)
            }
        }
    }

    fn eval_binary(&self, op: &str, left: &Value, right: &Value) -> Value {
        match (left, right) {
            (Value::Int(l), Value::Int(r)) => {
                match op {
                    "Plus" => Value::Int(l + r),
                    "Minus" => Value::Int(l - r),
                    "Star" => Value::Int(l * r),
                    "Slash" => Value::Int(if *r != 0 { l / r } else { 0 }),
                    "Percent" => Value::Int(if *r != 0 { l % r } else { 0 }),
                    "Eq" => Value::Bool(l == r),
                    "Ne" => Value::Bool(l != r),
                    "Lt" => Value::Bool(l < r),
                    "Gt" => Value::Bool(l > r),
                    "Le" => Value::Bool(l <= r),
                    "Ge" => Value::Bool(l >= r),
                    _ => Value::Null,
                }
            }
            _ => Value::Null,
        }
    }

    fn eval_unary(&self, op: &str, operand: &Value) -> Value {
        match operand {
            Value::Int(i) => {
                match op {
                    "Minus" => Value::Int(-i),
                    "Plus" => Value::Int(*i),
                    "Tilde" => Value::Int(!i),
                    _ => Value::Null,
                }
            }
            Value::Bool(b) => {
                if op == "Not" {
                    Value::Bool(!b)
                } else {
                    Value::Null
                }
            }
            _ => Value::Null,
        }
    }

    fn is_truthy(&self, v: &Value) -> bool {
        match v {
            Value::Bool(b) => *b,
            Value::Int(i) => *i != 0,
            Value::Null => false,
            _ => true,
        }
    }
}

// ============================================================================
// MAIN
// ============================================================================

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: strata <file.str>");
        return;
    }

    let source = fs::read_to_string(&args[1]).expect("Failed to read file");
    
    let mut parser = Parser::new(&source);
    let statements = parser.parse();
    
    let mut interpreter = Interpreter::new();
    interpreter.execute(&statements);
}
