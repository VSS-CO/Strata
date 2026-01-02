package main

import (
	"flag"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
)

// ============================================================================
// TYPE SYSTEM - Support for union types, primitives, interfaces, and optionals
// ============================================================================

type PrimitiveType string

const (
	IntType    PrimitiveType = "int"
	FloatType  PrimitiveType = "float"
	BoolType   PrimitiveType = "bool"
	CharType   PrimitiveType = "char"
	StringType PrimitiveType = "string"
	AnyType    PrimitiveType = "any"
)

type TypeDef struct {
	Kind      string
	Name      *string
	Primitive *string
	Types     []*TypeDef
	Fields    map[string]*TypeDef
	InnerType *TypeDef
}

type Location struct {
	Line   int
	Column int
	Source string
}

var typeRegistry = map[string]*TypeDef{
	"int":    {Kind: "primitive", Primitive: ptrStr("int")},
	"float":  {Kind: "primitive", Primitive: ptrStr("float")},
	"bool":   {Kind: "primitive", Primitive: ptrStr("bool")},
	"char":   {Kind: "primitive", Primitive: ptrStr("char")},
	"string": {Kind: "primitive", Primitive: ptrStr("string")},
	"any":    {Kind: "primitive", Primitive: ptrStr("any")},
}

func ptrStr(s string) *string {
	return &s
}

func parseTypeAnnotation(token string) *TypeDef {
	if t, ok := typeRegistry[token]; ok {
		return t
	}
	if strings.HasSuffix(token, "?") {
		inner := parseTypeAnnotation(strings.TrimSuffix(token, "?"))
		if inner == nil {
			inner = &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
		}
		return &TypeDef{Kind: "optional", InnerType: inner}
	}
	return &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
}

func typeCompatible(actual, expected *TypeDef) bool {
	if expected.Primitive != nil && *expected.Primitive == "any" {
		return true
	}
	if actual.Primitive != nil && *actual.Primitive == "any" {
		return true
	}
	if actual.Kind == "primitive" && expected.Kind == "primitive" {
		if actual.Primitive == nil || expected.Primitive == nil {
			return false
		}
		if *actual.Primitive == *expected.Primitive {
			return true
		}
		if *actual.Primitive == "int" && *expected.Primitive == "float" {
			return true
		}
		if *actual.Primitive == "char" && *expected.Primitive == "string" {
			return true
		}
		return false
	}
	if actual.Kind == "union" && expected.Kind == "union" {
		if actual.Types == nil || expected.Types == nil {
			return false
		}
		for _, t := range actual.Types {
			found := false
			for _, e := range expected.Types {
				if typeCompatible(t, e) {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}
		return true
	}
	return false
}

// ============================================================================
// LEXER
// ============================================================================

type Lexer struct {
	input     string
	pos       int
	line      int
	column    int
	lineStart int
}

type TokenResult struct {
	Token    string
	Location Location
}

func NewLexer(input string) *Lexer {
	return &Lexer{input: input, pos: 0, line: 1, column: 1, lineStart: 0}
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
		l.lineStart = l.pos
	} else {
		l.column++
	}
	return ch
}

func (l *Lexer) getLocation() Location {
	endPos := l.pos
	if endPos > len(l.input) {
		endPos = len(l.input)
	}
	return Location{
		Line:   l.line,
		Column: l.column,
		Source: l.input[l.lineStart:endPos],
	}
}

func (l *Lexer) NextToken() *TokenResult {
	// Skip whitespace
	for l.peek() == ' ' || l.peek() == '\n' || l.peek() == '\r' || l.peek() == '\t' {
		l.advance()
	}

	// Skip comments
	if l.peek() == '/' && l.pos+1 < len(l.input) && rune(l.input[l.pos+1]) == '/' {
		for l.peek() != 0 && l.peek() != '\n' {
			l.advance()
		}
		return l.NextToken()
	}

	if l.peek() == 0 {
		return nil
	}

	loc := l.getLocation()

	// Multi-character operators
	twoCharOps := []string{"==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--"}
	if l.pos+2 <= len(l.input) {
		twoChar := l.input[l.pos : l.pos+2]
		for _, op := range twoCharOps {
			if twoChar == op {
				l.advance()
				l.advance()
				return &TokenResult{Token: op, Location: loc}
			}
		}
	}

	// Identifiers / keywords
	ch := l.peek()
	if isLetter(ch) || ch == '_' {
		word := ""
		for isLetter(l.peek()) || isDigit(l.peek()) || l.peek() == '_' {
			word += string(l.advance())
		}
		return &TokenResult{Token: word, Location: loc}
	}

	// Strings
	if l.peek() == '"' {
		l.advance()
		value := ""
		for l.peek() != 0 && l.peek() != '"' {
			if l.peek() == '\\' {
				l.advance()
				next := l.advance()
				if next == 'n' {
					value += "\n"
				} else if next == 't' {
					value += "\t"
				} else {
					value += string(next)
				}
			} else {
				value += string(l.advance())
			}
		}
		if l.peek() == '"' {
			l.advance()
		}
		return &TokenResult{Token: fmt.Sprintf(`"%s"`, value), Location: loc}
	}

	if l.peek() == '\'' {
		l.advance()
		value := ""
		for l.peek() != 0 && l.peek() != '\'' {
			value += string(l.advance())
		}
		if l.peek() == '\'' {
			l.advance()
		}
		return &TokenResult{Token: fmt.Sprintf(`'%s'`, value), Location: loc}
	}

	// Numbers
	if isDigit(l.peek()) {
		num := ""
		for isDigit(l.peek()) {
			num += string(l.advance())
		}
		if l.peek() == '.' && l.pos+1 < len(l.input) && isDigit(rune(l.input[l.pos+1])) {
			num += string(l.advance())
			for isDigit(l.peek()) {
				num += string(l.advance())
			}
		}
		return &TokenResult{Token: num, Location: loc}
	}

	// Single-char symbols
	ch = l.advance()
	return &TokenResult{Token: string(ch), Location: loc}
}

func isLetter(ch rune) bool {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

func isDigit(ch rune) bool {
	return ch >= '0' && ch <= '9'
}

// ============================================================================
// AST TYPES
// ============================================================================

type Expr struct {
	Type     string
	Location *Location
	// Var
	Name *string
	// Number
	Value *float64
	// String
	StringValue *string
	// Bool
	BoolValue *bool
	// Call
	Module *string
	Func   *string
	Args   []*Expr
	// Binary
	Op    *string
	Left  *Expr
	Right *Expr
	// Unary
	Arg *Expr
	// Match
	MatchExpr *Expr
	Arms      []interface{}
	// Tuple
	Elements []*Expr
}

type Stmt struct {
	Type     string
	Location *Location
	// Import
	ModuleName *string
	// Func
	FuncName   *string
	Params     []interface{}
	ReturnType *TypeDef
	Body       []*Stmt
	// VarDecl
	VarName *string
	VarType *TypeDef
	VarVal  *Expr
	Mutable *bool
	// If
	Condition  *Expr
	ThenBranch []*Stmt
	ElseBranch []*Stmt
	// While
	WhileBody []*Stmt
	// For
	Init   *Stmt
	Cond   *Expr
	Update *Stmt
	// Return
	RetVal *Expr
	// Print
	PrintExpr *Expr
	// ExprStmt
	StmtExpr *Expr
}

// ============================================================================
// PARSER
// ============================================================================

type Parser struct {
	tokens   []*TokenResult
	tokenIdx int
}

func NewParser(lexer *Lexer) *Parser {
	p := &Parser{tokens: make([]*TokenResult, 0), tokenIdx: 0}
	for {
		token := lexer.NextToken()
		if token == nil {
			break
		}
		p.tokens = append(p.tokens, token)
	}
	return p
}

func (p *Parser) current() *TokenResult {
	if p.tokenIdx < len(p.tokens) {
		return p.tokens[p.tokenIdx]
	}
	return nil
}

func (p *Parser) peek(offset int) *TokenResult {
	idx := p.tokenIdx + offset
	if idx < len(p.tokens) {
		return p.tokens[idx]
	}
	return nil
}

func (p *Parser) advance() {
	p.tokenIdx++
}

func (p *Parser) expect(expected string) *Location {
	current := p.current()
	if current == nil || current.Token != expected {
		got := "EOF"
		if current != nil {
			got = current.Token
		}
		panic(fmt.Sprintf("Parse error: Expected '%s', got '%s'", expected, got))
	}
	loc := current.Location
	p.advance()
	return &loc
}

func (p *Parser) match(tokens ...string) bool {
	current := p.current()
	if current == nil {
		return false
	}
	for _, t := range tokens {
		if current.Token == t {
			return true
		}
	}
	return false
}

func (p *Parser) isKeyword(word string) bool {
	keywords := []string{
		"import", "from", "func", "let", "const", "var", "if", "else",
		"while", "for", "match", "break", "continue", "return", "true", "false",
		"int", "float", "bool", "char", "string", "any", "error",
	}
	for _, kw := range keywords {
		if kw == word {
			return true
		}
	}
	return false
}

func (p *Parser) ParseProgram() []*Stmt {
	stmts := make([]*Stmt, 0)
	for p.current() != nil {
		stmts = append(stmts, p.parseStmt())
	}
	return stmts
}

func (p *Parser) parseStmt() *Stmt {
	current := p.current()
	if current == nil {
		panic("Unexpected EOF")
	}

	loc := current.Location

	// Import statement
	if current.Token == "import" {
		p.advance()
		module := p.current().Token
		p.advance()
		if p.match("from") {
			p.advance()
			p.advance() // skip package root
		}
		return &Stmt{Type: "Import", ModuleName: &module, Location: &loc}
	}

	// Function declaration
	if current.Token == "func" {
		p.advance()
		funcName := p.current().Token
		p.advance()
		p.expect("(")
		params := make([]interface{}, 0)
		for !p.match(")") {
			paramName := p.current().Token
			p.advance()
			p.expect(":")
			paramType := p.parseType()
			params = append(params, map[string]interface{}{"name": paramName, "type": paramType})
			if p.match(",") {
				p.advance()
			}
		}
		p.expect(")")
		p.expect("=>")
		retType := p.parseType()
		p.expect("{")
		body := p.parseBlock()
		p.expect("}")
		return &Stmt{
			Type:       "Func",
			FuncName:   &funcName,
			Params:     params,
			ReturnType: retType,
			Body:       body,
			Location:   &loc,
		}
	}

	// If statement
	if current.Token == "if" {
		p.advance()
		p.expect("(")
		condition := p.parseExpr()
		p.expect(")")
		p.expect("{")
		thenBranch := p.parseBlock()
		p.expect("}")
		var elseBranch []*Stmt
		if p.match("else") {
			p.advance()
			if p.match("{") {
				p.advance()
				elseBranch = p.parseBlock()
				p.expect("}")
			} else if p.match("if") {
				elseBranch = []*Stmt{p.parseStmt()}
			}
		}
		return &Stmt{
			Type:       "If",
			Condition:  condition,
			ThenBranch: thenBranch,
			ElseBranch: elseBranch,
			Location:   &loc,
		}
	}

	// While statement
	if current.Token == "while" {
		p.advance()
		p.expect("(")
		condition := p.parseExpr()
		p.expect(")")
		p.expect("{")
		body := p.parseBlock()
		p.expect("}")
		return &Stmt{
			Type:      "While",
			Condition: condition,
			WhileBody: body,
			Location:  &loc,
		}
	}

	// For statement
	if current.Token == "for" {
		p.advance()
		p.expect("(")
		var init *Stmt
		if !p.match(";") {
			init = p.parseStmt()
		}
		if p.match(";") {
			p.advance()
		}
		var condition *Expr
		if !p.match(";") {
			condition = p.parseExpr()
		}
		if p.match(";") {
			p.advance()
		}
		var update *Stmt
		if !p.match(")") {
			update = p.parseStmt()
		}
		p.expect(")")
		p.expect("{")
		body := p.parseBlock()
		p.expect("}")
		return &Stmt{
			Type:      "For",
			Init:      init,
			Cond:      condition,
			Update:    update,
			WhileBody: body,
			Location:  &loc,
		}
	}

	// Variable declaration
	if current.Token == "let" || current.Token == "const" || current.Token == "var" {
		keyword := current.Token
		p.advance()
		varName := p.current().Token
		p.advance()
		p.expect(":")
		varType := p.parseType()
		var varVal *Expr
		if p.match("=") {
			p.advance()
			varVal = p.parseExpr()
		}
		mutable := keyword == "var"
		return &Stmt{
			Type:     "VarDecl",
			VarName:  &varName,
			VarType:  varType,
			VarVal:   varVal,
			Mutable:  &mutable,
			Location: &loc,
		}
	}

	// Break
	if current.Token == "break" {
		p.advance()
		return &Stmt{Type: "Break", Location: &loc}
	}

	// Continue
	if current.Token == "continue" {
		p.advance()
		return &Stmt{Type: "Continue", Location: &loc}
	}

	// Return
	if current.Token == "return" {
		p.advance()
		var val *Expr
		if !p.match("}") && !p.match(";") {
			val = p.parseExpr()
		}
		return &Stmt{Type: "Return", RetVal: val, Location: &loc}
	}

	// Expression statement
	expr := p.parseExpr()
	return &Stmt{Type: "ExprStmt", StmtExpr: expr, Location: &loc}
}

func (p *Parser) parseBlock() []*Stmt {
	stmts := make([]*Stmt, 0)
	for !p.match("}") && p.current() != nil {
		stmts = append(stmts, p.parseStmt())
	}
	return stmts
}

func (p *Parser) parseType() *TypeDef {
	current := p.current()
	if current == nil {
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
	}
	typeName := current.Token
	p.advance()
	return parseTypeAnnotation(typeName)
}

func (p *Parser) parseExpr() *Expr {
	return p.parseBinary(0)
}

func (p *Parser) precedence(op string) int {
	switch op {
	case "||":
		return 1
	case "&&":
		return 2
	case "==", "!=":
		return 3
	case "<", ">", "<=", ">=":
		return 4
	case "+", "-":
		return 5
	case "*", "/", "%":
		return 6
	default:
		return 0
	}
}

func (p *Parser) parseBinary(minPrec int) *Expr {
	left := p.parseUnary()
	for p.current() != nil {
		prec := p.precedence(p.current().Token)
		if prec == 0 || prec < minPrec {
			break
		}
		op := p.current().Token
		p.advance()
		right := p.parseBinary(prec + 1)
		left = &Expr{
			Type:     "Binary",
			Op:       &op,
			Left:     left,
			Right:    right,
			Location: &p.current().Location,
		}
	}
	return left
}

func (p *Parser) parseUnary() *Expr {
	current := p.current()
	if current != nil && (current.Token == "!" || current.Token == "-" || current.Token == "+" || current.Token == "~") {
		op := current.Token
		p.advance()
		arg := p.parseUnary()
		return &Expr{Type: "Unary", Op: &op, Arg: arg, Location: &current.Location}
	}
	return p.parsePrimary()
}

func (p *Parser) parsePrimary() *Expr {
	current := p.current()
	if current == nil {
		panic("Unexpected EOF")
	}

	// Numbers
	if isNumericString(current.Token) {
		val, _ := strconv.ParseFloat(current.Token, 64)
		p.advance()
		return &Expr{Type: "Number", Value: &val, Location: &current.Location}
	}

	// Strings
	if strings.HasPrefix(current.Token, "\"") && strings.HasSuffix(current.Token, "\"") {
		val := strings.TrimPrefix(strings.TrimSuffix(current.Token, "\""), "\"")
		p.advance()
		return &Expr{Type: "String", StringValue: &val, Location: &current.Location}
	}

	// Booleans
	if current.Token == "true" {
		p.advance()
		bVal := true
		return &Expr{Type: "Bool", BoolValue: &bVal, Location: &current.Location}
	}
	if current.Token == "false" {
		p.advance()
		bVal := false
		return &Expr{Type: "Bool", BoolValue: &bVal, Location: &current.Location}
	}

	// Identifiers and module.function calls
	if !p.isKeyword(current.Token) {
		name := current.Token
		loc := current.Location
		p.advance()

		// Check for module.function
		if p.match(".") {
			p.advance()
			if p.current() == nil {
				panic("Expected function name after '.'")
			}
			funcName := p.current().Token
			p.advance()
			if p.match("(") {
				p.advance()
				args := make([]*Expr, 0)
				for !p.match(")") {
					args = append(args, p.parseUnary())
					if p.match(",") {
						p.advance()
					}
				}
				p.expect(")")
				return &Expr{
					Type:     "Call",
					Module:   &name,
					Func:     &funcName,
					Args:     args,
					Location: &loc,
				}
			}
		}

		// Check for function call
		if p.match("(") {
			p.advance()
			args := make([]*Expr, 0)
			for !p.match(")") {
				args = append(args, p.parseUnary())
				if p.match(",") {
					p.advance()
				}
			}
			p.expect(")")
			empty := ""
			return &Expr{
				Type:     "Call",
				Module:   &empty,
				Func:     &name,
				Args:     args,
				Location: &loc,
			}
		}

		return &Expr{Type: "Var", Name: &name, Location: &loc}
	}

	// Parenthesized expression
	if current.Token == "(" {
		p.advance()
		expr := p.parseExpr()
		p.expect(")")
		return expr
	}

	panic(fmt.Sprintf("Unknown expression: %s", current.Token))
}

func isNumericString(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

// ============================================================================
// TYPE CHECKER
// ============================================================================

type TypeChecker struct {
	varTypes map[string]*TypeDef
	funcTypes map[string]interface{}
	errors   []string
}

func NewTypeChecker() *TypeChecker {
	return &TypeChecker{
		varTypes: make(map[string]*TypeDef),
		funcTypes: make(map[string]interface{}),
		errors: make([]string, 0),
	}
}

func (tc *TypeChecker) Check(stmts []*Stmt) []string {
	for _, stmt := range stmts {
		tc.checkStmt(stmt)
	}
	return tc.errors
}

func (tc *TypeChecker) checkStmt(stmt *Stmt) {
	if stmt == nil {
		return
	}

	switch stmt.Type {
	case "VarDecl":
		if stmt.VarVal != nil {
			valType := tc.inferExprType(stmt.VarVal)
			if !typeCompatible(valType, stmt.VarType) {
				tc.errors = append(tc.errors, fmt.Sprintf(
					"Type mismatch: cannot assign %v to %v", valType, stmt.VarType))
			}
		}
		if stmt.VarName != nil {
			tc.varTypes[*stmt.VarName] = stmt.VarType
		}
	case "If":
		tc.checkStmt(&Stmt{Type: "Block", Body: stmt.ThenBranch})
		if stmt.ElseBranch != nil {
			tc.checkStmt(&Stmt{Type: "Block", Body: stmt.ElseBranch})
		}
	case "While":
		tc.checkStmt(&Stmt{Type: "Block", Body: stmt.WhileBody})
	case "For":
		if stmt.Init != nil {
			tc.checkStmt(stmt.Init)
		}
		if stmt.Update != nil {
			tc.checkStmt(stmt.Update)
		}
		tc.checkStmt(&Stmt{Type: "Block", Body: stmt.WhileBody})
	case "Block":
		for _, s := range stmt.Body {
			tc.checkStmt(s)
		}
	}
}

func (tc *TypeChecker) inferExprType(expr *Expr) *TypeDef {
	if expr == nil {
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
	}

	switch expr.Type {
	case "Number":
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("float")}
	case "String":
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("string")}
	case "Bool":
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("bool")}
	case "Var":
		if expr.Name != nil {
			if t, ok := tc.varTypes[*expr.Name]; ok {
				return t
			}
		}
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
	case "Binary":
		switch *expr.Op {
		case "==", "!=", "<", ">", "<=", ">=", "&&", "||":
			return &TypeDef{Kind: "primitive", Primitive: ptrStr("bool")}
		}
		return tc.inferExprType(expr.Left)
	case "Call":
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
	default:
		return &TypeDef{Kind: "primitive", Primitive: ptrStr("any")}
	}
}

// ============================================================================
// ENVIRONMENT & INTERPRETER
// ============================================================================

type Environment struct {
	vars   map[string]interface{}
	mutable map[string]bool
	parent *Environment
}

func NewEnvironment(parent *Environment) *Environment {
	return &Environment{
		vars:    make(map[string]interface{}),
		mutable: make(map[string]bool),
		parent:  parent,
	}
}

func (e *Environment) Define(name string, value interface{}, mutable bool) {
	e.vars[name] = value
	e.mutable[name] = mutable
}

func (e *Environment) Get(name string) interface{} {
	if v, ok := e.vars[name]; ok {
		return v
	}
	if e.parent != nil {
		return e.parent.Get(name)
	}
	panic(fmt.Sprintf("Undefined variable: %s", name))
}

func (e *Environment) Set(name string, value interface{}) {
	if _, ok := e.vars[name]; ok {
		if !e.mutable[name] {
			panic(fmt.Sprintf("Cannot reassign immutable variable: %s", name))
		}
		e.vars[name] = value
		return
	}
	if e.parent != nil {
		e.parent.Set(name, value)
		return
	}
	panic(fmt.Sprintf("Undefined variable: %s", name))
}

var modules = map[string]map[string]interface{}{
	"io": {
		"print": func(args ...interface{}) interface{} {
			for i, arg := range args {
				if i > 0 {
					fmt.Print(" ")
				}
				fmt.Print(arg)
			}
			fmt.Println()
			return nil
		},
	},
	"math": {
		"sqrt": func(x interface{}) interface{} {
			return sqrtGo(toFloat(x))
		},
		"pow": func(base, exp interface{}) interface{} {
			return powGo(toFloat(base), toFloat(exp))
		},
		"abs": func(x interface{}) interface{} {
			return absGo(toFloat(x))
		},
	},
}

type Interpreter struct {
	env     *Environment
	modules map[string]map[string]interface{}
	controlFlow map[string]interface{}
}

func NewInterpreter() *Interpreter {
	return &Interpreter{
		env:     NewEnvironment(nil),
		modules: modules,
		controlFlow: make(map[string]interface{}),
	}
}

func (i *Interpreter) Run(program []*Stmt) {
	for _, stmt := range program {
		i.evalStmt(stmt)
	}
}

func (i *Interpreter) evalStmt(stmt *Stmt) {
	if stmt == nil {
		return
	}

	switch stmt.Type {
	case "Import":
		// Module loading handled at eval time
	case "VarDecl":
		var val interface{}
		if stmt.VarVal != nil {
			val = i.evalExpr(stmt.VarVal)
		}
		mutable := false
		if stmt.Mutable != nil {
			mutable = *stmt.Mutable
		}
		if stmt.VarName != nil {
			i.env.Define(*stmt.VarName, val, mutable)
		}
	case "If":
		cond := i.evalExpr(stmt.Condition)
		if i.isTruthy(cond) {
			for _, s := range stmt.ThenBranch {
				i.evalStmt(s)
			}
		} else if stmt.ElseBranch != nil {
			for _, s := range stmt.ElseBranch {
				i.evalStmt(s)
			}
		}
	case "While":
		for i.isTruthy(i.evalExpr(stmt.Condition)) {
			for _, s := range stmt.WhileBody {
				i.evalStmt(s)
				if _, ok := i.controlFlow["break"]; ok {
					delete(i.controlFlow, "break")
					return
				}
				if _, ok := i.controlFlow["continue"]; ok {
					delete(i.controlFlow, "continue")
					break
				}
			}
		}
	case "For":
		loopEnv := NewEnvironment(i.env)
		oldEnv := i.env
		i.env = loopEnv
		defer func() { i.env = oldEnv }()

		if stmt.Init != nil {
			i.evalStmt(stmt.Init)
		}
		for stmt.Cond == nil || i.isTruthy(i.evalExpr(stmt.Cond)) {
			for _, s := range stmt.WhileBody {
				i.evalStmt(s)
				if _, ok := i.controlFlow["break"]; ok {
					delete(i.controlFlow, "break")
					return
				}
				if _, ok := i.controlFlow["continue"]; ok {
					delete(i.controlFlow, "continue")
					break
				}
			}
			if stmt.Update != nil {
				i.evalStmt(stmt.Update)
			}
		}
	case "Break":
		i.controlFlow["break"] = true
	case "Continue":
		i.controlFlow["continue"] = true
	case "Return":
		if stmt.RetVal != nil {
			i.controlFlow["return"] = i.evalExpr(stmt.RetVal)
		} else {
			i.controlFlow["return"] = nil
		}
	case "ExprStmt":
		i.evalExpr(stmt.StmtExpr)
	case "Print":
		val := i.evalExpr(stmt.PrintExpr)
		fmt.Println(val)
	}
}

func (i *Interpreter) evalExpr(expr *Expr) interface{} {
	if expr == nil {
		return nil
	}

	switch expr.Type {
	case "Var":
		if expr.Name == nil {
			return nil
		}
		return i.env.Get(*expr.Name)
	case "Number":
		if expr.Value == nil {
			return 0.0
		}
		return *expr.Value
	case "String":
		if expr.StringValue == nil {
			return ""
		}
		return *expr.StringValue
	case "Bool":
		if expr.BoolValue == nil {
			return false
		}
		return *expr.BoolValue
	case "Call":
		if expr.Module == nil || expr.Func == nil {
			return nil
		}
		module := *expr.Module
		fn := *expr.Func

		if module == "" {
			panic(fmt.Sprintf("User-defined functions not yet implemented: %s", fn))
		}

		moduleName := module
		if !strings.HasPrefix(module, "str.") {
			moduleName = "str." + module
		}

		mod, ok := i.modules[module]
		if !ok {
			mod, ok = i.modules[moduleName]
		}
		if !ok {
			panic(fmt.Sprintf("Module not imported: %s", module))
		}

		fnVal, ok := mod[fn]
		if !ok {
			panic(fmt.Sprintf("Function not found: %s.%s", module, fn))
		}

		fnInterface := fnVal.(func(...interface{}) interface{})
		args := make([]interface{}, len(expr.Args))
		for j, arg := range expr.Args {
			args[j] = i.evalExpr(arg)
		}
		return fnInterface(args...)

	case "Binary":
		l := i.evalExpr(expr.Left)
		r := i.evalExpr(expr.Right)
		if expr.Op == nil {
			return nil
		}
		return i.evalBinary(*expr.Op, l, r)
	case "Unary":
		arg := i.evalExpr(expr.Arg)
		if expr.Op == nil {
			return nil
		}
		switch *expr.Op {
		case "-":
			return -toFloat(arg)
		case "+":
			return toFloat(arg)
		case "!":
			return !i.isTruthy(arg)
		case "~":
			return ^int64(toFloat(arg))
		}
	case "Tuple":
		result := make([]interface{}, len(expr.Elements))
		for i, el := range expr.Elements {
			result[i] = i.evalExpr(el)
		}
		return result
	}

	return nil
}

func (i *Interpreter) evalBinary(op string, l, r interface{}) interface{} {
	switch op {
	case "+":
		return toFloat(l) + toFloat(r)
	case "-":
		return toFloat(l) - toFloat(r)
	case "*":
		return toFloat(l) * toFloat(r)
	case "/":
		return toFloat(l) / toFloat(r)
	case "%":
		return int64(toFloat(l)) % int64(toFloat(r))
	case "==":
		return l == r
	case "!=":
		return l != r
	case "<":
		return toFloat(l) < toFloat(r)
	case ">":
		return toFloat(l) > toFloat(r)
	case "<=":
		return toFloat(l) <= toFloat(r)
	case ">=":
		return toFloat(l) >= toFloat(r)
	case "&&":
		return i.isTruthy(l) && i.isTruthy(r)
	case "||":
		return i.isTruthy(l) || i.isTruthy(r)
	}
	panic(fmt.Sprintf("Unknown operator: %s", op))
}

func (i *Interpreter) isTruthy(value interface{}) bool {
	if value == nil || value == false || value == 0 {
		return false
	}
	return true
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case bool:
		if val {
			return 1
		}
		return 0
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	}
	return 0
}

func sqrtGo(x float64) float64 {
	return sqrtHelper(x)
}

func sqrtHelper(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x == 0 {
		return 0
	}
	z := x
	for i := 0; i < 20; i++ {
		z = (z + x/z) / 2
	}
	return z
}

func powGo(base, exp float64) float64 {
	result := 1.0
	for i := 0; i < int(exp); i++ {
		result *= base
	}
	return result
}

func absGo(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// ============================================================================
// C CODE GENERATOR
// ============================================================================

type CGenerator struct {
	lines        []string
	declaredVars map[string]bool
	indent       int
}

func NewCGenerator() *CGenerator {
	return &CGenerator{
		lines:        make([]string, 0),
		declaredVars: make(map[string]bool),
		indent:       0,
	}
}

func (cg *CGenerator) Generate(stmts []*Stmt) string {
	cg.lines = append(cg.lines, "#include <stdio.h>")
	cg.lines = append(cg.lines, "#include <math.h>")
	cg.lines = append(cg.lines, "#include <stdbool.h>")
	cg.lines = append(cg.lines, "")
	cg.lines = append(cg.lines, "int main() {")
	cg.indent++

	for _, stmt := range stmts {
		cg.emitStmt(stmt)
	}

	cg.indent--
	cg.lines = append(cg.lines, "  return 0;")
	cg.lines = append(cg.lines, "}")

	return strings.Join(cg.lines, "\n")
}

func (cg *CGenerator) emitStmt(stmt *Stmt) {
	if stmt == nil {
		return
	}

	ind := strings.Repeat("  ", cg.indent)

	switch stmt.Type {
	case "VarDecl":
		typeStr := cg.typeToC(stmt.VarType)
		init := ""
		if stmt.VarVal != nil {
			init = fmt.Sprintf(" = %s", cg.emitExpr(stmt.VarVal))
		}
		cg.lines = append(cg.lines, fmt.Sprintf("%s%s %s%s;", ind, typeStr, *stmt.VarName, init))
		cg.declaredVars[*stmt.VarName] = true

	case "If":
		cond := cg.emitExpr(stmt.Condition)
		cg.lines = append(cg.lines, fmt.Sprintf("%sif (%s) {", ind, cond))
		cg.indent++
		for _, s := range stmt.ThenBranch {
			cg.emitStmt(s)
		}
		cg.indent--
		if stmt.ElseBranch != nil {
			cg.lines = append(cg.lines, fmt.Sprintf("%s} else {", ind))
			cg.indent++
			for _, s := range stmt.ElseBranch {
				cg.emitStmt(s)
			}
			cg.indent--
		}
		cg.lines = append(cg.lines, fmt.Sprintf("%s}", ind))

	case "While":
		cond := cg.emitExpr(stmt.Condition)
		cg.lines = append(cg.lines, fmt.Sprintf("%swhile (%s) {", ind, cond))
		cg.indent++
		for _, s := range stmt.WhileBody {
			cg.emitStmt(s)
		}
		cg.indent--
		cg.lines = append(cg.lines, fmt.Sprintf("%s}", ind))

	case "For":
		initStr := ""
		if stmt.Init != nil && stmt.Init.Type == "VarDecl" {
			initStr = fmt.Sprintf("%s %s", cg.typeToC(stmt.Init.VarType), *stmt.Init.VarName)
			if stmt.Init.VarVal != nil {
				initStr += fmt.Sprintf(" = %s", cg.emitExpr(stmt.Init.VarVal))
			}
		}
		condStr := "1"
		if stmt.Cond != nil {
			condStr = cg.emitExpr(stmt.Cond)
		}
		updateStr := ""
		if stmt.Update != nil && stmt.Update.Type == "ExprStmt" {
			updateStr = cg.emitExpr(stmt.Update.StmtExpr)
		}
		cg.lines = append(cg.lines, fmt.Sprintf("%sfor (%s; %s; %s) {", ind, initStr, condStr, updateStr))
		cg.indent++
		for _, s := range stmt.WhileBody {
			cg.emitStmt(s)
		}
		cg.indent--
		cg.lines = append(cg.lines, fmt.Sprintf("%s}", ind))

	case "Break":
		cg.lines = append(cg.lines, fmt.Sprintf("%sbreak;", ind))

	case "Continue":
		cg.lines = append(cg.lines, fmt.Sprintf("%scontinue;", ind))

	case "Return":
		if stmt.RetVal != nil {
			cg.lines = append(cg.lines, fmt.Sprintf("%sreturn %s;", ind, cg.emitExpr(stmt.RetVal)))
		} else {
			cg.lines = append(cg.lines, fmt.Sprintf("%sreturn;", ind))
		}

	case "Print":
		expr := stmt.PrintExpr
		if expr.Type == "String" {
			cg.lines = append(cg.lines, fmt.Sprintf("%sprintf(\"%%s\\n\", \"%s\");", ind, *expr.StringValue))
		} else {
			cg.lines = append(cg.lines, fmt.Sprintf("%sprintf(\"%%d\\n\", %s);", ind, cg.emitExpr(expr)))
		}

	case "ExprStmt":
		cg.lines = append(cg.lines, fmt.Sprintf("%s%s;", ind, cg.emitExpr(stmt.StmtExpr)))
	}
}

func (cg *CGenerator) emitExpr(expr *Expr) string {
	if expr == nil {
		return "0"
	}

	switch expr.Type {
	case "Number":
		if expr.Value == nil {
			return "0"
		}
		return fmt.Sprintf("%g", *expr.Value)
	case "String":
		if expr.StringValue == nil {
			return `""`
		}
		return fmt.Sprintf(`"%s"`, *expr.StringValue)
	case "Bool":
		if expr.BoolValue == nil {
			return "false"
		}
		if *expr.BoolValue {
			return "true"
		}
		return "false"
	case "Var":
		if expr.Name == nil {
			return "0"
		}
		return *expr.Name
	case "Binary":
		l := cg.emitExpr(expr.Left)
		r := cg.emitExpr(expr.Right)
		if expr.Op == nil {
			return "0"
		}
		return fmt.Sprintf("(%s %s %s)", l, *expr.Op, r)
	case "Unary":
		arg := cg.emitExpr(expr.Arg)
		if expr.Op == nil {
			return "0"
		}
		return fmt.Sprintf("%s%s", *expr.Op, arg)
	case "Call":
		if expr.Module == nil || expr.Func == nil {
			return "0"
		}
		args := make([]string, len(expr.Args))
		for i, arg := range expr.Args {
			args[i] = cg.emitExpr(arg)
		}
		argsStr := strings.Join(args, ", ")
		if *expr.Module == "math" {
			return fmt.Sprintf("%s(%s)", *expr.Func, argsStr)
		}
		if *expr.Module == "io" && *expr.Func == "print" {
			return fmt.Sprintf("printf(\"%%d\\n\", %s)", argsStr)
		}
		return "0"
	}
	return "0"
}

func (cg *CGenerator) typeToC(t *TypeDef) string {
	if t == nil {
		return "int"
	}
	if t.Kind == "primitive" && t.Primitive != nil {
		switch *t.Primitive {
		case "int":
			return "int"
		case "float":
			return "float"
		case "bool":
			return "bool"
		case "char":
			return "char"
		case "string":
			return "char*"
		}
	}
	return "int"
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

func main() {
	flag.Parse()
	args := flag.Args()

	file := "myprogram.str"
	if len(args) > 0 {
		file = args[0]
	}

	source, err := os.ReadFile(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", r)
			os.Exit(1)
		}
	}()

	// Lexing
	lexer := NewLexer(string(source))
	parser := NewParser(lexer)
	program := parser.ParseProgram()

	// Type checking
	checker := NewTypeChecker()
	typeErrors := checker.Check(program)
	if len(typeErrors) > 0 {
		fmt.Fprintln(os.Stderr, "Type errors:")
		for _, e := range typeErrors {
			fmt.Fprintf(os.Stderr, "  %s\n", e)
		}
		os.Exit(1)
	}

	// Run interpreter
	interpreter := NewInterpreter()
	interpreter.Run(program)

	// Generate C code
	cgen := NewCGenerator()
	cCode := cgen.Generate(program)
	err = os.WriteFile("out.c", []byte(cCode), 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error writing C code: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✓ C code generated: out.c")
}
