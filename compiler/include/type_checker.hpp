#pragma once
#include "ast.hpp"
#include <unordered_map>
#include <vector>
#include <string>
#include <stdexcept>

namespace strata {

class TypeError : public std::runtime_error {
public:
    TypeError(const std::string& message, Location loc)
        : std::runtime_error(message), location_(loc) {}

    const Location& location() const { return location_; }

private:
    Location location_;
};

struct VariableInfo {
    TypeInfo type;
    bool mutable_;
};

struct FunctionInfo {
    std::vector<TypeInfo> paramTypes;
    TypeInfo returnType;
};

class TypeChecker {
public:
    TypeChecker();

    void check(const std::vector<StmtPtr>& statements);

private:
    void checkStatement(const Stmt& stmt);
    void checkLetStmt(const LetStmt& stmt, Location loc);
    void checkAssignStmt(const AssignStmt& stmt, Location loc);
    void checkIfStmt(const IfStmt& stmt, Location loc);
    void checkWhileStmt(const WhileStmt& stmt, Location loc);
    void checkForStmt(const ForStmt& stmt, Location loc);
    void checkFunctionStmt(const FunctionStmt& stmt, Location loc);
    void checkReturnStmt(const ReturnStmt& stmt, Location loc);

    TypeInfo checkExpression(const Expr& expr);
    TypeInfo checkBinaryExpr(const BinaryExpr& expr, Location loc);
    TypeInfo checkUnaryExpr(const UnaryExpr& expr, Location loc);
    TypeInfo checkCallExpr(const CallExpr& expr, Location loc);

    void enterScope();
    void exitScope();

    void declareVariable(const std::string& name, TypeInfo type, bool mutable_);
    VariableInfo* lookupVariable(const std::string& name);

    void declareFunction(const std::string& name, const std::vector<TypeInfo>& params, TypeInfo returnType);
    FunctionInfo* lookupFunction(const std::string& name);

    std::vector<std::unordered_map<std::string, VariableInfo>> scopes_;
    std::unordered_map<std::string, FunctionInfo> functions_;
    TypeInfo currentReturnType_;
    bool inFunction_;
};

} // namespace strata
