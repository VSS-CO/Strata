# Strata Programming Language

Strata is a modern, experimental programming language focused on clarity, portability, and understanding how programming languages work internally. It is built as a full end-to-end language project, from lexer to compiler, with multiple output targets.

## Goals
- Simple and readable syntax
- Easy experimentation with language design
- Learn how interpreters and compilers work
- Support multiple compilation targets

## Features
- Custom lexer and parser
- Interpreter for fast execution
- Multi-target compiler
  - C / C++
  - C#
  - Shell / Batch
- Command Line Interface (CLI)
- VS Code syntax highlighting
- Official website with documentation
- Online playground using Monaco Editor

## Project Structure (High Level)
- `lexer/` – Tokenization
- `parser/` – AST generation
- `interpreter/` – Direct execution
- `compiler/` – Target-specific code generation
- `cli/` – Command-line tools
- `vscode-extension/` – Syntax highlighting
- `website/` – Landing page, docs, playground

## Why Strata?
Strata is designed for learning, experimentation, and building a complete language ecosystem. It balances simplicity with real-world tooling and modern developer experience.

## Status
Strata is under active development. Syntax, features, and compilation targets may change.

## License
GNU GPL 2.0 

---
Strata is built layer by layer, from raw text to running code.
