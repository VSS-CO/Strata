#include "parser.hpp"
#include <unordered_map>

namespace strata {

static const std::unordered_map<std::string, int> precedences = {
    {"||", 1},
    {"&&", 2},
    {"==", 3}, {"!=", 3},
    {"<", 4}, {">", 4}, {"<=", 4}, {">=", 4},
    {"+", 5}, {"-", 5},
    {"*", 6}, {"/", 6}, {"%", 6},
};

Parser::Parser(const std::vector<Token>& tokens)
    : tokens_(tokens), current_(0) {}

bool Parser::check(TokenType type) const {
    if (isAtEnd()) return false;
    return peek().type == type;
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

Token Parser::advance() {
    if (!isAtEnd()) current_++;
    return previous();
}

Token Parser::peek() const {
    return tokens_[current_];
}

Token Parser::previous() const {
    return tokens_[current_ - 1];
}

bool Parser::isAtEnd() const {
    return peek().type == TokenType::END_OF_FILE;
}

Token Parser::consume(TokenType type, const std::string& message) {
    if (check(type)) return advance();
    throw error(peek(), message);
}

ParseError Parser::error(const Token& token, const std::string& message) const {
    return ParseError(message, token.location);
}

int Parser::getPrecedence(const std::string& op) const {
    auto it = precedences.find(op);
    if (it != precedences.end()) {
        return it->second;
    }
    return 0;
}

std::vector<StmtPtr> Parser::parse() {
    std::vector<StmtPtr> statements;
    while (!isAtEnd()) {
        statements.push_back(parseStatement());
    }
    return statements;
}

StmtPtr Parser::parseStatement() {
    if (check(TokenType::IMPORT)) return parseImportStatement();
    if (check(TokenType::LET) || check(TokenType::CONST) || check(TokenType::VAR)) {
        return parseLetStatement();
    }
    if (check(TokenType::FUNC)) return parseFunctionStatement();
    if (check(TokenType::IF)) return parseIfStatement();
    if (check(TokenType::WHILE)) return parseWhileStatement();
    if (check(TokenType::FOR)) return parseForStatement();
    if (check(TokenType::RETURN)) return parseReturnStatement();
    if (check(TokenType::BREAK)) {
        auto loc = peek().location;
        advance();
        auto stmt = std::make_unique<Stmt>();
        stmt->data = BreakStmt{};
        stmt->location = loc;
        return stmt;
    }
    if (check(TokenType::CONTINUE)) {
        auto loc = peek().location;
        advance();
        auto stmt = std::make_unique<Stmt>();
        stmt->data = ContinueStmt{};
        stmt->location = loc;
        return stmt;
    }
    return parseExpressionStatement();
}

StmtPtr Parser::parseImportStatement() {
    auto loc = peek().location;
    consume(TokenType::IMPORT, "Expected 'import'");

    std::string name = consume(TokenType::IDENTIFIER, "Expected identifier after 'import'").value;
    consume(TokenType::FROM, "Expected 'from' after identifier");

    std::string module = consume(TokenType::IDENTIFIER, "Expected module name").value;
    while (match(TokenType::DOUBLE_COLON)) {
        module += "::";
        module += consume(TokenType::IDENTIFIER, "Expected identifier after '::'").value;
    }

    auto stmt = std::make_unique<Stmt>();
    ImportStmt import;
    import.name = name;
    import.module = module;
    stmt->data = std::move(import);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseLetStatement() {
    auto loc = peek().location;
    bool mutable_ = false;

    if (match(TokenType::VAR)) {
        mutable_ = true;
    } else if (match(TokenType::LET)) {
        mutable_ = false;
    } else {
        consume(TokenType::CONST, "Expected 'let', 'const', or 'var'");
        mutable_ = false;
    }

    std::string name = consume(TokenType::IDENTIFIER, "Expected variable name").value;
    consume(TokenType::COLON, "Expected ':' after variable name");
    TypeInfo type = parseType();
    consume(TokenType::ASSIGN, "Expected '=' after type");
    ExprPtr value = parseExpression();

    auto stmt = std::make_unique<Stmt>();
    LetStmt let;
    let.name = name;
    let.type = type;
    let.value = std::move(value);
    let.mutable_ = mutable_;
    stmt->data = std::move(let);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseFunctionStatement() {
    auto loc = peek().location;
    consume(TokenType::FUNC, "Expected 'func'");

    std::string name = consume(TokenType::IDENTIFIER, "Expected function name").value;
    consume(TokenType::LPAREN, "Expected '(' after function name");

    std::vector<Param> params;
    if (!check(TokenType::RPAREN)) {
        do {
            std::string paramName = consume(TokenType::IDENTIFIER, "Expected parameter name").value;
            consume(TokenType::COLON, "Expected ':' after parameter name");
            TypeInfo paramType = parseType();
            params.push_back(Param{paramName, paramType});
        } while (match(TokenType::COMMA));
    }
    consume(TokenType::RPAREN, "Expected ')' after parameters");
    consume(TokenType::ARROW, "Expected '=>' after parameters");
    TypeInfo returnType = parseType();
    consume(TokenType::LBRACE, "Expected '{' before function body");

    std::vector<StmtPtr> body;
    while (!check(TokenType::RBRACE) && !isAtEnd()) {
        body.push_back(parseStatement());
    }
    consume(TokenType::RBRACE, "Expected '}' after function body");

    auto stmt = std::make_unique<Stmt>();
    FunctionStmt func;
    func.name = name;
    func.params = std::move(params);
    func.returnType = returnType;
    func.body = std::move(body);
    stmt->data = std::move(func);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseIfStatement() {
    auto loc = peek().location;
    consume(TokenType::IF, "Expected 'if'");
    consume(TokenType::LPAREN, "Expected '(' after 'if'");
    ExprPtr condition = parseExpression();
    consume(TokenType::RPAREN, "Expected ')' after condition");
    consume(TokenType::LBRACE, "Expected '{' after condition");

    std::vector<StmtPtr> thenBranch;
    while (!check(TokenType::RBRACE) && !isAtEnd()) {
        thenBranch.push_back(parseStatement());
    }
    consume(TokenType::RBRACE, "Expected '}' after then branch");

    std::vector<StmtPtr> elseBranch;
    if (match(TokenType::ELSE)) {
        if (check(TokenType::IF)) {
            elseBranch.push_back(parseIfStatement());
        } else {
            consume(TokenType::LBRACE, "Expected '{' after 'else'");
            while (!check(TokenType::RBRACE) && !isAtEnd()) {
                elseBranch.push_back(parseStatement());
            }
            consume(TokenType::RBRACE, "Expected '}' after else branch");
        }
    }

    auto stmt = std::make_unique<Stmt>();
    IfStmt ifStmt;
    ifStmt.condition = std::move(condition);
    ifStmt.thenBranch = std::move(thenBranch);
    ifStmt.elseBranch = std::move(elseBranch);
    stmt->data = std::move(ifStmt);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseWhileStatement() {
    auto loc = peek().location;
    consume(TokenType::WHILE, "Expected 'while'");
    consume(TokenType::LPAREN, "Expected '(' after 'while'");
    ExprPtr condition = parseExpression();
    consume(TokenType::RPAREN, "Expected ')' after condition");
    consume(TokenType::LBRACE, "Expected '{' after condition");

    std::vector<StmtPtr> body;
    while (!check(TokenType::RBRACE) && !isAtEnd()) {
        body.push_back(parseStatement());
    }
    consume(TokenType::RBRACE, "Expected '}' after while body");

    auto stmt = std::make_unique<Stmt>();
    WhileStmt whileStmt;
    whileStmt.condition = std::move(condition);
    whileStmt.body = std::move(body);
    stmt->data = std::move(whileStmt);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseForStatement() {
    auto loc = peek().location;
    consume(TokenType::FOR, "Expected 'for'");
    consume(TokenType::LPAREN, "Expected '(' after 'for'");

    StmtPtr init = parseStatement();
    match(TokenType::SEMICOLON);

    ExprPtr condition = parseExpression();
    match(TokenType::SEMICOLON);

    StmtPtr update = parseStatement();
    consume(TokenType::RPAREN, "Expected ')' after for clauses");
    consume(TokenType::LBRACE, "Expected '{' after for clauses");

    std::vector<StmtPtr> body;
    while (!check(TokenType::RBRACE) && !isAtEnd()) {
        body.push_back(parseStatement());
    }
    consume(TokenType::RBRACE, "Expected '}' after for body");

    auto stmt = std::make_unique<Stmt>();
    ForStmt forStmt;
    forStmt.init = std::move(init);
    forStmt.condition = std::move(condition);
    forStmt.update = std::move(update);
    forStmt.body = std::move(body);
    stmt->data = std::move(forStmt);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseReturnStatement() {
    auto loc = peek().location;
    consume(TokenType::RETURN, "Expected 'return'");

    ExprPtr value = nullptr;
    if (!check(TokenType::RBRACE) && !isAtEnd()) {
        value = parseExpression();
    }

    auto stmt = std::make_unique<Stmt>();
    ReturnStmt ret;
    ret.value = std::move(value);
    stmt->data = std::move(ret);
    stmt->location = loc;
    return stmt;
}

StmtPtr Parser::parseExpressionStatement() {
    auto loc = peek().location;
    ExprPtr expr = parseExpression();

    // Check for assignment
    if (match(TokenType::ASSIGN)) {
        if (expr->is<IdentifierExpr>()) {
            std::string target = expr->as<IdentifierExpr>().name;
            ExprPtr value = parseExpression();

            auto stmt = std::make_unique<Stmt>();
            AssignStmt assign;
            assign.target = target;
            assign.value = std::move(value);
            stmt->data = std::move(assign);
            stmt->location = loc;
            return stmt;
        }
        throw error(previous(), "Invalid assignment target");
    }

    auto stmt = std::make_unique<Stmt>();
    ExprStmt exprStmt;
    exprStmt.expr = std::move(expr);
    stmt->data = std::move(exprStmt);
    stmt->location = loc;
    return stmt;
}

ExprPtr Parser::parseExpression() {
    return parseBinary(0);
}

ExprPtr Parser::parseBinary(int minPrecedence) {
    ExprPtr left = parseUnary();

    while (true) {
        Token op = peek();
        std::string opStr;

        switch (op.type) {
            case TokenType::PLUS: opStr = "+"; break;
            case TokenType::MINUS: opStr = "-"; break;
            case TokenType::STAR: opStr = "*"; break;
            case TokenType::SLASH: opStr = "/"; break;
            case TokenType::PERCENT: opStr = "%"; break;
            case TokenType::EQ: opStr = "=="; break;
            case TokenType::NE: opStr = "!="; break;
            case TokenType::LT: opStr = "<"; break;
            case TokenType::GT: opStr = ">"; break;
            case TokenType::LE: opStr = "<="; break;
            case TokenType::GE: opStr = ">="; break;
            case TokenType::AND: opStr = "&&"; break;
            case TokenType::OR: opStr = "||"; break;
            default: return left;
        }

        int prec = getPrecedence(opStr);
        if (prec <= minPrecedence) break;

        advance();
        ExprPtr right = parseBinary(prec);
        left = makeBinary(opStr, std::move(left), std::move(right), op.location);
    }

    return left;
}

ExprPtr Parser::parseUnary() {
    if (match(TokenType::NOT)) {
        auto loc = previous().location;
        ExprPtr operand = parseUnary();
        return makeUnary("!", std::move(operand), loc);
    }
    if (match(TokenType::MINUS)) {
        auto loc = previous().location;
        ExprPtr operand = parseUnary();
        return makeUnary("-", std::move(operand), loc);
    }
    if (match(TokenType::TILDE)) {
        auto loc = previous().location;
        ExprPtr operand = parseUnary();
        return makeUnary("~", std::move(operand), loc);
    }
    return parsePrimary();
}

ExprPtr Parser::parsePrimary() {
    auto loc = peek().location;

    // Literals
    if (match(TokenType::INTEGER)) {
        return makeLiteral(previous().intValue(), loc);
    }
    if (match(TokenType::FLOAT)) {
        return makeLiteral(previous().floatValue(), loc);
    }
    if (match(TokenType::STRING)) {
        return makeLiteral(previous().value, loc);
    }
    if (match(TokenType::TRUE)) {
        return makeLiteral(true, loc);
    }
    if (match(TokenType::FALSE)) {
        return makeLiteral(false, loc);
    }

    // Identifier
    if (match(TokenType::IDENTIFIER)) {
        ExprPtr expr = makeIdentifier(previous().value, loc);

        // Handle member access and calls
        while (true) {
            if (match(TokenType::DOT) || match(TokenType::DOUBLE_COLON)) {
                std::string property = consume(TokenType::IDENTIFIER, "Expected property name").value;

                if (check(TokenType::LPAREN)) {
                    expr = makeMember(std::move(expr), property, loc);
                    expr = parseCall(std::move(expr));
                } else {
                    expr = makeMember(std::move(expr), property, loc);
                }
            } else if (check(TokenType::LPAREN)) {
                expr = parseCall(std::move(expr));
            } else {
                break;
            }
        }

        return expr;
    }

    // Grouped expression
    if (match(TokenType::LPAREN)) {
        ExprPtr expr = parseExpression();
        consume(TokenType::RPAREN, "Expected ')' after expression");
        return expr;
    }

    throw error(peek(), "Expected expression");
}

ExprPtr Parser::parseCall(ExprPtr callee) {
    auto loc = peek().location;
    consume(TokenType::LPAREN, "Expected '(' for function call");

    std::vector<ExprPtr> args;
    if (!check(TokenType::RPAREN)) {
        do {
            args.push_back(parseExpression());
        } while (match(TokenType::COMMA));
    }
    consume(TokenType::RPAREN, "Expected ')' after arguments");

    return makeCall(std::move(callee), std::move(args), loc);
}

TypeInfo Parser::parseType() {
    std::string typeName;

    if (match(TokenType::TYPE_INT)) typeName = "int";
    else if (match(TokenType::TYPE_FLOAT)) typeName = "float";
    else if (match(TokenType::TYPE_BOOL)) typeName = "bool";
    else if (match(TokenType::TYPE_CHAR)) typeName = "char";
    else if (match(TokenType::TYPE_STRING)) typeName = "string";
    else if (match(TokenType::TYPE_VOID)) typeName = "void";
    else if (match(TokenType::TYPE_ANY)) typeName = "any";
    else if (match(TokenType::IDENTIFIER)) typeName = previous().value;
    else throw error(peek(), "Expected type");

    return TypeInfo::fromString(typeName);
}

} // namespace strata
