var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// dist/index.js
var fs = __toESM(require("fs"), 1);
var process = __toESM(require("process"), 1);
var TYPE_REGISTRY = {
  // Core Primitive Types
  int: { kind: "primitive", primitive: "int" },
  float: { kind: "primitive", primitive: "float" },
  bool: { kind: "primitive", primitive: "bool" },
  char: { kind: "primitive", primitive: "char" },
  string: { kind: "primitive", primitive: "string" },
  any: { kind: "primitive", primitive: "any" },
  // Rust-style Signed Integers
  i8: { kind: "primitive", primitive: "i8" },
  i16: { kind: "primitive", primitive: "i16" },
  i32: { kind: "primitive", primitive: "i32" },
  i64: { kind: "primitive", primitive: "i64" },
  // Rust-style Unsigned Integers
  u8: { kind: "primitive", primitive: "u8" },
  u16: { kind: "primitive", primitive: "u16" },
  u32: { kind: "primitive", primitive: "u32" },
  u64: { kind: "primitive", primitive: "u64" },
  // Floating Point Types
  f32: { kind: "primitive", primitive: "f32" },
  f64: { kind: "primitive", primitive: "f64" },
  // Collection Types (Python, Go, Ruby, JavaScript)
  array: { kind: "primitive", primitive: "array" },
  list: { kind: "primitive", primitive: "list" },
  map: { kind: "primitive", primitive: "map" },
  dict: { kind: "primitive", primitive: "dict" },
  set: { kind: "primitive", primitive: "set" },
  tuple: { kind: "primitive", primitive: "tuple" },
  // Advanced Types (TypeScript, Rust, Go)
  option: { kind: "primitive", primitive: "option" },
  result: { kind: "primitive", primitive: "result" },
  promise: { kind: "primitive", primitive: "promise" },
  void: { kind: "primitive", primitive: "void" },
  null: { kind: "primitive", primitive: "null" },
  undefined: { kind: "primitive", primitive: "undefined" },
  // Regular Expression Support (Python, Ruby, JavaScript, Go)
  regex: { kind: "primitive", primitive: "regex" },
  pattern: { kind: "primitive", primitive: "pattern" },
  // R/NumPy Scientific Computing Types
  complex: { kind: "primitive", primitive: "complex" },
  matrix: { kind: "primitive", primitive: "matrix" },
  dataframe: { kind: "primitive", primitive: "dataframe" },
  // Function Types (JavaScript, TypeScript, Python, Ruby, Rust)
  callable: { kind: "primitive", primitive: "callable" },
  lambda: { kind: "primitive", primitive: "lambda" },
  closure: { kind: "primitive", primitive: "closure" }
};
var BUILTIN_FUNCTIONS = {
  // STRING OPERATIONS (Python, Ruby, JavaScript)
  strlen: (args2) => args2[0]?.length ?? 0,
  substr: (args2) => args2[0]?.substring(args2[1], args2[2]) ?? "",
  toUpperCase: (args2) => args2[0]?.toUpperCase?.() ?? "",
  toLowerCase: (args2) => args2[0]?.toLowerCase?.() ?? "",
  trim: (args2) => args2[0]?.trim?.() ?? "",
  split: (args2) => (args2[0]?.split?.(args2[1]) ?? []).join(","),
  join: (args2) => args2[0]?.join?.(args2[1]) ?? "",
  startsWith: (args2) => args2[0]?.startsWith?.(args2[1]) ?? false,
  endsWith: (args2) => args2[0]?.endsWith?.(args2[1]) ?? false,
  includes: (args2) => args2[0]?.includes?.(args2[1]) ?? false,
  indexOf: (args2) => args2[0]?.indexOf?.(args2[1]) ?? -1,
  replace: (args2) => args2[0]?.replace?.(args2[1], args2[2]) ?? "",
  replaceAll: (args2) => args2[0]?.replaceAll?.(args2[1], args2[2]) ?? "",
  repeat: (args2) => args2[0]?.repeat?.(args2[1]) ?? "",
  slice: (args2) => args2[0]?.slice?.(args2[1], args2[2]) ?? "",
  // ARRAY/LIST OPERATIONS (Python, JavaScript, Go, Rust)
  push: (args2) => {
    args2[0]?.push?.(args2[1]);
    return args2[0];
  },
  pop: (args2) => args2[0]?.pop?.(),
  shift: (args2) => args2[0]?.shift?.(),
  unshift: (args2) => {
    args2[0]?.unshift?.(args2[1]);
    return args2[0];
  },
  splice: (args2) => args2[0]?.splice?.(args2[1], args2[2]) ?? [],
  map: (args2) => args2[0]?.map?.(args2[1]) ?? [],
  filter: (args2) => args2[0]?.filter?.(args2[1]) ?? [],
  reduce: (args2) => args2[0]?.reduce?.(args2[1], args2[2]),
  forEach: (args2) => {
    args2[0]?.forEach?.(args2[1]);
  },
  find: (args2) => args2[0]?.find?.(args2[1]),
  findIndex: (args2) => args2[0]?.findIndex?.(args2[1]) ?? -1,
  some: (args2) => args2[0]?.some?.(args2[1]) ?? false,
  every: (args2) => args2[0]?.every?.(args2[1]) ?? false,
  reverse: (args2) => {
    args2[0]?.reverse?.();
    return args2[0];
  },
  sort: (args2) => {
    args2[0]?.sort?.(args2[1]);
    return args2[0];
  },
  concat: (args2) => args2[0]?.concat?.(args2[1]) ?? [],
  flat: (args2) => args2[0]?.flat?.(args2[1] ?? 1) ?? [],
  flatMap: (args2) => args2[0]?.flatMap?.(args2[1]) ?? [],
  includes_arr: (args2) => args2[0]?.includes?.(args2[1]) ?? false,
  lastIndexOf: (args2) => args2[0]?.lastIndexOf?.(args2[1]) ?? -1,
  // DICTIONARY/MAP OPERATIONS (Python, JavaScript, Go, Rust)
  keys: (args2) => Object.keys(args2[0] ?? {}) ?? [],
  values: (args2) => Object.values(args2[0] ?? {}) ?? [],
  entries: (args2) => Object.entries(args2[0] ?? {}) ?? [],
  has: (args2) => (args2[0] ?? {})?.[args2[1]] !== void 0,
  delete: (args2) => {
    delete (args2[0] ?? {})[args2[1]];
    return args2[0];
  },
  clear: (args2) => {
    for (let k in args2[0])
      delete args2[0][k];
    return args2[0];
  },
  get: (args2) => (args2[0] ?? {})[args2[1]],
  set: (args2) => {
    (args2[0] ?? {})[args2[1]] = args2[2];
    return args2[0];
  },
  // SET OPERATIONS (Python, Go, Rust)
  add: (args2) => {
    args2[0]?.add?.(args2[1]);
    return args2[0];
  },
  remove: (args2) => {
    args2[0]?.delete?.(args2[1]);
    return args2[0];
  },
  union: (args2) => /* @__PURE__ */ new Set([...args2[0] ?? [], ...args2[1] ?? []]),
  intersection: (args2) => new Set([...args2[0] ?? []].filter((x) => args2[1]?.has?.(x))),
  difference: (args2) => new Set([...args2[0] ?? []].filter((x) => !args2[1]?.has?.(x))),
  // MATH OPERATIONS (R, Python, C, C++)
  abs: (args2) => Math.abs(args2[0]),
  sqrt: (args2) => Math.sqrt(args2[0]),
  pow: (args2) => Math.pow(args2[0], args2[1]),
  sin: (args2) => Math.sin(args2[0]),
  cos: (args2) => Math.cos(args2[0]),
  tan: (args2) => Math.tan(args2[0]),
  asin: (args2) => Math.asin(args2[0]),
  acos: (args2) => Math.acos(args2[0]),
  atan: (args2) => Math.atan(args2[0]),
  atan2: (args2) => Math.atan2(args2[0], args2[1]),
  exp: (args2) => Math.exp(args2[0]),
  log: (args2) => Math.log(args2[0]),
  log10: (args2) => Math.log10(args2[0]),
  log2: (args2) => Math.log2(args2[0]),
  ceil: (args2) => Math.ceil(args2[0]),
  floor: (args2) => Math.floor(args2[0]),
  round: (args2) => Math.round(args2[0]),
  trunc: (args2) => Math.trunc(args2[0]),
  max: (args2) => Math.max(...args2),
  min: (args2) => Math.min(...args2),
  gcd: (args2) => {
    let a = Math.abs(args2[0]), b = Math.abs(args2[1]);
    while (b)
      [a, b] = [b, a % b];
    return a;
  },
  lcm: (args2) => Math.abs(args2[0] * args2[1]) / BUILTIN_FUNCTIONS.gcd([args2[0], args2[1]]),
  // RANDOM OPERATIONS (Python, Go, JavaScript, Ruby)
  random: (args2) => Math.random(),
  randomInt: (args2) => Math.floor(Math.random() * (args2[1] - args2[0] + 1)) + args2[0],
  randomFloat: (args2) => Math.random() * (args2[1] - args2[0]) + args2[0],
  // TYPE CHECKING/CONVERSION (Python, JavaScript, TypeScript)
  typeof: (args2) => typeof args2[0],
  parseInt: (args2) => parseInt(args2[0], args2[1] ?? 10),
  parseFloat: (args2) => parseFloat(args2[0]),
  toString: (args2) => String(args2[0]),
  toBoolean: (args2) => Boolean(args2[0]),
  toNumber: (args2) => Number(args2[0]),
  isNaN: (args2) => isNaN(args2[0]),
  isFinite: (args2) => isFinite(args2[0]),
  isInteger: (args2) => Number.isInteger(args2[0]),
  isArray: (args2) => Array.isArray(args2[0]),
  isObject: (args2) => args2[0] !== null && typeof args2[0] === "object",
  isNull: (args2) => args2[0] === null,
  isUndefined: (args2) => args2[0] === void 0,
  // ERROR HANDLING (Go, Rust, C++)
  try: (args2) => {
    try {
      return args2[0]?.();
    } catch (e) {
      return e;
    }
  },
  catch: (args2) => args2[0] instanceof Error ? args2[1]?.(args2[0]) : args2[0],
  panic: (args2) => {
    throw new Error(args2[0]);
  },
  defer: (args2) => {
    return args2[0];
  },
  // FILE OPERATIONS (Python, Go, C, C++)
  readFile: (args2) => {
    try {
      return fs.readFileSync(args2[0], "utf-8");
    } catch {
      return null;
    }
  },
  writeFile: (args2) => {
    try {
      fs.writeFileSync(args2[0], args2[1]);
      return true;
    } catch {
      return false;
    }
  },
  appendFile: (args2) => {
    try {
      fs.appendFileSync(args2[0], args2[1]);
      return true;
    } catch {
      return false;
    }
  },
  deleteFile: (args2) => {
    try {
      fs.unlinkSync(args2[0]);
      return true;
    } catch {
      return false;
    }
  },
  exists: (args2) => fs.existsSync(args2[0]),
  isFile: (args2) => {
    try {
      return fs.statSync(args2[0]).isFile();
    } catch {
      return false;
    }
  },
  isDirectory: (args2) => {
    try {
      return fs.statSync(args2[0]).isDirectory();
    } catch {
      return false;
    }
  },
  mkdir: (args2) => {
    try {
      fs.mkdirSync(args2[0], { recursive: true });
      return true;
    } catch {
      return false;
    }
  },
  // REGEX OPERATIONS (Python, Ruby, JavaScript, Go)
  match: (args2) => {
    try {
      const m = args2[0]?.match?.(new RegExp(args2[1], args2[2] ?? ""));
      return m ?? null;
    } catch {
      return null;
    }
  },
  test: (args2) => {
    try {
      return new RegExp(args2[1], args2[2] ?? "").test(args2[0]);
    } catch {
      return false;
    }
  },
  search: (args2) => {
    try {
      return args2[0]?.search?.(new RegExp(args2[1], args2[2] ?? ""));
    } catch {
      return -1;
    }
  },
  matchAll: (args2) => {
    try {
      return [...args2[0]?.matchAll?.(new RegExp(args2[1], "g")) ?? []];
    } catch {
      return [];
    }
  },
  // DATETIME OPERATIONS (Python, Go, JavaScript, Ruby)
  now: (args2) => (/* @__PURE__ */ new Date()).getTime(),
  timestamp: (args2) => Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3),
  getDate: (args2) => new Date(args2[0]).getDate(),
  getMonth: (args2) => new Date(args2[0]).getMonth() + 1,
  getYear: (args2) => new Date(args2[0]).getFullYear(),
  getHours: (args2) => new Date(args2[0]).getHours(),
  getMinutes: (args2) => new Date(args2[0]).getMinutes(),
  getSeconds: (args2) => new Date(args2[0]).getSeconds(),
  // PROMISE/ASYNC OPERATIONS (JavaScript, TypeScript, Python async)
  Promise: (args2) => new Promise(args2[0]),
  resolve: (args2) => Promise.resolve(args2[0]),
  reject: (args2) => Promise.reject(args2[0]),
  // TUPLES (Python, Go, Rust)
  tuple: (args2) => Object.freeze(Array.from(args2)),
  untuple: (args2) => Array.from(args2[0] ?? []),
  // OPTIONAL/NULL HANDLING (Rust, TypeScript, Go)
  Some: (args2) => ({ type: "some", value: args2[0] }),
  None: (args2) => ({ type: "none" }),
  unwrap: (args2) => args2[0]?.type === "some" ? args2[0].value : (() => {
    throw new Error("unwrap of None");
  })(),
  unwrapOr: (args2) => args2[0]?.type === "some" ? args2[0].value : args2[1],
  isSome: (args2) => args2[0]?.type === "some",
  isNone: (args2) => args2[0]?.type === "none",
  // RESULT OPERATIONS (Rust, Go)
  Ok: (args2) => ({ type: "ok", value: args2[0] }),
  Err: (args2) => ({ type: "err", error: args2[0] }),
  isOk: (args2) => args2[0]?.type === "ok",
  isErr: (args2) => args2[0]?.type === "err",
  // ITERATOR/GENERATOR OPERATIONS (Python, JavaScript, Go)
  range: (args2) => Array.from({ length: args2[1] - args2[0] }, (_, i) => i + args2[0]),
  enumerate: (args2) => args2[0]?.map?.((v, i) => [i, v]) ?? [],
  zip: (args2) => args2[0]?.map?.((v, i) => [v, args2[1]?.[i]]) ?? [],
  reversed: (args2) => [...args2[0] ?? []].reverse(),
  sorted: (args2) => [...args2[0] ?? []].sort(args2[1]),
  iter: (args2) => (args2[0] ?? [])[Symbol.iterator]?.(),
  next: (args2) => args2[0]?.next?.(),
  // HASH/DIGEST OPERATIONS (Python, Go, C++)
  hash: (args2) => {
    let hash = 0;
    const str = String(args2[0]);
    for (let i = 0; i < str.length; i++)
      hash = (hash << 5) - hash + str.charCodeAt(i), hash |= 0;
    return hash;
  },
  // REFLECTION (Python, JavaScript, TypeScript)
  hasProperty: (args2) => args2[1] in args2[0],
  getProperty: (args2) => args2[0][args2[1]],
  setProperty: (args2) => {
    args2[0][args2[1]] = args2[2];
    return args2[0];
  },
  deleteProperty: (args2) => {
    delete args2[0][args2[1]];
    return args2[0];
  },
  getPrototype: (args2) => Object.getPrototypeOf(args2[0]),
  setPrototype: (args2) => {
    Object.setPrototypeOf(args2[0], args2[1]);
    return args2[0];
  },
  // DEEP OPERATIONS
  clone: (args2) => JSON.parse(JSON.stringify(args2[0])),
  deepEqual: (args2) => JSON.stringify(args2[0]) === JSON.stringify(args2[1]),
  assign: (args2) => Object.assign(args2[0], ...args2.slice(1)),
  // TYPE ALIASES FOR COMPATIBILITY
  uint: (args2) => Math.abs(Math.floor(args2[0])),
  sint: (args2) => Math.floor(args2[0]),
  byte: (args2) => Math.floor(args2[0]) & 255,
  rune: (args2) => String.fromCharCode(args2[0]),
  // FUNCTIONAL PROGRAMMING (JavaScript, Python, Rust)
  compose: (args2) => (x) => args2.reduceRight((v, f) => f(v), x),
  pipe: (args2) => (x) => args2.reduce((v, f) => f(v), x),
  curry: (args2) => {
    const fn = args2[0];
    const arity = args2[1] ?? fn.length;
    return function curried(...args3) {
      return args3.length >= arity ? fn(...args3) : (...more) => curried(...args3, ...more);
    };
  },
  partial: (args2) => args2[0].bind(null, ...args2.slice(1)),
  memoize: (args2) => {
    const cache = /* @__PURE__ */ new Map();
    return (...args3) => {
      const key = JSON.stringify(args3);
      return cache.has(key) ? cache.get(key) : (cache.set(key, args3[0](...args3)), cache.get(key));
    };
  },
  // SYMBOL/ENUM OPERATIONS
  symbol: (args2) => Symbol(args2[0]),
  // GENERIC/TEMPLATE OPERATIONS (C++, C#, TypeScript)
  generic: (args2) => args2[0],
  // BITWISE OPERATIONS (C, C++, Rust, Go)
  bitwiseAnd: (args2) => args2[0] & args2[1],
  bitwiseOr: (args2) => args2[0] | args2[1],
  bitwiseXor: (args2) => args2[0] ^ args2[1],
  bitwiseNot: (args2) => ~args2[0],
  leftShift: (args2) => args2[0] << args2[1],
  rightShift: (args2) => args2[0] >> args2[1],
  unsignedRightShift: (args2) => args2[0] >>> args2[1]
};
function parseTypeAnnotation(token) {
  if (token in TYPE_REGISTRY)
    return TYPE_REGISTRY[token];
  if (token.endsWith("?"))
    return {
      kind: "optional",
      innerType: parseTypeAnnotation(token.slice(0, -1)) || { kind: "primitive", primitive: "any" }
    };
  if (token in TYPE_REGISTRY)
    return TYPE_REGISTRY[token];
  return { kind: "primitive", primitive: "any" };
}
function typeCompatible(actual, expected) {
  if (expected.primitive === "any" || actual.primitive === "any")
    return true;
  if (actual.kind === "primitive" && expected.kind === "primitive") {
    if (actual.primitive === expected.primitive)
      return true;
    if (actual.primitive === "int" && expected.primitive === "float")
      return true;
    if (actual.primitive === "char" && expected.primitive === "string")
      return true;
    return false;
  }
  if (actual.kind === "union" && expected.kind === "union") {
    return actual.types?.every((t) => expected.types?.some((e) => typeCompatible(t, e))) ?? false;
  }
  return false;
}
var Lexer = class {
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
    } else {
      this.column++;
    }
    return ch;
  }
  getLocation() {
    return {
      line: this.line,
      column: this.column,
      source: this.input.substring(this.lineStart, this.pos)
    };
  }
  nextToken() {
    while (this.peek() === " " || this.peek() === "\n" || this.peek() === "\r" || this.peek() === "	") {
      this.advance();
    }
    if (this.peek() === "/" && this.input[this.pos + 1] === "/") {
      while (this.peek() && this.peek() !== "\n")
        this.advance();
      return this.nextToken();
    }
    if (!this.peek())
      return null;
    const loc = this.getLocation();
    const twoCharOps = [
      "==",
      "!=",
      "<=",
      ">=",
      "=>",
      "||",
      "&&",
      "++",
      "--"
    ];
    const twoChar = this.input.substring(this.pos, this.pos + 2);
    if (twoCharOps.includes(twoChar)) {
      this.advance();
      this.advance();
      return { token: twoChar, location: loc };
    }
    if (/[a-zA-Z_]/.test(this.peek() || "")) {
      let word = "";
      while (/[a-zA-Z0-9_]/.test(this.peek() || ""))
        word += this.advance();
      return { token: word, location: loc };
    }
    if (this.peek() === '"') {
      this.advance();
      let str = "";
      while (this.peek() && this.peek() !== '"') {
        if (this.peek() === "\\") {
          this.advance();
          const escaped = this.advance();
          str += escaped === "n" ? "\n" : escaped;
        } else {
          str += this.advance();
        }
      }
      if (this.peek() === '"')
        this.advance();
      return { token: `"${str}"`, location: loc };
    }
    if (/[0-9]/.test(this.peek() || "")) {
      let num = "";
      while (/[0-9.]/.test(this.peek() || ""))
        num += this.advance();
      return { token: num, location: loc };
    }
    const ch = this.advance();
    return { token: ch, location: loc };
  }
};
var Parser = class {
  constructor(input) {
    this.tokens = [];
    this.pos = 0;
    const lexer = new Lexer(input);
    let token;
    while (token = lexer.nextToken()) {
      this.tokens.push(token);
    }
  }
  current() {
    return this.tokens[this.pos];
  }
  advance() {
    this.pos++;
  }
  expect(token) {
    if (!this.current() || this.current().token !== token) {
      throw new Error(`Expected ${token} at line ${this.current()?.location.line}`);
    }
    this.advance();
  }
  precedence(op) {
    const precs = {
      "||": 1,
      "&&": 2,
      "==": 3,
      "!=": 3,
      "<": 4,
      ">": 4,
      "<=": 4,
      ">=": 4,
      "+": 5,
      "-": 5,
      "*": 6,
      "/": 6,
      "%": 6
    };
    return precs[op] ?? 0;
  }
  parseUnary() {
    if (this.current() && ["!", "-", "+", "~"].includes(this.current().token)) {
      const op = this.current().token;
      this.advance();
      return { kind: "unary", op, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    if (!this.current())
      throw new Error("Unexpected end of input");
    const token = this.current().token;
    if (/^[0-9]/.test(token)) {
      this.advance();
      return {
        kind: "literal",
        value: token.includes(".") ? parseFloat(token) : parseInt(token),
        type: token.includes(".") ? { kind: "primitive", primitive: "float" } : { kind: "primitive", primitive: "int" }
      };
    }
    if (token.startsWith('"')) {
      this.advance();
      return {
        kind: "literal",
        value: token.slice(1, -1),
        type: { kind: "primitive", primitive: "string" }
      };
    }
    if (token === "true" || token === "false") {
      this.advance();
      return {
        kind: "literal",
        value: token === "true",
        type: { kind: "primitive", primitive: "bool" }
      };
    }
    if (/[a-zA-Z_]/.test(token)) {
      let expr = { kind: "identifier", name: token };
      this.advance();
      while (this.current()?.token === ".") {
        this.advance();
        const property = this.current()?.token;
        if (!property)
          throw new Error("Expected property name after .");
        this.advance();
        if (this.current()?.token === "(") {
          this.advance();
          const args2 = [];
          while (this.current()?.token !== ")") {
            args2.push(this.parseUnary());
            if (this.current()?.token === ",")
              this.advance();
          }
          this.expect(")");
          expr = {
            kind: "call",
            func: { kind: "member", object: expr, property },
            args: args2
          };
        } else {
          expr = { kind: "member", object: expr, property };
        }
      }
      return expr;
    }
    if (token === "(") {
      this.advance();
      const expr = this.parseBinary();
      this.expect(")");
      return expr;
    }
    throw new Error(`Unexpected token: ${token}`);
  }
  parseBinary(minPrec = 0) {
    let left = this.parseUnary();
    while (this.current() && this.precedence(this.current().token) >= minPrec) {
      const op = this.current().token;
      const prec = this.precedence(op);
      this.advance();
      const right = this.parseBinary(prec + 1);
      left = { kind: "binary", op, left, right };
    }
    return left;
  }
  parse() {
    const statements = [];
    while (this.current()) {
      statements.push(this.parseStatement());
    }
    return statements;
  }
  parseStatement() {
    const token = this.current()?.token;
    if (token === "import") {
      this.advance();
      const name = this.current().token;
      this.advance();
      this.expect("from");
      const module2 = this.current().token;
      this.advance();
      return { kind: "import", name, module: module2 };
    }
    if (token === "let" || token === "const" || token === "var") {
      const mutable = token === "var";
      this.advance();
      const name = this.current().token;
      this.advance();
      this.expect(":");
      const typeStr = this.current().token;
      this.advance();
      this.expect("=");
      const value = this.parseBinary();
      return {
        kind: "let",
        name,
        type: parseTypeAnnotation(typeStr) || { kind: "primitive", primitive: "any" },
        value,
        mutable
      };
    }
    if (token === "func") {
      this.advance();
      const name = this.current().token;
      this.advance();
      this.expect("(");
      const params = [];
      while (this.current()?.token !== ")") {
        const pname = this.current().token;
        this.advance();
        this.expect(":");
        const ptype = this.current().token;
        this.advance();
        params.push({
          name: pname,
          type: parseTypeAnnotation(ptype) || { kind: "primitive", primitive: "any" }
        });
        if (this.current()?.token === ",")
          this.advance();
      }
      this.expect(")");
      this.expect("=>");
      const returnTypeStr = this.current().token;
      this.advance();
      this.expect("{");
      const body = [];
      while (this.current()?.token !== "}") {
        body.push(this.parseStatement());
      }
      this.expect("}");
      return {
        kind: "function",
        name,
        params,
        returnType: parseTypeAnnotation(returnTypeStr) || { kind: "primitive", primitive: "any" },
        body
      };
    }
    if (token === "return") {
      this.advance();
      const value = this.current() ? this.parseBinary() : void 0;
      return { kind: "return", value };
    }
    if (token === "if") {
      this.advance();
      this.expect("(");
      const condition = this.parseBinary();
      this.expect(")");
      this.expect("{");
      const then = [];
      while (this.current()?.token !== "}") {
        then.push(this.parseStatement());
      }
      this.expect("}");
      return { kind: "if", condition, then };
    }
    if (token === "while") {
      this.advance();
      this.expect("(");
      const condition = this.parseBinary();
      this.expect(")");
      this.expect("{");
      const body = [];
      while (this.current()?.token !== "}") {
        body.push(this.parseStatement());
      }
      this.expect("}");
      return { kind: "while", condition, body };
    }
    if (token === "break") {
      this.advance();
      return { kind: "break" };
    }
    if (token === "continue") {
      this.advance();
      return { kind: "continue" };
    }
    const expr = this.parseBinary();
    if (this.current()?.token === "=" && expr.kind === "identifier") {
      const target = expr.name;
      this.advance();
      const value = this.parseBinary();
      return { kind: "assignment", target, value };
    }
    return { kind: "expression", expr };
  }
};
var TypeChecker = class {
  constructor() {
    this.env = {
      vars: /* @__PURE__ */ new Map(),
      functions: /* @__PURE__ */ new Map()
    };
    this.modules = /* @__PURE__ */ new Map();
  }
  check(statements) {
    for (const stmt of statements) {
      this.checkStatement(stmt);
    }
  }
  checkStatement(stmt) {
    switch (stmt.kind) {
      case "let":
        this.env.vars.set(stmt.name, {
          type: stmt.type,
          mutable: stmt.mutable
        });
        this.checkExpression(stmt.value, stmt.type);
        break;
      case "function":
        this.env.functions.set(stmt.name, {
          params: stmt.params.map((p) => p.type),
          returnType: stmt.returnType
        });
        const oldEnv = this.env;
        this.env = { vars: /* @__PURE__ */ new Map(), functions: /* @__PURE__ */ new Map(), parent: oldEnv };
        for (const param of stmt.params) {
          this.env.vars.set(param.name, {
            type: param.type,
            mutable: false
          });
        }
        for (const s of stmt.body) {
          this.checkStatement(s);
        }
        this.env = oldEnv;
        break;
      case "if":
        this.checkExpression(stmt.condition, { kind: "primitive", primitive: "bool" });
        for (const s of stmt.then) {
          this.checkStatement(s);
        }
        if (stmt.else) {
          for (const s of stmt.else) {
            this.checkStatement(s);
          }
        }
        break;
      case "while":
        this.checkExpression(stmt.condition, { kind: "primitive", primitive: "bool" });
        for (const s of stmt.body) {
          this.checkStatement(s);
        }
        break;
      case "expression":
        this.checkExpression(stmt.expr, { kind: "primitive", primitive: "any" });
        break;
      case "import":
        break;
    }
  }
  checkExpression(expr, expectedType) {
    const actualType = this.inferType(expr);
    if (!typeCompatible(actualType, expectedType)) {
      throw new Error(`Type mismatch: expected ${JSON.stringify(expectedType)}, got ${JSON.stringify(actualType)}`);
    }
  }
  inferType(expr) {
    switch (expr.kind) {
      case "literal":
        return expr.type;
      case "identifier":
        return this.env.vars.get(expr.name)?.type || { kind: "primitive", primitive: "any" };
      case "binary":
        if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(expr.op)) {
          return { kind: "primitive", primitive: "bool" };
        }
        return this.inferType(expr.left);
      case "unary":
        if (expr.op === "!")
          return { kind: "primitive", primitive: "bool" };
        return this.inferType(expr.operand);
      default:
        return { kind: "primitive", primitive: "any" };
    }
  }
};
var Environment = class {
  constructor() {
    this.vars = /* @__PURE__ */ new Map();
    this.functions = /* @__PURE__ */ new Map();
    this.modules = /* @__PURE__ */ new Map();
    this.parent = null;
  }
  set(name, value, mutable = false) {
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
  update(name, value) {
    if (this.vars.has(name)) {
      const entry = this.vars.get(name);
      if (!entry.mutable) {
        throw new Error(`Cannot reassign immutable variable: ${name}`);
      }
      entry.value = value;
      return;
    }
    if (this.parent) {
      this.parent.update(name, value);
      return;
    }
    throw new Error(`Undefined variable: ${name}`);
  }
  setFunction(name, params, body) {
    this.functions.set(name, { params, body });
  }
  getFunction(name) {
    if (this.functions.has(name)) {
      return this.functions.get(name);
    }
    if (this.parent)
      return this.parent.getFunction(name);
    return null;
  }
  setModule(name, module2) {
    this.modules.set(name, module2);
  }
  getModule(name) {
    if (this.modules.has(name)) {
      return this.modules.get(name);
    }
    if (this.parent)
      return this.parent.getModule(name);
    return null;
  }
};
var Interpreter = class {
  constructor() {
    this.env = new Environment();
    this.controlFlow = { type: null };
    this.setupStdlib();
  }
  setupStdlib() {
    const ioModule = {
      print: (value) => {
        console.log(value);
        return null;
      },
      println: (value) => {
        console.log(value);
        return null;
      }
    };
    this.env.setModule("std::io", ioModule);
    this.env.setModule("str", ioModule);
    this.env.setModule("std::math", {
      sqrt: (x) => Math.sqrt(x),
      sin: (x) => Math.sin(x),
      cos: (x) => Math.cos(x),
      tan: (x) => Math.tan(x),
      asin: (x) => Math.asin(x),
      acos: (x) => Math.acos(x),
      atan: (x) => Math.atan(x),
      exp: (x) => Math.exp(x),
      log: (x) => Math.log(x),
      log10: (x) => Math.log10(x),
      log2: (x) => Math.log2(x),
      floor: (x) => Math.floor(x),
      ceil: (x) => Math.ceil(x),
      round: (x) => Math.round(x),
      abs: (x) => Math.abs(x),
      pow: (x, y) => Math.pow(x, y),
      max: (...args2) => Math.max(...args2),
      min: (...args2) => Math.min(...args2),
      gcd: (a, b) => {
        let x = Math.abs(a), y = Math.abs(b);
        while (y)
          [x, y] = [y, x % y];
        return x;
      },
      PI: Math.PI,
      E: Math.E
    });
    this.env.setModule("std::text", {
      split: (s, sep) => s.split(sep),
      join: (arr, sep) => arr.join(sep),
      trim: (s) => s.trim(),
      toUpperCase: (s) => s.toUpperCase(),
      toLowerCase: (s) => s.toLowerCase(),
      startsWith: (s, prefix) => s.startsWith(prefix),
      endsWith: (s, suffix) => s.endsWith(suffix),
      includes: (s, substr) => s.includes(substr),
      indexOf: (s, substr) => s.indexOf(substr),
      replace: (s, old, newStr) => s.replace(old, newStr),
      replaceAll: (s, old, newStr) => s.replaceAll(old, newStr),
      substring: (s, start, end) => s.substring(start, end),
      substr: (s, start, length) => s.substr(start, length),
      slice: (s, start, end) => s.slice(start, end),
      repeat: (s, count) => s.repeat(count),
      length: (s) => s.length,
      charAt: (s, index) => s.charAt(index),
      charCodeAt: (s, index) => s.charCodeAt(index)
    });
    this.env.setModule("std::list", {
      map: (arr, fn) => arr.map(fn),
      filter: (arr, fn) => arr.filter(fn),
      reduce: (arr, fn, init) => arr.reduce(fn, init),
      forEach: (arr, fn) => {
        arr.forEach(fn);
      },
      find: (arr, fn) => arr.find(fn),
      findIndex: (arr, fn) => arr.findIndex(fn),
      some: (arr, fn) => arr.some(fn),
      every: (arr, fn) => arr.every(fn),
      includes: (arr, item) => arr.includes(item),
      indexOf: (arr, item) => arr.indexOf(item),
      push: (arr, item) => {
        arr.push(item);
        return arr;
      },
      pop: (arr) => arr.pop(),
      shift: (arr) => arr.shift(),
      unshift: (arr, item) => {
        arr.unshift(item);
        return arr;
      },
      reverse: (arr) => {
        arr.reverse();
        return arr;
      },
      sort: (arr, fn) => {
        arr.sort(fn);
        return arr;
      },
      concat: (arr, ...others) => arr.concat(...others),
      flat: (arr, depth) => arr.flat(depth),
      length: (arr) => arr.length
    });
    this.env.setModule("std::map", {
      keys: (obj) => Object.keys(obj),
      values: (obj) => Object.values(obj),
      entries: (obj) => Object.entries(obj),
      has: (obj, key) => key in obj,
      get: (obj, key) => obj[key],
      set: (obj, key, value) => {
        obj[key] = value;
        return obj;
      },
      delete: (obj, key) => {
        delete obj[key];
        return obj;
      },
      clear: (obj) => {
        for (let k in obj)
          delete obj[k];
        return obj;
      },
      length: (obj) => Object.keys(obj).length,
      assign: (target, ...sources) => Object.assign(target, ...sources)
    });
    this.env.setModule("std::type", {
      typeof: (x) => typeof x,
      isArray: (x) => Array.isArray(x),
      isObject: (x) => x !== null && typeof x === "object",
      isNull: (x) => x === null,
      isUndefined: (x) => x === void 0,
      isNumber: (x) => typeof x === "number",
      isString: (x) => typeof x === "string",
      isBoolean: (x) => typeof x === "boolean",
      isNaN: (x) => isNaN(x),
      isFinite: (x) => isFinite(x),
      isInteger: (x) => Number.isInteger(x),
      toNumber: (x) => Number(x),
      toString: (x) => String(x),
      toBoolean: (x) => Boolean(x),
      toInt: (x) => Math.floor(Number(x)),
      toFloat: (x) => parseFloat(String(x))
    });
    this.env.setModule("std::file", {
      read: (path) => {
        try {
          return fs.readFileSync(path, "utf-8");
        } catch {
          return null;
        }
      },
      write: (path, content) => {
        try {
          fs.writeFileSync(path, content);
          return true;
        } catch {
          return false;
        }
      },
      append: (path, content) => {
        try {
          fs.appendFileSync(path, content);
          return true;
        } catch {
          return false;
        }
      },
      exists: (path) => fs.existsSync(path),
      delete: (path) => {
        try {
          fs.unlinkSync(path);
          return true;
        } catch {
          return false;
        }
      },
      isFile: (path) => {
        try {
          return fs.statSync(path).isFile();
        } catch {
          return false;
        }
      },
      isDirectory: (path) => {
        try {
          return fs.statSync(path).isDirectory();
        } catch {
          return false;
        }
      },
      mkdir: (path) => {
        try {
          fs.mkdirSync(path, { recursive: true });
          return true;
        } catch {
          return false;
        }
      }
    });
    this.env.setModule("std::regex", {
      match: (str, pattern, flags) => {
        try {
          const m = str.match(new RegExp(pattern, flags ?? ""));
          return m ?? null;
        } catch {
          return null;
        }
      },
      test: (str, pattern, flags) => {
        try {
          return new RegExp(pattern, flags ?? "").test(str);
        } catch {
          return false;
        }
      },
      search: (str, pattern, flags) => {
        try {
          return str.search(new RegExp(pattern, flags ?? ""));
        } catch {
          return -1;
        }
      },
      replace: (str, pattern, replacement, flags) => {
        try {
          return str.replace(new RegExp(pattern, flags ?? "g"), replacement);
        } catch {
          return str;
        }
      }
    });
    this.env.setModule("std::time", {
      now: () => (/* @__PURE__ */ new Date()).getTime(),
      timestamp: () => Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3),
      getDate: (ms) => new Date(ms).getDate(),
      getMonth: (ms) => new Date(ms).getMonth() + 1,
      getYear: (ms) => new Date(ms).getFullYear(),
      getHours: (ms) => new Date(ms).getHours(),
      getMinutes: (ms) => new Date(ms).getMinutes(),
      getSeconds: (ms) => new Date(ms).getSeconds()
    });
    this.env.setModule("std::set", {
      create: () => /* @__PURE__ */ new Set(),
      add: (set, item) => {
        set.add(item);
        return set;
      },
      remove: (set, item) => {
        set.delete(item);
        return set;
      },
      has: (set, item) => set.has(item),
      size: (set) => set.size,
      clear: (set) => {
        set.clear();
        return set;
      },
      union: (set1, set2) => /* @__PURE__ */ new Set([...set1, ...set2]),
      intersection: (set1, set2) => new Set([...set1].filter((x) => set2.has(x))),
      difference: (set1, set2) => new Set([...set1].filter((x) => !set2.has(x)))
    });
  }
  interpret(statements) {
    for (const stmt of statements) {
      this.interpretStatement(stmt);
      if (this.controlFlow.type)
        break;
    }
  }
  interpretStatement(stmt) {
    switch (stmt.kind) {
      case "let":
        const value = this.evaluateExpression(stmt.value);
        this.env.set(stmt.name, value, stmt.mutable);
        break;
      case "assignment":
        const newValue = this.evaluateExpression(stmt.value);
        this.env.update(stmt.target, newValue);
        break;
      case "expression":
        this.evaluateExpression(stmt.expr);
        break;
      case "if":
        const condition = this.evaluateExpression(stmt.condition);
        if (condition) {
          for (const s of stmt.then) {
            this.interpretStatement(s);
            if (this.controlFlow.type)
              return;
          }
        } else if (stmt.else) {
          for (const s of stmt.else) {
            this.interpretStatement(s);
            if (this.controlFlow.type)
              return;
          }
        }
        break;
      case "while":
        while (this.evaluateExpression(stmt.condition)) {
          for (const s of stmt.body) {
            this.interpretStatement(s);
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
      case "for":
        this.interpretStatement(stmt.init);
        while (this.evaluateExpression(stmt.condition)) {
          for (const s of stmt.body) {
            this.interpretStatement(s);
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
          this.interpretStatement(stmt.update);
        }
        break;
      case "return":
        this.controlFlow.value = stmt.value ? this.evaluateExpression(stmt.value) : null;
        this.controlFlow.type = "return";
        break;
      case "break":
        this.controlFlow.type = "break";
        break;
      case "continue":
        this.controlFlow.type = "continue";
        break;
      case "function":
        this.env.setFunction(stmt.name, [
          ...stmt.params.map((p) => p.name)
        ], stmt.body);
        break;
      case "import":
        const module2 = this.env.getModule(stmt.module);
        if (!module2) {
          throw new Error(`Module not found: ${stmt.module}`);
        }
        this.env.set(stmt.name, module2, false);
        break;
    }
  }
  evaluateExpression(expr) {
    switch (expr.kind) {
      case "literal":
        return expr.value;
      case "identifier":
        return this.env.get(expr.name);
      case "binary":
        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);
        switch (expr.op) {
          case "+":
            return left + right;
          case "-":
            return left - right;
          case "*":
            return left * right;
          case "/":
            return left / right;
          case "%":
            return left % right;
          case "==":
            return left === right;
          case "!=":
            return left !== right;
          case "<":
            return left < right;
          case ">":
            return left > right;
          case "<=":
            return left <= right;
          case ">=":
            return left >= right;
          case "&&":
            return left && right;
          case "||":
            return left || right;
          default:
            return null;
        }
      case "unary":
        const operand = this.evaluateExpression(expr.operand);
        switch (expr.op) {
          case "-":
            return -operand;
          case "+":
            return +operand;
          case "!":
            return !operand;
          case "~":
            return ~operand;
          default:
            return null;
        }
      case "call":
        const func = this.evaluateExpression(expr.func);
        const args2 = expr.args.map((a) => this.evaluateExpression(a));
        if (expr.func.kind === "identifier" && expr.func.name in BUILTIN_FUNCTIONS) {
          return BUILTIN_FUNCTIONS[expr.func.name](args2);
        }
        if (typeof func === "function") {
          return func(...args2);
        }
        throw new Error("Not a function");
      case "member":
        const obj = this.evaluateExpression(expr.object);
        return obj?.[expr.property];
    }
  }
};
var CGenerator = class {
  constructor() {
    this.code = [];
  }
  generate(statements) {
    this.code = [];
    this.code.push("#include <stdio.h>");
    this.code.push("#include <math.h>");
    this.code.push("int main() {");
    for (const stmt of statements) {
      this.generateStatement(stmt);
    }
    this.code.push("return 0;");
    this.code.push("}");
    return this.code.join("\n");
  }
  generateStatement(stmt) {
    switch (stmt.kind) {
      case "let":
        const ctype = this.typeToCString(stmt.type);
        const value = this.generateExpression(stmt.value);
        this.code.push(`${ctype} ${stmt.name} = ${value};`);
        break;
      case "expression":
        const expr = this.generateExpression(stmt.expr);
        this.code.push(`${expr};`);
        break;
      case "if":
        const condition = this.generateExpression(stmt.condition);
        this.code.push(`if (${condition}) {`);
        for (const s of stmt.then) {
          this.generateStatement(s);
        }
        this.code.push("}");
        break;
      case "return":
        const value2 = stmt.value ? this.generateExpression(stmt.value) : "0";
        this.code.push(`return ${value2};`);
        break;
    }
  }
  generateExpression(expr) {
    switch (expr.kind) {
      case "literal":
        if (typeof expr.value === "string") {
          return `"${expr.value}"`;
        }
        return String(expr.value);
      case "identifier":
        return expr.name;
      case "binary":
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        return `(${left} ${expr.op} ${right})`;
      case "unary":
        const operand = this.generateExpression(expr.operand);
        return `(${expr.op}${operand})`;
      case "call":
        const func = this.generateExpression(expr.func);
        const args2 = expr.args.map((a) => this.generateExpression(a));
        return `${func}(${args2.join(", ")})`;
      case "member":
        const obj = this.generateExpression(expr.object);
        return `${obj}.${expr.property}`;
      default:
        return "";
    }
  }
  typeToCString(type) {
    if (type.kind === "primitive") {
      switch (type.primitive) {
        case "int":
          return "int";
        case "float":
          return "double";
        case "bool":
          return "int";
        case "char":
          return "char";
        case "string":
          return "char*";
        default:
          return "int";
      }
    }
    return "int";
  }
};
var args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: strata <file.str>");
  process.exit(1);
}
var startTime = performance.now();
var filePath = args[0];
var source = fs.readFileSync(filePath, "utf-8");
try {
  const parser = new Parser(source);
  const statements = parser.parse();
  const typeChecker = new TypeChecker();
  typeChecker.check(statements);
  const interpreter = new Interpreter();
  interpreter.interpret(statements);
  const generator = new CGenerator();
  const cCode = generator.generate(statements);
  fs.writeFileSync("out.c", cCode);
  const endTime = performance.now();
  const elapsed = (endTime - startTime).toFixed(2);
  console.error(`Executed in ${elapsed}ms`);
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
