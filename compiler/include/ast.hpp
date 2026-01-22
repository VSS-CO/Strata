#pragma once
#include "token.hpp"
#include <memory>
#include <string>
#include <vector>
#include <variant>

namespace strata {

// Forward declarations
struct Expr;
struct Stmt;

using ExprPtr = std::unique_ptr<Expr>;
using StmtPtr = std::unique_ptr<Stmt>;

// Type definitions
enum class PrimitiveType {
    INT,
    FLOAT,
    BOOL,
    CHAR,
    STRING,
    VOID,
    ANY
};

struct TypeInfo {
    PrimitiveType primitive;
    bool isOptional = false;

    static TypeInfo fromString(const std::string& s);
    std::string toString() const;
    bool isCompatible(const TypeInfo& other) const;
};

// Expression types
struct LiteralExpr {
    std::variant<int64_t, double, bool, char, std::string> value;
    TypeInfo type;
};

struct IdentifierExpr {
    std::string name;
};

struct BinaryExpr {
    std::string op;
    ExprPtr left;
    ExprPtr right;
};

struct UnaryExpr {
    std::string op;
    ExprPtr operand;
};

struct CallExpr {
    ExprPtr callee;
    std::vector<ExprPtr> arguments;
};

struct MemberExpr {
    ExprPtr object;
    std::string property;
};

struct Expr {
    std::variant<
        LiteralExpr,
        IdentifierExpr,
        BinaryExpr,
        UnaryExpr,
        CallExpr,
        MemberExpr
    > data;
    Location location;

    template<typename T>
    bool is() const { return std::holds_alternative<T>(data); }

    template<typename T>
    T& as() { return std::get<T>(data); }

    template<typename T>
    const T& as() const { return std::get<T>(data); }
};

// Statement types
struct LetStmt {
    std::string name;
    TypeInfo type;
    ExprPtr value;
    bool mutable_;
};

struct AssignStmt {
    std::string target;
    ExprPtr value;
};

struct ExprStmt {
    ExprPtr expr;
};

struct IfStmt {
    ExprPtr condition;
    std::vector<StmtPtr> thenBranch;
    std::vector<StmtPtr> elseBranch;
};

struct WhileStmt {
    ExprPtr condition;
    std::vector<StmtPtr> body;
};

struct ForStmt {
    StmtPtr init;
    ExprPtr condition;
    StmtPtr update;
    std::vector<StmtPtr> body;
};

struct ReturnStmt {
    ExprPtr value;
};

struct BreakStmt {};
struct ContinueStmt {};

struct Param {
    std::string name;
    TypeInfo type;
};

struct FunctionStmt {
    std::string name;
    std::vector<Param> params;
    TypeInfo returnType;
    std::vector<StmtPtr> body;
};

struct ImportStmt {
    std::string name;
    std::string module;
};

struct Stmt {
    std::variant<
        LetStmt,
        AssignStmt,
        ExprStmt,
        IfStmt,
        WhileStmt,
        ForStmt,
        ReturnStmt,
        BreakStmt,
        ContinueStmt,
        FunctionStmt,
        ImportStmt
    > data;
    Location location;

    template<typename T>
    bool is() const { return std::holds_alternative<T>(data); }

    template<typename T>
    T& as() { return std::get<T>(data); }

    template<typename T>
    const T& as() const { return std::get<T>(data); }
};

// Helper functions
ExprPtr makeLiteral(int64_t value, Location loc);
ExprPtr makeLiteral(double value, Location loc);
ExprPtr makeLiteral(bool value, Location loc);
ExprPtr makeLiteral(const std::string& value, Location loc);
ExprPtr makeIdentifier(const std::string& name, Location loc);
ExprPtr makeBinary(const std::string& op, ExprPtr left, ExprPtr right, Location loc);
ExprPtr makeUnary(const std::string& op, ExprPtr operand, Location loc);
ExprPtr makeCall(ExprPtr callee, std::vector<ExprPtr> args, Location loc);
ExprPtr makeMember(ExprPtr object, const std::string& property, Location loc);

} // namespace strata
