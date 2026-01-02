import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

// ============================================================================
// TYPE SYSTEM - Type definitions and compatibility checking
// ============================================================================

abstract class TypeDef {
    static class Primitive extends TypeDef {
        String primitive;
        Primitive(String primitive) { this.primitive = primitive; }
        @Override public String toString() { return "Primitive(" + primitive + ")"; }
    }
    
    static class Optional extends TypeDef {
        TypeDef innerType;
        Optional(TypeDef innerType) { this.innerType = innerType; }
        @Override public String toString() { return "Optional(" + innerType + ")"; }
    }
    
    static class Union extends TypeDef {
        List<TypeDef> types;
        Union(List<TypeDef> types) { this.types = new ArrayList<>(types); }
        @Override public String toString() { return "Union(" + types + ")"; }
    }
}

class Location {
    int line, column;
    String source;
    
    Location(int line, int column, String source) {
        this.line = line;
        this.column = column;
        this.source = source;
    }
    
    @Override public String toString() {
        return String.format("Location(line=%d, column=%d)", line, column);
    }
}

class Token {
    String token;
    Location location;
    
    Token(String token, Location location) {
        this.token = token;
        this.location = location;
    }
}

// Type registry and compatibility checking
class TypeSystem {
    static Map<String, TypeDef> getRegistry() {
        Map<String, TypeDef> registry = new HashMap<>();
        registry.put("int", new TypeDef.Primitive("int"));
        registry.put("float", new TypeDef.Primitive("float"));
        registry.put("bool", new TypeDef.Primitive("bool"));
        registry.put("char", new TypeDef.Primitive("char"));
        registry.put("string", new TypeDef.Primitive("string"));
        registry.put("any", new TypeDef.Primitive("any"));
        return registry;
    }
    
    static TypeDef parseTypeAnnotation(String token) {
        Map<String, TypeDef> registry = getRegistry();
        if (registry.containsKey(token)) {
            return registry.get(token);
        }
        if (token.endsWith("?")) {
            TypeDef inner = parseTypeAnnotation(token.substring(0, token.length() - 1));
            return new TypeDef.Optional(inner);
        }
        return new TypeDef.Primitive("any");
    }
    
    static boolean typeCompatible(TypeDef actual, TypeDef expected) {
        if (expected instanceof TypeDef.Primitive) {
            String expPrim = ((TypeDef.Primitive) expected).primitive;
            if (expPrim.equals("any")) return true;
        }
        if (actual instanceof TypeDef.Primitive) {
            String actPrim = ((TypeDef.Primitive) actual).primitive;
            if (actPrim.equals("any")) return true;
        }
        
        if (actual instanceof TypeDef.Primitive && expected instanceof TypeDef.Primitive) {
            String a = ((TypeDef.Primitive) actual).primitive;
            String e = ((TypeDef.Primitive) expected).primitive;
            if (a.equals(e)) return true;
            // Numeric conversions: int → float
            if (a.equals("int") && e.equals("float")) return true;
            // char → string
            if (a.equals("char") && e.equals("string")) return true;
            return false;
        }
        
        if (actual instanceof TypeDef.Union && expected instanceof TypeDef.Union) {
            List<TypeDef> aTypes = ((TypeDef.Union) actual).types;
            List<TypeDef> eTypes = ((TypeDef.Union) expected).types;
            return aTypes.stream().allMatch(t ->
                eTypes.stream().anyMatch(e -> typeCompatible(t, e))
            );
        }
        
        return false;
    }
}

// ============================================================================
// LEXER - Tokenizes Strata source code with location tracking
// ============================================================================

class Lexer {
    private String input;
    private int pos, line, column, lineStart;
    
    Lexer(String input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.lineStart = 0;
    }
    
    private Character peek() {
        return pos < input.length() ? input.charAt(pos) : null;
    }
    
    private Character peekAhead(int offset) {
        int index = pos + offset;
        return index < input.length() ? input.charAt(index) : null;
    }
    
    private Character advance() {
        if (pos >= input.length()) return null;
        char ch = input.charAt(pos++);
        if (ch == '\n') {
            line++;
            column = 1;
            lineStart = pos;
        } else {
            column++;
        }
        return ch;
    }
    
    private Location getLocation() {
        String source = input.substring(lineStart, Math.min(pos, input.length()));
        return new Location(line, column, source);
    }
    
    Token nextToken() throws IOException {
        // Skip whitespace
        while (peek() != null && Character.isWhitespace(peek())) {
            advance();
        }
        
        // Skip comments
        if (peek() == '/' && peekAhead(1) == '/') {
            while (peek() != null && peek() != '\n') advance();
            return nextToken();
        }
        
        if (peek() == null) return null;
        
        Location loc = getLocation();
        
        // Multi-character operators
        String twoChar = "";
        if (peek() != null && peekAhead(1) != null) {
            twoChar = "" + peek() + peekAhead(1);
        }
        
        List<String> twoCharOps = Arrays.asList("==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--");
        if (twoCharOps.contains(twoChar)) {
            advance();
            advance();
            return new Token(twoChar, loc);
        }
        
        // Identifiers / keywords
        Character ch = peek();
        if (ch != null && (Character.isLetter(ch) || ch == '_')) {
            StringBuilder word = new StringBuilder();
            while (peek() != null && (Character.isLetterOrDigit(peek()) || peek() == '_')) {
                word.append(advance());
            }
            return new Token(word.toString(), loc);
        }
        
        // Strings
        if (peek() == '"') {
            advance();
            StringBuilder value = new StringBuilder();
            while (peek() != null && peek() != '"') {
                if (peek() == '\\') {
                    advance();
                    char next = advance() != null ? input.charAt(pos - 1) : ' ';
                    value.append(next == 'n' ? '\n' : next == 't' ? '\t' : next);
                } else {
                    value.append(advance());
                }
            }
            if (peek() == '"') advance();
            return new Token("\"" + value + "\"", loc);
        }
        
        // Character literals
        if (peek() == '\'') {
            advance();
            StringBuilder value = new StringBuilder();
            while (peek() != null && peek() != '\'') {
                value.append(advance());
            }
            if (peek() == '\'') advance();
            return new Token("'" + value + "'", loc);
        }
        
        // Numbers
        if (peek() != null && Character.isDigit(peek())) {
            StringBuilder num = new StringBuilder();
            while (peek() != null && Character.isDigit(peek())) {
                num.append(advance());
            }
            if (peek() == '.' && peekAhead(1) != null && Character.isDigit(peekAhead(1))) {
                num.append(advance());
                while (peek() != null && Character.isDigit(peek())) {
                    num.append(advance());
                }
            }
            return new Token(num.toString(), loc);
        }
        
        // Single-char symbols
        char c = advance();
        return new Token(String.valueOf(c), loc);
    }
}

// ============================================================================
// AST NODES - Expressions and Statements
// ============================================================================

abstract class Expr {
    Location location;
}

class VarExpr extends Expr {
    String name;
    VarExpr(String name, Location loc) { this.name = name; this.location = loc; }
}

class NumberExpr extends Expr {
    double value;
    NumberExpr(double value, Location loc) { this.value = value; this.location = loc; }
}

class StringExpr extends Expr {
    String value;
    StringExpr(String value, Location loc) { this.value = value; this.location = loc; }
}

class BoolExpr extends Expr {
    boolean value;
    BoolExpr(boolean value, Location loc) { this.value = value; this.location = loc; }
}

class CallExpr extends Expr {
    String module, func;
    List<Expr> args;
    CallExpr(String module, String func, List<Expr> args, Location loc) {
        this.module = module; this.func = func; this.args = args; this.location = loc;
    }
}

class BinaryExpr extends Expr {
    String op;
    Expr left, right;
    BinaryExpr(String op, Expr left, Expr right, Location loc) {
        this.op = op; this.left = left; this.right = right; this.location = loc;
    }
}

class UnaryExpr extends Expr {
    String op;
    Expr arg;
    UnaryExpr(String op, Expr arg, Location loc) {
        this.op = op; this.arg = arg; this.location = loc;
    }
}

class TupleExpr extends Expr {
    List<Expr> elements;
    TupleExpr(List<Expr> elements, Location loc) {
        this.elements = elements; this.location = loc;
    }
}

abstract class Stmt {
    Location location;
}

class ImportStmt extends Stmt {
    String module;
    ImportStmt(String module, Location loc) { this.module = module; this.location = loc; }
}

class FuncStmt extends Stmt {
    String name;
    List<Map.Entry<String, TypeDef>> params;
    TypeDef returnType;
    List<Stmt> body;
    FuncStmt(String name, List<Map.Entry<String, TypeDef>> params, TypeDef returnType, List<Stmt> body, Location loc) {
        this.name = name; this.params = params; this.returnType = returnType; this.body = body; this.location = loc;
    }
}

class VarDeclStmt extends Stmt {
    String name;
    TypeDef varType;
    Expr value;
    boolean mutable;
    VarDeclStmt(String name, TypeDef varType, Expr value, boolean mutable, Location loc) {
        this.name = name; this.varType = varType; this.value = value; this.mutable = mutable; this.location = loc;
    }
}

class IfStmt extends Stmt {
    Expr condition;
    List<Stmt> thenBranch, elseBranch;
    IfStmt(Expr condition, List<Stmt> thenBranch, List<Stmt> elseBranch, Location loc) {
        this.condition = condition; this.thenBranch = thenBranch; this.elseBranch = elseBranch; this.location = loc;
    }
}

class WhileStmt extends Stmt {
    Expr condition;
    List<Stmt> body;
    WhileStmt(Expr condition, List<Stmt> body, Location loc) {
        this.condition = condition; this.body = body; this.location = loc;
    }
}

class ForStmt extends Stmt {
    Stmt init;
    Expr condition;
    Stmt update;
    List<Stmt> body;
    ForStmt(Stmt init, Expr condition, Stmt update, List<Stmt> body, Location loc) {
        this.init = init; this.condition = condition; this.update = update; this.body = body; this.location = loc;
    }
}

class BreakStmt extends Stmt {
    BreakStmt(Location loc) { this.location = loc; }
}

class ContinueStmt extends Stmt {
    ContinueStmt(Location loc) { this.location = loc; }
}

class ReturnStmt extends Stmt {
    Expr value;
    ReturnStmt(Expr value, Location loc) { this.value = value; this.location = loc; }
}

class ExprStmt extends Stmt {
    Expr expr;
    ExprStmt(Expr expr, Location loc) { this.expr = expr; this.location = loc; }
}

// ============================================================================
// PARSER - Recursive descent parser with operator precedence
// ============================================================================

class Parser {
    private List<Token> tokens = new ArrayList<>();
    private int tokenIdx = 0;
    
    Parser(Lexer lexer) throws IOException {
        Token token;
        while ((token = lexer.nextToken()) != null) {
            tokens.add(token);
        }
    }
    
    private Token current() {
        return tokenIdx < tokens.size() ? tokens.get(tokenIdx) : null;
    }
    
    private Token peek(int offset) {
        int idx = tokenIdx + offset;
        return idx < tokens.size() ? tokens.get(idx) : null;
    }
    
    private void advance() { tokenIdx++; }
    
    private Location expect(String expected) throws Exception {
        Token current = current();
        if (current == null || !current.token.equals(expected)) {
            throw new Exception("Expected '" + expected + "', got '" + (current != null ? current.token : "EOF") + "'");
        }
        Location loc = current.location;
        advance();
        return loc;
    }
    
    private boolean match(String... tokens) {
        Token current = current();
        if (current == null) return false;
        for (String t : tokens) {
            if (current.token.equals(t)) return true;
        }
        return false;
    }
    
    List<Stmt> parseProgram() throws Exception {
        List<Stmt> stmts = new ArrayList<>();
        while (current() != null) {
            stmts.add(parseStmt());
        }
        return stmts;
    }
    
    private Stmt parseStmt() throws Exception {
        Token current = current();
        if (current == null) throw new Exception("Unexpected EOF");
        Location loc = current.location;
        
        switch (current.token) {
            case "import": {
                advance();
                String module = current().token;
                advance();
                if (match("from")) {
                    advance();
                    advance();
                }
                return new ImportStmt(module, loc);
            }
            case "func": {
                advance();
                String name = current().token;
                advance();
                expect("(");
                List<Map.Entry<String, TypeDef>> params = new ArrayList<>();
                while (!match(")")) {
                    String paramName = current().token;
                    advance();
                    expect(":");
                    TypeDef paramType = parseType();
                    params.add(new AbstractMap.SimpleEntry<>(paramName, paramType));
                    if (match(",")) advance();
                }
                expect(")");
                expect("=>");
                TypeDef returnType = parseType();
                expect("{");
                List<Stmt> body = new ArrayList<>();
                while (!match("}")) {
                    body.add(parseStmt());
                }
                expect("}");
                return new FuncStmt(name, params, returnType, body, loc);
            }
            case "let":
            case "const":
            case "var": {
                boolean mutable = current.token.equals("var");
                advance();
                String name = current().token;
                advance();
                TypeDef varType = null;
                if (match(":")) {
                    advance();
                    varType = parseType();
                }
                Expr value = null;
                if (match("=")) {
                    advance();
                    value = parseExpr();
                }
                return new VarDeclStmt(name, varType, value, mutable, loc);
            }
            case "if": {
                advance();
                expect("(");
                Expr condition = parseExpr();
                expect(")");
                expect("{");
                List<Stmt> thenBranch = new ArrayList<>();
                while (!match("}")) {
                    thenBranch.add(parseStmt());
                }
                expect("}");
                List<Stmt> elseBranch = null;
                if (match("else")) {
                    advance();
                    expect("{");
                    elseBranch = new ArrayList<>();
                    while (!match("}")) {
                        elseBranch.add(parseStmt());
                    }
                    expect("}");
                }
                return new IfStmt(condition, thenBranch, elseBranch, loc);
            }
            case "while": {
                advance();
                expect("(");
                Expr condition = parseExpr();
                expect(")");
                expect("{");
                List<Stmt> body = new ArrayList<>();
                while (!match("}")) {
                    body.add(parseStmt());
                }
                expect("}");
                return new WhileStmt(condition, body, loc);
            }
            case "for": {
                advance();
                expect("(");
                Stmt init = null;
                if (!match(";")) {
                    init = parseStmt();
                } else {
                    advance();
                }
                Expr condition = null;
                if (!match(";")) {
                    condition = parseExpr();
                }
                expect(";");
                Stmt update = null;
                if (!match(")")) {
                    update = new ExprStmt(parseExpr(), current().location);
                }
                expect(")");
                expect("{");
                List<Stmt> body = new ArrayList<>();
                while (!match("}")) {
                    body.add(parseStmt());
                }
                expect("}");
                return new ForStmt(init, condition, update, body, loc);
            }
            case "break":
                advance();
                return new BreakStmt(loc);
            case "continue":
                advance();
                return new ContinueStmt(loc);
            case "return": {
                advance();
                Expr value = null;
                if (!match("}") && current() != null) {
                    value = parseExpr();
                }
                return new ReturnStmt(value, loc);
            }
            default:
                return new ExprStmt(parseExpr(), loc);
        }
    }
    
    private TypeDef parseType() throws Exception {
        String token = current().token;
        advance();
        return TypeSystem.parseTypeAnnotation(token);
    }
    
    private Expr parseExpr() throws Exception { return parseOr(); }
    
    private Expr parseOr() throws Exception {
        Expr left = parseAnd();
        while (match("||")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr right = parseAnd();
            left = new BinaryExpr(op, left, right, loc);
        }
        return left;
    }
    
    private Expr parseAnd() throws Exception {
        Expr left = parseEquality();
        while (match("&&")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr right = parseEquality();
            left = new BinaryExpr(op, left, right, loc);
        }
        return left;
    }
    
    private Expr parseEquality() throws Exception {
        Expr left = parseRelational();
        while (match("==", "!=")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr right = parseRelational();
            left = new BinaryExpr(op, left, right, loc);
        }
        return left;
    }
    
    private Expr parseRelational() throws Exception {
        Expr left = parseAdditive();
        while (match("<", ">", "<=", ">=")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr right = parseAdditive();
            left = new BinaryExpr(op, left, right, loc);
        }
        return left;
    }
    
    private Expr parseAdditive() throws Exception {
        Expr left = parseMultiplicative();
        while (match("+", "-")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr right = parseMultiplicative();
            left = new BinaryExpr(op, left, right, loc);
        }
        return left;
    }
    
    private Expr parseMultiplicative() throws Exception {
        Expr left = parseUnary();
        while (match("*", "/", "%")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr right = parseUnary();
            left = new BinaryExpr(op, left, right, loc);
        }
        return left;
    }
    
    private Expr parseUnary() throws Exception {
        if (match("!", "-", "+", "~")) {
            String op = current().token;
            Location loc = current().location;
            advance();
            Expr arg = parseUnary();
            return new UnaryExpr(op, arg, loc);
        }
        return parseCall();
    }
    
    private Expr parseCall() throws Exception {
        Expr expr = parsePrimary();
        
        while (true) {
            if (match(".")) {
                Location loc = current().location;
                advance();
                String func = current().token;
                advance();
                expect("(");
                List<Expr> args = new ArrayList<>();
                while (!match(")")) {
                    args.add(parseExpr());
                    if (match(",")) advance();
                }
                expect(")");
                String module = expr instanceof VarExpr ? ((VarExpr) expr).name : "";
                expr = new CallExpr(module, func, args, loc);
            } else if (match("(") && expr instanceof VarExpr) {
                Location loc = current().location;
                advance();
                List<Expr> args = new ArrayList<>();
                while (!match(")")) {
                    args.add(parseExpr());
                    if (match(",")) advance();
                }
                expect(")");
                String funcName = ((VarExpr) expr).name;
                expr = new CallExpr("", funcName, args, loc);
            } else {
                break;
            }
        }
        
        return expr;
    }
    
    private Expr parsePrimary() throws Exception {
        Token current = current();
        if (current == null) throw new Exception("Unexpected EOF");
        Location loc = current.location;
        
        if (match("(")) {
            advance();
            Expr expr = parseExpr();
            expect(")");
            return expr;
        }
        
        if (match("true")) {
            advance();
            return new BoolExpr(true, loc);
        }
        
        if (match("false")) {
            advance();
            return new BoolExpr(false, loc);
        }
        
        String token = current.token;
        if (token.startsWith("\"")) {
            advance();
            return new StringExpr(token.substring(1, token.length() - 1), loc);
        }
        
        if (token.startsWith("'")) {
            advance();
            return new StringExpr(token.substring(1, token.length() - 1), loc);
        }
        
        try {
            double value = Double.parseDouble(token);
            advance();
            return new NumberExpr(value, loc);
        } catch (NumberFormatException e) {
            // Not a number
        }
        
        if (Character.isLetter(token.charAt(0)) || token.charAt(0) == '_') {
            advance();
            return new VarExpr(token, loc);
        }
        
        throw new Exception("Unknown expression: " + token);
    }
}

// ============================================================================
// TYPE CHECKER - Compile-time type validation
// ============================================================================

class TypeChecker {
    private List<String> errors = new ArrayList<>();
    private Map<String, TypeDef> typeMap = new HashMap<>();
    
    List<String> check(List<Stmt> stmts) {
        for (Stmt stmt : stmts) {
            checkStmt(stmt);
        }
        return errors;
    }
    
    private void checkStmt(Stmt stmt) {
        if (stmt instanceof VarDeclStmt) {
            VarDeclStmt vd = (VarDeclStmt) stmt;
            if (vd.value != null) {
                TypeDef exprType = inferExprType(vd.value);
                TypeDef declType = vd.varType != null ? vd.varType : exprType;
                if (!TypeSystem.typeCompatible(exprType, declType)) {
                    errors.add("Type mismatch at line " + stmt.location.line);
                }
                typeMap.put(vd.name, declType);
            }
        } else if (stmt instanceof IfStmt) {
            checkExpr(((IfStmt) stmt).condition);
        } else if (stmt instanceof WhileStmt) {
            checkExpr(((WhileStmt) stmt).condition);
        } else if (stmt instanceof ForStmt) {
            ForStmt fs = (ForStmt) stmt;
            if (fs.condition != null) checkExpr(fs.condition);
        } else if (stmt instanceof FuncStmt) {
            for (Stmt s : ((FuncStmt) stmt).body) checkStmt(s);
        } else if (stmt instanceof ExprStmt) {
            checkExpr(((ExprStmt) stmt).expr);
        }
    }
    
    private void checkExpr(Expr expr) {
        if (expr instanceof BinaryExpr) {
            BinaryExpr be = (BinaryExpr) expr;
            checkExpr(be.left);
            checkExpr(be.right);
        } else if (expr instanceof UnaryExpr) {
            checkExpr(((UnaryExpr) expr).arg);
        } else if (expr instanceof CallExpr) {
            for (Expr arg : ((CallExpr) expr).args) {
                checkExpr(arg);
            }
        }
    }
    
    private TypeDef inferExprType(Expr expr) {
        if (expr instanceof NumberExpr) {
            return new TypeDef.Primitive("float");
        } else if (expr instanceof StringExpr) {
            return new TypeDef.Primitive("string");
        } else if (expr instanceof BoolExpr) {
            return new TypeDef.Primitive("bool");
        } else if (expr instanceof VarExpr) {
            String name = ((VarExpr) expr).name;
            return typeMap.getOrDefault(name, new TypeDef.Primitive("any"));
        } else if (expr instanceof BinaryExpr) {
            BinaryExpr be = (BinaryExpr) expr;
            TypeDef leftType = inferExprType(be.left);
            TypeDef rightType = inferExprType(be.right);
            String op = be.op;
            if (op.matches("==|!=|<|>|<=|>=|&&|\\|\\|")) {
                return new TypeDef.Primitive("bool");
            }
            if (leftType instanceof TypeDef.Primitive && rightType instanceof TypeDef.Primitive) {
                String lp = ((TypeDef.Primitive) leftType).primitive;
                String rp = ((TypeDef.Primitive) rightType).primitive;
                if (lp.equals("float") || rp.equals("float")) {
                    return new TypeDef.Primitive("float");
                }
                return leftType;
            }
            return new TypeDef.Primitive("any");
        } else if (expr instanceof UnaryExpr) {
            if (((UnaryExpr) expr).op.equals("!")) {
                return new TypeDef.Primitive("bool");
            }
            return inferExprType(((UnaryExpr) expr).arg);
        }
        return new TypeDef.Primitive("any");
    }
}

// ============================================================================
// INTERPRETER - AST execution engine
// ============================================================================

class Value {
    Double value;
    TypeDef type;
    boolean mutable;
    
    Value(Double value, TypeDef type, boolean mutable) {
        this.value = value;
        this.type = type;
        this.mutable = mutable;
    }
}

class Environment {
    private Environment parent;
    private Map<String, Value> variables;
    
    Environment() {
        this.parent = null;
        this.variables = new HashMap<>();
    }
    
    Environment(Environment parent) {
        this.parent = parent;
        this.variables = new HashMap<>();
    }
    
    void define(String name, Double value, TypeDef type, boolean mutable) {
        variables.put(name, new Value(value, type, mutable));
    }
    
    Double get(String name) {
        if (variables.containsKey(name)) {
            return variables.get(name).value;
        }
        if (parent != null) {
            return parent.get(name);
        }
        return null;
    }
    
    void set(String name, Double value) throws Exception {
        if (variables.containsKey(name)) {
            Value v = variables.get(name);
            if (!v.mutable) {
                throw new Exception("Cannot reassign immutable variable: " + name);
            }
            v.value = value;
            return;
        }
        if (parent != null) {
            parent.set(name, value);
            return;
        }
        throw new Exception("Undefined variable: " + name);
    }
    
    boolean exists(String name) {
        return variables.containsKey(name) || (parent != null && parent.exists(name));
    }
}

enum ControlFlowType { NONE, BREAK, CONTINUE, RETURN }

class ControlFlowValue {
    ControlFlowType type;
    Double value;
    
    ControlFlowValue(ControlFlowType type, Double value) {
        this.type = type;
        this.value = value;
    }
}

class Interpreter {
    private Environment env;
    private Map<String, String> modules;
    private ControlFlowValue controlFlow;
    
    Interpreter() {
        this.env = new Environment();
        this.modules = new HashMap<>();
        this.controlFlow = new ControlFlowValue(ControlFlowType.NONE, null);
    }
    
    void run(List<Stmt> stmts) throws Exception {
        for (Stmt stmt : stmts) {
            execStmt(stmt);
            if (controlFlow.type != ControlFlowType.NONE) break;
        }
    }
    
    private void execStmt(Stmt stmt) throws Exception {
        if (controlFlow.type != ControlFlowType.NONE) return;
        
        if (stmt instanceof ImportStmt) {
            ImportStmt is = (ImportStmt) stmt;
            String moduleName = is.module.startsWith("str.") ? is.module : "str." + is.module;
            modules.put(is.module, moduleName);
        } else if (stmt instanceof VarDeclStmt) {
            VarDeclStmt vd = (VarDeclStmt) stmt;
            Double value = vd.value != null ? evalExpr(vd.value) : null;
            TypeDef type = vd.varType != null ? vd.varType : new TypeDef.Primitive("any");
            env.define(vd.name, value, type, vd.mutable);
        } else if (stmt instanceof IfStmt) {
            IfStmt is = (IfStmt) stmt;
            if (isTruthy(evalExpr(is.condition))) {
                for (Stmt s : is.thenBranch) {
                    execStmt(s);
                    if (controlFlow.type != ControlFlowType.NONE) break;
                }
            } else if (is.elseBranch != null) {
                for (Stmt s : is.elseBranch) {
                    execStmt(s);
                    if (controlFlow.type != ControlFlowType.NONE) break;
                }
            }
        } else if (stmt instanceof WhileStmt) {
            WhileStmt ws = (WhileStmt) stmt;
            while (isTruthy(evalExpr(ws.condition))) {
                for (Stmt s : ws.body) {
                    execStmt(s);
                    if (controlFlow.type != ControlFlowType.NONE) break;
                }
                if (controlFlow.type == ControlFlowType.BREAK) {
                    controlFlow = new ControlFlowValue(ControlFlowType.NONE, null);
                    break;
                } else if (controlFlow.type == ControlFlowType.CONTINUE) {
                    controlFlow = new ControlFlowValue(ControlFlowType.NONE, null);
                    continue;
                }
            }
        } else if (stmt instanceof ForStmt) {
            ForStmt fs = (ForStmt) stmt;
            if (fs.init != null) execStmt(fs.init);
            while (fs.condition == null || isTruthy(evalExpr(fs.condition))) {
                for (Stmt s : fs.body) {
                    execStmt(s);
                    if (controlFlow.type != ControlFlowType.NONE) break;
                }
                if (controlFlow.type == ControlFlowType.BREAK) {
                    controlFlow = new ControlFlowValue(ControlFlowType.NONE, null);
                    break;
                } else if (controlFlow.type == ControlFlowType.CONTINUE) {
                    controlFlow = new ControlFlowValue(ControlFlowType.NONE, null);
                }
                if (fs.update != null) execStmt(fs.update);
            }
        } else if (stmt instanceof BreakStmt) {
            controlFlow = new ControlFlowValue(ControlFlowType.BREAK, null);
        } else if (stmt instanceof ContinueStmt) {
            controlFlow = new ControlFlowValue(ControlFlowType.CONTINUE, null);
        } else if (stmt instanceof ReturnStmt) {
            ReturnStmt rs = (ReturnStmt) stmt;
            Double value = rs.value != null ? evalExpr(rs.value) : null;
            controlFlow = new ControlFlowValue(ControlFlowType.RETURN, value);
        } else if (stmt instanceof ExprStmt) {
            evalExpr(((ExprStmt) stmt).expr);
        }
    }
    
    private Double evalExpr(Expr expr) throws Exception {
        if (expr instanceof NumberExpr) {
            return ((NumberExpr) expr).value;
        } else if (expr instanceof StringExpr) {
            return Double.NaN;
        } else if (expr instanceof BoolExpr) {
            return ((BoolExpr) expr).value ? 1.0 : 0.0;
        } else if (expr instanceof VarExpr) {
            String name = ((VarExpr) expr).name;
            Double value = env.get(name);
            if (value == null) throw new Exception("Undefined variable: " + name);
            return value;
        } else if (expr instanceof CallExpr) {
            CallExpr ce = (CallExpr) expr;
            String moduleName = ce.module.startsWith("str.") ? ce.module : "str." + ce.module;
            
            List<Double> argVals = new ArrayList<>();
            for (Expr arg : ce.args) {
                argVals.add(evalExpr(arg));
            }
            
            switch (moduleName) {
                case "str.math":
                    switch (ce.func) {
                        case "sqrt": return Math.sqrt(argVals.size() > 0 ? argVals.get(0) : 0);
                        case "pow": return Math.pow(argVals.size() > 0 ? argVals.get(0) : 0, argVals.size() > 1 ? argVals.get(1) : 0);
                        case "abs": return Math.abs(argVals.size() > 0 ? argVals.get(0) : 0);
                        case "floor": return Math.floor(argVals.size() > 0 ? argVals.get(0) : 0);
                        case "ceil": return Math.ceil(argVals.size() > 0 ? argVals.get(0) : 0);
                        case "random": return Math.random();
                    }
                    break;
                case "str.io":
                    if (ce.func.equals("print") || ce.func.equals("println")) {
                        for (Expr arg : ce.args) {
                            if (arg instanceof StringExpr) {
                                System.out.print(((StringExpr) arg).value + " ");
                            } else {
                                System.out.print(evalExpr(arg) + " ");
                            }
                        }
                        System.out.println();
                        return 0.0;
                    }
                    break;
                case "str.util":
                    if (ce.func.equals("randomInt")) {
                        double max = argVals.size() > 0 ? argVals.get(0) : 0;
                        return Math.floor(Math.random() * max);
                    }
                    break;
            }
            throw new Exception("Module or function not found: " + moduleName + "." + ce.func);
        } else if (expr instanceof BinaryExpr) {
            BinaryExpr be = (BinaryExpr) expr;
            Double l = evalExpr(be.left);
            Double r = evalExpr(be.right);
            switch (be.op) {
                case "+": return l + r;
                case "-": return l - r;
                case "*": return l * r;
                case "/": return l / r;
                case "%": return l % r;
                case "==": return Math.abs(l - r) < 1e-10 ? 1.0 : 0.0;
                case "!=": return Math.abs(l - r) < 1e-10 ? 0.0 : 1.0;
                case "<": return l < r ? 1.0 : 0.0;
                case ">": return l > r ? 1.0 : 0.0;
                case "<=": return l <= r ? 1.0 : 0.0;
                case ">=": return l >= r ? 1.0 : 0.0;
                case "&&": return isTruthy(l) && isTruthy(r) ? 1.0 : 0.0;
                case "||": return isTruthy(l) || isTruthy(r) ? 1.0 : 0.0;
            }
            throw new Exception("Unknown operator: " + be.op);
        } else if (expr instanceof UnaryExpr) {
            UnaryExpr ue = (UnaryExpr) expr;
            Double a = evalExpr(ue.arg);
            switch (ue.op) {
                case "-": return -a;
                case "+": return a;
                case "!": return isTruthy(a) ? 0.0 : 1.0;
                case "~": return (double) ~((int) (double) a);
            }
            throw new Exception("Unknown unary operator: " + ue.op);
        }
        return 0.0;
    }
    
    private boolean isTruthy(Double value) {
        return !Double.isNaN(value) && value != 0.0;
    }
}

// ============================================================================
// C CODE GENERATOR - AST to C transpilation
// ============================================================================

class CGenerator {
    private List<String> lines;
    private Set<String> declaredVars;
    private int indent;
    
    CGenerator() {
        this.lines = new ArrayList<>();
        this.declaredVars = new HashSet<>();
        this.indent = 0;
    }
    
    String generate(List<Stmt> stmts) {
        lines.add("#include <stdio.h>");
        lines.add("#include <math.h>");
        lines.add("#include <stdbool.h>");
        lines.add("");
        lines.add("int main() {");
        indent++;
        
        for (Stmt stmt : stmts) {
            emitStmt(stmt);
        }
        
        indent--;
        lines.add("  return 0;");
        lines.add("}");
        
        return String.join("\n", lines);
    }
    
    private void emitStmt(Stmt stmt) {
        String ind = "  ".repeat(indent);
        
        if (stmt instanceof VarDeclStmt) {
            VarDeclStmt vd = (VarDeclStmt) stmt;
            String typeStr = typeToC(vd.varType);
            String init = vd.value != null ? " = " + emitExpr(vd.value) : "";
            lines.add(ind + typeStr + " " + vd.name + init + ";");
            declaredVars.add(vd.name);
        } else if (stmt instanceof IfStmt) {
            IfStmt is = (IfStmt) stmt;
            String cond = emitExpr(is.condition);
            lines.add(ind + "if (" + cond + ") {");
            indent++;
            for (Stmt s : is.thenBranch) emitStmt(s);
            indent--;
            if (is.elseBranch != null) {
                lines.add(ind + "} else {");
                indent++;
                for (Stmt s : is.elseBranch) emitStmt(s);
                indent--;
            }
            lines.add(ind + "}");
        } else if (stmt instanceof WhileStmt) {
            WhileStmt ws = (WhileStmt) stmt;
            String cond = emitExpr(ws.condition);
            lines.add(ind + "while (" + cond + ") {");
            indent++;
            for (Stmt s : ws.body) emitStmt(s);
            indent--;
            lines.add(ind + "}");
        } else if (stmt instanceof ForStmt) {
            ForStmt fs = (ForStmt) stmt;
            String initStr = "";
            if (fs.init != null && fs.init instanceof VarDeclStmt) {
                VarDeclStmt vd = (VarDeclStmt) fs.init;
                initStr = typeToC(vd.varType) + " " + vd.name;
                if (vd.value != null) initStr += " = " + emitExpr(vd.value);
            }
            String condStr = fs.condition != null ? emitExpr(fs.condition) : "1";
            String updateStr = "";
            if (fs.update != null && fs.update instanceof ExprStmt) {
                updateStr = emitExpr(((ExprStmt) fs.update).expr);
            }
            lines.add(ind + "for (" + initStr + "; " + condStr + "; " + updateStr + ") {");
            indent++;
            for (Stmt s : fs.body) emitStmt(s);
            indent--;
            lines.add(ind + "}");
        } else if (stmt instanceof BreakStmt) {
            lines.add(ind + "break;");
        } else if (stmt instanceof ContinueStmt) {
            lines.add(ind + "continue;");
        } else if (stmt instanceof ReturnStmt) {
            ReturnStmt rs = (ReturnStmt) stmt;
            if (rs.value != null) {
                lines.add(ind + "return " + emitExpr(rs.value) + ";");
            } else {
                lines.add(ind + "return;");
            }
        } else if (stmt instanceof ExprStmt) {
            lines.add(ind + emitExpr(((ExprStmt) stmt).expr) + ";");
        }
    }
    
    private String emitExpr(Expr expr) {
        if (expr instanceof NumberExpr) {
            return String.valueOf((int) ((NumberExpr) expr).value);
        } else if (expr instanceof StringExpr) {
            return "\"" + ((StringExpr) expr).value + "\"";
        } else if (expr instanceof BoolExpr) {
            return ((BoolExpr) expr).value ? "true" : "false";
        } else if (expr instanceof VarExpr) {
            return ((VarExpr) expr).name;
        } else if (expr instanceof BinaryExpr) {
            BinaryExpr be = (BinaryExpr) expr;
            return "(" + emitExpr(be.left) + " " + be.op + " " + emitExpr(be.right) + ")";
        } else if (expr instanceof UnaryExpr) {
            UnaryExpr ue = (UnaryExpr) expr;
            return ue.op + emitExpr(ue.arg);
        } else if (expr instanceof CallExpr) {
            CallExpr ce = (CallExpr) expr;
            String args = ce.args.stream().map(this::emitExpr).reduce("", (a, b) -> a.isEmpty() ? b : a + ", " + b);
            if (ce.module.equals("math")) {
                return ce.func + "(" + args + ")";
            } else if (ce.module.equals("io") && ce.func.equals("print")) {
                return "printf(\"%d\\n\", " + args + ")";
            }
            return "0";
        }
        return "0";
    }
    
    private String typeToC(TypeDef type) {
        if (type instanceof TypeDef.Primitive) {
            String prim = ((TypeDef.Primitive) type).primitive;
            switch (prim) {
                case "int": return "int";
                case "float": return "float";
                case "bool": return "bool";
                case "char": return "char";
                case "string": return "char*";
                default: return "int";
            }
        }
        return "int";
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

public class Main {
    public static void main(String[] args) {
        String file = args.length > 0 ? args[0] : "myprogram.str";
        
        try {
            String source = new String(Files.readAllBytes(Paths.get(file)));
            Lexer lexer = new Lexer(source);
            Parser parser = new Parser(lexer);
            List<Stmt> program = parser.parseProgram();
            
            // Type check
            TypeChecker checker = new TypeChecker();
            List<String> typeErrors = checker.check(program);
            if (!typeErrors.isEmpty()) {
                System.err.println("Type errors:");
                typeErrors.forEach(e -> System.err.println("  " + e));
                System.exit(1);
            }
            
            // Run interpreter
            Interpreter interpreter = new Interpreter();
            interpreter.run(program);
            
            // Generate C code
            CGenerator cgen = new CGenerator();
            String cCode = cgen.generate(program);
            Files.write(Paths.get("out.c"), cCode.getBytes());
            System.out.println("✓ C code generated: out.c");
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
