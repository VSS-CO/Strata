"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
// ---------- MODULES ----------
const MODULES = {
    "str.io": { print: (...args) => console.log(...args) },
    "str.math": { sqrt: Math.sqrt, pow: Math.pow, random: Math.random },
    "str.util": { randomInt: (max) => Math.floor(Math.random() * max) },
    "str.lang": {},
    "str.time": { now: () => Date.now() },
    "str.net": {},
    "str.sql": {},
    "str.xml": {},
    "str.rmi": {},
    "str.security": {},
    "str.text": {}
};

const KEYWORDS = new Set([
  "if","else","while","for","break","continue","return",
  "let","const","int","float","string","bool",
  "func","end","import","from",
  "true","false","null","typeof"
]);


// ---------- LEXER ----------
class Lexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
  }

  peek() {
    return this.input[this.pos];
  }

  advance() {
    return this.input[this.pos++];
  }

  skipWhitespace() {
    while (/\s/.test(this.peek())) this.advance();
  }

  nextToken() {
    this.skipWhitespace();
    if (!this.peek()) return null;

    // identifiers / keywords
    if (/[a-zA-Z._]/.test(this.peek())) {
      let word = "";
      while (/[a-zA-Z0-9._]/.test(this.peek())) {
        word += this.advance();
      }

      if (KEYWORDS.has(word)) {
        return { type: "KEYWORD", value: word };
      }
      return { type: "IDENT", value: word };
    }

    // number
    if (/\d/.test(this.peek())) {
      let num = "";
      while (/\d/.test(this.peek())) num += this.advance();
      return { type: "NUMBER", value: Number(num) };
    }

    // string
    if (this.peek() === '"' || this.peek() === "'") {
      const quote = this.advance();
      let value = "";
      while (this.peek() && this.peek() !== quote) {
        value += this.advance();
      }
      this.advance();
      return { type: "STRING", value };
    }

    // symbol
    return { type: "SYMBOL", value: this.advance() };
  }
}

// ---------- PARSER ----------
// ---------- PARSER ----------
class Parser {
  constructor(lexer) {
    this.lexer = lexer;
    this.token = lexer.nextToken();
  }

  next() {
    this.token = this.lexer.nextToken();
  }

  is(type, value = null) {
    if (!this.token) return false;
    if (this.token.type !== type) return false;
    return value !== null ? this.token.value === value : true;
  }

  eat(type, value = null) {
    if (!this.is(type, value)) {
      throw new Error(
        `Expected ${type}${value ? "("+value+")" : ""}, got ${this.token?.type}:${this.token?.value}`
      );
    }
    this.next();
  }

  // -------- EXPRESSIONS --------
  parseExpr() {
    if (!this.token) throw new Error("Unexpected EOF in expression");

    // module.func(...)
    if (this.token.type === "IDENT") {
      const name = this.token.value;

      if (typeof name === "string" && name.includes(".")) {
        const [module, func] = name.split(".");
        this.next();
        this.eat("SYMBOL", "(");

        const args = [];
        while (!this.is("SYMBOL", ")")) {
          args.push(this.parseExpr());
          if (this.is("SYMBOL", ",")) this.eat("SYMBOL", ",");
        }

        this.eat("SYMBOL", ")");
        return { type: "Call", module, func, args };
      }

      this.next();
      return { type: "Var", name };
    }

    if (this.token.type === "NUMBER") {
      const value = this.token.value;
      this.next();
      return { type: "Number", value };
    }

    if (this.token.type === "STRING") {
      const value = this.token.value;
      this.next();
      return { type: "String", value };
    }

    throw new Error("Invalid expression: " + JSON.stringify(this.token));
  }

  // -------- STATEMENTS --------
  parseStmt() {
    if (!this.token) throw new Error("Unexpected EOF");

    // import str.io
    if (this.is("KEYWORD", "import")) {
      this.eat("KEYWORD", "import");
      const mod = this.token.value;
      this.next();
      return { type: "Import", module: mod };
    }

    // func name { ... }
    if (this.is("KEYWORD", "func")) {
      this.eat("KEYWORD", "func");
      const name = this.token.value;
      this.next();

      this.eat("SYMBOL", "{");
      const body = [];

      while (!this.is("SYMBOL", "}")) {
        body.push(this.parseStmt());
      }

      this.eat("SYMBOL", "}");
      return { type: "Func", name, body };
    }

    // create type x
    if (this.is("KEYWORD", "create")) {
      this.next(); // create
      this.next(); // type
      const name = this.token.value;
      this.next();
      return { type: "CreateVar", name };
    }

    // set var x = expr
    if (this.is("KEYWORD", "set")) {
      this.next(); // set
      this.next(); // var
      const name = this.token.value;
      this.next();
      this.eat("SYMBOL", "=");
      const value = this.parseExpr();
      return { type: "SetVar", name, value };
    }

    // io.print(...)
    if (this.token.type === "IDENT" && this.token.value === "io.print") {
      this.next();
      this.eat("SYMBOL", "(");
      const expr = this.parseExpr();
      this.eat("SYMBOL", ")");
      return { type: "Print", expr };
    }

    // skip unknown token safely
    this.next();
    return this.parseStmt();
  }

  // -------- PROGRAM --------
  parseProgram() {
    const stmts = [];
    while (this.token) {
      stmts.push(this.parseStmt());
    }
    return stmts;
  }
}

// ---------- INTERPRETER ----------
class Interpreter {
    constructor() {
        this.env = {};
        this.modules = {};
    }
    run(stmts) {
        for (const stmt of stmts)
            this.exec(stmt);
    }
    exec(stmt) {
        switch (stmt.type) {
            case "Import": {
  const fullName = stmt.module.startsWith("str.")
    ? stmt.module
    : `str.${stmt.module}`;

  if (!MODULES[fullName]) {
    throw new Error(`Unknown module ${stmt.module}`);
  }

  this.modules[fullName] = MODULES[fullName];
  break;
}

            case "Func":
                stmt.body.forEach(s => this.exec(s));
                break;
            case "CreateVar":
                this.env[stmt.name] = null;
                break;
            case "SetVar":
                this.env[stmt.name] = this.evalExpr(stmt.value);
                break;
            case "Print":
                console.log(this.evalExpr(stmt.expr));
                break;
        }
    }
    evalExpr(expr) {
        switch (expr.type) {
            case "Number": return expr.value;
            case "String": return expr.value;
            case "Var":
                if (!(expr.name in this.env))
                    throw new Error(`Undefined variable ${expr.name}`);
                return this.env[expr.name];
            case "Call":
                const mod = this.modules[`str.${expr.module}`];
                if (!mod)
                    throw new Error(`Module str.${expr.module} not imported`);
                const fn = mod[expr.func];
                if (!fn)
                    throw new Error(`Function ${expr.func} not found`);
                return fn(...expr.args.map(a => this.evalExpr(a)));
        }
    }
}

class CGenerator {
    constructor() {
        this.lines = [];
        this.declaredVars = new Set();
    }
    generate(stmts) {
        this.lines.push(`#include <stdio.h>`);
        this.lines.push(`#include <math.h>`);
        this.lines.push(``);
        this.lines.push(`int main() {`);
        for (const stmt of stmts) {
            this.emitStmt(stmt);
        }
        this.lines.push(`  return 0;`);
        this.lines.push(`}`);
        return this.lines.join("\n");
    }
    emitStmt(stmt) {
        switch (stmt.type) {
            case "CreateVar":
                if (!this.declaredVars.has(stmt.name)) {
                    this.declaredVars.add(stmt.name);
                    this.lines.push(`  int ${stmt.name};`);
                }
                break;
            case "SetVar":
                this.lines.push(`  ${stmt.name} = ${this.emitExpr(stmt.value)};`);
                break;
            case "Print":
                if (stmt.expr.type === "String") {
                    this.lines.push(`  printf("%s\\n", "${stmt.expr.value}");`);
                }
                else {
                    this.lines.push(`  printf("%d\\n", ${this.emitExpr(stmt.expr)});`);
                }
                break;
            case "Func":
                // inline execution (Strata funcs are not real C funcs yet)
                stmt.body.forEach(s => this.emitStmt(s));
                break;
            case "Import":
                // handled implicitly
                break;
        }
    }
    emitExpr(expr) {
        switch (expr.type) {
            case "Number":
                return expr.value.toString();
            case "String":
                return `"${expr.value}"`;
            case "Var":
                return expr.name;
            case "Call":
                const args = expr.args.map(a => this.emitExpr(a)).join(", ");
                if (expr.module === "math") {
                    return `${expr.func}(${args})`;
                }
                if (expr.module === "io" && expr.func === "print") {
                    return `printf("%d\\n", ${args})`;
                }
                return "0";
        }
    }
}

class CppGenerator {
  constructor() {
    this.lines = [];
    this.declaredVars = new Set();
  }

  generate(stmts) {
    this.lines.push(`#include <iostream>`);
    this.lines.push(`using namespace std;`);
    this.lines.push(``);
    this.lines.push(`int main() {`);

    for (const stmt of stmts) this.emitStmt(stmt);

    this.lines.push(`  return 0;`);
    this.lines.push(`}`);
    return this.lines.join("\n");
  }

  emitStmt(stmt) {
    switch (stmt.type) {
      case "CreateVar":
        if (!this.declaredVars.has(stmt.name)) {
          this.declaredVars.add(stmt.name);
          this.lines.push(`  int ${stmt.name};`);
        }
        break;

      case "SetVar":
        this.lines.push(`  ${stmt.name} = ${this.emitExpr(stmt.value)};`);
        break;

      case "Print":
        this.lines.push(`  cout << ${this.emitExpr(stmt.expr)} << endl;`);
        break;

      case "Func":
        stmt.body.forEach(s => this.emitStmt(s));
        break;
    }
  }

  emitExpr(expr) {
    if (expr.type === "Number") return expr.value.toString();
    if (expr.type === "String") return `"${expr.value}"`;
    if (expr.type === "Var") return expr.name;
    return "0";
  }
}

class CSharpGenerator {
  constructor() {
    this.lines = [];
    this.declaredVars = new Set();
  }

  generate(stmts) {
    this.lines.push(`using System;`);
    this.lines.push(`class Program {`);
    this.lines.push(`  static void Main() {`);

    for (const stmt of stmts) this.emitStmt(stmt);

    this.lines.push(`  }`);
    this.lines.push(`}`);
    return this.lines.join("\n");
  }

  emitStmt(stmt) {
    switch (stmt.type) {
      case "CreateVar":
        if (!this.declaredVars.has(stmt.name)) {
          this.declaredVars.add(stmt.name);
          this.lines.push(`    int ${stmt.name};`);
        }
        break;

      case "SetVar":
        this.lines.push(`    ${stmt.name} = ${this.emitExpr(stmt.value)};`);
        break;

      case "Print":
        this.lines.push(`    Console.WriteLine(${this.emitExpr(stmt.expr)});`);
        break;

      case "Func":
        stmt.body.forEach(s => this.emitStmt(s));
        break;
    }
  }

  emitExpr(expr) {
    if (expr.type === "Number") return expr.value.toString();
    if (expr.type === "String") return `"${expr.value}"`;
    if (expr.type === "Var") return expr.name;
    return "0";
  }
}

class ShellGenerator {
  constructor() {
    this.lines = [];
  }

  generate(stmts) {
    this.lines.push(`#!/bin/bash`);

    for (const stmt of stmts) this.emitStmt(stmt);

    return this.lines.join("\n");
  }

  emitStmt(stmt) {
    switch (stmt.type) {
      case "CreateVar":
        this.lines.push(`${stmt.name}=0`);
        break;

      case "SetVar":
        this.lines.push(`${stmt.name}=${stmt.value.value}`);
        break;

      case "Print":
        if (stmt.expr.type === "String") {
          this.lines.push(`echo "${stmt.expr.value}"`);
        } else {
          this.lines.push(`echo $${stmt.expr.name}`);
        }
        break;
    }
  }
}

class BatGenerator {
  constructor() {
    this.lines = [];
  }

  generate(stmts) {
    this.lines.push(`@echo off`);
    this.lines.push(`setlocal EnableDelayedExpansion`);

    for (const stmt of stmts) this.emitStmt(stmt);

    return this.lines.join("\r\n");
  }

  emitStmt(stmt) {
    switch (stmt.type) {
      case "CreateVar":
        this.lines.push(`set ${stmt.name}=0`);
        break;

      case "SetVar":
        this.lines.push(`set ${stmt.name}=${stmt.value.value}`);
        break;

      case "Print":
        if (stmt.expr.type === "String") {
          this.lines.push(`echo ${stmt.expr.value}`);
        } else {
          this.lines.push(`echo %${stmt.expr.name}%`);
        }
        break;
    }
  }
}

function getGenerator(target) {
  switch (target) {
    case "c": return new CGenerator();
    case "cpp": return new CppGenerator();
    case "cs": return new CSharpGenerator();
    case "sh": return new ShellGenerator();
    case "bat": return new BatGenerator();
    default:
      throw new Error("Unknown target: " + target);
  }
}


// ---------- CLI ----------
// ---------- CLI ----------
const { execSync } = require("child_process");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage:");
  console.error("  strata run <file.str>");
  console.error("  strata compile <file.str> --target <c|cpp|cs|sh|bat>");
  process.exit(1);
}

const command = args[0];
const file = args[1];

// default target
let target = "c";

// parse flags
for (let i = 2; i < args.length; i++) {
  if (args[i] === "--target" && args[i + 1]) {
    target = args[i + 1];
  }
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

// parse program once
const source = fs.readFileSync(file, "utf-8");
const program = new Parser(new Lexer(source)).parseProgram();

/* ================= RUN ================= */
if (command === "run") {
  new Interpreter().run(program);
  process.exit(0);
}

/* =============== COMPILE =============== */
if (command === "compile") {
  const generator = getGenerator(target);
  const outputCode = generator.generate(program);

  const base = file.replace(/\.str$/, "");

  const EXTENSIONS = {
    c: ".c",
    cpp: ".cpp",
    cs: ".cs",
    sh: ".sh",
    bat: ".bat"
  };

  const outExt = EXTENSIONS[target];
  if (!outExt) {
    console.error(`Unknown target: ${target}`);
    process.exit(1);
  }

  const outFile = base + outExt;
  fs.writeFileSync(outFile, outputCode);
  console.log(`Generated ${outFile}`);

  /* ===== auto-build native targets ===== */
  if (target === "c" || target === "cpp") {
    const exe =
      process.platform === "win32" ? base + ".exe" : base;

    try {
      const compiler = target === "cpp" ? "g++" : "gcc";
      execSync(`${compiler} "${outFile}" -o "${exe}"`, { stdio: "inherit" });
      console.log(`Built executable: ${exe}`);
    } catch {
      console.warn("Compiler not found. Source file generated only.");
    }
  }

  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);



