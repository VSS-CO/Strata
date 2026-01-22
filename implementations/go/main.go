package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// ============================================================================
// TYPE SYSTEM
// ============================================================================

type PrimitiveType string

const (
	TypeInt       PrimitiveType = "int"
	TypeFloat     PrimitiveType = "float"
	TypeBool      PrimitiveType = "bool"
	TypeChar      PrimitiveType = "char"
	TypeString    PrimitiveType = "string"
	TypeAny       PrimitiveType = "any"
	TypeVoid      PrimitiveType = "void"
	TypeI8        PrimitiveType = "i8"
	TypeI16       PrimitiveType = "i16"
	TypeI32       PrimitiveType = "i32"
	TypeI64       PrimitiveType = "i64"
	TypeU8        PrimitiveType = "u8"
	TypeU16       PrimitiveType = "u16"
	TypeU32       PrimitiveType = "u32"
	TypeU64       PrimitiveType = "u64"
	TypeF32       PrimitiveType = "f32"
	TypeF64       PrimitiveType = "f64"
	TypeArray     PrimitiveType = "array"
	TypeList      PrimitiveType = "list"
	TypeMap       PrimitiveType = "map"
	TypeDict      PrimitiveType = "dict"
	TypeSet       PrimitiveType = "set"
	TypeTuple     PrimitiveType = "tuple"
	TypeOption    PrimitiveType = "option"
	TypeResult    PrimitiveType = "result"
	TypePromise   PrimitiveType = "promise"
	TypeNull      PrimitiveType = "null"
	TypeUndefined PrimitiveType = "undefined"
	TypeRegex     PrimitiveType = "regex"
	TypePattern   PrimitiveType = "pattern"
	TypeComplex   PrimitiveType = "complex"
	TypeMatrix    PrimitiveType = "matrix"
	TypeDataframe PrimitiveType = "dataframe"
	TypeCallable  PrimitiveType = "callable"
	TypeLambda    PrimitiveType = "lambda"
	TypeClosure   PrimitiveType = "closure"
)

type TypeDefKind string

const (
	KindPrimitive TypeDefKind = "primitive"
	KindUnion     TypeDefKind = "union"
	KindInterface TypeDefKind = "interface"
	KindOptional  TypeDefKind = "optional"
	KindGeneric   TypeDefKind = "generic"
)

type TypeDef struct {
	Kind       TypeDefKind
	Name       string
	Primitive  PrimitiveType
	Types      []TypeDef
	Fields     map[string]TypeDef
	InnerType  *TypeDef
	TypeParams []string
}

var TypeRegistry = map[string]TypeDef{
	"int":       {Kind: KindPrimitive, Primitive: TypeInt},
	"float":     {Kind: KindPrimitive, Primitive: TypeFloat},
	"bool":      {Kind: KindPrimitive, Primitive: TypeBool},
	"char":      {Kind: KindPrimitive, Primitive: TypeChar},
	"string":    {Kind: KindPrimitive, Primitive: TypeString},
	"any":       {Kind: KindPrimitive, Primitive: TypeAny},
	"void":      {Kind: KindPrimitive, Primitive: TypeVoid},
	"i8":        {Kind: KindPrimitive, Primitive: TypeI8},
	"i16":       {Kind: KindPrimitive, Primitive: TypeI16},
	"i32":       {Kind: KindPrimitive, Primitive: TypeI32},
	"i64":       {Kind: KindPrimitive, Primitive: TypeI64},
	"u8":        {Kind: KindPrimitive, Primitive: TypeU8},
	"u16":       {Kind: KindPrimitive, Primitive: TypeU16},
	"u32":       {Kind: KindPrimitive, Primitive: TypeU32},
	"u64":       {Kind: KindPrimitive, Primitive: TypeU64},
	"f32":       {Kind: KindPrimitive, Primitive: TypeF32},
	"f64":       {Kind: KindPrimitive, Primitive: TypeF64},
	"array":     {Kind: KindPrimitive, Primitive: TypeArray},
	"list":      {Kind: KindPrimitive, Primitive: TypeList},
	"map":       {Kind: KindPrimitive, Primitive: TypeMap},
	"dict":      {Kind: KindPrimitive, Primitive: TypeDict},
	"set":       {Kind: KindPrimitive, Primitive: TypeSet},
	"tuple":     {Kind: KindPrimitive, Primitive: TypeTuple},
	"option":    {Kind: KindPrimitive, Primitive: TypeOption},
	"result":    {Kind: KindPrimitive, Primitive: TypeResult},
	"promise":   {Kind: KindPrimitive, Primitive: TypePromise},
	"null":      {Kind: KindPrimitive, Primitive: TypeNull},
	"undefined": {Kind: KindPrimitive, Primitive: TypeUndefined},
	"regex":     {Kind: KindPrimitive, Primitive: TypeRegex},
	"pattern":   {Kind: KindPrimitive, Primitive: TypePattern},
	"complex":   {Kind: KindPrimitive, Primitive: TypeComplex},
	"matrix":    {Kind: KindPrimitive, Primitive: TypeMatrix},
	"dataframe": {Kind: KindPrimitive, Primitive: TypeDataframe},
	"callable":  {Kind: KindPrimitive, Primitive: TypeCallable},
	"lambda":    {Kind: KindPrimitive, Primitive: TypeLambda},
	"closure":   {Kind: KindPrimitive, Primitive: TypeClosure},
}

func parseTypeAnnotation(token string) TypeDef {
	if t, ok := TypeRegistry[token]; ok {
		return t
	}
	if strings.HasSuffix(token, "?") {
		inner := parseTypeAnnotation(token[:len(token)-1])
		return TypeDef{Kind: KindOptional, InnerType: &inner}
	}
	return TypeDef{Kind: KindPrimitive, Primitive: TypeAny}
}

func typeCompatible(actual, expected TypeDef) bool {
	if expected.Primitive == TypeAny || actual.Primitive == TypeAny {
		return true
	}
	if actual.Kind == KindPrimitive && expected.Kind == KindPrimitive {
		if actual.Primitive == expected.Primitive {
			return true
		}
		if actual.Primitive == TypeInt && expected.Primitive == TypeFloat {
			return true
		}
		if actual.Primitive == TypeChar && expected.Primitive == TypeString {
			return true
		}
		return false
	}
	return false
}

// ============================================================================
// LOCATION TRACKING
// ============================================================================

type Location struct {
	Line   int
	Column int
	Source string
}

// ============================================================================
// LEXER
// ============================================================================

type Token struct {
	Value    string
	Location Location
}

type Lexer struct {
	input     string
	pos       int
	line      int
	column    int
	lineStart int
}

func NewLexer(input string) *Lexer {
	return &Lexer{
		input:     input,
		pos:       0,
		line:      1,
		column:    1,
		lineStart: 0,
	}
}

func (l *Lexer) peek() byte {
	if l.pos >= len(l.input) {
		return 0
	}
	return l.input[l.pos]
}

func (l *Lexer) peekNext() byte {
	if l.pos+1 >= len(l.input) {
		return 0
	}
	return l.input[l.pos+1]
}

func (l *Lexer) advance() byte {
	if l.pos >= len(l.input) {
		return 0
	}
	ch := l.input[l.pos]
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
	end := l.pos
	if end > len(l.input) {
		end = len(l.input)
	}
	return Location{
		Line:   l.line,
		Column: l.column,
		Source: l.input[l.lineStart:end],
	}
}

func (l *Lexer) NextToken() *Token {
	for l.peek() == ' ' || l.peek() == '\n' || l.peek() == '\r' || l.peek() == '\t' {
		l.advance()
	}

	if l.peek() == '/' && l.peekNext() == '/' {
		for l.peek() != 0 && l.peek() != '\n' {
			l.advance()
		}
		return l.NextToken()
	}

	if l.peek() == 0 {
		return nil
	}

	loc := l.getLocation()

	twoCharOps := []string{"==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--", "::"}
	if l.pos+1 < len(l.input) {
		twoChar := l.input[l.pos : l.pos+2]
		for _, op := range twoCharOps {
			if twoChar == op {
				l.advance()
				l.advance()
				return &Token{Value: twoChar, Location: loc}
			}
		}
	}

	if isAlpha(l.peek()) || l.peek() == '_' {
		var word strings.Builder
		for isAlphaNum(l.peek()) || l.peek() == '_' {
			word.WriteByte(l.advance())
		}
		return &Token{Value: word.String(), Location: loc}
	}

	if l.peek() == '"' {
		l.advance()
		var str strings.Builder
		for l.peek() != 0 && l.peek() != '"' {
			if l.peek() == '\\' {
				l.advance()
				escaped := l.advance()
				if escaped == 'n' {
					str.WriteByte('\n')
				} else if escaped == 't' {
					str.WriteByte('\t')
				} else if escaped == 'r' {
					str.WriteByte('\r')
				} else {
					str.WriteByte(escaped)
				}
			} else {
				str.WriteByte(l.advance())
			}
		}
		if l.peek() == '"' {
			l.advance()
		}
		return &Token{Value: "\"" + str.String() + "\"", Location: loc}
	}

	if isDigit(l.peek()) {
		var num strings.Builder
		for isDigit(l.peek()) || l.peek() == '.' {
			num.WriteByte(l.advance())
		}
		return &Token{Value: num.String(), Location: loc}
	}

	ch := l.advance()
	return &Token{Value: string(ch), Location: loc}
}

func isAlpha(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

func isDigit(c byte) bool {
	return c >= '0' && c <= '9'
}

func isAlphaNum(c byte) bool {
	return isAlpha(c) || isDigit(c)
}

// ============================================================================
// AST DEFINITIONS
// ============================================================================

type ExprKind string

const (
	ExprLiteral    ExprKind = "literal"
	ExprIdentifier ExprKind = "identifier"
	ExprBinary     ExprKind = "binary"
	ExprUnary      ExprKind = "unary"
	ExprCall       ExprKind = "call"
	ExprMember     ExprKind = "member"
)

type Expr struct {
	Kind     ExprKind
	Value    interface{}
	Type     TypeDef
	Name     string
	Op       string
	Left     *Expr
	Right    *Expr
	Operand  *Expr
	Func     *Expr
	Args     []*Expr
	Object   *Expr
	Property string
}

type StmtKind string

const (
	StmtLet        StmtKind = "let"
	StmtAssignment StmtKind = "assignment"
	StmtExpression StmtKind = "expression"
	StmtIf         StmtKind = "if"
	StmtWhile      StmtKind = "while"
	StmtFor        StmtKind = "for"
	StmtReturn     StmtKind = "return"
	StmtBreak      StmtKind = "break"
	StmtContinue   StmtKind = "continue"
	StmtFunction   StmtKind = "function"
	StmtImport     StmtKind = "import"
)

type Param struct {
	Name string
	Type TypeDef
}

type Stmt struct {
	Kind       StmtKind
	Name       string
	Type       TypeDef
	Value      *Expr
	Mutable    bool
	Target     string
	Expr       *Expr
	Condition  *Expr
	Then       []*Stmt
	Else       []*Stmt
	Body       []*Stmt
	Init       *Stmt
	Update     *Stmt
	Params     []Param
	ReturnType TypeDef
	Module     string
}

// ============================================================================
// PARSER
// ============================================================================

type Parser struct {
	tokens []*Token
	pos    int
}

func NewParser(input string) *Parser {
	lexer := NewLexer(input)
	var tokens []*Token
	for {
		token := lexer.NextToken()
		if token == nil {
			break
		}
		tokens = append(tokens, token)
	}
	return &Parser{tokens: tokens, pos: 0}
}

func (p *Parser) current() *Token {
	if p.pos >= len(p.tokens) {
		return nil
	}
	return p.tokens[p.pos]
}

func (p *Parser) advance() {
	p.pos++
}

func (p *Parser) expect(token string) error {
	if p.current() == nil || p.current().Value != token {
		line := 0
		if p.current() != nil {
			line = p.current().Location.Line
		}
		return fmt.Errorf("expected %s at line %d", token, line)
	}
	p.advance()
	return nil
}

func (p *Parser) precedence(op string) int {
	precs := map[string]int{
		"||": 1, "&&": 2,
		"==": 3, "!=": 3,
		"<": 4, ">": 4, "<=": 4, ">=": 4,
		"+": 5, "-": 5,
		"*": 6, "/": 6, "%": 6,
	}
	if prec, ok := precs[op]; ok {
		return prec
	}
	return 0
}

func (p *Parser) parseUnary() (*Expr, error) {
	if p.current() != nil {
		op := p.current().Value
		if op == "!" || op == "-" || op == "+" || op == "~" {
			p.advance()
			operand, err := p.parseUnary()
			if err != nil {
				return nil, err
			}
			return &Expr{Kind: ExprUnary, Op: op, Operand: operand}, nil
		}
	}
	return p.parsePrimary()
}

func (p *Parser) parsePrimary() (*Expr, error) {
	if p.current() == nil {
		return nil, fmt.Errorf("unexpected end of input")
	}

	token := p.current().Value
	if token == "" {
		return nil, fmt.Errorf("unexpected empty token")
	}

	if len(token) > 0 && isDigit(token[0]) {
		p.advance()
		if strings.Contains(token, ".") {
			val, _ := strconv.ParseFloat(token, 64)
			return &Expr{Kind: ExprLiteral, Value: val, Type: TypeDef{Kind: KindPrimitive, Primitive: TypeFloat}}, nil
		}
		val, _ := strconv.ParseInt(token, 10, 64)
		return &Expr{Kind: ExprLiteral, Value: val, Type: TypeDef{Kind: KindPrimitive, Primitive: TypeInt}}, nil
	}

	if strings.HasPrefix(token, "\"") {
		p.advance()
		strVal := token[1 : len(token)-1]
		return &Expr{Kind: ExprLiteral, Value: strVal, Type: TypeDef{Kind: KindPrimitive, Primitive: TypeString}}, nil
	}

	if token == "true" || token == "false" {
		p.advance()
		return &Expr{Kind: ExprLiteral, Value: token == "true", Type: TypeDef{Kind: KindPrimitive, Primitive: TypeBool}}, nil
	}

	if isAlpha(token[0]) || token[0] == '_' {
		expr := &Expr{Kind: ExprIdentifier, Name: token}
		p.advance()

		for p.current() != nil && (p.current().Value == "." || p.current().Value == "::") {
			sep := p.current().Value
			p.advance()
			if p.current() == nil {
				return nil, fmt.Errorf("expected property name after %s", sep)
			}
			property := p.current().Value
			p.advance()

			if p.current() != nil && p.current().Value == "(" {
				p.advance()
				var args []*Expr
				for p.current() != nil && p.current().Value != ")" {
					arg, err := p.parseBinary(0)
					if err != nil {
						return nil, err
					}
					args = append(args, arg)
					if p.current() != nil && p.current().Value == "," {
						p.advance()
					}
				}
				if err := p.expect(")"); err != nil {
					return nil, err
				}
				expr = &Expr{
					Kind: ExprCall,
					Func: &Expr{Kind: ExprMember, Object: expr, Property: property},
					Args: args,
				}
			} else {
				expr = &Expr{Kind: ExprMember, Object: expr, Property: property}
			}
		}

		if p.current() != nil && p.current().Value == "(" {
			p.advance()
			var args []*Expr
			for p.current() != nil && p.current().Value != ")" {
				arg, err := p.parseBinary(0)
				if err != nil {
					return nil, err
				}
				args = append(args, arg)
				if p.current() != nil && p.current().Value == "," {
					p.advance()
				}
			}
			if err := p.expect(")"); err != nil {
				return nil, err
			}
			return &Expr{Kind: ExprCall, Func: expr, Args: args}, nil
		}

		return expr, nil
	}

	if token == "(" {
		p.advance()
		expr, err := p.parseBinary(0)
		if err != nil {
			return nil, err
		}
		if err := p.expect(")"); err != nil {
			return nil, err
		}
		return expr, nil
	}

	return nil, fmt.Errorf("unexpected token: %s", token)
}

func (p *Parser) parseBinary(minPrec int) (*Expr, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}

	for p.current() != nil && p.precedence(p.current().Value) > minPrec {
		op := p.current().Value
		prec := p.precedence(op)
		if prec == 0 {
			break
		}
		p.advance()
		right, err := p.parseBinary(prec)
		if err != nil {
			return nil, err
		}
		left = &Expr{Kind: ExprBinary, Op: op, Left: left, Right: right}
	}

	return left, nil
}

func (p *Parser) Parse() ([]*Stmt, error) {
	var statements []*Stmt
	for p.current() != nil {
		stmt, err := p.parseStatement()
		if err != nil {
			return nil, err
		}
		if stmt == nil {
			break
		}
		statements = append(statements, stmt)
	}
	return statements, nil
}

func (p *Parser) parseStatement() (*Stmt, error) {
	if p.current() == nil {
		return nil, nil
	}

	token := p.current().Value
	if token == "" || token == "}" {
		return nil, nil
	}

	if token == "import" {
		p.advance()
		name := p.current().Value
		p.advance()
		if err := p.expect("from"); err != nil {
			return nil, err
		}

		var moduleParts []string
		moduleParts = append(moduleParts, p.current().Value)
		p.advance()
		for p.current() != nil && p.current().Value == "::" {
			p.advance()
			if p.current() == nil {
				break
			}
			moduleParts = append(moduleParts, p.current().Value)
			p.advance()
		}
		module := strings.Join(moduleParts, "::")
		return &Stmt{Kind: StmtImport, Name: name, Module: module}, nil
	}

	if token == "let" || token == "const" || token == "var" {
		mutable := token == "var"
		p.advance()
		name := p.current().Value
		p.advance()
		if err := p.expect(":"); err != nil {
			return nil, err
		}
		typeStr := p.current().Value
		p.advance()
		if err := p.expect("="); err != nil {
			return nil, err
		}
		value, err := p.parseBinary(0)
		if err != nil {
			return nil, err
		}
		return &Stmt{
			Kind:    StmtLet,
			Name:    name,
			Type:    parseTypeAnnotation(typeStr),
			Value:   value,
			Mutable: mutable,
		}, nil
	}

	if token == "func" {
		p.advance()
		name := p.current().Value
		p.advance()
		if err := p.expect("("); err != nil {
			return nil, err
		}
		var params []Param
		for p.current() != nil && p.current().Value != ")" {
			pname := p.current().Value
			p.advance()
			if err := p.expect(":"); err != nil {
				return nil, err
			}
			ptype := p.current().Value
			p.advance()
			params = append(params, Param{Name: pname, Type: parseTypeAnnotation(ptype)})
			if p.current() != nil && p.current().Value == "," {
				p.advance()
			}
		}
		if err := p.expect(")"); err != nil {
			return nil, err
		}
		if err := p.expect("=>"); err != nil {
			return nil, err
		}
		returnTypeStr := p.current().Value
		p.advance()
		if err := p.expect("{"); err != nil {
			return nil, err
		}
		var body []*Stmt
		for p.current() != nil && p.current().Value != "}" {
			stmt, err := p.parseStatement()
			if err != nil {
				return nil, err
			}
			body = append(body, stmt)
		}
		if err := p.expect("}"); err != nil {
			return nil, err
		}
		return &Stmt{
			Kind:       StmtFunction,
			Name:       name,
			Params:     params,
			ReturnType: parseTypeAnnotation(returnTypeStr),
			Body:       body,
		}, nil
	}

	if token == "return" {
		p.advance()
		var value *Expr
		if p.current() != nil && p.current().Value != "}" {
			var err error
			value, err = p.parseBinary(0)
			if err != nil {
				return nil, err
			}
		}
		return &Stmt{Kind: StmtReturn, Value: value}, nil
	}

	if token == "if" {
		p.advance()
		if err := p.expect("("); err != nil {
			return nil, err
		}
		condition, err := p.parseBinary(0)
		if err != nil {
			return nil, err
		}
		if err := p.expect(")"); err != nil {
			return nil, err
		}
		if err := p.expect("{"); err != nil {
			return nil, err
		}
		var thenStmts []*Stmt
		for p.current() != nil && p.current().Value != "}" {
			stmt, err := p.parseStatement()
			if err != nil {
				return nil, err
			}
			thenStmts = append(thenStmts, stmt)
		}
		if err := p.expect("}"); err != nil {
			return nil, err
		}
		var elseStmts []*Stmt
		if p.current() != nil && p.current().Value == "else" {
			p.advance()
			if p.current() != nil && p.current().Value == "if" {
				elseIfStmt, err := p.parseStatement()
				if err != nil {
					return nil, err
				}
				if elseIfStmt != nil {
					elseStmts = append(elseStmts, elseIfStmt)
				}
			} else {
				if err := p.expect("{"); err != nil {
					return nil, err
				}
				for p.current() != nil && p.current().Value != "}" {
					stmt, err := p.parseStatement()
					if err != nil {
						return nil, err
					}
					if stmt != nil {
						elseStmts = append(elseStmts, stmt)
					}
				}
				if err := p.expect("}"); err != nil {
					return nil, err
				}
			}
		}
		return &Stmt{Kind: StmtIf, Condition: condition, Then: thenStmts, Else: elseStmts}, nil
	}

	if token == "while" {
		p.advance()
		if err := p.expect("("); err != nil {
			return nil, err
		}
		condition, err := p.parseBinary(0)
		if err != nil {
			return nil, err
		}
		if err := p.expect(")"); err != nil {
			return nil, err
		}
		if err := p.expect("{"); err != nil {
			return nil, err
		}
		var body []*Stmt
		for p.current() != nil && p.current().Value != "}" {
			stmt, err := p.parseStatement()
			if err != nil {
				return nil, err
			}
			body = append(body, stmt)
		}
		if err := p.expect("}"); err != nil {
			return nil, err
		}
		return &Stmt{Kind: StmtWhile, Condition: condition, Body: body}, nil
	}

	if token == "for" {
		p.advance()
		if err := p.expect("("); err != nil {
			return nil, err
		}
		init, err := p.parseStatement()
		if err != nil {
			return nil, err
		}
		if p.current() != nil && p.current().Value == ";" {
			p.advance()
		}
		condition, err := p.parseBinary(0)
		if err != nil {
			return nil, err
		}
		if p.current() != nil && p.current().Value == ";" {
			p.advance()
		}
		update, err := p.parseStatement()
		if err != nil {
			return nil, err
		}
		if err := p.expect(")"); err != nil {
			return nil, err
		}
		if err := p.expect("{"); err != nil {
			return nil, err
		}
		var body []*Stmt
		for p.current() != nil && p.current().Value != "}" {
			stmt, err := p.parseStatement()
			if err != nil {
				return nil, err
			}
			body = append(body, stmt)
		}
		if err := p.expect("}"); err != nil {
			return nil, err
		}
		return &Stmt{Kind: StmtFor, Init: init, Condition: condition, Update: update, Body: body}, nil
	}

	if token == "break" {
		p.advance()
		return &Stmt{Kind: StmtBreak}, nil
	}

	if token == "continue" {
		p.advance()
		return &Stmt{Kind: StmtContinue}, nil
	}

	expr, err := p.parseBinary(0)
	if err != nil {
		return nil, err
	}

	if p.current() != nil && p.current().Value == "=" && expr.Kind == ExprIdentifier {
		target := expr.Name
		p.advance()
		value, err := p.parseBinary(0)
		if err != nil {
			return nil, err
		}
		return &Stmt{Kind: StmtAssignment, Target: target, Value: value}, nil
	}

	return &Stmt{Kind: StmtExpression, Expr: expr}, nil
}

// ============================================================================
// TYPE CHECKER
// ============================================================================

type TypeEnvEntry struct {
	Type    TypeDef
	Mutable bool
}

type FuncEntry struct {
	Params     []TypeDef
	ReturnType TypeDef
}

type TypeEnv struct {
	Vars      map[string]TypeEnvEntry
	Functions map[string]FuncEntry
	Parent    *TypeEnv
}

type TypeChecker struct {
	Env     *TypeEnv
	Modules map[string]*TypeEnv
}

func NewTypeChecker() *TypeChecker {
	return &TypeChecker{
		Env:     &TypeEnv{Vars: make(map[string]TypeEnvEntry), Functions: make(map[string]FuncEntry)},
		Modules: make(map[string]*TypeEnv),
	}
}

func (tc *TypeChecker) Check(statements []*Stmt) error {
	for _, stmt := range statements {
		if err := tc.checkStatement(stmt); err != nil {
			return err
		}
	}
	return nil
}

func (tc *TypeChecker) checkStatement(stmt *Stmt) error {
	switch stmt.Kind {
	case StmtLet:
		tc.Env.Vars[stmt.Name] = TypeEnvEntry{Type: stmt.Type, Mutable: stmt.Mutable}
		return tc.checkExpression(stmt.Value, stmt.Type)
	case StmtFunction:
		var params []TypeDef
		for _, p := range stmt.Params {
			params = append(params, p.Type)
		}
		tc.Env.Functions[stmt.Name] = FuncEntry{Params: params, ReturnType: stmt.ReturnType}
		oldEnv := tc.Env
		tc.Env = &TypeEnv{Vars: make(map[string]TypeEnvEntry), Functions: make(map[string]FuncEntry), Parent: oldEnv}
		for _, param := range stmt.Params {
			tc.Env.Vars[param.Name] = TypeEnvEntry{Type: param.Type, Mutable: false}
		}
		for _, s := range stmt.Body {
			if err := tc.checkStatement(s); err != nil {
				tc.Env = oldEnv
				return err
			}
		}
		tc.Env = oldEnv
	case StmtIf:
		if err := tc.checkExpression(stmt.Condition, TypeDef{Kind: KindPrimitive, Primitive: TypeBool}); err != nil {
			return err
		}
		for _, s := range stmt.Then {
			if err := tc.checkStatement(s); err != nil {
				return err
			}
		}
		for _, s := range stmt.Else {
			if err := tc.checkStatement(s); err != nil {
				return err
			}
		}
	case StmtWhile:
		if err := tc.checkExpression(stmt.Condition, TypeDef{Kind: KindPrimitive, Primitive: TypeBool}); err != nil {
			return err
		}
		for _, s := range stmt.Body {
			if err := tc.checkStatement(s); err != nil {
				return err
			}
		}
	case StmtExpression:
		return tc.checkExpression(stmt.Expr, TypeDef{Kind: KindPrimitive, Primitive: TypeAny})
	case StmtImport:
		// imports are handled at runtime
	}
	return nil
}

func (tc *TypeChecker) checkExpression(expr *Expr, expectedType TypeDef) error {
	actualType := tc.inferType(expr)
	if !typeCompatible(actualType, expectedType) {
		return fmt.Errorf("type mismatch: expected %s, got %s", expectedType.Primitive, actualType.Primitive)
	}
	return nil
}

func (tc *TypeChecker) inferType(expr *Expr) TypeDef {
	switch expr.Kind {
	case ExprLiteral:
		return expr.Type
	case ExprIdentifier:
		if entry, ok := tc.Env.Vars[expr.Name]; ok {
			return entry.Type
		}
		return TypeDef{Kind: KindPrimitive, Primitive: TypeAny}
	case ExprBinary:
		switch expr.Op {
		case "==", "!=", "<", ">", "<=", ">=", "&&", "||":
			return TypeDef{Kind: KindPrimitive, Primitive: TypeBool}
		}
		return tc.inferType(expr.Left)
	case ExprUnary:
		if expr.Op == "!" {
			return TypeDef{Kind: KindPrimitive, Primitive: TypeBool}
		}
		return tc.inferType(expr.Operand)
	}
	return TypeDef{Kind: KindPrimitive, Primitive: TypeAny}
}

// ============================================================================
// INTERPRETER
// ============================================================================

type ControlFlowType string

const (
	CFNone     ControlFlowType = ""
	CFReturn   ControlFlowType = "return"
	CFBreak    ControlFlowType = "break"
	CFContinue ControlFlowType = "continue"
)

type ControlFlow struct {
	Type  ControlFlowType
	Value interface{}
}

type VarEntry struct {
	Value   interface{}
	Mutable bool
}

type FuncDef struct {
	Params []string
	Body   []*Stmt
}

type Environment struct {
	Vars      map[string]*VarEntry
	Functions map[string]*FuncDef
	Modules   map[string]interface{}
	Parent    *Environment
}

func NewEnvironment() *Environment {
	return &Environment{
		Vars:      make(map[string]*VarEntry),
		Functions: make(map[string]*FuncDef),
		Modules:   make(map[string]interface{}),
	}
}

func (e *Environment) Set(name string, value interface{}, mutable bool) {
	e.Vars[name] = &VarEntry{Value: value, Mutable: mutable}
}

func (e *Environment) Get(name string) (interface{}, error) {
	if entry, ok := e.Vars[name]; ok {
		return entry.Value, nil
	}
	if e.Parent != nil {
		return e.Parent.Get(name)
	}
	return nil, fmt.Errorf("undefined variable: %s", name)
}

func (e *Environment) Update(name string, value interface{}) error {
	if entry, ok := e.Vars[name]; ok {
		if !entry.Mutable {
			return fmt.Errorf("cannot reassign immutable variable: %s", name)
		}
		entry.Value = value
		return nil
	}
	if e.Parent != nil {
		return e.Parent.Update(name, value)
	}
	return fmt.Errorf("undefined variable: %s", name)
}

func (e *Environment) SetFunction(name string, params []string, body []*Stmt) {
	e.Functions[name] = &FuncDef{Params: params, Body: body}
}

func (e *Environment) GetFunction(name string) *FuncDef {
	if fn, ok := e.Functions[name]; ok {
		return fn
	}
	if e.Parent != nil {
		return e.Parent.GetFunction(name)
	}
	return nil
}

func (e *Environment) SetModule(name string, module interface{}) {
	e.Modules[name] = module
}

func (e *Environment) GetModule(name string) interface{} {
	if m, ok := e.Modules[name]; ok {
		return m
	}
	if e.Parent != nil {
		return e.Parent.GetModule(name)
	}
	return nil
}

type Interpreter struct {
	Env         *Environment
	ControlFlow ControlFlow
	Builtins    map[string]func([]interface{}) interface{}
}

func NewInterpreter() *Interpreter {
	interp := &Interpreter{
		Env:         NewEnvironment(),
		ControlFlow: ControlFlow{Type: CFNone},
	}
	interp.setupStdlib()
	interp.setupBuiltins()
	return interp
}

func (i *Interpreter) setupBuiltins() {
	i.Builtins = map[string]func([]interface{}) interface{}{
		"strlen":      func(args []interface{}) interface{} { return int64(len(toString(args[0]))) },
		"substr":      func(args []interface{}) interface{} { s := toString(args[0]); start := toInt(args[1]); end := toInt(args[2]); if end > int64(len(s)) { end = int64(len(s)) }; return s[start:end] },
		"toUpperCase": func(args []interface{}) interface{} { return strings.ToUpper(toString(args[0])) },
		"toLowerCase": func(args []interface{}) interface{} { return strings.ToLower(toString(args[0])) },
		"trim":        func(args []interface{}) interface{} { return strings.TrimSpace(toString(args[0])) },
		"split":       func(args []interface{}) interface{} { return strings.Split(toString(args[0]), toString(args[1])) },
		"join":        func(args []interface{}) interface{} { arr := toStringSlice(args[0]); return strings.Join(arr, toString(args[1])) },
		"startsWith":  func(args []interface{}) interface{} { return strings.HasPrefix(toString(args[0]), toString(args[1])) },
		"endsWith":    func(args []interface{}) interface{} { return strings.HasSuffix(toString(args[0]), toString(args[1])) },
		"includes":    func(args []interface{}) interface{} { return strings.Contains(toString(args[0]), toString(args[1])) },
		"indexOf":     func(args []interface{}) interface{} { return int64(strings.Index(toString(args[0]), toString(args[1]))) },
		"replace":     func(args []interface{}) interface{} { return strings.Replace(toString(args[0]), toString(args[1]), toString(args[2]), 1) },
		"replaceAll":  func(args []interface{}) interface{} { return strings.ReplaceAll(toString(args[0]), toString(args[1]), toString(args[2])) },
		"repeat":      func(args []interface{}) interface{} { return strings.Repeat(toString(args[0]), int(toInt(args[1]))) },
		"abs":         func(args []interface{}) interface{} { return math.Abs(toFloat(args[0])) },
		"sqrt":        func(args []interface{}) interface{} { return math.Sqrt(toFloat(args[0])) },
		"pow":         func(args []interface{}) interface{} { return math.Pow(toFloat(args[0]), toFloat(args[1])) },
		"sin":         func(args []interface{}) interface{} { return math.Sin(toFloat(args[0])) },
		"cos":         func(args []interface{}) interface{} { return math.Cos(toFloat(args[0])) },
		"tan":         func(args []interface{}) interface{} { return math.Tan(toFloat(args[0])) },
		"asin":        func(args []interface{}) interface{} { return math.Asin(toFloat(args[0])) },
		"acos":        func(args []interface{}) interface{} { return math.Acos(toFloat(args[0])) },
		"atan":        func(args []interface{}) interface{} { return math.Atan(toFloat(args[0])) },
		"atan2":       func(args []interface{}) interface{} { return math.Atan2(toFloat(args[0]), toFloat(args[1])) },
		"exp":         func(args []interface{}) interface{} { return math.Exp(toFloat(args[0])) },
		"log":         func(args []interface{}) interface{} { return math.Log(toFloat(args[0])) },
		"log10":       func(args []interface{}) interface{} { return math.Log10(toFloat(args[0])) },
		"log2":        func(args []interface{}) interface{} { return math.Log2(toFloat(args[0])) },
		"ceil":        func(args []interface{}) interface{} { return math.Ceil(toFloat(args[0])) },
		"floor":       func(args []interface{}) interface{} { return math.Floor(toFloat(args[0])) },
		"round":       func(args []interface{}) interface{} { return math.Round(toFloat(args[0])) },
		"trunc":       func(args []interface{}) interface{} { return math.Trunc(toFloat(args[0])) },
		"max":         func(args []interface{}) interface{} { return math.Max(toFloat(args[0]), toFloat(args[1])) },
		"min":         func(args []interface{}) interface{} { return math.Min(toFloat(args[0]), toFloat(args[1])) },
		"gcd": func(args []interface{}) interface{} {
			a, b := toInt(args[0]), toInt(args[1])
			if a < 0 {
				a = -a
			}
			if b < 0 {
				b = -b
			}
			for b != 0 {
				a, b = b, a%b
			}
			return a
		},
		"typeof":    func(args []interface{}) interface{} { return fmt.Sprintf("%T", args[0]) },
		"parseInt":  func(args []interface{}) interface{} { v, _ := strconv.ParseInt(toString(args[0]), 10, 64); return v },
		"parseFloat": func(args []interface{}) interface{} { v, _ := strconv.ParseFloat(toString(args[0]), 64); return v },
		"toString":  func(args []interface{}) interface{} { return fmt.Sprintf("%v", args[0]) },
		"toBoolean": func(args []interface{}) interface{} { return toBool(args[0]) },
		"toNumber":  func(args []interface{}) interface{} { return toFloat(args[0]) },
		"isNaN":     func(args []interface{}) interface{} { return math.IsNaN(toFloat(args[0])) },
		"isFinite":  func(args []interface{}) interface{} { f := toFloat(args[0]); return !math.IsInf(f, 0) && !math.IsNaN(f) },
		"now":       func(args []interface{}) interface{} { return time.Now().UnixMilli() },
		"timestamp": func(args []interface{}) interface{} { return time.Now().Unix() },
		"range": func(args []interface{}) interface{} {
			start := toInt(args[0])
			end := toInt(args[1])
			var result []interface{}
			for i := start; i < end; i++ {
				result = append(result, i)
			}
			return result
		},
		"hash": func(args []interface{}) interface{} {
			s := toString(args[0])
			var h int64
			for _, c := range s {
				h = ((h << 5) - h) + int64(c)
			}
			return h
		},
		"clone": func(args []interface{}) interface{} {
			data, _ := json.Marshal(args[0])
			var result interface{}
			json.Unmarshal(data, &result)
			return result
		},
		"readFile": func(args []interface{}) interface{} {
			data, err := os.ReadFile(toString(args[0]))
			if err != nil {
				return nil
			}
			return string(data)
		},
		"writeFile": func(args []interface{}) interface{} {
			err := os.WriteFile(toString(args[0]), []byte(toString(args[1])), 0644)
			return err == nil
		},
		"appendFile": func(args []interface{}) interface{} {
			f, err := os.OpenFile(toString(args[0]), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				return false
			}
			defer f.Close()
			_, err = f.WriteString(toString(args[1]))
			return err == nil
		},
		"exists": func(args []interface{}) interface{} {
			_, err := os.Stat(toString(args[0]))
			return err == nil
		},
		"isFile": func(args []interface{}) interface{} {
			info, err := os.Stat(toString(args[0]))
			return err == nil && !info.IsDir()
		},
		"isDirectory": func(args []interface{}) interface{} {
			info, err := os.Stat(toString(args[0]))
			return err == nil && info.IsDir()
		},
		"mkdir": func(args []interface{}) interface{} {
			return os.MkdirAll(toString(args[0]), 0755) == nil
		},
		"match": func(args []interface{}) interface{} {
			re, err := regexp.Compile(toString(args[1]))
			if err != nil {
				return nil
			}
			return re.FindString(toString(args[0]))
		},
		"test": func(args []interface{}) interface{} {
			re, err := regexp.Compile(toString(args[1]))
			if err != nil {
				return false
			}
			return re.MatchString(toString(args[0]))
		},
	}
}

func (i *Interpreter) setupStdlib() {
	ioModule := map[string]interface{}{
		"print":   func(value interface{}) interface{} { fmt.Println(value); return nil },
		"println": func(value interface{}) interface{} { fmt.Println(value); return nil },
	}
	i.Env.SetModule("std::io", ioModule)
	i.Env.SetModule("str", ioModule)

	mathModule := map[string]interface{}{
		"sqrt":   func(x float64) float64 { return math.Sqrt(x) },
		"sin":    func(x float64) float64 { return math.Sin(x) },
		"cos":    func(x float64) float64 { return math.Cos(x) },
		"tan":    func(x float64) float64 { return math.Tan(x) },
		"asin":   func(x float64) float64 { return math.Asin(x) },
		"acos":   func(x float64) float64 { return math.Acos(x) },
		"atan":   func(x float64) float64 { return math.Atan(x) },
		"exp":    func(x float64) float64 { return math.Exp(x) },
		"log":    func(x float64) float64 { return math.Log(x) },
		"log10":  func(x float64) float64 { return math.Log10(x) },
		"log2":   func(x float64) float64 { return math.Log2(x) },
		"floor":  func(x float64) float64 { return math.Floor(x) },
		"ceil":   func(x float64) float64 { return math.Ceil(x) },
		"round":  func(x float64) float64 { return math.Round(x) },
		"abs":    func(x float64) float64 { return math.Abs(x) },
		"pow":    func(x, y float64) float64 { return math.Pow(x, y) },
		"random": func() float64 { return float64(time.Now().UnixNano()%1000000) / 1000000.0 },
		"PI":     math.Pi,
		"E":      math.E,
	}
	i.Env.SetModule("math", mathModule)
	i.Env.SetModule("std::math", mathModule)

	textModule := map[string]interface{}{
		"split":       func(s, sep string) []string { return strings.Split(s, sep) },
		"join":        func(arr []string, sep string) string { return strings.Join(arr, sep) },
		"trim":        func(s string) string { return strings.TrimSpace(s) },
		"toUpperCase": func(s string) string { return strings.ToUpper(s) },
		"toLowerCase": func(s string) string { return strings.ToLower(s) },
		"startsWith":  func(s, prefix string) bool { return strings.HasPrefix(s, prefix) },
		"endsWith":    func(s, suffix string) bool { return strings.HasSuffix(s, suffix) },
		"includes":    func(s, substr string) bool { return strings.Contains(s, substr) },
		"indexOf":     func(s, substr string) int { return strings.Index(s, substr) },
		"replace":     func(s, old, new string) string { return strings.Replace(s, old, new, 1) },
		"replaceAll":  func(s, old, new string) string { return strings.ReplaceAll(s, old, new) },
		"repeat":      func(s string, count int) string { return strings.Repeat(s, count) },
		"length":      func(s string) int { return len(s) },
	}
	i.Env.SetModule("std::text", textModule)

	fileModule := map[string]interface{}{
		"read": func(path string) interface{} {
			data, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			return string(data)
		},
		"write": func(path, content string) bool {
			return os.WriteFile(path, []byte(content), 0644) == nil
		},
		"append": func(path, content string) bool {
			f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				return false
			}
			defer f.Close()
			_, err = f.WriteString(content)
			return err == nil
		},
		"exists": func(path string) bool {
			_, err := os.Stat(path)
			return err == nil
		},
		"delete": func(path string) bool {
			return os.Remove(path) == nil
		},
		"isFile": func(path string) bool {
			info, err := os.Stat(path)
			return err == nil && !info.IsDir()
		},
		"isDirectory": func(path string) bool {
			info, err := os.Stat(path)
			return err == nil && info.IsDir()
		},
		"mkdir": func(path string) bool {
			return os.MkdirAll(path, 0755) == nil
		},
	}
	i.Env.SetModule("std::file", fileModule)

	timeModule := map[string]interface{}{
		"now":        func() int64 { return time.Now().UnixMilli() },
		"timestamp":  func() int64 { return time.Now().Unix() },
		"getDate":    func(ms int64) int { return time.UnixMilli(ms).Day() },
		"getMonth":   func(ms int64) int { return int(time.UnixMilli(ms).Month()) },
		"getYear":    func(ms int64) int { return time.UnixMilli(ms).Year() },
		"getHours":   func(ms int64) int { return time.UnixMilli(ms).Hour() },
		"getMinutes": func(ms int64) int { return time.UnixMilli(ms).Minute() },
		"getSeconds": func(ms int64) int { return time.UnixMilli(ms).Second() },
	}
	i.Env.SetModule("std::time", timeModule)

	regexModule := map[string]interface{}{
		"match": func(str, pattern string) interface{} {
			re, err := regexp.Compile(pattern)
			if err != nil {
				return nil
			}
			return re.FindString(str)
		},
		"test": func(str, pattern string) bool {
			re, err := regexp.Compile(pattern)
			if err != nil {
				return false
			}
			return re.MatchString(str)
		},
		"search": func(str, pattern string) int {
			re, err := regexp.Compile(pattern)
			if err != nil {
				return -1
			}
			loc := re.FindStringIndex(str)
			if loc == nil {
				return -1
			}
			return loc[0]
		},
		"replace": func(str, pattern, replacement string) string {
			re, err := regexp.Compile(pattern)
			if err != nil {
				return str
			}
			return re.ReplaceAllString(str, replacement)
		},
	}
	i.Env.SetModule("std::regex", regexModule)

	typeModule := map[string]interface{}{
		"typeof":      func(x interface{}) string { return fmt.Sprintf("%T", x) },
		"isNull":      func(x interface{}) bool { return x == nil },
		"isNumber":    func(x interface{}) bool { _, ok := x.(float64); _, ok2 := x.(int64); return ok || ok2 },
		"isString":    func(x interface{}) bool { _, ok := x.(string); return ok },
		"isBoolean":   func(x interface{}) bool { _, ok := x.(bool); return ok },
		"toNumber":    func(x interface{}) float64 { return toFloat(x) },
		"toString":    func(x interface{}) string { return fmt.Sprintf("%v", x) },
		"toBoolean":   func(x interface{}) bool { return toBool(x) },
		"toInt":       func(x interface{}) int64 { return toInt(x) },
		"toFloat":     func(x interface{}) float64 { return toFloat(x) },
	}
	i.Env.SetModule("std::type", typeModule)
}

func (i *Interpreter) Interpret(statements []*Stmt) error {
	for _, stmt := range statements {
		if err := i.interpretStatement(stmt); err != nil {
			return err
		}
		if i.ControlFlow.Type != CFNone {
			break
		}
	}
	return nil
}

func (i *Interpreter) interpretStatement(stmt *Stmt) error {
	switch stmt.Kind {
	case StmtLet:
		value, err := i.evaluateExpression(stmt.Value)
		if err != nil {
			return err
		}
		i.Env.Set(stmt.Name, value, stmt.Mutable)

	case StmtAssignment:
		value, err := i.evaluateExpression(stmt.Value)
		if err != nil {
			return err
		}
		return i.Env.Update(stmt.Target, value)

	case StmtExpression:
		_, err := i.evaluateExpression(stmt.Expr)
		return err

	case StmtIf:
		cond, err := i.evaluateExpression(stmt.Condition)
		if err != nil {
			return err
		}
		if toBool(cond) {
			for _, s := range stmt.Then {
				if err := i.interpretStatement(s); err != nil {
					return err
				}
				if i.ControlFlow.Type != CFNone {
					return nil
				}
			}
		} else if len(stmt.Else) > 0 {
			for _, s := range stmt.Else {
				if err := i.interpretStatement(s); err != nil {
					return err
				}
				if i.ControlFlow.Type != CFNone {
					return nil
				}
			}
		}

	case StmtWhile:
		for {
			cond, err := i.evaluateExpression(stmt.Condition)
			if err != nil {
				return err
			}
			if !toBool(cond) {
				break
			}
			for _, s := range stmt.Body {
				if err := i.interpretStatement(s); err != nil {
					return err
				}
				if i.ControlFlow.Type == CFBreak {
					i.ControlFlow.Type = CFNone
					return nil
				}
				if i.ControlFlow.Type == CFContinue {
					i.ControlFlow.Type = CFNone
					break
				}
				if i.ControlFlow.Type == CFReturn {
					return nil
				}
			}
		}

	case StmtFor:
		if err := i.interpretStatement(stmt.Init); err != nil {
			return err
		}
		for {
			cond, err := i.evaluateExpression(stmt.Condition)
			if err != nil {
				return err
			}
			if !toBool(cond) {
				break
			}
			for _, s := range stmt.Body {
				if err := i.interpretStatement(s); err != nil {
					return err
				}
				if i.ControlFlow.Type == CFBreak {
					i.ControlFlow.Type = CFNone
					return nil
				}
				if i.ControlFlow.Type == CFContinue {
					i.ControlFlow.Type = CFNone
					break
				}
				if i.ControlFlow.Type == CFReturn {
					return nil
				}
			}
			if err := i.interpretStatement(stmt.Update); err != nil {
				return err
			}
		}

	case StmtReturn:
		if stmt.Value != nil {
			value, err := i.evaluateExpression(stmt.Value)
			if err != nil {
				return err
			}
			i.ControlFlow.Value = value
		}
		i.ControlFlow.Type = CFReturn

	case StmtBreak:
		i.ControlFlow.Type = CFBreak

	case StmtContinue:
		i.ControlFlow.Type = CFContinue

	case StmtFunction:
		var params []string
		for _, p := range stmt.Params {
			params = append(params, p.Name)
		}
		i.Env.SetFunction(stmt.Name, params, stmt.Body)

	case StmtImport:
		module := i.Env.GetModule(stmt.Module)
		if module == nil {
			return fmt.Errorf("module not found: %s", stmt.Module)
		}
		i.Env.Set(stmt.Name, module, false)
	}
	return nil
}

func (i *Interpreter) evaluateExpression(expr *Expr) (interface{}, error) {
	if expr == nil {
		return nil, nil
	}

	switch expr.Kind {
	case ExprLiteral:
		return expr.Value, nil

	case ExprIdentifier:
		return i.Env.Get(expr.Name)

	case ExprBinary:
		left, err := i.evaluateExpression(expr.Left)
		if err != nil {
			return nil, err
		}
		right, err := i.evaluateExpression(expr.Right)
		if err != nil {
			return nil, err
		}
		return i.evalBinaryOp(expr.Op, left, right)

	case ExprUnary:
		operand, err := i.evaluateExpression(expr.Operand)
		if err != nil {
			return nil, err
		}
		return i.evalUnaryOp(expr.Op, operand)

	case ExprCall:
		if expr.Func.Kind == ExprIdentifier {
			funcName := expr.Func.Name
			if builtin, ok := i.Builtins[funcName]; ok {
				var args []interface{}
				for _, arg := range expr.Args {
					val, err := i.evaluateExpression(arg)
					if err != nil {
						return nil, err
					}
					args = append(args, val)
				}
				return builtin(args), nil
			}

			if fn := i.Env.GetFunction(funcName); fn != nil {
				var argVals []interface{}
				for _, arg := range expr.Args {
					val, err := i.evaluateExpression(arg)
					if err != nil {
						return nil, err
					}
					argVals = append(argVals, val)
				}

				oldEnv := i.Env
				i.Env = &Environment{
					Vars:      make(map[string]*VarEntry),
					Functions: make(map[string]*FuncDef),
					Modules:   make(map[string]interface{}),
					Parent:    oldEnv,
				}

				for idx, param := range fn.Params {
					if idx < len(argVals) {
						i.Env.Set(param, argVals[idx], false)
					}
				}

				for _, stmt := range fn.Body {
					if err := i.interpretStatement(stmt); err != nil {
						i.Env = oldEnv
						return nil, err
					}
					if i.ControlFlow.Type == CFReturn {
						result := i.ControlFlow.Value
						i.ControlFlow.Type = CFNone
						i.ControlFlow.Value = nil
						i.Env = oldEnv
						return result, nil
					}
				}

				i.Env = oldEnv
				return nil, nil
			}
		}

		fn, err := i.evaluateExpression(expr.Func)
		if err != nil {
			return nil, err
		}

		var args []interface{}
		for _, arg := range expr.Args {
			val, err := i.evaluateExpression(arg)
			if err != nil {
				return nil, err
			}
			args = append(args, val)
		}

		switch f := fn.(type) {
		case func(interface{}) interface{}:
			if len(args) > 0 {
				return f(args[0]), nil
			}
			return f(nil), nil
		case func(float64) float64:
			return f(toFloat(args[0])), nil
		case func(float64, float64) float64:
			return f(toFloat(args[0]), toFloat(args[1])), nil
		case func(string) string:
			return f(toString(args[0])), nil
		case func(string, string) string:
			return f(toString(args[0]), toString(args[1])), nil
		case func(string, string, string) string:
			return f(toString(args[0]), toString(args[1]), toString(args[2])), nil
		case func(string, string) bool:
			return f(toString(args[0]), toString(args[1])), nil
		case func(string, string) int:
			return int64(f(toString(args[0]), toString(args[1]))), nil
		case func(string, int) string:
			return f(toString(args[0]), int(toInt(args[1]))), nil
		case func(string) int:
			return int64(f(toString(args[0]))), nil
		case func(string) bool:
			return f(toString(args[0])), nil
		case func(string) interface{}:
			return f(toString(args[0])), nil
		case func(string, string) interface{}:
			return f(toString(args[0]), toString(args[1])), nil
		case func() int64:
			return f(), nil
		case func(int64) int:
			return int64(f(toInt(args[0]))), nil
		case func(interface{}) string:
			return f(args[0]), nil
		case func(interface{}) bool:
			return f(args[0]), nil
		case func(interface{}) float64:
			return f(args[0]), nil
		case func(interface{}) int64:
			return f(args[0]), nil
		}

		return nil, fmt.Errorf("not a function: %T", fn)

	case ExprMember:
		obj, err := i.evaluateExpression(expr.Object)
		if err != nil {
			return nil, err
		}
		if m, ok := obj.(map[string]interface{}); ok {
			return m[expr.Property], nil
		}
		return nil, nil
	}

	return nil, fmt.Errorf("unknown expression kind: %s", expr.Kind)
}

func (i *Interpreter) evalBinaryOp(op string, left, right interface{}) (interface{}, error) {
	switch op {
	case "+":
		if ls, ok := left.(string); ok {
			return ls + toString(right), nil
		}
		return toFloat(left) + toFloat(right), nil
	case "-":
		return toFloat(left) - toFloat(right), nil
	case "*":
		return toFloat(left) * toFloat(right), nil
	case "/":
		return toFloat(left) / toFloat(right), nil
	case "%":
		return int64(toInt(left)) % int64(toInt(right)), nil
	case "==":
		return fmt.Sprintf("%v", left) == fmt.Sprintf("%v", right), nil
	case "!=":
		return fmt.Sprintf("%v", left) != fmt.Sprintf("%v", right), nil
	case "<":
		return toFloat(left) < toFloat(right), nil
	case ">":
		return toFloat(left) > toFloat(right), nil
	case "<=":
		return toFloat(left) <= toFloat(right), nil
	case ">=":
		return toFloat(left) >= toFloat(right), nil
	case "&&":
		return toBool(left) && toBool(right), nil
	case "||":
		return toBool(left) || toBool(right), nil
	}
	return nil, fmt.Errorf("unknown operator: %s", op)
}

func (i *Interpreter) evalUnaryOp(op string, operand interface{}) (interface{}, error) {
	switch op {
	case "-":
		return -toFloat(operand), nil
	case "+":
		return toFloat(operand), nil
	case "!":
		return !toBool(operand), nil
	case "~":
		return ^toInt(operand), nil
	}
	return nil, fmt.Errorf("unknown unary operator: %s", op)
}

// ============================================================================
// C CODE GENERATOR
// ============================================================================

type CGenerator struct {
	code []string
}

func NewCGenerator() *CGenerator {
	return &CGenerator{}
}

func (g *CGenerator) Generate(statements []*Stmt) string {
	g.code = []string{}
	g.code = append(g.code, "#include <stdio.h>")
	g.code = append(g.code, "#include <math.h>")
	g.code = append(g.code, "int main() {")

	for _, stmt := range statements {
		g.generateStatement(stmt)
	}

	g.code = append(g.code, "return 0;")
	g.code = append(g.code, "}")

	return strings.Join(g.code, "\n")
}

func (g *CGenerator) generateStatement(stmt *Stmt) {
	switch stmt.Kind {
	case StmtLet:
		ctype := g.typeToCString(stmt.Type)
		value := g.generateExpression(stmt.Value)
		g.code = append(g.code, fmt.Sprintf("%s %s = %s;", ctype, stmt.Name, value))
	case StmtExpression:
		expr := g.generateExpression(stmt.Expr)
		g.code = append(g.code, fmt.Sprintf("%s;", expr))
	case StmtIf:
		condition := g.generateExpression(stmt.Condition)
		g.code = append(g.code, fmt.Sprintf("if (%s) {", condition))
		for _, s := range stmt.Then {
			g.generateStatement(s)
		}
		g.code = append(g.code, "}")
	case StmtReturn:
		if stmt.Value != nil {
			value := g.generateExpression(stmt.Value)
			g.code = append(g.code, fmt.Sprintf("return %s;", value))
		} else {
			g.code = append(g.code, "return 0;")
		}
	}
}

func (g *CGenerator) generateExpression(expr *Expr) string {
	if expr == nil {
		return ""
	}
	switch expr.Kind {
	case ExprLiteral:
		if s, ok := expr.Value.(string); ok {
			return fmt.Sprintf("\"%s\"", s)
		}
		return fmt.Sprintf("%v", expr.Value)
	case ExprIdentifier:
		return expr.Name
	case ExprBinary:
		left := g.generateExpression(expr.Left)
		right := g.generateExpression(expr.Right)
		return fmt.Sprintf("(%s %s %s)", left, expr.Op, right)
	case ExprUnary:
		operand := g.generateExpression(expr.Operand)
		return fmt.Sprintf("(%s%s)", expr.Op, operand)
	case ExprCall:
		fn := g.generateExpression(expr.Func)
		var args []string
		for _, arg := range expr.Args {
			args = append(args, g.generateExpression(arg))
		}
		return fmt.Sprintf("%s(%s)", fn, strings.Join(args, ", "))
	case ExprMember:
		obj := g.generateExpression(expr.Object)
		return fmt.Sprintf("%s.%s", obj, expr.Property)
	}
	return ""
}

func (g *CGenerator) typeToCString(t TypeDef) string {
	if t.Kind == KindPrimitive {
		switch t.Primitive {
		case TypeInt:
			return "int"
		case TypeFloat:
			return "double"
		case TypeBool:
			return "int"
		case TypeChar:
			return "char"
		case TypeString:
			return "char*"
		}
	}
	return "int"
}

// ============================================================================
// PACKAGE MANAGER
// ============================================================================

type StrataumfileConfig struct {
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Registry     string            `json:"registry,omitempty"`
	Dependencies map[string]string `json:"dependencies,omitempty"`
}

type LockPackage struct {
	Version   string `json:"version"`
	Installed bool   `json:"installed"`
	Timestamp string `json:"timestamp"`
}

type LockFile struct {
	Locked    bool                    `json:"locked"`
	Version   string                  `json:"version,omitempty"`
	Timestamp string                  `json:"timestamp,omitempty"`
	Packages  map[string]*LockPackage `json:"packages,omitempty"`
}

type PackageManager struct {
	ProjectRoot  string
	Strataumfile StrataumfileConfig
	LockFile     LockFile
}

func NewPackageManager(projectRoot string) *PackageManager {
	if projectRoot == "" {
		projectRoot, _ = os.Getwd()
	}
	pm := &PackageManager{ProjectRoot: projectRoot}
	pm.loadStrataumfile()
	pm.loadLockFile()
	return pm
}

func (pm *PackageManager) loadStrataumfile() {
	path := pm.ProjectRoot + "/Strataumfile"
	data, err := os.ReadFile(path)
	if err != nil {
		pm.Strataumfile = StrataumfileConfig{Name: "unknown", Version: "0.0.0", Dependencies: make(map[string]string)}
		return
	}
	json.Unmarshal(data, &pm.Strataumfile)
	if pm.Strataumfile.Dependencies == nil {
		pm.Strataumfile.Dependencies = make(map[string]string)
	}
}

func (pm *PackageManager) loadLockFile() {
	path := pm.ProjectRoot + "/Strataumfile.lock"
	data, err := os.ReadFile(path)
	if err != nil {
		pm.LockFile = LockFile{Locked: false, Packages: make(map[string]*LockPackage)}
		return
	}
	json.Unmarshal(data, &pm.LockFile)
	if pm.LockFile.Packages == nil {
		pm.LockFile.Packages = make(map[string]*LockPackage)
	}
}

func (pm *PackageManager) saveStrataumfile() {
	path := pm.ProjectRoot + "/Strataumfile"
	data, _ := json.MarshalIndent(pm.Strataumfile, "", "  ")
	os.WriteFile(path, data, 0644)
	fmt.Printf("✓ Updated %s\n", path)
}

func (pm *PackageManager) saveLockFile() {
	path := pm.ProjectRoot + "/Strataumfile.lock"
	pm.LockFile.Timestamp = time.Now().Format(time.RFC3339)
	data, _ := json.MarshalIndent(pm.LockFile, "", "  ")
	os.WriteFile(path, data, 0644)
	fmt.Printf("✓ Locked dependencies in %s\n", path)
}

func (pm *PackageManager) Install(packageName string) {
	packagesDir := pm.ProjectRoot + "/.strata/packages"
	os.MkdirAll(packagesDir, 0755)

	if packageName != "" {
		pm.installPackage(packageName, packagesDir, "")
	} else {
		if len(pm.Strataumfile.Dependencies) == 0 {
			fmt.Println("No dependencies to install.")
			return
		}
		for pkg, version := range pm.Strataumfile.Dependencies {
			pm.installPackage(pkg, packagesDir, version)
		}
	}
	pm.saveLockFile()
	fmt.Println("✓ Installation complete")
}

func (pm *PackageManager) installPackage(packageName, packagesDir, version string) {
	if version == "" {
		version = "1.0.0"
	}
	pkgDir := packagesDir + "/" + packageName
	os.MkdirAll(pkgDir, 0755)

	moduleContent := fmt.Sprintf(`// %s module (v%s)
export func init() => void {
    io.print("%s loaded")
}
`, packageName, version, packageName)
	os.WriteFile(pkgDir+"/index.str", []byte(moduleContent), 0644)

	pkgInfo := map[string]string{"name": packageName, "version": version, "main": "index.str"}
	data, _ := json.MarshalIndent(pkgInfo, "", "  ")
	os.WriteFile(pkgDir+"/package.json", data, 0644)

	pm.LockFile.Packages[packageName] = &LockPackage{
		Version:   version,
		Installed: true,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	fmt.Printf("✓ Installed %s@%s\n", packageName, version)
}

func (pm *PackageManager) Add(packageName, version string) {
	if version == "" {
		version = "latest"
	}
	pm.Strataumfile.Dependencies[packageName] = version
	pm.saveStrataumfile()

	packagesDir := pm.ProjectRoot + "/.strata/packages"
	os.MkdirAll(packagesDir, 0755)
	pm.installPackage(packageName, packagesDir, version)
	pm.saveLockFile()
	fmt.Printf("✓ Added %s@%s\n", packageName, version)
}

func (pm *PackageManager) Remove(packageName string) {
	if _, ok := pm.Strataumfile.Dependencies[packageName]; ok {
		delete(pm.Strataumfile.Dependencies, packageName)
		pm.saveStrataumfile()

		pkgDir := pm.ProjectRoot + "/.strata/packages/" + packageName
		os.RemoveAll(pkgDir)

		delete(pm.LockFile.Packages, packageName)
		pm.saveLockFile()
		fmt.Printf("✓ Removed %s\n", packageName)
	} else {
		fmt.Fprintf(os.Stderr, "Package %s not found in dependencies\n", packageName)
		os.Exit(1)
	}
}

func (pm *PackageManager) List() {
	fmt.Println("\nInstalled Packages:")
	fmt.Println("==================")
	if len(pm.Strataumfile.Dependencies) == 0 {
		fmt.Println("No packages installed")
		return
	}
	for pkg, version := range pm.Strataumfile.Dependencies {
		status := "✗"
		if pm.LockFile.Packages[pkg] != nil && pm.LockFile.Packages[pkg].Installed {
			status = "✓"
		}
		fmt.Printf("%s %s@%s\n", status, pkg, version)
	}
}

func (pm *PackageManager) Init(name, version string) {
	if version == "" {
		version = "0.0.1"
	}
	strataumfile := StrataumfileConfig{
		Name:         name,
		Version:      version,
		Registry:     "https://registry.stratauim.io",
		Dependencies: make(map[string]string),
	}
	data, _ := json.MarshalIndent(strataumfile, "", "  ")
	os.WriteFile(pm.ProjectRoot+"/Strataumfile", data, 0644)

	lockFile := LockFile{
		Locked:    true,
		Version:   "1.0",
		Timestamp: time.Now().Format(time.RFC3339),
		Packages:  make(map[string]*LockPackage),
	}
	data, _ = json.MarshalIndent(lockFile, "", "  ")
	os.WriteFile(pm.ProjectRoot+"/Strataumfile.lock", data, 0644)

	fmt.Printf("✓ Initialized Strata project: %s\n", name)
}

func (pm *PackageManager) Info() {
	fmt.Println("\nProject Information:")
	fmt.Println("====================")
	fmt.Printf("Name: %s\n", pm.Strataumfile.Name)
	fmt.Printf("Version: %s\n", pm.Strataumfile.Version)
	registry := pm.Strataumfile.Registry
	if registry == "" {
		registry = "default"
	}
	fmt.Printf("Registry: %s\n", registry)
	fmt.Printf("Dependencies: %d\n", len(pm.Strataumfile.Dependencies))
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case []byte:
		return string(val)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func toFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	}
	return 0
}

func toInt(v interface{}) int64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case int64:
		return val
	case int:
		return int64(val)
	case int32:
		return int64(val)
	case float64:
		return int64(val)
	case float32:
		return int64(val)
	case string:
		i, _ := strconv.ParseInt(val, 10, 64)
		return i
	}
	return 0
}

func toBool(v interface{}) bool {
	if v == nil {
		return false
	}
	switch val := v.(type) {
	case bool:
		return val
	case int:
		return val != 0
	case int64:
		return val != 0
	case float64:
		return val != 0
	case string:
		return val != "" && val != "false" && val != "0"
	}
	return true
}

func toStringSlice(v interface{}) []string {
	if arr, ok := v.([]string); ok {
		return arr
	}
	if arr, ok := v.([]interface{}); ok {
		var result []string
		for _, item := range arr {
			result = append(result, toString(item))
		}
		return result
	}
	return nil
}

func isIdentChar(c rune) bool {
	return unicode.IsLetter(c) || unicode.IsDigit(c) || c == '_'
}

// ============================================================================
// MAIN
// ============================================================================

func main() {
	args := os.Args[1:]

	if len(args) > 0 {
		command := args[0]
		pm := NewPackageManager("")

		switch command {
		case "init":
			projectName := "my-strata-project"
			version := "0.0.1"
			if len(args) > 1 {
				projectName = args[1]
			}
			if len(args) > 2 {
				version = args[2]
			}
			pm.Init(projectName, version)
			return
		case "install":
			pkgName := ""
			if len(args) > 1 {
				pkgName = args[1]
			}
			pm.Install(pkgName)
			return
		case "add":
			if len(args) < 2 {
				fmt.Fprintln(os.Stderr, "Usage: strataum add <package> [version]")
				os.Exit(1)
			}
			version := "latest"
			if len(args) > 2 {
				version = args[2]
			}
			pm.Add(args[1], version)
			return
		case "remove":
			if len(args) < 2 {
				fmt.Fprintln(os.Stderr, "Usage: strataum remove <package>")
				os.Exit(1)
			}
			pm.Remove(args[1])
			return
		case "list":
			pm.List()
			return
		case "info":
			pm.Info()
			return
		}
	}

	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "Usage: strata <file.str> or strataum <command>")
		os.Exit(1)
	}

	startTime := time.Now()

	filePath := args[0]
	source, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	parser := NewParser(string(source))
	statements, err := parser.Parse()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	typeChecker := NewTypeChecker()
	if err := typeChecker.Check(statements); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	interpreter := NewInterpreter()
	if err := interpreter.Interpret(statements); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	elapsed := time.Since(startTime)
	fmt.Fprintf(os.Stderr, "Executed in %.2fms\n", float64(elapsed.Nanoseconds())/1e6)
}
