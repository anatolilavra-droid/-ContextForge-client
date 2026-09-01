import type { LanguageTransformSpec } from "../worker/transform-source";

const DEBUG_CALLEES = new Set([
  "fmt.Println",
  "fmt.Printf",
  "fmt.Print",
  "log.Println",
  "log.Printf",
  "log.Print",
  "println",
  "print",
]);

export const goTransformSpec: LanguageTransformSpec = {
  commentNodeTypes: ["comment"],
  debugCall: {
    statementNodeType: "expression_statement",
    callNodeTypes: ["call_expression"],
    calleeFieldName: "function",
    isDebugCallee: (calleeText) => DEBUG_CALLEES.has(calleeText),
  },
  functionBody: {
    // "method_spec" (interface method declarations) has no body field and is
    // never matched here, so interface shapes are always preserved.
    functionNodeTypes: ["function_declaration", "method_declaration"],
    bodyFieldName: "body",
    stub: "{ /* implementation omitted */ }",
  },
};
