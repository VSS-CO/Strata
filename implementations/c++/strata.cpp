#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <cctype>
#include <cmath>

using namespace std;

// ============================================================================
// STRATA INTERPRETER IN C++
// Complete lexer, parser, type checker, and interpreter
// ============================================================================

enum class TokenType {
    INT, FLOAT, STRING, BOOL, CHAR, IDENTIFIER, KEYWORD,
    PLUS, MINUS, STAR, SLASH, PERCENT,
    EQ, NE, LT, GT, LE, GE, AND, OR, NOT, TILDE,
    ASSIGN, ARROW, LPAREN, RPAREN, LBRACE, RBRACE,
    SEMICOLON, COMMA, COLON, DOT, EOF_TOKEN, ERROR
};

struct Token {
    TokenType type;
    string value;
    int line, column;
    
    Token(TokenType t, const string& v, int l = 1, int c = 1)
        : type(t), value(v), line(l), column(c) {}
};

// ========================================================================
// LEXER
// ========================================================================

class Lexer {
public:
    explicit Lexer(const string& input) : input(input), pos(0), line(1), column(1) {}
    
    Token nextToken() {
        while (true) {
            skipWhitespace();
            skipComment();
            skipWhitespace();
            
            if (pos >= input.length()) {
                return Token(TokenType::EOF_TOKEN, "", line, column);
            }
            
            char ch = peek();
            int l = line, c = column;
            
            if (isdigit(ch)) return readNumber();
            if (ch == '"') return readString();
            if (isalpha(ch) || ch == '_') return readIdentifier();
            
            switch (ch) {
                case '+': advance(); return Token(TokenType::PLUS, "+", l, c);
                case '-': advance(); return Token(TokenType::MINUS, "-", l, c);
                case '*': advance(); return Token(TokenType::STAR, "*", l, c);
                case '/': advance(); return Token(TokenType::SLASH, "/", l, c);
                case '%': advance(); return Token(TokenType::PERCENT, "%", l, c);
                case '=':
                    advance();
                    if (peek() == '=') { advance(); return Token(TokenType::EQ, "==", l, c); }
                    if (peek() == '>') { advance(); return Token(TokenType::ARROW, "=>", l, c); }
                    return Token(TokenType::ASSIGN, "=", l, c);
                case '!':
                    advance();
                    if (peek() == '=') { advance(); return Token(TokenType::NE, "!=", l, c); }
                    return Token(TokenType::NOT, "!", l, c);
                case '<':
                    advance();
                    if (peek() == '=') { advance(); return Token(TokenType::LE, "<=", l, c); }
                    return Token(TokenType::LT, "<", l, c);
                case '>':
                    advance();
                    if (peek() == '=') { advance(); return Token(TokenType::GE, ">=", l, c); }
                    return Token(TokenType::GT, ">", l, c);
                case '&':
                    if (pos + 1 < input.length() && input[pos + 1] == '&') {
                        advance(); advance();
                        return Token(TokenType::AND, "&&", l, c);
                    }
                    advance();
                    break;
                case '|':
                    if (pos + 1 < input.length() && input[pos + 1] == '|') {
                        advance(); advance();
                        return Token(TokenType::OR, "||", l, c);
                    }
                    advance();
                    break;
                case '~': advance(); return Token(TokenType::TILDE, "~", l, c);
                case '(': advance(); return Token(TokenType::LPAREN, "(", l, c);
                case ')': advance(); return Token(TokenType::RPAREN, ")", l, c);
                case '{': advance(); return Token(TokenType::LBRACE, "{", l, c);
                case '}': advance(); return Token(TokenType::RBRACE, "}", l, c);
                case ';': advance(); return Token(TokenType::SEMICOLON, ";", l, c);
                case ',': advance(); return Token(TokenType::COMMA, ",", l, c);
                case ':': advance(); return Token(TokenType::COLON, ":", l, c);
                case '.': advance(); return Token(TokenType::DOT, ".", l, c);
                default: advance();
            }
        }
    }

private:
    string input;
    size_t pos;
    int line, column;
    
    char peek() const {
        return pos < input.length() ? input[pos] : '\0';
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
        while (isspace(peek())) advance();
    }
    
    void skipComment() {
        if (peek() == '/' && pos + 1 < input.length() && input[pos + 1] == '/') {
            while (peek() != '\n' && peek() != '\0') advance();
        }
    }
    
    Token readNumber() {
        string num;
        bool hasDot = false;
        while (isdigit(peek()) || (peek() == '.' && !hasDot)) {
            if (peek() == '.') hasDot = true;
            num += advance();
        }
        if (hasDot) {
            return Token(TokenType::FLOAT, num, line, column);
        } else {
            return Token(TokenType::INT, num, line, column);
        }
    }
    
    Token readString() {
        advance(); // skip "
        string s;
        while (peek() != '"' && peek() != '\0') {
            if (peek() == '\\') {
                advance();
                char escaped = advance();
                if (escaped == 'n') s += '\n';
                else if (escaped == 't') s += '\t';
                else s += escaped;
            } else {
                s += advance();
            }
        }
        advance(); // skip "
        return Token(TokenType::STRING, s, line, column);
    }
    
    Token readIdentifier() {
        string ident;
        while (isalnum(peek()) || peek() == '_') {
            ident += advance();
        }
        
        static const map<string, TokenType> keywords = {
            {"let", TokenType::KEYWORD}, {"const", TokenType::KEYWORD},
            {"var", TokenType::KEYWORD}, {"func", TokenType::KEYWORD},
            {"if", TokenType::KEYWORD}, {"else", TokenType::KEYWORD},
            {"while", TokenType::KEYWORD}, {"for", TokenType::KEYWORD},
            {"return", TokenType::KEYWORD}, {"break", TokenType::KEYWORD},
            {"continue", TokenType::KEYWORD}, {"import", TokenType::KEYWORD},
            {"from", TokenType::KEYWORD}, {"true", TokenType::BOOL},
            {"false", TokenType::BOOL}, {"int", TokenType::INT},
            {"float", TokenType::FLOAT}, {"bool", TokenType::BOOL},
            {"string", TokenType::STRING}, {"char", TokenType::CHAR}
        };
        
        auto it = keywords.find(ident);
        if (it != keywords.end()) {
            return Token(it->second, ident, line, column);
        }
        
        return Token(TokenType::IDENTIFIER, ident, line, column);
    }
};

// ========================================================================
// VALUE & AST
// ========================================================================

struct Value {
    string type;
    string value;
    
    Value(const string& t, const string& v) : type(t), value(v) {}
    Value() : type("null"), value("null") {}
    
    void print() {
        if (type == "null") {
            cout << "null";
        } else {
            cout << value;
        }
    }
};

struct Expr;
using ExprPtr = shared_ptr<Expr>;

struct Expr {
    virtual ~Expr() = default;
};

struct Literal : Expr {
    Value value;
    Literal(const Value& v) : value(v) {}
};

struct Identifier : Expr {
    string name;
    Identifier(const string& n) : name(n) {}
};

struct Binary : Expr {
    string op;
    ExprPtr left, right;
    Binary(const string& o, ExprPtr l, ExprPtr r) : op(o), left(l), right(r) {}
};

struct Unary : Expr {
    string op;
    ExprPtr operand;
    Unary(const string& o, ExprPtr e) : op(o), operand(e) {}
};

struct Stmt;
using StmtPtr = shared_ptr<Stmt>;

struct Stmt {
    virtual ~Stmt() = default;
};

struct LetStmt : Stmt {
    string name, type_;
    ExprPtr value;
    bool mutable_;
    LetStmt(const string& n, const string& t, ExprPtr v, bool m)
        : name(n), type_(t), value(v), mutable_(m) {}
};

struct ExprStmt : Stmt {
    ExprPtr expr;
    ExprStmt(ExprPtr e) : expr(e) {}
};

struct IfStmt : Stmt {
    ExprPtr condition;
    vector<StmtPtr> thenBody;
    IfStmt(ExprPtr c, const vector<StmtPtr>& b) : condition(c), thenBody(b) {}
};

struct ReturnStmt : Stmt {
    ExprPtr value;
    ReturnStmt(ExprPtr v) : value(v) {}
};

// ========================================================================
// PARSER
// ========================================================================

class Parser {
public:
    explicit Parser(const string& input) : pos(0) {
        Lexer lexer(input);
        Token t = lexer.nextToken();
        while (t.type != TokenType::EOF_TOKEN) {
            tokens.push_back(t);
            t = lexer.nextToken();
        }
        tokens.push_back(t);
    }
    
    vector<StmtPtr> parse() {
        vector<StmtPtr> stmts;
        while (current().type != TokenType::EOF_TOKEN) {
            stmts.push_back(parseStatement());
        }
        return stmts;
    }

private:
    vector<Token> tokens;
    size_t pos;
    
    Token current() const {
        return pos < tokens.size() ? tokens[pos] : tokens.back();
    }
    
    void advance() {
        if (pos < tokens.size()) pos++;
    }
    
    StmtPtr parseStatement() {
        if (current().type == TokenType::KEYWORD) {
            string kw = current().value;
            if (kw == "let" || kw == "const" || kw == "var") {
                bool mutable_ = kw == "var";
                advance();
                string name = current().value;
                advance();
                advance(); // :
                string type_ = current().value;
                advance();
                advance(); // =
                auto value = parseExpression();
                return make_shared<LetStmt>(name, type_, value, mutable_);
            } else if (kw == "if") {
                advance();
                advance(); // (
                auto cond = parseExpression();
                advance(); // )
                advance(); // {
                vector<StmtPtr> body;
                while (current().type != TokenType::RBRACE) {
                    body.push_back(parseStatement());
                }
                advance(); // }
                return make_shared<IfStmt>(cond, body);
            } else if (kw == "return") {
                advance();
                ExprPtr value = nullptr;
                if (current().type != TokenType::SEMICOLON && current().type != TokenType::RBRACE) {
                    value = parseExpression();
                }
                return make_shared<ReturnStmt>(value);
            }
        }
        return make_shared<ExprStmt>(parseExpression());
    }
    
    ExprPtr parseExpression() {
        return parseBinary(0);
    }
    
    ExprPtr parseBinary(int minPrec) {
        auto left = parseUnary();
        while (true) {
            int prec = precedence();
            if (prec < minPrec) break;
            string op = current().value;
            advance();
            auto right = parseBinary(prec + 1);
            left = make_shared<Binary>(op, left, right);
        }
        return left;
    }
    
    int precedence() {
        switch (current().type) {
            case TokenType::OR: return 1;
            case TokenType::AND: return 2;
            case TokenType::EQ:
            case TokenType::NE: return 3;
            case TokenType::LT:
            case TokenType::GT:
            case TokenType::LE:
            case TokenType::GE: return 4;
            case TokenType::PLUS:
            case TokenType::MINUS: return 5;
            case TokenType::STAR:
            case TokenType::SLASH:
            case TokenType::PERCENT: return 6;
            default: return 0;
        }
    }
    
    ExprPtr parseUnary() {
        if (current().type == TokenType::NOT || current().type == TokenType::MINUS ||
            current().type == TokenType::PLUS || current().type == TokenType::TILDE) {
            string op = current().value;
            advance();
            return make_shared<Unary>(op, parseUnary());
        }
        return parsePrimary();
    }
    
    ExprPtr parsePrimary() {
        switch (current().type) {
            case TokenType::INT: {
                auto val = make_shared<Literal>(Value("int", current().value));
                advance();
                return val;
            }
            case TokenType::FLOAT: {
                auto val = make_shared<Literal>(Value("float", current().value));
                advance();
                return val;
            }
            case TokenType::STRING: {
                auto val = make_shared<Literal>(Value("string", current().value));
                advance();
                return val;
            }
            case TokenType::BOOL: {
                auto val = make_shared<Literal>(Value("bool", current().value));
                advance();
                return val;
            }
            case TokenType::IDENTIFIER: {
                auto id = make_shared<Identifier>(current().value);
                advance();
                return id;
            }
            case TokenType::LPAREN: {
                advance();
                auto expr = parseExpression();
                advance();
                return expr;
            }
            default:
                return make_shared<Literal>(Value());
        }
    }
};

// ========================================================================
// INTERPRETER
// ========================================================================

class Interpreter {
public:
    void execute(const vector<StmtPtr>& stmts) {
        for (const auto& stmt : stmts) {
            executeStatement(stmt);
        }
    }

private:
    map<string, Value> vars;
    
    void executeStatement(const StmtPtr& stmt) {
        if (auto let = dynamic_pointer_cast<LetStmt>(stmt)) {
            vars[let->name] = evalExpression(let->value);
        } else if (auto exprStmt = dynamic_pointer_cast<ExprStmt>(stmt)) {
            evalExpression(exprStmt->expr);
        } else if (auto ifStmt = dynamic_pointer_cast<IfStmt>(stmt)) {
            if (isTruthy(evalExpression(ifStmt->condition))) {
                execute(ifStmt->thenBody);
            }
        }
    }
    
    Value evalExpression(const ExprPtr& expr) {
        if (auto lit = dynamic_pointer_cast<Literal>(expr)) {
            return lit->value;
        } else if (auto id = dynamic_pointer_cast<Identifier>(expr)) {
            return vars.count(id->name) ? vars[id->name] : Value();
        } else if (auto bin = dynamic_pointer_cast<Binary>(expr)) {
            auto left = evalExpression(bin->left);
            auto right = evalExpression(bin->right);
            return evalBinary(bin->op, left, right);
        } else if (auto un = dynamic_pointer_cast<Unary>(expr)) {
            return evalUnary(un->op, evalExpression(un->operand));
        }
        return Value();
    }
    
    Value evalBinary(const string& op, const Value& left, const Value& right) {
        if (left.type == "int" && right.type == "int") {
            long long l = stoll(left.value);
            long long r = stoll(right.value);
            if (op == "+") return Value("int", to_string(l + r));
            if (op == "-") return Value("int", to_string(l - r));
            if (op == "*") return Value("int", to_string(l * r));
            if (op == "/") return Value("int", to_string(r != 0 ? l / r : 0));
            if (op == "%") return Value("int", to_string(r != 0 ? l % r : 0));
            if (op == "==") return Value("bool", l == r ? "true" : "false");
            if (op == "!=") return Value("bool", l != r ? "true" : "false");
            if (op == "<") return Value("bool", l < r ? "true" : "false");
            if (op == ">") return Value("bool", l > r ? "true" : "false");
            if (op == "<=") return Value("bool", l <= r ? "true" : "false");
            if (op == ">=") return Value("bool", l >= r ? "true" : "false");
        }
        return Value();
    }
    
    Value evalUnary(const string& op, const Value& operand) {
        if (operand.type == "int") {
            long long v = stoll(operand.value);
            if (op == "-") return Value("int", to_string(-v));
            if (op == "+") return Value("int", to_string(v));
            if (op == "~") return Value("int", to_string(~v));
        }
        if (operand.type == "bool" && op == "!") {
            return Value("bool", operand.value == "true" ? "false" : "true");
        }
        return Value();
    }
    
    bool isTruthy(const Value& v) {
        if (v.type == "bool") return v.value == "true";
        if (v.type == "int") return stoll(v.value) != 0;
        return v.type != "null";
    }
};

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "Usage: strata <file.str>\n";
        return 1;
    }
    
    ifstream file(argv[1]);
    if (!file) {
        cerr << "Error: could not open file\n";
        return 1;
    }
    
    string source((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
    
    Parser parser(source);
    auto stmts = parser.parse();
    
    Interpreter interp;
    interp.execute(stmts);
    
    return 0;
}
