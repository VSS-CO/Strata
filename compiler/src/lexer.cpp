#include "lexer.hpp"
#include <unordered_map>
#include <cctype>

namespace strata {

static const std::unordered_map<std::string, TokenType> keywords = {
    {"let", TokenType::LET},
    {"const", TokenType::CONST},
    {"var", TokenType::VAR},
    {"func", TokenType::FUNC},
    {"return", TokenType::RETURN},
    {"if", TokenType::IF},
    {"else", TokenType::ELSE},
    {"while", TokenType::WHILE},
    {"for", TokenType::FOR},
    {"break", TokenType::BREAK},
    {"continue", TokenType::CONTINUE},
    {"import", TokenType::IMPORT},
    {"from", TokenType::FROM},
    {"true", TokenType::TRUE},
    {"false", TokenType::FALSE},
    {"int", TokenType::TYPE_INT},
    {"float", TokenType::TYPE_FLOAT},
    {"bool", TokenType::TYPE_BOOL},
    {"char", TokenType::TYPE_CHAR},
    {"string", TokenType::TYPE_STRING},
    {"void", TokenType::TYPE_VOID},
    {"any", TokenType::TYPE_ANY},
};

Lexer::Lexer(const std::string& source, const std::string& filename)
    : source_(source)
    , filename_(filename)
    , pos_(0)
    , line_(1)
    , column_(1)
    , tokenStart_(0)
    , tokenLine_(1)
    , tokenColumn_(1) {}

char Lexer::peek() const {
    if (isAtEnd()) return '\0';
    return source_[pos_];
}

char Lexer::peekNext() const {
    if (pos_ + 1 >= source_.size()) return '\0';
    return source_[pos_ + 1];
}

char Lexer::advance() {
    char c = source_[pos_++];
    if (c == '\n') {
        line_++;
        column_ = 1;
    } else {
        column_++;
    }
    return c;
}

void Lexer::skipWhitespace() {
    while (!isAtEnd()) {
        char c = peek();
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
            advance();
        } else if (c == '/' && peekNext() == '/') {
            skipComment();
        } else {
            break;
        }
    }
}

void Lexer::skipComment() {
    while (!isAtEnd() && peek() != '\n') {
        advance();
    }
}

bool Lexer::isAtEnd() const {
    return pos_ >= source_.size();
}

Token Lexer::makeToken(TokenType type) const {
    return Token{type, "", Location{tokenLine_, tokenColumn_, filename_}};
}

Token Lexer::makeToken(TokenType type, const std::string& value) const {
    return Token{type, value, Location{tokenLine_, tokenColumn_, filename_}};
}

Token Lexer::errorToken(const std::string& message) const {
    return Token{TokenType::ERROR, message, Location{tokenLine_, tokenColumn_, filename_}};
}

Token Lexer::scanString() {
    std::string value;
    advance(); // Skip opening quote

    while (!isAtEnd() && peek() != '"') {
        if (peek() == '\\') {
            advance();
            if (isAtEnd()) break;
            char escaped = advance();
            switch (escaped) {
                case 'n': value += '\n'; break;
                case 't': value += '\t'; break;
                case 'r': value += '\r'; break;
                case '\\': value += '\\'; break;
                case '"': value += '"'; break;
                default: value += escaped; break;
            }
        } else {
            value += advance();
        }
    }

    if (isAtEnd()) {
        return errorToken("Unterminated string");
    }

    advance(); // Skip closing quote
    return makeToken(TokenType::STRING, value);
}

Token Lexer::scanNumber() {
    std::string value;
    bool isFloat = false;

    while (!isAtEnd() && (std::isdigit(peek()) || peek() == '.')) {
        if (peek() == '.') {
            if (isFloat) break;
            isFloat = true;
        }
        value += advance();
    }

    return makeToken(isFloat ? TokenType::FLOAT : TokenType::INTEGER, value);
}

Token Lexer::scanIdentifier() {
    std::string value;

    while (!isAtEnd() && (std::isalnum(peek()) || peek() == '_')) {
        value += advance();
    }

    TokenType type = identifierType(value);
    return makeToken(type, value);
}

TokenType Lexer::identifierType(const std::string& identifier) const {
    auto it = keywords.find(identifier);
    if (it != keywords.end()) {
        return it->second;
    }
    return TokenType::IDENTIFIER;
}

Token Lexer::nextToken() {
    skipWhitespace();

    tokenStart_ = static_cast<int>(pos_);
    tokenLine_ = line_;
    tokenColumn_ = column_;

    if (isAtEnd()) {
        return makeToken(TokenType::END_OF_FILE);
    }

    char c = peek();

    // String literal
    if (c == '"') {
        return scanString();
    }

    // Number literal
    if (std::isdigit(c)) {
        return scanNumber();
    }

    // Identifier or keyword
    if (std::isalpha(c) || c == '_') {
        return scanIdentifier();
    }

    // Two-character tokens
    advance();
    switch (c) {
        case '(': return makeToken(TokenType::LPAREN);
        case ')': return makeToken(TokenType::RPAREN);
        case '{': return makeToken(TokenType::LBRACE);
        case '}': return makeToken(TokenType::RBRACE);
        case '[': return makeToken(TokenType::LBRACKET);
        case ']': return makeToken(TokenType::RBRACKET);
        case ',': return makeToken(TokenType::COMMA);
        case ';': return makeToken(TokenType::SEMICOLON);
        case '.': return makeToken(TokenType::DOT);
        case '+': return makeToken(TokenType::PLUS);
        case '-': return makeToken(TokenType::MINUS);
        case '*': return makeToken(TokenType::STAR);
        case '/': return makeToken(TokenType::SLASH);
        case '%': return makeToken(TokenType::PERCENT);
        case '~': return makeToken(TokenType::TILDE);

        case ':':
            if (peek() == ':') {
                advance();
                return makeToken(TokenType::DOUBLE_COLON);
            }
            return makeToken(TokenType::COLON);

        case '=':
            if (peek() == '=') {
                advance();
                return makeToken(TokenType::EQ);
            }
            if (peek() == '>') {
                advance();
                return makeToken(TokenType::ARROW);
            }
            return makeToken(TokenType::ASSIGN);

        case '!':
            if (peek() == '=') {
                advance();
                return makeToken(TokenType::NE);
            }
            return makeToken(TokenType::NOT);

        case '<':
            if (peek() == '=') {
                advance();
                return makeToken(TokenType::LE);
            }
            return makeToken(TokenType::LT);

        case '>':
            if (peek() == '=') {
                advance();
                return makeToken(TokenType::GE);
            }
            return makeToken(TokenType::GT);

        case '&':
            if (peek() == '&') {
                advance();
                return makeToken(TokenType::AND);
            }
            return errorToken("Unexpected character '&'");

        case '|':
            if (peek() == '|') {
                advance();
                return makeToken(TokenType::OR);
            }
            return errorToken("Unexpected character '|'");

        default:
            return errorToken(std::string("Unexpected character '") + c + "'");
    }
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    Token token;
    do {
        token = nextToken();
        tokens.push_back(token);
    } while (token.type != TokenType::END_OF_FILE && token.type != TokenType::ERROR);
    return tokens;
}

int64_t Token::intValue() const {
    return std::stoll(value);
}

double Token::floatValue() const {
    return std::stod(value);
}

const char* tokenTypeName(TokenType type) {
    switch (type) {
        case TokenType::INTEGER: return "INTEGER";
        case TokenType::FLOAT: return "FLOAT";
        case TokenType::STRING: return "STRING";
        case TokenType::CHAR: return "CHAR";
        case TokenType::TRUE: return "TRUE";
        case TokenType::FALSE: return "FALSE";
        case TokenType::IDENTIFIER: return "IDENTIFIER";
        case TokenType::LET: return "LET";
        case TokenType::CONST: return "CONST";
        case TokenType::VAR: return "VAR";
        case TokenType::FUNC: return "FUNC";
        case TokenType::RETURN: return "RETURN";
        case TokenType::IF: return "IF";
        case TokenType::ELSE: return "ELSE";
        case TokenType::WHILE: return "WHILE";
        case TokenType::FOR: return "FOR";
        case TokenType::BREAK: return "BREAK";
        case TokenType::CONTINUE: return "CONTINUE";
        case TokenType::IMPORT: return "IMPORT";
        case TokenType::FROM: return "FROM";
        case TokenType::TYPE_INT: return "TYPE_INT";
        case TokenType::TYPE_FLOAT: return "TYPE_FLOAT";
        case TokenType::TYPE_BOOL: return "TYPE_BOOL";
        case TokenType::TYPE_CHAR: return "TYPE_CHAR";
        case TokenType::TYPE_STRING: return "TYPE_STRING";
        case TokenType::TYPE_VOID: return "TYPE_VOID";
        case TokenType::TYPE_ANY: return "TYPE_ANY";
        case TokenType::PLUS: return "PLUS";
        case TokenType::MINUS: return "MINUS";
        case TokenType::STAR: return "STAR";
        case TokenType::SLASH: return "SLASH";
        case TokenType::PERCENT: return "PERCENT";
        case TokenType::EQ: return "EQ";
        case TokenType::NE: return "NE";
        case TokenType::LT: return "LT";
        case TokenType::GT: return "GT";
        case TokenType::LE: return "LE";
        case TokenType::GE: return "GE";
        case TokenType::AND: return "AND";
        case TokenType::OR: return "OR";
        case TokenType::NOT: return "NOT";
        case TokenType::TILDE: return "TILDE";
        case TokenType::LPAREN: return "LPAREN";
        case TokenType::RPAREN: return "RPAREN";
        case TokenType::LBRACE: return "LBRACE";
        case TokenType::RBRACE: return "RBRACE";
        case TokenType::LBRACKET: return "LBRACKET";
        case TokenType::RBRACKET: return "RBRACKET";
        case TokenType::COMMA: return "COMMA";
        case TokenType::COLON: return "COLON";
        case TokenType::SEMICOLON: return "SEMICOLON";
        case TokenType::DOT: return "DOT";
        case TokenType::ARROW: return "ARROW";
        case TokenType::ASSIGN: return "ASSIGN";
        case TokenType::DOUBLE_COLON: return "DOUBLE_COLON";
        case TokenType::END_OF_FILE: return "END_OF_FILE";
        case TokenType::ERROR: return "ERROR";
    }
    return "UNKNOWN";
}

} // namespace strata
