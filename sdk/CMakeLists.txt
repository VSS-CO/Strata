cmake_minimum_required(VERSION 3.15)
project(strata-sdk-native)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Native compiler library
add_library(strata_compiler_native native/compiler.cc)
target_include_directories(strata_compiler_native PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# Node.js native addon
find_package(Node.js REQUIRED)
add_library(strata_compiler_addon SHARED native/binding.cc)
target_include_directories(strata_compiler_addon PUBLIC ${Node.js_INCLUDE_DIRS})
target_link_libraries(strata_compiler_addon ${Node.js_LIBRARIES} strata_compiler_native)

# WebAssembly compilation (using Emscripten)
if(EMSCRIPTEN)
  add_library(strata_compiler_wasm native/compiler.cc)
  target_compile_options(strata_compiler_wasm PRIVATE
    -O3
    -s WASM=1
    -s EXPORTED_FUNCTIONS='["_compileStrata", "_malloc", "_free"]'
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]'
  )
  set_target_properties(strata_compiler_wasm PROPERTIES SUFFIX ".js")
endif()
