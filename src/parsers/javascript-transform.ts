import type { LanguageTransformSpec } from "../worker/transform-source";

const DEBUG_CALLEES = new Set(["console.log", "console.debug", "console.trace"]);

/**
 * Shared across .js/.jsx/.mjs/.cjs/.ts/.mts/.cts/.tsx: the JavaScript,
 * TypeScript, and TSX tree-sitter grammars all use identical node type
 * names for the constructs this spec targets (verified against the
 * grammars' own type tables), so one spec covers all of them. TypeScript's
 * additional node types (interface_declaration, type_alias_declaration,
 * enum_declaration, method_signature, function_type, etc.) are never
 * matched here and are therefore always preserved as-is.
 */
export const javascriptTransformSpec: LanguageTransformSpec = {
  commentNodeTypes: ["comment", "html_comment"],
  debugCall: {
    statementNodeType: "expression_statement",
    callNodeTypes: ["call_expression"],
    calleeFieldName: "function",
    isDebugCallee: (calleeText) => DEBUG_CALLEES.has(calleeText),
  },
  functionBody: {
    functionNodeTypes: [
      "function_declaration",
      "function_expression",
      "arrow_function",
      "method_definition",
      "generator_function_declaration",
      "generator_function",
    ],
    bodyFieldName: "body",
    stub: "{ /* implementation omitted */ }",
  },
};
