@echo off
REM Strata Build System - Windows Batch Script
REM Replaces npm scripts without npm dependency
REM Supports: build, test, lint, format, ci workflows

setlocal enabledelayedexpansion

if "%1"=="" goto help

REM Parse command and remaining arguments
set "cmd=%1"
shift

REM Dispatch to command handler
if "%cmd%"=="build" goto cmd_build
if "%cmd%"=="build:watch" goto cmd_build_watch
if "%cmd%"=="watch" goto cmd_build_watch
if "%cmd%"=="build:clean" goto cmd_build_clean
if "%cmd%"=="clean" goto cmd_clean
if "%cmd%"=="test" goto cmd_test
if "%cmd%"=="test:quick" goto cmd_test_quick
if "%cmd%"=="test:examples" goto cmd_test_examples
if "%cmd%"=="test:all" goto cmd_test_all
if "%cmd%"=="test:type-safety" goto cmd_test_type_safety
if "%cmd%"=="test:operators" goto cmd_test_operators
if "%cmd%"=="test:control-flow" goto cmd_test_control_flow
if "%cmd%"=="test:algorithms" goto cmd_test_algorithms
if "%cmd%"=="test:immutability" goto cmd_test_immutability
if "%cmd%"=="lint" goto cmd_lint
if "%cmd%"=="lint:fix" goto cmd_lint_fix
if "%cmd%"=="format" goto cmd_format
if "%cmd%"=="format:check" goto cmd_format_check
if "%cmd%"=="typecheck" goto cmd_typecheck
if "%cmd%"=="check" goto cmd_check
if "%cmd%"=="run" goto cmd_run
if "%cmd%"=="start" goto cmd_start
if "%cmd%"=="verify" goto cmd_verify
if "%cmd%"=="ci" goto cmd_ci
if "%cmd%"=="help" goto help
if "%cmd%"=="--help" goto help
if "%cmd%"=="-h" goto help
goto unknown_command

REM ============================================================================
REM BUILD TARGETS
REM ============================================================================

:cmd_build
echo Building...
call npx tsc
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_build_watch
echo Watching for changes...
call npx tsc --watch
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_build_clean
echo Cleaning and building...
if exist dist (
    rmdir /s /q dist
    if errorlevel 1 exit /b %errorlevel%
)
call npx tsc
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_clean
echo Cleaning artifacts...
if exist dist (
    rmdir /s /q dist
)
if exist out.c (
    del /q out.c
)
goto end

REM ============================================================================
REM TEST TARGETS
REM ============================================================================

:cmd_test_quick
echo Running quick test...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\01_basic_types.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test
:cmd_test_examples
echo Running example tests...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\01_basic_types.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\02_arithmetic.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\03_comparison.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\04_logical.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\05_unary.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\06_if_else.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\07_while_loop.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\08_for_loop.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\09_break_continue.str
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\10_functions.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test_type_safety
echo Running type safety tests...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\15_type_safety.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test_operators
echo Running operator precedence tests...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\19_operators_precedence.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test_control_flow
echo Running control flow tests...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\17_nested_control.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test_algorithms
echo Running algorithm tests...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\18_algorithms.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test_immutability
echo Running immutability tests...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js examples\16_immutability.str
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_test_all
echo Running all test suites...
call :cmd_test_examples
if errorlevel 1 exit /b %errorlevel%
call :cmd_test_type_safety
if errorlevel 1 exit /b %errorlevel%
call :cmd_test_operators
if errorlevel 1 exit /b %errorlevel%
call :cmd_test_control_flow
if errorlevel 1 exit /b %errorlevel%
goto end

REM ============================================================================
REM CODE QUALITY TARGETS
REM ============================================================================

:cmd_lint
echo Linting TypeScript/JavaScript...
call npx eslint . --ext .ts,.js
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_lint_fix
echo Auto-fixing lint issues...
call npx eslint . --ext .ts,.js --fix
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_format
echo Formatting code with Prettier...
call npx prettier --write src *.ts
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_format_check
echo Checking code format...
call npx prettier --check src *.ts
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_typecheck
echo Type checking...
call npx tsc --noEmit
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_check
echo Running checks (typecheck + lint)...
call :cmd_typecheck
if errorlevel 1 exit /b %errorlevel%
call :cmd_lint
if errorlevel 1 exit /b %errorlevel%
goto end

REM ============================================================================
REM RUN/START TARGETS
REM ============================================================================

:cmd_run
echo Building and running...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call node dist\main.js %*
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_start
echo Starting interpreter...
call node dist\main.js %*
if errorlevel 1 exit /b %errorlevel%
goto end

REM ============================================================================
REM CI/VERIFICATION TARGETS
REM ============================================================================

:cmd_verify
echo Verifying build...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call :cmd_test_quick
if errorlevel 1 exit /b %errorlevel%
goto end

:cmd_ci
echo Running CI pipeline (build + test + lint + typecheck)...
call :subroutine_build
if errorlevel 1 exit /b %errorlevel%
call :cmd_test_quick
if errorlevel 1 exit /b %errorlevel%
call :cmd_lint
if errorlevel 1 exit /b %errorlevel%
call :cmd_typecheck
if errorlevel 1 exit /b %errorlevel%
goto end

REM ============================================================================
REM SUBROUTINES (called via :subroutine_* labels)
REM ============================================================================

:subroutine_build
echo Building...
call npx tsc
exit /b %errorlevel%

REM ============================================================================
REM HELP
REM ============================================================================

:help
echo Strata Build System
echo.
echo Usage: build.bat ^<command^> [args]
echo.
echo Build commands:
echo   build              Compile TypeScript to JavaScript
echo   build:watch        Watch mode - auto-compile on changes
echo   build:clean        Clean dist\ and rebuild
echo   clean              Remove all build artifacts ^(dist\, out.c^)
echo.
echo Test commands:
echo   test               Run all example tests
echo   test:quick         Run single quick test ^(01_basic_types.str^)
echo   test:all           Run all test suites
echo   test:examples      Run example tests ^(10 files^)
echo   test:type-safety   Run type safety tests
echo   test:operators     Run operator precedence tests
echo   test:control-flow  Run control flow tests
echo   test:algorithms    Run algorithm tests
echo   test:immutability  Run immutability tests
echo.
echo Code quality:
echo   lint               Run ESLint on .ts and .js files
echo   lint:fix           Auto-fix ESLint issues
echo   format             Format code with Prettier
echo   format:check       Check if code needs formatting
echo   typecheck          Type check without emitting
echo   check              Run typecheck and lint
echo.
echo Run/Start:
echo   run [file]         Build and run file
echo   start [file]       Run file directly
echo.
echo Verification:
echo   verify             Build and run quick test ^(pre-commit check^)
echo   ci                 Full CI pipeline ^(build + test + lint + typecheck^)
echo   help               Show this help message
echo.
echo Examples:
echo   build.bat build
echo   build.bat test:quick
echo   build.bat run examples\01_basic_types.str
echo   build.bat ci
echo.
goto end

:unknown_command
echo Error: Unknown command '%cmd%'
echo Run 'build.bat help' for usage information
exit /b 1

:end
endlocal
