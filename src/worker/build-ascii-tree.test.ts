import { describe, expect, it } from "vitest";
import type { RepoFileMeta } from "../app/app-types";
import { buildTree, renderAsciiTree } from "./build-ascii-tree";

function file(path: string, included = true): RepoFileMeta {
  return {
    id: path,
    path,
    name: path.split("/").pop() ?? path,
    dirPath: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "",
    ext: "",
    size: 10,
    language: "text",
    isConfig: false,
    isTest: false,
    isLockFile: false,
    isSourceMap: false,
    included,
    exclusionReason: null,
  };
}

describe("buildTree", () => {
  it("nests files under their directories", () => {
    const tree = buildTree([file("src/app.ts"), file("README.md")]);
    expect(tree.map((e) => e.name)).toEqual(["src", "README.md"]);
    const src = tree.find((e) => e.name === "src")!;
    expect(src.kind).toBe("dir");
    expect(src.children?.map((c) => c.name)).toEqual(["app.ts"]);
  });

  it("sorts directories before files, case-insensitively within each group", () => {
    const tree = buildTree([file("b.ts"), file("A.ts"), file("zdir/x.ts"), file("Adir/y.ts")]);
    expect(tree.map((e) => e.name)).toEqual(["Adir", "zdir", "A.ts", "b.ts"]);
  });

  it("marks a directory included if it has at least one included descendant", () => {
    const tree = buildTree([file("src/a.ts", false), file("src/b.ts", true)]);
    const src = tree.find((e) => e.name === "src")!;
    expect(src.included).toBe(true);
  });

  it("marks a directory excluded when every descendant is excluded", () => {
    const tree = buildTree([file("src/a.ts", false), file("src/b.ts", false)]);
    const src = tree.find((e) => e.name === "src")!;
    expect(src.included).toBe(false);
  });
});

describe("renderAsciiTree", () => {
  it("renders a deterministic tree with box-drawing connectors", () => {
    const tree = buildTree([file("src/app.ts"), file("README.md")]);
    const ascii = renderAsciiTree(tree, false);
    expect(ascii).toBe(["./", "├── src/", "│   └── app.ts", "└── README.md"].join("\n"));
  });

  it("filters out excluded entries and prunes directories left empty by the filter", () => {
    const tree = buildTree([file("src/a.ts", false), file("README.md", true)]);
    const ascii = renderAsciiTree(tree, true);
    expect(ascii).not.toContain("src");
    expect(ascii).toContain("README.md");
  });

  it("reports an explicit empty message when nothing is visible", () => {
    const tree = buildTree([file("src/a.ts", false)]);
    expect(renderAsciiTree(tree, true)).toBe("./ (no files)");
  });
});
