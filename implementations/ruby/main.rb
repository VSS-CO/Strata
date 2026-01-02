#!/usr/bin/env ruby

TYPE_REGISTRY = {
    "int" => { kind: "primitive", primitive: "int" },
    "float" => { kind: "primitive", primitive: "float" },
    "bool" => { kind: "primitive", primitive: "bool" },
    "char" => { kind: "primitive", primitive: "char" },
    "string" => { kind: "primitive", primitive: "string" },
    "any" => { kind: "primitive", primitive: "any" }
}

def parse_type_annotation(token)
    return TYPE_REGISTRY[token] if TYPE_REGISTRY[token]
    
    if token.end_with?("?")
        inner = parse_type_annotation(token[0..-2])
        return inner || { kind: "primitive", primitive: "any" }
    end
    
    { kind: "primitive", primitive: "any" }
end

def type_compatible(actual, expected)
    return true if expected[:primitive] == "any" || actual[:primitive] == "any"
    return false unless actual[:kind] == "primitive" && expected[:kind] == "primitive"
    
    return true if actual[:primitive] == expected[:primitive]
    return true if actual[:primitive] == "int" && expected[:primitive] == "float"
    return true if actual[:primitive] == "char" && expected[:primitive] == "string"
    
    false
end

class Lexer
    def initialize(input)
        @input = input
        @pos = 0
        @line = 1
        @column = 1
        @line_start = 0
    end
    
    def peek
        return nil if @pos >= @input.length
        @input[@pos]
    end
    
    def advance
        ch = peek
        @pos += 1
        if ch == "\n"
            @line += 1
            @column = 1
            @line_start = @pos
        else
            @column += 1
        end
        ch
    end
    
    def get_location
        {
            line: @line,
            column: @column,
            source: @input[@line_start...@pos]
        }
    end
    
    def next_token
        while peek && [' ', "\n", "\r", "\t"].include?(peek)
            advance
        end
        
        if peek == '/' && @pos + 1 < @input.length && @input[@pos + 1] == '/'
            advance while peek && peek != "\n"
            return next_token
        end
        
        return nil unless peek
        
        loc = get_location
        
        two_char = @input[@pos...@pos + 2] if @pos + 2 <= @input.length
        if ['==', '!=', '<=', '>=', '=>', '||', '&&', '++', '--'].include?(two_char)
            advance
            advance
            return { token: two_char, location: loc }
        end
        
        ch = peek
        if ch =~ /[a-zA-Z_]/
            word = ""
            while peek && peek =~ /[a-zA-Z0-9_]/
                word += advance
            end
            return { token: word, location: loc }
        end
        
        if ch == '"'
            advance
            value = ""
            while peek && peek != '"'
                if peek == '\\'
                    advance
                    next_ch = advance
                    value += next_ch == 'n' ? "\n" : next_ch == 't' ? "\t" : next_ch
                else
                    value += advance
                end
            end
            advance if peek == '"'
            return { token: "\"#{value}\"", location: loc }
        end
        
        if ch == "'"
            advance
            value = ""
            while peek && peek != "'"
                value += advance
            end
            advance if peek == "'"
            return { token: "'#{value}'", location: loc }
        end
        
        if ch =~ /\d/
            num = ""
            while peek && peek =~ /\d/
                num += advance
            end
            if peek == '.' && @pos + 1 < @input.length && @input[@pos + 1] =~ /\d/
                num += advance
                while peek && peek =~ /\d/
                    num += advance
                end
            end
            return { token: num, location: loc }
        end
        
        { token: advance.to_s, location: loc }
    end
end

class Parser
    def initialize(lexer)
        @tokens = []
        @token_idx = 0
        while (tok = lexer.next_token)
            @tokens << tok
        end
    end
    
    def current
        @tokens[@token_idx]
    end
    
    def peek(offset = 1)
        @tokens[@token_idx + offset]
    end
    
    def advance
        @token_idx += 1
    end
    
    def match(*tokens)
        current && tokens.include?(current[:token])
    end
    
    def precedence(op)
        case op
        when "||" then 1
        when "&&" then 2
        when "==", "!=" then 3
        when "<", ">", "<=", ">=" then 4
        when "+", "-" then 5
        when "*", "/", "%" then 6
        else 0
        end
    end
    
    def parse_binary(min_prec = 0)
        left = parse_unary
        while current
            prec = precedence(current[:token])
            break if prec == 0 || prec < min_prec
            
            op = current[:token]
            advance
            right = parse_binary(prec + 1)
            left = { type: "Binary", op: op, left: left, right: right }
        end
        left
    end
    
    def parse_unary
        if current && ["!", "-", "+", "~"].include?(current[:token])
            op = current[:token]
            advance
            arg = parse_unary
            return { type: "Unary", op: op, arg: arg }
        end
        parse_primary
    end
    
    def parse_primary
        return nil unless current
        
        if current[:token] =~ /^\d+(\.\d+)?$/
            val = current[:token].to_f
            advance
            return { type: "Number", value: val }
        end
        
        if current[:token].start_with?('"') && current[:token].end_with?('"')
            val = current[:token][1..-2]
            advance
            return { type: "String", string_value: val }
        end
        
        if current[:token] == "true"
            advance
            return { type: "Bool", bool_value: true }
        end
        
        if current[:token] == "false"
            advance
            return { type: "Bool", bool_value: false }
        end
        
        name = current[:token]
        advance
        
        if match(".")
            advance
            func_name = current[:token]
            advance
            if match("(")
                advance
                args = []
                args << parse_unary while !match(")")
                advance if match(",")
                advance if match(")")
                return { type: "Call", module: name, func: func_name, args: args }
            end
        end
        
        if match("(")
            advance
            args = []
            args << parse_unary while !match(")")
            advance if match(",")
            advance if match(")")
            return { type: "Call", module: "", func: name, args: args }
        end
        
        { type: "Var", name: name }
    end
    
    def parse_expr
        parse_binary(0)
    end
    
    def parse_block
        stmts = []
        while current && !match("}")
            stmts << parse_stmt
        end
        stmts
    end
    
    def parse_stmt
        return nil unless current
        
        loc = current[:location]
        
        if match("import")
            advance
            module_name = current[:token]
            advance
            advance if match("from")
            advance if current
            return { type: "Import", module_name: module_name, location: loc }
        end
        
        if match("if")
            advance
            advance if match("(")
            condition = parse_expr
            advance if match(")")
            advance if match("{")
            then_branch = parse_block
            advance if match("}")
            
            else_branch = []
            if match("else")
                advance
                if match("{")
                    advance
                    else_branch = parse_block
                    advance if match("}")
                end
            end
            
            return { type: "If", condition: condition, then_branch: then_branch, else_branch: else_branch, location: loc }
        end
        
        if match("while")
            advance
            advance if match("(")
            condition = parse_expr
            advance if match(")")
            advance if match("{")
            body = parse_block
            advance if match("}")
            return { type: "While", condition: condition, while_body: body, location: loc }
        end
        
        if ["var", "let", "const"].include?(current[:token])
            keyword = current[:token]
            advance
            var_name = current[:token]
            advance
            advance if match(":")
            var_type = parse_type_annotation(current[:token])
            advance
            
            var_val = nil
            if match("=")
                advance
                var_val = parse_expr
            end
            
            return { type: "VarDecl", var_name: var_name, var_type: var_type, var_val: var_val, 
                    mutable: keyword == "var", location: loc }
        end
        
        if match("return")
            advance
            ret_val = nil
            ret_val = parse_expr unless match("}")
            return { type: "Return", ret_val: ret_val, location: loc }
        end
        
        if match("break")
            advance
            return { type: "Break", location: loc }
        end
        
        if match("continue")
            advance
            return { type: "Continue", location: loc }
        end
        
        expr = parse_expr
        { type: "ExprStmt", stmt_expr: expr, location: loc }
    end
    
    def parse_program
        stmts = []
        while current
            stmts << parse_stmt
        end
        stmts
    end
end

class TypeChecker
    def initialize
        @var_types = {}
        @errors = []
    end
    
    def check(stmts)
        stmts.each { |stmt| check_stmt(stmt) }
        @errors
    end
    
    def check_stmt(stmt)
        return unless stmt
        
        case stmt[:type]
        when "VarDecl"
            if stmt[:var_val]
                val_type = infer_expr_type(stmt[:var_val])
                unless type_compatible(val_type, stmt[:var_type])
                    @errors << "Type mismatch: cannot assign #{val_type} to #{stmt[:var_type]}"
                end
            end
            @var_types[stmt[:var_name]] = stmt[:var_type]
        when "If"
            stmt[:then_branch].each { |s| check_stmt(s) }
            stmt[:else_branch].each { |s| check_stmt(s) }
        when "While"
            stmt[:while_body].each { |s| check_stmt(s) }
        end
    end
    
    def infer_expr_type(expr)
        return { kind: "primitive", primitive: "any" } unless expr
        
        case expr[:type]
        when "Number" then { kind: "primitive", primitive: "float" }
        when "String" then { kind: "primitive", primitive: "string" }
        when "Bool" then { kind: "primitive", primitive: "bool" }
        when "Var" then @var_types[expr[:name]] || { kind: "primitive", primitive: "any" }
        when "Binary"
            if ["==", "!=", "<", ">", "<=", ">=", "&&", "||"].include?(expr[:op])
                { kind: "primitive", primitive: "bool" }
            else
                infer_expr_type(expr[:left])
            end
        else { kind: "primitive", primitive: "any" }
        end
    end
end

class Environment
    def initialize(parent = nil)
        @vars = {}
        @mutable = {}
        @parent = parent
    end
    
    def define(name, value, mutable = false)
        @vars[name] = value
        @mutable[name] = mutable
    end
    
    def get(name)
        return @vars[name] if @vars.key?(name)
        return @parent.get(name) if @parent
        raise "Undefined variable: #{name}"
    end
    
    def set(name, value)
        if @vars.key?(name)
            raise "Cannot reassign immutable variable: #{name}" unless @mutable[name]
            @vars[name] = value
            return
        end
        @parent.set(name, value) if @parent
    end
end

class Interpreter
    def initialize
        @env = Environment.new
        @modules = {
            "io" => {
                "print" => ->(args) { puts args.first }
            },
            "math" => {
                "sqrt" => ->(args) { Math.sqrt(args.first) },
                "pow" => ->(args) { args[0] ** args[1] },
                "abs" => ->(args) { args.first.abs }
            }
        }
        @control_flow = {}
    end
    
    def run(program)
        program.each { |stmt| eval_stmt(stmt) }
    end
    
    def eval_stmt(stmt)
        return unless stmt
        
        case stmt[:type]
        when "Import"
            # Module loading
        when "VarDecl"
            val = stmt[:var_val] ? eval_expr(stmt[:var_val]) : nil
            @env.define(stmt[:var_name], val, stmt[:mutable])
        when "If"
            if is_truthy(eval_expr(stmt[:condition]))
                stmt[:then_branch].each { |s| eval_stmt(s) }
            elsif stmt[:else_branch]
                stmt[:else_branch].each { |s| eval_stmt(s) }
            end
        when "While"
            while is_truthy(eval_expr(stmt[:condition]))
                stmt[:while_body].each { |s| eval_stmt(s) }
                break if @control_flow["break"]
                @control_flow.delete("continue")
            end
            @control_flow.delete("break")
        when "Break"
            @control_flow["break"] = true
        when "Continue"
            @control_flow["continue"] = true
        when "Return"
            @control_flow["return"] = stmt[:ret_val] ? eval_expr(stmt[:ret_val]) : nil
        when "ExprStmt"
            eval_expr(stmt[:stmt_expr])
        when "Print"
            puts eval_expr(stmt[:print_expr])
        end
    end
    
    def eval_expr(expr)
        return nil unless expr
        
        case expr[:type]
        when "Var"
            @env.get(expr[:name])
        when "Number"
            expr[:value]
        when "String"
            expr[:string_value]
        when "Bool"
            expr[:bool_value]
        when "Call"
            module_name = expr[:module]
            func_name = expr[:func]
            return nil if module_name == ""
            
            mod = @modules[module_name]
            raise "Module not imported: #{module_name}" unless mod
            
            fn = mod[func_name]
            raise "Function not found: #{module_name}.#{func_name}" unless fn
            
            args = expr[:args].map { |a| eval_expr(a) }
            fn.call(args)
        when "Binary"
            eval_binary(expr)
        when "Unary"
            arg = eval_expr(expr[:arg])
            case expr[:op]
            when "-" then -arg
            when "+" then arg
            when "!" then is_truthy(arg) ? false : true
            when "~" then ~arg.to_i
            end
        when "Tuple"
            expr[:elements].map { |e| eval_expr(e) }
        end
    end
    
    def eval_binary(expr)
        l = eval_expr(expr[:left])
        r = eval_expr(expr[:right])
        
        case expr[:op]
        when "+" then l + r
        when "-" then l - r
        when "*" then l * r
        when "/" then l / r
        when "%" then l % r
        when "==" then l == r
        when "!=" then l != r
        when "<" then l < r
        when ">" then l > r
        when "<=" then l <= r
        when ">=" then l >= r
        when "&&" then is_truthy(l) && is_truthy(r)
        when "||" then is_truthy(l) || is_truthy(r)
        end
    end
    
    def is_truthy(value)
        value != nil && value != false && value != 0
    end
end

class CGenerator
    def initialize
        @lines = []
        @indent = 0
    end
    
    def generate(stmts)
        @lines << "#include <stdio.h>"
        @lines << "#include <math.h>"
        @lines << "#include <stdbool.h>"
        @lines << ""
        @lines << "int main() {"
        @indent += 1
        
        stmts.each { |stmt| emit_stmt(stmt) }
        
        @indent -= 1
        @lines << "  return 0;"
        @lines << "}"
        
        @lines.join("\n")
    end
    
    def emit_stmt(stmt)
        return unless stmt
        
        ind = "  " * @indent
        
        case stmt[:type]
        when "VarDecl"
            type_str = type_to_c(stmt[:var_type])
            init = stmt[:var_val] ? " = #{emit_expr(stmt[:var_val])}" : ""
            @lines << "#{ind}#{type_str} #{stmt[:var_name]}#{init};"
        when "If"
            cond = emit_expr(stmt[:condition])
            @lines << "#{ind}if (#{cond}) {"
            @indent += 1
            stmt[:then_branch].each { |s| emit_stmt(s) }
            @indent -= 1
            if stmt[:else_branch] && !stmt[:else_branch].empty?
                @lines << "#{ind}} else {"
                @indent += 1
                stmt[:else_branch].each { |s| emit_stmt(s) }
                @indent -= 1
            end
            @lines << "#{ind}}"
        when "While"
            cond = emit_expr(stmt[:condition])
            @lines << "#{ind}while (#{cond}) {"
            @indent += 1
            stmt[:while_body].each { |s| emit_stmt(s) }
            @indent -= 1
            @lines << "#{ind}}"
        when "Break"
            @lines << "#{ind}break;"
        when "Continue"
            @lines << "#{ind}continue;"
        when "Return"
            if stmt[:ret_val]
                @lines << "#{ind}return #{emit_expr(stmt[:ret_val])};"
            else
                @lines << "#{ind}return;"
            end
        when "Print"
            expr = stmt[:print_expr]
            if expr[:type] == "String"
                @lines << "#{ind}printf(\"%s\\n\", \"#{expr[:string_value]}\");"
            else
                @lines << "#{ind}printf(\"%d\\n\", #{emit_expr(expr)});"
            end
        when "ExprStmt"
            @lines << "#{ind}#{emit_expr(stmt[:stmt_expr])};"
        end
    end
    
    def emit_expr(expr)
        return "0" unless expr
        
        case expr[:type]
        when "Number" then expr[:value].to_s
        when "String" then "\"#{expr[:string_value]}\""
        when "Bool" then expr[:bool_value] ? "true" : "false"
        when "Var" then expr[:name]
        when "Binary"
            l = emit_expr(expr[:left])
            r = emit_expr(expr[:right])
            "(#{l} #{expr[:op]} #{r})"
        when "Unary"
            arg = emit_expr(expr[:arg])
            "#{expr[:op]}#{arg}"
        when "Call"
            args = expr[:args].map { |a| emit_expr(a) }.join(", ")
            if expr[:module] == "math"
                "#{expr[:func]}(#{args})"
            elsif expr[:module] == "io" && expr[:func] == "print"
                "printf(\"%d\\n\", #{args})"
            else
                "0"
            end
        else "0"
        end
    end
    
    def type_to_c(type)
        return "int" unless type
        return "int" unless type[:kind] == "primitive"
        
        case type[:primitive]
        when "int" then "int"
        when "float" then "float"
        when "bool" then "bool"
        when "char" then "char"
        when "string" then "char*"
        else "int"
        end
    end
end

file = ARGV[0] || "myprogram.str"

begin
    source = File.read(file)
rescue
    puts "Error: Cannot open file #{file}"
    exit 1
end

begin
    lexer = Lexer.new(source)
    parser = Parser.new(lexer)
    program = parser.parse_program
    
    checker = TypeChecker.new
    type_errors = checker.check(program)
    
    if type_errors.any?
        puts "Type errors:"
        type_errors.each { |e| puts "  #{e}" }
        exit 1
    end
    
    interpreter = Interpreter.new
    interpreter.run(program)
    
    cgen = CGenerator.new
    ccode = cgen.generate(program)
    
    File.write("out.c", ccode)
    puts "✓ C code generated: out.c"
rescue => e
    puts "Error: #{e.message}"
    exit 1
end
