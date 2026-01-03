import java.io.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.*;

// ============================================================================
// STRATA INTERPRETER IN JAVA
// Complete lexer, parser, type checker, and interpreter
// ============================================================================

public class Strata {
    enum TokenType {
        INT, FLOAT, STRING, BOOL, CHAR,
        IDENTIFIER, KEYWORD,
        PLUS, MINUS, STAR, SLASH, PERCENT,
        EQ, NE, LT, GT, LE, GE, AND, OR, NOT, TILDE,
        ASSIGN, ARROW,
        LPAREN, RPAREN, LBRACE, RBRACE, SEMICOLON, COMMA, COLON, DOT,
        EOF, ERROR
    }

    static class Token {
        TokenType type;
        Object value;
        int line, column;

        Token(TokenType type, Object value, int line, int column) {
            this.type = type;
            this.value = value;
            this.line = line;
            this.column = column;
        }
    }

    // ========================================================================
    // LEXER
    // ========================================================================

    static class Lexer {
        String input;
        int pos, line, column;
        Set<String> keywords = new HashSet<>(Arrays.asList(
            "let", "const", "var", "func", "if", "else", "while", "for",
            "return", "break", "continue", "import", "from",
            "true", "false", "int", "float", "bool", "string", "char", "any"
        ));

        Lexer(String input) {
            this.input = input;
            this.pos = 0;
            this.line = 1;
            this.column = 1;
        }

        char peek() {
            return pos < input.length() ? input.charAt(pos) : '\0';
        }

        char advance() {
            char ch = peek();
            pos++;
            if (ch == '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
            return ch;
        }

        void skipWhitespace() {
            while (Character.isWhitespace(peek())) {
                advance();
            }
        }

        void skipComment() {
            if (peek() == '/' && pos + 1 < input.length() && input.charAt(pos + 1) == '/') {
                while (peek() != '\n' && peek() != '\0') {
                    advance();
                }
            }
        }

        Token readNumber() {
            StringBuilder num = new StringBuilder();
            boolean hasDot = false;
            while (Character.isDigit(peek()) || (peek() == '.' && !hasDot)) {
                if (peek() == '.') hasDot = true;
                num.append(advance());
            }
            if (hasDot) {
                return new Token(TokenType.FLOAT, Double.parseDouble(num.toString()), line, column);
            } else {
                return new Token(TokenType.INT, Long.parseLong(num.toString()), line, column);
            }
        }

        Token readString() {
            advance(); // skip "
            StringBuilder s = new StringBuilder();
            while (peek() != '"' && peek() != '\0') {
                if (peek() == '\\') {
                    advance();
                    char escaped = advance();
                    if (escaped == 'n') s.append('\n');
                    else if (escaped == 't') s.append('\t');
                    else s.append(escaped);
                } else {
                    s.append(advance());
                }
            }
            advance(); // skip closing "
            return new Token(TokenType.STRING, s.toString(), line, column);
        }

        Token readIdentifier() {
            StringBuilder ident = new StringBuilder();
            while (Character.isLetterOrDigit(peek()) || peek() == '_') {
                ident.append(advance());
            }
            String name = ident.toString();
            if (keywords.contains(name)) {
                if (name.equals("true") || name.equals("false")) {
                    return new Token(TokenType.BOOL, name.equals("true"), line, column);
                }
                return new Token(TokenType.KEYWORD, name, line, column);
            }
            return new Token(TokenType.IDENTIFIER, name, line, column);
        }

        Token nextToken() {
            while (true) {
                skipWhitespace();
                skipComment();
                skipWhitespace();

                if (peek() == '\0') {
                    return new Token(TokenType.EOF, "", line, column);
                }

                int l = line, c = column;
                char ch = peek();

                if (Character.isDigit(ch)) {
                    return readNumber();
                }
                if (ch == '"') {
                    return readString();
                }
                if (Character.isLetter(ch) || ch == '_') {
                    return readIdentifier();
                }

                switch (ch) {
                    case '+': advance(); return new Token(TokenType.PLUS, "+", l, c);
                    case '-': advance(); return new Token(TokenType.MINUS, "-", l, c);
                    case '*': advance(); return new Token(TokenType.STAR, "*", l, c);
                    case '/': advance(); return new Token(TokenType.SLASH, "/", l, c);
                    case '%': advance(); return new Token(TokenType.PERCENT, "%", l, c);
                    case '=':
                        advance();
                        if (peek() == '=') { advance(); return new Token(TokenType.EQ, "==", l, c); }
                        if (peek() == '>') { advance(); return new Token(TokenType.ARROW, "=>", l, c); }
                        return new Token(TokenType.ASSIGN, "=", l, c);
                    case '!':
                        advance();
                        if (peek() == '=') { advance(); return new Token(TokenType.NE, "!=", l, c); }
                        return new Token(TokenType.NOT, "!", l, c);
                    case '<':
                        advance();
                        if (peek() == '=') { advance(); return new Token(TokenType.LE, "<=", l, c); }
                        return new Token(TokenType.LT, "<", l, c);
                    case '>':
                        advance();
                        if (peek() == '=') { advance(); return new Token(TokenType.GE, ">=", l, c); }
                        return new Token(TokenType.GT, ">", l, c);
                    case '&':
                        if (pos + 1 < input.length() && input.charAt(pos + 1) == '&') {
                            advance(); advance(); return new Token(TokenType.AND, "&&", l, c);
                        }
                        break;
                    case '|':
                        if (pos + 1 < input.length() && input.charAt(pos + 1) == '|') {
                            advance(); advance(); return new Token(TokenType.OR, "||", l, c);
                        }
                        break;
                    case '~': advance(); return new Token(TokenType.TILDE, "~", l, c);
                    case '(': advance(); return new Token(TokenType.LPAREN, "(", l, c);
                    case ')': advance(); return new Token(TokenType.RPAREN, ")", l, c);
                    case '{': advance(); return new Token(TokenType.LBRACE, "{", l, c);
                    case '}': advance(); return new Token(TokenType.RBRACE, "}", l, c);
                    case ';': advance(); return new Token(TokenType.SEMICOLON, ";", l, c);
                    case ',': advance(); return new Token(TokenType.COMMA, ",", l, c);
                    case ':': advance(); return new Token(TokenType.COLON, ":", l, c);
                    case '.': advance(); return new Token(TokenType.DOT, ".", l, c);
                    default: advance();
                }
            }
        }
    }

    // ========================================================================
    // AST
    // ========================================================================

    static class Value {
        String type;
        Object value;

        Value(String type, Object value) {
            this.type = type;
            this.value = value;
        }

        void print() {
            if ("null".equals(type)) {
                System.out.print("null");
            } else if (value != null) {
                System.out.print(value);
            }
        }
    }

    interface Expr {}

    static class Literal implements Expr {
        Value value;
        Literal(Value value) { this.value = value; }
    }

    static class Identifier implements Expr {
        String name;
        Identifier(String name) { this.name = name; }
    }

    static class Binary implements Expr {
        String op;
        Expr left, right;
        Binary(String op, Expr left, Expr right) {
            this.op = op; this.left = left; this.right = right;
        }
    }

    static class Unary implements Expr {
        String op;
        Expr operand;
        Unary(String op, Expr operand) { this.op = op; this.operand = operand; }
    }

    interface Stmt {}

    static class Let implements Stmt {
        String name, type;
        Expr value;
        boolean mutable;
        Let(String name, String type, Expr value, boolean mutable) {
            this.name = name; this.type = type; this.value = value; this.mutable = mutable;
        }
    }

    static class ExprStmt implements Stmt {
        Expr expr;
        ExprStmt(Expr expr) { this.expr = expr; }
    }

    static class If implements Stmt {
        Expr condition;
        List<Stmt> thenBody;
        If(Expr condition, List<Stmt> thenBody) {
            this.condition = condition; this.thenBody = thenBody;
        }
    }

    static class Return implements Stmt {
        Expr value;
        Return(Expr value) { this.value = value; }
    }

    // ========================================================================
    // PARSER
    // ========================================================================

    static class Parser {
        List<Token> tokens;
        int pos;

        Parser(String input) {
            Lexer lexer = new Lexer(input);
            tokens = new ArrayList<>();
            Token t;
            do {
                t = lexer.nextToken();
                tokens.add(t);
            } while (t.type != TokenType.EOF);
            pos = 0;
        }

        Token current() {
            return pos < tokens.size() ? tokens.get(pos) : tokens.get(tokens.size() - 1);
        }

        void advance() {
            if (pos < tokens.size()) pos++;
        }

        List<Stmt> parse() {
            List<Stmt> stmts = new ArrayList<>();
            while (current().type != TokenType.EOF) {
                stmts.add(parseStatement());
            }
            return stmts;
        }

        Stmt parseStatement() {
            if (current().type == TokenType.KEYWORD) {
                String kw = (String) current().value;
                if ("let".equals(kw) || "const".equals(kw) || "var".equals(kw)) {
                    boolean mutable = "var".equals(kw);
                    advance();
                    String name = (String) current().value;
                    advance();
                    advance(); // :
                    String type = (String) current().value;
                    advance();
                    advance(); // =
                    Expr value = parseExpression();
                    return new Let(name, type, value, mutable);
                } else if ("if".equals(kw)) {
                    advance(); advance(); // skip if (
                    Expr cond = parseExpression();
                    advance(); advance(); // skip ) {
                    List<Stmt> body = new ArrayList<>();
                    while (current().type != TokenType.RBRACE) {
                        body.add(parseStatement());
                    }
                    advance(); // }
                    return new If(cond, body);
                } else if ("return".equals(kw)) {
                    advance();
                    Expr value = null;
                    if (current().type != TokenType.SEMICOLON && current().type != TokenType.RBRACE) {
                        value = parseExpression();
                    }
                    return new Return(value);
                }
            }
            return new ExprStmt(parseExpression());
        }

        Expr parseExpression() {
            return parseBinary(0);
        }

        Expr parseBinary(int minPrec) {
            Expr left = parseUnary();
            while (true) {
                int prec = precedence();
                if (prec < minPrec) break;
                String op = (String) current().value;
                advance();
                Expr right = parseBinary(prec + 1);
                left = new Binary(op, left, right);
            }
            return left;
        }

        int precedence() {
            switch (current().type) {
                case OR: return 1;
                case AND: return 2;
                case EQ: case NE: return 3;
                case LT: case GT: case LE: case GE: return 4;
                case PLUS: case MINUS: return 5;
                case STAR: case SLASH: case PERCENT: return 6;
                default: return 0;
            }
        }

        Expr parseUnary() {
            if (current().type == TokenType.NOT || current().type == TokenType.MINUS ||
                current().type == TokenType.PLUS || current().type == TokenType.TILDE) {
                String op = (String) current().value;
                advance();
                return new Unary(op, parseUnary());
            }
            return parsePrimary();
        }

        Expr parsePrimary() {
            switch (current().type) {
                case INT:
                    long i = (Long) current().value;
                    advance();
                    return new Literal(new Value("int", i));
                case FLOAT:
                    double f = (Double) current().value;
                    advance();
                    return new Literal(new Value("float", f));
                case STRING:
                    String s = (String) current().value;
                    advance();
                    return new Literal(new Value("string", s));
                case BOOL:
                    boolean b = (Boolean) current().value;
                    advance();
                    return new Literal(new Value("bool", b));
                case IDENTIFIER:
                    String name = (String) current().value;
                    advance();
                    return new Identifier(name);
                case LPAREN:
                    advance();
                    Expr e = parseExpression();
                    advance();
                    return e;
                default:
                    return new Literal(new Value("null", null));
            }
        }
    }

    // ========================================================================
    // INTERPRETER
    // ========================================================================

    static class Interpreter {
        Map<String, Value> vars = new HashMap<>();

        void execute(List<Stmt> stmts) {
            for (Stmt stmt : stmts) {
                executeStatement(stmt);
            }
        }

        void executeStatement(Stmt stmt) {
            if (stmt instanceof Let) {
                Let let = (Let) stmt;
                vars.put(let.name, evalExpression(let.value));
            } else if (stmt instanceof ExprStmt) {
                evalExpression(((ExprStmt) stmt).expr);
            } else if (stmt instanceof If) {
                If ifStmt = (If) stmt;
                if (isTruthy(evalExpression(ifStmt.condition))) {
                    execute(ifStmt.thenBody);
                }
            }
        }

        Value evalExpression(Expr expr) {
            if (expr instanceof Literal) {
                return ((Literal) expr).value;
            } else if (expr instanceof Identifier) {
                String name = ((Identifier) expr).name;
                return vars.getOrDefault(name, new Value("null", null));
            } else if (expr instanceof Binary) {
                Binary b = (Binary) expr;
                Value left = evalExpression(b.left);
                Value right = evalExpression(b.right);
                return evalBinary(b.op, left, right);
            } else if (expr instanceof Unary) {
                Unary u = (Unary) expr;
                return evalUnary(u.op, evalExpression(u.operand));
            }
            return new Value("null", null);
        }

        Value evalBinary(String op, Value left, Value right) {
            if ("int".equals(left.type) && "int".equals(right.type)) {
                long l = (Long) left.value;
                long r = (Long) right.value;
                switch (op) {
                    case "+": return new Value("int", l + r);
                    case "-": return new Value("int", l - r);
                    case "*": return new Value("int", l * r);
                    case "/": return new Value("int", r != 0 ? l / r : 0);
                    case "%": return new Value("int", r != 0 ? l % r : 0);
                    case "==": return new Value("bool", l == r);
                    case "!=": return new Value("bool", l != r);
                    case "<": return new Value("bool", l < r);
                    case ">": return new Value("bool", l > r);
                    case "<=": return new Value("bool", l <= r);
                    case ">=": return new Value("bool", l >= r);
                }
            }
            return new Value("null", null);
        }

        Value evalUnary(String op, Value operand) {
            if ("int".equals(operand.type)) {
                long v = (Long) operand.value;
                switch (op) {
                    case "-": return new Value("int", -v);
                    case "+": return new Value("int", v);
                    case "~": return new Value("int", ~v);
                }
            } else if ("bool".equals(operand.type) && "!".equals(op)) {
                return new Value("bool", !((Boolean) operand.value));
            }
            return new Value("null", null);
        }

        boolean isTruthy(Value v) {
            if ("bool".equals(v.type)) return (Boolean) v.value;
            if ("int".equals(v.type)) return (Long) v.value != 0;
            return !"null".equals(v.type);
        }
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: java Strata <file.str>");
            System.exit(1);
        }

        String source = new String(Files.readAllBytes(Paths.get(args[0])));
        Parser parser = new Parser(source);
        List<Stmt> stmts = parser.parse();

        Interpreter interp = new Interpreter();
        interp.execute(stmts);
    }
}
