package main

import (
	"fmt"
	"strconv"
	"strings"
)

// ============================================================================
// PARSER - Recursive descent parser with operator precedence
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
