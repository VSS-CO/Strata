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
)

// ============================================================================
// INTERPRETER - AST evaluation with environment-based scoping
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
		"ceil":        func(args []interface{}) interface{} { return math.Ceil(toFloat(args[0])) },
		"floor":       func(args []interface{}) interface{} { return math.Floor(toFloat(args[0])) },
		"round":       func(args []interface{}) interface{} { return math.Round(toFloat(args[0])) },
		"max":         func(args []interface{}) interface{} { return math.Max(toFloat(args[0]), toFloat(args[1])) },
		"min":         func(args []interface{}) interface{} { return math.Min(toFloat(args[0]), toFloat(args[1])) },
		"typeof":      func(args []interface{}) interface{} { return fmt.Sprintf("%T", args[0]) },
		"parseInt":    func(args []interface{}) interface{} { v, _ := strconv.ParseInt(toString(args[0]), 10, 64); return v },
		"parseFloat":  func(args []interface{}) interface{} { v, _ := strconv.ParseFloat(toString(args[0]), 64); return v },
		"toString":    func(args []interface{}) interface{} { return fmt.Sprintf("%v", args[0]) },
		"toBoolean":   func(args []interface{}) interface{} { return toBool(args[0]) },
		"toNumber":    func(args []interface{}) interface{} { return toFloat(args[0]) },
		"now":         func(args []interface{}) interface{} { return time.Now().UnixMilli() },
		"timestamp":   func(args []interface{}) interface{} { return time.Now().Unix() },
		"readFile":    func(args []interface{}) interface{} { data, err := os.ReadFile(toString(args[0])); if err != nil { return nil }; return string(data) },
		"writeFile":   func(args []interface{}) interface{} { err := os.WriteFile(toString(args[0]), []byte(toString(args[1])), 0644); return err == nil },
		"exists":      func(args []interface{}) interface{} { _, err := os.Stat(toString(args[0])); return err == nil },
		"isFile":      func(args []interface{}) interface{} { info, err := os.Stat(toString(args[0])); return err == nil && !info.IsDir() },
		"isDirectory": func(args []interface{}) interface{} { info, err := os.Stat(toString(args[0])); return err == nil && info.IsDir() },
		"mkdir":       func(args []interface{}) interface{} { return os.MkdirAll(toString(args[0]), 0755) == nil },
		"match":       func(args []interface{}) interface{} { re, err := regexp.Compile(toString(args[1])); if err != nil { return nil }; return re.FindString(toString(args[0])) },
		"test":        func(args []interface{}) interface{} { re, err := regexp.Compile(toString(args[1])); if err != nil { return false }; return re.MatchString(toString(args[0])) },
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
		"floor":  func(x float64) float64 { return math.Floor(x) },
		"ceil":   func(x float64) float64 { return math.Ceil(x) },
		"round":  func(x float64) float64 { return math.Round(x) },
		"abs":    func(x float64) float64 { return math.Abs(x) },
		"pow":    func(x, y float64) float64 { return math.Pow(x, y) },
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
	}
	i.Env.SetModule("std::text", textModule)

	fileModule := map[string]interface{}{
		"read":        func(path string) interface{} { data, err := os.ReadFile(path); if err != nil { return nil }; return string(data) },
		"write":       func(path, content string) bool { return os.WriteFile(path, []byte(content), 0644) == nil },
		"exists":      func(path string) bool { _, err := os.Stat(path); return err == nil },
		"delete":      func(path string) bool { return os.Remove(path) == nil },
		"isFile":      func(path string) bool { info, err := os.Stat(path); return err == nil && !info.IsDir() },
		"isDirectory": func(path string) bool { info, err := os.Stat(path); return err == nil && info.IsDir() },
		"mkdir":       func(path string) bool { return os.MkdirAll(path, 0755) == nil },
	}
	i.Env.SetModule("std::file", fileModule)

	timeModule := map[string]interface{}{
		"now":       func() int64 { return time.Now().UnixMilli() },
		"timestamp": func() int64 { return time.Now().Unix() },
	}
	i.Env.SetModule("std::time", timeModule)
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

		return nil, fmt.Errorf("not a function")

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
