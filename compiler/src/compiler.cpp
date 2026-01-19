#include "compiler.hpp"
#include "lexer.hpp"
#include "parser.hpp"
#include "type_checker.hpp"
#include "codegen.hpp"
#include <fstream>
#include <sstream>
#include <iostream>
#include <cstdlib>
#include <filesystem>

namespace strata {

Compiler::Compiler(const CompilerOptions& options)
    : options_(options) {
    if (options_.outputFile.empty()) {
        std::filesystem::path inputPath(options_.inputFile);
        options_.outputFile = inputPath.stem().string();
#ifdef _WIN32
        options_.outputFile += ".exe";
#endif
    }

    std::filesystem::path outPath(options_.outputFile);
    asmFile_ = outPath.stem().string() + ".asm";
    objFile_ = outPath.stem().string() + ".o";
}

bool Compiler::compile() {
    if (!readSource()) return false;
    if (!lexAndParse()) return false;
    if (!typeCheck()) return false;
    if (!generateCode()) return false;

    if (options_.emitAssembly) {
        std::cout << assembly_ << std::endl;
        return true;
    }

    if (!assemble()) return false;
    if (!link()) return false;

    // Cleanup intermediate files
    if (!options_.keepAssembly) {
        std::filesystem::remove(asmFile_);
    }
    std::filesystem::remove(objFile_);

    if (options_.verbose) {
        std::cout << "Compiled successfully: " << options_.outputFile << std::endl;
    }

    return true;
}

bool Compiler::readSource() {
    std::ifstream file(options_.inputFile);
    if (!file) {
        reportError("read", "Cannot open file: " + options_.inputFile);
        return false;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    source_ = buffer.str();

    if (options_.verbose) {
        std::cout << "Read " << source_.size() << " bytes from " << options_.inputFile << std::endl;
    }

    return true;
}

bool Compiler::lexAndParse() {
    try {
        Lexer lexer(source_, options_.inputFile);
        std::vector<Token> tokens = lexer.tokenize();

        for (const auto& token : tokens) {
            if (token.type == TokenType::ERROR) {
                reportError("lexer", token.value + " at line " +
                           std::to_string(token.location.line));
                return false;
            }
        }

        if (options_.verbose) {
            std::cout << "Tokenized: " << tokens.size() << " tokens" << std::endl;
        }

        Parser parser(tokens);
        auto statements = parser.parse();

        if (options_.verbose) {
            std::cout << "Parsed: " << statements.size() << " statements" << std::endl;
        }

        // Store statements for later phases
        // For now we'll re-parse in generateCode (simplified)

        return true;
    } catch (const ParseError& e) {
        reportError("parser", std::string(e.what()) + " at line " +
                   std::to_string(e.location().line));
        return false;
    }
}

bool Compiler::typeCheck() {
    try {
        Lexer lexer(source_, options_.inputFile);
        std::vector<Token> tokens = lexer.tokenize();
        Parser parser(tokens);
        auto statements = parser.parse();

        TypeChecker checker;
        checker.check(statements);

        if (options_.verbose) {
            std::cout << "Type checking passed" << std::endl;
        }

        return true;
    } catch (const TypeError& e) {
        reportError("type", std::string(e.what()) + " at line " +
                   std::to_string(e.location().line));
        return false;
    } catch (const ParseError& e) {
        reportError("parser", std::string(e.what()) + " at line " +
                   std::to_string(e.location().line));
        return false;
    }
}

bool Compiler::generateCode() {
    try {
        Lexer lexer(source_, options_.inputFile);
        std::vector<Token> tokens = lexer.tokenize();
        Parser parser(tokens);
        auto statements = parser.parse();

        CodeGenerator codegen;
        assembly_ = codegen.generate(statements);

        // Write assembly to file
        std::ofstream asmOut(asmFile_);
        if (!asmOut) {
            reportError("codegen", "Cannot write assembly file: " + asmFile_);
            return false;
        }
        asmOut << assembly_;
        asmOut.close();

        if (options_.verbose) {
            std::cout << "Generated assembly: " << asmFile_ << std::endl;
        }

        return true;
    } catch (const std::exception& e) {
        reportError("codegen", e.what());
        return false;
    }
}

bool Compiler::assemble() {
    std::string cmd;

#ifdef _WIN32
    // Try win64 first, fallback to win32
    cmd = "nasm -f win64 -o " + objFile_ + " " + asmFile_ + " 2>nul";
    int result = std::system(cmd.c_str());
    if (result != 0) {
        cmd = "nasm -f win32 -o " + objFile_ + " " + asmFile_;
        if (options_.verbose) {
            std::cout << "Assembling (win32 fallback): " << cmd << std::endl;
        }
        result = std::system(cmd.c_str());
    } else {
        if (options_.verbose) {
            std::cout << "Assembled with win64 format" << std::endl;
        }
        return true;
    }
#elif defined(__APPLE__)
    cmd = "nasm -f macho64 -o " + objFile_ + " " + asmFile_;
    if (options_.verbose) {
        std::cout << "Assembling: " << cmd << std::endl;
    }
    int result = std::system(cmd.c_str());
#else
    cmd = "nasm -f elf64 -o " + objFile_ + " " + asmFile_;
    if (options_.verbose) {
        std::cout << "Assembling: " << cmd << std::endl;
    }
    int result = std::system(cmd.c_str());
#endif

    if (result != 0) {
        reportError("assembler", "NASM failed with exit code " + std::to_string(result));
        return false;
    }

    return true;
}

bool Compiler::link() {
    std::string cmd;

#ifdef _WIN32
    cmd = "link /nologo /subsystem:console /entry:main /out:" +
          options_.outputFile + " " + objFile_ + " kernel32.lib msvcrt.lib legacy_stdio_definitions.lib";
#elif defined(__APPLE__)
    cmd = "ld -o " + options_.outputFile + " " + objFile_ +
          " -lSystem -L$(xcrun --show-sdk-path)/usr/lib -syslibroot $(xcrun --show-sdk-path)";
#else
    cmd = "ld -dynamic-linker /lib64/ld-linux-x86-64.so.2 -o " +
          options_.outputFile + " " + objFile_ + " -lc";
#endif

    if (options_.verbose) {
        std::cout << "Linking: " << cmd << std::endl;
    }

    int result = std::system(cmd.c_str());
    if (result != 0) {
        // Try gcc/clang as fallback
#ifdef _WIN32
        cmd = "gcc -o " + options_.outputFile + " " + objFile_;
#else
        cmd = "gcc -no-pie -o " + options_.outputFile + " " + objFile_;
#endif

        if (options_.verbose) {
            std::cout << "Trying fallback linker: " << cmd << std::endl;
        }

        result = std::system(cmd.c_str());
        if (result != 0) {
            reportError("linker", "Linking failed");
            return false;
        }
    }

    return true;
}

void Compiler::reportError(const std::string& phase, const std::string& message) {
    std::cerr << "Error [" << phase << "]: " << message << std::endl;
}

} // namespace strata
