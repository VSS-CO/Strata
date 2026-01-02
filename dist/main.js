"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const TYPE_REGISTRY = {
    "int": { kind: "primitive", primitive: "int" },
    "float": { kind: "primitive", primitive: "float" },
    "bool": { kind: "primitive", primitive: "bool" },
    "char": { kind: "primitive", primitive: "char" },
    "string": { kind: "primitive", primitive: "string" },
    "any": { kind: "primitive", primitive: "any" },
};
function parseTypeAnnotation(token) {
    if (token in TYPE_REGISTRY)
        return TYPE_REGISTRY[token];
    if (token.endsWith("?"))
        return { kind: "optional", innerType: parseTypeAnnotation(token.slice(0, -1)) || { kind: "primitive", primitive: "any" } };
    if (token in TYPE_REGISTRY)
        return TYPE_REGISTRY[token];
    return { kind: "primitive", primitive: "any" };
}
function typeCompatible(actual, expected) {
    var _a, _b;
    if (expected.primitive === "any" || actual.primitive === "any")
        return true;
    if (actual.kind === "primitive" && expected.kind === "primitive") {
        if (actual.primitive === expected.primitive)
            return true;
        // Allow numeric conversions: int → float
        if (actual.primitive === "int" && expected.primitive === "float")
            return true;
        // Allow char → string
        if (actual.primitive === "char" && expected.primitive === "string")
            return true;
        return false;
    }
    if (actual.kind === "union" && expected.kind === "union") {
        return (_b = (_a = actual.types) === null || _a === void 0 ? void 0 : _a.every(t => { var _a; return (_a = expected.types) === null || _a === void 0 ? void 0 : _a.some(e => typeCompatible(t, e)); })) !== null && _b !== void 0 ? _b : false;
    }
    return false;
}
class Lexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.lineStart = 0;
    }
    peek() {
        return this.input[this.pos];
    }
    advance() {
        const ch = this.input[this.pos++];
        if (ch === "\n") {
            this.line++;
            this.column = 1;
            this.lineStart = this.pos;
        }
        else {
            this.column++;
        }
        return ch;
    }
    getLocation() {
        return {
            line: this.line,
            column: this.column,
            source: this.input.substring(this.lineStart, this.pos),
        };
    }
    nextToken() {
        // Skip whitespace
        while (this.peek() === " " || this.peek() === "\n" || this.peek() === "\r" || this.peek() === "\t") {
            this.advance();
        }
        // Skip comments
        if (this.peek() === "/" && this.input[this.pos + 1] === "/") {
            while (this.peek() && this.peek() !== "\n")
                this.advance();
            return this.nextToken();
        }
        if (!this.peek())
            return null;
        const loc = this.getLocation();
        // Multi-character operators
        const twoCharOps = ["==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--"];
        const twoChar = this.input.substring(this.pos, this.pos + 2);
        if (twoCharOps.includes(twoChar)) {
            this.advance();
            this.advance();
            return { token: twoChar, location: loc };
        }
        // Identifiers / keywords
        if (/[a-zA-Z_]/.test(this.peek())) {
            let word = "";
            while (/[a-zA-Z0-9_]/.test(this.peek()))
                word += this.advance();
            return { token: word, location: loc };
        }
        // Strings
        if (this.peek() === '"') {
            this.advance();
            let value = "";
            while (this.peek() && this.peek() !== '"') {
                if (this.peek() === "\\") {
                    this.advance();
                    const next = this.advance();
                    value += next === "n" ? "\n" : next === "t" ? "\t" : next;
                }
                else {
                    value += this.advance();
                }
            }
            if (this.peek() === '"')
                this.advance();
            return { token: `"${value}"`, location: loc };
        }
        if (this.peek() === "'") {
            this.advance();
            let value = "";
            while (this.peek() && this.peek() !== "'")
                value += this.advance();
            if (this.peek() === "'")
                this.advance();
            return { token: `'${value}'`, location: loc };
        }
        // Numbers (including floats)
        if (/\d/.test(this.peek())) {
            let num = "";
            while (/\d/.test(this.peek()))
                num += this.advance();
            if (this.peek() === "." && /\d/.test(this.input[this.pos + 1])) {
                num += this.advance();
                while (/\d/.test(this.peek()))
                    num += this.advance();
            }
            return { token: num, location: loc };
        }
        // Single-char symbols
        const ch = this.advance();
        return { token: ch, location: loc };
    }
}
// Expression types
const ExprTypes = {
    Var: (name, loc) => ({ type: "Var", name, location: loc }),
    Number: (value, loc) => ({ type: "Number", value, location: loc }),
    String: (value, loc) => ({ type: "String", value, location: loc }),
    Bool: (value, loc) => ({ type: "Bool", value, location: loc }),
    Call: (module, func, args, loc) => ({ type: "Call", module, func, args, location: loc }),
    Binary: (op, left, right, loc) => ({ type: "Binary", op, left, right, location: loc }),
    Unary: (op, arg, loc) => ({ type: "Unary", op, arg, location: loc }),
    Match: (expr, arms, loc) => ({ type: "Match", expr, arms, location: loc }),
    Tuple: (elements, loc) => ({ type: "Tuple", elements, location: loc }),
};
// Statement types
const StmtTypes = {
    Import: (module, loc) => ({ type: "Import", module, location: loc }),
    Func: (name, params, returnType, body, loc) => ({ type: "Func", name, params, returnType, body, location: loc }),
    VarDecl: (name, varType, value, mutable, loc) => ({ type: "VarDecl", name, varType, value, mutable, location: loc }),
    If: (condition, thenBranch, elseBranch, loc) => ({ type: "If", condition, thenBranch, elseBranch, location: loc }),
    While: (condition, body, loc) => ({ type: "While", condition, body, location: loc }),
    For: (init, condition, update, body, loc) => ({ type: "For", init, condition, update, body, location: loc }),
    Match: (expr, arms, loc) => ({ type: "Match", expr, arms, location: loc }),
    Break: (loc) => ({ type: "Break", location: loc }),
    Continue: (loc) => ({ type: "Continue", location: loc }),
    Return: (value, loc) => ({ type: "Return", value, location: loc }),
    Print: (expr, loc) => ({ type: "Print", expr, location: loc }),
    ExprStmt: (expr, loc) => ({ type: "ExprStmt", expr, location: loc }),
};
// ============================================================================
// PARSER - Extended for new syntax
// ============================================================================
class Parser {
    constructor(lexer) {
        this.tokenIdx = 0;
        this.tokens = [];
        let result = lexer.nextToken();
        while (result) {
            this.tokens.push(result);
            result = lexer.nextToken();
        }
    }
    current() {
        return this.tokens[this.tokenIdx];
    }
    peek(offset = 1) {
        return this.tokens[this.tokenIdx + offset];
    }
    advance() {
        this.tokenIdx++;
    }
    expect(expected) {
        var _a;
        const current = this.current();
        if (!current || current.token !== expected) {
            throw this.error(`Expected '${expected}', got '${(_a = current === null || current === void 0 ? void 0 : current.token) !== null && _a !== void 0 ? _a : "EOF"}'`);
        }
        const loc = current.location;
        this.advance();
        return loc;
    }
    error(msg) {
        const current = this.current();
        const loc = current === null || current === void 0 ? void 0 : current.location;
        const lineInfo = loc ? ` at line ${loc.line}, column ${loc.column}` : "";
        return new Error(`Parse error${lineInfo}: ${msg}`);
    }
    match(...tokens) {
        const current = this.current();
        return current && tokens.includes(current.token);
    }
    isKeyword(word) {
        const keywords = [
            "import", "from", "func", "let", "const", "var", "if", "else",
            "while", "for", "match", "break", "continue", "return", "true", "false",
            "int", "float", "bool", "char", "string", "any", "error"
        ];
        return keywords.includes(word);
    }
    parseProgram() {
        const stmts = [];
        while (this.current()) {
            stmts.push(this.parseStmt());
        }
        return stmts;
    }
    parseStmt() {
        const current = this.current();
        if (!current)
            throw this.error("Unexpected EOF");
        const loc = current.location;
        // Import statement
        if (current.token === "import") {
            this.advance();
            const module = this.current().token;
            this.advance();
            if (this.match("from")) {
                this.advance();
                this.advance(); // skip package root
            }
            return StmtTypes.Import(module, loc);
        }
        // Function declaration
        if (current.token === "func") {
            this.advance();
            const name = this.current().token;
            this.advance();
            this.expect("(");
            const params = [];
            while (!this.match(")")) {
                const pname = this.current().token;
                this.advance();
                this.expect(":");
                const ptype = parseTypeAnnotation(this.current().token) || { kind: "primitive", primitive: "any" };
                this.advance();
                params.push({ name: pname, type: ptype });
                if (this.match(","))
                    this.advance();
            }
            this.expect(")");
            let returnType = { kind: "primitive", primitive: "any" };
            if (this.match("=>")) {
                this.advance();
                returnType = parseTypeAnnotation(this.current().token) || { kind: "primitive", primitive: "any" };
                this.advance();
            }
            this.expect("{");
            const body = [];
            while (!this.match("}")) {
                body.push(this.parseStmt());
            }
            this.expect("}");
            return StmtTypes.Func(name, params, returnType, body, loc);
        }
        // Variable declarations (let/const/var with types)
        if (this.match("let", "const", "var")) {
            const keyword = this.current().token;
            this.advance();
            const name = this.current().token;
            this.advance();
            let varType = { kind: "primitive", primitive: "any" };
            if (this.match(":")) {
                this.advance();
                varType = parseTypeAnnotation(this.current().token) || { kind: "primitive", primitive: "any" };
                this.advance();
            }
            let value = null;
            if (this.match("=")) {
                this.advance();
                value = this.parseExpr();
            }
            const mutable = keyword === "var";
            return StmtTypes.VarDecl(name, varType, value, mutable, loc);
        }
        // If statement
        if (current.token === "if") {
            this.advance();
            this.expect("(");
            const condition = this.parseExpr();
            this.expect(")");
            this.expect("{");
            const thenBranch = [];
            while (!this.match("}")) {
                thenBranch.push(this.parseStmt());
            }
            this.expect("}");
            let elseBranch = null;
            if (this.match("else")) {
                this.advance();
                if (this.match("{")) {
                    this.advance();
                    elseBranch = [];
                    while (!this.match("}")) {
                        elseBranch.push(this.parseStmt());
                    }
                    this.expect("}");
                }
                else {
                    elseBranch = [this.parseStmt()];
                }
            }
            return StmtTypes.If(condition, thenBranch, elseBranch, loc);
        }
        // While loop
        if (current.token === "while") {
            this.advance();
            this.expect("(");
            const condition = this.parseExpr();
            this.expect(")");
            this.expect("{");
            const body = [];
            while (!this.match("}")) {
                body.push(this.parseStmt());
            }
            this.expect("}");
            return StmtTypes.While(condition, body, loc);
        }
        // For loop (C-style or foreach)
        if (current.token === "for") {
            this.advance();
            this.expect("(");
            let init = null;
            if (!this.match(";")) {
                init = this.parseStmt();
            }
            if (this.match(";"))
                this.advance();
            let condition = null;
            if (!this.match(";")) {
                condition = this.parseExpr();
            }
            this.expect(";");
            let update = null;
            if (!this.match(")")) {
                update = this.parseStmt();
            }
            this.expect(")");
            this.expect("{");
            const body = [];
            while (!this.match("}")) {
                body.push(this.parseStmt());
            }
            this.expect("}");
            return StmtTypes.For(init, condition, update, body, loc);
        }
        // Match expression as statement
        if (current.token === "match") {
            return this.parseMatch();
        }
        // Break / Continue
        if (current.token === "break") {
            this.advance();
            return StmtTypes.Break(loc);
        }
        if (current.token === "continue") {
            this.advance();
            return StmtTypes.Continue(loc);
        }
        // Return
        if (current.token === "return") {
            this.advance();
            let value = null;
            if (!this.match("}") && !this.match(";")) {
                value = this.parseExpr();
            }
            return StmtTypes.Return(value, loc);
        }
        // Expression statement (includes function calls and print)
        const expr = this.parseExpr();
        return StmtTypes.ExprStmt(expr, loc);
    }
    parseMatch() {
        const loc = this.current().location;
        this.expect("match");
        this.expect("(");
        const expr = this.parseExpr();
        this.expect(")");
        this.expect("{");
        const arms = [];
        while (!this.match("}")) {
            const pattern = this.parseStmt();
            this.expect("=>");
            this.expect("{");
            const body = [];
            while (!this.match("}")) {
                body.push(this.parseStmt());
            }
            this.expect("}");
            arms.push({ pattern, body });
        }
        this.expect("}");
        return StmtTypes.Match(expr, arms, loc);
    }
    parseExpr() {
        return this.parseBinary();
    }
    parseArg() {
        // Parse argument expression - allows binary but stops at comma
        return this.parseBinary();
    }
    parseBinary(minPrec = 0) {
        let left = this.parseUnary();
        while (this.current()) {
            const current = this.current().token;
            const prec = this.precedence(current);
            if (prec < minPrec)
                break;
            const loc = this.current().location;
            this.advance();
            const right = this.parseBinary(prec + 1);
            left = ExprTypes.Binary(current, left, right, loc);
        }
        return left;
    }
    parseUnary() {
        const current = this.current();
        if (!current)
            throw this.error("Unexpected EOF");
        if (this.match("!", "-", "+", "~")) {
            const op = current.token;
            const loc = current.location;
            this.advance();
            const arg = this.parseUnary();
            return ExprTypes.Unary(op, arg, loc);
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        var _a;
        const current = this.current();
        if (!current)
            throw this.error("Unexpected EOF");
        const loc = current.location;
        // Parenthesized expression
        if (current.token === "(") {
            this.advance();
            const expr = this.parseExpr();
            this.expect(")");
            return expr;
        }
        // Check for identifier followed by dot (module.function pattern)
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(current.token) && ((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.token) === ".") {
            const module = current.token;
            this.advance();
            this.expect(".");
            const func = this.current().token;
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(func)) {
                throw this.error(`Expected function name after '.', got '${func}'`);
            }
            this.advance();
            this.expect("(");
            const args = [];
            while (!this.match(")")) {
                args.push(this.parseArg());
                if (this.match(","))
                    this.advance();
            }
            this.expect(")");
            return ExprTypes.Call(module, func, args, loc);
        }
        // Function call (old single-token format)
        const fn = current.token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (fn) {
            const [, module, func] = fn;
            this.advance();
            this.expect("(");
            const args = [];
            while (!this.match(")")) {
                args.push(this.parseArg());
                if (this.match(","))
                    this.advance();
            }
            this.expect(")");
            return ExprTypes.Call(module, func, args, loc);
        }
        // Boolean literals
        if (current.token === "true") {
            this.advance();
            return ExprTypes.Bool(true, loc);
        }
        if (current.token === "false") {
            this.advance();
            return ExprTypes.Bool(false, loc);
        }
        // String literals
        if (current.token.startsWith('"') || current.token.startsWith("'")) {
            const value = current.token.slice(1, -1);
            this.advance();
            return ExprTypes.String(value, loc);
        }
        // Numeric literals
        if (/^\d+(\.\d+)?$/.test(current.token)) {
            const value = parseFloat(current.token);
            this.advance();
            return ExprTypes.Number(value, loc);
        }
        // Variable or plain function call
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(current.token)) {
            const name = current.token;
            this.advance();
            // Check if followed by parenthesis (function call)
            if (this.match("(")) {
                this.advance();
                const args = [];
                while (!this.match(")")) {
                    args.push(this.parseArg());
                    if (this.match(","))
                        this.advance();
                }
                this.expect(")");
                // Plain function calls use empty module
                return ExprTypes.Call("", name, args, loc);
            }
            return ExprTypes.Var(name, loc);
        }
        throw this.error(`Unknown expression: ${current.token}`);
    }
    precedence(op) {
        var _a;
        const precedences = {
            "||": 1,
            "&&": 2,
            "==": 3, "!=": 3,
            "<": 4, ">": 4, "<=": 4, ">=": 4,
            "+": 5, "-": 5,
            "*": 6, "/": 6, "%": 6,
        };
        return (_a = precedences[op]) !== null && _a !== void 0 ? _a : -1;
    }
}
// ============================================================================
// TYPE CHECKER - Ensures type safety
// ============================================================================
class TypeChecker {
    constructor() {
        this.varTypes = new Map();
        this.funcTypes = new Map();
        this.errors = [];
    }
    check(stmts) {
        for (const stmt of stmts) {
            this.checkStmt(stmt);
        }
        return this.errors;
    }
    checkStmt(stmt) {
        var _a;
        switch (stmt.type) {
            case "VarDecl":
                if (stmt.value) {
                    const exprType = this.checkExpr(stmt.value);
                    if (!typeCompatible(exprType, stmt.varType)) {
                        this.errors.push(`Type mismatch at line ${(_a = stmt.location) === null || _a === void 0 ? void 0 : _a.line}: ` +
                            `cannot assign ${JSON.stringify(exprType)} to ${JSON.stringify(stmt.varType)}`);
                    }
                }
                this.varTypes.set(stmt.name, stmt.varType);
                break;
            case "If":
            case "While":
                this.checkExpr(stmt.condition);
                for (const s of stmt.thenBranch || [])
                    this.checkStmt(s);
                for (const s of stmt.elseBranch || [])
                    this.checkStmt(s);
                break;
            case "Func":
                const paramTypes = stmt.params.map((p) => p.type);
                this.funcTypes.set(stmt.name, { params: paramTypes, return: stmt.returnType });
                for (const s of stmt.body)
                    this.checkStmt(s);
                break;
            case "Match":
                this.checkExpr(stmt.expr);
                for (const arm of stmt.arms) {
                    this.checkStmt(arm.pattern);
                    for (const s of arm.body)
                        this.checkStmt(s);
                }
                break;
            case "ExprStmt":
                this.checkExpr(stmt.expr);
                break;
        }
    }
    checkExpr(expr) {
        switch (expr.type) {
            case "Number":
                return { kind: "primitive", primitive: "int" };
            case "String":
                return { kind: "primitive", primitive: "string" };
            case "Bool":
                return { kind: "primitive", primitive: "bool" };
            case "Var":
                return this.varTypes.get(expr.name) || { kind: "primitive", primitive: "any" };
            case "Binary": {
                const left = this.checkExpr(expr.left);
                const right = this.checkExpr(expr.right);
                // Comparison and logical operators return bool
                if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(expr.op)) {
                    return { kind: "primitive", primitive: "bool" };
                }
                // Arithmetic operators return the left type
                return left;
            }
            case "Call":
                // For now, assume calls return "any" (would need module signatures)
                return { kind: "primitive", primitive: "any" };
            case "Unary":
                if (expr.op === "!") {
                    return { kind: "primitive", primitive: "bool" };
                }
                return this.checkExpr(expr.arg);
            default:
                return { kind: "primitive", primitive: "any" };
        }
    }
}
// ============================================================================
// MODULES - Standard library
// ============================================================================
const MODULES = {
    "str.io": {
        print: (...args) => console.log(...args),
        println: (...args) => console.log(...args),
    },
    "str.math": {
        sqrt: Math.sqrt,
        pow: Math.pow,
        random: Math.random,
        abs: Math.abs,
        floor: Math.floor,
        ceil: Math.ceil,
    },
    "str.util": {
        randomInt: (max) => Math.floor(Math.random() * max),
    },
    "str.time": {
        now: () => Date.now(),
    },
    "str.lang": {},
    "str.net": {},
    "str.sql": {},
    "str.xml": {},
    "str.rmi": {},
    "str.security": {},
    "str.text": {
        toUpper: (s) => s.toUpperCase(),
        toLower: (s) => s.toLowerCase(),
        length: (s) => s.length,
    },
};
// ============================================================================
// INTERPRETER - Executes AST with proper state tracking
// ============================================================================
class Environment {
    constructor(parent = null) {
        this.vars = new Map();
        this.parent = parent;
    }
    define(name, value, mutable) {
        this.vars.set(name, { value, mutable });
    }
    get(name) {
        if (this.vars.has(name)) {
            return this.vars.get(name).value;
        }
        if (this.parent)
            return this.parent.get(name);
        throw new Error(`Undefined variable: ${name}`);
    }
    set(name, value) {
        if (this.vars.has(name)) {
            const entry = this.vars.get(name);
            if (!entry.mutable) {
                throw new Error(`Cannot reassign immutable variable: ${name}`);
            }
            entry.value = value;
            return;
        }
        if (this.parent) {
            this.parent.set(name, value);
            return;
        }
        throw new Error(`Undefined variable: ${name}`);
    }
}
class Interpreter {
    constructor() {
        this.modules = {};
        this.controlFlow = { type: null };
        this.env = new Environment();
    }
    run(stmts) {
        for (const stmt of stmts) {
            this.exec(stmt);
            if (this.controlFlow.type)
                break;
        }
    }
    exec(stmt) {
        if (this.controlFlow.type)
            return;
        switch (stmt.type) {
            case "Import":
                const moduleName = stmt.module.startsWith("str.") ? stmt.module : `str.${stmt.module}`;
                if (!MODULES[moduleName])
                    throw new Error(`Unknown module: ${moduleName}`);
                this.modules[stmt.module] = MODULES[moduleName];
                break;
            case "VarDecl":
                const value = stmt.value ? this.evalExpr(stmt.value) : null;
                this.env.define(stmt.name, value, stmt.mutable);
                break;
            case "If":
                if (this.isTruthy(this.evalExpr(stmt.condition))) {
                    for (const s of stmt.thenBranch)
                        this.exec(s);
                }
                else if (stmt.elseBranch) {
                    for (const s of stmt.elseBranch)
                        this.exec(s);
                }
                break;
            case "While":
                while (this.isTruthy(this.evalExpr(stmt.condition))) {
                    for (const s of stmt.body) {
                        this.exec(s);
                        if (this.controlFlow.type === "break") {
                            this.controlFlow.type = null;
                            return;
                        }
                        if (this.controlFlow.type === "continue") {
                            this.controlFlow.type = null;
                            break;
                        }
                        if (this.controlFlow.type === "return")
                            return;
                    }
                }
                break;
            case "For":
                if (stmt.init)
                    this.exec(stmt.init);
                while (!stmt.condition || this.isTruthy(this.evalExpr(stmt.condition))) {
                    for (const s of stmt.body) {
                        this.exec(s);
                        if (this.controlFlow.type === "break") {
                            this.controlFlow.type = null;
                            return;
                        }
                        if (this.controlFlow.type === "continue") {
                            this.controlFlow.type = null;
                            break;
                        }
                        if (this.controlFlow.type === "return")
                            return;
                    }
                    if (stmt.update)
                        this.exec(stmt.update);
                }
                break;
            case "Match": {
                const matchValue = this.evalExpr(stmt.expr);
                for (const arm of stmt.arms) {
                    if (this.patternMatch(arm.pattern, matchValue)) {
                        for (const s of arm.body)
                            this.exec(s);
                        break;
                    }
                }
                break;
            }
            case "Break":
                this.controlFlow = { type: "break" };
                break;
            case "Continue":
                this.controlFlow = { type: "continue" };
                break;
            case "Return":
                this.controlFlow = { type: "return", value: stmt.value ? this.evalExpr(stmt.value) : undefined };
                break;
            case "Print":
                console.log(this.evalExpr(stmt.expr));
                break;
            case "ExprStmt":
                this.evalExpr(stmt.expr);
                break;
            case "Func":
                // Functions are defined but not executed at statement level
                break;
        }
    }
    evalExpr(expr) {
        switch (expr.type) {
            case "Number":
                return expr.value;
            case "String":
                return expr.value;
            case "Bool":
                return expr.value;
            case "Var":
                return this.env.get(expr.name);
            case "Call":
                // Plain function call (user-defined)
                if (expr.module === "") {
                    // Check if it's a user-defined function - for now return undefined
                    // Functions would be stored in the environment
                    throw new Error(`User-defined functions not yet implemented: ${expr.func}`);
                }
                // Module function call
                const moduleName = expr.module.startsWith("str.") ? expr.module : `str.${expr.module}`;
                const mod = this.modules[expr.module] || MODULES[moduleName];
                if (!mod)
                    throw new Error(`Module not imported: ${expr.module}`);
                const fn = mod[expr.func];
                if (!fn)
                    throw new Error(`Function not found: ${expr.module}.${expr.func}`);
                const args = expr.args.map((a) => this.evalExpr(a));
                return fn(...args);
            case "Binary": {
                const l = this.evalExpr(expr.left);
                const r = this.evalExpr(expr.right);
                switch (expr.op) {
                    case "+": return l + r;
                    case "-": return l - r;
                    case "*": return l * r;
                    case "/": return l / r;
                    case "%": return l % r;
                    case "==": return l === r;
                    case "!=": return l !== r;
                    case "<": return l < r;
                    case ">": return l > r;
                    case "<=": return l <= r;
                    case ">=": return l >= r;
                    case "&&": return this.isTruthy(l) && this.isTruthy(r);
                    case "||": return this.isTruthy(l) || this.isTruthy(r);
                    default: throw new Error(`Unknown operator: ${expr.op}`);
                }
            }
            case "Unary": {
                const arg = this.evalExpr(expr.arg);
                switch (expr.op) {
                    case "-": return -arg;
                    case "+": return +arg;
                    case "!": return !this.isTruthy(arg);
                    case "~": return ~arg;
                    default: throw new Error(`Unknown unary operator: ${expr.op}`);
                }
            }
            case "Tuple":
                return expr.elements.map((e) => this.evalExpr(e));
            default:
                throw new Error(`Unknown expression type: ${expr.type}`);
        }
    }
    patternMatch(pattern, value) {
        // Simple pattern matching for now
        if (pattern.type === "VarDecl") {
            this.env.define(pattern.name, value, true);
            return true;
        }
        return false;
    }
    isTruthy(value) {
        return value !== null && value !== undefined && value !== false && value !== 0;
    }
}
// ============================================================================
// C CODE GENERATOR - Transpiles AST to C
// ============================================================================
class CGenerator {
    constructor() {
        this.lines = [];
        this.declaredVars = new Set();
        this.indent = 0;
    }
    generate(stmts) {
        this.lines.push(`#include <stdio.h>`);
        this.lines.push(`#include <math.h>`);
        this.lines.push(`#include <stdbool.h>`);
        this.lines.push(``);
        this.lines.push(`int main() {`);
        this.indent++;
        for (const stmt of stmts) {
            this.emitStmt(stmt);
        }
        this.indent--;
        this.lines.push(`  return 0;`);
        this.lines.push(`}`);
        return this.lines.join("\n");
    }
    emitStmt(stmt) {
        const ind = "  ".repeat(this.indent);
        switch (stmt.type) {
            case "VarDecl": {
                const typeStr = this.typeToC(stmt.varType);
                const init = stmt.value ? ` = ${this.emitExpr(stmt.value)}` : "";
                this.lines.push(`${ind}${typeStr} ${stmt.name}${init};`);
                this.declaredVars.add(stmt.name);
                break;
            }
            case "If": {
                const cond = this.emitExpr(stmt.condition);
                this.lines.push(`${ind}if (${cond}) {`);
                this.indent++;
                for (const s of stmt.thenBranch)
                    this.emitStmt(s);
                this.indent--;
                if (stmt.elseBranch) {
                    this.lines.push(`${ind}} else {`);
                    this.indent++;
                    for (const s of stmt.elseBranch)
                        this.emitStmt(s);
                    this.indent--;
                }
                this.lines.push(`${ind}}`);
                break;
            }
            case "While": {
                const cond = this.emitExpr(stmt.condition);
                this.lines.push(`${ind}while (${cond}) {`);
                this.indent++;
                for (const s of stmt.body)
                    this.emitStmt(s);
                this.indent--;
                this.lines.push(`${ind}}`);
                break;
            }
            case "For": {
                let init = "";
                if (stmt.init) {
                    if (stmt.init.type === "VarDecl") {
                        init = `${this.typeToC(stmt.init.varType)} ${stmt.init.name}${stmt.init.value ? ` = ${this.emitExpr(stmt.init.value)}` : ""}`;
                    }
                }
                const cond = stmt.condition ? this.emitExpr(stmt.condition) : "1";
                let update = "";
                if (stmt.update) {
                    if (stmt.update.type === "ExprStmt") {
                        update = this.emitExpr(stmt.update.expr);
                    }
                }
                this.lines.push(`${ind}for (${init}; ${cond}; ${update}) {`);
                this.indent++;
                for (const s of stmt.body)
                    this.emitStmt(s);
                this.indent--;
                this.lines.push(`${ind}}`);
                break;
            }
            case "Break":
                this.lines.push(`${ind}break;`);
                break;
            case "Continue":
                this.lines.push(`${ind}continue;`);
                break;
            case "Return": {
                if (stmt.value) {
                    this.lines.push(`${ind}return ${this.emitExpr(stmt.value)};`);
                }
                else {
                    this.lines.push(`${ind}return;`);
                }
                break;
            }
            case "Print": {
                const expr = stmt.expr;
                if (expr.type === "String") {
                    this.lines.push(`${ind}printf("%s\\n", "${expr.value}");`);
                }
                else {
                    this.lines.push(`${ind}printf("%d\\n", ${this.emitExpr(expr)});`);
                }
                break;
            }
            case "ExprStmt":
                this.lines.push(`${ind}${this.emitExpr(stmt.expr)};`);
                break;
        }
    }
    emitExpr(expr) {
        switch (expr.type) {
            case "Number":
                return expr.value.toString();
            case "String":
                return `"${expr.value}"`;
            case "Bool":
                return expr.value ? "true" : "false";
            case "Var":
                return expr.name;
            case "Binary":
                const l = this.emitExpr(expr.left);
                const r = this.emitExpr(expr.right);
                return `(${l} ${expr.op} ${r})`;
            case "Unary":
                const arg = this.emitExpr(expr.arg);
                return `${expr.op}${arg}`;
            case "Call":
                const args = expr.args.map((a) => this.emitExpr(a)).join(", ");
                if (expr.module === "math") {
                    return `${expr.func}(${args})`;
                }
                if (expr.module === "io" && expr.func === "print") {
                    return `printf("%d\\n", ${args})`;
                }
                return `0`;
            default:
                return "0";
        }
    }
    typeToC(type) {
        if (type.kind === "primitive") {
            switch (type.primitive) {
                case "int": return "int";
                case "float": return "float";
                case "bool": return "bool";
                case "char": return "char";
                case "string": return "char*";
                default: return "int";
            }
        }
        return "int";
    }
}
// ============================================================================
// MAIN ENTRY POINT
// ============================================================================
const file = process.argv[2] || "myprogram.str";
const source = fs.readFileSync(file, "utf-8");
try {
    const lexer = new Lexer(source);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();
    // Type check
    const checker = new TypeChecker();
    const typeErrors = checker.check(program);
    if (typeErrors.length > 0) {
        console.error("Type errors:");
        typeErrors.forEach(e => console.error(`  ${e}`));
        process.exit(1);
    }
    // Run interpreter
    const interpreter = new Interpreter();
    interpreter.run(program);
    // Generate C code
    const cgen = new CGenerator();
    const cCode = cgen.generate(program);
    fs.writeFileSync("out.c", cCode);
    console.log("✓ C code generated: out.c");
}
catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
}
