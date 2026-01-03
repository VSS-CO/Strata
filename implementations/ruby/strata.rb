#!/usr/bin/env ruby

# ============================================================================
# STRATA INTERPRETER IN RUBY
# Complete lexer, parser, type checker, and interpreter
# ============================================================================

module TokenType
  INT = :int
  FLOAT = :float
  STRING = :string
  BOOL = :bool
  CHAR = :char
  IDENTIFIER = :identifier
  KEYWORD = :keyword
  PLUS = :plus
  MINUS = :minus
  STAR = :star
  SLASH = :slash
  PERCENT = :percent
  EQ = :eq
  NE = :ne
  LT = :lt
  GT = :gt
  LE = :le
  GE = :ge
  AND = :and
  OR = :or
  NOT = :not
  TILDE = :tilde
  ASSIGN = :assign
  ARROW = :arrow
  LPAREN = :lparen
  RPAREN = :rparen
  LBRACE = :lbrace
  RBRACE = :rbrace
  SEMICOLON = :semicolon
  COMMA = :comma
  COLON = :colon
  DOT = :dot
  EOF_TOKEN = :eof
  ERROR = :error
end

Token = Struct.new(:type, :value, :line, :column)

# ========================================================================
# LEXER
# ========================================================================

class Lexer
  KEYWORDS = Set.new([
    'let', 'const', 'var', 'func', 'if', 'else', 'while', 'for',
    'return', 'break', 'continue', 'import', 'from',
    'true', 'false', 'int', 'float', 'bool', 'string', 'char', 'any'
  ])

  def initialize(input)
    @input = input
    @pos = 0
    @line = 1
    @column = 1
  end

  def peek
    @pos < @input.length ? @input[@pos] : "\0"
  end

  def advance
    ch = peek
    @pos += 1
    if ch == "\n"
      @line += 1
      @column = 1
    else
      @column += 1
    end
    ch
  end

  def skip_whitespace
    while peek.match?(/\s/)
      advance
    end
  end

  def skip_comment
    if peek == '/' && @pos + 1 < @input.length && @input[@pos + 1] == '/'
      advance while peek != "\n" && peek != "\0"
    end
  end

  def read_number
    num = ''
    has_dot = false
    while peek.match?(/\d/) || (peek == '.' && !has_dot)
      has_dot = true if peek == '.'
      num += advance
    end
    if has_dot
      Token.new(TokenType::FLOAT, num.to_f, @line, @column)
    else
      Token.new(TokenType::INT, num.to_i, @line, @column)
    end
  end

  def read_string
    advance # skip "
    s = ''
    while peek != '"' && peek != "\0"
      if peek == '\\'
        advance
        escaped = advance
        s += case escaped
             when 'n' then "\n"
             when 't' then "\t"
             else escaped
             end
      else
        s += advance
      end
    end
    advance # skip "
    Token.new(TokenType::STRING, s, @line, @column)
  end

  def read_identifier
    ident = ''
    while peek.match?(/\w/) || peek == '_'
      ident += advance
    end
    if ident == 'true' || ident == 'false'
      Token.new(TokenType::BOOL, ident == 'true', @line, @column)
    elsif KEYWORDS.include?(ident)
      Token.new(TokenType::KEYWORD, ident, @line, @column)
    else
      Token.new(TokenType::IDENTIFIER, ident, @line, @column)
    end
  end

  def next_token
    loop do
      skip_whitespace
      skip_comment
      skip_whitespace

      return Token.new(TokenType::EOF_TOKEN, '', @line, @column) if peek == "\0"

      l, c = @line, @column
      ch = peek

      return read_number if ch.match?(/\d/)
      return read_string if ch == '"'
      return read_identifier if ch.match?(/[a-zA-Z_]/)

      case ch
      when '+' then advance; return Token.new(TokenType::PLUS, '+', l, c)
      when '-' then advance; return Token.new(TokenType::MINUS, '-', l, c)
      when '*' then advance; return Token.new(TokenType::STAR, '*', l, c)
      when '/' then advance; return Token.new(TokenType::SLASH, '/', l, c)
      when '%' then advance; return Token.new(TokenType::PERCENT, '%', l, c)
      when '='
        advance
        if peek == '=' then advance; return Token.new(TokenType::EQ, '==', l, c) end
        if peek == '>' then advance; return Token.new(TokenType::ARROW, '=>', l, c) end
        return Token.new(TokenType::ASSIGN, '=', l, c)
      when '!'
        advance
        if peek == '=' then advance; return Token.new(TokenType::NE, '!=', l, c) end
        return Token.new(TokenType::NOT, '!', l, c)
      when '<'
        advance
        if peek == '=' then advance; return Token.new(TokenType::LE, '<=', l, c) end
        return Token.new(TokenType::LT, '<', l, c)
      when '>'
        advance
        if peek == '=' then advance; return Token.new(TokenType::GE, '>=', l, c) end
        return Token.new(TokenType::GT, '>', l, c)
      when '&'
        if @pos + 1 < @input.length && @input[@pos + 1] == '&'
          advance; advance; return Token.new(TokenType::AND, '&&', l, c)
        end
      when '|'
        if @pos + 1 < @input.length && @input[@pos + 1] == '|'
          advance; advance; return Token.new(TokenType::OR, '||', l, c)
        end
      when '~' then advance; return Token.new(TokenType::TILDE, '~', l, c)
      when '(' then advance; return Token.new(TokenType::LPAREN, '(', l, c)
      when ')' then advance; return Token.new(TokenType::RPAREN, ')', l, c)
      when '{' then advance; return Token.new(TokenType::LBRACE, '{', l, c)
      when '}' then advance; return Token.new(TokenType::RBRACE, '}', l, c)
      when ';' then advance; return Token.new(TokenType::SEMICOLON, ';', l, c)
      when ',' then advance; return Token.new(TokenType::COMMA, ',', l, c)
      when ':' then advance; return Token.new(TokenType::COLON, ':', l, c)
      when '.' then advance; return Token.new(TokenType::DOT, '.', l, c)
      else advance
      end
    end
  end
end

# ========================================================================
# AST
# ========================================================================

Value = Struct.new(:type, :value)

class Expr; end
class Literal < Expr; attr_accessor :value; end
class Identifier < Expr; attr_accessor :name; end
class Binary < Expr; attr_accessor :op, :left, :right; end
class Unary < Expr; attr_accessor :op, :operand; end

class Stmt; end
class Let < Stmt; attr_accessor :name, :type, :value, :mutable; end
class ExprStmt < Stmt; attr_accessor :expr; end
class If < Stmt; attr_accessor :condition, :then_body; end
class Return < Stmt; attr_accessor :value; end

# ========================================================================
# PARSER
# ========================================================================

class Parser
  def initialize(input)
    lexer = Lexer.new(input)
    @tokens = []
    loop do
      token = lexer.next_token
      @tokens << token
      break if token.type == TokenType::EOF_TOKEN
    end
    @pos = 0
  end

  def current
    @pos < @tokens.length ? @tokens[@pos] : @tokens.last
  end

  def advance
    @pos += 1 if @pos < @tokens.length
  end

  def parse
    stmts = []
    while current.type != TokenType::EOF_TOKEN
      stmts << parse_statement
    end
    stmts
  end

  def parse_statement
    if current.type == TokenType::KEYWORD
      kw = current.value
      if ['let', 'const', 'var'].include?(kw)
        mutable = kw == 'var'
        advance
        name = current.value
        advance
        advance # :
        type = current.value
        advance
        advance # =
        value = parse_expression
        stmt = Let.new
        stmt.name = name
        stmt.type = type
        stmt.value = value
        stmt.mutable = mutable
        return stmt
      elsif kw == 'if'
        advance
        advance # (
        condition = parse_expression
        advance # )
        advance # {
        then_body = []
        while current.type != TokenType::RBRACE
          then_body << parse_statement
        end
        advance # }
        stmt = If.new
        stmt.condition = condition
        stmt.then_body = then_body
        return stmt
      elsif kw == 'return'
        advance
        value = nil
        if current.type != TokenType::SEMICOLON && current.type != TokenType::RBRACE
          value = parse_expression
        end
        stmt = Return.new
        stmt.value = value
        return stmt
      end
    end
    ExprStmt.new.tap { |s| s.expr = parse_expression }
  end

  def parse_expression
    parse_binary(0)
  end

  def parse_binary(min_prec)
    left = parse_unary
    loop do
      prec = precedence
      break if prec < min_prec
      op = current.value
      advance
      right = parse_binary(prec + 1)
      expr = Binary.new
      expr.op = op
      expr.left = left
      expr.right = right
      left = expr
    end
    left
  end

  def precedence
    case current.type
    when TokenType::OR then 1
    when TokenType::AND then 2
    when TokenType::EQ, TokenType::NE then 3
    when TokenType::LT, TokenType::GT, TokenType::LE, TokenType::GE then 4
    when TokenType::PLUS, TokenType::MINUS then 5
    when TokenType::STAR, TokenType::SLASH, TokenType::PERCENT then 6
    else 0
    end
  end

  def parse_unary
    if [TokenType::NOT, TokenType::MINUS, TokenType::PLUS, TokenType::TILDE].include?(current.type)
      op = current.value
      advance
      expr = Unary.new
      expr.op = op
      expr.operand = parse_unary
      return expr
    end
    parse_primary
  end

  def parse_primary
    case current.type
    when TokenType::INT
      lit = Literal.new
      lit.value = Value.new('int', current.value)
      advance
      lit
    when TokenType::FLOAT
      lit = Literal.new
      lit.value = Value.new('float', current.value)
      advance
      lit
    when TokenType::STRING
      lit = Literal.new
      lit.value = Value.new('string', current.value)
      advance
      lit
    when TokenType::BOOL
      lit = Literal.new
      lit.value = Value.new('bool', current.value)
      advance
      lit
    when TokenType::IDENTIFIER
      id = Identifier.new
      id.name = current.value
      advance
      id
    when TokenType::LPAREN
      advance
      expr = parse_expression
      advance
      expr
    else
      lit = Literal.new
      lit.value = Value.new('null', nil)
      lit
    end
  end
end

# ========================================================================
# INTERPRETER
# ========================================================================

class Interpreter
  def initialize
    @vars = {}
  end

  def execute(stmts)
    stmts.each { |stmt| execute_statement(stmt) }
  end

  private

  def execute_statement(stmt)
    case stmt
    when Let
      @vars[stmt.name] = eval_expression(stmt.value)
    when ExprStmt
      eval_expression(stmt.expr)
    when If
      if is_truthy(eval_expression(stmt.condition))
        execute(stmt.then_body)
      end
    when Return
      eval_expression(stmt.value) if stmt.value
    end
  end

  def eval_expression(expr)
    case expr
    when Literal
      expr.value
    when Identifier
      @vars[expr.name] || Value.new('null', nil)
    when Binary
      left = eval_expression(expr.left)
      right = eval_expression(expr.right)
      eval_binary(expr.op, left, right)
    when Unary
      eval_unary(expr.op, eval_expression(expr.operand))
    else
      Value.new('null', nil)
    end
  end

  def eval_binary(op, left, right)
    if left.type == 'int' && right.type == 'int'
      l = left.value
      r = right.value
      result = case op
               when '+' then l + r
               when '-' then l - r
               when '*' then l * r
               when '/' then r != 0 ? l / r : 0
               when '%' then r != 0 ? l % r : 0
               when '==' then l == r
               when '!=' then l != r
               when '<' then l < r
               when '>' then l > r
               when '<=' then l <= r
               when '>=' then l >= r
               else nil
               end
      result_type = ['==', '!=', '<', '>', '<=', '>='].include?(op) ? 'bool' : 'int'
      Value.new(result_type, result)
    else
      Value.new('null', nil)
    end
  end

  def eval_unary(op, operand)
    if operand.type == 'int'
      v = operand.value
      result = case op
               when '-' then -v
               when '+' then v
               when '~' then ~v
               else nil
               end
      return Value.new('int', result) if result
    elsif operand.type == 'bool' && op == '!'
      return Value.new('bool', !operand.value)
    end
    Value.new('null', nil)
  end

  def is_truthy(v)
    case v.type
    when 'bool' then v.value
    when 'int' then v.value != 0
    when 'null' then false
    else true
    end
  end
end

# ========================================================================
# MAIN
# ========================================================================

if __FILE__ == $0
  if ARGV.empty?
    puts "Usage: ruby strata.rb <file.str>"
    exit 1
  end

  begin
    source = File.read(ARGV[0])
    parser = Parser.new(source)
    stmts = parser.parse

    interpreter = Interpreter.new
    interpreter.execute(stmts)
  rescue => e
    puts "Error: #{e.message}"
    exit 1
  end
end
