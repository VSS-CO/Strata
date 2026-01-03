#!/bin/sh
# Strata Build System - POSIX Shell Script
# Replaces npm scripts without npm dependency
# Supports: build, test, lint, format, ci workflows

set -e  # Exit immediately on error

# ============================================================================
# BUILD TARGETS
# ============================================================================

build() {
    echo "Building..."
    npx tsc
}

build_watch() {
    echo "Watching for changes..."
    npx tsc --watch
}

build_clean() {
    echo "Cleaning and building..."
    rm -rf dist/
    npx tsc
}

clean() {
    echo "Cleaning artifacts..."
    rm -rf dist/ out.c
}

# ============================================================================
# TEST TARGETS
# ============================================================================

test_quick() {
    echo "Running quick test..."
    build
    node dist/main.js examples/01_basic_types.str
}

test_examples() {
    echo "Running example tests..."
    build
    node dist/main.js examples/01_basic_types.str
    node dist/main.js examples/02_arithmetic.str
    node dist/main.js examples/03_comparison.str
    node dist/main.js examples/04_logical.str
    node dist/main.js examples/05_unary.str
    node dist/main.js examples/06_if_else.str
    node dist/main.js examples/07_while_loop.str
    node dist/main.js examples/08_for_loop.str
    node dist/main.js examples/09_break_continue.str
    node dist/main.js examples/10_functions.str
}

test_type_safety() {
    echo "Running type safety tests..."
    build
    node dist/main.js examples/15_type_safety.str
}

test_operators() {
    echo "Running operator precedence tests..."
    build
    node dist/main.js examples/19_operators_precedence.str
}

test_control_flow() {
    echo "Running control flow tests..."
    build
    node dist/main.js examples/17_nested_control.str
}

test_algorithms() {
    echo "Running algorithm tests..."
    build
    node dist/main.js examples/18_algorithms.str
}

test_immutability() {
    echo "Running immutability tests..."
    build
    node dist/main.js examples/16_immutability.str
}

test_all() {
    echo "Running all test suites..."
    test_examples
    test_type_safety
    test_operators
    test_control_flow
}

# ============================================================================
# CODE QUALITY TARGETS
# ============================================================================

lint() {
    echo "Linting TypeScript/JavaScript..."
    npx eslint . --ext .ts,.js
}

lint_fix() {
    echo "Auto-fixing lint issues..."
    npx eslint . --ext .ts,.js --fix
}

format() {
    echo "Formatting code with Prettier..."
    npx prettier --write src/ *.ts
}

format_check() {
    echo "Checking code format..."
    npx prettier --check src/ *.ts
}

typecheck() {
    echo "Type checking..."
    npx tsc --noEmit
}

check() {
    echo "Running checks (typecheck + lint)..."
    typecheck
    lint
}

# ============================================================================
# RUN/START TARGETS
# ============================================================================

run() {
    echo "Building and running..."
    build
    node dist/main.js "$@"
}

start() {
    echo "Starting interpreter..."
    node dist/main.js "$@"
}

# ============================================================================
# CI/VERIFICATION TARGETS
# ============================================================================

verify() {
    echo "Verifying build..."
    build
    test_quick
}

ci() {
    echo "Running CI pipeline (build + test + lint + typecheck)..."
    build
    test_quick
    lint
    typecheck
}

# ============================================================================
# HELP
# ============================================================================

show_help() {
    cat << 'EOF'
Strata Build System

Usage: ./build.sh <command> [args]

Build commands:
  build              Compile TypeScript to JavaScript
  build:watch        Watch mode - auto-compile on changes
  build:clean        Clean dist/ and rebuild
  clean              Remove all build artifacts (dist/, out.c)

Test commands:
  test               Run all example tests
  test:quick         Run single quick test (01_basic_types.str)
  test:all           Run all test suites (examples + type-safety + operators + control-flow)
  test:examples      Run example tests (10 files)
  test:type-safety   Run type safety tests
  test:operators     Run operator precedence tests
  test:control-flow  Run control flow tests
  test:algorithms    Run algorithm tests
  test:immutability  Run immutability tests

Code quality:
  lint               Run ESLint on .ts and .js files
  lint:fix           Auto-fix ESLint issues
  format             Format code with Prettier
  format:check       Check if code needs formatting
  typecheck          Type check without emitting
  check              Run typecheck and lint

Run/Start:
  run [file]         Build and run file (or prompt if no file)
  start [file]       Run file directly

Verification:
  verify             Build and run quick test (pre-commit check)
  ci                 Full CI pipeline (build + test + lint + typecheck)
  help               Show this help message

Examples:
  ./build.sh build
  ./build.sh test:quick
  ./build.sh run examples/01_basic_types.str
  ./build.sh ci
EOF
}

# ============================================================================
# COMMAND DISPATCHER
# ============================================================================

cmd="${1:-help}"
shift || true

case "$cmd" in
    build)              build ;;
    build:watch|watch)  build_watch ;;
    build:clean)        build_clean ;;
    clean)              clean ;;
    test)               test_examples ;;
    test:quick)         test_quick ;;
    test:examples)      test_examples ;;
    test:all)           test_all ;;
    test:type-safety)   test_type_safety ;;
    test:operators)     test_operators ;;
    test:control-flow)  test_control_flow ;;
    test:algorithms)    test_algorithms ;;
    test:immutability)  test_immutability ;;
    lint)               lint ;;
    lint:fix)           lint_fix ;;
    format)             format ;;
    format:check)       format_check ;;
    typecheck)          typecheck ;;
    check)              check ;;
    run)                run "$@" ;;
    start)              start "$@" ;;
    verify)             verify ;;
    ci)                 ci ;;
    help|--help|-h)     show_help ;;
    *)
        echo "Error: Unknown command '$cmd'"
        echo "Run './build.sh help' for usage information"
        exit 1
        ;;
esac
