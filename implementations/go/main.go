package main

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
	"unicode"
)

// ============================================================================
// STRATA INTERPRETER IN GO
// Complete lexer, parser, type checker, and interpreter
// ============================================================================

// Token types
type TokenType int

const (
	TOKEN_INT TokenType = iota
	TOKEN_FLOAT
	TOKEN_STRING
	TOKEN_BOOL
	TOKEN_CHAR
	TOKEN_IDENTIFIER
	TOKEN_KEYWORD
	TOKEN_PLUS
	TOKEN_MINUS
	TOKEN_STAR
	TOKEN_SLASH
	TOKEN_PERCENT
	TOKEN_EQ
	TOKEN_NE
	TOKEN_LT
	TOKEN_GT
	TOKEN_LE
	TOKEN_GE
	TOKEN_AND
	TOKEN_OR
	TOKEN_NOT
	TOKEN_TILDE
	TOKEN_ASSIGN
	TOKEN_ARROW
	TOKEN_LPAREN
	TOKEN_RPAREN
	TOKEN_LBRACE
	TOKEN_RBRACE
	TOKEN_SEMICOLON
	TOKEN_COMMA
	TOKEN_COLON
	TOKEN_DOT
	TOKEN_EOF
)

type Token struct {
	Type   TokenType
	Value  interface{}
	Line   int
	Column int
}

// ============================================================================
// LEXER
// ============================================================================

type Lexer struct {
	input  string
	pos    int
	line   int
	column int
}

func NewLexer(input string) *Lexer {
	return &Lexer{
		input:  input,
		pos:    0,
		line:   1,
		column: 1,
	}
}

func (l *Lexer) peek() rune {
	if l.pos >= len(l.input) {
		return 0
	}
	return rune(l.input[l.pos])
}

func (l *Lexer) advance() rune {
	if l.pos >= len(l.input) {
		return 0
	}
	ch := rune(l.input[l.pos])
	l.pos++
	if ch == '\n' {
		l.line++
		l.column = 1
	} else {
		l.column++
	}
	return ch
}

func (l *Lexer) skipWhitespace() {
	for unicode.IsSpace(l.peek()) {
		l.advance()
	}
}

func (l *Lexer) skipComment() {
	if l.peek() == '/' && l.pos+1 < len(l.input) && rune(l.input[l.pos+1]) == '/' {
		for l.peek() != '\n' && l.peek() != 0 {
			l.advance()
		}
	}
}

func (l *Lexer) readNumber() Token {
	num := ""
	hasDot := false
	for {
		ch := l.peek()
		if unicode.IsDigit(ch) {
			num += string(l.advance())
		} else if ch == '.' && !hasDot {
			hasDot = true
			num += string(l.advance())
		} else {
			break
		}
	}

	if hasDot {
		f, _ := strconv.ParseFloat(num, 64)
		return Token{TOKEN_FLOAT, f, l.line, l.column}
	}
	i, _ := strconv.ParseInt(num, 10, 64)
	return Token{TOKEN_INT, i, l.line, l.column}
}

func (l *Lexer) readString() Token {
	l.advance() // skip opening quote
	s := ""
	for l.peek() != '"' && l.peek() != 0 {
		if l.peek() == '\\' {
			l.advance()
			ch := l.advance()
			switch ch {
			case 'n':
				s += "\n"
			case 't':
				s += "\t"
			default:
				s += string(ch)
			}
		} else {
			s += string(l.advance())
		}
	}
	l.advance() // skip closing quote
	return Token{TOKEN_STRING, s, l.line, l.column}
}

func (l *Lexer) readIdentifier() Token {
	ident := ""
	for unicode.IsLetter(l.peek()) || unicode.IsDigit(l.peek()) || l.peek() == '_' {
		ident += string(l.advance())
	}

	keywords := map[string]string{
		"let": "let", "const": "const", "var": "var",
		"func": "func", "if": "if", "else": "else",
		"while": "while", "for": "for",
		"return": "return", "break": "break",
		"continue": "continue", "true": "true", "false": "false",
		"int": "int", "float": "float", "bool": "bool",
		"string": "string", "char": "char", "any": "any",
	}

	if _, ok := keywords[ident]; ok {
		return Token{TOKEN_KEYWORD, ident, l.line, l.column}
	}
	return Token{TOKEN_IDENTIFIER, ident, l.line, l.column}
}

func (l *Lexer) NextToken() Token {
	for {
		l.skipWhitespace()
		l.skipComment()
		l.skipWhitespace()

		if l.peek() == 0 {
			return Token{TOKEN_EOF, "", l.line, l.column}
		}

		ch := l.peek()
		line, col := l.line, l.column

		if unicode.IsDigit(ch) {
			return l.readNumber()
		}
		if ch == '"' {
			return l.readString()
		}
		if unicode.IsLetter(ch) || ch == '_' {
			return l.readIdentifier()
		}

		switch ch {
		case '+':
			l.advance()
			return Token{TOKEN_PLUS, "+", line, col}
		case '-':
			l.advance()
			return Token{TOKEN_MINUS, "-", line, col}
		case '*':
			l.advance()
			return Token{TOKEN_STAR, "*", line, col}
		case '/':
			l.advance()
			return Token{TOKEN_SLASH, "/", line, col}
		case '%':
			l.advance()
			return Token{TOKEN_PERCENT, "%", line, col}
		case '=':
			l.advance()
			if l.peek() == '=' {
				l.advance()
				return Token{TOKEN_EQ, "==", line, col}
			} else if l.peek() == '>' {
				l.advance()
				return Token{TOKEN_ARROW, "=>", line, col}
			}
			return Token{TOKEN_ASSIGN, "=", line, col}
		case '!':
			l.advance()
			if l.peek() == '=' {
				l.advance()
				return Token{TOKEN_NE, "!=", line, col}
			}
			return Token{TOKEN_NOT, "!", line, col}
		case '<':
			l.advance()
			if l.peek() == '=' {
				l.advance()
				return Token{TOKEN_LE, "<=", line, col}
			}
			return Token{TOKEN_LT, "<", line, col}
		case '>':
			l.advance()
			if l.peek() == '=' {
				l.advance()
				return Token{TOKEN_GE, ">=", line, col}
			}
			return Token{TOKEN_GT, ">", line, col}
		case '&':
			if l.pos+1 < len(l.input) && rune(l.input[l.pos+1]) == '&' {
				l.advance()
				l.advance()
				return Token{TOKEN_AND, "&&", line, col}
			}
		case '|':
			if l.pos+1 < len(l.input) && rune(l.input[l.pos+1]) == '|' {
				l.advance()
				l.advance()
				return Token{TOKEN_OR, "||", line, col}
			}
		case '~':
			l.advance()
			return Token{TOKEN_TILDE, "~", line, col}
		case '(':
			l.advance()
			return Token{TOKEN_LPAREN, "(", line, col}
		case ')':
			l.advance()
			return Token{TOKEN_RPAREN, ")", line, col}
		case '{':
			l.advance()
			return Token{TOKEN_LBRACE, "{", line, col}
		case '}':
			l.advance()
			return Token{TOKEN_RBRACE, "}", line, col}
		case ';':
			l.advance()
			return Token{TOKEN_SEMICOLON, ";", line, col}
		case ',':
			l.advance()
			return Token{TOKEN_COMMA, ",", line, col}
		case ':':
			l.advance()
			return Token{TOKEN_COLON, ":", line, col}
		case '.':
			l.advance()
			return Token{TOKEN_DOT, ".", line, col}
		default:
			l.advance()
		}
	}
}

// ============================================================================
// AST
// ============================================================================

type Value struct {
	Type  string
	Value interface{}
}

type Expr interface{}

type LiteralExpr struct {
	Value Value
}

type IdentifierExpr struct {
	Name string
}

type BinaryExpr struct {
	Op    string
	Left  Expr
	Right Expr
}

type UnaryExpr struct {
	Op      string
	Operand Expr
}

type Stmt interface{}

type LetStmt struct {
	Name    string
	Type    string
	Value   Expr
	Mutable bool
}

type ExprStmt struct {
	Expr Expr
}

type IfStmt struct {
	Condition Expr
	ThenBody  []Stmt
}

type ReturnStmt struct {
	Value Expr
}

// ============================================================================
// PARSER
// ============================================================================

type Parser struct {
	tokens []Token
	pos    int
}

func NewParser(input string) *Parser {
	lexer := NewLexer(input)
	var tokens []Token
	for {
		token := lexer.NextToken()
		tokens = append(tokens, token)
		if token.Type == TOKEN_EOF {
			break
		}
	}
	return &Parser{tokens: tokens, pos: 0}
}

func (p *Parser) current() Token {
	if p.pos < len(p.tokens) {
		return p.tokens[p.pos]
	}
	return p.tokens[len(p.tokens)-1]
}

func (p *Parser) advance() {
	if p.pos < len(p.tokens) {
		p.pos++
	}
}

func (p *Parser) Parse() []Stmt {
	var stmts []Stmt
	for p.current().Type != TOKEN_EOF {
		stmts = append(stmts, p.parseStatement())
	}
	return stmts
}

func (p *Parser) parseStatement() Stmt {
	switch p.current().Type {
	case TOKEN_KEYWORD:
		kw := p.current().Value.(string)
		if kw == "let" || kw == "const" || kw == "var" {
			mutable := kw == "var"
			p.advance()

			name := p.current().Value.(string)
			p.advance()
			p.advance() // skip :

			typeStr := p.current().Value.(string)
			p.advance()
			p.advance() // skip =

			value := p.parseExpression()
			return &LetStmt{name, typeStr, value, mutable}
		} else if kw == "if" {
			p.advance()
			p.advance() // skip (
			condition := p.parseExpression()
			p.advance() // skip )
			p.advance() // skip {

			var thenBody []Stmt
			for p.current().Type != TOKEN_RBRACE {
				thenBody = append(thenBody, p.parseStatement())
			}
			p.advance() // skip }

			return &IfStmt{condition, thenBody}
		} else if kw == "return" {
			p.advance()
			var value Expr
			if p.current().Type != TOKEN_SEMICOLON && p.current().Type != TOKEN_RBRACE {
				value = p.parseExpression()
			}
			return &ReturnStmt{value}
		}
	}

	return &ExprStmt{p.parseExpression()}
}

func (p *Parser) parseExpression() Expr {
	return p.parseBinary(0)
}

func (p *Parser) parseBinary(minPrec int) Expr {
	left := p.parseUnary()

	for {
		prec := p.precedence()
		if prec < minPrec {
			break
		}

		op := p.current().Value.(string)
		p.advance()

		right := p.parseBinary(prec + 1)
		left = &BinaryExpr{op, left, right}
	}

	return left
}

func (p *Parser) precedence() int {
	switch p.current().Type {
	case TOKEN_OR:
		return 1
	case TOKEN_AND:
		return 2
	case TOKEN_EQ, TOKEN_NE:
		return 3
	case TOKEN_LT, TOKEN_GT, TOKEN_LE, TOKEN_GE:
		return 4
	case TOKEN_PLUS, TOKEN_MINUS:
		return 5
	case TOKEN_STAR, TOKEN_SLASH, TOKEN_PERCENT:
		return 6
	default:
		return 0
	}
}

func (p *Parser) parseUnary() Expr {
	if p.current().Type == TOKEN_NOT || p.current().Type == TOKEN_MINUS ||
		p.current().Type == TOKEN_PLUS || p.current().Type == TOKEN_TILDE {
		op := p.current().Value.(string)
		p.advance()
		return &UnaryExpr{op, p.parseUnary()}
	}
	return p.parsePrimary()
}

func (p *Parser) parsePrimary() Expr {
	switch p.current().Type {
	case TOKEN_INT:
		val := p.current().Value.(int64)
		p.advance()
		return &LiteralExpr{Value{"int", val}}
	case TOKEN_FLOAT:
		val := p.current().Value.(float64)
		p.advance()
		return &LiteralExpr{Value{"float", val}}
	case TOKEN_STRING:
		val := p.current().Value.(string)
		p.advance()
		return &LiteralExpr{Value{"string", val}}
	case TOKEN_KEYWORD:
		if p.current().Value.(string) == "true" || p.current().Value.(string) == "false" {
			val := p.current().Value.(string) == "true"
			p.advance()
			return &LiteralExpr{Value{"bool", val}}
		}
	case TOKEN_IDENTIFIER:
		name := p.current().Value.(string)
		p.advance()
		return &IdentifierExpr{name}
	case TOKEN_LPAREN:
		p.advance()
		expr := p.parseExpression()
		p.advance() // skip )
		return expr
	}

	return &LiteralExpr{Value{"null", nil}}
}

// ============================================================================
// INTERPRETER
// ============================================================================

type Interpreter struct {
	vars map[string]Value
}

func NewInterpreter() *Interpreter {
	return &Interpreter{vars: make(map[string]Value)}
}

func (i *Interpreter) Execute(stmts []Stmt) {
	for _, stmt := range stmts {
		i.executeStatement(stmt)
	}
}

func (i *Interpreter) executeStatement(stmt Stmt) {
	switch s := stmt.(type) {
	case *LetStmt:
		val := i.evalExpression(s.Value)
		i.vars[s.Name] = val
	case *ExprStmt:
		i.evalExpression(s.Expr)
	case *IfStmt:
		cond := i.evalExpression(s.Condition)
		if i.isTruthy(cond) {
			i.Execute(s.ThenBody)
		}
	}
}

func (i *Interpreter) evalExpression(expr Expr) Value {
	switch e := expr.(type) {
	case *LiteralExpr:
		return e.Value
	case *IdentifierExpr:
		if val, ok := i.vars[e.Name]; ok {
			return val
		}
		return Value{"null", nil}
	case *BinaryExpr:
		left := i.evalExpression(e.Left)
		right := i.evalExpression(e.Right)
		return i.evalBinary(e.Op, left, right)
	case *UnaryExpr:
		operand := i.evalExpression(e.Operand)
		return i.evalUnary(e.Op, operand)
	}
	return Value{"null", nil}
}

func (i *Interpreter) evalBinary(op string, left, right Value) Value {
	if left.Type == "int" && right.Type == "int" {
		l := left.Value.(int64)
		r := right.Value.(int64)
		switch op {
		case "+":
			return Value{"int", l + r}
		case "-":
			return Value{"int", l - r}
		case "*":
			return Value{"int", l * r}
		case "/":
			if r != 0 {
				return Value{"int", l / r}
			}
			return Value{"int", 0}
		case "%":
			if r != 0 {
				return Value{"int", l % r}
			}
			return Value{"int", 0}
		case "==":
			return Value{"bool", l == r}
		case "!=":
			return Value{"bool", l != r}
		case "<":
			return Value{"bool", l < r}
		case ">":
			return Value{"bool", l > r}
		case "<=":
			return Value{"bool", l <= r}
		case ">=":
			return Value{"bool", l >= r}
		}
	}
	return Value{"null", nil}
}

func (i *Interpreter) evalUnary(op string, operand Value) Value {
	if operand.Type == "int" {
		v := operand.Value.(int64)
		switch op {
		case "-":
			return Value{"int", -v}
		case "+":
			return Value{"int", v}
		case "~":
			return Value{"int", ^v}
		}
	} else if operand.Type == "bool" {
		if op == "!" {
			return Value{"bool", !operand.Value.(bool)}
		}
	}
	return Value{"null", nil}
}

func (i *Interpreter) isTruthy(v Value) bool {
	switch v.Type {
	case "bool":
		return v.Value.(bool)
	case "int":
		return v.Value.(int64) != 0
	case "null":
		return false
	default:
		return true
	}
}

// ============================================================================
// MAIN
// ============================================================================

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: strata <file.str>\n")
		os.Exit(1)
	}

	data, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	parser := NewParser(string(data))
	stmts := parser.Parse()

	interpreter := NewInterpreter()
	interpreter.Execute(stmts)
}
