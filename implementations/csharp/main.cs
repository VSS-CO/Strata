using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

public enum TypeKind {
    Primitive,
    Union,
    Interface,
    Optional
}

public class TypeDef {
    public TypeKind Kind { get; set; }
    public string Name { get; set; }
    public string Primitive { get; set; }
    public List<TypeDef> Types { get; set; } = new List<TypeDef>();
    public Dictionary<string, TypeDef> Fields { get; set; } = new Dictionary<string, TypeDef>();
}

public class Location {
    public int Line { get; set; }
    public int Column { get; set; }
    public string Source { get; set; }
}

public class TokenResult {
    public string Token { get; set; }
    public Location Location { get; set; }
}

public class Expr {
    public string Type { get; set; }
    public Location Location { get; set; }
    public string Name { get; set; }
    public double Value { get; set; }
    public string StringValue { get; set; }
    public bool BoolValue { get; set; }
    public string Module { get; set; }
    public string Func { get; set; }
    public List<Expr> Args { get; set; } = new List<Expr>();
    public string Op { get; set; }
    public Expr Left { get; set; }
    public Expr Right { get; set; }
    public Expr Arg { get; set; }
    public List<Expr> Elements { get; set; } = new List<Expr>();
}

public class Stmt {
    public string Type { get; set; }
    public Location Location { get; set; }
    public string ModuleName { get; set; }
    public string FuncName { get; set; }
    public TypeDef ReturnType { get; set; }
    public List<Stmt> Body { get; set; } = new List<Stmt>();
    public string VarName { get; set; }
    public TypeDef VarType { get; set; }
    public Expr VarVal { get; set; }
    public bool Mutable { get; set; }
    public Expr Condition { get; set; }
    public List<Stmt> ThenBranch { get; set; } = new List<Stmt>();
    public List<Stmt> ElseBranch { get; set; } = new List<Stmt>();
    public List<Stmt> WhileBody { get; set; } = new List<Stmt>();
    public Stmt Init { get; set; }
    public Expr Cond { get; set; }
    public Stmt Update { get; set; }
    public Expr RetVal { get; set; }
    public Expr PrintExpr { get; set; }
    public Expr StmtExpr { get; set; }
}

public class Lexer {
    private string input;
    private int pos;
    private int line;
    private int column;
    private int lineStart;

    public Lexer(string input) {
        this.input = input;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.lineStart = 0;
    }

    private char Peek() {
        if (pos >= input.Length) return '\0';
        return input[pos];
    }

    private char Advance() {
        char ch = Peek();
        pos++;
        if (ch == '\n') {
            line++;
            column = 1;
            lineStart = pos;
        } else {
            column++;
        }
        return ch;
    }

    private Location GetLocation() {
        return new Location {
            Line = line,
            Column = column,
            Source = input.Substring(lineStart, Math.Min(pos - lineStart, input.Length - lineStart))
        };
    }

    public TokenResult NextToken() {
        while (Peek() == ' ' || Peek() == '\n' || Peek() == '\r' || Peek() == '\t') {
            Advance();
        }

        if (Peek() == '/' && pos + 1 < input.Length && input[pos + 1] == '/') {
            while (Peek() != '\0' && Peek() != '\n') {
                Advance();
            }
            return NextToken();
        }

        if (Peek() == '\0') return null;

        Location loc = GetLocation();

        string twoChar = pos + 2 <= input.Length ? input.Substring(pos, 2) : "";
        if (new[] { "==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--" }.Contains(twoChar)) {
            Advance();
            Advance();
            return new TokenResult { Token = twoChar, Location = loc };
        }

        char ch = Peek();
        if (char.IsLetter(ch) || ch == '_') {
            string word = "";
            while (char.IsLetterOrDigit(Peek()) || Peek() == '_') {
                word += Advance();
            }
            return new TokenResult { Token = word, Location = loc };
        }

        if (ch == '"') {
            Advance();
            string value = "";
            while (Peek() != '\0' && Peek() != '"') {
                if (Peek() == '\\') {
                    Advance();
                    char next = Advance();
                    if (next == 'n') value += '\n';
                    else if (next == 't') value += '\t';
                    else value += next;
                } else {
                    value += Advance();
                }
            }
            if (Peek() == '"') Advance();
            return new TokenResult { Token = $"\"{value}\"", Location = loc };
        }

        if (ch == '\'') {
            Advance();
            string value = "";
            while (Peek() != '\0' && Peek() != '\'') {
                value += Advance();
            }
            if (Peek() == '\'') Advance();
            return new TokenResult { Token = $"'{value}'", Location = loc };
        }

        if (char.IsDigit(ch)) {
            string num = "";
            while (char.IsDigit(Peek())) {
                num += Advance();
            }
            if (Peek() == '.' && pos + 1 < input.Length && char.IsDigit(input[pos + 1])) {
                num += Advance();
                while (char.IsDigit(Peek())) {
                    num += Advance();
                }
            }
            return new TokenResult { Token = num, Location = loc };
        }

        return new TokenResult { Token = Advance().ToString(), Location = loc };
    }
}

public class Parser {
    private List<TokenResult> tokens;
    private int tokenIdx;

    public Parser(Lexer lexer) {
        tokens = new List<TokenResult>();
        tokenIdx = 0;
        TokenResult tok;
        while ((tok = lexer.NextToken()) != null) {
            tokens.Add(tok);
        }
    }

    private TokenResult Current {
        get => tokenIdx < tokens.Count ? tokens[tokenIdx] : null;
    }

    private void Advance() {
        tokenIdx++;
    }

    private bool Match(string token) {
        return Current != null && Current.Token == token;
    }

    private int Precedence(string op) {
        return op switch {
            "||" => 1,
            "&&" => 2,
            "==" or "!=" => 3,
            "<" or ">" or "<=" or ">=" => 4,
            "+" or "-" => 5,
            "*" or "/" or "%" => 6,
            _ => 0
        };
    }

    private Expr ParseBinary(int minPrec) {
        var left = ParseUnary();
        while (Current != null) {
            int prec = Precedence(Current.Token);
            if (prec == 0 || prec < minPrec) break;
            string op = Current.Token;
            Advance();
            var right = ParseBinary(prec + 1);
            var binary = new Expr {
                Type = "Binary",
                Op = op,
                Left = left,
                Right = right
            };
            left = binary;
        }
        return left;
    }

    private Expr ParseUnary() {
        if (Current != null && (Current.Token == "!" || Current.Token == "-" || Current.Token == "+" || Current.Token == "~")) {
            var expr = new Expr {
                Type = "Unary",
                Op = Current.Token
            };
            Advance();
            expr.Arg = ParseUnary();
            return expr;
        }
        return ParsePrimary();
    }

    private Expr ParsePrimary() {
        if (Current == null) return null;

        if (double.TryParse(Current.Token, out double value)) {
            Advance();
            return new Expr { Type = "Number", Value = value };
        }

        if (Current.Token.StartsWith("\"") && Current.Token.EndsWith("\"")) {
            var expr = new Expr {
                Type = "String",
                StringValue = Current.Token.Substring(1, Current.Token.Length - 2)
            };
            Advance();
            return expr;
        }

        if (Current.Token == "true") {
            Advance();
            return new Expr { Type = "Bool", BoolValue = true };
        }

        if (Current.Token == "false") {
            Advance();
            return new Expr { Type = "Bool", BoolValue = false };
        }

        var varExpr = new Expr { Type = "Var", Name = Current.Token };
        Advance();
        return varExpr;
    }

    public Expr ParseExpr() {
        return ParseBinary(0);
    }

    private List<Stmt> ParseBlock() {
        var stmts = new List<Stmt>();
        while (Current != null && !Match("}")) {
            stmts.Add(ParseStmt());
        }
        return stmts;
    }

    public Stmt ParseStmt() {
        if (Current == null) return null;

        var stmt = new Stmt();

        if (Current.Token == "import") {
            stmt.Type = "Import";
            Advance();
            stmt.ModuleName = Current.Token;
            Advance();
            if (Match("from")) {
                Advance();
                Advance();
            }
            return stmt;
        }

        if (Current.Token == "if") {
            stmt.Type = "If";
            Advance();
            Advance();
            stmt.Condition = ParseExpr();
            Advance();
            Advance();
            stmt.ThenBranch = ParseBlock();
            Advance();
            if (Match("else")) {
                Advance();
                if (Match("{")) {
                    Advance();
                    stmt.ElseBranch = ParseBlock();
                    Advance();
                }
            }
            return stmt;
        }

        if (Current.Token == "while") {
            stmt.Type = "While";
            Advance();
            Advance();
            stmt.Condition = ParseExpr();
            Advance();
            Advance();
            stmt.WhileBody = ParseBlock();
            Advance();
            return stmt;
        }

        if (Current.Token == "var" || Current.Token == "let" || Current.Token == "const") {
            stmt.Type = "VarDecl";
            string keyword = Current.Token;
            Advance();
            stmt.VarName = Current.Token;
            Advance();
            Advance();
            stmt.VarType = new TypeDef { Kind = TypeKind.Primitive, Primitive = Current.Token };
            Advance();
            if (Match("=")) {
                Advance();
                stmt.VarVal = ParseExpr();
            }
            stmt.Mutable = keyword == "var";
            return stmt;
        }

        if (Current.Token == "return") {
            stmt.Type = "Return";
            Advance();
            if (!Match("}")) {
                stmt.RetVal = ParseExpr();
            }
            return stmt;
        }

        if (Current.Token == "break") {
            stmt.Type = "Break";
            Advance();
            return stmt;
        }

        if (Current.Token == "continue") {
            stmt.Type = "Continue";
            Advance();
            return stmt;
        }

        var expr = ParseExpr();
        stmt.Type = "ExprStmt";
        stmt.StmtExpr = expr;
        return stmt;
    }

    public List<Stmt> ParseProgram() {
        var stmts = new List<Stmt>();
        while (Current != null) {
            stmts.Add(ParseStmt());
        }
        return stmts;
    }
}

public class Interpreter {
    private Dictionary<string, double> vars = new Dictionary<string, double>();
    private Dictionary<string, bool> mutableMap = new Dictionary<string, bool>();

    private double EvalBinary(Expr expr) {
        double left = EvalExpr(expr.Left);
        double right = EvalExpr(expr.Right);

        return expr.Op switch {
            "+" => left + right,
            "-" => left - right,
            "*" => left * right,
            "/" => left / right,
            "%" => (long)left % (long)right,
            "==" => left == right ? 1 : 0,
            "!=" => left != right ? 1 : 0,
            "<" => left < right ? 1 : 0,
            ">" => left > right ? 1 : 0,
            "<=" => left <= right ? 1 : 0,
            ">=" => left >= right ? 1 : 0,
            "&&" => (left != 0 && right != 0) ? 1 : 0,
            "||" => (left != 0 || right != 0) ? 1 : 0,
            _ => 0
        };
    }

    public double EvalExpr(Expr expr) {
        if (expr == null) return 0;

        return expr.Type switch {
            "Number" => expr.Value,
            "Bool" => expr.BoolValue ? 1 : 0,
            "Var" => vars.ContainsKey(expr.Name) ? vars[expr.Name] : 0,
            "Binary" => EvalBinary(expr),
            "Unary" => expr.Op switch {
                "-" => -EvalExpr(expr.Arg),
                "+" => EvalExpr(expr.Arg),
                "!" => EvalExpr(expr.Arg) == 0 ? 1 : 0,
                "~" => (double)(~(long)EvalExpr(expr.Arg)),
                _ => 0
            },
            "Call" => {
                if (expr.Module == "io" && expr.Func == "print") {
                    if (expr.Args.Count > 0) {
                        Console.WriteLine(EvalExpr(expr.Args[0]));
                    }
                }
                yield return 0;
            },
            _ => 0
        };
    }

    public void EvalStmt(Stmt stmt) {
        if (stmt == null) return;

        switch (stmt.Type) {
            case "VarDecl":
                double val = stmt.VarVal != null ? EvalExpr(stmt.VarVal) : 0;
                vars[stmt.VarName] = val;
                mutableMap[stmt.VarName] = stmt.Mutable;
                break;
            case "If":
                if (EvalExpr(stmt.Condition) != 0) {
                    foreach (var s in stmt.ThenBranch) EvalStmt(s);
                } else {
                    foreach (var s in stmt.ElseBranch) EvalStmt(s);
                }
                break;
            case "While":
                while (EvalExpr(stmt.Condition) != 0) {
                    foreach (var s in stmt.WhileBody) EvalStmt(s);
                }
                break;
            case "ExprStmt":
                EvalExpr(stmt.StmtExpr);
                break;
        }
    }

    public void Run(List<Stmt> program) {
        foreach (var stmt in program) {
            EvalStmt(stmt);
        }
    }
}

public class CGenerator {
    private List<string> lines = new List<string>();
    private int indent = 0;

    public void AddLine(string line) {
        lines.Add(line);
    }

    public string Generate(List<Stmt> stmts) {
        AddLine("#include <stdio.h>");
        AddLine("#include <math.h>");
        AddLine("#include <stdbool.h>");
        AddLine("");
        AddLine("int main() {");
        indent++;
        indent--;
        AddLine("  return 0;");
        AddLine("}");

        return string.Join("\n", lines);
    }
}

public class Program {
    public static void Main(string[] args) {
        string filename = args.Length > 0 ? args[0] : "myprogram.str";

        if (!File.Exists(filename)) {
            Console.Error.WriteLine($"Error: Cannot open file {filename}");
            Environment.Exit(1);
        }

        string source = File.ReadAllText(filename);

        var lexer = new Lexer(source);
        var parser = new Parser(lexer);
        var program = parser.ParseProgram();

        var interp = new Interpreter();
        interp.Run(program);

        var cgen = new CGenerator();
        string ccode = cgen.Generate(program);

        File.WriteAllText("out.c", ccode);
        Console.WriteLine("C code generated: out.c");
    }
}
