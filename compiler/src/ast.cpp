#include "ast.hpp"

namespace strata {

TypeInfo TypeInfo::fromString(const std::string& s) {
    TypeInfo info;
    info.isOptional = false;

    std::string typeName = s;
    if (!s.empty() && s.back() == '?') {
        info.isOptional = true;
        typeName = s.substr(0, s.size() - 1);
    }

    if (typeName == "int" || typeName == "i32" || typeName == "i64") {
        info.primitive = PrimitiveType::INT;
    } else if (typeName == "float" || typeName == "f32" || typeName == "f64") {
        info.primitive = PrimitiveType::FLOAT;
    } else if (typeName == "bool") {
        info.primitive = PrimitiveType::BOOL;
    } else if (typeName == "char") {
        info.primitive = PrimitiveType::CHAR;
    } else if (typeName == "string") {
        info.primitive = PrimitiveType::STRING;
    } else if (typeName == "void") {
        info.primitive = PrimitiveType::VOID;
    } else {
        info.primitive = PrimitiveType::ANY;
    }

    return info;
}

std::string TypeInfo::toString() const {
    std::string result;
    switch (primitive) {
        case PrimitiveType::INT: result = "int"; break;
        case PrimitiveType::FLOAT: result = "float"; break;
        case PrimitiveType::BOOL: result = "bool"; break;
        case PrimitiveType::CHAR: result = "char"; break;
        case PrimitiveType::STRING: result = "string"; break;
        case PrimitiveType::VOID: result = "void"; break;
        case PrimitiveType::ANY: result = "any"; break;
    }
    if (isOptional) result += "?";
    return result;
}

bool TypeInfo::isCompatible(const TypeInfo& other) const {
    if (primitive == PrimitiveType::ANY || other.primitive == PrimitiveType::ANY) {
        return true;
    }
    if (primitive == other.primitive) {
        return true;
    }
    // int -> float promotion
    if (primitive == PrimitiveType::INT && other.primitive == PrimitiveType::FLOAT) {
        return true;
    }
    // char -> string
    if (primitive == PrimitiveType::CHAR && other.primitive == PrimitiveType::STRING) {
        return true;
    }
    return false;
}

ExprPtr makeLiteral(int64_t value, Location loc) {
    auto expr = std::make_unique<Expr>();
    LiteralExpr lit;
    lit.value = value;
    lit.type = TypeInfo{PrimitiveType::INT, false};
    expr->data = std::move(lit);
    expr->location = loc;
    return expr;
}

ExprPtr makeLiteral(double value, Location loc) {
    auto expr = std::make_unique<Expr>();
    LiteralExpr lit;
    lit.value = value;
    lit.type = TypeInfo{PrimitiveType::FLOAT, false};
    expr->data = std::move(lit);
    expr->location = loc;
    return expr;
}

ExprPtr makeLiteral(bool value, Location loc) {
    auto expr = std::make_unique<Expr>();
    LiteralExpr lit;
    lit.value = value;
    lit.type = TypeInfo{PrimitiveType::BOOL, false};
    expr->data = std::move(lit);
    expr->location = loc;
    return expr;
}

ExprPtr makeLiteral(const std::string& value, Location loc) {
    auto expr = std::make_unique<Expr>();
    LiteralExpr lit;
    lit.value = value;
    lit.type = TypeInfo{PrimitiveType::STRING, false};
    expr->data = std::move(lit);
    expr->location = loc;
    return expr;
}

ExprPtr makeIdentifier(const std::string& name, Location loc) {
    auto expr = std::make_unique<Expr>();
    IdentifierExpr id;
    id.name = name;
    expr->data = std::move(id);
    expr->location = loc;
    return expr;
}

ExprPtr makeBinary(const std::string& op, ExprPtr left, ExprPtr right, Location loc) {
    auto expr = std::make_unique<Expr>();
    BinaryExpr bin;
    bin.op = op;
    bin.left = std::move(left);
    bin.right = std::move(right);
    expr->data = std::move(bin);
    expr->location = loc;
    return expr;
}

ExprPtr makeUnary(const std::string& op, ExprPtr operand, Location loc) {
    auto expr = std::make_unique<Expr>();
    UnaryExpr un;
    un.op = op;
    un.operand = std::move(operand);
    expr->data = std::move(un);
    expr->location = loc;
    return expr;
}

ExprPtr makeCall(ExprPtr callee, std::vector<ExprPtr> args, Location loc) {
    auto expr = std::make_unique<Expr>();
    CallExpr call;
    call.callee = std::move(callee);
    call.arguments = std::move(args);
    expr->data = std::move(call);
    expr->location = loc;
    return expr;
}

ExprPtr makeMember(ExprPtr object, const std::string& property, Location loc) {
    auto expr = std::make_unique<Expr>();
    MemberExpr mem;
    mem.object = std::move(object);
    mem.property = property;
    expr->data = std::move(mem);
    expr->location = loc;
    return expr;
}

} // namespace strata
