#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>
#include <stdbool.h>

#define MAX_TOKENS 10000
#define MAX_STRING 1024
#define MAX_VARS 1000

typedef enum {
    TYPE_INT,
    TYPE_FLOAT,
    TYPE_BOOL,
    TYPE_CHAR,
    TYPE_STRING,
    TYPE_ANY,
    TYPE_PRIMITIVE,
    TYPE_UNION,
    TYPE_INTERFACE,
    TYPE_OPTIONAL
} TypeKind;

typedef struct TypeDef {
    TypeKind kind;
    char* name;
    char* primitive;
    struct TypeDef** types;
    int types_count;
    int field_count;
} TypeDef;

typedef struct {
    int line;
    int column;
    char source[MAX_STRING];
} Location;

typedef struct {
    char token[MAX_STRING];
    Location location;
} TokenResult;

typedef struct Expr Expr;
typedef struct Stmt Stmt;

typedef struct Expr {
    char type[MAX_STRING];
    Location* location;
    char* name;
    double value;
    char* string_value;
    bool bool_value;
    char* module;
    char* func;
    Expr** args;
    int args_count;
    char* op;
    Expr* left;
    Expr* right;
    Expr* arg;
    Expr** elements;
    int elements_count;
} Expr;

typedef struct Stmt {
    char type[MAX_STRING];
    Location* location;
    char* module_name;
    char* func_name;
    TypeDef* return_type;
    Stmt** body;
    int body_count;
    char* var_name;
    TypeDef* var_type;
    Expr* var_val;
    bool mutable;
    Expr* condition;
    Stmt** then_branch;
    int then_count;
    Stmt** else_branch;
    int else_count;
    Stmt** while_body;
    int while_count;
    Stmt* init;
    Expr* cond;
    Stmt* update;
    Expr* ret_val;
    Expr* print_expr;
    Expr* stmt_expr;
} Stmt;

typedef struct {
    TokenResult tokens[MAX_TOKENS];
    int token_count;
    int token_idx;
} Parser;

typedef struct {
    char var_name[MAX_STRING];
    double var_value;
    bool is_mutable;
} Variable;

typedef struct {
    Variable vars[MAX_VARS];
    int var_count;
} Interpreter;

typedef struct {
    char* lines[10000];
    int line_count;
    int indent;
} CGenerator;

TypeDef* parseTypeAnnotation(const char* token) {
    TypeDef* t = (TypeDef*)malloc(sizeof(TypeDef));
    t->kind = TYPE_PRIMITIVE;
    t->primitive = (char*)malloc(strlen(token) + 1);
    strcpy(t->primitive, token);
    return t;
}

bool typeCompatible(TypeDef* actual, TypeDef* expected) {
    if (!actual || !expected) return true;
    if (strcmp(expected->primitive, "any") == 0) return true;
    if (strcmp(actual->primitive, "any") == 0) return true;
    if (strcmp(actual->primitive, expected->primitive) == 0) return true;
    if (strcmp(actual->primitive, "int") == 0 && strcmp(expected->primitive, "float") == 0) return true;
    if (strcmp(actual->primitive, "char") == 0 && strcmp(expected->primitive, "string") == 0) return true;
    return false;
}

typedef struct {
    char ch;
    int pos;
    int line;
    int column;
    int line_start;
    const char* input;
} Lexer;

Lexer* newLexer(const char* input) {
    Lexer* l = (Lexer*)malloc(sizeof(Lexer));
    l->input = input;
    l->pos = 0;
    l->line = 1;
    l->column = 1;
    l->line_start = 0;
    return l;
}

char lexerPeek(Lexer* l) {
    if (l->pos >= strlen(l->input)) return 0;
    return l->input[l->pos];
}

char lexerAdvance(Lexer* l) {
    char ch = lexerPeek(l);
    l->pos++;
    if (ch == '\n') {
        l->line++;
        l->column = 1;
        l->line_start = l->pos;
    } else {
        l->column++;
    }
    return ch;
}

Location getLocation(Lexer* l) {
    Location loc;
    loc.line = l->line;
    loc.column = l->column;
    int end = l->pos;
    if (end > strlen(l->input)) end = strlen(l->input);
    strncpy(loc.source, l->input + l->line_start, MAX_STRING - 1);
    return loc;
}

TokenResult* lexerNextToken(Lexer* l) {
    while (lexerPeek(l) == ' ' || lexerPeek(l) == '\n' || lexerPeek(l) == '\r' || lexerPeek(l) == '\t') {
        lexerAdvance(l);
    }

    if (lexerPeek(l) == '/' && l->pos + 1 < strlen(l->input) && l->input[l->pos + 1] == '/') {
        while (lexerPeek(l) != 0 && lexerPeek(l) != '\n') {
            lexerAdvance(l);
        }
        return lexerNextToken(l);
    }

    if (lexerPeek(l) == 0) return NULL;

    Location loc = getLocation(l);

    TokenResult* result = (TokenResult*)malloc(sizeof(TokenResult));
    result->location = loc;

    char twoChar[3] = {0};
    if (l->pos + 2 <= strlen(l->input)) {
        twoChar[0] = l->input[l->pos];
        twoChar[1] = l->input[l->pos + 1];
        twoChar[2] = 0;
    }

    if (strcmp(twoChar, "==") == 0 || strcmp(twoChar, "!=") == 0 || strcmp(twoChar, "<=") == 0 || 
        strcmp(twoChar, ">=") == 0 || strcmp(twoChar, "=>") == 0 || strcmp(twoChar, "||") == 0 || 
        strcmp(twoChar, "&&") == 0 || strcmp(twoChar, "++") == 0 || strcmp(twoChar, "--") == 0) {
        strcpy(result->token, twoChar);
        lexerAdvance(l);
        lexerAdvance(l);
        return result;
    }

    char ch = lexerPeek(l);
    if (isalpha(ch) || ch == '_') {
        char word[MAX_STRING] = {0};
        while (isalnum(lexerPeek(l)) || lexerPeek(l) == '_') {
            word[strlen(word)] = lexerAdvance(l);
        }
        strcpy(result->token, word);
        return result;
    }

    if (ch == '"') {
        lexerAdvance(l);
        char value[MAX_STRING] = {0};
        while (lexerPeek(l) != 0 && lexerPeek(l) != '"') {
            if (lexerPeek(l) == '\\') {
                lexerAdvance(l);
                char next = lexerAdvance(l);
                if (next == 'n') strcat(value, "\n");
                else if (next == 't') strcat(value, "\t");
                else {
                    value[strlen(value)] = next;
                    value[strlen(value) + 1] = 0;
                }
            } else {
                value[strlen(value)] = lexerAdvance(l);
                value[strlen(value) + 1] = 0;
            }
        }
        if (lexerPeek(l) == '"') lexerAdvance(l);
        snprintf(result->token, MAX_STRING, "\"%s\"", value);
        return result;
    }

    if (ch == '\'') {
        lexerAdvance(l);
        char value[MAX_STRING] = {0};
        while (lexerPeek(l) != 0 && lexerPeek(l) != '\'') {
            value[strlen(value)] = lexerAdvance(l);
            value[strlen(value) + 1] = 0;
        }
        if (lexerPeek(l) == '\'') lexerAdvance(l);
        snprintf(result->token, MAX_STRING, "'%s'", value);
        return result;
    }

    if (isdigit(ch)) {
        char num[MAX_STRING] = {0};
        while (isdigit(lexerPeek(l))) {
            num[strlen(num)] = lexerAdvance(l);
            num[strlen(num) + 1] = 0;
        }
        if (lexerPeek(l) == '.' && l->pos + 1 < strlen(l->input) && isdigit(l->input[l->pos + 1])) {
            num[strlen(num)] = lexerAdvance(l);
            num[strlen(num) + 1] = 0;
            while (isdigit(lexerPeek(l))) {
                num[strlen(num)] = lexerAdvance(l);
                num[strlen(num) + 1] = 0;
            }
        }
        strcpy(result->token, num);
        return result;
    }

    result->token[0] = lexerAdvance(l);
    result->token[1] = 0;
    return result;
}

Parser* newParser(Lexer* lexer) {
    Parser* p = (Parser*)malloc(sizeof(Parser));
    p->token_count = 0;
    p->token_idx = 0;
    
    for (int i = 0; i < MAX_TOKENS; i++) {
        TokenResult* tok = lexerNextToken(lexer);
        if (!tok) break;
        p->tokens[p->token_count++] = *tok;
        free(tok);
    }
    
    return p;
}

TokenResult* parserCurrent(Parser* p) {
    if (p->token_idx < p->token_count) {
        return &p->tokens[p->token_idx];
    }
    return NULL;
}

void parserAdvance(Parser* p) {
    p->token_idx++;
}

bool parserMatch(Parser* p, const char* token) {
    TokenResult* current = parserCurrent(p);
    if (!current) return false;
    return strcmp(current->token, token) == 0;
}

Expr* parserParseExpr(Parser* p);
Stmt* parserParseStmt(Parser* p);

Expr* parserParsePrimary(Parser* p) {
    TokenResult* current = parserCurrent(p);
    if (!current) return NULL;

    Expr* expr = (Expr*)malloc(sizeof(Expr));
    memset(expr, 0, sizeof(Expr));

    if (isdigit(current->token[0]) || (current->token[0] == '-' && isdigit(current->token[1]))) {
        strcpy(expr->type, "Number");
        expr->value = atof(current->token);
        parserAdvance(p);
        return expr;
    }

    if (current->token[0] == '"') {
        strcpy(expr->type, "String");
        char* val = current->token + 1;
        expr->string_value = (char*)malloc(strlen(val));
        strcpy(expr->string_value, val);
        expr->string_value[strlen(expr->string_value) - 1] = 0;
        parserAdvance(p);
        return expr;
    }

    if (strcmp(current->token, "true") == 0) {
        strcpy(expr->type, "Bool");
        expr->bool_value = true;
        parserAdvance(p);
        return expr;
    }

    if (strcmp(current->token, "false") == 0) {
        strcpy(expr->type, "Bool");
        expr->bool_value = false;
        parserAdvance(p);
        return expr;
    }

    strcpy(expr->type, "Var");
    expr->name = (char*)malloc(strlen(current->token) + 1);
    strcpy(expr->name, current->token);
    parserAdvance(p);
    return expr;
}

Expr* parserParseUnary(Parser* p) {
    TokenResult* current = parserCurrent(p);
    if (current && (strcmp(current->token, "!") == 0 || strcmp(current->token, "-") == 0 || 
        strcmp(current->token, "+") == 0 || strcmp(current->token, "~") == 0)) {
        Expr* expr = (Expr*)malloc(sizeof(Expr));
        strcpy(expr->type, "Unary");
        expr->op = (char*)malloc(strlen(current->token) + 1);
        strcpy(expr->op, current->token);
        parserAdvance(p);
        expr->arg = parserParseUnary(p);
        return expr;
    }
    return parserParsePrimary(p);
}

int parserPrecedence(const char* op) {
    if (strcmp(op, "||") == 0) return 1;
    if (strcmp(op, "&&") == 0) return 2;
    if (strcmp(op, "==") == 0 || strcmp(op, "!=") == 0) return 3;
    if (strcmp(op, "<") == 0 || strcmp(op, ">") == 0 || strcmp(op, "<=") == 0 || strcmp(op, ">=") == 0) return 4;
    if (strcmp(op, "+") == 0 || strcmp(op, "-") == 0) return 5;
    if (strcmp(op, "*") == 0 || strcmp(op, "/") == 0 || strcmp(op, "%") == 0) return 6;
    return 0;
}

Expr* parserParseBinary(Parser* p, int minPrec) {
    Expr* left = parserParseUnary(p);
    while (parserCurrent(p)) {
        int prec = parserPrecedence(parserCurrent(p)->token);
        if (prec == 0 || prec < minPrec) break;
        char* op = (char*)malloc(strlen(parserCurrent(p)->token) + 1);
        strcpy(op, parserCurrent(p)->token);
        parserAdvance(p);
        Expr* right = parserParseBinary(p, prec + 1);
        Expr* binary = (Expr*)malloc(sizeof(Expr));
        strcpy(binary->type, "Binary");
        binary->op = op;
        binary->left = left;
        binary->right = right;
        left = binary;
    }
    return left;
}

Expr* parserParseExpr(Parser* p) {
    return parserParseBinary(p, 0);
}

Stmt** parserParseBlock(Parser* p, int* count) {
    Stmt** stmts = (Stmt**)malloc(sizeof(Stmt*) * 1000);
    *count = 0;
    while (parserCurrent(p) && !parserMatch(p, "}")) {
        stmts[*count] = parserParseStmt(p);
        (*count)++;
    }
    return stmts;
}

Stmt* parserParseStmt(Parser* p) {
    TokenResult* current = parserCurrent(p);
    if (!current) return NULL;

    Stmt* stmt = (Stmt*)malloc(sizeof(Stmt));
    memset(stmt, 0, sizeof(Stmt));

    if (strcmp(current->token, "import") == 0) {
        strcpy(stmt->type, "Import");
        parserAdvance(p);
        stmt->module_name = (char*)malloc(strlen(parserCurrent(p)->token) + 1);
        strcpy(stmt->module_name, parserCurrent(p)->token);
        parserAdvance(p);
        if (parserMatch(p, "from")) {
            parserAdvance(p);
            parserAdvance(p);
        }
        return stmt;
    }

    if (strcmp(current->token, "if") == 0) {
        strcpy(stmt->type, "If");
        parserAdvance(p);
        parserAdvance(p);
        stmt->condition = parserParseExpr(p);
        parserAdvance(p);
        parserAdvance(p);
        stmt->then_branch = parserParseBlock(p, &stmt->then_count);
        parserAdvance(p);
        if (parserMatch(p, "else")) {
            parserAdvance(p);
            if (parserMatch(p, "{")) {
                parserAdvance(p);
                stmt->else_branch = parserParseBlock(p, &stmt->else_count);
                parserAdvance(p);
            }
        }
        return stmt;
    }

    if (strcmp(current->token, "while") == 0) {
        strcpy(stmt->type, "While");
        parserAdvance(p);
        parserAdvance(p);
        stmt->condition = parserParseExpr(p);
        parserAdvance(p);
        parserAdvance(p);
        stmt->while_body = parserParseBlock(p, &stmt->while_count);
        parserAdvance(p);
        return stmt;
    }

    if (strcmp(current->token, "var") == 0 || strcmp(current->token, "let") == 0 || strcmp(current->token, "const") == 0) {
        strcpy(stmt->type, "VarDecl");
        const char* keyword = current->token;
        parserAdvance(p);
        stmt->var_name = (char*)malloc(strlen(parserCurrent(p)->token) + 1);
        strcpy(stmt->var_name, parserCurrent(p)->token);
        parserAdvance(p);
        parserAdvance(p);
        stmt->var_type = parseTypeAnnotation(parserCurrent(p)->token);
        parserAdvance(p);
        if (parserMatch(p, "=")) {
            parserAdvance(p);
            stmt->var_val = parserParseExpr(p);
        }
        stmt->mutable = strcmp(keyword, "var") == 0;
        return stmt;
    }

    if (strcmp(current->token, "return") == 0) {
        strcpy(stmt->type, "Return");
        parserAdvance(p);
        if (!parserMatch(p, "}")) {
            stmt->ret_val = parserParseExpr(p);
        }
        return stmt;
    }

    if (strcmp(current->token, "break") == 0) {
        strcpy(stmt->type, "Break");
        parserAdvance(p);
        return stmt;
    }

    if (strcmp(current->token, "continue") == 0) {
        strcpy(stmt->type, "Continue");
        parserAdvance(p);
        return stmt;
    }

    Expr* expr = parserParseExpr(p);
    stmt->type[0] = 0;
    strcat(stmt->type, "ExprStmt");
    stmt->stmt_expr = expr;
    return stmt;
}

Stmt** parserParseProgram(Parser* p, int* count) {
    Stmt** stmts = (Stmt**)malloc(sizeof(Stmt*) * 1000);
    *count = 0;
    while (parserCurrent(p)) {
        stmts[*count] = parserParseStmt(p);
        (*count)++;
    }
    return stmts;
}

Interpreter* newInterpreter() {
    Interpreter* i = (Interpreter*)malloc(sizeof(Interpreter));
    i->var_count = 0;
    return i;
}

void interpreterDefineVar(Interpreter* i, const char* name, double value) {
    if (i->var_count < MAX_VARS) {
        strcpy(i->vars[i->var_count].var_name, name);
        i->vars[i->var_count].var_value = value;
        i->vars[i->var_count].is_mutable = true;
        i->var_count++;
    }
}

double interpreterGetVar(Interpreter* i, const char* name) {
    for (int j = 0; j < i->var_count; j++) {
        if (strcmp(i->vars[j].var_name, name) == 0) {
            return i->vars[j].var_value;
        }
    }
    return 0;
}

double interpreterEvalExpr(Interpreter* i, Expr* expr);
void interpreterEvalStmt(Interpreter* i, Stmt* stmt);

double interpreterEvalBinary(Interpreter* i, Expr* expr) {
    double left = interpreterEvalExpr(i, expr->left);
    double right = interpreterEvalExpr(i, expr->right);
    
    if (strcmp(expr->op, "+") == 0) return left + right;
    if (strcmp(expr->op, "-") == 0) return left - right;
    if (strcmp(expr->op, "*") == 0) return left * right;
    if (strcmp(expr->op, "/") == 0) return left / right;
    if (strcmp(expr->op, "%") == 0) return (double)((long)left % (long)right);
    if (strcmp(expr->op, "==") == 0) return left == right ? 1 : 0;
    if (strcmp(expr->op, "!=") == 0) return left != right ? 1 : 0;
    if (strcmp(expr->op, "<") == 0) return left < right ? 1 : 0;
    if (strcmp(expr->op, ">") == 0) return left > right ? 1 : 0;
    if (strcmp(expr->op, "<=") == 0) return left <= right ? 1 : 0;
    if (strcmp(expr->op, ">=") == 0) return left >= right ? 1 : 0;
    if (strcmp(expr->op, "&&") == 0) return (left != 0 && right != 0) ? 1 : 0;
    if (strcmp(expr->op, "||") == 0) return (left != 0 || right != 0) ? 1 : 0;
    return 0;
}

double interpreterEvalExpr(Interpreter* i, Expr* expr) {
    if (!expr) return 0;

    if (strcmp(expr->type, "Number") == 0) {
        return expr->value;
    }
    if (strcmp(expr->type, "Bool") == 0) {
        return expr->bool_value ? 1 : 0;
    }
    if (strcmp(expr->type, "Var") == 0) {
        return interpreterGetVar(i, expr->name);
    }
    if (strcmp(expr->type, "Binary") == 0) {
        return interpreterEvalBinary(i, expr);
    }
    if (strcmp(expr->type, "Unary") == 0) {
        double arg = interpreterEvalExpr(i, expr->arg);
        if (strcmp(expr->op, "-") == 0) return -arg;
        if (strcmp(expr->op, "+") == 0) return arg;
        if (strcmp(expr->op, "!") == 0) return arg == 0 ? 1 : 0;
        if (strcmp(expr->op, "~") == 0) return (double)(~(long)arg);
        return 0;
    }
    if (strcmp(expr->type, "Call") == 0) {
        if (strcmp(expr->module, "io") == 0 && strcmp(expr->func, "print") == 0) {
            if (expr->args_count > 0) {
                double val = interpreterEvalExpr(i, expr->args[0]);
                printf("%g\n", val);
            }
        }
    }

    return 0;
}

void interpreterEvalStmt(Interpreter* i, Stmt* stmt) {
    if (!stmt) return;

    if (strcmp(stmt->type, "VarDecl") == 0) {
        double val = 0;
        if (stmt->var_val) {
            val = interpreterEvalExpr(i, stmt->var_val);
        }
        interpreterDefineVar(i, stmt->var_name, val);
    }
    if (strcmp(stmt->type, "If") == 0) {
        double cond = interpreterEvalExpr(i, stmt->condition);
        if (cond != 0) {
            for (int j = 0; j < stmt->then_count; j++) {
                interpreterEvalStmt(i, stmt->then_branch[j]);
            }
        } else if (stmt->else_branch) {
            for (int j = 0; j < stmt->else_count; j++) {
                interpreterEvalStmt(i, stmt->else_branch[j]);
            }
        }
    }
    if (strcmp(stmt->type, "While") == 0) {
        while (interpreterEvalExpr(i, stmt->condition) != 0) {
            for (int j = 0; j < stmt->while_count; j++) {
                interpreterEvalStmt(i, stmt->while_body[j]);
            }
        }
    }
    if (strcmp(stmt->type, "ExprStmt") == 0) {
        interpreterEvalExpr(i, stmt->stmt_expr);
    }
}

void interpreterRun(Interpreter* i, Stmt** program, int count) {
    for (int j = 0; j < count; j++) {
        interpreterEvalStmt(i, program[j]);
    }
}

CGenerator* newCGenerator() {
    CGenerator* cg = (CGenerator*)malloc(sizeof(CGenerator));
    cg->line_count = 0;
    cg->indent = 0;
    return cg;
}

void cgAddLine(CGenerator* cg, const char* line) {
    cg->lines[cg->line_count] = (char*)malloc(strlen(line) + 1);
    strcpy(cg->lines[cg->line_count], line);
    cg->line_count++;
}

void cgGenerate(CGenerator* cg, Stmt** stmts, int count) {
    cgAddLine(cg, "#include <stdio.h>");
    cgAddLine(cg, "#include <math.h>");
    cgAddLine(cg, "#include <stdbool.h>");
    cgAddLine(cg, "");
    cgAddLine(cg, "int main() {");
    cg->indent++;

    for (int i = 0; i < count; i++) {
    }

    cg->indent--;
    cgAddLine(cg, "  return 0;");
    cgAddLine(cg, "}");
}

int main(int argc, char* argv[]) {
    const char* filename = "myprogram.str";
    if (argc > 1) {
        filename = argv[1];
    }

    FILE* file = fopen(filename, "r");
    if (!file) {
        fprintf(stderr, "Error: Cannot open file %s\n", filename);
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long size = ftell(file);
    fseek(file, 0, SEEK_SET);

    char* source = (char*)malloc(size + 1);
    fread(source, 1, size, file);
    source[size] = 0;
    fclose(file);

    Lexer* lexer = newLexer(source);
    Parser* parser = newParser(lexer);
    int prog_count = 0;
    Stmt** program = parserParseProgram(parser, &prog_count);

    Interpreter* interp = newInterpreter();
    interpreterRun(interp, program, prog_count);

    CGenerator* cgen = newCGenerator();
    cgGenerate(cgen, program, prog_count);

    FILE* outfile = fopen("out.c", "w");
    for (int i = 0; i < cgen->line_count; i++) {
        fprintf(outfile, "%s\n", cgen->lines[i]);
    }
    fclose(outfile);

    printf("C code generated: out.c\n");

    free(source);
    free(lexer);
    free(parser);
    free(interp);
    free(cgen);

    return 0;
}
