import type { LanguageTransformSpec } from "../worker/transform-source";

export const pythonTransformSpec: LanguageTransformSpec = {
  commentNodeTypes: ["comment"],
  debugCall: {
    statementNodeType: "expression_statement",
    callNodeTypes: ["call"],
    calleeFieldName: "function",
    isDebugCallee: (calleeText) => calleeText === "print",
  },
  functionBody: {
    functionNodeTypes: ["function_definition"],
    bodyFieldName: "body",
    stub: "pass  # implementation omitted",
  },
};
