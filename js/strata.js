// Browser-safe Strata runtime
// Based 1:1 on your language (no fs / no CLI)

export function runStrata(source) {
  let output = [];

  /* ---------- MODULES ---------- */
  const MODULES = {
    "str.io": {
      print: (...args) => output.push(args.join(" "))
    },
    "str.math": {
      sqrt: Math.sqrt,
      pow: Math.pow,
      random: Math.random
    },
    "str.util": {
      randomInt: (max) => Math.floor(Math.random() * max)
    },
    "str.time": {
      now: () => Date.now()
    }
  };

  const KEYWORDS = new Set([
    "if","else","while","for","break","continue","return",
    "let","const","int","float","string","bool",
    "func","end","import","from",
    "true","false","null","typeof",
    "create","set","var"
  ]);

  /* ---------- LEXER ---------- */
  class Lexer {
    constructor(input) {
      this.input = input;
      this.pos = 0;
    }
    peek() { return this.input[this.pos]; }
    advance() { return this.input[this.pos++]; }
    skipWhitespace() {
      while (/\s/.test(this.peek())) this.advance();
    }
    nextToken() {
      this.skipWhitespace();
      if (!this.peek()) return null;

      if (/[a-zA-Z._]/.test(this.peek())) {
        let word = "";
        while (/[a-zA-Z0-9._]/.test(this.peek())) {
          word += this.advance();
        }
        if (KEYWORDS.has(word)) return { type: "KEYWORD", value: word };
        return { type: "IDENT", value: word };
      }

      if (/\d/.test(this.peek())) {
        let num = "";
        while (/\d/.test(this.peek())) num += this.advance();
        return { type: "NUMBER", value: Number(num) };
      }

      if (this.peek() === '"' || this.peek() === "'") {
        const q = this.advance();
        let v = "";
        while (this.peek() && this.peek() !== q) v += this.advance();
        this.advance();
        return { type: "STRING", value: v };
      }

      return { type: "SYMBOL", value: this.advance() };
    }
  }

  /* ---------- PARSER ---------- */
  class Parser {
    constructor(lexer) {
      this.lexer = lexer;
      this.token = lexer.nextToken();
    }
    next() { this.token = this.lexer.nextToken(); }
    is(t, v=null) {
      return this.token &&
        this.token.type === t &&
        (v === null || this.token.value === v);
    }
    eat(t, v=null) {
      if (!this.is(t, v)) {
        throw new Error(`Expected ${t} ${v ?? ""}`);
      }
      this.next();
    }

    parseExpr() {
      if (this.token.type === "IDENT") {
        const name = this.token.value;

        if (name.includes(".")) {
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
        const v = this.token.value;
        this.next();
        return { type: "Number", value: v };
      }

      if (this.token.type === "STRING") {
        const v = this.token.value;
        this.next();
        return { type: "String", value: v };
      }

      throw new Error("Invalid expression");
    }

    parseStmt() {
      if (this.is("KEYWORD", "import")) {
        this.next();
        const mod = this.token.value;
        this.next();
        return { type: "Import", module: mod };
      }

      if (this.is("KEYWORD", "func")) {
        this.next();
        const name = this.token.value;
        this.next();
        this.eat("SYMBOL", "{");
        const body = [];
        while (!this.is("SYMBOL", "}")) body.push(this.parseStmt());
        this.eat("SYMBOL", "}");
        return { type: "Func", name, body };
      }

      if (this.is("KEYWORD", "create")) {
        this.next(); this.next();
        const name = this.token.value;
        this.next();
        return { type: "CreateVar", name };
      }

      if (this.is("KEYWORD", "set")) {
        this.next(); this.next();
        const name = this.token.value;
        this.next();
        this.eat("SYMBOL", "=");
        const value = this.parseExpr();
        return { type: "SetVar", name, value };
      }

      if (this.token.type === "IDENT" && this.token.value === "io.print") {
        this.next();
        this.eat("SYMBOL", "(");
        const expr = this.parseExpr();
        this.eat("SYMBOL", ")");
        return { type: "Print", expr };
      }

      this.next();
      return this.parseStmt();
    }

    parseProgram() {
      const s = [];
      while (this.token) s.push(this.parseStmt());
      return s;
    }
  }

  /* ---------- INTERPRETER ---------- */
  class Interpreter {
    constructor() {
      this.env = {};
      this.modules = {};
    }
    run(stmts) { stmts.forEach(s => this.exec(s)); }
    exec(stmt) {
      switch (stmt.type) {
        case "Import": {
          const full = stmt.module.startsWith("str.")
            ? stmt.module
            : `str.${stmt.module}`;
          if (!MODULES[full]) throw new Error("Unknown module " + stmt.module);
          this.modules[full] = MODULES[full];
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
          output.push(this.evalExpr(stmt.expr));
          break;
      }
    }
    evalExpr(e) {
      switch (e.type) {
        case "Number": return e.value;
        case "String": return e.value;
        case "Var":
          if (!(e.name in this.env)) throw new Error("Undefined " + e.name);
          return this.env[e.name];
        case "Call":
          const mod = this.modules[`str.${e.module}`];
          if (!mod) throw new Error(`Module str.${e.module} not imported`);
          const fn = mod[e.func];
          if (!fn) throw new Error("Function not found");
          return fn(...e.args.map(a => this.evalExpr(a)));
      }
    }
  }

  /* ---------- RUN ---------- */
  try {
    const program = new Parser(new Lexer(source)).parseProgram();
    new Interpreter().run(program);
  } catch (e) {
    return "Runtime error:\n" + e.message;
  }

  return output.join("\n") || "(no output)";
}
    
