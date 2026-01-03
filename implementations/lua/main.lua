--[[
 * STRATA ARCHITECTURE & MODULE SYSTEM SPECIFICATION (Lua Implementation)
 * 
 * This file documents how the module system, package manager, and deterministic
 * builds are implemented in Strata's Lua target.
 * 
 * ============================================================================
 * 1. IMPORT RESOLUTION IN LUA
 * ============================================================================
 * 
 * Strata imports compile to Lua require() calls:
 * 
 * Strata source:
 *   import io from std::io
 *   import util from ./util
 *   import http from http::client
 *   
 *   io.print("hello")
 * 
 * Generated Lua code:
 *   local std_io = require("strata.stdlib.io")
 *   local util = require("strata.util")
 *   local http_client = require("strata.http.client")
 *   
 *   std_io.print("hello")
 * 
 * ============================================================================
 * 2. MODULE MAPPING
 * ============================================================================
 * 
 * Strata module → Lua module:
 * 
 *   std::io              → strata/stdlib/io.lua
 *   std::math            → strata/stdlib/math.lua
 *   std::text            → strata/stdlib/text.lua
 *   ./util               → strata/util.lua (in same directory)
 *   ./handlers/auth      → strata/handlers/auth.lua
 *   http::client         → strata/http/client.lua
 *   crypto::aes          → strata/crypto/aes.lua
 * 
 * Lua module structure:
 * 
 *   strata/
 *   ├── init.lua                 # Package marker
 *   ├── stdlib/
 *   │  ├── io.lua                # Compiled from stdlib/io.str
 *   │  ├── math.lua
 *   │  └── text.lua
 *   ├── util.lua                 # User module
 *   └── http/
 *      └── client.lua            # Package module
 * 
 * ============================================================================
 * 3. STANDARD LIBRARY IMPLEMENTATION
 * ============================================================================
 * 
 * Generated io.lua:
 * 
 *   local io = {}
 *   
 *   function io.print(msg)
 *       print(msg)
 *   end
 *   
 *   function io.read()
 *       return io.read()  -- Lua built-in
 *   end
 *   
 *   return io
 * 
 * Generated math.lua:
 * 
 *   local math_module = {}
 *   local math = require("math")  -- Lua built-in
 *   
 *   function math_module.sqrt(x)
 *       return math.sqrt(x)
 *   end
 *   
 *   function math_module.sin(x)
 *       return math.sin(x)
 *   end
 *   
 *   -- ... more functions
 *   
 *   return math_module
 * 
 * Generated text.lua:
 * 
 *   local text = {}
 *   
 *   function text.split(str, delimiter)
 *       local result = {}
 *       for word in string.gmatch(str, "[^" .. delimiter .. "]+") do
 *           table.insert(result, word)
 *       end
 *       return result
 *   end
 *   
 *   function text.join(arr, separator)
 *       return table.concat(arr, separator)
 *   end
 *   
 *   return text
 * 
 * ============================================================================
 * 4. TYPE MAPPING TO LUA
 * ============================================================================
 * 
 * Strata types → Lua types:
 * 
 *   Strata int      → Lua number (integer)
 *   Strata float    → Lua number (float)
 *   Strata bool     → Lua boolean
 *   Strata char     → Lua string (single char)
 *   Strata string   → Lua string
 *   Strata any      → Lua any type
 * 
 * Function signatures:
 * 
 *   Strata: func add(a: int, b: int) => int { return a + b }
 *   
 *   Lua: function add(a, b)
 *       return a + b
 *   end
 * 
 * Type hints in comments (for documentation):
 * 
 *   -- @param a number
 *   -- @param b number
 *   -- @return number
 *   function add(a, b)
 *       return a + b
 *   end
 * 
 * ============================================================================
 * 5. LUA PACKAGE PATH
 * ============================================================================
 * 
 * Module search path setup:
 * 
 * Lua code generated at startup:
 * 
 *   package.path = package.path .. ";./strata/?.lua;./strata/?/init.lua"
 * 
 * This allows:
 *   require("strata.stdlib.io")  → loads strata/stdlib/io.lua
 *   require("strata.http")       → loads strata/http/init.lua
 * 
 * ============================================================================
 * 6. DETERMINISTIC BUILD
 * ============================================================================
 * 
 * Lua generation is deterministic:
 * 
 * • Files processed in sorted order
 * • No timestamps in generated code
 * • Consistent Lua syntax (no random formatting)
 * • Hash of output to verify reproducibility
 * 
 * Generated file header:
 * 
 *   -- Generated from: src/main.str (line 1)
 *   -- Strata version: 1.5.2
 *   -- Compiler: strata-lua
 * 
 * ============================================================================
 * 7. RUNTIME EXECUTION
 * ============================================================================
 * 
 * Execution options:
 * 
 * Interactive interpreter:
 * 
 *   strata run main.str
 *   # Generates main.lua, runs: lua main.lua
 * 
 * Lua JIT (LuaJIT):
 * 
 *   strata run --jit main.str
 *   # Runs: luajit main.lua
 * 
 * Command-line arguments:
 * 
 *   strata run main.str --arg1 value1
 *   # Passed to script as: arg[1], arg[2], ...
 * 
 * ============================================================================
 * 8. PACKAGE DISTRIBUTION
 * ============================================================================
 * 
 * Packages distributed as Lua rock files (.rock):
 * 
 * strata.toml:
 * 
 *   [project]
 *   name = "my-app"
 *   version = "1.0.0"
 *   
 *   [dependencies]
 *   http = "1.2.0"
 *   crypto = ">=2.0.0,<3.0"
 * 
 * Package resolution:
 * 
 *   1. strata lock resolves to exact versions
 *   2. Each package downloaded as .rock file
 *   3. Extracted to .strata/lua_modules/
 *   4. Package path updated to include modules
 * 
 * ============================================================================
 * 9. ERROR HANDLING
 * ============================================================================
 * 
 * Lua error handling (compile-time errors become runtime checks):
 * 
 * Strata with type mismatch:
 *   let x: int = "hello"  # Compile error
 * 
 * Generated Lua (with runtime assertion):
 *   local x = "hello"
 *   assert(type(x) == "number", "Type mismatch: expected int, got string")
 * 
 * Optional: remove assertions for performance:
 *   strata build --no-assertions
 * 
 * ============================================================================
 * 10. OPTIMIZATION OPTIONS
 * ============================================================================
 * 
 * Build with LuaJIT:
 * 
 *   strata build --target lua --jit
 *   # Generates Lua, compiles with luajit
 * 
 * Minification:
 * 
 *   strata build --target lua --minify
 *   # Removes comments, whitespace
 * 
 * Bytecode:
 * 
 *   strata build --target lua --bytecode
 *   # Generates .luac files instead of .lua
 * 
 * ============================================================================
--]]

-- Standard Library: IO

local io_module = {}

function io_module.print(msg)
    print(tostring(msg))
end

function io_module.read()
    return io.read()
end

-- Standard Library: Math

local math_module = {}
local math = require("math")

function math_module.sqrt(x)
    return math.sqrt(x)
end

function math_module.sin(x)
    return math.sin(x)
end

function math_module.cos(x)
    return math.cos(x)
end

function math_module.floor(x)
    return math.floor(x)
end

function math_module.ceil(x)
    return math.ceil(x)
end

-- Standard Library: Text

local text_module = {}
local string = require("string")

function text_module.split(str, delimiter)
    local result = {}
    for word in string.gmatch(str, "[^" .. delimiter .. "]+") do
        table.insert(result, word)
    end
    return result
end

function text_module.join(arr, separator)
    return table.concat(arr, separator)
end

function text_module.trim(str)
    return string.match(str, "^%s*(.-)%s*$")
end

-- User code: Main

local function main()
    -- import io from std::io
    io_module.print("Hello, World!")
    
    -- import math from std::math
    local x = math_module.sqrt(16.0)
    
    -- import text from std::text
    local result = tostring(x)
    io_module.print(result)
end

-- Run main
main()
