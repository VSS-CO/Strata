#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <cmath>
#include <cctype>
#include <algorithm>

using namespace std;

enum TypeKind {
    TYPE_PRIMITIVE,
    TYPE_UNION,
    TYPE_INTERFACE,
    TYPE_OPTIONAL
};

struct TypeDef {
    TypeKind kind;
    string name;
    string primitive;
    vector<shared_ptr<TypeDef>> types;
    map<string, shared_ptr<TypeDef>> fields;
};

struct Location {
    int line;
    int column;
    string source;
};

struct TokenResult {
    string token;
    Location location;
};

struct Expr;
struct Stmt;

struct Expr {
    string type;
    Location* location;
    string name;
    double value;
    string string_value;
    bool bool_value;
    string module;
    string func;
    vector<shared_ptr<Expr>> args;
    string op;
    shared_ptr<Expr> left;
    shared_ptr<Expr> right;
    shared_ptr<Expr> arg;
    vector<shared_ptr<Expr>> elements;

    Expr() : value(0), bool_value(false), location(nullptr) {}
};

struct Stmt {
    string type;
    Location* location;
    string module_name;
    string func_name;
    shared_ptr<TypeDef> return_type;
    vector<shared_ptr<Stmt>> body;
    string var_name;
    shared_ptr<TypeDef> var_type;
    shared_ptr<Expr> var_val;
    bool mutable_var;
    shared_ptr<Expr> condition;
    vector<shared_ptr<Stmt>> then_branch;
    vector<shared_ptr<Stmt>> else_branch;
    vector<shared_ptr<Stmt>> while_body;
    shared_ptr<Stmt> init;
    shared_ptr<Expr> cond;
    shared_ptr<Stmt> update;
    shared_ptr<Expr> ret_val;
    shared_ptr<Expr> print_expr;
    shared_ptr<Expr> stmt_expr;

    Stmt() : location(nullptr), mutable_var(false) {}
};

class Lexer {
private:
    string input;
    int pos;
    int line;
    int column;
    int line_start;

public:
    Lexer(const string& src) : input(src), pos(0), line(1), column(1), line_start(0) {}

    char peek() {
        if (pos >= input.length()) return 0;
        return input[pos];
    }

    char advance() {
        char ch = peek();
        pos++;
        if (ch == '\n') {
            line++;
            column = 1;
            line_start = pos;
        } else {
            column++;
        }
        return ch;
    }

    Location getLocation() {
        Location loc;
        loc.line = line;
        loc.column = column;
        int end = min((int)input.length(), pos);
        loc.source = input.substr(line_start, end - line_start);
        return loc;
    }

    shared_ptr<TokenResult> nextToken() {
        while (peek() == ' ' || peek() == '\n' || peek() == '\r' || peek() == '\t') {
            advance();
        }

        if (peek() == '/' && pos + 1 < input.length() && input[pos + 1] == '/') {
            while (peek() != 0 && peek() != '\n') {
                advance();
            }
            return nextToken();
        }

        if (peek() == 0) return nullptr;

        Location loc = getLocation();
        auto result = make_shared<TokenResult>();
        result->location = loc;

        string twoChar = "";
        if (pos + 2 <= input.length()) {
            twoChar = input.substr(pos, 2);
        }

        if (twoChar == "==" || twoChar == "!=" || twoChar == "<=" || twoChar == ">=" ||
            twoChar == "=>" || twoChar == "||" || twoChar == "&&" || twoChar == "++" || twoChar == "--") {
            result->token = twoChar;
            advance();
            advance();
            return result;
        }

        char ch = peek();
        if (isalpha(ch) || ch == '_') {
            string word = "";
            while (isalnum(peek()) || peek() == '_') {
                word += advance();
            }
            result->token = word;
            return result;
        }

        if (ch == '"') {
            advance();
            string value = "";
            while (peek() != 0 && peek() != '"') {
                if (peek() == '\\') {
                    advance();
                    char next = advance();
                    if (next == 'n') value += '\n';
                    else if (next == 't') value += '\t';
                    else value += next;
                } else {
                    value += advance();
                }
            }
            if (peek() == '"') advance();
            result->token = "\"" + value + "\"";
            return result;
        }

        if (ch == '\'') {
            advance();
            string value = "";
            while (peek() != 0 && peek() != '\'') {
                value += advance();
            }
            if (peek() == '\'') advance();
            result->token = "'" + value + "'";
            return result;
        }

        if (isdigit(ch)) {
            string num = "";
            while (isdigit(peek())) {
                num += advance();
            }
            if (peek() == '.' && pos + 1 < input.length() && isdigit(input[pos + 1])) {
                num += advance();
                while (isdigit(peek())) {
                    num += advance();
                }
            }
            result->token = num;
            return result;
        }

        result->token += advance();
        return result;
    }
};

class Parser {
private:
    vector<TokenResult> tokens;
    int token_idx;

public:
    Parser(Lexer& lexer) : token_idx(0) {
        shared_ptr<TokenResult> tok;
        while ((tok = lexer.nextToken()) != nullptr) {
            tokens.push_back(*tok);
        }
    }

    TokenResult* current() {
        if (token_idx < tokens.size()) {
            return &tokens[token_idx];
        }
        return nullptr;
    }

    void advance() {
        token_idx++;
    }

    bool match(const string& token) {
        TokenResult* cur = current();
        if (!cur) return false;
        return cur->token == token;
    }

    int precedence(const string& op) {
        if (op == "||") return 1;
        if (op == "&&") return 2;
        if (op == "==" || op == "!=") return 3;
        if (op == "<" || op == ">" || op == "<=" || op == ">=") return 4;
        if (op == "+" || op == "-") return 5;
        if (op == "*" || op == "/" || op == "%") return 6;
        return 0;
    }

    shared_ptr<Expr> parseBinary(int minPrec) {
        auto left = parseUnary();
        while (current()) {
            int prec = precedence(current()->token);
            if (prec == 0 || prec < minPrec) break;
            string op = current()->token;
            advance();
            auto right = parseBinary(prec + 1);
            auto binary = make_shared<Expr>();
            binary->type = "Binary";
            binary->op = op;
            binary->left = left;
            binary->right = right;
            left = binary;
        }
        return left;
    }

    shared_ptr<Expr> parseUnary() {
        TokenResult* cur = current();
        if (cur && (cur->token == "!" || cur->token == "-" || cur->token == "+" || cur->token == "~")) {
            auto expr = make_shared<Expr>();
            expr->type = "Unary";
            expr->op = cur->token;
            advance();
            expr->arg = parseUnary();
            return expr;
        }
        return parsePrimary();
    }

    shared_ptr<Expr> parsePrimary() {
        TokenResult* cur = current();
        if (!cur) return nullptr;

        if (isdigit(cur->token[0]) || (cur->token[0] == '-' && cur->token.length() > 1 && isdigit(cur->token[1]))) {
            auto expr = make_shared<Expr>();
            expr->type = "Number";
            expr->value = stod(cur->token);
            advance();
            return expr;
        }

        if (cur->token[0] == '"') {
            auto expr = make_shared<Expr>();
            expr->type = "String";
            expr->string_value = cur->token.substr(1, cur->token.length() - 2);
            advance();
            return expr;
        }

        if (cur->token == "true") {
            auto expr = make_shared<Expr>();
            expr->type = "Bool";
            expr->bool_value = true;
            advance();
            return expr;
        }

        if (cur->token == "false") {
            auto expr = make_shared<Expr>();
            expr->type = "Bool";
            expr->bool_value = false;
            advance();
            return expr;
        }

        auto expr = make_shared<Expr>();
        expr->type = "Var";
        expr->name = cur->token;
        advance();
        return expr;
    }

    shared_ptr<Expr> parseExpr() {
        return parseBinary(0);
    }

    vector<shared_ptr<Stmt>> parseBlock() {
        vector<shared_ptr<Stmt>> stmts;
        while (current() && !match("}")) {
            stmts.push_back(parseStmt());
        }
        return stmts;
    }

    shared_ptr<Stmt> parseStmt() {
        TokenResult* cur = current();
        if (!cur) return nullptr;

        auto stmt = make_shared<Stmt>();

        if (cur->token == "import") {
            stmt->type = "Import";
            advance();
            stmt->module_name = current()->token;
            advance();
            if (match("from")) {
                advance();
                advance();
            }
            return stmt;
        }

        if (cur->token == "if") {
            stmt->type = "If";
            advance();
            advance();
            stmt->condition = parseExpr();
            advance();
            advance();
            stmt->then_branch = parseBlock();
            advance();
            if (match("else")) {
                advance();
                if (match("{")) {
                    advance();
                    stmt->else_branch = parseBlock();
                    advance();
                }
            }
            return stmt;
        }

        if (cur->token == "while") {
            stmt->type = "While";
            advance();
            advance();
            stmt->condition = parseExpr();
            advance();
            advance();
            stmt->while_body = parseBlock();
            advance();
            return stmt;
        }

        if (cur->token == "var" || cur->token == "let" || cur->token == "const") {
            stmt->type = "VarDecl";
            string keyword = cur->token;
            advance();
            stmt->var_name = current()->token;
            advance();
            advance();
            auto type_def = make_shared<TypeDef>();
            type_def->kind = TYPE_PRIMITIVE;
            type_def->primitive = current()->token;
            stmt->var_type = type_def;
            advance();
            if (match("=")) {
                advance();
                stmt->var_val = parseExpr();
            }
            stmt->mutable_var = (keyword == "var");
            return stmt;
        }

        if (cur->token == "return") {
            stmt->type = "Return";
            advance();
            if (!match("}")) {
                stmt->ret_val = parseExpr();
            }
            return stmt;
        }

        if (cur->token == "break") {
            stmt->type = "Break";
            advance();
            return stmt;
        }

        if (cur->token == "continue") {
            stmt->type = "Continue";
            advance();
            return stmt;
        }

        auto expr = parseExpr();
        stmt->type = "ExprStmt";
        stmt->stmt_expr = expr;
        return stmt;
    }

    vector<shared_ptr<Stmt>> parseProgram() {
        vector<shared_ptr<Stmt>> stmts;
        while (current()) {
            stmts.push_back(parseStmt());
        }
        return stmts;
    }
};

class Interpreter {
private:
    map<string, double> vars;
    map<string, bool> mutable_map;

public:
    double evalExpr(shared_ptr<Expr> expr);
    void evalStmt(shared_ptr<Stmt> stmt);

    double evalBinary(shared_ptr<Expr> expr) {
        double left = evalExpr(expr->left);
        double right = evalExpr(expr->right);

        if (expr->op == "+") return left + right;
        if (expr->op == "-") return left - right;
        if (expr->op == "*") return left * right;
        if (expr->op == "/") return left / right;
        if (expr->op == "%") return (double)((long)left % (long)right);
        if (expr->op == "==") return left == right ? 1 : 0;
        if (expr->op == "!=") return left != right ? 1 : 0;
        if (expr->op == "<") return left < right ? 1 : 0;
        if (expr->op == ">") return left > right ? 1 : 0;
        if (expr->op == "<=") return left <= right ? 1 : 0;
        if (expr->op == ">=") return left >= right ? 1 : 0;
        if (expr->op == "&&") return (left != 0 && right != 0) ? 1 : 0;
        if (expr->op == "||") return (left != 0 || right != 0) ? 1 : 0;
        return 0;
    }

    double evalExpr(shared_ptr<Expr> expr) {
        if (!expr) return 0;

        if (expr->type == "Number") return expr->value;
        if (expr->type == "Bool") return expr->bool_value ? 1 : 0;
        if (expr->type == "Var") {
            if (vars.find(expr->name) != vars.end()) {
                return vars[expr->name];
            }
            return 0;
        }
        if (expr->type == "Binary") return evalBinary(expr);
        if (expr->type == "Unary") {
            double arg = evalExpr(expr->arg);
            if (expr->op == "-") return -arg;
            if (expr->op == "+") return arg;
            if (expr->op == "!") return arg == 0 ? 1 : 0;
            if (expr->op == "~") return (double)(~(long)arg);
        }
        if (expr->type == "Call") {
            if (expr->module == "io" && expr->func == "print") {
                if (expr->args.size() > 0) {
                    double val = evalExpr(expr->args[0]);
                    cout << val << endl;
                }
            }
        }
        return 0;
    }

    void evalStmt(shared_ptr<Stmt> stmt) {
        if (!stmt) return;

        if (stmt->type == "VarDecl") {
            double val = 0;
            if (stmt->var_val) {
                val = evalExpr(stmt->var_val);
            }
            vars[stmt->var_name] = val;
            mutable_map[stmt->var_name] = stmt->mutable_var;
        }
        if (stmt->type == "If") {
            double cond = evalExpr(stmt->condition);
            if (cond != 0) {
                for (auto& s : stmt->then_branch) {
                    evalStmt(s);
                }
            } else if (!stmt->else_branch.empty()) {
                for (auto& s : stmt->else_branch) {
                    evalStmt(s);
                }
            }
        }
        if (stmt->type == "While") {
            while (evalExpr(stmt->condition) != 0) {
                for (auto& s : stmt->while_body) {
                    evalStmt(s);
                }
            }
        }
        if (stmt->type == "ExprStmt") {
            evalExpr(stmt->stmt_expr);
        }
    }

    void run(vector<shared_ptr<Stmt>>& program) {
        for (auto& stmt : program) {
            evalStmt(stmt);
        }
    }
};

class CGenerator {
private:
    vector<string> lines;
    int indent;

public:
    CGenerator() : indent(0) {}

    void addLine(const string& line) {
        lines.push_back(line);
    }

    string generate(vector<shared_ptr<Stmt>>& stmts) {
        addLine("#include <stdio.h>");
        addLine("#include <math.h>");
        addLine("#include <stdbool.h>");
        addLine("");
        addLine("int main() {");
        indent++;
        indent--;
        addLine("  return 0;");
        addLine("}");

        string result = "";
        for (const auto& line : lines) {
            result += line + "\n";
        }
        return result;
    }
};

int main(int argc, char* argv[]) {
    string filename = "myprogram.str";
    if (argc > 1) {
        filename = argv[1];
    }

    ifstream file(filename);
    if (!file.is_open()) {
        cerr << "Error: Cannot open file " << filename << endl;
        return 1;
    }

    stringstream buffer;
    buffer << file.rdbuf();
    string source = buffer.str();
    file.close();

    Lexer lexer(source);
    Parser parser(lexer);
    auto program = parser.parseProgram();

    Interpreter interp;
    interp.run(program);

    CGenerator cgen;
    string ccode = cgen.generate(program);

    ofstream outfile("out.c");
    outfile << ccode;
    outfile.close();

    cout << "C code generated: out.c" << endl;

    return 0;
}
