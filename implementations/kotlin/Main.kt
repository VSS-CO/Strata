import java.io.File

// ============================================================================
// DATA CLASSES - Type system representation
// ============================================================================

sealed class TypeDef {
    data class Primitive(val primitive: String) : TypeDef()
    data class Optional(val innerType: TypeDef) : TypeDef()
    data class Union(val types: List<TypeDef>) : TypeDef()
}

data class Location(
    val line: Int,
    val column: Int,
    val source: String
)

data class Token(
    val token: String,
    val location: Location
)

// ============================================================================
// TYPE SYSTEM
// ============================================================================

val TYPE_REGISTRY: Map<String, TypeDef> = mapOf(
    "int" to TypeDef.Primitive("int"),
    "float" to TypeDef.Primitive("float"),
    "bool" to TypeDef.Primitive("bool"),
    "char" to TypeDef.Primitive("char"),
    "string" to TypeDef.Primitive("string"),
    "any" to TypeDef.Primitive("any")
)

fun parseTypeAnnotation(token: String): TypeDef {
    if (token in TYPE_REGISTRY) {
        return TYPE_REGISTRY[token]!!
    }
    if (token.endsWith("?")) {
        return TypeDef.Optional(
            parseTypeAnnotation(token.dropLast(1))
        )
    }
    return TypeDef.Primitive("any")
}

fun typeCompatible(actual: TypeDef, expected: TypeDef): Boolean {
    return when {
        expected is TypeDef.Primitive && expected.primitive == "any" -> true
        actual is TypeDef.Primitive && actual.primitive == "any" -> true
        actual is TypeDef.Primitive && expected is TypeDef.Primitive -> {
            when {
                actual.primitive == expected.primitive -> true
                // Allow numeric conversions: int → float
                actual.primitive == "int" && expected.primitive == "float" -> true
                // Allow char → string
                actual.primitive == "char" && expected.primitive == "string" -> true
                else -> false
            }
        }
        actual is TypeDef.Union && expected is TypeDef.Union -> {
            actual.types.all { t ->
                expected.types.any { e ->
                    typeCompatible(t, e)
                }
            }
        }
        else -> false
    }
}

// ============================================================================
// LEXER - Tokenizes Strata source code
// ============================================================================

class Lexer(private val input: String) {
    private var pos: Int = 0
    private var line: Int = 1
    private var column: Int = 1
    private var lineStart: Int = 0

    fun peek(): Char? {
        return if (pos < input.length) input[pos] else null
    }

    fun advance(): Char? {
        if (pos >= input.length) return null
        val ch = input[pos++]
        if (ch == '\n') {
            line++
            column = 1
            lineStart = pos
        } else {
            column++
        }
        return ch
    }

    fun getLocation(): Location {
        val source = if (lineStart < input.length)
            input.substring(lineStart, minOf(pos, input.length))
        else ""
        return Location(line, column, source)
    }

    fun nextToken(): Token? {
        // Skip whitespace
        while (peek() in " \n\r\t") {
            advance()
        }

        // Skip comments
        if (peek() == '/' && peekAhead(1) == '/') {
            while (peek() != null && peek() != '\n') {
                advance()
            }
            return nextToken()
        }

        if (peek() == null) return null

        val loc = getLocation()

        // Multi-character operators
        val twoCharOps = listOf("==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--")
        val twoChar = input.substring(pos, minOf(pos + 2, input.length))
        if (twoChar in twoCharOps) {
            advance()
            advance()
            return Token(twoChar, loc)
        }

        // Identifiers / keywords
        if (peek()?.isLetter() == true || peek() == '_') {
            val word = StringBuilder()
            while (peek()?.let { it.isLetterOrDigit() || it == '_' } == true) {
                word.append(advance())
            }
            return Token(word.toString(), loc)
        }

        // Strings
        if (peek() == '"') {
            advance()
            val value = StringBuilder()
            while (peek() != null && peek() != '"') {
                if (peek() == '\\') {
                    advance()
                    val next = advance()
                    value.append(when (next) {
                        'n' -> '\n'
                        't' -> '\t'
                        else -> next
                    })
                } else {
                    value.append(advance())
                }
            }
            if (peek() == '"') advance()
            return Token("\"${value}\"", loc)
        }

        if (peek() == '\'') {
            advance()
            val value = StringBuilder()
            while (peek() != null && peek() != '\'') {
                value.append(advance())
            }
            if (peek() == '\'') advance()
            return Token("'${value}'", loc)
        }

        // Numbers
        if (peek()?.isDigit() == true) {
            val num = StringBuilder()
            while (peek()?.isDigit() == true) {
                num.append(advance())
            }
            if (peek() == '.' && peekAhead(1)?.isDigit() == true) {
                num.append(advance())
                while (peek()?.isDigit() == true) {
                    num.append(advance())
                }
            }
            return Token(num.toString(), loc)
        }

        // Single-char symbols
        val ch = advance()
        return Token(ch.toString(), loc)
    }

    private fun peekAhead(offset: Int): Char? {
        val index = pos + offset
        return if (index < input.length) input[index] else null
    }
}

// ============================================================================
// AST NODES - Expression and Statement types
// ============================================================================

sealed class Expr {
    abstract val location: Location

    data class Var(val name: String, override val location: Location) : Expr()
    data class Number(val value: Double, override val location: Location) : Expr()
    data class String(val value: kotlin.String, override val location: Location) : Expr()
    data class Bool(val value: Boolean, override val location: Location) : Expr()
    data class Call(
        val module: kotlin.String,
        val func: kotlin.String,
        val args: List<Expr>,
        override val location: Location
    ) : Expr()
    data class Binary(
        val op: kotlin.String,
        val left: Expr,
        val right: Expr,
        override val location: Location
    ) : Expr()
    data class Unary(
        val op: kotlin.String,
        val arg: Expr,
        override val location: Location
    ) : Expr()
    data class Match(
        val expr: Expr,
        val arms: List<Pair<kotlin.String, List<Stmt>>>,
        override val location: Location
    ) : Expr()
    data class Tuple(val elements: List<Expr>, override val location: Location) : Expr()
}

sealed class Stmt {
    abstract val location: Location

    data class Import(val module: kotlin.String, override val location: Location) : Stmt()
    data class Func(
        val name: kotlin.String,
        val params: List<Pair<kotlin.String, TypeDef>>,
        val returnType: TypeDef,
        val body: List<Stmt>,
        override val location: Location
    ) : Stmt()
    data class VarDecl(
        val name: kotlin.String,
        val varType: TypeDef?,
        val value: Expr?,
        val mutable: Boolean,
        override val location: Location
    ) : Stmt()
    data class If(
        val condition: Expr,
        val thenBranch: List<Stmt>,
        val elseBranch: List<Stmt>?,
        override val location: Location
    ) : Stmt()
    data class While(
        val condition: Expr,
        val body: List<Stmt>,
        override val location: Location
    ) : Stmt()
    data class For(
        val init: Stmt?,
        val condition: Expr?,
        val update: Stmt?,
        val body: List<Stmt>,
        override val location: Location
    ) : Stmt()
    data class Break(override val location: Location) : Stmt()
    data class Continue(override val location: Location) : Stmt()
    data class Return(val value: Expr?, override val location: Location) : Stmt()
    data class Print(val expr: Expr, override val location: Location) : Stmt()
    data class ExprStmt(val expr: Expr, override val location: Location) : Stmt()
}

// ============================================================================
// PARSER - Recursive descent parser with operator precedence
// ============================================================================

class Parser(lexer: Lexer) {
    private val tokens: MutableList<Token> = mutableListOf()
    private var tokenIdx: Int = 0

    init {
        var result = lexer.nextToken()
        while (result != null) {
            tokens.add(result)
            result = lexer.nextToken()
        }
    }

    private fun current(): Token? {
        return if (tokenIdx < tokens.size) tokens[tokenIdx] else null
    }

    private fun peek(offset: Int = 1): Token? {
        val index = tokenIdx + offset
        return if (index < tokens.size) tokens[index] else null
    }

    private fun advance() {
        tokenIdx++
    }

    private fun expect(expected: kotlin.String): Location {
        val current = current()
            ?: throw error("Expected '$expected', got 'EOF'")
        if (current.token != expected) {
            throw error("Expected '$expected', got '${current.token}'")
        }
        val loc = current.location
        advance()
        return loc
    }

    private fun error(msg: kotlin.String): Exception {
        val current = current()
        val lineInfo = current?.let { " at line ${it.location.line}, column ${it.location.column}" } ?: ""
        return Exception("Parse error$lineInfo: $msg")
    }

    private fun match(vararg tokens: kotlin.String): Boolean {
        val current = current() ?: return false
        return current.token in tokens
    }

    private fun isKeyword(word: kotlin.String): Boolean {
        val keywords = listOf(
            "import", "from", "func", "let", "const", "var", "if", "else",
            "while", "for", "match", "break", "continue", "return", "true", "false",
            "int", "float", "bool", "char", "string", "any", "error"
        )
        return word in keywords
    }

    fun parseProgram(): List<Stmt> {
        val stmts = mutableListOf<Stmt>()
        while (current() != null) {
            stmts.add(parseStmt())
        }
        return stmts
    }

    private fun parseStmt(): Stmt {
        val current = current()
            ?: throw error("Unexpected EOF")
        val loc = current.location

        return when (current.token) {
            "import" -> {
                advance()
                val module = current()?.token
                    ?: throw error("Expected module name")
                advance()
                if (match("from")) {
                    advance()
                    advance()
                }
                Stmt.Import(module, loc)
            }
            "func" -> {
                advance()
                val name = current()?.token
                    ?: throw error("Expected function name")
                advance()
                expect("(")
                val params = mutableListOf<Pair<kotlin.String, TypeDef>>()
                while (!match(")")) {
                    val pName = current()?.token
                        ?: throw error("Expected parameter name")
                    advance()
                    expect(":")
                    val pType = parseType()
                    params.add(pName to pType)
                    if (match(",")) {
                        advance()
                    }
                }
                expect(")")
                expect("=>")
                val returnType = parseType()
                expect("{")
                val body = mutableListOf<Stmt>()
                while (!match("}")) {
                    body.add(parseStmt())
                }
                expect("}")
                Stmt.Func(name, params, returnType, body, loc)
            }
            "let", "const", "var" -> {
                val mutable = current.token == "var"
                advance()
                val name = current()?.token
                    ?: throw error("Expected variable name")
                advance()
                var type: TypeDef? = null
                if (match(":")) {
                    advance()
                    type = parseType()
                }
                var value: Expr? = null
                if (match("=")) {
                    advance()
                    value = parseExpr()
                }
                Stmt.VarDecl(name, type, value, mutable, loc)
            }
            "if" -> {
                advance()
                expect("(")
                val condition = parseExpr()
                expect(")")
                expect("{")
                val thenBranch = mutableListOf<Stmt>()
                while (!match("}")) {
                    thenBranch.add(parseStmt())
                }
                expect("}")
                var elseBranch: List<Stmt>? = null
                if (match("else")) {
                    advance()
                    expect("{")
                    elseBranch = mutableListOf()
                    while (!match("}")) {
                        (elseBranch as MutableList<Stmt>).add(parseStmt())
                    }
                    expect("}")
                }
                Stmt.If(condition, thenBranch, elseBranch, loc)
            }
            "while" -> {
                advance()
                expect("(")
                val condition = parseExpr()
                expect(")")
                expect("{")
                val body = mutableListOf<Stmt>()
                while (!match("}")) {
                    body.add(parseStmt())
                }
                expect("}")
                Stmt.While(condition, body, loc)
            }
            "for" -> {
                advance()
                expect("(")
                var init: Stmt? = null
                if (!match(";")) {
                    init = parseStmt()
                } else {
                    advance()
                }
                var condition: Expr? = null
                if (!match(";")) {
                    condition = parseExpr()
                }
                expect(";")
                var update: Stmt? = null
                if (!match(")")) {
                    update = Stmt.ExprStmt(parseExpr(), current()!!.location)
                }
                expect(")")
                expect("{")
                val body = mutableListOf<Stmt>()
                while (!match("}")) {
                    body.add(parseStmt())
                }
                expect("}")
                Stmt.For(init, condition, update, body, loc)
            }
            "break" -> {
                advance()
                Stmt.Break(loc)
            }
            "continue" -> {
                advance()
                Stmt.Continue(loc)
            }
            "return" -> {
                advance()
                var value: Expr? = null
                if (!match("}") && current() != null) {
                    value = parseExpr()
                }
                Stmt.Return(value, loc)
            }
            else -> {
                val expr = parseExpr()
                Stmt.ExprStmt(expr, loc)
            }
        }
    }

    private fun parseType(): TypeDef {
        val token = current()?.token
            ?: throw error("Expected type")
        advance()
        return parseTypeAnnotation(token)
    }

    private fun parseExpr(): Expr {
        return parseOr()
    }

    private fun parseOr(): Expr {
        var left = parseAnd()
        while (match("||")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val right = parseAnd()
            left = Expr.Binary(op, left, right, loc)
        }
        return left
    }

    private fun parseAnd(): Expr {
        var left = parseEquality()
        while (match("&&")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val right = parseEquality()
            left = Expr.Binary(op, left, right, loc)
        }
        return left
    }

    private fun parseEquality(): Expr {
        var left = parseRelational()
        while (match("==", "!=")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val right = parseRelational()
            left = Expr.Binary(op, left, right, loc)
        }
        return left
    }

    private fun parseRelational(): Expr {
        var left = parseAdditive()
        while (match("<", ">", "<=", ">=")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val right = parseAdditive()
            left = Expr.Binary(op, left, right, loc)
        }
        return left
    }

    private fun parseAdditive(): Expr {
        var left = parseMultiplicative()
        while (match("+", "-")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val right = parseMultiplicative()
            left = Expr.Binary(op, left, right, loc)
        }
        return left
    }

    private fun parseMultiplicative(): Expr {
        var left = parseUnary()
        while (match("*", "/", "%")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val right = parseUnary()
            left = Expr.Binary(op, left, right, loc)
        }
        return left
    }

    private fun parseUnary(): Expr {
        if (match("!", "-", "+", "~")) {
            val op = current()!!.token
            val loc = current()!!.location
            advance()
            val arg = parseUnary()
            return Expr.Unary(op, arg, loc)
        }
        return parseCall()
    }

    private fun parseCall(): Expr {
        var expr = parsePrimary()

        while (true) {
            when {
                match(".") -> {
                    val loc = current()!!.location
                    advance()
                    val func = current()?.token
                        ?: throw error("Expected function name")
                    advance()
                    expect("(")
                    val args = mutableListOf<Expr>()
                    while (!match(")")) {
                        args.add(parseExpr())
                        if (match(",")) advance()
                    }
                    expect(")")
                    val module = (expr as? Expr.Var)?.name ?: ""
                    expr = Expr.Call(module, func, args, loc)
                }
                match("(") && expr is Expr.Var -> {
                    val loc = current()!!.location
                    advance()
                    val args = mutableListOf<Expr>()
                    while (!match(")")) {
                        args.add(parseExpr())
                        if (match(",")) advance()
                    }
                    expect(")")
                    expr = Expr.Call("", expr.name, args, loc)
                }
                else -> break
            }
        }

        return expr
    }

    private fun parsePrimary(): Expr {
        val current = current()
            ?: throw error("Unexpected EOF")
        val loc = current.location

        return when {
            match("(") -> {
                advance()
                val expr = parseExpr()
                expect(")")
                expr
            }
            match("true") -> {
                advance()
                Expr.Bool(true, loc)
            }
            match("false") -> {
                advance()
                Expr.Bool(false, loc)
            }
            current.token.startsWith("\"") -> {
                advance()
                val value = current.token.substring(1, current.token.length - 1)
                Expr.String(value, loc)
            }
            current.token.startsWith("'") -> {
                advance()
                val value = current.token.substring(1, current.token.length - 1)
                Expr.String(value, loc)
            }
            current.token[0].isDigit() || (current.token.startsWith("-") && current.token.length > 1) -> {
                advance()
                val value = current.token.toDouble()
                Expr.Number(value, loc)
            }
            current.token[0].isLetter() || current.token[0] == '_' -> {
                advance()
                Expr.Var(current.token, loc)
            }
            else -> throw error("Unknown expression: ${current.token}")
        }
    }
}

// ============================================================================
// TYPE CHECKER - Compile-time type validation
// ============================================================================

class TypeChecker {
    private val errors: MutableList<kotlin.String> = mutableListOf()
    private val typeMap: MutableMap<kotlin.String, TypeDef> = mutableMapOf()

    fun check(stmts: List<Stmt>): List<kotlin.String> {
        for (stmt in stmts) {
            checkStmt(stmt)
        }
        return errors
    }

    private fun checkStmt(stmt: Stmt) {
        when (stmt) {
            is Stmt.VarDecl -> {
                if (stmt.value != null) {
                    val exprType = inferExprType(stmt.value)
                    val declType = stmt.varType ?: exprType
                    if (!typeCompatible(exprType, declType)) {
                        errors.add("Type mismatch at line ${stmt.location.line}")
                    }
                    typeMap[stmt.name] = declType
                }
            }
            is Stmt.If -> checkExpr(stmt.condition)
            is Stmt.While -> checkExpr(stmt.condition)
            is Stmt.For -> {
                if (stmt.condition != null) checkExpr(stmt.condition)
            }
            is Stmt.Func -> {
                for (s in stmt.body) checkStmt(s)
            }
            is Stmt.ExprStmt -> checkExpr(stmt.expr)
            else -> {}
        }
    }

    private fun checkExpr(expr: Expr) {
        when (expr) {
            is Expr.Binary -> {
                checkExpr(expr.left)
                checkExpr(expr.right)
            }
            is Expr.Unary -> checkExpr(expr.arg)
            is Expr.Call -> {
                for (arg in expr.args) {
                    checkExpr(arg)
                }
            }
            else -> {}
        }
    }

    private fun inferExprType(expr: Expr): TypeDef {
        return when (expr) {
            is Expr.Number -> TypeDef.Primitive("float")
            is Expr.String -> TypeDef.Primitive("string")
            is Expr.Bool -> TypeDef.Primitive("bool")
            is Expr.Var -> typeMap[expr.name] ?: TypeDef.Primitive("any")
            is Expr.Binary -> {
                val left = inferExprType(expr.left)
                val right = inferExprType(expr.right)
                when (expr.op) {
                    in listOf("==", "!=", "<", ">", "<=", ">=", "&&", "||") -> TypeDef.Primitive("bool")
                    "+", "-", "*", "/", "%" -> {
                        if (left is TypeDef.Primitive && right is TypeDef.Primitive) {
                            if (left.primitive == "float" || right.primitive == "float") {
                                TypeDef.Primitive("float")
                            } else {
                                left
                            }
                        } else {
                            TypeDef.Primitive("any")
                        }
                    }
                    else -> TypeDef.Primitive("any")
                }
            }
            is Expr.Unary -> {
                when (expr.op) {
                    "!" -> TypeDef.Primitive("bool")
                    else -> inferExprType(expr.arg)
                }
            }
            else -> TypeDef.Primitive("any")
        }
    }
}

// ============================================================================
// ENVIRONMENT - Variable scoping and binding
// ============================================================================

data class Value(
    val value: Any?,
    val type: TypeDef,
    val mutable: Boolean
)

class Environment(val parent: Environment? = null) {
    private val variables: MutableMap<kotlin.String, Value> = mutableMapOf()

    fun define(name: kotlin.String, value: Any?, type: TypeDef, mutable: Boolean) {
        variables[name] = Value(value, type, mutable)
    }

    fun get(name: kotlin.String): Any? {
        return variables[name]?.value ?: parent?.get(name)
    }

    fun set(name: kotlin.String, value: Any?) {
        val v = variables[name]
        if (v != null) {
            if (!v.mutable) {
                throw Exception("Cannot reassign immutable variable: $name")
            }
            variables[name] = v.copy(value = value)
        } else {
            parent?.set(name, value)
        }
    }

    fun exists(name: kotlin.String): Boolean {
        return name in variables || parent?.exists(name) == true
    }
}

// ============================================================================
// STANDARD LIBRARY - Built-in modules
// ============================================================================

data class ControlFlow(
    val type: kotlin.String,
    val value: Any? = null
)

val MODULES: Map<kotlin.String, Map<kotlin.String, (vararg Any?) -> Any?>> = mapOf(
    "str.io" to mapOf(
        "print" to { args: Array<Any?> ->
            println(args.joinToString(" "))
            null
        },
        "println" to { args: Array<Any?> ->
            println(args.joinToString(" "))
            null
        }
    ),
    "str.math" to mapOf(
        "sqrt" to { n: Double -> kotlin.math.sqrt(n) },
        "pow" to { base: Double, exp: Double -> kotlin.math.pow(base, exp) },
        "abs" to { n: Double -> kotlin.math.abs(n) },
        "floor" to { n: Double -> kotlin.math.floor(n) },
        "ceil" to { n: Double -> kotlin.math.ceil(n) },
        "random" to { Math.random() }
    ),
    "str.text" to mapOf(
        "toUpper" to { s: kotlin.String -> s.uppercase() },
        "toLower" to { s: kotlin.String -> s.lowercase() },
        "length" to { s: kotlin.String -> s.length.toDouble() }
    ),
    "str.util" to mapOf(
        "randomInt" to { max: Double -> (Math.random() * max).toInt().toDouble() }
    ),
    "str.time" to mapOf(
        "now" to { System.currentTimeMillis().toDouble() }
    )
)

// ============================================================================
// INTERPRETER - AST execution
// ============================================================================

class Interpreter {
    private var env = Environment()
    private val modules: MutableMap<kotlin.String, Map<kotlin.String, (vararg Any?) -> Any?>> = mutableMapOf()
    private var controlFlow: ControlFlow? = null

    fun run(stmts: List<Stmt>) {
        for (stmt in stmts) {
            execStmt(stmt)
            if (controlFlow != null && controlFlow!!.type == "return") break
        }
    }

    private fun execStmt(stmt: Stmt) {
        if (controlFlow != null && controlFlow!!.type in listOf("break", "continue", "return")) {
            return
        }

        when (stmt) {
            is Stmt.Import -> {
                val moduleName = if (stmt.module.startsWith("str.")) stmt.module else "str.${stmt.module}"
                modules[stmt.module] = MODULES[moduleName] ?: emptyMap()
            }
            is Stmt.VarDecl -> {
                val value = stmt.value?.let { evalExpr(it) }
                val type = stmt.varType ?: TypeDef.Primitive("any")
                env.define(stmt.name, value, type, stmt.mutable)
            }
            is Stmt.If -> {
                if (isTruthy(evalExpr(stmt.condition))) {
                    for (s in stmt.thenBranch) {
                        execStmt(s)
                        if (controlFlow != null) break
                    }
                } else if (stmt.elseBranch != null) {
                    for (s in stmt.elseBranch) {
                        execStmt(s)
                        if (controlFlow != null) break
                    }
                }
            }
            is Stmt.While -> {
                while (isTruthy(evalExpr(stmt.condition))) {
                    for (s in stmt.body) {
                        execStmt(s)
                        if (controlFlow != null) break
                    }
                    if (controlFlow?.type == "break") {
                        controlFlow = null
                        break
                    } else if (controlFlow?.type == "continue") {
                        controlFlow = null
                        continue
                    }
                }
            }
            is Stmt.For -> {
                stmt.init?.let { execStmt(it) }
                while (stmt.condition?.let { isTruthy(evalExpr(it)) } != false) {
                    for (s in stmt.body) {
                        execStmt(s)
                        if (controlFlow != null) break
                    }
                    if (controlFlow?.type == "break") {
                        controlFlow = null
                        break
                    } else if (controlFlow?.type == "continue") {
                        controlFlow = null
                    }
                    stmt.update?.let { execStmt(it) }
                }
            }
            is Stmt.Break -> {
                controlFlow = ControlFlow("break")
            }
            is Stmt.Continue -> {
                controlFlow = ControlFlow("continue")
            }
            is Stmt.Return -> {
                val value = stmt.value?.let { evalExpr(it) }
                controlFlow = ControlFlow("return", value)
            }
            is Stmt.ExprStmt -> {
                evalExpr(stmt.expr)
            }
            is Stmt.Func -> {
                // Function definition stored in environment
                env.define(stmt.name, stmt, TypeDef.Primitive("function"), false)
            }
            else -> {}
        }
    }

    private fun evalExpr(expr: Expr): Any? {
        return when (expr) {
            is Expr.Number -> expr.value
            is Expr.String -> expr.value
            is Expr.Bool -> expr.value
            is Expr.Var -> env.get(expr.name)
            is Expr.Call -> {
                if (expr.module.isEmpty()) {
                    throw Exception("User-defined functions not yet implemented: ${expr.func}")
                }
                val moduleName = if (expr.module.startsWith("str.")) expr.module else "str.${expr.module}"
                val mod = modules[expr.module] ?: MODULES[moduleName]
                    ?: throw Exception("Module not imported: ${expr.module}")
                val fn = mod[expr.func]
                    ?: throw Exception("Function not found: ${expr.module}.${expr.func}")
                val args = expr.args.map { evalExpr(it) }.toTypedArray()
                fn(*args)
            }
            is Expr.Binary -> {
                val l = evalExpr(expr.left)
                val r = evalExpr(expr.right)
                when (expr.op) {
                    "+" -> when {
                        l is Double && r is Double -> l + r
                        l is kotlin.String || r is kotlin.String -> "$l$r"
                        else -> l
                    }
                    "-" -> (l as Double) - (r as Double)
                    "*" -> (l as Double) * (r as Double)
                    "/" -> (l as Double) / (r as Double)
                    "%" -> (l as Double) % (r as Double)
                    "==" -> l == r
                    "!=" -> l != r
                    "<" -> (l as Double) < (r as Double)
                    ">" -> (l as Double) > (r as Double)
                    "<=" -> (l as Double) <= (r as Double)
                    ">=" -> (l as Double) >= (r as Double)
                    "&&" -> isTruthy(l) && isTruthy(r)
                    "||" -> isTruthy(l) || isTruthy(r)
                    else -> throw Exception("Unknown operator: ${expr.op}")
                }
            }
            is Expr.Unary -> {
                val arg = evalExpr(expr.arg)
                when (expr.op) {
                    "-" -> -(arg as Double)
                    "+" -> arg as Double
                    "!" -> !isTruthy(arg)
                    "~" -> ((arg as Double).toInt()).inv().toDouble()
                    else -> throw Exception("Unknown unary operator: ${expr.op}")
                }
            }
            is Expr.Tuple -> {
                expr.elements.map { evalExpr(it) }
            }
            else -> null
        }
    }

    private fun isTruthy(value: Any?): Boolean {
        return value != null && value != false && value != 0.0
    }
}

// ============================================================================
// C CODE GENERATOR - Transpiles AST to C
// ============================================================================

class CGenerator {
    private val lines: MutableList<kotlin.String> = mutableListOf()
    private val declaredVars: MutableSet<kotlin.String> = mutableSetOf()
    private var indent: Int = 0

    fun generate(stmts: List<Stmt>): kotlin.String {
        lines.add("#include <stdio.h>")
        lines.add("#include <math.h>")
        lines.add("#include <stdbool.h>")
        lines.add("")
        lines.add("int main() {")
        indent++

        for (stmt in stmts) {
            emitStmt(stmt)
        }

        indent--
        lines.add("  return 0;")
        lines.add("}")

        return lines.joinToString("\n")
    }

    private fun emitStmt(stmt: Stmt) {
        val ind = "  ".repeat(indent)
        when (stmt) {
            is Stmt.VarDecl -> {
                val typeStr = typeToC(stmt.varType ?: TypeDef.Primitive("any"))
                val init = stmt.value?.let { " = ${emitExpr(it)}" } ?: ""
                lines.add("$ind$typeStr ${stmt.name}$init;")
                declaredVars.add(stmt.name)
            }
            is Stmt.If -> {
                val cond = emitExpr(stmt.condition)
                lines.add("${ind}if ($cond) {")
                indent++
                for (s in stmt.thenBranch) emitStmt(s)
                indent--
                if (stmt.elseBranch != null) {
                    lines.add("$ind} else {")
                    indent++
                    for (s in stmt.elseBranch) emitStmt(s)
                    indent--
                }
                lines.add("$ind}")
            }
            is Stmt.While -> {
                val cond = emitExpr(stmt.condition)
                lines.add("${ind}while ($cond) {")
                indent++
                for (s in stmt.body) emitStmt(s)
                indent--
                lines.add("$ind}")
            }
            is Stmt.For -> {
                var initStr = ""
                if (stmt.init != null) {
                    if (stmt.init is Stmt.VarDecl) {
                        initStr = "${typeToC(stmt.init.varType ?: TypeDef.Primitive("int"))} ${stmt.init.name}" +
                                (stmt.init.value?.let { " = ${emitExpr(it)}" } ?: "")
                    }
                }
                val condStr = stmt.condition?.let { emitExpr(it) } ?: "1"
                var updateStr = ""
                if (stmt.update != null) {
                    if (stmt.update is Stmt.ExprStmt) {
                        updateStr = emitExpr(stmt.update.expr)
                    }
                }
                lines.add("${ind}for ($initStr; $condStr; $updateStr) {")
                indent++
                for (s in stmt.body) emitStmt(s)
                indent--
                lines.add("$ind}")
            }
            is Stmt.Break -> lines.add("${ind}break;")
            is Stmt.Continue -> lines.add("${ind}continue;")
            is Stmt.Return -> {
                if (stmt.value != null) {
                    lines.add("${ind}return ${emitExpr(stmt.value)};")
                } else {
                    lines.add("${ind}return;")
                }
            }
            is Stmt.ExprStmt -> {
                lines.add("${ind}${emitExpr(stmt.expr)};")
            }
            else -> {}
        }
    }

    private fun emitExpr(expr: Expr): kotlin.String {
        return when (expr) {
            is Expr.Number -> expr.value.toLong().toString()
            is Expr.String -> "\"${expr.value}\""
            is Expr.Bool -> if (expr.value) "true" else "false"
            is Expr.Var -> expr.name
            is Expr.Binary -> {
                val l = emitExpr(expr.left)
                val r = emitExpr(expr.right)
                "($l ${expr.op} $r)"
            }
            is Expr.Unary -> {
                val arg = emitExpr(expr.arg)
                "${expr.op}$arg"
            }
            is Expr.Call -> {
                val args = expr.args.map { emitExpr(it) }.joinToString(", ")
                when (expr.module) {
                    "math" -> "${expr.func}($args)"
                    "io" -> if (expr.func == "print") "printf(\"%d\\\\n\", $args)" else "0"
                    else -> "0"
                }
            }
            else -> "0"
        }
    }

    private fun typeToC(type: TypeDef?): kotlin.String {
        return when (type) {
            is TypeDef.Primitive -> when (type.primitive) {
                "int" -> "int"
                "float" -> "float"
                "bool" -> "bool"
                "char" -> "char"
                "string" -> "char*"
                else -> "int"
            }
            else -> "int"
        }
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

fun main(args: Array<kotlin.String>) {
    val file = args.firstOrNull() ?: "myprogram.str"

    try {
        val source = File(file).readText()
        val lexer = Lexer(source)
        val parser = Parser(lexer)
        val program = parser.parseProgram()

        // Type check
        val checker = TypeChecker()
        val typeErrors = checker.check(program)
        if (typeErrors.isNotEmpty()) {
            System.err.println("Type errors:")
            typeErrors.forEach { System.err.println("  $it") }
            System.exit(1)
        }

        // Run interpreter
        val interpreter = Interpreter()
        interpreter.run(program)

        // Generate C code
        val cgen = CGenerator()
        val cCode = cgen.generate(program)
        File("out.c").writeText(cCode)
        println("✓ C code generated: out.c")
    } catch (err: Exception) {
        System.err.println("Error: ${err.message}")
        err.printStackTrace()
        System.exit(1)
    }
}
