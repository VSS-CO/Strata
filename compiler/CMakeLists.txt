cmake_minimum_required(VERSION 3.16)
project(strata-compiler VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Werror -pedantic)
endif()

add_executable(stratac
    src/main.cpp
    src/lexer.cpp
    src/parser.cpp
    src/ast.cpp
    src/type_checker.cpp
    src/codegen.cpp
    src/compiler.cpp
)

target_include_directories(stratac PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)

install(TARGETS stratac DESTINATION bin)
