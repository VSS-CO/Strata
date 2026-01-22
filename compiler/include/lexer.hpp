#pragma once
#include "token.hpp"
#include <string>
#include <vector>

namespace strata {

class Lexer {
public:
    Lexer(const std::string& source, const std::string& filename = "<stdin>");

    Token nextToken();
    std::vector<Token> tokenize();

private:
    char peek() const;
    char peekNext() const;
    char advance();
    void skipWhitespace();
    void skipComment();
    bool isAtEnd() const;

    Token makeToken(TokenType type) const;
    Token makeToken(TokenType type, const std::string& value) const;
    Token errorToken(const std::string& message) const;

    Token scanString();
    Token scanNumber();
    Token scanIdentifier();

    TokenType identifierType(const std::string& identifier) const;

    std::string source_;
    std::string filename_;
    size_t pos_;
    int line_;
    int column_;
    int tokenStart_;
    int tokenLine_;
    int tokenColumn_;
};

} // namespace strata
