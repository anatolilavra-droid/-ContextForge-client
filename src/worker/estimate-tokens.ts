import { approximateClaudeTokens, estimateGptTokens } from "../lib/token-estimation";

export interface TokenCounts {
  gpt: number;
  claudeApprox: number;
}

export function tokensForText(text: string): TokenCounts {
  const gpt = estimateGptTokens(text);
  return { gpt, claudeApprox: approximateClaudeTokens(gpt) };
}

/**
 * Fast, content-free approximation used only during the scan phase (before
 * any file content has been read) so scanning stays cheap on large
 * repositories. ~4 bytes per GPT-style token is a reasonable average for
 * source code and prose; the forge pass replaces this with exact counts.
 */
export function heuristicTokenEstimate(byteSize: number): number {
  return Math.ceil(byteSize / 4);
}
