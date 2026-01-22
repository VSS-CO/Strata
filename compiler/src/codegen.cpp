#include "codegen.hpp"
#include <iomanip>
#include <cstring>

namespace strata {

CodeGenerator::CodeGenerator()
    : stackOffset_(0)
    , labelCounter_(0)
    , stringCounter_(0)
    , inFunction_(false)
    , breakLabel_(-1)
    , continueLabel_(-1) {}

void CodeGenerator::emit(const std::string& line) {
    output_ << "    " << line << "\n";
}

void CodeGenerator::emitLabel(const std::string& label) {
    output_ << label << ":\n";
}

void CodeGenerator::emitComment(const std::string& comment) {
    output_ << "    ; " << comment << "\n";
}

std::string CodeGenerator::newLabel(const std::string& prefix) {
    return prefix + "_" + std::to_string(labelCounter_++);
}

std::string CodeGenerator::newStringLabel() {
    return ".LC" + std::to_string(stringCounter_++);
}

void CodeGenerator::enterScope() {
    scopes_.push_back({});
}

void CodeGenerator::exitScope() {
    scopes_.pop_back();
}

int CodeGenerator::allocateStack(int size) {
    stackOffset_ += size;
    return stackOffset_;
}

void CodeGenerator::freeStack(int size) {
    stackOffset_ -= size;
}

int CodeGenerator::declareLocal(const std::string& name, TypeInfo type, bool mutable_) {
    int offset = allocateStack(8);
    if (!scopes_.empty()) {
        scopes_.back()[name] = Variable{offset, type, mutable_};
    }
    return offset;
}

Variable* CodeGenerator::lookupLocal(const std::string& name) {
    for (auto it = scopes_.rbegin(); it != scopes_.rend(); ++it) {
        auto varIt = it->find(name);
        if (varIt != it->end()) {
            return &varIt->second;
        }
    }
    return nullptr;
}

std::string CodeGenerator::generate(const std::vector<StmtPtr>& statements) {
    output_.str("");
    dataSection_.str("");

    // Collect all functions first
    std::vector<const FunctionStmt*> userFunctions;
    std::vector<const Stmt*> mainStatements;

    for (const auto& stmt : statements) {
        if (stmt->is<FunctionStmt>()) {
            userFunctions.push_back(&stmt->as<FunctionStmt>());
        } else if (!stmt->is<ImportStmt>()) {
            mainStatements.push_back(stmt.get());
        }
    }

    // Generate assembly header
#ifdef _WIN32
    output_ << "; Strata Compiler - x86-64 Assembly (Windows)\n";
    output_ << "; Generated code\n\n";
    output_ << "default rel\n";
    output_ << "global main\n";
    output_ << "extern printf\n";
    output_ << "extern ExitProcess\n\n";
#else
    output_ << "; Strata Compiler - x86-64 Assembly (Linux/macOS)\n";
    output_ << "; Generated code\n\n";
    output_ << "default rel\n";
    output_ << "global main\n";
    output_ << "extern printf\n\n";
#endif

    // Generate user functions
    output_ << "section .text\n\n";

    for (const auto* func : userFunctions) {
        generateFunctionStmt(*func);
        output_ << "\n";
    }

    // Generate builtin print
    generateBuiltinPrint();
    output_ << "\n";

    // Generate main function
    output_ << "main:\n";
    generatePrologue();

    enterScope();
    for (const auto* stmt : mainStatements) {
        generateStatement(*stmt);
    }
    exitScope();

    // Exit program
#ifdef _WIN32
    emit("xor ecx, ecx");
    emit("call ExitProcess");
#else
    emit("xor eax, eax");
    generateEpilogue();
#endif

    // Generate data section
    generateDataSection();
    generateBssSection();

    return output_.str();
}

void CodeGenerator::generatePrologue() {
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, 256");
}

void CodeGenerator::generateEpilogue() {
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");
}

void CodeGenerator::generateFunctionPrologue(const std::string& name, int localSize) {
    output_ << name << ":\n";
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, " + std::to_string((localSize + 15) & ~15));
}

void CodeGenerator::generateFunctionEpilogue() {
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");
}

void CodeGenerator::generateBuiltinPrint() {
    output_ << "_print_int:\n";
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, 32");
#ifdef _WIN32
    emit("mov rdx, rcx");
    emit("lea rcx, [fmt_int]");
#else
    emit("mov rsi, rdi");
    emit("lea rdi, [fmt_int]");
    emit("xor eax, eax");
#endif
    emit("call printf");
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");

    output_ << "\n_print_float:\n";
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, 32");
#ifdef _WIN32
    emit("movsd xmm1, xmm0");
    emit("lea rcx, [fmt_float]");
#else
    emit("lea rdi, [fmt_float]");
    emit("mov eax, 1");
#endif
    emit("call printf");
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");

    output_ << "\n_print_str:\n";
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, 32");
#ifdef _WIN32
    emit("mov rdx, rcx");
    emit("lea rcx, [fmt_str]");
#else
    emit("mov rsi, rdi");
    emit("lea rdi, [fmt_str]");
    emit("xor eax, eax");
#endif
    emit("call printf");
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");

    output_ << "\n_print_bool:\n";
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, 32");
#ifdef _WIN32
    emit("test ecx, ecx");
    emit("lea rdx, [str_true]");
    emit("lea rax, [str_false]");
    emit("cmovz rdx, rax");
    emit("lea rcx, [fmt_str]");
#else
    emit("test edi, edi");
    emit("lea rsi, [str_true]");
    emit("lea rax, [str_false]");
    emit("cmovz rsi, rax");
    emit("lea rdi, [fmt_str]");
    emit("xor eax, eax");
#endif
    emit("call printf");
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");
}

void CodeGenerator::generateDataSection() {
    output_ << "\nsection .data\n";
    output_ << "    fmt_int: db \"%lld\", 10, 0\n";
    output_ << "    fmt_float: db \"%g\", 10, 0\n";
    output_ << "    fmt_str: db \"%s\", 10, 0\n";
    output_ << "    str_true: db \"true\", 0\n";
    output_ << "    str_false: db \"false\", 0\n";

    // Add string literals
    for (const auto& [label, value] : stringLiterals_) {
        output_ << "    " << label << ": db ";
        for (size_t i = 0; i < value.size(); ++i) {
            if (i > 0) output_ << ", ";
            output_ << static_cast<int>(static_cast<unsigned char>(value[i]));
        }
        output_ << ", 0\n";
    }
}

void CodeGenerator::generateBssSection() {
    output_ << "\nsection .bss\n";
}

void CodeGenerator::generateStatement(const Stmt& stmt) {
    if (stmt.is<LetStmt>()) {
        generateLetStmt(stmt.as<LetStmt>());
    } else if (stmt.is<AssignStmt>()) {
        generateAssignStmt(stmt.as<AssignStmt>());
    } else if (stmt.is<ExprStmt>()) {
        generateExprStmt(stmt.as<ExprStmt>());
    } else if (stmt.is<IfStmt>()) {
        generateIfStmt(stmt.as<IfStmt>());
    } else if (stmt.is<WhileStmt>()) {
        generateWhileStmt(stmt.as<WhileStmt>());
    } else if (stmt.is<ForStmt>()) {
        generateForStmt(stmt.as<ForStmt>());
    } else if (stmt.is<ReturnStmt>()) {
        generateReturnStmt(stmt.as<ReturnStmt>());
    } else if (stmt.is<FunctionStmt>()) {
        // Already handled at top level
    } else if (stmt.is<BreakStmt>()) {
        if (breakLabel_ >= 0) {
            emit("jmp .L" + std::to_string(breakLabel_));
        }
    } else if (stmt.is<ContinueStmt>()) {
        if (continueLabel_ >= 0) {
            emit("jmp .L" + std::to_string(continueLabel_));
        }
    }
}

void CodeGenerator::generateLetStmt(const LetStmt& stmt) {
    emitComment("let " + stmt.name);

    generateExpression(*stmt.value);
    int offset = declareLocal(stmt.name, stmt.type, stmt.mutable_);
    emit("mov [rbp-" + std::to_string(offset) + "], rax");
}

void CodeGenerator::generateAssignStmt(const AssignStmt& stmt) {
    emitComment("assign " + stmt.target);

    generateExpression(*stmt.value);
    Variable* var = lookupLocal(stmt.target);
    if (var) {
        emit("mov [rbp-" + std::to_string(var->stackOffset) + "], rax");
    }
}

void CodeGenerator::generateExprStmt(const ExprStmt& stmt) {
    generateExpression(*stmt.expr);
}

void CodeGenerator::generateIfStmt(const IfStmt& stmt) {
    std::string elseLabel = newLabel(".Lelse");
    std::string endLabel = newLabel(".Lendif");

    emitComment("if");
    generateExpression(*stmt.condition);
    emit("test rax, rax");
    emit("jz " + elseLabel);

    enterScope();
    for (const auto& s : stmt.thenBranch) {
        generateStatement(*s);
    }
    exitScope();
    emit("jmp " + endLabel);

    emitLabel(elseLabel);
    if (!stmt.elseBranch.empty()) {
        enterScope();
        for (const auto& s : stmt.elseBranch) {
            generateStatement(*s);
        }
        exitScope();
    }

    emitLabel(endLabel);
}

void CodeGenerator::generateWhileStmt(const WhileStmt& stmt) {
    std::string startLabel = newLabel(".Lwhile");
    std::string endLabel = newLabel(".Lendwhile");

    int oldBreak = breakLabel_;
    int oldContinue = continueLabel_;
    breakLabel_ = labelCounter_;
    continueLabel_ = labelCounter_ - 1;

    emitLabel(startLabel);
    emitComment("while condition");
    generateExpression(*stmt.condition);
    emit("test rax, rax");
    emit("jz " + endLabel);

    enterScope();
    for (const auto& s : stmt.body) {
        generateStatement(*s);
    }
    exitScope();
    emit("jmp " + startLabel);

    emitLabel(endLabel);

    breakLabel_ = oldBreak;
    continueLabel_ = oldContinue;
}

void CodeGenerator::generateForStmt(const ForStmt& stmt) {
    std::string startLabel = newLabel(".Lfor");
    std::string updateLabel = newLabel(".Lforupd");
    std::string endLabel = newLabel(".Lendfor");

    int oldBreak = breakLabel_;
    int oldContinue = continueLabel_;
    breakLabel_ = labelCounter_;
    continueLabel_ = labelCounter_ - 1;

    enterScope();
    generateStatement(*stmt.init);

    emitLabel(startLabel);
    emitComment("for condition");
    generateExpression(*stmt.condition);
    emit("test rax, rax");
    emit("jz " + endLabel);

    for (const auto& s : stmt.body) {
        generateStatement(*s);
    }

    emitLabel(updateLabel);
    generateStatement(*stmt.update);
    emit("jmp " + startLabel);

    emitLabel(endLabel);
    exitScope();

    breakLabel_ = oldBreak;
    continueLabel_ = oldContinue;
}

void CodeGenerator::generateReturnStmt(const ReturnStmt& stmt) {
    emitComment("return");
    if (stmt.value) {
        generateExpression(*stmt.value);
    } else {
        emit("xor eax, eax");
    }
    generateFunctionEpilogue();
}

void CodeGenerator::generateFunctionStmt(const FunctionStmt& stmt) {
    currentFunction_ = stmt.name;
    inFunction_ = true;
    stackOffset_ = 0;

    std::string funcName = stmt.name;
    if (funcName != "main") {
        funcName = "_user_" + funcName;
    }

    output_ << funcName << ":\n";
    emit("push rbp");
    emit("mov rbp, rsp");
    emit("sub rsp, 128");

    enterScope();

    // Store parameters
#ifdef _WIN32
    const char* paramRegs[] = {"rcx", "rdx", "r8", "r9"};
#else
    const char* paramRegs[] = {"rdi", "rsi", "rdx", "rcx", "r8", "r9"};
#endif
    size_t numRegs = sizeof(paramRegs) / sizeof(paramRegs[0]);

    for (size_t i = 0; i < stmt.params.size() && i < numRegs; ++i) {
        int offset = declareLocal(stmt.params[i].name, stmt.params[i].type, false);
        emit("mov [rbp-" + std::to_string(offset) + "], " + paramRegs[i]);
    }

    for (const auto& s : stmt.body) {
        generateStatement(*s);
    }

    // Default return
    emit("xor eax, eax");
    emit("mov rsp, rbp");
    emit("pop rbp");
    emit("ret");

    exitScope();
    inFunction_ = false;
}

void CodeGenerator::generateExpression(const Expr& expr) {
    if (expr.is<LiteralExpr>()) {
        generateLiteral(expr.as<LiteralExpr>());
    } else if (expr.is<IdentifierExpr>()) {
        generateIdentifier(expr.as<IdentifierExpr>());
    } else if (expr.is<BinaryExpr>()) {
        generateBinary(expr.as<BinaryExpr>());
    } else if (expr.is<UnaryExpr>()) {
        generateUnary(expr.as<UnaryExpr>());
    } else if (expr.is<CallExpr>()) {
        generateCall(expr.as<CallExpr>());
    } else if (expr.is<MemberExpr>()) {
        generateMember(expr.as<MemberExpr>());
    }
}

void CodeGenerator::generateLiteral(const LiteralExpr& expr) {
    if (std::holds_alternative<int64_t>(expr.value)) {
        emit("mov rax, " + std::to_string(std::get<int64_t>(expr.value)));
    } else if (std::holds_alternative<double>(expr.value)) {
        double val = std::get<double>(expr.value);
        uint64_t bits;
        std::memcpy(&bits, &val, sizeof(bits));
        emit("mov rax, " + std::to_string(bits));
        emit("movq xmm0, rax");
    } else if (std::holds_alternative<bool>(expr.value)) {
        emit("mov rax, " + std::to_string(std::get<bool>(expr.value) ? 1 : 0));
    } else if (std::holds_alternative<std::string>(expr.value)) {
        std::string label = newStringLabel();
        stringLiterals_[label] = std::get<std::string>(expr.value);
        emit("lea rax, [" + label + "]");
    }
}

void CodeGenerator::generateIdentifier(const IdentifierExpr& expr) {
    Variable* var = lookupLocal(expr.name);
    if (var) {
        emit("mov rax, [rbp-" + std::to_string(var->stackOffset) + "]");
    } else {
        emit("xor eax, eax");
    }
}

void CodeGenerator::generateBinary(const BinaryExpr& expr) {
    const std::string& op = expr.op;

    // Short-circuit for && and ||
    if (op == "&&") {
        std::string falseLabel = newLabel(".Land_false");
        std::string endLabel = newLabel(".Land_end");

        generateExpression(*expr.left);
        emit("test rax, rax");
        emit("jz " + falseLabel);

        generateExpression(*expr.right);
        emit("test rax, rax");
        emit("jz " + falseLabel);

        emit("mov rax, 1");
        emit("jmp " + endLabel);

        emitLabel(falseLabel);
        emit("xor eax, eax");

        emitLabel(endLabel);
        return;
    }

    if (op == "||") {
        std::string trueLabel = newLabel(".Lor_true");
        std::string endLabel = newLabel(".Lor_end");

        generateExpression(*expr.left);
        emit("test rax, rax");
        emit("jnz " + trueLabel);

        generateExpression(*expr.right);
        emit("test rax, rax");
        emit("jnz " + trueLabel);

        emit("xor eax, eax");
        emit("jmp " + endLabel);

        emitLabel(trueLabel);
        emit("mov rax, 1");

        emitLabel(endLabel);
        return;
    }

    generateExpression(*expr.left);
    emit("push rax");
    generateExpression(*expr.right);
    emit("mov rcx, rax");
    emit("pop rax");

    if (op == "+") {
        emit("add rax, rcx");
    } else if (op == "-") {
        emit("sub rax, rcx");
    } else if (op == "*") {
        emit("imul rax, rcx");
    } else if (op == "/") {
        emit("cqo");
        emit("idiv rcx");
    } else if (op == "%") {
        emit("cqo");
        emit("idiv rcx");
        emit("mov rax, rdx");
    } else if (op == "==") {
        emit("cmp rax, rcx");
        emit("sete al");
        emit("movzx rax, al");
    } else if (op == "!=") {
        emit("cmp rax, rcx");
        emit("setne al");
        emit("movzx rax, al");
    } else if (op == "<") {
        emit("cmp rax, rcx");
        emit("setl al");
        emit("movzx rax, al");
    } else if (op == ">") {
        emit("cmp rax, rcx");
        emit("setg al");
        emit("movzx rax, al");
    } else if (op == "<=") {
        emit("cmp rax, rcx");
        emit("setle al");
        emit("movzx rax, al");
    } else if (op == ">=") {
        emit("cmp rax, rcx");
        emit("setge al");
        emit("movzx rax, al");
    }
}

void CodeGenerator::generateUnary(const UnaryExpr& expr) {
    generateExpression(*expr.operand);

    if (expr.op == "-") {
        emit("neg rax");
    } else if (expr.op == "!") {
        emit("test rax, rax");
        emit("setz al");
        emit("movzx rax, al");
    } else if (expr.op == "~") {
        emit("not rax");
    }
}

void CodeGenerator::generateCall(const CallExpr& expr) {
    // Check for print call (io.print pattern)
    if (expr.callee->is<MemberExpr>()) {
        const MemberExpr& mem = expr.callee->as<MemberExpr>();
        if (mem.property == "print" || mem.property == "println") {
            if (!expr.arguments.empty()) {
                generateExpression(*expr.arguments[0]);

                // Determine type and call appropriate print function
                const Expr& arg = *expr.arguments[0];
                if (arg.is<LiteralExpr>()) {
                    const LiteralExpr& lit = arg.as<LiteralExpr>();
                    if (lit.type.primitive == PrimitiveType::STRING) {
#ifdef _WIN32
                        emit("mov rcx, rax");
#else
                        emit("mov rdi, rax");
#endif
                        emit("call _print_str");
                    } else if (lit.type.primitive == PrimitiveType::FLOAT) {
                        emit("movq xmm0, rax");
                        emit("call _print_float");
                    } else if (lit.type.primitive == PrimitiveType::BOOL) {
#ifdef _WIN32
                        emit("mov ecx, eax");
#else
                        emit("mov edi, eax");
#endif
                        emit("call _print_bool");
                    } else {
#ifdef _WIN32
                        emit("mov rcx, rax");
#else
                        emit("mov rdi, rax");
#endif
                        emit("call _print_int");
                    }
                } else {
#ifdef _WIN32
                    emit("mov rcx, rax");
#else
                    emit("mov rdi, rax");
#endif
                    emit("call _print_int");
                }
            }
            emit("xor eax, eax");
            return;
        }
    }

    // Regular function call
    std::string funcName;
    if (expr.callee->is<IdentifierExpr>()) {
        funcName = "_user_" + expr.callee->as<IdentifierExpr>().name;
    }

#ifdef _WIN32
    const char* paramRegs[] = {"rcx", "rdx", "r8", "r9"};
#else
    const char* paramRegs[] = {"rdi", "rsi", "rdx", "rcx", "r8", "r9"};
#endif
    size_t numRegs = sizeof(paramRegs) / sizeof(paramRegs[0]);

    // Push arguments in reverse order for stack args
    for (size_t i = expr.arguments.size(); i > numRegs; --i) {
        generateExpression(*expr.arguments[i - 1]);
        emit("push rax");
    }

    // Load register arguments
    for (size_t i = 0; i < expr.arguments.size() && i < numRegs; ++i) {
        generateExpression(*expr.arguments[i]);
        emit("mov " + std::string(paramRegs[i]) + ", rax");
    }

    emit("call " + funcName);
}

void CodeGenerator::generateMember(const MemberExpr& expr) {
    generateExpression(*expr.object);
}

} // namespace strata
