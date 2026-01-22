#pragma once
#include "ast.hpp"
#include "token.hpp"
#include <vector>
#include <string>
#include <stdexcept>

namespace strata {

class ParseError : public std::runtime_error {
public:
    ParseError(const std::string& message, Location loc)
        : std::runtime_error(message), location_(loc) {}

    const Location& location() const { return location_; }

private:
    Location location_;
};

class Parser {
public:
    explicit Parser(const std::vector<Token>& tokens);

    std::vector<StmtPtr> parse();

private:
    StmtPtr parseStatement();
    StmtPtr parseLetStatement();
    StmtPtr parseFunctionStatement();
    StmtPtr parseIfStatement();
    StmtPtr parseWhileStatement();
    StmtPtr parseForStatement();
    StmtPtr parseReturnStatement();
    StmtPtr parseImportStatement();
    StmtPtr parseExpressionStatement();

    ExprPtr parseExpression();
    ExprPtr parseBinary(int minPrecedence);
    ExprPtr parseUnary();
    ExprPtr parsePrimary();
    ExprPtr parseCall(ExprPtr callee);

    TypeInfo parseType();

    bool check(TokenType type) const;
    bool match(TokenType type);
    Token advance();
    Token peek() const;
    Token previous() const;
    bool isAtEnd() const;
    Token consume(TokenType type, const std::string& message);

    int getPrecedence(const std::string& op) const;

    ParseError error(const Token& token, const std::string& message) const;

    std::vector<Token> tokens_;
    size_t current_;
};

} // namespace strata
