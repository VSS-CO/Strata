#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <unordered_map>
#include <variant>
#include <cctype>
#include <memory>

// ============================================================================
// STRATA INTERPRETER IN C++
// Lexer, Parser, AST, Interpreter
// ============================================================================

// ===================== TOKENS =====================

enum class TokenType {
    INT, FLOAT, STRING, BOOL, CHAR,
    IDENTIFIER, KEYWORD,
    PLUS, MINUS, STAR, SLASH, PERCENT,
    EQ, NE, LT, GT, LE, GE,
    AND, OR, NOT, TILDE,
    ASSIGN, ARROW,
    LPAREN, RPAREN, LBRACE, RBRACE,
    SEMICOLON, COMMA, COLON, DOT,
    EOF_TOKEN
};

struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
};

// ===================== LEXER =====================

class Lexer {
    std::string input;
    size_t pos = 0;
    int line = 1;
    int column = 1;

public:
    explicit Lexer(const std::string& src) : input(src) {}

    char peek() const {
        if (pos >= input.size()) return '\0';
        return input[pos];
    }

    char advance() {
        if (pos >= input.size()) return '\0';
        char ch = input[pos++];
        if (ch == '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
        return ch;
    }

    void skipWhitespace() {
        while (std::isspace(peek())) advance();
    }

    void skipComment() {
        if (peek() == '/' && pos + 1 < input.size() && input[pos + 1] == '/') {
            while (peek() != '\n' && peek() != '\0') advance();
        }
    }

    Token readNumber() {
        std::string num;
        bool hasDot = false;

        while (true) {
            char ch = peek();
            if (std::isdigit(ch)) {
                num += advance();
            } else if (ch == '.' && !hasDot) {
                hasDot = true;
                num += advance();
            } else break;
        }

        return {
            hasDot ? TokenType::FLOAT : TokenType::INT,
            num,
            line,
            column
        };
    }

    Token readString() {
        advance(); // skip "
        std::string s;

        while (peek() != '"' && peek() != '\0') {
            if (peek() == '\\') {
                advance();
                char ch = advance();
                if (ch == 'n') s += '\n';
                else if (ch == 't') s += '\t';
                else s += ch;
            } else {
                s += advance();
            }
        }
        advance(); // skip "
        return {TokenType::STRING, s, line, column};
    }

    Token readIdentifier() {
        std::string ident;
        while (std::isalnum(peek()) || peek() == '_') {
            ident += advance();
        }

        static std::unordered_map<std::string, bool> keywords = {
            {"let",true},{"const",true},{"var",true},{"func",true},
            {"if",true},{"else",true},{"while",true},{"for",true},
            {"return",true},{"break",true},{"continue",true},
            {"true",true},{"false",true},
            {"int",true},{"float",true},{"bool",true},
            {"string",true},{"char",true},{"any",true}
        };

        if (keywords.count(ident))
            return {TokenType::KEYWORD, ident, line, column};

        return {TokenType::IDENTIFIER, ident, line, column};
    }

    Token nextToken() {
        while (true) {
            skipWhitespace();
            skipComment();
            skipWhitespace();

            if (peek() == '\0')
                return {TokenType::EOF_TOKEN, "", line, column};

            char ch = peek();
            int l = line, c = column;

            if (std::isdigit(ch)) return readNumber();
            if (ch == '"') return readString();
            if (std::isalpha(ch) || ch == '_') return readIdentifier();

            advance();
            switch (ch) {
                case '+': return {TokenType::PLUS,"+",l,c};
                case '-': return {TokenType::MINUS,"-",l,c};
                case '*': return {TokenType::STAR,"*",l,c};
                case '/': return {TokenType::SLASH,"/",l,c};
                case '%': return {TokenType::PERCENT,"%",l,c};
                case '=':
                    if (peek()=='='){ advance(); return {TokenType::EQ,"==",l,c}; }
                    if (peek()=='>'){ advance(); return {TokenType::ARROW,"=>",l,c}; }
                    return {TokenType::ASSIGN,"=",l,c};
                case '!':
                    if (peek()=='='){ advance(); return {TokenType::NE,"!=",l,c}; }
                    return {TokenType::NOT,"!",l,c};
                case '<':
                    if (peek()=='='){ advance(); return {TokenType::LE,"<=",l,c}; }
                    return {TokenType::LT,"<",l,c};
                case '>':
                    if (peek()=='='){ advance(); return {TokenType::GE,">=",l,c}; }
                    return {TokenType::GT,">",l,c};
                case '&':
                    if (peek()=='&'){ advance(); return {TokenType::AND,"&&",l,c}; }
                    break;
                case '|':
                    if (peek()=='|'){ advance(); return {TokenType::OR,"||",l,c}; }
                    break;
                case '~': return {TokenType::TILDE,"~",l,c};
                case '(': return {TokenType::LPAREN,"(",l,c};
                case ')': return {TokenType::RPAREN,")",l,c};
                case '{': return {TokenType::LBRACE,"{",l,c};
                case '}': return {TokenType::RBRACE,"}",l,c};
                case ';': return {TokenType::SEMICOLON,";",l,c};
                case ',': return {TokenType::COMMA,",",l,c};
                case ':': return {TokenType::COLON,":",l,c};
                case '.': return {TokenType::DOT,".",l,c};
            }
        }
    }
};

// ===================== AST & VALUES =====================

struct Value {
    std::string type;
    std::variant<int64_t,double,bool,std::string,std::nullptr_t> value;
};

struct Expr { virtual ~Expr() = default; };
struct Stmt { virtual ~Stmt() = default; };

using ExprPtr = std::shared_ptr<Expr>;
using StmtPtr = std::shared_ptr<Stmt>;

struct LiteralExpr : Expr { Value value; };
struct IdentifierExpr : Expr { std::string name; };

struct BinaryExpr : Expr {
    std::string op;
    ExprPtr left, right;
};

struct UnaryExpr : Expr {
    std::string op;
    ExprPtr operand;
};

struct LetStmt : Stmt {
    std::string name, type;
    ExprPtr value;
    bool mutableVar;
};

struct ExprStmt : Stmt { ExprPtr expr; };

struct IfStmt : Stmt {
    ExprPtr condition;
    std::vector<StmtPtr> thenBody;
};

// ===================== PARSER =====================

class Parser {
    std::vector<Token> tokens;
    size_t pos = 0;

public:
    explicit Parser(const std::string& src) {
        Lexer lex(src);
        while (true) {
            Token t = lex.nextToken();
            tokens.push_back(t);
            if (t.type == TokenType::EOF_TOKEN) break;
        }
    }

    Token& current() { return tokens[pos]; }
    void advance() { if (pos < tokens.size()) pos++; }

    std::vector<StmtPtr> parse() {
        std::vector<StmtPtr> stmts;
        while (current().type != TokenType::EOF_TOKEN) {
            stmts.push_back(parseStatement());
        }
        return stmts;
    }

    StmtPtr parseStatement() {
        if (current().type == TokenType::KEYWORD) {
            std::string kw = current().value;

            if (kw=="let"||kw=="var"||kw=="const") {
                bool mut = kw=="var";
                advance();
                std::string name = current().value; advance();
                advance(); // :
                std::string type = current().value; advance();
                advance(); // =
                auto expr = parseExpression();
                return std::make_shared<LetStmt>(LetStmt{name,type,expr,mut});
            }

            if (kw=="if") {
                advance(); advance(); // (
                auto cond = parseExpression();
                advance(); advance(); // ){ 
                std::vector<StmtPtr> body;
                while (current().type != TokenType::RBRACE)
                    body.push_back(parseStatement());
                advance();
                return std::make_shared<IfStmt>(IfStmt{cond,body});
            }
        }
        return std::make_shared<ExprStmt>(ExprStmt{parseExpression()});
    }

    ExprPtr parseExpression() { return parseBinary(0); }

    int precedence() {
        switch (current().type) {
            case TokenType::OR: return 1;
            case TokenType::AND: return 2;
            case TokenType::EQ: case TokenType::NE: return 3;
            case TokenType::LT: case TokenType::GT:
            case TokenType::LE: case TokenType::GE: return 4;
            case TokenType::PLUS: case TokenType::MINUS: return 5;
            case TokenType::STAR: case TokenType::SLASH:
            case TokenType::PERCENT: return 6;
            default: return 0;
        }
    }

    ExprPtr parseBinary(int minPrec) {
        auto left = parseUnary();
        while (precedence() >= minPrec) {
            std::string op = current().value;
            int prec = precedence();
            advance();
            auto right = parseBinary(prec+1);
            left = std::make_shared<BinaryExpr>(BinaryExpr{op,left,right});
        }
        return left;
    }

    ExprPtr parseUnary() {
        if (current().type==TokenType::NOT ||
            current().type==TokenType::MINUS ||
            current().type==TokenType::PLUS ||
            current().type==TokenType::TILDE) {
            std::string op = current().value;
            advance();
            return std::make_shared<UnaryExpr>(UnaryExpr{op,parseUnary()});
        }
        return parsePrimary();
    }

    ExprPtr parsePrimary() {
        if (current().type==TokenType::INT) {
            auto v = std::stoll(current().value);
            advance();
            return std::make_shared<LiteralExpr>(LiteralExpr{{"int",v}});
        }
        if (current().type==TokenType::FLOAT) {
            auto v = std::stod(current().value);
            advance();
            return std::make_shared<LiteralExpr>(LiteralExpr{{"float",v}});
        }
        if (current().type==TokenType::STRING) {
            auto v = current().value;
            advance();
            return std::make_shared<LiteralExpr>(LiteralExpr{{"string",v}});
        }
        if (current().type==TokenType::IDENTIFIER) {
            std::string name = current().value;
            advance();
            return std::make_shared<IdentifierExpr>(IdentifierExpr{name});
        }
        advance();
        return std::make_shared<LiteralExpr>(LiteralExpr{{"null",nullptr}});
    }
};

// ===================== INTERPRETER =====================

class Interpreter {
    std::unordered_map<std::string,Value> vars;

public:
    void execute(const std::vector<StmtPtr>& stmts) {
        for (auto& s : stmts) executeStmt(s);
    }

    void executeStmt(const StmtPtr& stmt) {
        if (auto let = std::dynamic_pointer_cast<LetStmt>(stmt)) {
            vars[let->name] = eval(let->value);
        }
        if (auto expr = std::dynamic_pointer_cast<ExprStmt>(stmt)) {
            eval(expr->expr);
        }
        if (auto iff = std::dynamic_pointer_cast<IfStmt>(stmt)) {
            if (isTruthy(eval(iff->condition)))
                execute(iff->thenBody);
        }
    }

    Value eval(const ExprPtr& expr) {
        if (auto lit = std::dynamic_pointer_cast<LiteralExpr>(expr)) return lit->value;
        if (auto id = std::dynamic_pointer_cast<IdentifierExpr>(expr))
            return vars.count(id->name)?vars[id->name]:Value{"null",nullptr};

        if (auto bin = std::dynamic_pointer_cast<BinaryExpr>(expr))
            return evalBinary(bin->op, eval(bin->left), eval(bin->right));

        if (auto un = std::dynamic_pointer_cast<UnaryExpr>(expr))
            return evalUnary(un->op, eval(un->operand));

        return {"null",nullptr};
    }

    Value evalBinary(const std::string& op, Value l, Value r) {
        if (l.type=="int" && r.type=="int") {
            int64_t a = std::get<int64_t>(l.value);
            int64_t b = std::get<int64_t>(r.value);
            if (op=="+") return {"int",a+b};
            if (op=="-") return {"int",a-b};
            if (op=="*") return {"int",a*b};
            if (op=="/") return {"int",b?a/b:0};
            if (op=="%") return {"int",b?a%b:0};
            if (op=="==") return {"bool",a==b};
            if (op=="!=") return {"bool",a!=b};
            if (op=="<") return {"bool",a<b};
            if (op==">") return {"bool",a>b};
            if (op=="<=") return {"bool",a<=b};
            if (op==">=") return {"bool",a>=b};
        }
        return {"null",nullptr};
    }

    Value evalUnary(const std::string& op, Value v) {
        if (v.type=="int") {
            int64_t x = std::get<int64_t>(v.value);
            if (op=="-") return {"int",-x};
            if (op=="+") return {"int",x};
            if (op=="~") return {"int",~x};
        }
        if (v.type=="bool" && op=="!")
            return {"bool",!std::get<bool>(v.value)};
        return {"null",nullptr};
    }

    bool isTruthy(const Value& v) {
        if (v.type=="bool") return std::get<bool>(v.value);
        if (v.type=="int") return std::get<int64_t>(v.value)!=0;
        return false;
    }
};

// ===================== MAIN =====================

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: strata <file.str>\n";
        return 1;
    }

    std::ifstream file(argv[1]);
    std::stringstream buffer;
    buffer << file.rdbuf();

    Parser parser(buffer.str());
    auto stmts = parser.parse();

    Interpreter interpreter;
    interpreter.execute(stmts);
}
