import { countTokens } from "gpt-tokenizer";

/** Local GPT-style token estimate using gpt-tokenizer (BPE, runs fully in-browser/worker). */
export function estimateGptTokens(text: string): number {
  if (!text) return 0;
  try {
    return countTokens(text);
  } catch {
    // Extremely unusual input (e.g. lone surrogate). Fall back to a rough
    // character-based estimate rather than throwing.
    return Math.ceil(text.length / 4);
  }
}

/**
 * Claude does not expose a local tokenizer, so this is a heuristic
 * approximation derived from the GPT-style count. It is always presented to
 * users as "Approximate Claude-equivalent tokens" and never as exact.
 */
export function approximateClaudeTokens(gptTokenCount: number): number {
  return Math.round(gptTokenCount * 1.07);
}

export function estimateCustomTokens(text: string, tokensPerChar: number): number {
  if (!text) return 0;
  return Math.ceil(text.length * Math.max(tokensPerChar, 0));
}
