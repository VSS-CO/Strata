package main

import "strings"

// ============================================================================
// TYPE SYSTEM - Type definitions, registry, and type checking
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

// parseTypeAnnotation parses a type annotation string and returns a TypeDef
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

// typeCompatible checks if actual type is compatible with expected type
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
