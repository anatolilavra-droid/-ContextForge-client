import path from "node:path";
import { fileURLToPath } from "node:url";
import { Language, Parser } from "web-tree-sitter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { goTransformSpec } from "../parsers/go-transform";
import { javascriptTransformSpec } from "../parsers/javascript-transform";
import { pythonTransformSpec } from "../parsers/python-transform";
import { rustTransformSpec } from "../parsers/rust-transform";
import { runSyntaxAwareTransforms, transformFileContent } from "./transform-source";

// These tests exercise the real tree-sitter grammars from disk directly
// (bypassing parser-registry.ts's browser-only absolute-URL loading, which
// needs an HTTP server) so the actual AST-editing logic -- the core claim
// that transforms are syntax-aware, never regex-based -- is proven against
// a genuine parse tree, not a mock.

const here = path.dirname(fileURLToPath(import.meta.url));
const grammarsDir = path.join(here, "..", "..", "public", "grammars");

let jsParser: Parser;
let tsParser: Parser;
let pyParser: Parser;
let goParser: Parser;
let rustParser: Parser;

beforeAll(async () => {
  await Parser.init();
  const [jsLang, tsLang, pyLang, goLang, rustLang] = await Promise.all([
    Language.load(path.join(grammarsDir, "tree-sitter-javascript.wasm")),
    Language.load(path.join(grammarsDir, "tree-sitter-typescript.wasm")),
    Language.load(path.join(grammarsDir, "tree-sitter-python.wasm")),
    Language.load(path.join(grammarsDir, "tree-sitter-go.wasm")),
    Language.load(path.join(grammarsDir, "tree-sitter-rust.wasm")),
  ]);
  jsParser = new Parser();
  jsParser.setLanguage(jsLang);
  tsParser = new Parser();
  tsParser.setLanguage(tsLang);
  pyParser = new Parser();
  pyParser.setLanguage(pyLang);
  goParser = new Parser();
  goParser.setLanguage(goLang);
  rustParser = new Parser();
  rustParser.setLanguage(rustLang);
});

afterAll(() => {
  jsParser?.delete();
  tsParser?.delete();
  pyParser?.delete();
  goParser?.delete();
  rustParser?.delete();
});

const allOn = { stripComments: true, stripDebugLogging: true, replaceFunctionBodies: true };

describe("JavaScript/TypeScript transform spec", () => {
  it("strips comments without touching string/regex content that looks like a comment", () => {
    const source = ['// leading comment', 'const url = "http://example.com"; // trailing', 'const re = /\\/\\//;'].join(
      "\n",
    );
    const tree = jsParser.parse(source)!;
    const { output, transformationsApplied } = runSyntaxAwareTransforms(source, tree, javascriptTransformSpec, {
      stripComments: true,
      stripDebugLogging: false,
      replaceFunctionBodies: false,
    });
    expect(transformationsApplied).toContain("Stripped comments");
    expect(output).toContain('const url = "http://example.com";');
    expect(output).toContain("const re = /\\/\\//;");
    expect(output).not.toContain("leading comment");
    expect(output).not.toContain("trailing");
  });

  it("removes a standalone console.log statement but keeps console.log used as a value", () => {
    const source = [
      "function f(a, b) {",
      '  console.log("debug", a, b);',
      "  const x = console.log(a) || a;",
      "  if (console.log(b)) {}",
      "  return a + b;",
      "}",
    ].join("\n");
    const tree = jsParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, javascriptTransformSpec, {
      stripComments: false,
      stripDebugLogging: true,
      replaceFunctionBodies: false,
    });
    expect(output).not.toContain('console.log("debug", a, b);');
    // console.log calls that are part of an expression must survive untouched.
    expect(output).toContain("const x = console.log(a) || a;");
    expect(output).toContain("if (console.log(b)) {}");
    expect(output).toContain("return a + b;");
  });

  it("does not remove console.warn/error, only the configured debug names", () => {
    const source = 'function f() {\n  console.error("bad");\n  console.warn("careful");\n}';
    const tree = jsParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, javascriptTransformSpec, {
      stripComments: false,
      stripDebugLogging: true,
      replaceFunctionBodies: false,
    });
    expect(output).toContain('console.error("bad");');
    expect(output).toContain('console.warn("careful");');
  });

  it("replaces function/method/arrow bodies with a stub while keeping signatures intact", () => {
    const source = [
      "export function add(a: number, b: number): number {",
      "  return a + b;",
      "}",
      "",
      "export const multiply = (a: number, b: number): number => {",
      "  return a * b;",
      "};",
      "",
      "class Calc {",
      "  total(a: number): number {",
      "    return a;",
      "  }",
      "}",
    ].join("\n");
    // Type annotations are TypeScript-only syntax; parse with the TS grammar,
    // matching how the app selects a grammar per file extension.
    const tree = tsParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, javascriptTransformSpec, {
      stripComments: false,
      stripDebugLogging: false,
      replaceFunctionBodies: true,
    });
    expect(output).toContain("export function add(a: number, b: number): number {");
    expect(output).not.toContain("return a + b;");
    expect(output).toContain("implementation omitted");
    expect(output).toContain("export const multiply = (a: number, b: number): number =>");
    expect(output).toContain("class Calc {");
  });

  it("never touches a bodyless interface method signature or a type alias", () => {
    const source = [
      "interface Widget {",
      "  render(): string;",
      "}",
      "type Handler = (event: string) => void;",
    ].join("\n");
    const tree = tsParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, javascriptTransformSpec, allOn);
    expect(output).toBe(source);
  });
});

describe("Python transform spec", () => {
  it("removes a standalone print() but keeps print() used inside an expression", () => {
    const source = [
      "def f(a, b):",
      '    print("debug", a, b)',
      "    x = print(a) or a",
      "    return a + b",
    ].join("\n");
    const tree = pyParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, pythonTransformSpec, {
      stripComments: false,
      stripDebugLogging: true,
      replaceFunctionBodies: false,
    });
    expect(output).not.toContain('print("debug", a, b)');
    expect(output).toContain("x = print(a) or a");
    expect(output).toContain("return a + b");
  });

  it("replaces a function body with 'pass # implementation omitted' at the original indentation", () => {
    const source = ["def add(a, b):", "    total = a + b", "    return total"].join("\n");
    const tree = pyParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, pythonTransformSpec, {
      stripComments: false,
      stripDebugLogging: false,
      replaceFunctionBodies: true,
    });
    expect(output).toBe("def add(a, b):\n    pass  # implementation omitted");
  });

  it("strips a '#' comment without touching a string that contains '#'", () => {
    const source = ['x = "a # b"  # real comment'].join("\n");
    const tree = pyParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, pythonTransformSpec, {
      stripComments: true,
      stripDebugLogging: false,
      replaceFunctionBodies: false,
    });
    expect(output).toContain('x = "a # b"');
    expect(output).not.toContain("real comment");
  });
});

describe("Go transform spec", () => {
  it("removes a standalone fmt.Println call but keeps one used as a value", () => {
    const source = [
      "package main",
      "func f(a int) int {",
      '\tfmt.Println("debug", a)',
      "\tx := fmt.Sprintf(\"%d\", a)",
      "\treturn a",
      "}",
    ].join("\n");
    const tree = goParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, goTransformSpec, {
      stripComments: false,
      stripDebugLogging: true,
      replaceFunctionBodies: false,
    });
    expect(output).not.toContain('fmt.Println("debug", a)');
    expect(output).toContain('x := fmt.Sprintf("%d", a)');
  });

  it("replaces a function body but never touches an interface method spec", () => {
    const source = [
      "package main",
      "type Widget interface {",
      "\tRender() string",
      "}",
      "func NewWidget() *Widget {",
      "\treturn nil",
      "}",
    ].join("\n");
    const tree = goParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, goTransformSpec, {
      stripComments: false,
      stripDebugLogging: false,
      replaceFunctionBodies: true,
    });
    expect(output).toContain("Render() string");
    expect(output).toContain("implementation omitted");
    expect(output).not.toContain("return nil");
  });
});

describe("Rust transform spec", () => {
  it("removes a standalone println! but keeps one bound to a let", () => {
    const source = ["fn f(a: i32) -> i32 {", '    println!("debug {}", a);', "    let x = a;", "    x", "}"].join(
      "\n",
    );
    const tree = rustParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, rustTransformSpec, {
      stripComments: false,
      stripDebugLogging: true,
      replaceFunctionBodies: false,
    });
    expect(output).not.toContain('println!("debug {}", a);');
    expect(output).toContain("let x = a;");
  });

  it("replaces a function body but never touches a trait's bodyless method signature", () => {
    const source = ["trait Shape {", "    fn area(&self) -> f64;", "}", "fn f() -> i32 {", "    1", "}"].join("\n");
    const tree = rustParser.parse(source)!;
    const { output } = runSyntaxAwareTransforms(source, tree, rustTransformSpec, {
      stripComments: false,
      stripDebugLogging: false,
      replaceFunctionBodies: true,
    });
    expect(output).toContain("fn area(&self) -> f64;");
    expect(output).toContain("implementation omitted");
  });
});

// The AST-eligible branch of transformFileContent (JS/TS/Python/Go/Rust) is
// exercised via runSyntaxAwareTransforms above; parser-registry.ts loads
// grammars from an absolute browser URL that has no meaning under Node, so
// it isn't exercised end-to-end here. The JSON/Markdown/whitespace paths
// below don't touch tree-sitter at all and are tested directly.
describe("transformFileContent — JSON, Markdown, and whitespace paths", () => {
  const noopToggles = {
    stripComments: false,
    stripDebugLogging: false,
    normalizeWhitespace: false,
    compactJson: false,
    replaceFunctionBodies: false,
  };

  it("compacts valid JSON without sorting or reordering keys", async () => {
    const result = await transformFileContent({
      path: "package.json",
      language: "json",
      content: '{\n  "b": 1,\n  "a": 2\n}\n',
      preset: "balanced",
      toggles: { ...noopToggles, compactJson: true },
    });
    expect(result.output).toBe('{"b":1,"a":2}');
    expect(result.transformationsApplied).toContain("Compacted JSON");
    expect(result.warnings).toEqual([]);
  });

  it("leaves invalid JSON content untouched and records a warning instead of throwing", async () => {
    const result = await transformFileContent({
      path: "broken.json",
      language: "json",
      content: "{ not valid json",
      preset: "balanced",
      toggles: { ...noopToggles, compactJson: true },
    });
    expect(result.output).toBe("{ not valid json");
    expect(result.warnings.map((w) => w.code)).toContain("json-parse-failed");
  });

  it("does not compact JSON when the toggle is off", async () => {
    const result = await transformFileContent({
      path: "package.json",
      language: "json",
      content: '{\n  "a": 1\n}',
      preset: "balanced",
      toggles: noopToggles,
    });
    expect(result.output).toBe('{\n  "a": 1\n}');
  });

  it("strips HTML comments in Markdown but keeps fenced code blocks intact", async () => {
    const content = ["# Title", "<!-- internal note -->", "```js", "// not a real comment tag", "```"].join("\n");
    const result = await transformFileContent({
      path: "README.md",
      language: "markdown",
      content,
      preset: "balanced",
      toggles: { ...noopToggles, stripComments: true },
    });
    expect(result.output).not.toContain("internal note");
    expect(result.output).toContain("// not a real comment tag");
  });

  it("normalizes line endings and trims trailing whitespace when the toggle is on", async () => {
    const result = await transformFileContent({
      path: "notes.txt",
      language: "text",
      content: "a  \r\nb\t\r\n",
      preset: "safe",
      toggles: { ...noopToggles, normalizeWhitespace: true },
    });
    // Line endings are normalized and trailing whitespace trimmed per line;
    // the source's own trailing blank line is preserved as-is.
    expect(result.output).toBe("a\nb\n");
  });

  it("collapses blank lines according to the preset's budget, and not at all under Safe", async () => {
    const content = "a\n\n\n\nb";
    const safe = await transformFileContent({
      path: "a.ts",
      language: "text",
      content,
      preset: "safe",
      toggles: { ...noopToggles, normalizeWhitespace: true },
    });
    expect(safe.output).toBe(content);

    const balanced = await transformFileContent({
      path: "a.ts",
      language: "text",
      content,
      preset: "balanced",
      toggles: { ...noopToggles, normalizeWhitespace: true },
    });
    expect(balanced.output).toBe("a\n\nb");

    const maximum = await transformFileContent({
      path: "a.ts",
      language: "text",
      content,
      preset: "maximum",
      toggles: { ...noopToggles, normalizeWhitespace: true },
    });
    expect(maximum.output).toBe("a\nb");
  });

  it("leaves content completely untouched when every toggle is off", async () => {
    const content = '{\n  "a":   1\n}\n\n\n\nextra';
    const result = await transformFileContent({
      path: "weird.json",
      language: "json",
      content,
      preset: "balanced",
      toggles: noopToggles,
    });
    expect(result.output).toBe(content);
    expect(result.transformationsApplied).toEqual([]);
  });
});
