const vscode = require('vscode');

function activate(context) {
    const keywords = ["func", "create", "type", "set", "var", "import", "from"];
    const modules = ["str.io", "str.math", "str.util", "str.time"];
    const functions = ["io.print", "math.sqrt", "math.pow", "math.random", "util.randomInt", "time.now"];

    const provider = vscode.languages.registerCompletionItemProvider(
        "strata",
        {
            provideCompletionItems(document, position) {
                const completions = [];

                keywords.forEach(word => {
                    const item = new vscode.CompletionItem(word, vscode.CompletionItemKind.Keyword);
                    completions.push(item);
                });

                modules.forEach(word => {
                    const item = new vscode.CompletionItem(word, vscode.CompletionItemKind.Module);
                    completions.push(item);
                });

                functions.forEach(word => {
                    const item = new vscode.CompletionItem(word, vscode.CompletionItemKind.Function);
                    completions.push(item);
                });

                return completions;
            }
        },
        ".", // trigger on dot for module functions
        "'"  // trigger on quote for variables
    );

    context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = { activate, deactivate };
