#include "type_checker.hpp"

namespace strata {

TypeChecker::TypeChecker()
    : currentReturnType_{PrimitiveType::VOID, false}
    , inFunction_(false) {
    enterScope();
}

void TypeChecker::check(const std::vector<StmtPtr>& statements) {
    for (const auto& stmt : statements) {
        checkStatement(*stmt);
    }
}

void TypeChecker::checkStatement(const Stmt& stmt) {
    if (stmt.is<LetStmt>()) {
        checkLetStmt(stmt.as<LetStmt>(), stmt.location);
    } else if (stmt.is<AssignStmt>()) {
        checkAssignStmt(stmt.as<AssignStmt>(), stmt.location);
    } else if (stmt.is<IfStmt>()) {
        checkIfStmt(stmt.as<IfStmt>(), stmt.location);
    } else if (stmt.is<WhileStmt>()) {
        checkWhileStmt(stmt.as<WhileStmt>(), stmt.location);
    } else if (stmt.is<ForStmt>()) {
        checkForStmt(stmt.as<ForStmt>(), stmt.location);
    } else if (stmt.is<FunctionStmt>()) {
        checkFunctionStmt(stmt.as<FunctionStmt>(), stmt.location);
    } else if (stmt.is<ReturnStmt>()) {
        checkReturnStmt(stmt.as<ReturnStmt>(), stmt.location);
    } else if (stmt.is<ExprStmt>()) {
        checkExpression(*stmt.as<ExprStmt>().expr);
    } else if (stmt.is<ImportStmt>()) {
        // Imports are handled at runtime
    }
}

void TypeChecker::checkLetStmt(const LetStmt& stmt, Location loc) {
    TypeInfo valueType = checkExpression(*stmt.value);

    if (!valueType.isCompatible(stmt.type)) {
        throw TypeError("Type mismatch: expected " + stmt.type.toString() +
                       ", got " + valueType.toString(), loc);
    }

    declareVariable(stmt.name, stmt.type, stmt.mutable_);
}

void TypeChecker::checkAssignStmt(const AssignStmt& stmt, Location loc) {
    VariableInfo* var = lookupVariable(stmt.target);
    if (!var) {
        throw TypeError("Undefined variable: " + stmt.target, loc);
    }

    if (!var->mutable_) {
        throw TypeError("Cannot assign to immutable variable: " + stmt.target, loc);
    }

    TypeInfo valueType = checkExpression(*stmt.value);
    if (!valueType.isCompatible(var->type)) {
        throw TypeError("Type mismatch in assignment", loc);
    }
}

void TypeChecker::checkIfStmt(const IfStmt& stmt, Location loc) {
    TypeInfo condType = checkExpression(*stmt.condition);
    if (condType.primitive != PrimitiveType::BOOL && condType.primitive != PrimitiveType::ANY) {
        throw TypeError("Condition must be boolean", loc);
    }

    enterScope();
    for (const auto& s : stmt.thenBranch) {
        checkStatement(*s);
    }
    exitScope();

    if (!stmt.elseBranch.empty()) {
        enterScope();
        for (const auto& s : stmt.elseBranch) {
            checkStatement(*s);
        }
        exitScope();
    }
}

void TypeChecker::checkWhileStmt(const WhileStmt& stmt, Location loc) {
    TypeInfo condType = checkExpression(*stmt.condition);
    if (condType.primitive != PrimitiveType::BOOL && condType.primitive != PrimitiveType::ANY) {
        throw TypeError("Condition must be boolean", loc);
    }

    enterScope();
    for (const auto& s : stmt.body) {
        checkStatement(*s);
    }
    exitScope();
}

void TypeChecker::checkForStmt(const ForStmt& stmt, Location loc) {
    enterScope();

    checkStatement(*stmt.init);

    TypeInfo condType = checkExpression(*stmt.condition);
    if (condType.primitive != PrimitiveType::BOOL && condType.primitive != PrimitiveType::ANY) {
        throw TypeError("Condition must be boolean", loc);
    }

    checkStatement(*stmt.update);

    for (const auto& s : stmt.body) {
        checkStatement(*s);
    }

    exitScope();
}

void TypeChecker::checkFunctionStmt(const FunctionStmt& stmt, Location loc) {
    std::vector<TypeInfo> paramTypes;
    for (const auto& param : stmt.params) {
        paramTypes.push_back(param.type);
    }
    declareFunction(stmt.name, paramTypes, stmt.returnType);

    TypeInfo savedReturnType = currentReturnType_;
    bool savedInFunction = inFunction_;
    currentReturnType_ = stmt.returnType;
    inFunction_ = true;

    enterScope();

    for (const auto& param : stmt.params) {
        declareVariable(param.name, param.type, false);
    }

    for (const auto& s : stmt.body) {
        checkStatement(*s);
    }

    exitScope();

    currentReturnType_ = savedReturnType;
    inFunction_ = savedInFunction;

    (void)loc; // Suppress unused warning
}

void TypeChecker::checkReturnStmt(const ReturnStmt& stmt, Location loc) {
    if (!inFunction_) {
        throw TypeError("Return statement outside function", loc);
    }

    if (stmt.value) {
        TypeInfo valueType = checkExpression(*stmt.value);
        if (!valueType.isCompatible(currentReturnType_)) {
            throw TypeError("Return type mismatch: expected " + currentReturnType_.toString() +
                           ", got " + valueType.toString(), loc);
        }
    } else if (currentReturnType_.primitive != PrimitiveType::VOID) {
        throw TypeError("Function must return a value", loc);
    }
}

TypeInfo TypeChecker::checkExpression(const Expr& expr) {
    if (expr.is<LiteralExpr>()) {
        return expr.as<LiteralExpr>().type;
    }

    if (expr.is<IdentifierExpr>()) {
        VariableInfo* var = lookupVariable(expr.as<IdentifierExpr>().name);
        if (var) {
            return var->type;
        }
        return TypeInfo{PrimitiveType::ANY, false};
    }

    if (expr.is<BinaryExpr>()) {
        return checkBinaryExpr(expr.as<BinaryExpr>(), expr.location);
    }

    if (expr.is<UnaryExpr>()) {
        return checkUnaryExpr(expr.as<UnaryExpr>(), expr.location);
    }

    if (expr.is<CallExpr>()) {
        return checkCallExpr(expr.as<CallExpr>(), expr.location);
    }

    if (expr.is<MemberExpr>()) {
        return TypeInfo{PrimitiveType::ANY, false};
    }

    return TypeInfo{PrimitiveType::ANY, false};
}

TypeInfo TypeChecker::checkBinaryExpr(const BinaryExpr& expr, Location loc) {
    TypeInfo leftType = checkExpression(*expr.left);
    TypeInfo rightType = checkExpression(*expr.right);

    const std::string& op = expr.op;

    if (op == "==" || op == "!=" || op == "<" || op == ">" || op == "<=" || op == ">=") {
        return TypeInfo{PrimitiveType::BOOL, false};
    }

    if (op == "&&" || op == "||") {
        if (leftType.primitive != PrimitiveType::BOOL && leftType.primitive != PrimitiveType::ANY) {
            throw TypeError("Logical operator requires boolean operands", loc);
        }
        return TypeInfo{PrimitiveType::BOOL, false};
    }

    if (op == "+" || op == "-" || op == "*" || op == "/" || op == "%") {
        if (leftType.primitive == PrimitiveType::FLOAT || rightType.primitive == PrimitiveType::FLOAT) {
            return TypeInfo{PrimitiveType::FLOAT, false};
        }
        if (leftType.primitive == PrimitiveType::STRING && op == "+") {
            return TypeInfo{PrimitiveType::STRING, false};
        }
        return TypeInfo{PrimitiveType::INT, false};
    }

    return leftType;
}

TypeInfo TypeChecker::checkUnaryExpr(const UnaryExpr& expr, Location loc) {
    TypeInfo operandType = checkExpression(*expr.operand);

    if (expr.op == "!") {
        if (operandType.primitive != PrimitiveType::BOOL && operandType.primitive != PrimitiveType::ANY) {
            throw TypeError("Logical not requires boolean operand", loc);
        }
        return TypeInfo{PrimitiveType::BOOL, false};
    }

    if (expr.op == "-" || expr.op == "+") {
        return operandType;
    }

    if (expr.op == "~") {
        return TypeInfo{PrimitiveType::INT, false};
    }

    return operandType;
}

TypeInfo TypeChecker::checkCallExpr(const CallExpr& expr, Location loc) {
    if (expr.callee->is<IdentifierExpr>()) {
        FunctionInfo* func = lookupFunction(expr.callee->as<IdentifierExpr>().name);
        if (func) {
            if (expr.arguments.size() != func->paramTypes.size()) {
                throw TypeError("Wrong number of arguments", loc);
            }

            for (size_t i = 0; i < expr.arguments.size(); ++i) {
                TypeInfo argType = checkExpression(*expr.arguments[i]);
                if (!argType.isCompatible(func->paramTypes[i])) {
                    throw TypeError("Argument type mismatch", loc);
                }
            }

            return func->returnType;
        }
    }

    return TypeInfo{PrimitiveType::ANY, false};
}

void TypeChecker::enterScope() {
    scopes_.push_back({});
}

void TypeChecker::exitScope() {
    scopes_.pop_back();
}

void TypeChecker::declareVariable(const std::string& name, TypeInfo type, bool mutable_) {
    if (!scopes_.empty()) {
        scopes_.back()[name] = VariableInfo{type, mutable_};
    }
}

VariableInfo* TypeChecker::lookupVariable(const std::string& name) {
    for (auto it = scopes_.rbegin(); it != scopes_.rend(); ++it) {
        auto varIt = it->find(name);
        if (varIt != it->end()) {
            return &varIt->second;
        }
    }
    return nullptr;
}

void TypeChecker::declareFunction(const std::string& name, const std::vector<TypeInfo>& params, TypeInfo returnType) {
    functions_[name] = FunctionInfo{params, returnType};
}

FunctionInfo* TypeChecker::lookupFunction(const std::string& name) {
    auto it = functions_.find(name);
    if (it != functions_.end()) {
        return &it->second;
    }
    return nullptr;
}

} // namespace strata
