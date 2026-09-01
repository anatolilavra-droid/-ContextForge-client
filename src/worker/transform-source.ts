import type { Node, Tree } from "web-tree-sitter";
import type { FileLanguage, FileTransformWarning, ForgePresetId, ForgeToggles } from "../app/app-types";
import { collapseMarkdownBlankLines, stripHtmlCommentsOutsideFences } from "../lib/markdown";
import { collapseBlankLines, normalizeLineEndings, trimTrailingWhitespace } from "../lib/text-normalize";
import { getParserFor, getTransformSpecFor, isAstEligible } from "../parsers/parser-registry";

export interface TextEdit {
  start: number;
  end: number;
  replacement: string;
}

/**
 * Applies a set of byte-range edits to `source` in one pass. Edits that are
 * fully contained within a larger edit (e.g. a comment inside a function
 * body that is about to be stubbed) are dropped in favor of the larger one,
 * since AST node ranges only ever nest, never partially overlap.
 */
export function applyEdits(source: string, edits: TextEdit[]): string {
  if (edits.length === 0) return source;

  const sorted = [...edits].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: TextEdit[] = [];
  let lastEnd = -1;
  for (const edit of sorted) {
    if (edit.start < lastEnd) continue;
    kept.push(edit);
    lastEnd = edit.end;
  }

  let output = "";
  let cursor = 0;
  for (const edit of kept) {
    output += source.slice(cursor, edit.start);
    output += edit.replacement;
    cursor = edit.end;
  }
  output += source.slice(cursor);
  return output;
}

function nonNull<T>(nodes: (T | null)[]): T[] {
  return nodes.filter((n): n is T => n !== null);
}

export function collectCommentEdits(root: Node, commentNodeTypes: string[]): TextEdit[] {
  return nonNull(root.descendantsOfType(commentNodeTypes)).map((node) => ({
    start: node.startIndex,
    end: node.endIndex,
    replacement: "",
  }));
}

export interface DebugCallSpec {
  /** Node type that wraps a bare statement expression, e.g. "expression_statement". */
  statementNodeType: string;
  /** Node type(s) representing a function/macro call. */
  callNodeTypes: string[];
  /** Field name on the call node holding the callee/macro name. */
  calleeFieldName: string;
  isDebugCallee: (calleeText: string) => boolean;
}

/**
 * Finds calls that are the *entire* content of a statement (their direct
 * parent is the statement wrapper node) and whose callee matches a known
 * debug-logging name. A call nested in an assignment, return, condition,
 * argument list, or chain has some other parent node type and is untouched.
 */
export function collectDebugCallEdits(root: Node, spec: DebugCallSpec): TextEdit[] {
  const edits: TextEdit[] = [];
  for (const call of nonNull(root.descendantsOfType(spec.callNodeTypes))) {
    const parent = call.parent;
    if (!parent || parent.type !== spec.statementNodeType) continue;
    const callee = call.childForFieldName(spec.calleeFieldName);
    if (!callee || !spec.isDebugCallee(callee.text)) continue;
    edits.push({ start: parent.startIndex, end: parent.endIndex, replacement: "" });
  }
  return edits;
}

export interface FunctionBodySpec {
  functionNodeTypes: string[];
  bodyFieldName: string;
  stub: string;
}

/**
 * Replaces the body of every matched function-like node with an
 * implementation-omitted stub. Nodes without a body (interface/trait method
 * signatures, abstract methods, type-level function signatures) resolve
 * `childForFieldName(bodyFieldName)` to null and are left untouched.
 */
export function collectFunctionBodyEdits(root: Node, spec: FunctionBodySpec): TextEdit[] {
  const edits: TextEdit[] = [];
  for (const fn of nonNull(root.descendantsOfType(spec.functionNodeTypes))) {
    const body = fn.childForFieldName(spec.bodyFieldName);
    if (!body) continue;
    edits.push({ start: body.startIndex, end: body.endIndex, replacement: spec.stub });
  }
  return edits;
}

export interface LanguageTransformSpec {
  commentNodeTypes: string[];
  debugCall: DebugCallSpec | null;
  functionBody: FunctionBodySpec | null;
}

export interface SyntaxTransformToggles {
  stripComments: boolean;
  stripDebugLogging: boolean;
  replaceFunctionBodies: boolean;
}

export interface SyntaxTransformResult {
  output: string;
  transformationsApplied: string[];
}

export function runSyntaxAwareTransforms(
  source: string,
  tree: Tree,
  spec: LanguageTransformSpec,
  toggles: SyntaxTransformToggles,
): SyntaxTransformResult {
  const root = tree.rootNode;
  const edits: TextEdit[] = [];
  const applied: string[] = [];

  if (toggles.stripComments) {
    const commentEdits = collectCommentEdits(root, spec.commentNodeTypes);
    if (commentEdits.length > 0) {
      edits.push(...commentEdits);
      applied.push("Stripped comments");
    }
  }

  if (toggles.stripDebugLogging && spec.debugCall) {
    const debugEdits = collectDebugCallEdits(root, spec.debugCall);
    if (debugEdits.length > 0) {
      edits.push(...debugEdits);
      applied.push("Removed standalone debug logging");
    }
  }

  if (toggles.replaceFunctionBodies && spec.functionBody) {
    const bodyEdits = collectFunctionBodyEdits(root, spec.functionBody);
    if (bodyEdits.length > 0) {
      edits.push(...bodyEdits);
      applied.push("Replaced function bodies with stubs");
    }
  }

  return { output: applyEdits(source, edits), transformationsApplied: applied };
}

function blankLineBudgetFor(preset: ForgePresetId): number | null {
  if (preset === "safe") return null;
  if (preset === "maximum") return 0;
  return 1;
}

export interface FileTransformInput {
  path: string;
  language: FileLanguage;
  content: string;
  preset: ForgePresetId;
  toggles: Pick<ForgeToggles, "stripComments" | "stripDebugLogging" | "normalizeWhitespace" | "compactJson" | "replaceFunctionBodies">;
}

export interface FileTransformOutcome {
  output: string;
  transformationsApplied: string[];
  warnings: FileTransformWarning[];
}

function applyWhitespaceNormalization(
  text: string,
  language: FileLanguage,
  preset: ForgePresetId,
  applied: string[],
): string {
  let out = normalizeLineEndings(text);
  out = trimTrailingWhitespace(out);
  applied.push("Normalized line endings and trailing whitespace");

  const budget = blankLineBudgetFor(preset);
  if (budget !== null) {
    out = language === "markdown" ? collapseMarkdownBlankLines(out, budget) : collapseBlankLines(out, budget);
    applied.push(budget === 0 ? "Collapsed blank lines" : "Collapsed repeated blank lines");
  }

  return out;
}

async function transformAstEligibleFile(input: FileTransformInput, applied: string[], warnings: FileTransformWarning[]): Promise<string> {
  const needsAst = input.toggles.stripComments || input.toggles.stripDebugLogging || input.toggles.replaceFunctionBodies;
  if (!needsAst) return input.content;

  const spec = getTransformSpecFor(input.language);
  if (!spec) return input.content;

  const parser = await getParserFor(input.language);
  if (!parser) {
    warnings.push({
      code: "parser-unavailable",
      message: "Syntax-aware grammar could not be loaded; only safe normalization was applied.",
    });
    return input.content;
  }

  let tree: Tree | null = null;
  try {
    tree = parser.parse(input.content);
  } catch {
    tree = null;
  }

  if (!tree) {
    warnings.push({
      code: "parse-failed",
      message: "The file could not be parsed; only safe normalization was applied.",
    });
    return input.content;
  }

  const result = runSyntaxAwareTransforms(input.content, tree, spec, {
    stripComments: input.toggles.stripComments,
    stripDebugLogging: input.toggles.stripDebugLogging,
    replaceFunctionBodies: input.toggles.replaceFunctionBodies,
  });
  applied.push(...result.transformationsApplied);
  return result.output;
}

function transformJson(content: string, compact: boolean, applied: string[], warnings: FileTransformWarning[]): string {
  if (!compact) return content;
  try {
    const parsed: unknown = JSON.parse(content);
    applied.push("Compacted JSON");
    return JSON.stringify(parsed);
  } catch {
    warnings.push({
      code: "json-parse-failed",
      message: "JSON could not be parsed; original content was preserved (only normalized).",
    });
    return content;
  }
}

function transformMarkdown(content: string, stripComments: boolean, applied: string[]): string {
  if (!stripComments) return content;
  const stripped = stripHtmlCommentsOutsideFences(content);
  if (stripped !== content) applied.push("Stripped HTML comments outside fenced code blocks");
  return stripped;
}

/**
 * Transforms a single file's content according to the active forge
 * settings. Never throws: any parser/grammar failure falls back to safe
 * text-only normalization and is recorded as a warning, per the "never
 * silently alter source on parser failure" requirement.
 */
export async function transformFileContent(input: FileTransformInput): Promise<FileTransformOutcome> {
  const applied: string[] = [];
  const warnings: FileTransformWarning[] = [];
  let content = input.content;

  if (input.language === "json") {
    content = transformJson(content, input.toggles.compactJson, applied, warnings);
  } else if (input.language === "markdown") {
    content = transformMarkdown(content, input.toggles.stripComments, applied);
  } else if (isAstEligible(input.language)) {
    content = await transformAstEligibleFile({ ...input, content }, applied, warnings);
  }

  if (input.toggles.normalizeWhitespace) {
    content = applyWhitespaceNormalization(content, input.language, input.preset, applied);
  }

  return { output: content, transformationsApplied: applied, warnings };
}
