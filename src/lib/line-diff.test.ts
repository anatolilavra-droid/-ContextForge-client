import { describe, expect, it } from "vitest";
import { diffLineStats } from "./line-diff";

describe("diffLineStats — exact diff", () => {
  it("reports everything unchanged for identical input", () => {
    const text = "a\nb\nc";
    expect(diffLineStats(text, text)).toEqual({ added: 0, removed: 0, unchanged: 3, approximate: false });
  });

  it("counts a pure addition", () => {
    expect(diffLineStats("a\nb", "a\nb\nc")).toEqual({ added: 1, removed: 0, unchanged: 2, approximate: false });
  });

  it("counts a pure removal", () => {
    expect(diffLineStats("a\nb\nc", "a\nc")).toEqual({ added: 0, removed: 1, unchanged: 2, approximate: false });
  });

  it("counts a single-line change as one removal and one addition, not a full rewrite", () => {
    const original = "function add(a, b) {\n  // adds two numbers\n  return a + b;\n}";
    const forged = "function add(a, b) {\n  return a + b;\n}";
    const result = diffLineStats(original, forged);
    expect(result).toEqual({ added: 0, removed: 1, unchanged: 3, approximate: false });
  });

  it("finds the longest common subsequence rather than just counting length differences", () => {
    // Only the middle line changes; the surrounding context should register as unchanged.
    const original = ["line1", "line2", "line3", "line4", "line5"].join("\n");
    const forged = ["line1", "line2", "CHANGED", "line4", "line5"].join("\n");
    expect(diffLineStats(original, forged)).toEqual({ added: 1, removed: 1, unchanged: 4, approximate: false });
  });

  it("treats an empty string as zero lines, not one blank line", () => {
    expect(diffLineStats("", "")).toEqual({ added: 0, removed: 0, unchanged: 0, approximate: false });
  });
});

describe("diffLineStats — large-input fallback", () => {
  it("falls back to the approximate diff above the exact-diff size cap and flags it", () => {
    const big = Array.from({ length: 3000 }, (_, i) => `line-${i}`).join("\n");
    const bigWithChange = big.replace("line-1500", "line-CHANGED");
    // 3000 * 3000 = 9,000,000 > MAX_DIFF_CELLS, forcing the approximation.
    const result = diffLineStats(big, bigWithChange);
    expect(result.approximate).toBe(true);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
  });
});
