// Strata Language Playground

const EXAMPLES = [
    {
        id: 'hello-world',
        title: 'Hello World',
        description: 'Basic output with print',
        code: `import io from std::io

func main() => void {
  io.print("Hello, Strata!")
}

main()`
    },
    {
        id: 'basic-types',
        title: 'Basic Types',
        description: 'Primitive types and variables',
        code: `import io from std::io

// Immutable binding
let x: int = 42
let y: float = 3.14
let name: string = "Strata"

// Constant
const PI: float = 3.14159

// Mutable variable
var count: int = 0
var count: int = count + 1

io.print(x)
io.print(y)
io.print(name)
io.print(PI)
io.print(count)`
    },
    {
        id: 'functions',
        title: 'Functions',
        description: 'Defining and calling functions',
        code: `import io from std::io

func add(a: int, b: int) => int {
  return a + b
}

func greet(name: string) => string {
  return "Hello, " + name
}

func factorial(n: int) => int {
  var result: int = 1
  for (var i: int = 1; i <= n; var i: int = i + 1) {
    var result: int = result * i
  }
  return result
}

io.print(add(10, 20))
io.print(greet("World"))
io.print(factorial(5))`
    },
    {
        id: 'control-flow',
        title: 'Control Flow',
        description: 'If/else, loops, and conditions',
        code: `import io from std::io

func isEven(n: int) => bool {
  return n % 2 == 0
}

func printNumbers(limit: int) => void {
  var i: int = 0
  while (i < limit) {
    if (isEven(i)) {
      io.print(i)
    }
    var i: int = i + 1
  }
}

printNumbers(10)`
    },
    {
        id: 'arrays',
        title: 'Arrays',
        description: 'Working with arrays and loops',
        code: `import io from std::io

// Array of integers
let numbers: [int] = [1, 2, 3, 4, 5]

// Array iteration
for (var i: int = 0; i < len(numbers); var i: int = i + 1) {
  io.print(numbers[i])
}

// Array length
io.print("Length: ")
io.print(len(numbers))`
    },
    {
        id: 'math',
        title: 'Math Module',
        description: 'Mathematical operations',
        code: `import io from std::io
import math from std::math

// Basic arithmetic
let a: float = 16.0
let b: float = 9.0

io.print("sqrt(16) = ")
io.print(math.sqrt(a))

io.print("pow(2, 8) = ")
io.print(math.pow(2.0, 8.0))

io.print("abs(-42) = ")
io.print(math.abs(-42))`
    },
    {
        id: 'string-ops',
        title: 'String Operations',
        description: 'Text manipulation',
        code: `import io from std::io
import text from std::text

let message: string = "Hello, Strata"

// Length
io.print("Length: ")
io.print(text.len(message))

// Uppercase
io.print("Upper: ")
io.print(text.upper(message))

// Concatenation
let greeting: string = message + "!"
io.print(greeting)`
    },
    {
        id: 'type-safety',
        title: 'Type Safety',
        description: 'Compile-time type checking',
        code: `import io from std::io

let x: int = 42
let y: float = 3.14

// Type annotations required
let name: string = "Type Safe"

// Type conversion
let converted: float = x as float
io.print(converted)

// Variables must match type
io.print(x)
io.print(y)
io.print(name)`
    },
    {
        id: 'immutability',
        title: 'Immutability',
        description: 'let, const, and var differences',
        code: `import io from std::io

// Immutable (let) - cannot reassign
let immutable: int = 10

// Constant (const) - compile-time constant
const MAX_SIZE: int = 100

// Mutable (var) - can reassign
var mutable: int = 5
var mutable: int = mutable + 1
var mutable: int = mutable * 2

io.print("Immutable: ")
io.print(immutable)

io.print("Max Size: ")
io.print(MAX_SIZE)

io.print("Mutable: ")
io.print(mutable)`
    },
    {
        id: 'nested-functions',
        title: 'Nested Control',
        description: 'Complex control flow',
        code: `import io from std::io

func printTable(rows: int, cols: int) => void {
  var i: int = 0
  while (i < rows) {
    var j: int = 0
    while (j < cols) {
      io.print(i * cols + j)
      var j: int = j + 1
    }
    var i: int = i + 1
  }
}

printTable(3, 3)`
    }
];

class StrataPlayground {
    constructor() {
        this.currentExample = null;
        this.executionOutput = [];
        this.setupEventListeners();
        this.loadExamples();
        this.loadDefaultExample();
    }

    setupEventListeners() {
        // Run button
        $('#runBtn').on('click', () => this.executeCode());

        // Keyboard shortcut
        $(document).on('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.executeCode();
            }
        });

        // Tab switching
        $('.tab').on('click', function() {
            const tab = $(this).data('tab');
            if (tab) {
                $('.tab').removeClass('active');
                $(this).addClass('active');
                $('.tab-content').addClass('hidden');
                $(`#${tab}Tab`).removeClass('hidden');
            }
        });

        // Example search
        $('#exampleSearch').on('input', (e) => {
            const query = e.target.value.toLowerCase();
            this.filterExamples(query);
        });

        // Example selection
        $(document).on('click', '.example-item', function() {
            const exampleId = $(this).data('example-id');
            playground.loadExample(exampleId);
        });

        // Close documentation
        $('#closeDoc').on('click', () => {
            $('#docModal').addClass('hidden');
        });
    }

    loadExamples() {
        const list = $('#examplesList');
        list.empty();

        EXAMPLES.forEach(example => {
            const item = $(`
                <div class="example-item" data-example-id="${example.id}">
                    <div class="example-item-title">${example.title}</div>
                    <div class="example-item-desc">${example.description}</div>
                </div>
            `);
            list.append(item);
        });
    }

    filterExamples(query) {
        $('.example-item').each(function() {
            const text = $(this).text().toLowerCase();
            const matches = text.includes(query);
            $(this).toggle(matches);
        });
    }

    loadDefaultExample() {
        this.loadExample('hello-world');
    }

    loadExample(exampleId) {
        const example = EXAMPLES.find(e => e.id === exampleId);
        if (!example) return;

        this.currentExample = example;

        // Update editor
        $('#codeEditor').val(example.code);

        // Update active item
        $('.example-item').removeClass('active');
        $(`.example-item[data-example-id="${exampleId}"]`).addClass('active');

        // Show editor tab
        $('.tab').removeClass('active');
        $('.tab[data-tab="editor"]').addClass('active');
        $('.tab-content').addClass('hidden');
        $('#editorTab').removeClass('hidden');

        // Clear output
        this.clearOutput();
        this.setStatus('Example loaded', 'ok');
    }

    async executeCode() {
        const code = $('#codeEditor').val();
        if (!code.trim()) {
            this.setStatus('No code to execute', 'error');
            return;
        }

        this.clearOutput();
        this.setStatus('Running...', 'ok');

        try {
            // Simulate execution with output capture
            await this.runCode(code);
            this.setStatus('Execution completed', 'ok');
        } catch (error) {
            this.addOutput(error.message, 'error');
            this.setStatus('Execution failed', 'error');
        }
    }

    async runCode(code) {
        // Parse and execute code
        // This is a simplified execution model
        
        return new Promise((resolve) => {
            // Simulate some async execution
            setTimeout(() => {
                try {
                    // Parse imports and code
                    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
                    
                    // Simple mock execution
                    // In production, this would call the actual Strata compiler
                    
                    // Extract print statements and values
                    const printRegex = /io\.print\(([^)]+)\)/g;
                    let match;
                    
                    while ((match = printRegex.exec(code)) !== null) {
                        const arg = match[1].trim();
                        
                        // Evaluate simple expressions
                        if (arg.startsWith('"') || arg.startsWith("'")) {
                            // String literal
                            this.addOutput(arg.slice(1, -1), 'success');
                        } else if (!isNaN(arg)) {
                            // Number
                            this.addOutput(arg, 'success');
                        } else if (arg === 'true' || arg === 'false') {
                            // Boolean
                            this.addOutput(arg, 'success');
                        } else {
                            // Variable or expression (mock evaluation)
                            const result = this.evaluateExpression(arg, code);
                            if (result !== undefined) {
                                this.addOutput(String(result), 'success');
                            }
                        }
                    }
                    
                    // If no output, show that
                    if (this.executionOutput.length === 0) {
                        this.addOutput('(no output)', 'success');
                    }
                    
                    resolve();
                } catch (error) {
                    throw new Error(`Compilation error: ${error.message}`);
                }
            }, 100);
        });
    }

    evaluateExpression(expr, code) {
        // Very simple expression evaluator
        // This is just for demo purposes
        
        // Look for variable assignments
        const varRegex = new RegExp(`let\\s+${expr}:\\s*\\w+\\s*=\\s*([^\\n]+)`, 'm');
        const varMatch = code.match(varRegex);
        
        if (varMatch) {
            try {
                return eval(varMatch[1].trim());
            } catch (e) {
                return undefined;
            }
        }
        
        return undefined;
    }

    addOutput(message, type = 'success') {
        const outputPanel = $('#outputPanel');
        const line = $(`<div class="output-line output-${type}">${this.escapeHtml(String(message))}</div>`);
        outputPanel.append(line);
        outputPanel.scrollTop(outputPanel[0].scrollHeight);
        this.executionOutput.push({ message, type });
    }

    clearOutput() {
        $('#outputPanel').empty();
        this.executionOutput = [];
    }

    setStatus(message, type = 'ok') {
        $('#statusMessage').text(message).removeClass('status-ok status-error').addClass(`status-${type}`);
        $('#statusTime').text(new Date().toLocaleTimeString());
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize on page load
let playground;
$(document).ready(() => {
    playground = new StrataPlayground();
    
    // Setup editor syntax highlighting
    const editor = document.getElementById('codeEditor');
    if (editor) {
        // Simple syntax highlighting for Strata
        hljs.registerLanguage('strata', () => ({
            case_insensitive: false,
            keywords: {
                keyword: 'func import let const var if else while for break continue return true false',
                type: 'int float bool char string any void'
            },
            contains: [
                hljs.QUOTE_STRING_MODE,
                hljs.C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                { className: 'number', begin: '\\b(\\d+(\\.\\d*)?|\\.\\d+)\\b' },
                { className: 'string', begin: "'", end: "'" }
            ]
        }));
    }
});
