/*
 * STRATA ARCHITECTURE & MODULE SYSTEM SPECIFICATION (C# Implementation)
 * 
 * This file documents how the module system, package manager, and deterministic
 * builds are implemented in Strata's C# target.
 * 
 * ============================================================================
 * 1. IMPORT RESOLUTION IN C#
 * ============================================================================
 * 
 * Strata imports compile to C# namespaces and using declarations:
 * 
 * Strata source:
 *   import io from std::io
 *   import util from ./util
 *   import http from http::client
 *   
 *   io.print("hello")
 * 
 * Generated C# code:
 *   using Strata.StdIo;
 *   using Strata.Util;
 *   using Strata.Http.Client;
 *   
 *   class Program {
 *       static void Main() {
 *           Strata.StdIo.Print("hello");
 *       }
 *   }
 * 
 * ============================================================================
 * 2. NAMESPACE MAPPING
 * ============================================================================
 * 
 * Module naming convention:
 * 
 *   std::io         → Strata.StdIo
 *   std::math       → Strata.StdMath
 *   std::text       → Strata.StdText
 *   ./util          → Strata.Util
 *   ./handlers/auth → Strata.Handlers.Auth
 *   http::client    → Strata.Http.Client
 *   crypto::aes     → Strata.Crypto.Aes
 * 
 * Generated C# class (strata_std_io.cs):
 * 
 *   namespace Strata.StdIo {
 *       public static class StdIo {
 *           public static void Print(string msg) {
 *               Console.WriteLine(msg);
 *           }
 *           
 *           public static string Read() {
 *               return Console.ReadLine() ?? "";
 *           }
 *       }
 *   }
 * 
 * ============================================================================
 * 3. STANDARD LIBRARY DESIGN
 * ============================================================================
 * 
 * Strata stdlib as C# assemblies:
 * 
 * Strata.StdIo.dll
 *   - Strata.StdIo.Print(string)
 *   - Strata.StdIo.Read()
 * 
 * Strata.StdMath.dll
 *   - Strata.StdMath.Sqrt(double)
 *   - Strata.StdMath.Sin(double)
 *   - Strata.StdMath.Cos(double)
 *   - etc.
 * 
 * Strata.StdText.dll
 *   - Strata.StdText.Split(string, string)
 *   - Strata.StdText.Join(string[], string)
 *   - Strata.StdText.Trim(string)
 * 
 * These are built once and included in every Strata installation.
 * 
 * ============================================================================
 * 4. TYPE MAPPING TO C#
 * ============================================================================
 * 
 * Strata types → C# types:
 * 
 *   Strata int      → C# int (System.Int32)
 *   Strata float    → C# double (System.Double)
 *   Strata bool     → C# bool (System.Boolean)
 *   Strata char     → C# char (System.Char)
 *   Strata string   → C# string (System.String)
 *   Strata any      → C# object (System.Object)
 * 
 * Function signatures:
 * 
 *   Strata: func add(a: int, b: int) => int { return a + b }
 *   
 *   C#: public static int Add(int a, int b) {
 *       return a + b;
 *   }
 * 
 * Parameters with default values (future):
 * 
 *   Strata: func greet(name: string = "World")
 *   C#:     public static void Greet(string name = "World")
 * 
 * ============================================================================
 * 5. COMPILATION TO IL
 * ============================================================================
 * 
 * Build process:
 * 
 *   1. strata build --target csharp
 *   2. Generate .cs files from .str modules
 *   3. Compile .cs files to IL (Intermediate Language)
 *   4. Package into .dll (Dynamic Link Library)
 *   5. Link with stdlib assemblies
 *   6. Generate executable .exe
 * 
 * Compiler command:
 * 
 *   csc /out:myapp.exe \
 *       src_main.cs src_util.cs \
 *       /reference:Strata.StdIo.dll \
 *       /reference:Strata.StdMath.dll
 * 
 * ============================================================================
 * 6. DETERMINISTIC BUILD
 * ============================================================================
 * 
 * Compiler ensures reproducible IL output:
 * 
 * • Sorted file processing order
 * • No timestamps or metadata variations
 * • Consistent metadata tokens
 * • Deterministic hash of output assembly
 * 
 * Build flags for determinism:
 * 
 *   csc /deterministic \
 *       /sourcelink:strata.json \
 *       /out:myapp.exe ...
 * 
 * Binary identical across machines with same:
 *   - Compiler version
 *   - .NET runtime version
 *   - Source code
 *   - Stdlib version
 * 
 * ============================================================================
 * 7. PACKAGE MANAGEMENT
 * ============================================================================
 * 
 * Packages as NuGet-like assemblies (but simpler):
 * 
 * strata.toml:
 * 
 *   [project]
 *   name = "my-app"
 *   version = "1.0.0"
 *   
 *   [dependencies]
 *   http = "1.2.0"           # Resolves to Strata.Http.dll v1.2.0
 *   crypto = ">=2.0.0,<3.0"  # Version range
 * 
 * strata.lock:
 * 
 *   [[packages]]
 *   name = "http"
 *   version = "1.2.0"
 *   hash = "sha256:abc123..."
 *   source = "registry"
 *   assembly = "Strata.Http.dll"
 * 
 * During build:
 *   1. Resolve all packages to exact versions from strata.lock
 *   2. Download/cache assemblies in .strata/packages/
 *   3. Generate /reference flags for csc
 *   4. Link final executable
 * 
 * ============================================================================
 * 8. RUNTIME CONSIDERATIONS
 * ============================================================================
 * 
 * Generated C# is compatible with:
 * - .NET Framework 4.8+
 * - .NET 5.0+
 * - Mono (for cross-platform support)
 * 
 * No runtime-specific code (e.g., no unsafe pointers, no P/Invoke by default).
 * 
 * Exception handling:
 * 
 *   Type errors → compile-time, no try/catch at runtime
 *   Logic errors → return codes or result types
 *   System errors → caught and logged
 * 
 * ============================================================================
 * 9. ASSEMBLY VERSIONING
 * ============================================================================
 * 
 * Each generated assembly includes version info:
 * 
 *   // AssemblyVersion.cs (auto-generated)
 *   [assembly: System.Reflection.AssemblyVersion("1.0.0.0")]
 *   [assembly: System.Reflection.AssemblyFileVersion("1.0.0.0")]
 *   [assembly: System.Reflection.AssemblyInformationalVersion("1.0.0")]
 * 
 * Package versions in strata.lock match assembly versions exactly.
 * 
 * ============================================================================
 * 10. CROSS-PLATFORM OUTPUT
 * ============================================================================
 * 
 * C# target generates IL that runs on:
 *   - Windows (.NET Framework, .NET Core, .NET 5+)
 *   - Linux (.NET Core, .NET 5+)
 *   - macOS (.NET Core, .NET 5+)
 *   - Other platforms with Mono installed
 * 
 * Platform-specific code:
 * 
 *   #if WINDOWS || NET472_OR_GREATER
 *   // Windows-specific code
 *   #else
 *   // Cross-platform code
 *   #endif
 * 
 * Strata avoids platform-specific code in stdlib by design.
 * 
 * ============================================================================
 */

using System;
using System.Collections.Generic;

namespace Strata {
    // Standard Library: IO
    namespace StdIo {
        public static class StdIo {
            public static void Print(string msg) {
                Console.WriteLine(msg);
            }
            
            public static string Read() {
                return Console.ReadLine() ?? "";
            }
        }
    }
    
    // Standard Library: Math
    namespace StdMath {
        public static class StdMath {
            public static double Sqrt(double x) => Math.Sqrt(x);
            public static double Sin(double x) => Math.Sin(x);
            public static double Cos(double x) => Math.Cos(x);
            public static double Floor(double x) => Math.Floor(x);
            public static double Ceil(double x) => Math.Ceiling(x);
        }
    }
    
    // Standard Library: Text
    namespace StdText {
        public static class StdText {
            public static string[] Split(string str, string delimiter) {
                return str.Split(new[] { delimiter }, StringSplitOptions.None);
            }
            
            public static string Join(string[] arr, string separator) {
                return string.Join(separator, arr);
            }
            
            public static string Trim(string str) {
                return str.Trim();
            }
        }
    }
    
    // User code: Main
    namespace SrcMain {
        public class MainProgram {
            public static void Main() {
                // import io from std::io
                StdIo.StdIo.Print("Hello, World!");
                
                // import math from std::math
                double x = StdMath.StdMath.Sqrt(16.0);
                
                // import text from std::text
                string result = x.ToString();
                StdIo.StdIo.Print(result);
            }
        }
    }
}
