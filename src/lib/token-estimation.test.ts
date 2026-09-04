import { describe, expect, it } from "vitest";
import { approximateClaudeTokens, estimateCustomTokens, estimateGptTokens } from "./token-estimation";

describe("estimateGptTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateGptTokens("")).toBe(0);
  });

  it("returns a positive, deterministic token count for real text", () => {
    const count = estimateGptTokens("The quick brown fox jumps over the lazy dog.");
    expect(count).toBeGreaterThan(0);
    expect(estimateGptTokens("The quick brown fox jumps over the lazy dog.")).toBe(count);
  });

  it("counts more tokens for longer text", () => {
    const short = estimateGptTokens("hello");
    const long = estimateGptTokens("hello ".repeat(200));
    expect(long).toBeGreaterThan(short);
  });
});

describe("approximateClaudeTokens", () => {
  it("scales the GPT count up by the documented heuristic factor", () => {
    expect(approximateClaudeTokens(100)).toBe(107);
    expect(approximateClaudeTokens(0)).toBe(0);
  });
});

describe("estimateCustomTokens", () => {
  it("returns 0 for empty text", () => {
    expect(estimateCustomTokens("", 0.5)).toBe(0);
  });

  it("multiplies character count by the given ratio and rounds up", () => {
    expect(estimateCustomTokens("abcd", 0.25)).toBe(1);
    expect(estimateCustomTokens("abc", 0.5)).toBe(2);
  });

  it("clamps a negative tokens-per-char ratio to zero", () => {
    expect(estimateCustomTokens("abc", -1)).toBe(0);
  });
});
