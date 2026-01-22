#include "compiler.hpp"
#include <iostream>
#include <string>
#include <cstring>

void printUsage(const char* progName) {
    std::cout << "Strata Compiler v1.0.0\n\n";
    std::cout << "Usage: " << progName << " [options] <input.str>\n\n";
    std::cout << "Options:\n";
    std::cout << "  -o <file>     Output file (default: <input> without extension)\n";
    std::cout << "  -S            Output assembly only (to stdout)\n";
    std::cout << "  -k, --keep    Keep intermediate assembly file\n";
    std::cout << "  -v, --verbose Verbose output\n";
    std::cout << "  -h, --help    Show this help message\n";
    std::cout << "\n";
    std::cout << "Examples:\n";
    std::cout << "  " << progName << " hello.str              # Compile to 'hello' executable\n";
    std::cout << "  " << progName << " -o app hello.str       # Compile to 'app' executable\n";
    std::cout << "  " << progName << " -S hello.str           # Output assembly to stdout\n";
    std::cout << "  " << progName << " -k hello.str           # Keep hello.asm after compile\n";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printUsage(argv[0]);
        return 1;
    }

    strata::CompilerOptions options;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "-h" || arg == "--help") {
            printUsage(argv[0]);
            return 0;
        } else if (arg == "-v" || arg == "--verbose") {
            options.verbose = true;
        } else if (arg == "-S") {
            options.emitAssembly = true;
        } else if (arg == "-k" || arg == "--keep") {
            options.keepAssembly = true;
        } else if (arg == "-o") {
            if (i + 1 < argc) {
                options.outputFile = argv[++i];
            } else {
                std::cerr << "Error: -o requires an argument\n";
                return 1;
            }
        } else if (arg[0] == '-') {
            std::cerr << "Error: Unknown option: " << arg << "\n";
            return 1;
        } else {
            if (options.inputFile.empty()) {
                options.inputFile = arg;
            } else {
                std::cerr << "Error: Multiple input files not supported\n";
                return 1;
            }
        }
    }

    if (options.inputFile.empty()) {
        std::cerr << "Error: No input file specified\n";
        return 1;
    }

    strata::Compiler compiler(options);
    if (!compiler.compile()) {
        return 1;
    }

    return 0;
}
