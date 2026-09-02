import { describe, expect, it } from "vitest";
import { parseDiffText } from "./diff-summary";

const UNIFIED_DIFF = `diff --git a/src/lib/foo.ts b/src/lib/foo.ts
index 1111111..2222222 100644
--- a/src/lib/foo.ts
+++ b/src/lib/foo.ts
@@ -1,3 +1,4 @@
+import { bar } from "./bar";
 export function foo() {
-  return 1;
+  return bar();
 }
diff --git a/src/lib/bar.ts b/src/lib/bar.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/lib/bar.ts
@@ -0,0 +1,3 @@
+export function bar() {
+  return 2;
+}
`;

const STAT_FORMAT = ` src/lib/foo.ts | 12 +++++++-------
 src/lib/bar.ts |  3 +++
 2 files changed, 8 insertions(+), 7 deletions(-)`;

describe("parseDiffText", () => {
  it("returns an empty summary for blank input", () => {
    const summary = parseDiffText("   \n  ");
    expect(summary.format).toBe("unknown");
    expect(summary.files).toHaveLength(0);
    expect(summary.breadthWarning).toBeNull();
  });

  it("parses a unified git diff into per-file insertions/deletions", () => {
    const summary = parseDiffText(UNIFIED_DIFF);
    expect(summary.format).toBe("unified");
    expect(summary.files).toHaveLength(2);

    const foo = summary.files.find((f) => f.path === "src/lib/foo.ts");
    expect(foo).toEqual({ path: "src/lib/foo.ts", insertions: 2, deletions: 1 });

    const bar = summary.files.find((f) => f.path === "src/lib/bar.ts");
    expect(bar).toEqual({ path: "src/lib/bar.ts", insertions: 3, deletions: 0 });

    expect(summary.totals).toEqual({ files: 2, insertions: 5, deletions: 1 });
  });

  it("groups changes by directory", () => {
    const summary = parseDiffText(UNIFIED_DIFF);
    expect(summary.directories).toHaveLength(1);
    expect(summary.directories[0].dir).toBe("src/lib");
    expect(summary.directories[0].files).toBe(2);
  });

  it("falls back to --stat parsing when there's no unified diff header", () => {
    const summary = parseDiffText(STAT_FORMAT);
    expect(summary.format).toBe("stat");
    expect(summary.files.map((f) => f.path)).toEqual(["src/lib/foo.ts", "src/lib/bar.ts"]);
    expect(summary.files[1]).toEqual({ path: "src/lib/bar.ts", insertions: 3, deletions: 0 });
  });

  it("flags breadth when a change touches many directories", () => {
    const wideDiff = ["a", "b", "c", "d", "e"]
      .map(
        (dir, i) =>
          `diff --git a/${dir}/file${i}.ts b/${dir}/file${i}.ts\n--- a/${dir}/file${i}.ts\n+++ b/${dir}/file${i}.ts\n@@ -1 +1 @@\n+x\n`,
      )
      .join("");
    const summary = parseDiffText(wideDiff);
    expect(summary.directories).toHaveLength(5);
    expect(summary.breadthWarning).toMatch(/5 different directories/);
  });

  it("sorts mostChanged by total churn descending", () => {
    const diff = [
      "diff --git a/small.ts b/small.ts",
      "--- a/small.ts",
      "+++ b/small.ts",
      "@@ -1 +1 @@",
      "+x",
      "diff --git a/big.ts b/big.ts",
      "--- a/big.ts",
      "+++ b/big.ts",
      "@@ -1,3 +1,3 @@",
      "+a",
      "+b",
      "-c",
      "-d",
      "",
    ].join("\n");
    const summary = parseDiffText(diff);
    expect(summary.mostChanged[0].path).toBe("big.ts");
    expect(summary.mostChanged[1].path).toBe("small.ts");
  });
});
