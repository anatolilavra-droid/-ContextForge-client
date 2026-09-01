// Pure arithmetic, deliberately free of any tokenizer dependency so the
// main thread's context-budget UI never has to load the (large) GPT BPE
// tables that only the worker needs for actual token counting.

export interface BudgetFitResult {
  availableTokens: number;
  usedTokens: number;
  fits: boolean;
  headroomTokens: number;
  overrunTokens: number;
}

export function computeBudgetFit(
  usedTokens: number,
  contextWindow: number,
  reservedPrompt: number,
  reservedResponse: number,
): BudgetFitResult {
  const available = Math.max(contextWindow - Math.max(reservedPrompt, 0) - Math.max(reservedResponse, 0), 0);
  const fits = usedTokens <= available;
  return {
    availableTokens: available,
    usedTokens,
    fits,
    headroomTokens: fits ? available - usedTokens : 0,
    overrunTokens: fits ? 0 : usedTokens - available,
  };
}
