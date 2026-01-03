/*
 * STRATA ARCHITECTURE & MODULE SYSTEM SPECIFICATION (C Implementation)
 * 
 * This file documents how the module system, package manager, and deterministic
 * builds are implemented in Strata's C target.
 * 
 * ============================================================================
 * 1. IMPORT RESOLUTION IN C
 * ============================================================================
 * 
 * When Strata source imports a module, the C generator produces:
 * 
 * Strata source:
 *   import io from std::io
 *   import util from ./util
 *   import http from http::client
 * 
 * Generated C code:
 *   #include "strata_std_io.h"        // stdlib module
 *   #include "strata_util.h"           // relative import
 *   #include "strata_http_client.h"    // package module
 * 
 * Header files are auto-generated from .str modules and contain:
 *   - Function declarations
 *   - Type definitions
 *   - Module namespace structure
 * 
 * ============================================================================
 * 2. MODULE NAMESPACE MAPPING
 * ============================================================================
 * 
 * Module imports become struct fields in C:
 * 
 * Strata:
 *   import io from std::io
 *   io.print("hello")
 * 
 * C:
 *   typedef struct {
 *       void (*print)(const char*);
 *   } StdIoModule;
 *   
 *   extern StdIoModule std_io;
 *   std_io.print("hello");
 * 
 * Package modules:
 * 
 *   import http from http::client
 *   http.listen(8080)
 * 
 * C:
 *   typedef struct {
 *       int (*listen)(int);
 *   } HttpClientModule;
 *   
 *   extern HttpClientModule http_client;
 *   http_client.listen(8080);
 * 
 * ============================================================================
 * 3. STANDARD LIBRARY ORGANIZATION
 * ============================================================================
 * 
 * stdlib/ directory structure:
 * 
 *   stdlib/
 *   ├── io/
 *   │  ├── io.str                 → io.c + io.h
 *   │  └── _internal.str           → io_internal.c (private)
 *   ├── math/
 *   │  └── math.str                → math.c + math.h
 *   ├── text/
 *   │  └── text.str                → text.c + text.h
 *   └── manifest.toml              # Metadata
 * 
 * Generated header (strata_std_io.h):
 * 
 *   #ifndef STRATA_STD_IO_H
 *   #define STRATA_STD_IO_H
 *   
 *   typedef struct {
 *       void (*print)(const char* msg);
 *       char* (*read)();
 *   } StdIoModule;
 *   
 *   extern StdIoModule std_io;
 *   
 *   #endif
 * 
 * Generated implementation (strata_std_io.c):
 * 
 *   #include <stdio.h>
 *   #include "strata_std_io.h"
 *   
 *   static void strata_std_io_print(const char* msg) {
 *       printf("%s\n", msg);
 *   }
 *   
 *   static char* strata_std_io_read() {
 *       // implementation
 *   }
 *   
 *   StdIoModule std_io = {
 *       .print = strata_std_io_print,
 *       .read = strata_std_io_read,
 *   };
 * 
 * ============================================================================
 * 4. PACKAGE INTEGRATION
 * ============================================================================
 * 
 * Packages are compiled into .a (static library) or .o (object) files.
 * 
 * Build process:
 * 
 *   1. strata build --target c
 *   2. For each package in .strata/packages/:
 *      - Compile .str files to .c/.h
 *      - Create strata_<package>.a
 *   3. Link all .o files and archives into final binary
 * 
 * Linker command example:
 * 
 *   gcc \
 *     -o myapp \
 *     myapp.c \
 *     strata_std_io.o strata_std_math.o \
 *     -L.strata/lib -lhttp -lcrypto \
 *     -lm  # Link math library
 * 
 * ============================================================================
 * 5. DETERMINISTIC C GENERATION
 * ============================================================================
 * 
 * The C generator ensures deterministic output:
 * 
 * • Files processed in sorted order (not filesystem order)
 * • No timestamps in generated code
 * • No non-deterministic sorting of declarations
 * • Function order determined by dependency graph
 * • Type definitions output in consistent order
 * • Comments include source location (for debugging)
 * 
 * Example output:
 * 
 *   // Generated from: src/main.str (line 1)
 *   // Strata version: 1.5.2
 *   // Compiler: strata-c
 *   
 *   #include "strata_std_io.h"
 *   
 *   // Module: src_main
 *   
 *   int main() {
 *       // compiled code
 *   }
 * 
 * ============================================================================
 * 6. NAME MANGLING FOR AVOIDING COLLISIONS
 * ============================================================================
 * 
 * Global symbols in C are flattened. Strata uses name mangling:
 * 
 * Strata:
 *   # src/util.str
 *   func add(a: int, b: int) => int { ... }
 *   
 *   # src/handlers/util.str
 *   func add(a: int, b: int) => int { ... }
 * 
 * C (mangled):
 *   // src/util.str
 *   int src_util_add(int a, int b) { ... }
 *   
 *   // src/handlers/util.str
 *   int src_handlers_util_add(int a, int b) { ... }
 * 
 * Module globals also mangled:
 *   static int src_util_counter = 0;
 *   static int src_handlers_util_counter = 0;
 * 
 * Package functions:
 *   # http package, client module
 *   func listen(port: int) => int { ... }
 * 
 * C:
 *   int http_client_listen(int port) { ... }
 * 
 * ============================================================================
 * 7. CACHING & INCREMENTAL BUILDS
 * ============================================================================
 * 
 * Incremental build support:
 * 
 * Build cache stored in:
 *   <project_root>/.strata/cache/
 *   ├── <source_hash>.c          # Generated C file
 *   ├── <source_hash>.o          # Compiled object
 *   └── manifest.json            # Hash -> source mapping
 * 
 * When building:
 *   1. Hash each .str file
 *   2. Check if hash in cache
 *   3. If found and hash matches, use cached .o
 *   4. If not found, compile to C, compile C to object, cache it
 *   5. Link final binary from all .o files
 * 
 * This allows rebuilds to skip re-compilation of unchanged modules.
 * 
 * ============================================================================
 * 8. C DIALECT AND COMPATIBILITY
 * ============================================================================
 * 
 * Generated C code targets:
 * - C99 (minimum standard)
 * - POSIX-compatible systems (with Windows support via shims)
 * - No C++ features (pure C)
 * - No inline assembly (except for platform-specific functions)
 * 
 * Compiler flags:
 *   gcc -std=c99 -Wall -Wextra -O2 ...
 * 
 * Cross-platform code:
 * 
 *   #ifdef _WIN32
 *   #include <windows.h>
 *   #else
 *   #include <unistd.h>
 *   #endif
 * 
 * ============================================================================
 * 9. EXAMPLE COMPILATION FLOW
 * ============================================================================
 * 
 * Input: my-app project with strata.lock
 * 
 * $ strata build --target c
 * 
 * Process:
 * 1. Read strata.toml and strata.lock
 * 2. Load stdlib (std::*)
 * 3. Load packages from .strata/packages/
 * 4. Parse all .str files (in deterministic order)
 * 5. Type-check all modules
 * 6. Generate C headers and implementations
 * 7. Compile C to object files
 * 8. Link into executable: my-app (or my-app.exe on Windows)
 * 
 * Output:
 *   dist/
 *   ├── my-app                    # Executable
 *   ├── my-app.c                  # Generated C source
 *   └── .build/
 *      ├── src_main.o
 *      ├── src_util.o
 *      ├── http_client.o
 *      └── crypto_aes.o
 * 
 * ============================================================================
 * 10. LINKING WITH NATIVE LIBRARIES
 * ============================================================================
 * 
 * Some stdlib modules may wrap native C libraries:
 * 
 * std::math → links -lm
 * std::io → links system I/O
 * 
 * In strata.toml:
 *   [build.c]
 *   libs = ["m"]          # Link against libm
 *   include_dirs = ["/usr/include/openssl"]
 *   lib_dirs = ["/usr/lib"]
 * 
 * Generated Makefile or build script respects these.
 * 
 * ============================================================================
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Strata C Runtime Library

typedef struct {
    void (*print)(const char* msg);
    char* (*read)(void);
} StdIoModule;

typedef struct {
    double (*sqrt)(double x);
    double (*sin)(double x);
    double (*cos)(double x);
    double (*floor)(double x);
    double (*ceil)(double x);
} StdMathModule;

// Module implementations

static void strata_std_io_print(const char* msg) {
    printf("%s\n", msg);
}

static char* strata_std_io_read(void) {
    char buffer[256];
    if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
        return strdup(buffer);
    }
    return "";
}

StdIoModule std_io = {
    .print = strata_std_io_print,
    .read = strata_std_io_read,
};

#include <math.h>

StdMathModule std_math = {
    .sqrt = sqrt,
    .sin = sin,
    .cos = cos,
    .floor = floor,
    .ceil = ceil,
};

// Example generated code from strata program

int main(void) {
    // import io from std::io
    // io.print("Hello, World!")
    
    std_io.print("Hello, World!");
    
    // import math from std::math
    // let x: float = math.sqrt(16.0)
    
    double x = std_math.sqrt(16.0);
    
    char buffer[50];
    snprintf(buffer, sizeof(buffer), "%f", x);
    std_io.print(buffer);
    
    return 0;
}
