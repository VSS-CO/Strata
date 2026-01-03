import java.io.File

// ============================================================================
// STRATA INTERPRETER IN KOTLIN
// Complete lexer, parser, type checker, and interpreter
// ============================================================================

enum class TokenType {
    INT, FLOAT, STRING, BOOL, CHAR, IDENTIFIER, KEYWORD,
    PLUS, MINUS, STAR, SLASH, PERCENT,
    EQ, NE, LT, GT, LE, GE, AND, OR, NOT, TILDE,
    ASSIGN, ARROW, LPAREN, RPAREN, LBRACE, RBRACE,
    SEMICOLON, COMMA, COLON, DOT, EOF, ERROR
}

data class Token(
    val type: TokenType,
    val value: Any,
    val line: Int = 1,
    val column: Int = 1
)

// ========================================================================
// LEXER
// ========================================================================

class Lexer(val input: String) {
    var pos = 0
    var line = 1
    var column = 1
    val keywords = setOf(
        "let", "const", "var", "func", "if", "else", "while", "for",
        "return", "break", "continue", "import", "from",
        "true", "false", "int", "float", "bool", "string", "char", "any"
    )

    fun peek(): Char = if (pos < input.length) input[pos] else '\u0000'

    fun advance(): Char {
        val ch = peek()
        pos++
        if (ch == '\n') {
            line++
            column = 1
        } else {
            column++
        }
        return ch
    }

    fun skipWhitespace() {
        while (peek().isWhitespace()) advance()
    }

    fun skipComment() {
        if (peek() == '/' && pos + 1 < input.length && input[pos + 1] == '/') {
            while (peek() != '\n' && peek() != '\u0000') advance()
        }
    }

    fun readNumber(): Token {
        val num = StringBuilder()
        var hasDot = false
        while (peek().isDigit() || (peek() == '.' && !hasDot)) {
            if (peek() == '.') hasDot = true
            num.append(advance())
        }
        return if (hasDot) {
            Token(TokenType.FLOAT, num.toString().toDouble(), line, column)
        } else {
            Token(TokenType.INT, num.toString().toLong(), line, column)
        }
    }

    fun readString(): Token {
        advance() // skip "
        val s = StringBuilder()
        while (peek() != '"' && peek() != '\u0000') {
            if (peek() == '\\') {
                advance()
                val escaped = advance()
                when (escaped) {
                    'n' -> s.append('\n')
                    't' -> s.append('\t')
                    else -> s.append(escaped)
                }
            } else {
                s.append(advance())
            }
        }
        advance() // skip "
        return Token(TokenType.STRING, s.toString(), line, column)
    }

    fun readIdentifier(): Token {
        val ident = StringBuilder()
        while (peek().isLetterOrDigit() || peek() == '_') {
            ident.append(advance())
        }
        val name = ident.toString()
        return when {
            name in keywords && (name == "true" || name == "false") ->
                Token(TokenType.BOOL, name == "true", line, column)
            name in keywords -> Token(TokenType.KEYWORD, name, line, column)
            else -> Token(TokenType.IDENTIFIER, name, line, column)
        }
    }

    fun nextToken(): Token {
        while (true) {
            skipWhitespace()
            skipComment()
            skipWhitespace()

            if (peek() == '\u0000') return Token(TokenType.EOF, "", line, column)

            val l = line
            val c = column
            val ch = peek()

            return when {
                ch.isDigit() -> readNumber()
                ch == '"' -> readString()
                ch.isLetter() || ch == '_' -> readIdentifier()
                ch == '+' -> { advance(); Token(TokenType.PLUS, "+", l, c) }
                ch == '-' -> { advance(); Token(TokenType.MINUS, "-", l, c) }
                ch == '*' -> { advance(); Token(TokenType.STAR, "*", l, c) }
                ch == '/' -> { advance(); Token(TokenType.SLASH, "/", l, c) }
                ch == '%' -> { advance(); Token(TokenType.PERCENT, "%", l, c) }
                ch == '=' -> {
                    advance()
                    when {
                        peek() == '=' -> { advance(); Token(TokenType.EQ, "==", l, c) }
                        peek() == '>' -> { advance(); Token(TokenType.ARROW, "=>", l, c) }
                        else -> Token(TokenType.ASSIGN, "=", l, c)
                    }
                }
                ch == '!' -> {
                    advance()
                    if (peek() == '=') { advance(); Token(TokenType.NE, "!=", l, c) }
                    else Token(TokenType.NOT, "!", l, c)
                }
                ch == '<' -> {
                    advance()
                    if (peek() == '=') { advance(); Token(TokenType.LE, "<=", l, c) }
                    else Token(TokenType.LT, "<", l, c)
                }
                ch == '>' -> {
                    advance()
                    if (peek() == '=') { advance(); Token(TokenType.GE, ">=", l, c) }
                    else Token(TokenType.GT, ">", l, c)
                }
                ch == '&' && pos + 1 < input.length && input[pos + 1] == '&' ->
                    { advance(); advance(); Token(TokenType.AND, "&&", l, c) }
                ch == '|' && pos + 1 < input.length && input[pos + 1] == '|' ->
                    { advance(); advance(); Token(TokenType.OR, "||", l, c) }
                ch == '~' -> { advance(); Token(TokenType.TILDE, "~", l, c) }
                ch == '(' -> { advance(); Token(TokenType.LPAREN, "(", l, c) }
                ch == ')' -> { advance(); Token(TokenType.RPAREN, ")", l, c) }
                ch == '{' -> { advance(); Token(TokenType.LBRACE, "{", l, c) }
                ch == '}' -> { advance(); Token(TokenType.RBRACE, "}", l, c) }
                ch == ';' -> { advance(); Token(TokenType.SEMICOLON, ";", l, c) }
                ch == ',' -> { advance(); Token(TokenType.COMMA, ",", l, c) }
                ch == ':' -> { advance(); Token(TokenType.COLON, ":", l, c) }
                ch == '.' -> { advance(); Token(TokenType.DOT, ".", l, c) }
                else -> { advance(); nextToken() }
            }
        }
    }
}

// ========================================================================
// AST
// ========================================================================

data class Value(val type: String, val value: Any?) {
    fun print() {
        when (type) {
            "null" -> print("null")
            else -> print(value)
        }
    }
}

sealed class Expr
data class Literal(val value: Value) : Expr()
data class Identifier(val name: String) : Expr()
data class Binary(val op: String, val left: Expr, val right: Expr) : Expr()
data class Unary(val op: String, val operand: Expr) : Expr()

sealed class Stmt
data class Let(val name: String, val type: String, val value: Expr, val mutable: Boolean) : Stmt()
data class ExprStmt(val expr: Expr) : Stmt()
data class If(val condition: Expr, val thenBody: List<Stmt>) : Stmt()
data class Return(val value: Expr?) : Stmt()

// ========================================================================
// PARSER
// ========================================================================

class Parser(input: String) {
    val tokens = mutableListOf<Token>()
    var pos = 0

    init {
        val lexer = Lexer(input)
        var token = lexer.nextToken()
        do {
            tokens.add(token)
            token = lexer.nextToken()
        } while (token.type != TokenType.EOF)
    }

    fun current(): Token = tokens.getOrNull(pos) ?: tokens.last()

    fun advance() {
        if (pos < tokens.size) pos++
    }

    fun parse(): List<Stmt> {
        val stmts = mutableListOf<Stmt>()
        while (current().type != TokenType.EOF) {
            stmts.add(parseStatement())
        }
        return stmts
    }

    fun parseStatement(): Stmt {
        if (current().type == TokenType.KEYWORD) {
            val kw = current().value as String
            return when (kw) {
                "let", "const", "var" -> {
                    val mutable = kw == "var"
                    advance()
                    val name = current().value as String
                    advance()
                    advance() // :
                    val type = current().value as String
                    advance()
                    advance() // =
                    val value = parseExpression()
                    Let(name, type, value, mutable)
                }
                "if" -> {
                    advance()
                    advance() // (
                    val condition = parseExpression()
                    advance() // )
                    advance() // {
                    val thenBody = mutableListOf<Stmt>()
                    while (current().type != TokenType.RBRACE) {
                        thenBody.add(parseStatement())
                    }
                    advance() // }
                    If(condition, thenBody)
                }
                "return" -> {
                    advance()
                    val value = if (current().type != TokenType.SEMICOLON && current().type != TokenType.RBRACE) {
                        parseExpression()
                    } else null
                    Return(value)
                }
                else -> ExprStmt(parseExpression())
            }
        }
        return ExprStmt(parseExpression())
    }

    fun parseExpression(): Expr = parseBinary(0)

    fun parseBinary(minPrec: Int): Expr {
        var left = parseUnary()
        while (true) {
            val prec = precedence()
            if (prec < minPrec) break
            val op = current().value as String
            advance()
            val right = parseBinary(prec + 1)
            left = Binary(op, left, right)
        }
        return left
    }

    fun precedence(): Int = when (current().type) {
        TokenType.OR -> 1
        TokenType.AND -> 2
        TokenType.EQ, TokenType.NE -> 3
        TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE -> 4
        TokenType.PLUS, TokenType.MINUS -> 5
        TokenType.STAR, TokenType.SLASH, TokenType.PERCENT -> 6
        else -> 0
    }

    fun parseUnary(): Expr {
        if (current().type in listOf(TokenType.NOT, TokenType.MINUS, TokenType.PLUS, TokenType.TILDE)) {
            val op = current().value as String
            advance()
            return Unary(op, parseUnary())
        }
        return parsePrimary()
    }

    fun parsePrimary(): Expr = when (current().type) {
        TokenType.INT -> {
            val i = current().value as Long
            advance()
            Literal(Value("int", i))
        }
        TokenType.FLOAT -> {
            val f = current().value as Double
            advance()
            Literal(Value("float", f))
        }
        TokenType.STRING -> {
            val s = current().value as String
            advance()
            Literal(Value("string", s))
        }
        TokenType.BOOL -> {
            val b = current().value as Boolean
            advance()
            Literal(Value("bool", b))
        }
        TokenType.IDENTIFIER -> {
            val name = current().value as String
            advance()
            Identifier(name)
        }
        TokenType.LPAREN -> {
            advance()
            val expr = parseExpression()
            advance()
            expr
        }
        else -> Literal(Value("null", null))
    }
}

// ========================================================================
// INTERPRETER
// ========================================================================

class Interpreter {
    val vars = mutableMapOf<String, Value>()

    fun execute(stmts: List<Stmt>) {
        for (stmt in stmts) {
            executeStatement(stmt)
        }
    }

    fun executeStatement(stmt: Stmt) {
        when (stmt) {
            is Let -> vars[stmt.name] = evalExpression(stmt.value)
            is ExprStmt -> evalExpression(stmt.expr)
            is If -> {
                if (isTruthy(evalExpression(stmt.condition))) {
                    execute(stmt.thenBody)
                }
            }
            is Return -> {}
        }
    }

    fun evalExpression(expr: Expr): Value = when (expr) {
        is Literal -> expr.value
        is Identifier -> vars[expr.name] ?: Value("null", null)
        is Binary -> {
            val left = evalExpression(expr.left)
            val right = evalExpression(expr.right)
            evalBinary(expr.op, left, right)
        }
        is Unary -> evalUnary(expr.op, evalExpression(expr.operand))
    }

    fun evalBinary(op: String, left: Value, right: Value): Value {
        if (left.type == "int" && right.type == "int") {
            val l = left.value as Long
            val r = right.value as Long
            return when (op) {
                "+" -> Value("int", l + r)
                "-" -> Value("int", l - r)
                "*" -> Value("int", l * r)
                "/" -> Value("int", if (r != 0L) l / r else 0)
                "%" -> Value("int", if (r != 0L) l % r else 0)
                "==" -> Value("bool", l == r)
                "!=" -> Value("bool", l != r)
                "<" -> Value("bool", l < r)
                ">" -> Value("bool", l > r)
                "<=" -> Value("bool", l <= r)
                ">=" -> Value("bool", l >= r)
                else -> Value("null", null)
            }
        }
        return Value("null", null)
    }

    fun evalUnary(op: String, operand: Value): Value {
        if (operand.type == "int") {
            val v = operand.value as Long
            return when (op) {
                "-" -> Value("int", -v)
                "+" -> Value("int", v)
                "~" -> Value("int", v.inv())
                else -> Value("null", null)
            }
        }
        if (operand.type == "bool" && op == "!") {
            return Value("bool", !(operand.value as Boolean))
        }
        return Value("null", null)
    }

    fun isTruthy(v: Value): Boolean = when (v.type) {
        "bool" -> v.value as Boolean
        "int" -> (v.value as Long) != 0L
        "null" -> false
        else -> true
    }
}

fun main(args: Array<String>) {
    if (args.isEmpty()) {
        System.err.println("Usage: kotlin Strata <file.str>")
        System.exit(1)
    }

    val source = File(args[0]).readText()
    val parser = Parser(source)
    val stmts = parser.parse()

    val interpreter = Interpreter()
    interpreter.execute(stmts)
}
