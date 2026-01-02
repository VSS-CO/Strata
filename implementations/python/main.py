#!/usr/bin/env python3

import sys
import re
import os

TYPE_REGISTRY = {
    "int": {"kind": "primitive", "primitive": "int"},
    "float": {"kind": "primitive", "primitive": "float"},
    "bool": {"kind": "primitive", "primitive": "bool"},
    "char": {"kind": "primitive", "primitive": "char"},
    "string": {"kind": "primitive", "primitive": "string"},
    "any": {"kind": "primitive", "primitive": "any"}
}

def parse_type_annotation(token):
    if token in TYPE_REGISTRY:
        return TYPE_REGISTRY[token]
    
    if token.endswith("?"):
        inner = parse_type_annotation(token[:-1])
        return inner or {"kind": "primitive", "primitive": "any"}
    
    return {"kind": "primitive", "primitive": "any"}

def type_compatible(actual, expected):
    if expected.get("primitive") == "any" or actual.get("primitive") == "any":
        return True
    
    if actual.get("kind") != "primitive" or expected.get("kind") != "primitive":
        return False
    
    if actual.get("primitive") == expected.get("primitive"):
        return True
    if actual.get("primitive") == "int" and expected.get("primitive") == "float":
        return True
    if actual.get("primitive") == "char" and expected.get("primitive") == "string":
        return True
    
    return False

class Lexer:
    def __init__(self, input_str):
        self.input = input_str
        self.pos = 0
        self.line = 1
        self.column = 1
        self.line_start = 0
    
    def peek(self):
        if self.pos >= len(self.input):
            return None
        return self.input[self.pos]
    
    def advance(self):
        ch = self.peek()
        if ch is None:
            return None
        self.pos += 1
        if ch == '\n':
            self.line += 1
            self.column = 1
            self.line_start = self.pos
        else:
            self.column += 1
        return ch
    
    def get_location(self):
        return {
            "line": self.line,
            "column": self.column,
            "source": self.input[self.line_start:self.pos]
        }
    
    def next_token(self):
        while self.peek() in [' ', '\n', '\r', '\t']:
            self.advance()
        
        if self.peek() == '/' and self.pos + 1 < len(self.input) and self.input[self.pos + 1] == '/':
            while self.peek() and self.peek() != '\n':
                self.advance()
            return self.next_token()
        
        if self.peek() is None:
            return None
        
        loc = self.get_location()
        
        two_char = self.input[self.pos:self.pos + 2] if self.pos + 2 <= len(self.input) else ""
        if two_char in ["==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--"]:
            self.advance()
            self.advance()
            return {"token": two_char, "location": loc}
        
        ch = self.peek()
        if ch and (ch.isalpha() or ch == '_'):
            word = ""
            while self.peek() and (self.peek().isalnum() or self.peek() == '_'):
                word += self.advance()
            return {"token": word, "location": loc}
        
        if ch == '"':
            self.advance()
            value = ""
            while self.peek() and self.peek() != '"':
                if self.peek() == '\\':
                    self.advance()
                    next_ch = self.advance()
                    if next_ch == 'n':
                        value += '\n'
                    elif next_ch == 't':
                        value += '\t'
                    else:
                        value += next_ch
                else:
                    value += self.advance()
            if self.peek() == '"':
                self.advance()
            return {"token": f'"{value}"', "location": loc}
        
        if ch == "'":
            self.advance()
            value = ""
            while self.peek() and self.peek() != "'":
                value += self.advance()
            if self.peek() == "'":
                self.advance()
            return {"token": f"'{value}'", "location": loc}
        
        if ch and ch.isdigit():
            num = ""
            while self.peek() and self.peek().isdigit():
                num += self.advance()
            if self.peek() == '.' and self.pos + 1 < len(self.input) and self.input[self.pos + 1].isdigit():
                num += self.advance()
                while self.peek() and self.peek().isdigit():
                    num += self.advance()
            return {"token": num, "location": loc}
        
        return {"token": self.advance(), "location": loc}

class Parser:
    def __init__(self, lexer):
        self.tokens = []
        self.token_idx = 0
        while True:
            tok = lexer.next_token()
            if not tok:
                break
            self.tokens.append(tok)
    
    def current(self):
        if self.token_idx < len(self.tokens):
            return self.tokens[self.token_idx]
        return None
    
    def peek(self, offset=1):
        idx = self.token_idx + offset
        if idx < len(self.tokens):
            return self.tokens[idx]
        return None
    
    def advance(self):
        self.token_idx += 1
    
    def match(self, *tokens):
        cur = self.current()
        return cur and cur["token"] in tokens
    
    def precedence(self, op):
        precedences = {
            "||": 1,
            "&&": 2,
            "==": 3, "!=": 3,
            "<": 4, ">": 4, "<=": 4, ">=": 4,
            "+": 5, "-": 5,
            "*": 6, "/": 6, "%": 6
        }
        return precedences.get(op, 0)
    
    def parse_binary(self, min_prec=0):
        left = self.parse_unary()
        while self.current():
            prec = self.precedence(self.current()["token"])
            if prec == 0 or prec < min_prec:
                break
            
            op = self.current()["token"]
            self.advance()
            right = self.parse_binary(prec + 1)
            left = {"type": "Binary", "op": op, "left": left, "right": right}
        
        return left
    
    def parse_unary(self):
        if self.current() and self.current()["token"] in ["!", "-", "+", "~"]:
            op = self.current()["token"]
            self.advance()
            arg = self.parse_unary()
            return {"type": "Unary", "op": op, "arg": arg}
        return self.parse_primary()
    
    def parse_primary(self):
        cur = self.current()
        if not cur:
            return None
        
        try:
            val = float(cur["token"])
            self.advance()
            return {"type": "Number", "value": val}
        except ValueError:
            pass
        
        if cur["token"].startswith('"') and cur["token"].endswith('"'):
            val = cur["token"][1:-1]
            self.advance()
            return {"type": "String", "string_value": val}
        
        if cur["token"] == "true":
            self.advance()
            return {"type": "Bool", "bool_value": True}
        
        if cur["token"] == "false":
            self.advance()
            return {"type": "Bool", "bool_value": False}
        
        name = cur["token"]
        self.advance()
        
        if self.match("."):
            self.advance()
            func_name = self.current()["token"]
            self.advance()
            if self.match("("):
                self.advance()
                args = []
                while not self.match(")"):
                    args.append(self.parse_unary())
                    if self.match(","):
                        self.advance()
                self.advance()
                return {"type": "Call", "module": name, "func": func_name, "args": args}
        
        if self.match("("):
            self.advance()
            args = []
            while not self.match(")"):
                args.append(self.parse_unary())
                if self.match(","):
                    self.advance()
            self.advance()
            return {"type": "Call", "module": "", "func": name, "args": args}
        
        return {"type": "Var", "name": name}
    
    def parse_expr(self):
        return self.parse_binary(0)
    
    def parse_block(self):
        stmts = []
        while self.current() and not self.match("}"):
            stmts.append(self.parse_stmt())
        return stmts
    
    def parse_stmt(self):
        if not self.current():
            return None
        
        loc = self.current()["location"]
        
        if self.match("import"):
            self.advance()
            module_name = self.current()["token"]
            self.advance()
            if self.match("from"):
                self.advance()
                self.advance()
            return {"type": "Import", "module_name": module_name, "location": loc}
        
        if self.match("if"):
            self.advance()
            if self.match("("):
                self.advance()
            condition = self.parse_expr()
            if self.match(")"):
                self.advance()
            if self.match("{"):
                self.advance()
            then_branch = self.parse_block()
            if self.match("}"):
                self.advance()
            
            else_branch = []
            if self.match("else"):
                self.advance()
                if self.match("{"):
                    self.advance()
                    else_branch = self.parse_block()
                    if self.match("}"):
                        self.advance()
            
            return {"type": "If", "condition": condition, "then_branch": then_branch, 
                   "else_branch": else_branch, "location": loc}
        
        if self.match("while"):
            self.advance()
            if self.match("("):
                self.advance()
            condition = self.parse_expr()
            if self.match(")"):
                self.advance()
            if self.match("{"):
                self.advance()
            body = self.parse_block()
            if self.match("}"):
                self.advance()
            return {"type": "While", "condition": condition, "while_body": body, "location": loc}
        
        if self.current()["token"] in ["var", "let", "const"]:
            keyword = self.current()["token"]
            self.advance()
            var_name = self.current()["token"]
            self.advance()
            if self.match(":"):
                self.advance()
            var_type = parse_type_annotation(self.current()["token"])
            self.advance()
            
            var_val = None
            if self.match("="):
                self.advance()
                var_val = self.parse_expr()
            
            return {"type": "VarDecl", "var_name": var_name, "var_type": var_type, 
                   "var_val": var_val, "mutable": keyword == "var", "location": loc}
        
        if self.match("return"):
            self.advance()
            ret_val = None
            if not self.match("}"):
                ret_val = self.parse_expr()
            return {"type": "Return", "ret_val": ret_val, "location": loc}
        
        if self.match("break"):
            self.advance()
            return {"type": "Break", "location": loc}
        
        if self.match("continue"):
            self.advance()
            return {"type": "Continue", "location": loc}
        
        expr = self.parse_expr()
        return {"type": "ExprStmt", "stmt_expr": expr, "location": loc}
    
    def parse_program(self):
        stmts = []
        while self.current():
            stmts.append(self.parse_stmt())
        return stmts

class TypeChecker:
    def __init__(self):
        self.var_types = {}
        self.errors = []
    
    def check(self, stmts):
        for stmt in stmts:
            self.check_stmt(stmt)
        return self.errors
    
    def check_stmt(self, stmt):
        if not stmt:
            return
        
        if stmt["type"] == "VarDecl":
            if stmt.get("var_val"):
                val_type = self.infer_expr_type(stmt["var_val"])
                if not type_compatible(val_type, stmt["var_type"]):
                    self.errors.append(f"Type mismatch: cannot assign {val_type} to {stmt['var_type']}")
            self.var_types[stmt["var_name"]] = stmt["var_type"]
        elif stmt["type"] == "If":
            for s in stmt.get("then_branch", []):
                self.check_stmt(s)
            for s in stmt.get("else_branch", []):
                self.check_stmt(s)
        elif stmt["type"] == "While":
            for s in stmt.get("while_body", []):
                self.check_stmt(s)
    
    def infer_expr_type(self, expr):
        if not expr:
            return {"kind": "primitive", "primitive": "any"}
        
        expr_type = expr.get("type")
        if expr_type == "Number":
            return {"kind": "primitive", "primitive": "float"}
        elif expr_type == "String":
            return {"kind": "primitive", "primitive": "string"}
        elif expr_type == "Bool":
            return {"kind": "primitive", "primitive": "bool"}
        elif expr_type == "Var":
            return self.var_types.get(expr.get("name"), {"kind": "primitive", "primitive": "any"})
        elif expr_type == "Binary":
            if expr.get("op") in ["==", "!=", "<", ">", "<=", ">=", "&&", "||"]:
                return {"kind": "primitive", "primitive": "bool"}
            return self.infer_expr_type(expr.get("left"))
        
        return {"kind": "primitive", "primitive": "any"}

class Environment:
    def __init__(self, parent=None):
        self.vars = {}
        self.mutable = {}
        self.parent = parent
    
    def define(self, name, value, mutable=False):
        self.vars[name] = value
        self.mutable[name] = mutable
    
    def get(self, name):
        if name in self.vars:
            return self.vars[name]
        if self.parent:
            return self.parent.get(name)
        raise Exception(f"Undefined variable: {name}")
    
    def set(self, name, value):
        if name in self.vars:
            if not self.mutable[name]:
                raise Exception(f"Cannot reassign immutable variable: {name}")
            self.vars[name] = value
            return
        if self.parent:
            self.parent.set(name, value)

class Interpreter:
    def __init__(self):
        self.env = Environment()
        self.modules = {
            "io": {
                "print": lambda args: print(args[0] if args else "")
            },
            "math": {
                "sqrt": lambda args: args[0] ** 0.5,
                "pow": lambda args: args[0] ** args[1],
                "abs": lambda args: abs(args[0])
            }
        }
        self.control_flow = {}
    
    def run(self, program):
        for stmt in program:
            self.eval_stmt(stmt)
    
    def eval_stmt(self, stmt):
        if not stmt:
            return
        
        stmt_type = stmt.get("type")
        
        if stmt_type == "VarDecl":
            val = self.eval_expr(stmt.get("var_val")) if stmt.get("var_val") else None
            self.env.define(stmt["var_name"], val, stmt.get("mutable", False))
        elif stmt_type == "If":
            if self.is_truthy(self.eval_expr(stmt.get("condition"))):
                for s in stmt.get("then_branch", []):
                    self.eval_stmt(s)
            elif stmt.get("else_branch"):
                for s in stmt["else_branch"]:
                    self.eval_stmt(s)
        elif stmt_type == "While":
            while self.is_truthy(self.eval_expr(stmt.get("condition"))):
                for s in stmt.get("while_body", []):
                    self.eval_stmt(s)
                if "break" in self.control_flow:
                    break
                self.control_flow.pop("continue", None)
            self.control_flow.pop("break", None)
        elif stmt_type == "Break":
            self.control_flow["break"] = True
        elif stmt_type == "Continue":
            self.control_flow["continue"] = True
        elif stmt_type == "Return":
            self.control_flow["return"] = self.eval_expr(stmt.get("ret_val")) if stmt.get("ret_val") else None
        elif stmt_type == "ExprStmt":
            self.eval_expr(stmt.get("stmt_expr"))
    
    def eval_expr(self, expr):
        if not expr:
            return None
        
        expr_type = expr.get("type")
        
        if expr_type == "Var":
            return self.env.get(expr["name"])
        elif expr_type == "Number":
            return expr["value"]
        elif expr_type == "String":
            return expr.get("string_value", "")
        elif expr_type == "Bool":
            return expr.get("bool_value", False)
        elif expr_type == "Call":
            module_name = expr.get("module", "")
            func_name = expr.get("func", "")
            if not module_name:
                raise Exception(f"User-defined functions not yet implemented: {func_name}")
            
            mod = self.modules.get(module_name)
            if not mod:
                raise Exception(f"Module not imported: {module_name}")
            
            fn = mod.get(func_name)
            if not fn:
                raise Exception(f"Function not found: {module_name}.{func_name}")
            
            args = [self.eval_expr(a) for a in expr.get("args", [])]
            return fn(args)
        elif expr_type == "Binary":
            return self.eval_binary(expr)
        elif expr_type == "Unary":
            arg = self.eval_expr(expr.get("arg"))
            op = expr.get("op")
            if op == "-":
                return -arg
            elif op == "+":
                return arg
            elif op == "!":
                return not self.is_truthy(arg)
            elif op == "~":
                return ~int(arg)
        
        return None
    
    def eval_binary(self, expr):
        l = self.eval_expr(expr.get("left"))
        r = self.eval_expr(expr.get("right"))
        op = expr.get("op")
        
        ops = {
            "+": lambda x, y: x + y,
            "-": lambda x, y: x - y,
            "*": lambda x, y: x * y,
            "/": lambda x, y: x / y,
            "%": lambda x, y: x % y,
            "==": lambda x, y: x == y,
            "!=": lambda x, y: x != y,
            "<": lambda x, y: x < y,
            ">": lambda x, y: x > y,
            "<=": lambda x, y: x <= y,
            ">=": lambda x, y: x >= y,
            "&&": lambda x, y: self.is_truthy(x) and self.is_truthy(y),
            "||": lambda x, y: self.is_truthy(x) or self.is_truthy(y)
        }
        
        return ops[op](l, r)
    
    def is_truthy(self, value):
        return value is not None and value is not False and value != 0

class CGenerator:
    def __init__(self):
        self.lines = []
        self.indent = 0
    
    def generate(self, stmts):
        self.lines = [
            "#include <stdio.h>",
            "#include <math.h>",
            "#include <stdbool.h>",
            "",
            "int main() {"
        ]
        self.indent = 1
        
        for stmt in stmts:
            self.emit_stmt(stmt)
        
        self.indent = 0
        self.lines.extend(["  return 0;", "}"])
        return "\n".join(self.lines)
    
    def emit_stmt(self, stmt):
        if not stmt:
            return
        
        ind = "  " * self.indent
        stmt_type = stmt.get("type")
        
        if stmt_type == "VarDecl":
            type_str = self.type_to_c(stmt.get("var_type"))
            init = f" = {self.emit_expr(stmt['var_val'])}" if stmt.get("var_val") else ""
            self.lines.append(f"{ind}{type_str} {stmt['var_name']}{init};")
    
    def emit_expr(self, expr):
        if not expr:
            return "0"
        
        expr_type = expr.get("type")
        if expr_type == "Number":
            return str(expr.get("value", 0))
        elif expr_type == "String":
            return f'"{expr.get("string_value", "")}"'
        elif expr_type == "Bool":
            return "true" if expr.get("bool_value") else "false"
        elif expr_type == "Var":
            return expr.get("name", "0")
        elif expr_type == "Binary":
            l = self.emit_expr(expr.get("left"))
            r = self.emit_expr(expr.get("right"))
            return f"({l} {expr.get('op')} {r})"
        elif expr_type == "Unary":
            arg = self.emit_expr(expr.get("arg"))
            return f"{expr.get('op')}{arg}"
        
        return "0"
    
    def type_to_c(self, type_def):
        if not type_def:
            return "int"
        if type_def.get("kind") != "primitive":
            return "int"
        
        prim = type_def.get("primitive")
        type_map = {
            "int": "int",
            "float": "float",
            "bool": "bool",
            "char": "char",
            "string": "char*"
        }
        return type_map.get(prim, "int")

if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else "myprogram.str"
    
    try:
        with open(filename, 'r') as f:
            source = f.read()
    except:
        print(f"Error: Cannot open file {filename}")
        sys.exit(1)
    
    try:
        lexer = Lexer(source)
        parser = Parser(lexer)
        program = parser.parse_program()
        
        checker = TypeChecker()
        type_errors = checker.check(program)
        
        if type_errors:
            print("Type errors:")
            for e in type_errors:
                print(f"  {e}")
            sys.exit(1)
        
        interpreter = Interpreter()
        interpreter.run(program)
        
        cgen = CGenerator()
        ccode = cgen.generate(program)
        
        with open("out.c", "w") as f:
            f.write(ccode)
        
        print("C code generated: out.c")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
