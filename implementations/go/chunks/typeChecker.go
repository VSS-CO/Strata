package main

import "fmt"

// ============================================================================
// TYPE CHECKER - Compile-time type validation
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
