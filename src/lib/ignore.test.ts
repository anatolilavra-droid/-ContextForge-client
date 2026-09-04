import { describe, expect, it } from "vitest";
import { compileIgnorePatterns, matchIgnore, parseIgnoreFileContent } from "./ignore";

function matches(pattern: string, path: string): boolean {
  return matchIgnore(path, compileIgnorePatterns([pattern])) !== null;
}

describe("parseIgnoreFileContent", () => {
  it("drops blank lines and comments", () => {
    const lines = parseIgnoreFileContent("node_modules/\n\n# a comment\n*.log\n  \n!keep.log");
    expect(lines).toEqual(["node_modules/", "*.log", "!keep.log"]);
  });

  it("handles CRLF line endings", () => {
    expect(parseIgnoreFileContent("a\r\nb\r\n")).toEqual(["a", "b"]);
  });
});

describe("glob pattern matching", () => {
  it("matches an unanchored directory pattern anywhere in the tree", () => {
    expect(matches("node_modules/", "node_modules/leftpad/index.js")).toBe(true);
    expect(matches("node_modules/", "packages/app/node_modules/leftpad/index.js")).toBe(true);
  });

  it("matches an unanchored file extension pattern anywhere", () => {
    expect(matches("*.log", "debug.log")).toBe(true);
    expect(matches("*.log", "logs/debug.log")).toBe(true);
    expect(matches("*.log", "debug.log.txt")).toBe(false);
  });

  it("anchors a pattern containing a slash to the repo root", () => {
    expect(matches("/dist", "dist/bundle.js")).toBe(true);
    expect(matches("/dist", "packages/app/dist/bundle.js")).toBe(false);
    expect(matches("src/generated", "src/generated/file.ts")).toBe(true);
    expect(matches("src/generated", "packages/src/generated/file.ts")).toBe(false);
  });

  it("does not treat '*' as crossing directory boundaries", () => {
    expect(matches("src/*.ts", "src/index.ts")).toBe(true);
    expect(matches("src/*.ts", "src/nested/index.ts")).toBe(false);
  });

  it("supports '**' as a directory-crossing wildcard", () => {
    expect(matches("src/**/fixtures", "src/a/b/fixtures/data.json")).toBe(true);
    expect(matches("src/**/fixtures", "src/fixtures/data.json")).toBe(true);
  });

  it("escapes regex-special characters in a literal filename", () => {
    expect(matches("file.name+ext", "file.name+ext")).toBe(true);
    expect(matches("file.name+ext", "fileXnameXext")).toBe(false);
  });

  it("matches an exact directory name even without a trailing slash in the compiled pattern", () => {
    // compileIgnorePatterns strips a single trailing slash before compiling
    expect(matches("build/", "build/output.js")).toBe(true);
    expect(matches("build/", "build")).toBe(true);
  });
});

describe("matchIgnore negation and last-match-wins", () => {
  it("returns the negated match so callers can re-include the path", () => {
    const compiled = compileIgnorePatterns(["*.log", "!important.log"]);
    expect(matchIgnore("debug.log", compiled)).toEqual({ pattern: "*.log", negate: false });
    expect(matchIgnore("important.log", compiled)).toEqual({ pattern: "!important.log", negate: true });
  });

  it("lets a later pattern in the same set override an earlier one", () => {
    const compiled = compileIgnorePatterns(["*.ts", "!keep.ts", "*.ts"]);
    // last pattern matching wins, so re-excluded here
    expect(matchIgnore("keep.ts", compiled)).toEqual({ pattern: "*.ts", negate: false });
  });

  it("returns null when nothing matches", () => {
    expect(matchIgnore("src/index.ts", compileIgnorePatterns(["*.log", "dist/"]))).toBeNull();
  });

  it("ignores blank and comment lines passed directly to compileIgnorePatterns", () => {
    const compiled = compileIgnorePatterns(["", "  ", "# comment", "*.log"]);
    expect(compiled).toHaveLength(1);
  });
});
