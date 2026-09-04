import { describe, expect, it } from "vitest";
import { chooseFence, collapseMarkdownBlankLines, markMarkdownFenceLines, stripHtmlCommentsOutsideFences } from "./markdown";

describe("chooseFence", () => {
  it("picks a plain triple backtick when content has no backticks", () => {
    expect(chooseFence("plain text")).toBe("```");
  });

  it("picks a longer fence than the longest backtick run already in the content", () => {
    expect(chooseFence("some ```js\ncode\n``` here")).toBe("````");
    expect(chooseFence("nested ````fence```` example")).toBe("`````");
  });
});

describe("markMarkdownFenceLines", () => {
  it("tags lines inside a fenced block, including the fence markers themselves", () => {
    const tagged = markMarkdownFenceLines("before\n```\ncode\n```\nafter");
    expect(tagged.map((t) => t.inFence)).toEqual([false, true, true, true, false]);
  });

  it("supports tilde fences and closing with a longer run", () => {
    const tagged = markMarkdownFenceLines("~~~\ncode\n~~~~\nafter");
    expect(tagged.map((t) => t.inFence)).toEqual([true, true, true, false]);
  });

  it("does not close a fence with a shorter run of the same character", () => {
    const tagged = markMarkdownFenceLines("````\ncode\n```\nstill in fence\n````\nafter");
    expect(tagged.map((t) => t.inFence)).toEqual([true, true, true, true, true, false]);
  });
});

describe("stripHtmlCommentsOutsideFences", () => {
  it("removes an HTML comment outside a fence", () => {
    const input = "before\n<!-- remove me -->\nafter";
    expect(stripHtmlCommentsOutsideFences(input)).toBe("before\n\nafter");
  });

  it("preserves an HTML comment inside a fenced code block", () => {
    const input = "text\n```html\n<!-- keep me -->\n```\nmore text";
    expect(stripHtmlCommentsOutsideFences(input)).toBe(input);
  });

  it("preserves a multi-line comment that spans into a fence boundary", () => {
    // A comment that starts outside a fence and ends inside one should be
    // treated conservatively and left untouched.
    const input = "<!-- start\n```\ncode\n```\nend -->\nafter";
    expect(stripHtmlCommentsOutsideFences(input)).toBe(input);
  });
});

describe("collapseMarkdownBlankLines", () => {
  it("collapses consecutive blank lines outside fences to the given maximum", () => {
    const input = "a\n\n\n\nb";
    expect(collapseMarkdownBlankLines(input, 1)).toBe("a\n\nb");
    expect(collapseMarkdownBlankLines(input, 0)).toBe("a\nb");
  });

  it("never collapses blank lines inside a fenced code block", () => {
    const input = "```\na\n\n\n\nb\n```";
    expect(collapseMarkdownBlankLines(input, 0)).toBe(input);
  });
});
