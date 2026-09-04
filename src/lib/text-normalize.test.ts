import { describe, expect, it } from "vitest";
import { collapseBlankLines, looksBinary, normalizeLineEndings, safeNormalize, trimTrailingWhitespace } from "./text-normalize";

describe("normalizeLineEndings", () => {
  it("converts CRLF and lone CR to LF", () => {
    expect(normalizeLineEndings("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});

describe("trimTrailingWhitespace", () => {
  it("removes trailing spaces and tabs from every line, keeping leading indentation", () => {
    expect(trimTrailingWhitespace("  a  \n\tb\t\n c")).toBe("  a\n\tb\n c");
  });
});

describe("collapseBlankLines", () => {
  it("collapses runs of blank lines down to the given maximum", () => {
    expect(collapseBlankLines("a\n\n\n\nb", 1)).toBe("a\n\nb");
    expect(collapseBlankLines("a\n\n\n\nb", 2)).toBe("a\n\n\nb");
  });

  it("treats whitespace-only lines as blank", () => {
    expect(collapseBlankLines("a\n   \n\t\nb", 1)).toBe("a\n\nb");
  });

  it("treats a budget of 0 as 'no blank lines at all', for the Maximum preset", () => {
    expect(collapseBlankLines("a\n\n\nb", 0)).toBe("a\nb");
  });

  it("clamps a negative budget up to 0 rather than treating it as unlimited", () => {
    expect(collapseBlankLines("a\n\n\nb", -5)).toBe("a\nb");
  });
});

describe("safeNormalize", () => {
  it("always normalizes line endings and optionally trims trailing whitespace", () => {
    expect(safeNormalize("a  \r\nb", false)).toBe("a  \nb");
    expect(safeNormalize("a  \r\nb", true)).toBe("a\nb");
  });
});

describe("looksBinary", () => {
  it("flags any sample containing a NUL byte", () => {
    expect(looksBinary(new Uint8Array([104, 105, 0, 116, 104, 101, 114, 101]))).toBe(true);
  });

  it("does not flag plain ASCII text", () => {
    const text = "export function add(a, b) {\n  return a + b;\n}\n";
    const bytes = new TextEncoder().encode(text);
    expect(looksBinary(bytes)).toBe(false);
  });

  it("flags a sample with a high proportion of control bytes", () => {
    const bytes = new Uint8Array(100).fill(1); // all control bytes, no NUL
    expect(looksBinary(bytes)).toBe(true);
  });

  it("does not flag an empty sample", () => {
    expect(looksBinary(new Uint8Array(0))).toBe(false);
  });

  it("tolerates a small number of control bytes below the threshold", () => {
    const text = "a".repeat(100);
    const bytes = new TextEncoder().encode(text);
    bytes[0] = 1; // 1% control bytes, under the 10% threshold
    expect(looksBinary(bytes)).toBe(false);
  });
});
