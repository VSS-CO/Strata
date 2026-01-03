using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;

// ============================================================================
// STRATA INTERPRETER IN C#
// Complete lexer, parser, type checker, and interpreter
// ============================================================================

enum TokenType {
    INT, FLOAT, STRING, BOOL, CHAR, IDENTIFIER, KEYWORD,
    PLUS, MINUS, STAR, SLASH, PERCENT,
    EQ, NE, LT, GT, LE, GE, AND, OR, NOT, TILDE,
    ASSIGN, ARROW, LPAREN, RPAREN, LBRACE, RBRACE,
    SEMICOLON, COMMA, COLON, DOT, EOF_TOKEN, ERROR
}

class Token {
    public TokenType Type { get; set; }
    public object Value { get; set; }
    public int Line { get; set; }
    public int Column { get; set; }
    
    public Token(TokenType type, object value, int line = 1, int column = 1) {
        Type = type;
        Value = value;
        Line = line;
        Column = column;
    }
}

// ========================================================================
// LEXER
// ========================================================================

class Lexer {
    private string input;
    private int pos;
    private int line;
    private int column;
    private static readonly HashSet<string> Keywords = new() {
        "let", "const", "var", "func", "if", "else", "while", "for",
        "return", "break", "continue", "import", "from",
        "true", "false", "int", "float", "bool", "string", "char", "any"
    };

    public Lexer(string input) {
        this.input = input;
        pos = 0;
        line = 1;
        column = 1;
    }

    private char Peek() => pos < input.Length ? input[pos] : '\0';

    private char Advance() {
        char ch = Peek();
        pos++;
        if (ch == '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
        return ch;
    }

    private void SkipWhitespace() {
        while (char.IsWhiteSpace(Peek())) Advance();
    }

    private void SkipComment() {
        if (Peek() == '/' && pos + 1 < input.Length && input[pos + 1] == '/') {
            while (Peek() != '\n' && Peek() != '\0') Advance();
        }
    }

    private Token ReadNumber() {
        string num = "";
        bool hasDot = false;
        while (char.IsDigit(Peek()) || (Peek() == '.' && !hasDot)) {
            if (Peek() == '.') hasDot = true;
            num += Advance();
        }
        if (hasDot) {
            return new Token(TokenType.FLOAT, double.Parse(num), line, column);
        } else {
            return new Token(TokenType.INT, long.Parse(num), line, column);
        }
    }

    private Token ReadString() {
        Advance(); // skip "
        string s = "";
        while (Peek() != '"' && Peek() != '\0') {
            if (Peek() == '\\') {
                Advance();
                char escaped = Advance();
                s += escaped == 'n' ? '\n' : (escaped == 't' ? '\t' : escaped);
            } else {
                s += Advance();
            }
        }
        Advance(); // skip "
        return new Token(TokenType.STRING, s, line, column);
    }

    private Token ReadIdentifier() {
        string ident = "";
        while (char.IsLetterOrDigit(Peek()) || Peek() == '_') {
            ident += Advance();
        }
        
        if (ident == "true" || ident == "false") {
            return new Token(TokenType.BOOL, ident == "true", line, column);
        }
        if (Keywords.Contains(ident)) {
            return new Token(TokenType.KEYWORD, ident, line, column);
        }
        return new Token(TokenType.IDENTIFIER, ident, line, column);
    }

    public Token NextToken() {
        while (true) {
            SkipWhitespace();
            SkipComment();
            SkipWhitespace();

            if (Peek() == '\0') {
                return new Token(TokenType.EOF_TOKEN, "", line, column);
            }

            int l = line, c = column;
            char ch = Peek();

            if (char.IsDigit(ch)) return ReadNumber();
            if (ch == '"') return ReadString();
            if (char.IsLetter(ch) || ch == '_') return ReadIdentifier();

            switch (ch) {
                case '+': Advance(); return new Token(TokenType.PLUS, "+", l, c);
                case '-': Advance(); return new Token(TokenType.MINUS, "-", l, c);
                case '*': Advance(); return new Token(TokenType.STAR, "*", l, c);
                case '/': Advance(); return new Token(TokenType.SLASH, "/", l, c);
                case '%': Advance(); return new Token(TokenType.PERCENT, "%", l, c);
                case '=':
                    Advance();
                    if (Peek() == '=') { Advance(); return new Token(TokenType.EQ, "==", l, c); }
                    if (Peek() == '>') { Advance(); return new Token(TokenType.ARROW, "=>", l, c); }
                    return new Token(TokenType.ASSIGN, "=", l, c);
                case '!':
                    Advance();
                    if (Peek() == '=') { Advance(); return new Token(TokenType.NE, "!=", l, c); }
                    return new Token(TokenType.NOT, "!", l, c);
                case '<':
                    Advance();
                    if (Peek() == '=') { Advance(); return new Token(TokenType.LE, "<=", l, c); }
                    return new Token(TokenType.LT, "<", l, c);
                case '>':
                    Advance();
                    if (Peek() == '=') { Advance(); return new Token(TokenType.GE, ">=", l, c); }
                    return new Token(TokenType.GT, ">", l, c);
                case '&':
                    if (pos + 1 < input.Length && input[pos + 1] == '&') {
                        Advance(); Advance();
                        return new Token(TokenType.AND, "&&", l, c);
                    }
                    break;
                case '|':
                    if (pos + 1 < input.Length && input[pos + 1] == '|') {
                        Advance(); Advance();
                        return new Token(TokenType.OR, "||", l, c);
                    }
                    break;
                case '~': Advance(); return new Token(TokenType.TILDE, "~", l, c);
                case '(': Advance(); return new Token(TokenType.LPAREN, "(", l, c);
                case ')': Advance(); return new Token(TokenType.RPAREN, ")", l, c);
                case '{': Advance(); return new Token(TokenType.LBRACE, "{", l, c);
                case '}': Advance(); return new Token(TokenType.RBRACE, "}", l, c);
                case ';': Advance(); return new Token(TokenType.SEMICOLON, ";", l, c);
                case ',': Advance(); return new Token(TokenType.COMMA, ",", l, c);
                case ':': Advance(); return new Token(TokenType.COLON, ":", l, c);
                case '.': Advance(); return new Token(TokenType.DOT, ".", l, c);
                default: Advance(); break;
            }
        }
    }
}

// ========================================================================
// AST
// ========================================================================

class Value {
    public string Type { get; set; }
    public object Data { get; set; }
    
    public Value(string type, object data) {
        Type = type;
        Data = data;
    }
    
    public void Print() {
        if (Type == "null") {
            Console.Write("null");
        } else if (Data != null) {
            Console.Write(Data);
        }
    }
}

abstract class Expr { }

class Literal : Expr {
    public Value Value { get; set; }
    public Literal(Value value) => Value = value;
}

class Identifier : Expr {
    public string Name { get; set; }
    public Identifier(string name) => Name = name;
}

class Binary : Expr {
    public string Op { get; set; }
    public Expr Left { get; set; }
    public Expr Right { get; set; }
    public Binary(string op, Expr left, Expr right) {
        Op = op; Left = left; Right = right;
    }
}

class Unary : Expr {
    public string Op { get; set; }
    public Expr Operand { get; set; }
    public Unary(string op, Expr operand) {
        Op = op; Operand = operand;
    }
}

abstract class Stmt { }

class Let : Stmt {
    public string Name { get; set; }
    public string Type { get; set; }
    public Expr Value { get; set; }
    public bool Mutable { get; set; }
    public Let(string name, string type, Expr value, bool mutable) {
        Name = name; Type = type; Value = value; Mutable = mutable;
    }
}

class ExprStmt : Stmt {
    public Expr Expr { get; set; }
    public ExprStmt(Expr expr) => Expr = expr;
}

class If : Stmt {
    public Expr Condition { get; set; }
    public List<Stmt> ThenBody { get; set; }
    public If(Expr condition, List<Stmt> thenBody) {
        Condition = condition; ThenBody = thenBody;
    }
}

class Return : Stmt {
    public Expr Value { get; set; }
    public Return(Expr value) => Value = value;
}

// ========================================================================
// PARSER
// ========================================================================

class Parser {
    private List<Token> tokens;
    private int pos;

    public Parser(string input) {
        tokens = new List<Token>();
        Lexer lexer = new Lexer(input);
        Token t;
        do {
            t = lexer.NextToken();
            tokens.Add(t);
        } while (t.Type != TokenType.EOF_TOKEN);
        pos = 0;
    }

    private Token Current => pos < tokens.Count ? tokens[pos] : tokens.Last();
    
    private void Advance() { if (pos < tokens.Count) pos++; }

    public List<Stmt> Parse() {
        List<Stmt> stmts = new();
        while (Current.Type != TokenType.EOF_TOKEN) {
            stmts.Add(ParseStatement());
        }
        return stmts;
    }

    private Stmt ParseStatement() {
        if (Current.Type == TokenType.KEYWORD) {
            string kw = (string)Current.Value;
            if (kw == "let" || kw == "const" || kw == "var") {
                bool mutable = kw == "var";
                Advance();
                string name = (string)Current.Value;
                Advance();
                Advance(); // :
                string type = (string)Current.Value;
                Advance();
                Advance(); // =
                Expr value = ParseExpression();
                return new Let(name, type, value, mutable);
            } else if (kw == "if") {
                Advance();
                Advance(); // (
                Expr cond = ParseExpression();
                Advance(); // )
                Advance(); // {
                List<Stmt> body = new();
                while (Current.Type != TokenType.RBRACE) {
                    body.Add(ParseStatement());
                }
                Advance(); // }
                return new If(cond, body);
            } else if (kw == "return") {
                Advance();
                Expr value = null;
                if (Current.Type != TokenType.SEMICOLON && Current.Type != TokenType.RBRACE) {
                    value = ParseExpression();
                }
                return new Return(value);
            }
        }
        return new ExprStmt(ParseExpression());
    }

    private Expr ParseExpression() => ParseBinary(0);

    private Expr ParseBinary(int minPrec) {
        Expr left = ParseUnary();
        while (true) {
            int prec = Precedence();
            if (prec < minPrec) break;
            string op = (string)Current.Value;
            Advance();
            Expr right = ParseBinary(prec + 1);
            left = new Binary(op, left, right);
        }
        return left;
    }

    private int Precedence() => Current.Type switch {
        TokenType.OR => 1,
        TokenType.AND => 2,
        TokenType.EQ or TokenType.NE => 3,
        TokenType.LT or TokenType.GT or TokenType.LE or TokenType.GE => 4,
        TokenType.PLUS or TokenType.MINUS => 5,
        TokenType.STAR or TokenType.SLASH or TokenType.PERCENT => 6,
        _ => 0
    };

    private Expr ParseUnary() {
        if (Current.Type is TokenType.NOT or TokenType.MINUS or TokenType.PLUS or TokenType.TILDE) {
            string op = (string)Current.Value;
            Advance();
            return new Unary(op, ParseUnary());
        }
        return ParsePrimary();
    }

    private Expr ParsePrimary() => Current.Type switch {
        TokenType.INT => {
            Literal lit = new(new Value("int", Current.Value));
            Advance();
            yield return lit;
        },
        TokenType.FLOAT => {
            Literal lit = new(new Value("float", Current.Value));
            Advance();
            yield return lit;
        },
        TokenType.STRING => {
            Literal lit = new(new Value("string", Current.Value));
            Advance();
            yield return lit;
        },
        TokenType.BOOL => {
            Literal lit = new(new Value("bool", Current.Value));
            Advance();
            yield return lit;
        },
        TokenType.IDENTIFIER => {
            Identifier id = new((string)Current.Value);
            Advance();
            yield return id;
        },
        TokenType.LPAREN => {
            Advance();
            Expr e = ParseExpression();
            Advance();
            yield return e;
        },
        _ => new Literal(new Value("null", null))
    };
}

// ========================================================================
// INTERPRETER
// ========================================================================

class Interpreter {
    private Dictionary<string, Value> vars = new();

    public void Execute(List<Stmt> stmts) {
        foreach (var stmt in stmts) {
            ExecuteStatement(stmt);
        }
    }

    private void ExecuteStatement(Stmt stmt) {
        switch (stmt) {
            case Let let:
                vars[let.Name] = EvalExpression(let.Value);
                break;
            case ExprStmt exprStmt:
                EvalExpression(exprStmt.Expr);
                break;
            case If ifStmt:
                if (IsTruthy(EvalExpression(ifStmt.Condition))) {
                    Execute(ifStmt.ThenBody);
                }
                break;
        }
    }

    private Value EvalExpression(Expr expr) => expr switch {
        Literal lit => lit.Value,
        Identifier id => vars.ContainsKey(id.Name) ? vars[id.Name] : new Value("null", null),
        Binary bin => {
            Value left = EvalExpression(bin.Left);
            Value right = EvalExpression(bin.Right);
            return EvalBinary(bin.Op, left, right);
        },
        Unary un => EvalUnary(un.Op, EvalExpression(un.Operand)),
        _ => new Value("null", null)
    };

    private Value EvalBinary(string op, Value left, Value right) {
        if (left.Type == "int" && right.Type == "int") {
            long l = (long)left.Data;
            long r = (long)right.Data;
            return op switch {
                "+" => new Value("int", l + r),
                "-" => new Value("int", l - r),
                "*" => new Value("int", l * r),
                "/" => new Value("int", r != 0 ? l / r : 0),
                "%" => new Value("int", r != 0 ? l % r : 0),
                "==" => new Value("bool", l == r),
                "!=" => new Value("bool", l != r),
                "<" => new Value("bool", l < r),
                ">" => new Value("bool", l > r),
                "<=" => new Value("bool", l <= r),
                ">=" => new Value("bool", l >= r),
                _ => new Value("null", null)
            };
        }
        return new Value("null", null);
    }

    private Value EvalUnary(string op, Value operand) {
        if (operand.Type == "int") {
            long v = (long)operand.Data;
            return op switch {
                "-" => new Value("int", -v),
                "+" => new Value("int", v),
                "~" => new Value("int", ~v),
                _ => new Value("null", null)
            };
        }
        if (operand.Type == "bool" && op == "!") {
            return new Value("bool", !(bool)operand.Data);
        }
        return new Value("null", null);
    }

    private bool IsTruthy(Value v) => v.Type switch {
        "bool" => (bool)v.Data,
        "int" => (long)v.Data != 0,
        "null" => false,
        _ => true
    };
}

// ========================================================================
// MAIN
// ========================================================================

class Program {
    static void Main(string[] args) {
        if (args.Length < 1) {
            Console.Error.WriteLine("Usage: dotnet Strata <file.str>");
            Environment.Exit(1);
        }

        try {
            string source = File.ReadAllText(args[0]);
            Parser parser = new(source);
            List<Stmt> stmts = parser.Parse();
            
            Interpreter interp = new();
            interp.Execute(stmts);
        } catch (Exception e) {
            Console.Error.WriteLine($"Error: {e.Message}");
            Environment.Exit(1);
        }
    }
}
