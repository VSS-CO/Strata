package main

// ============================================================================
// AST DEFINITIONS - Expression and Statement structures
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
