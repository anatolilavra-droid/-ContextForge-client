import type { LanguageTransformSpec } from "../worker/transform-source";

const DEBUG_MACROS = new Set(["println", "eprintln", "print", "eprint", "dbg"]);

export const rustTransformSpec: LanguageTransformSpec = {
  commentNodeTypes: ["line_comment", "block_comment"],
  debugCall: {
    statementNodeType: "expression_statement",
    callNodeTypes: ["macro_invocation"],
    calleeFieldName: "macro",
    isDebugCallee: (calleeText) => DEBUG_MACROS.has(calleeText),
  },
  functionBody: {
    // "function_signature_item" (trait method declarations without a body)
    // has no body field and is never matched here.
    functionNodeTypes: ["function_item"],
    bodyFieldName: "body",
    stub: "{ /* implementation omitted */ }",
  },
};
