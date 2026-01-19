#pragma once
#include <string>
#include <cstdint>

namespace strata {

enum class TokenType {
    // Literals
    INTEGER,
    FLOAT,
    STRING,
    CHAR,
    TRUE,
    FALSE,

    // Identifiers and keywords
    IDENTIFIER,
    LET,
    CONST,
    VAR,
    FUNC,
    RETURN,
    IF,
    ELSE,
    WHILE,
    FOR,
    BREAK,
    CONTINUE,
    IMPORT,
    FROM,

    // Types
    TYPE_INT,
    TYPE_FLOAT,
    TYPE_BOOL,
    TYPE_CHAR,
    TYPE_STRING,
    TYPE_VOID,
    TYPE_ANY,

    // Operators
    PLUS,
    MINUS,
    STAR,
    SLASH,
    PERCENT,
    EQ,
    NE,
    LT,
    GT,
    LE,
    GE,
    AND,
    OR,
    NOT,
    TILDE,

    // Delimiters
    LPAREN,
    RPAREN,
    LBRACE,
    RBRACE,
    LBRACKET,
    RBRACKET,
    COMMA,
    COLON,
    SEMICOLON,
    DOT,
    ARROW,
    ASSIGN,
    DOUBLE_COLON,

    // Special
    END_OF_FILE,
    ERROR
};

struct Location {
    int line;
    int column;
    std::string filename;
};

struct Token {
    TokenType type;
    std::string value;
    Location location;

    int64_t intValue() const;
    double floatValue() const;
};

const char* tokenTypeName(TokenType type);

} // namespace strata
