#pragma once
#include "ast.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <sstream>

namespace strata {

struct Variable {
    int stackOffset;
    TypeInfo type;
    bool mutable_;
};

struct Function {
    std::string name;
    std::vector<TypeInfo> paramTypes;
    TypeInfo returnType;
};

class CodeGenerator {
public:
    CodeGenerator();

    std::string generate(const std::vector<StmtPtr>& statements);

private:
    void emit(const std::string& line);
    void emitLabel(const std::string& label);
    void emitComment(const std::string& comment);

    void generateStatement(const Stmt& stmt);
    void generateLetStmt(const LetStmt& stmt);
    void generateAssignStmt(const AssignStmt& stmt);
    void generateExprStmt(const ExprStmt& stmt);
    void generateIfStmt(const IfStmt& stmt);
    void generateWhileStmt(const WhileStmt& stmt);
    void generateForStmt(const ForStmt& stmt);
    void generateReturnStmt(const ReturnStmt& stmt);
    void generateFunctionStmt(const FunctionStmt& stmt);

    void generateExpression(const Expr& expr);
    void generateLiteral(const LiteralExpr& expr);
    void generateIdentifier(const IdentifierExpr& expr);
    void generateBinary(const BinaryExpr& expr);
    void generateUnary(const UnaryExpr& expr);
    void generateCall(const CallExpr& expr);
    void generateMember(const MemberExpr& expr);

    void generatePrologue();
    void generateEpilogue();
    void generateFunctionPrologue(const std::string& name, int localSize);
    void generateFunctionEpilogue();

    void generateBuiltinPrint();
    void generateDataSection();
    void generateBssSection();

    int allocateStack(int size);
    void freeStack(int size);
    int declareLocal(const std::string& name, TypeInfo type, bool mutable_);
    Variable* lookupLocal(const std::string& name);

    std::string newLabel(const std::string& prefix);
    std::string newStringLabel();

    void enterScope();
    void exitScope();

    std::stringstream output_;
    std::stringstream dataSection_;
    std::vector<std::unordered_map<std::string, Variable>> scopes_;
    std::unordered_map<std::string, Function> functions_;
    std::unordered_map<std::string, std::string> stringLiterals_;

    int stackOffset_;
    int labelCounter_;
    int stringCounter_;
    bool inFunction_;
    std::string currentFunction_;
    int breakLabel_;
    int continueLabel_;
};

} // namespace strata
