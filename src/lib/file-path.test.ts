import { describe, expect, it } from "vitest";
import {
  dedupePaths,
  dirNameOf,
  extensionOf,
  fileNameOf,
  joinRootPath,
  resolveRootPrefix,
  sanitizeRelativePath,
} from "./file-path";

describe("sanitizeRelativePath", () => {
  it("normalizes backslashes and strips a leading slash", () => {
    expect(sanitizeRelativePath("src\\app\\index.ts")).toBe("src/app/index.ts");
    expect(sanitizeRelativePath("/src/app.ts")).toBe("src/app.ts");
  });

  it("drops '.' segments and resolves '..' against prior segments", () => {
    expect(sanitizeRelativePath("src/./app.ts")).toBe("src/app.ts");
    expect(sanitizeRelativePath("src/nested/../app.ts")).toBe("src/app.ts");
  });

  it("never escapes above the root via a leading '..'", () => {
    expect(sanitizeRelativePath("../../etc/passwd")).toBe("etc/passwd");
  });

  it("trims whitespace around segments", () => {
    expect(sanitizeRelativePath(" src / app.ts ")).toBe("src/app.ts");
  });
});

describe("fileNameOf / dirNameOf / extensionOf", () => {
  it("splits path and name correctly", () => {
    expect(fileNameOf("src/app/index.ts")).toBe("index.ts");
    expect(fileNameOf("index.ts")).toBe("index.ts");
    expect(dirNameOf("src/app/index.ts")).toBe("src/app");
    expect(dirNameOf("index.ts")).toBe("");
  });

  it("extracts a lowercase extension without the leading dot", () => {
    expect(extensionOf("index.TS")).toBe("ts");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
  });

  it("does not treat a leading dot (dotfile) as an extension", () => {
    expect(extensionOf(".gitignore")).toBe("");
    expect(extensionOf(".env.local")).toBe("local");
  });

  it("returns an empty extension for a file with none", () => {
    expect(extensionOf("Makefile")).toBe("");
  });
});

describe("resolveRootPrefix", () => {
  it("finds the shared wrapping folder across all paths", () => {
    const paths = ["my-repo/src/app.ts", "my-repo/.gitignore", "my-repo/src/utils/math.ts"];
    expect(resolveRootPrefix(paths)).toBe("my-repo");
  });

  it("returns an empty prefix when any path sits at the top level", () => {
    const paths = ["my-repo/src/app.ts", "README.md"];
    expect(resolveRootPrefix(paths)).toBe("");
  });

  it("finds a multi-segment common prefix", () => {
    const paths = ["a/b/c/one.ts", "a/b/c/two.ts", "a/b/c/d/three.ts"];
    expect(resolveRootPrefix(paths)).toBe("a/b/c");
  });

  it("returns an empty string for an empty input", () => {
    expect(resolveRootPrefix([])).toBe("");
  });
});

describe("joinRootPath", () => {
  it("joins a non-empty root with a name", () => {
    expect(joinRootPath("my-repo", ".gitignore")).toBe("my-repo/.gitignore");
  });

  it("returns the bare name when root is empty", () => {
    expect(joinRootPath("", ".gitignore")).toBe(".gitignore");
  });
});

describe("dedupePaths", () => {
  it("leaves unique paths untouched", () => {
    expect(dedupePaths(["a.ts", "b.ts"])).toEqual(["a.ts", "b.ts"]);
  });

  it("suffixes repeats deterministically before the extension", () => {
    expect(dedupePaths(["a.ts", "a.ts", "a.ts"])).toEqual(["a.ts", "a (1).ts", "a (2).ts"]);
  });

  it("suffixes a repeated extensionless path at the end", () => {
    expect(dedupePaths(["Makefile", "Makefile"])).toEqual(["Makefile", "Makefile (1)"]);
  });

  it("does not confuse a dot in an earlier path segment with an extension", () => {
    expect(dedupePaths(["a.b/file", "a.b/file"])).toEqual(["a.b/file", "a.b/file (1)"]);
  });
});
