import * as fs from "fs";

// ---------- TYPES ----------
type Expr =
  | { type: "Var"; name: string }
  | { type: "Number"; value: number }
  | { type: "String"; value: string }
  | { type: "Call"; module: string; func: string; args: Expr[] };

type Stmt =
  | { type: "Import"; module: string }
  | { type: "Func"; name: string; body: Stmt[] }
  | { type: "CreateVar"; name: string }
  | { type: "SetVar"; name: string; value: Expr }
  | { type: "Print"; expr: Expr };

// ---------- MODULES ----------
const MODULES: Record<string, any> = {
  "str.io": { print: (...args: any[]) => console.log(...args) },
  "str.math": { sqrt: Math.sqrt, pow: Math.pow, random: Math.random },
  "str.util": { randomInt: (max: number) => Math.floor(Math.random() * max) },
  "str.lang": {},
  "str.time": { now: () => Date.now() },
  "str.net": {},
  "str.sql": {},
  "str.xml": {},
  "str.rmi": {},
  "str.security": {},
  "str.text": {}
};

// ---------- LEXER ----------
class Lexer {
  private pos = 0;
  constructor(private input: string) {}

  private peek() {
    return this.input[this.pos];
  }
  private advance() {
    return this.input[this.pos++];
  }

  nextToken(): string | null {
    while (this.peek() === " " || this.peek() === "\n" || this.peek() === "\r" || this.peek() === "\t") {
      this.advance();
    }
    if (!this.peek()) return null;

    // identifiers / keywords
    if (/[a-zA-Z._]/.test(this.peek())) {
      let word = "";
      while (/[a-zA-Z0-9._]/.test(this.peek())) word += this.advance();
      return word;
    }

    // STRING "..."
    if (this.peek() === '"') {
      this.advance();
      let value = "";
      while (this.peek() && this.peek() !== '"') value += this.advance();
      this.advance();
      return `"${value}"`;
    }

    // STRING '...'
    if (this.peek() === "'") {
      this.advance();
      let value = "";
      while (this.peek() && this.peek() !== "'") value += this.advance();
      this.advance();
      return `'${value}'`;
    }

    // number
    if (/\d/.test(this.peek())) {
      let num = "";
      while (/\d/.test(this.peek())) num += this.advance();
      return num;
    }

    // symbols
    return this.advance();
  }
}

// ---------- PARSER ----------
class Parser {
  private token: string | null;
  constructor(private lexer: Lexer) {
    this.token = lexer.nextToken();
  }

  private next() {
    this.token = this.lexer.nextToken();
  }

  private eat(expected: string) {
    if (this.token === expected) this.next();
    else throw new Error(`Expected '${expected}' got '${this.token}'`);
  }

  private parseExpr(): Expr {
    if (!this.token) throw new Error("Unexpected EOF in expression");

    // function call: io.print(...)
    const fn = this.token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (fn) {
      const [, module, func] = fn;
      this.next();
      this.eat("(");
      const args: Expr[] = [];
      while (this.token !== ")") {
        args.push(this.parseExpr());
        if (this.token === ",") this.eat(",");
      }
      this.eat(")");
      return { type: "Call", module, func, args };
    }

    // number
    if (/^\d+$/.test(this.token)) {
      const value = Number(this.token);
      this.next();
      return { type: "Number", value };
    }

    // string
    if (
      (this.token.startsWith('"') && this.token.endsWith('"')) ||
      (this.token.startsWith("'") && this.token.endsWith("'"))
    ) {
      const value = this.token.slice(1, -1);
      this.next();
      return { type: "String", value };
    }

    // variable
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.token)) {
      const name = this.token;
      this.next();
      return { type: "Var", name };
    }

    throw new Error(`Unknown expression: ${this.token}`);
  }

  parseProgram(): Stmt[] {
    const stmts: Stmt[] = [];
    while (this.token) stmts.push(this.parseStmt());
    return stmts;
  }

  private parseStmt(): Stmt {
    if (!this.token) throw new Error("Unexpected EOF");

    // import
    if (this.token === "import") {
      this.eat("import");
      const module = this.token!;
      this.next();
      this.eat("from");
      this.next(); // skip root (str)
      return { type: "Import", module };
    }

    // func
    if (this.token === "func") {
      this.eat("func");
      const name = this.token!;
      this.next();
      this.eat("{");
      const body: Stmt[] = [];
      while (this.token !== "}") body.push(this.parseStmt());
      this.eat("}");
      return { type: "Func", name, body };
    }

    // create var
    if (this.token === "create") {
      this.eat("create");
      this.eat("type");
      const name = this.token!.replace(/['"]/g, "");
      this.next();
      return { type: "CreateVar", name };
    }

    // set var
    if (this.token === "set") {
      this.eat("set");
      this.eat("var");
      const name = this.token!.replace(/['"]/g, "");
      this.next();
      this.eat("=");
      const value = this.parseExpr();
      return { type: "SetVar", name, value };
    }

    // print
    if (this.token === "io.print") {
      this.next();
      this.eat("(");
      const expr = this.parseExpr();
      this.eat(")");
      return { type: "Print", expr };
    }

    // skip unknown tokens safely
    this.next();
    return this.parseStmt();
  }
}

// ---------- INTERPRETER ----------
class Interpreter {
  private env: Record<string, any> = {};
  private modules: Record<string, any> = {};

  run(stmts: Stmt[]) {
    for (const stmt of stmts) this.exec(stmt);
  }

  private exec(stmt: Stmt) {
    switch (stmt.type) {
      case "Import":
        if (!MODULES[stmt.module]) throw new Error(`Unknown module ${stmt.module}`);
        this.modules[stmt.module] = MODULES[stmt.module];
        break;

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

  private evalExpr(expr: Expr): any {
    switch (expr.type) {
      case "Number": return expr.value;
      case "String": return expr.value;
      case "Var":
        if (!(expr.name in this.env)) throw new Error(`Undefined variable ${expr.name}`);
        return this.env[expr.name];
      case "Call":
        const mod = this.modules[`str.${expr.module}`];
        if (!mod) throw new Error(`Module str.${expr.module} not imported`);
        const fn = mod[expr.func];
        if (!fn) throw new Error(`Function ${expr.func} not found`);
        return fn(...expr.args.map(a => this.evalExpr(a)));
    }
  }
}

class CGenerator {
  private lines: string[] = [];
  private declaredVars = new Set<string>();

  generate(stmts: Stmt[]): string {
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

  private emitStmt(stmt: Stmt) {
    switch (stmt.type) {
      case "CreateVar":
        if (!this.declaredVars.has(stmt.name)) {
          this.declaredVars.add(stmt.name);
          this.lines.push(`  int ${stmt.name};`);
        }
        break;

      case "SetVar":
        this.lines.push(
          `  ${stmt.name} = ${this.emitExpr(stmt.value)};`
        );
        break;

      case "Print":
        if (stmt.expr.type === "String") {
          this.lines.push(
            `  printf("%s\\n", "${stmt.expr.value}");`
          );
        } else {
          this.lines.push(
            `  printf("%d\\n", ${this.emitExpr(stmt.expr)});`
          );
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

  private emitExpr(expr: Expr): string {
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


// ---------- RUN ----------
// ---------- RUN ----------
const file = process.argv[2] || "myprogram.str";
const source = fs.readFileSync(file, "utf-8");

const program = new Parser(new Lexer(source)).parseProgram();

// Run interpreter (current behavior)
new Interpreter().run(program);

// Generate C code
const cgen = new CGenerator();
const cCode = cgen.generate(program);

fs.writeFileSync("out.c", cCode);
console.log("C code generated: out.c");

