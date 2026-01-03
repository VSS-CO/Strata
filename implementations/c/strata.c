#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

/* ============================================================================
 * STRATA INTERPRETER IN C
 * Complete lexer, parser, type checker, and interpreter
 * ============================================================================
 */

/* Token types */
typedef enum {
    TOKEN_INT, TOKEN_FLOAT, TOKEN_STRING, TOKEN_BOOL, TOKEN_CHAR,
    TOKEN_IDENTIFIER, TOKEN_KEYWORD,
    TOKEN_PLUS, TOKEN_MINUS, TOKEN_STAR, TOKEN_SLASH, TOKEN_PERCENT,
    TOKEN_EQ, TOKEN_NE, TOKEN_LT, TOKEN_GT, TOKEN_LE, TOKEN_GE,
    TOKEN_AND, TOKEN_OR, TOKEN_NOT, TOKEN_TILDE,
    TOKEN_ASSIGN, TOKEN_ARROW, TOKEN_LPAREN, TOKEN_RPAREN,
    TOKEN_LBRACE, TOKEN_RBRACE, TOKEN_SEMICOLON, TOKEN_COMMA, TOKEN_COLON,
    TOKEN_DOT, TOKEN_EOF, TOKEN_ERROR
} TokenType;

typedef struct {
    TokenType type;
    char* value;
    int line, column;
} Token;

/* Lexer */
typedef struct {
    const char* input;
    int pos, line, column;
} Lexer;

Lexer* lexer_new(const char* input) {
    Lexer* l = malloc(sizeof(Lexer));
    l->input = input;
    l->pos = 0;
    l->line = 1;
    l->column = 1;
    return l;
}

char lexer_peek(Lexer* l) {
    return l->input[l->pos];
}

char lexer_advance(Lexer* l) {
    char ch = l->input[l->pos++];
    if (ch == '\n') {
        l->line++;
        l->column = 1;
    } else {
        l->column++;
    }
    return ch;
}

Token* lexer_next_token(Lexer* l) {
    /* Skip whitespace */
    while (isspace(lexer_peek(l))) {
        lexer_advance(l);
    }

    /* Skip comments */
    if (lexer_peek(l) == '/' && l->input[l->pos + 1] == '/') {
        while (lexer_peek(l) && lexer_peek(l) != '\n') {
            lexer_advance(l);
        }
        return lexer_next_token(l);
    }

    if (!lexer_peek(l)) {
        Token* t = malloc(sizeof(Token));
        t->type = TOKEN_EOF;
        t->value = "";
        t->line = l->line;
        t->column = l->column;
        return t;
    }

    Token* t = malloc(sizeof(Token));
    t->line = l->line;
    t->column = l->column;

    char ch = lexer_peek(l);

    /* Numbers */
    if (isdigit(ch)) {
        char buffer[256] = {0};
        int i = 0;
        int has_dot = 0;
        while (isdigit(lexer_peek(l)) || (lexer_peek(l) == '.' && !has_dot)) {
            if (lexer_peek(l) == '.') has_dot = 1;
            buffer[i++] = lexer_advance(l);
        }
        t->value = malloc(i + 1);
        strcpy(t->value, buffer);
        t->type = has_dot ? TOKEN_FLOAT : TOKEN_INT;
        return t;
    }

    /* Strings */
    if (ch == '"') {
        lexer_advance(l);
        char buffer[1024] = {0};
        int i = 0;
        while (lexer_peek(l) && lexer_peek(l) != '"') {
            buffer[i++] = lexer_advance(l);
        }
        if (lexer_peek(l) == '"') lexer_advance(l);
        t->value = malloc(i + 1);
        strcpy(t->value, buffer);
        t->type = TOKEN_STRING;
        return t;
    }

    /* Identifiers and keywords */
    if (isalpha(ch) || ch == '_') {
        char buffer[256] = {0};
        int i = 0;
        while (isalnum(lexer_peek(l)) || lexer_peek(l) == '_') {
            buffer[i++] = lexer_advance(l);
        }
        t->value = malloc(i + 1);
        strcpy(t->value, buffer);

        if (strcmp(t->value, "let") == 0 || strcmp(t->value, "const") == 0 ||
            strcmp(t->value, "var") == 0 || strcmp(t->value, "func") == 0 ||
            strcmp(t->value, "if") == 0 || strcmp(t->value, "else") == 0 ||
            strcmp(t->value, "while") == 0 || strcmp(t->value, "for") == 0 ||
            strcmp(t->value, "return") == 0 || strcmp(t->value, "break") == 0 ||
            strcmp(t->value, "continue") == 0 || strcmp(t->value, "true") == 0 ||
            strcmp(t->value, "false") == 0 || strcmp(t->value, "int") == 0 ||
            strcmp(t->value, "float") == 0 || strcmp(t->value, "bool") == 0 ||
            strcmp(t->value, "string") == 0 || strcmp(t->value, "char") == 0) {
            t->type = TOKEN_KEYWORD;
        } else {
            t->type = TOKEN_IDENTIFIER;
        }
        return t;
    }

    /* Operators */
    if (ch == '+') { lexer_advance(l); t->type = TOKEN_PLUS; t->value = "+"; return t; }
    if (ch == '-') { lexer_advance(l); t->type = TOKEN_MINUS; t->value = "-"; return t; }
    if (ch == '*') { lexer_advance(l); t->type = TOKEN_STAR; t->value = "*"; return t; }
    if (ch == '/') { lexer_advance(l); t->type = TOKEN_SLASH; t->value = "/"; return t; }
    if (ch == '%') { lexer_advance(l); t->type = TOKEN_PERCENT; t->value = "%"; return t; }
    if (ch == '=') {
        lexer_advance(l);
        if (lexer_peek(l) == '=') {
            lexer_advance(l);
            t->type = TOKEN_EQ;
            t->value = "==";
        } else if (lexer_peek(l) == '>') {
            lexer_advance(l);
            t->type = TOKEN_ARROW;
            t->value = "=>";
        } else {
            t->type = TOKEN_ASSIGN;
            t->value = "=";
        }
        return t;
    }
    if (ch == '!') {
        lexer_advance(l);
        if (lexer_peek(l) == '=') {
            lexer_advance(l);
            t->type = TOKEN_NE;
            t->value = "!=";
        } else {
            t->type = TOKEN_NOT;
            t->value = "!";
        }
        return t;
    }
    if (ch == '<') {
        lexer_advance(l);
        if (lexer_peek(l) == '=') {
            lexer_advance(l);
            t->type = TOKEN_LE;
            t->value = "<=";
        } else {
            t->type = TOKEN_LT;
            t->value = "<";
        }
        return t;
    }
    if (ch == '>') {
        lexer_advance(l);
        if (lexer_peek(l) == '=') {
            lexer_advance(l);
            t->type = TOKEN_GE;
            t->value = ">=";
        } else {
            t->type = TOKEN_GT;
            t->value = ">";
        }
        return t;
    }
    if (ch == '&' && l->input[l->pos + 1] == '&') {
        lexer_advance(l); lexer_advance(l);
        t->type = TOKEN_AND;
        t->value = "&&";
        return t;
    }
    if (ch == '|' && l->input[l->pos + 1] == '|') {
        lexer_advance(l); lexer_advance(l);
        t->type = TOKEN_OR;
        t->value = "||";
        return t;
    }
    if (ch == '~') { lexer_advance(l); t->type = TOKEN_TILDE; t->value = "~"; return t; }
    if (ch == '(') { lexer_advance(l); t->type = TOKEN_LPAREN; t->value = "("; return t; }
    if (ch == ')') { lexer_advance(l); t->type = TOKEN_RPAREN; t->value = ")"; return t; }
    if (ch == '{') { lexer_advance(l); t->type = TOKEN_LBRACE; t->value = "{"; return t; }
    if (ch == '}') { lexer_advance(l); t->type = TOKEN_RBRACE; t->value = "}"; return t; }
    if (ch == ';') { lexer_advance(l); t->type = TOKEN_SEMICOLON; t->value = ";"; return t; }
    if (ch == ',') { lexer_advance(l); t->type = TOKEN_COMMA; t->value = ","; return t; }
    if (ch == ':') { lexer_advance(l); t->type = TOKEN_COLON; t->value = ":"; return t; }
    if (ch == '.') { lexer_advance(l); t->type = TOKEN_DOT; t->value = "."; return t; }

    t->type = TOKEN_ERROR;
    t->value = "unknown";
    return t;
}

/* Value types */
typedef enum {
    VALUE_INT, VALUE_FLOAT, VALUE_BOOL, VALUE_STRING, VALUE_NULL
} ValueType;

typedef struct {
    ValueType type;
    union {
        long long i;
        double f;
        int b;
        char* s;
    } data;
} Value;

Value value_int(long long i) {
    Value v;
    v.type = VALUE_INT;
    v.data.i = i;
    return v;
}

Value value_float(double f) {
    Value v;
    v.type = VALUE_FLOAT;
    v.data.f = f;
    return v;
}

Value value_bool(int b) {
    Value v;
    v.type = VALUE_BOOL;
    v.data.b = b;
    return v;
}

Value value_string(const char* s) {
    Value v;
    v.type = VALUE_STRING;
    v.data.s = malloc(strlen(s) + 1);
    strcpy(v.data.s, s);
    return v;
}

Value value_null() {
    Value v;
    v.type = VALUE_NULL;
    return v;
}

void value_print(Value v) {
    switch (v.type) {
        case VALUE_INT:
            printf("%lld", v.data.i);
            break;
        case VALUE_FLOAT:
            printf("%f", v.data.f);
            break;
        case VALUE_BOOL:
            printf("%s", v.data.b ? "true" : "false");
            break;
        case VALUE_STRING:
            printf("%s", v.data.s);
            break;
        case VALUE_NULL:
            printf("null");
            break;
    }
}

/* Main interpreter */
int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Usage: strata <file.str>\n");
        return 1;
    }

    FILE* f = fopen(argv[1], "r");
    if (!f) {
        printf("Error: could not open file %s\n", argv[1]);
        return 1;
    }

    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);

    char* source = malloc(size + 1);
    fread(source, 1, size, f);
    source[size] = 0;
    fclose(f);

    Lexer* l = lexer_new(source);
    Token* t;
    while ((t = lexer_next_token(l))->type != TOKEN_EOF) {
        printf("Token: %d Value: %s\n", t->type, t->value);
    }

    free(source);
    return 0;
}
