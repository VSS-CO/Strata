#pragma once
#include <string>

namespace strata {

struct CompilerOptions {
    std::string inputFile;
    std::string outputFile;
    bool emitAssembly = false;
    bool verbose = false;
    bool keepAssembly = false;
};

class Compiler {
public:
    explicit Compiler(const CompilerOptions& options);

    bool compile();

private:
    bool readSource();
    bool lexAndParse();
    bool typeCheck();
    bool generateCode();
    bool assemble();
    bool link();

    void reportError(const std::string& phase, const std::string& message);

    CompilerOptions options_;
    std::string source_;
    std::string assembly_;
    std::string asmFile_;
    std::string objFile_;
};

} // namespace strata
