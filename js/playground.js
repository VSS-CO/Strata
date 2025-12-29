import { runStrata } from "./strata.js";

require.config({
  paths: {
    vs: "https://unpkg.com/monaco-editor@0.45.0/min/vs"
  }
});

require(["vs/editor/editor.main"], () => {

  monaco.languages.register({ id: "strata" });

  monaco.languages.setMonarchTokensProvider("strata", {
    keywords: ["func", "import", "from", "let", "set", "create"],
    tokenizer: {
      root: [
        [/[a-z_$][\w$]*/, {
          cases: {
            "@keywords": "keyword",
            "@default": "identifier"
          }
        }],
        [/"[^"]*"/, "string"],
        [/\d+/, "number"],
      ]
    }
  });

  window.editor = monaco.editor.create(
    document.getElementById("editor"),
    {
      value:
`import io from str.io

func main {
  io.print("Hello, Strata!")
}`,
      language: "strata",
      theme: "vs-dark",
      automaticLayout: true
    }
  );

  editor.onDidChangeModelContent(() => validate(editor.getModel()));
});

function validate(model) {
  const markers = [];

  model.getLinesContent().forEach((line, i) => {
    if (line.includes("print(")) {
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: "Use io.print instead of print",
        startLineNumber: i + 1,
        startColumn: 1,
        endLineNumber: i + 1,
        endColumn: line.length + 1
      });
    }
  });

  monaco.editor.setModelMarkers(model, "strata", markers);
}

window.run = () => {
  const code = editor.getValue();
  const out = runStrata(code);
  document.getElementById("output").textContent = out;
};

