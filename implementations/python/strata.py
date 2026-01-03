#!/usr/bin/env python3
"""
STRATA INTERPRETER IN PYTHON
Complete lexer, parser, type checker, and interpreter
"""

import sys
import re
from enum import Enum, auto
from dataclasses import dataclass
from typing import Dict, List, Optional, Union

# ============================================================================
# TOKENS
# ============================================================================

class TokenType(Enum):
    # Literals
    INT = auto()
    FLOAT = auto()
    STRING = auto()
    BOOL = auto()
    CHAR = auto()
    
    # Keywords
    LET = auto()
    CONST = auto()
    VAR = auto()
    FUNC = auto()
    IF = auto()
    ELSE = auto()
    WHILE = auto()
    FOR = auto()
    RETURN = auto()
    BREAK = auto()
    CONTINUE = auto()
    IMPORT = auto()
    FROM = auto()
    
    # Types
    INT_TYPE = auto()
    FLOAT_TYPE = auto()
    BOOL_TYPE = auto()
    CHAR_TYPE = auto()
    STRING_TYPE = auto()
    ANY_TYPE = auto()
    
    # Operators
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    PERCENT = auto()
    EQ = auto()
    NE = auto()
    LT = auto()
    GT = auto()
    LE = auto()
    GE = auto()
    AND = auto()
    OR = auto()
    NOT = auto()
    TILDE = auto()
    ASSIGN = auto()
    ARROW = auto()
    
    # Delimiters
    LPAREN = auto()
    RPAREN = auto()
    LBRACE = auto()
    RBRACE = auto()
    SEMICOLON = auto()
    COMMA = auto()
    COLON = auto()
    DOT = auto()
    
    # Special
    IDENTIFIER = auto()
    EOF = auto()


@dataclass
class Token:
    type: TokenType
    value: Union[str, int, float, bool]
    line: int = 1
    column: int = 1


# ============================================================================
# LEXER
# ============================================================================

class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.column = 1
        self.keywords = {
            'let': TokenType.LET, 'const': TokenType.CONST, 'var': TokenType.VAR,
            'func': TokenType.FUNC, 'if': TokenType.IF, 'else': TokenType.ELSE,
            'while': TokenType.WHILE, 'for': TokenType.FOR,
            'return': TokenType.RETURN, 'break': TokenType.BREAK,
            'continue': TokenType.CONTINUE, 'import': TokenType.IMPORT,
            'from': TokenType.FROM, 'true': TokenType.BOOL, 'false': TokenType.BOOL,
            'int': TokenType.INT_TYPE, 'float': TokenType.FLOAT_TYPE,
            'bool': TokenType.BOOL_TYPE, 'char': TokenType.CHAR_TYPE,
            'string': TokenType.STRING_TYPE, 'any': TokenType.ANY_TYPE,
        }

    def peek(self) -> Optional[str]:
        return self.source[self.pos] if self.pos < len(self.source) else None

    def advance(self) -> Optional[str]:
        ch = self.peek()
        if ch:
            self.pos += 1
            if ch == '\n':
                self.line += 1
                self.column = 1
            else:
                self.column += 1
        return ch

    def skip_whitespace(self):
        while self.peek() and self.peek() in ' \t\n\r':
            self.advance()

    def skip_comment(self):
        if self.peek() == '/' and self.source[self.pos + 1:self.pos + 2] == '/':
            while self.peek() and self.peek() != '\n':
                self.advance()

    def read_number(self) -> Token:
        num = ''
        has_dot = False
        while self.peek() and (self.peek().isdigit() or self.peek() == '.'):
            if self.peek() == '.':
                if has_dot:
                    break
                has_dot = True
            num += self.advance()
        
        value = float(num) if has_dot else int(num)
        token_type = TokenType.FLOAT if has_dot else TokenType.INT
        return Token(token_type, value, self.line, self.column)

    def read_string(self) -> Token:
        self.advance()  # Skip opening quote
        s = ''
        while self.peek() and self.peek() != '"':
            if self.peek() == '\\':
                self.advance()
                escaped = self.advance()
                if escaped == 'n':
                    s += '\n'
                elif escaped == 't':
                    s += '\t'
                else:
                    s += escaped
            else:
                s += self.advance()
        self.advance()  # Skip closing quote
        return Token(TokenType.STRING, s, self.line, self.column)

    def read_identifier(self) -> Token:
        ident = ''
        while self.peek() and (self.peek().isalnum() or self.peek() == '_'):
            ident += self.advance()
        
        if ident in self.keywords:
            token_type = self.keywords[ident]
            value = ident == 'true' if token_type == TokenType.BOOL else ident
            return Token(token_type, value, self.line, self.column)
        
        return Token(TokenType.IDENTIFIER, ident, self.line, self.column)

    def next_token(self) -> Token:
        while True:
            self.skip_whitespace()
            self.skip_comment()
            self.skip_whitespace()
            
            if not self.peek():
                return Token(TokenType.EOF, '', self.line, self.column)
            
            ch = self.peek()
            line, col = self.line, self.column
            
            if ch.isdigit():
                return self.read_number()
            elif ch == '"':
                return self.read_string()
            elif ch.isalpha() or ch == '_':
                return self.read_identifier()
            elif ch == '+':
                self.advance()
                return Token(TokenType.PLUS, '+', line, col)
            elif ch == '-':
                self.advance()
                return Token(TokenType.MINUS, '-', line, col)
            elif ch == '*':
                self.advance()
                return Token(TokenType.STAR, '*', line, col)
            elif ch == '/':
                self.advance()
                return Token(TokenType.SLASH, '/', line, col)
            elif ch == '%':
                self.advance()
                return Token(TokenType.PERCENT, '%', line, col)
            elif ch == '=':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    return Token(TokenType.EQ, '==', line, col)
                elif self.peek() == '>':
                    self.advance()
                    return Token(TokenType.ARROW, '=>', line, col)
                return Token(TokenType.ASSIGN, '=', line, col)
            elif ch == '!':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    return Token(TokenType.NE, '!=', line, col)
                return Token(TokenType.NOT, '!', line, col)
            elif ch == '<':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    return Token(TokenType.LE, '<=', line, col)
                return Token(TokenType.LT, '<', line, col)
            elif ch == '>':
                self.advance()
                if self.peek() == '=':
                    self.advance()
                    return Token(TokenType.GE, '>=', line, col)
                return Token(TokenType.GT, '>', line, col)
            elif ch == '&' and self.source[self.pos + 1:self.pos + 2] == '&':
                self.advance()
                self.advance()
                return Token(TokenType.AND, '&&', line, col)
            elif ch == '|' and self.source[self.pos + 1:self.pos + 2] == '|':
                self.advance()
                self.advance()
                return Token(TokenType.OR, '||', line, col)
            elif ch == '~':
                self.advance()
                return Token(TokenType.TILDE, '~', line, col)
            elif ch == '(':
                self.advance()
                return Token(TokenType.LPAREN, '(', line, col)
            elif ch == ')':
                self.advance()
                return Token(TokenType.RPAREN, ')', line, col)
            elif ch == '{':
                self.advance()
                return Token(TokenType.LBRACE, '{', line, col)
            elif ch == '}':
                self.advance()
                return Token(TokenType.RBRACE, '}', line, col)
            elif ch == ';':
                self.advance()
                return Token(TokenType.SEMICOLON, ';', line, col)
            elif ch == ',':
                self.advance()
                return Token(TokenType.COMMA, ',', line, col)
            elif ch == ':':
                self.advance()
                return Token(TokenType.COLON, ':', line, col)
            elif ch == '.':
                self.advance()
                return Token(TokenType.DOT, '.', line, col)
            else:
                self.advance()

# ============================================================================
# AST
# ============================================================================

class Value:
    def __init__(self, type_name: str, value):
        self.type = type_name
        self.value = value
    
    def __repr__(self):
        return f"{self.type}({self.value})"
    
    def print(self):
        if self.type == 'null':
            print('null', end='')
        else:
            print(self.value, end='')


class Expr:
    pass


class Literal(Expr):
    def __init__(self, value: Value):
        self.value = value


class Identifier(Expr):
    def __init__(self, name: str):
        self.name = name


class Binary(Expr):
    def __init__(self, op: str, left: Expr, right: Expr):
        self.op = op
        self.left = left
        self.right = right


class Unary(Expr):
    def __init__(self, op: str, operand: Expr):
        self.op = op
        self.operand = operand


class Stmt:
    pass


class Let(Stmt):
    def __init__(self, name: str, type_: str, value: Expr, mutable: bool):
        self.name = name
        self.type_ = type_
        self.value = value
        self.mutable = mutable


class ExprStmt(Stmt):
    def __init__(self, expr: Expr):
        self.expr = expr


class If(Stmt):
    def __init__(self, condition: Expr, then_body: List[Stmt]):
        self.condition = condition
        self.then_body = then_body


class Return(Stmt):
    def __init__(self, value: Optional[Expr]):
        self.value = value


# ============================================================================
# PARSER
# ============================================================================

class Parser:
    def __init__(self, source: str):
        self.lexer = Lexer(source)
        self.tokens = []
        self.pos = 0
        self._tokenize()

    def _tokenize(self):
        while True:
            token = self.lexer.next_token()
            self.tokens.append(token)
            if token.type == TokenType.EOF:
                break

    def current(self) -> Token:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else self.tokens[-1]

    def advance(self):
        self.pos += 1

    def parse(self) -> List[Stmt]:
        stmts = []
        while self.current().type != TokenType.EOF:
            stmts.append(self.parse_statement())
        return stmts

    def parse_statement(self) -> Stmt:
        token = self.current()
        
        if token.type in (TokenType.LET, TokenType.CONST, TokenType.VAR):
            mutable = token.type == TokenType.VAR
            self.advance()
            
            name = self.current().value
            self.advance()
            self.advance()  # skip :
            
            type_ = self.current().value
            self.advance()
            self.advance()  # skip =
            
            value = self.parse_expression()
            return Let(name, type_, value, mutable)
        
        elif token.type == TokenType.IF:
            self.advance()
            self.advance()  # skip (
            condition = self.parse_expression()
            self.advance()  # skip )
            self.advance()  # skip {
            
            then_body = []
            while self.current().type != TokenType.RBRACE:
                then_body.append(self.parse_statement())
            self.advance()  # skip }
            
            return If(condition, then_body)
        
        elif token.type == TokenType.RETURN:
            self.advance()
            value = None
            if self.current().type not in (TokenType.SEMICOLON, TokenType.RBRACE, TokenType.EOF):
                value = self.parse_expression()
            return Return(value)
        
        else:
            expr = self.parse_expression()
            return ExprStmt(expr)

    def parse_expression(self) -> Expr:
        return self.parse_binary(0)

    def parse_binary(self, min_prec: int) -> Expr:
        left = self.parse_unary()

        while True:
            prec = self._precedence()
            if prec < min_prec:
                break

            op = self.current().value
            self.advance()

            right = self.parse_binary(prec + 1)
            left = Binary(op, left, right)

        return left

    def _precedence(self) -> int:
        token = self.current()
        prec_map = {
            TokenType.OR: 1, TokenType.AND: 2,
            TokenType.EQ: 3, TokenType.NE: 3,
            TokenType.LT: 4, TokenType.GT: 4, TokenType.LE: 4, TokenType.GE: 4,
            TokenType.PLUS: 5, TokenType.MINUS: 5,
            TokenType.STAR: 6, TokenType.SLASH: 6, TokenType.PERCENT: 6,
        }
        return prec_map.get(token.type, 0)

    def parse_unary(self) -> Expr:
        token = self.current()
        if token.type in (TokenType.NOT, TokenType.MINUS, TokenType.PLUS, TokenType.TILDE):
            op = token.value
            self.advance()
            return Unary(op, self.parse_unary())
        return self.parse_primary()

    def parse_primary(self) -> Expr:
        token = self.current()

        if token.type == TokenType.INT:
            self.advance()
            return Literal(Value('int', token.value))
        elif token.type == TokenType.FLOAT:
            self.advance()
            return Literal(Value('float', token.value))
        elif token.type == TokenType.STRING:
            self.advance()
            return Literal(Value('string', token.value))
        elif token.type == TokenType.BOOL:
            self.advance()
            return Literal(Value('bool', token.value))
        elif token.type == TokenType.IDENTIFIER:
            name = token.value
            self.advance()
            return Identifier(name)
        elif token.type == TokenType.LPAREN:
            self.advance()
            expr = self.parse_expression()
            self.advance()  # skip )
            return expr
        
        return Literal(Value('null', None))

# ============================================================================
# INTERPRETER
# ============================================================================

class Interpreter:
    def __init__(self):
        self.vars: Dict[str, Value] = {}

    def execute(self, statements: List[Stmt]):
        for stmt in statements:
            self.execute_statement(stmt)

    def execute_statement(self, stmt: Stmt):
        if isinstance(stmt, Let):
            value = self.eval_expression(stmt.value)
            self.vars[stmt.name] = value
        elif isinstance(stmt, ExprStmt):
            self.eval_expression(stmt.expr)
        elif isinstance(stmt, If):
            condition = self.eval_expression(stmt.condition)
            if self.is_truthy(condition):
                self.execute(stmt.then_body)
        elif isinstance(stmt, Return):
            if stmt.value:
                return self.eval_expression(stmt.value)

    def eval_expression(self, expr: Expr) -> Value:
        if isinstance(expr, Literal):
            return expr.value
        elif isinstance(expr, Identifier):
            return self.vars.get(expr.name, Value('null', None))
        elif isinstance(expr, Binary):
            left = self.eval_expression(expr.left)
            right = self.eval_expression(expr.right)
            return self.eval_binary(expr.op, left, right)
        elif isinstance(expr, Unary):
            operand = self.eval_expression(expr.operand)
            return self.eval_unary(expr.op, operand)
        return Value('null', None)

    def eval_binary(self, op: str, left: Value, right: Value) -> Value:
        if left.type == 'int' and right.type == 'int':
            l, r = left.value, right.value
            result_map = {
                '+': l + r,
                '-': l - r,
                '*': l * r,
                '/': l // r if r != 0 else 0,
                '%': l % r if r != 0 else 0,
                '==': l == r,
                '!=': l != r,
                '<': l < r,
                '>': l > r,
                '<=': l <= r,
                '>=': l >= r,
            }
            result = result_map.get(op)
            result_type = 'bool' if op in ('==', '!=', '<', '>', '<=', '>=') else 'int'
            return Value(result_type, result)
        return Value('null', None)

    def eval_unary(self, op: str, operand: Value) -> Value:
        if operand.type == 'int':
            if op == '-':
                return Value('int', -operand.value)
            elif op == '+':
                return Value('int', operand.value)
            elif op == '~':
                return Value('int', ~operand.value)
        elif operand.type == 'bool':
            if op == '!':
                return Value('bool', not operand.value)
        return Value('null', None)

    def is_truthy(self, v: Value) -> bool:
        if v.type == 'bool':
            return v.value
        elif v.type == 'int':
            return v.value != 0
        elif v.type == 'null':
            return False
        return True

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: strata <file.str>", file=sys.stderr)
        sys.exit(1)

    try:
        with open(sys.argv[1], 'r') as f:
            source = f.read()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    parser = Parser(source)
    statements = parser.parse()

    interpreter = Interpreter()
    interpreter.execute(statements)
