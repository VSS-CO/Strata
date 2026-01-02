#!/usr/bin/env lua

local TYPE_REGISTRY = {
    int = { kind = "primitive", primitive = "int" },
    float = { kind = "primitive", primitive = "float" },
    bool = { kind = "primitive", primitive = "bool" },
    char = { kind = "primitive", primitive = "char" },
    string = { kind = "primitive", primitive = "string" },
    any = { kind = "primitive", primitive = "any" }
}

local function parse_type_annotation(token)
    if TYPE_REGISTRY[token] then
        return TYPE_REGISTRY[token]
    end
    
    if string.sub(token, -1) == "?" then
        local inner = parse_type_annotation(string.sub(token, 1, -2))
        return inner or { kind = "primitive", primitive = "any" }
    end
    
    return { kind = "primitive", primitive = "any" }
end

local function type_compatible(actual, expected)
    if expected.primitive == "any" or actual.primitive == "any" then
        return true
    end
    
    if actual.kind ~= "primitive" or expected.kind ~= "primitive" then
        return false
    end
    
    if actual.primitive == expected.primitive then
        return true
    end
    if actual.primitive == "int" and expected.primitive == "float" then
        return true
    end
    if actual.primitive == "char" and expected.primitive == "string" then
        return true
    end
    
    return false
end

local Lexer = {}
Lexer.__index = Lexer

function Lexer.new(input)
    local self = setmetatable({}, Lexer)
    self.input = input
    self.pos = 1
    self.line = 1
    self.column = 1
    self.line_start = 1
    return self
end

function Lexer:peek()
    if self.pos > #self.input then return nil end
    return string.sub(self.input, self.pos, self.pos)
end

function Lexer:advance()
    local ch = self:peek()
    if not ch then return nil end
    self.pos = self.pos + 1
    if ch == "\n" then
        self.line = self.line + 1
        self.column = 1
        self.line_start = self.pos
    else
        self.column = self.column + 1
    end
    return ch
end

function Lexer:get_location()
    return {
        line = self.line,
        column = self.column,
        source = string.sub(self.input, self.line_start, self.pos - 1)
    }
end

function Lexer:next_token()
    while self:peek() and string.find(self:peek(), "[ \n\r\t]") do
        self:advance()
    end
    
    if self:peek() == "/" and self.pos + 1 <= #self.input and string.sub(self.input, self.pos + 1, self.pos + 1) == "/" then
        while self:peek() and self:peek() ~= "\n" do
            self:advance()
        end
        return self:next_token()
    end
    
    if not self:peek() then return nil end
    
    local loc = self:get_location()
    
    local two_char = string.sub(self.input, self.pos, self.pos + 1)
    if two_char == "==" or two_char == "!=" or two_char == "<=" or two_char == ">=" or
       two_char == "=>" or two_char == "||" or two_char == "&&" or two_char == "++" or two_char == "--" then
        self:advance()
        self:advance()
        return { token = two_char, location = loc }
    end
    
    local ch = self:peek()
    if ch and (string.find(ch, "[a-zA-Z_]") or ch == "_") then
        local word = ""
        while self:peek() and string.find(self:peek(), "[a-zA-Z0-9_]") do
            word = word .. self:advance()
        end
        return { token = word, location = loc }
    end
    
    if ch == '"' then
        self:advance()
        local value = ""
        while self:peek() and self:peek() ~= '"' do
            if self:peek() == "\\" then
                self:advance()
                local next = self:advance()
                if next == "n" then value = value .. "\n"
                elseif next == "t" then value = value .. "\t"
                else value = value .. next end
            else
                value = value .. self:advance()
            end
        end
        if self:peek() == '"' then self:advance() end
        return { token = '"' .. value .. '"', location = loc }
    end
    
    if ch == "'" then
        self:advance()
        local value = ""
        while self:peek() and self:peek() ~= "'" do
            value = value .. self:advance()
        end
        if self:peek() == "'" then self:advance() end
        return { token = "'" .. value .. "'", location = loc }
    end
    
    if ch and string.find(ch, "%d") then
        local num = ""
        while self:peek() and string.find(self:peek(), "%d") do
            num = num .. self:advance()
        end
        if self:peek() == "." and self.pos + 1 <= #self.input and string.find(string.sub(self.input, self.pos + 1, self.pos + 1), "%d") then
            num = num .. self:advance()
            while self:peek() and string.find(self:peek(), "%d") do
                num = num .. self:advance()
            end
        end
        return { token = num, location = loc }
    end
    
    return { token = self:advance(), location = loc }
end

local Parser = {}
Parser.__index = Parser

function Parser.new(lexer)
    local self = setmetatable({}, Parser)
    self.tokens = {}
    self.token_idx = 1
    
    while true do
        local tok = lexer:next_token()
        if not tok then break end
        table.insert(self.tokens, tok)
    end
    
    return self
end

function Parser:current()
    if self.token_idx <= #self.tokens then
        return self.tokens[self.token_idx]
    end
    return nil
end

function Parser:peek(offset)
    offset = offset or 1
    local idx = self.token_idx + offset
    if idx <= #self.tokens then
        return self.tokens[idx]
    end
    return nil
end

function Parser:advance()
    self.token_idx = self.token_idx + 1
end

function Parser:match(...)
    local cur = self:current()
    if not cur then return false end
    for _, token in ipairs({...}) do
        if cur.token == token then return true end
    end
    return false
end

function Parser:precedence(op)
    local prec = {
        ["||"] = 1,
        ["&&"] = 2,
        ["=="] = 3, ["!="] = 3,
        ["<"] = 4, [">"] = 4, ["<="] = 4, [">="] = 4,
        ["+"] = 5, ["-"] = 5,
        ["*"] = 6, ["/"] = 6, ["%"] = 6
    }
    return prec[op] or 0
end

function Parser:parse_binary(min_prec)
    min_prec = min_prec or 0
    local left = self:parse_unary()
    while self:current() do
        local prec = self:precedence(self:current().token)
        if prec == 0 or prec < min_prec then break end
        
        local op = self:current().token
        self:advance()
        local right = self:parse_binary(prec + 1)
        left = { type = "Binary", op = op, left = left, right = right }
    end
    return left
end

function Parser:parse_unary()
    if self:current() and string.find(self:current().token, "^[!+~-]$") then
        local op = self:current().token
        self:advance()
        local arg = self:parse_unary()
        return { type = "Unary", op = op, arg = arg }
    end
    return self:parse_primary()
end

function Parser:parse_primary()
    if not self:current() then return nil end
    
    local cur = self:current()
    local val = tonumber(cur.token)
    if val then
        self:advance()
        return { type = "Number", value = val }
    end
    
    if string.sub(cur.token, 1, 1) == '"' and string.sub(cur.token, -1) == '"' then
        local sval = string.sub(cur.token, 2, -2)
        self:advance()
        return { type = "String", string_value = sval }
    end
    
    if cur.token == "true" then
        self:advance()
        return { type = "Bool", bool_value = true }
    end
    
    if cur.token == "false" then
        self:advance()
        return { type = "Bool", bool_value = false }
    end
    
    local name = cur.token
    self:advance()
    
    if self:match(".") then
        self:advance()
        local func_name = self:current().token
        self:advance()
        if self:match("(") then
            self:advance()
            local args = {}
            while not self:match(")") do
                table.insert(args, self:parse_unary())
                if self:match(",") then self:advance() end
            end
            self:advance()
            return { type = "Call", module = name, func = func_name, args = args }
        end
    end
    
    if self:match("(") then
        self:advance()
        local args = {}
        while not self:match(")") do
            table.insert(args, self:parse_unary())
            if self:match(",") then self:advance() end
        end
        self:advance()
        return { type = "Call", module = "", func = name, args = args }
    end
    
    return { type = "Var", name = name }
end

function Parser:parse_expr()
    return self:parse_binary(0)
end

function Parser:parse_block()
    local stmts = {}
    while self:current() and not self:match("}") do
        table.insert(stmts, self:parse_stmt())
    end
    return stmts
end

function Parser:parse_stmt()
    if not self:current() then return nil end
    
    local loc = self:current().location
    
    if self:match("import") then
        self:advance()
        local module_name = self:current().token
        self:advance()
        if self:match("from") then
            self:advance()
            self:advance()
        end
        return { type = "Import", module_name = module_name, location = loc }
    end
    
    if self:match("if") then
        self:advance()
        if self:match("(") then self:advance() end
        local condition = self:parse_expr()
        if self:match(")") then self:advance() end
        if self:match("{") then self:advance() end
        local then_branch = self:parse_block()
        if self:match("}") then self:advance() end
        
        local else_branch = {}
        if self:match("else") then
            self:advance()
            if self:match("{") then
                self:advance()
                else_branch = self:parse_block()
                if self:match("}") then self:advance() end
            end
        end
        
        return { type = "If", condition = condition, then_branch = then_branch, 
                else_branch = else_branch, location = loc }
    end
    
    if self:match("while") then
        self:advance()
        if self:match("(") then self:advance() end
        local condition = self:parse_expr()
        if self:match(")") then self:advance() end
        if self:match("{") then self:advance() end
        local body = self:parse_block()
        if self:match("}") then self:advance() end
        return { type = "While", condition = condition, while_body = body, location = loc }
    end
    
    if self:current() and (self:match("var") or self:match("let") or self:match("const")) then
        local keyword = self:current().token
        self:advance()
        local var_name = self:current().token
        self:advance()
        if self:match(":") then self:advance() end
        local var_type = parse_type_annotation(self:current().token)
        self:advance()
        
        local var_val = nil
        if self:match("=") then
            self:advance()
            var_val = self:parse_expr()
        end
        
        return { type = "VarDecl", var_name = var_name, var_type = var_type, 
                var_val = var_val, mutable = keyword == "var", location = loc }
    end
    
    if self:match("return") then
        self:advance()
        local ret_val = nil
        if not self:match("}") then
            ret_val = self:parse_expr()
        end
        return { type = "Return", ret_val = ret_val, location = loc }
    end
    
    if self:match("break") then
        self:advance()
        return { type = "Break", location = loc }
    end
    
    if self:match("continue") then
        self:advance()
        return { type = "Continue", location = loc }
    end
    
    local expr = self:parse_expr()
    return { type = "ExprStmt", stmt_expr = expr, location = loc }
end

function Parser:parse_program()
    local stmts = {}
    while self:current() do
        table.insert(stmts, self:parse_stmt())
    end
    return stmts
end

local Interpreter = {}
Interpreter.__index = Interpreter

function Interpreter.new()
    local self = setmetatable({}, Interpreter)
    self.vars = {}
    self.mutable = {}
    self.modules = {
        io = {
            print = function(args)
                print(args[1] or "")
            end
        },
        math = {
            sqrt = function(args)
                return math.sqrt(args[1])
            end,
            pow = function(args)
                return args[1] ^ args[2]
            end,
            abs = function(args)
                return math.abs(args[1])
            end
        }
    }
    self.control_flow = {}
    return self
end

function Interpreter:eval_stmt(stmt)
    if not stmt then return end
    
    if stmt.type == "VarDecl" then
        local val = stmt.var_val and self:eval_expr(stmt.var_val) or nil
        self.vars[stmt.var_name] = val
        self.mutable[stmt.var_name] = stmt.mutable
    elseif stmt.type == "If" then
        if self:is_truthy(self:eval_expr(stmt.condition)) then
            for _, s in ipairs(stmt.then_branch) do
                self:eval_stmt(s)
            end
        elseif stmt.else_branch then
            for _, s in ipairs(stmt.else_branch) do
                self:eval_stmt(s)
            end
        end
    elseif stmt.type == "While" then
        while self:is_truthy(self:eval_expr(stmt.condition)) do
            for _, s in ipairs(stmt.while_body) do
                self:eval_stmt(s)
            end
            if self.control_flow.break then break end
            self.control_flow.continue = nil
        end
        self.control_flow.break = nil
    elseif stmt.type == "Break" then
        self.control_flow.break = true
    elseif stmt.type == "Continue" then
        self.control_flow.continue = true
    elseif stmt.type == "Return" then
        self.control_flow.return = stmt.ret_val and self:eval_expr(stmt.ret_val) or nil
    elseif stmt.type == "ExprStmt" then
        self:eval_expr(stmt.stmt_expr)
    end
end

function Interpreter:eval_expr(expr)
    if not expr then return nil end
    
    if expr.type == "Var" then
        if self.vars[expr.name] == nil then
            error("Undefined variable: " .. expr.name)
        end
        return self.vars[expr.name]
    elseif expr.type == "Number" then
        return expr.value
    elseif expr.type == "String" then
        return expr.string_value or ""
    elseif expr.type == "Bool" then
        return expr.bool_value or false
    elseif expr.type == "Call" then
        local module_name = expr.module
        local func_name = expr.func
        if module_name == "" then
            error("User-defined functions not yet implemented: " .. func_name)
        end
        
        local mod = self.modules[module_name]
        if not mod then
            error("Module not imported: " .. module_name)
        end
        
        local fn = mod[func_name]
        if not fn then
            error("Function not found: " .. module_name .. "." .. func_name)
        end
        
        local args = {}
        for _, a in ipairs(expr.args or {}) do
            table.insert(args, self:eval_expr(a))
        end
        return fn(args)
    elseif expr.type == "Binary" then
        return self:eval_binary(expr)
    elseif expr.type == "Unary" then
        local arg = self:eval_expr(expr.arg)
        if expr.op == "-" then return -arg
        elseif expr.op == "+" then return arg
        elseif expr.op == "!" then return not self:is_truthy(arg)
        elseif expr.op == "~" then return ~math.floor(arg)
        end
    end
    
    return nil
end

function Interpreter:eval_binary(expr)
    local l = self:eval_expr(expr.left)
    local r = self:eval_expr(expr.right)
    
    if expr.op == "+" then return l + r
    elseif expr.op == "-" then return l - r
    elseif expr.op == "*" then return l * r
    elseif expr.op == "/" then return l / r
    elseif expr.op == "%" then return l % r
    elseif expr.op == "==" then return l == r
    elseif expr.op == "!=" then return l ~= r
    elseif expr.op == "<" then return l < r
    elseif expr.op == ">" then return l > r
    elseif expr.op == "<=" then return l <= r
    elseif expr.op == ">=" then return l >= r
    elseif expr.op == "&&" then return self:is_truthy(l) and self:is_truthy(r)
    elseif expr.op == "||" then return self:is_truthy(l) or self:is_truthy(r)
    end
    
    return 0
end

function Interpreter:is_truthy(value)
    return value ~= nil and value ~= false and value ~= 0
end

function Interpreter:run(program)
    for _, stmt in ipairs(program) do
        self:eval_stmt(stmt)
    end
end

local CGenerator = {}
CGenerator.__index = CGenerator

function CGenerator.new()
    local self = setmetatable({}, CGenerator)
    self.lines = {}
    self.indent = 0
    return self
end

function CGenerator:generate(stmts)
    table.insert(self.lines, "#include <stdio.h>")
    table.insert(self.lines, "#include <math.h>")
    table.insert(self.lines, "#include <stdbool.h>")
    table.insert(self.lines, "")
    table.insert(self.lines, "int main() {")
    self.indent = 1
    
    for _, stmt in ipairs(stmts) do
        self:emit_stmt(stmt)
    end
    
    self.indent = 0
    table.insert(self.lines, "  return 0;")
    table.insert(self.lines, "}")
    
    return table.concat(self.lines, "\n")
end

function CGenerator:emit_stmt(stmt)
    if not stmt then return end
    
    local ind = string.rep("  ", self.indent)
    
    if stmt.type == "VarDecl" then
        local type_str = self:type_to_c(stmt.var_type)
        local init = stmt.var_val and (" = " .. self:emit_expr(stmt.var_val)) or ""
        table.insert(self.lines, ind .. type_str .. " " .. stmt.var_name .. init .. ";")
    end
end

function CGenerator:emit_expr(expr)
    if not expr then return "0" end
    
    if expr.type == "Number" then
        return tostring(expr.value)
    elseif expr.type == "String" then
        return '"' .. (expr.string_value or "") .. '"'
    elseif expr.type == "Bool" then
        return expr.bool_value and "true" or "false"
    elseif expr.type == "Var" then
        return expr.name
    elseif expr.type == "Binary" then
        local l = self:emit_expr(expr.left)
        local r = self:emit_expr(expr.right)
        return "(" .. l .. " " .. expr.op .. " " .. r .. ")"
    elseif expr.type == "Unary" then
        local arg = self:emit_expr(expr.arg)
        return expr.op .. arg
    end
    
    return "0"
end

function CGenerator:type_to_c(type_def)
    if not type_def or type_def.kind ~= "primitive" then return "int" end
    
    local type_map = {
        int = "int",
        float = "float",
        bool = "bool",
        char = "char",
        string = "char*"
    }
    return type_map[type_def.primitive] or "int"
end

local function main()
    local filename = arg[1] or "myprogram.str"
    
    local file = io.open(filename, "r")
    if not file then
        io.stderr:write("Error: Cannot open file " .. filename .. "\n")
        os.exit(1)
    end
    
    local source = file:read("*a")
    file:close()
    
    local lexer = Lexer.new(source)
    local parser = Parser.new(lexer)
    local program = parser:parse_program()
    
    local interp = Interpreter.new()
    interp:run(program)
    
    local cgen = CGenerator.new()
    local ccode = cgen:generate(program)
    
    local outfile = io.open("out.c", "w")
    outfile:write(ccode)
    outfile:close()
    
    print("C code generated: out.c")
end

main()
