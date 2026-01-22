package main

import (
	"fmt"
	"strings"
)

// ============================================================================
// C CODE GENERATOR - Outputs C code from AST
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
