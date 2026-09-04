import { describe, expect, it } from "vitest";
import { classifyAndFilter, type IgnoreContext } from "./apply-ignore-rules";
import type { IngestedFile } from "./ingest-files";

function ingested(path: string, overrides: Partial<IngestedFile> = {}): IngestedFile {
  return {
    path,
    file: {} as unknown as File,
    size: 100,
    isBinary: false,
    readError: false,
    ...overrides,
  };
}

function baseContext(overrides: Partial<IgnoreContext> = {}): IgnoreContext {
  return {
    respectGitignore: true,
    gitignoreContent: null,
    contextforgeignoreContent: null,
    customIgnorePatterns: [],
    forceIncludePatterns: [],
    toggles: {
      includeMarkdown: true,
      includeTests: true,
      includeConfig: true,
      includeLockFiles: false,
      excludeSourceMaps: true,
      excludeFixturesInMax: false,
    },
    limits: {
      maxFileSizeBytes: 1_000_000,
      maxTotalSourceBytes: 100_000_000,
    },
    isMaximumPreset: false,
    ...overrides,
  };
}

function includedPaths(files: ReturnType<typeof classifyAndFilter>): string[] {
  return files.filter((f) => f.included).map((f) => f.path);
}

describe("classifyAndFilter — pipeline order", () => {
  it("excludes built-in noise (node_modules, lock files, binaries) by default", () => {
    const files = [
      ingested("node_modules/left-pad/index.js"),
      ingested("package-lock.json"),
      ingested("src/logo.png", { isBinary: true }),
      ingested("src/app.ts"),
    ];
    const result = classifyAndFilter(files, baseContext());
    expect(includedPaths(result)).toEqual(["src/app.ts"]);

    const nodeModulesFile = result.find((f) => f.path.startsWith("node_modules"))!;
    expect(nodeModulesFile.exclusionReason?.code).toBe("builtin-ignore");

    const binaryFile = result.find((f) => f.path === "src/logo.png")!;
    expect(binaryFile.exclusionReason?.code).toBe("binary-detected");
  });

  it("applies .gitignore only when the respect-gitignore toggle is on", () => {
    // Use a directory that isn't already excluded by a built-in pattern, so
    // this only exercises the .gitignore toggle.
    const files = [ingested("scratch/notes.ts"), ingested("src/app.ts")];
    const ctxOn = baseContext({ gitignoreContent: "scratch/\n" });
    const ctxOff = baseContext({ gitignoreContent: "scratch/\n", respectGitignore: false });

    expect(includedPaths(classifyAndFilter(files, ctxOn))).toEqual(["src/app.ts"]);
    expect(includedPaths(classifyAndFilter(files, ctxOff)).sort()).toEqual(["scratch/notes.ts", "src/app.ts"]);
  });

  it("applies .contextforgeignore regardless of the gitignore toggle", () => {
    const files = [ingested("scratch/notes.md"), ingested("src/app.ts")];
    const ctx = baseContext({ respectGitignore: false, contextforgeignoreContent: "scratch/\n" });
    expect(includedPaths(classifyAndFilter(files, ctx))).toEqual(["src/app.ts"]);
  });

  it("excludes tests/config/markdown/lock files/source maps only when their toggle is off", () => {
    const files = [
      ingested("tests/app.test.ts"),
      ingested("package.json"),
      ingested("README.md"),
      ingested("yarn.lock"),
      ingested("dist/app.js.map"),
      ingested("src/app.ts"),
    ];
    const ctx = baseContext({
      toggles: {
        includeMarkdown: false,
        includeTests: false,
        includeConfig: false,
        includeLockFiles: false,
        excludeSourceMaps: true,
        excludeFixturesInMax: false,
      },
    });
    const result = classifyAndFilter(files, ctx);
    expect(includedPaths(result)).toEqual(["src/app.ts"]);
    expect(result.find((f) => f.path === "tests/app.test.ts")?.exclusionReason?.code).toBe("excluded-tests");
    expect(result.find((f) => f.path === "package.json")?.exclusionReason?.code).toBe("excluded-config");
    expect(result.find((f) => f.path === "README.md")?.exclusionReason?.code).toBe("excluded-markdown");
    expect(result.find((f) => f.path === "yarn.lock")?.exclusionReason?.code).toBe("excluded-lockfile");
    expect(result.find((f) => f.path === "dist/app.js.map")?.exclusionReason?.code).toBe("excluded-sourcemap");
  });

  it("lets 'Include lock files' re-include every lock file type consistently, not just package-lock.json", () => {
    // yarn.lock/Cargo.lock/poetry.lock also match the built-in "*.lock"
    // pattern; the toggle must win over that built-in default for all of
    // them, not just the lock files the built-in pattern happens to miss.
    const files = [
      ingested("yarn.lock"),
      ingested("Cargo.lock"),
      ingested("package-lock.json"),
      ingested("pnpm-lock.yaml"),
    ];
    const excluded = classifyAndFilter(files, baseContext({ toggles: { ...baseContext().toggles, includeLockFiles: false } }));
    expect(includedPaths(excluded)).toEqual([]);
    for (const meta of excluded) {
      expect(meta.exclusionReason?.code).toBe("excluded-lockfile");
    }

    const included = classifyAndFilter(files, baseContext({ toggles: { ...baseContext().toggles, includeLockFiles: true } }));
    expect(includedPaths(included).sort()).toEqual(
      ["Cargo.lock", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"].sort(),
    );
  });

  it("lets turning off source-map exclusion include a .map file that matches the built-in pattern", () => {
    const files = [ingested("dist/app.js.map")];
    const excluded = classifyAndFilter(files, baseContext({ toggles: { ...baseContext().toggles, excludeSourceMaps: true } }));
    expect(includedPaths(excluded)).toEqual([]);

    const included = classifyAndFilter(files, baseContext({ toggles: { ...baseContext().toggles, excludeSourceMaps: false } }));
    expect(includedPaths(included)).toEqual(["dist/app.js.map"]);
  });

  it("only excludes fixtures under the Maximum preset with the fixture toggle on", () => {
    const files = [ingested("fixtures/sample.json")];
    const notMax = classifyAndFilter(files, baseContext({ isMaximumPreset: false, toggles: baseContext().toggles }));
    expect(includedPaths(notMax)).toEqual(["fixtures/sample.json"]);

    const maxWithoutToggle = classifyAndFilter(
      files,
      baseContext({ isMaximumPreset: true, toggles: { ...baseContext().toggles, excludeFixturesInMax: false } }),
    );
    expect(includedPaths(maxWithoutToggle)).toEqual(["fixtures/sample.json"]);

    const maxWithToggle = classifyAndFilter(
      files,
      baseContext({ isMaximumPreset: true, toggles: { ...baseContext().toggles, excludeFixturesInMax: true } }),
    );
    expect(includedPaths(maxWithToggle)).toEqual([]);
  });

  it("lets a custom ignore pattern exclude a file no built-in rule would touch", () => {
    const files = [ingested("src/legacy/old.ts"), ingested("src/app.ts")];
    const ctx = baseContext({ customIgnorePatterns: ["src/legacy/"] });
    expect(includedPaths(classifyAndFilter(files, ctx))).toEqual(["src/app.ts"]);
  });

  it("lets force-include override an ignore-pattern exclusion but not binary detection or size limits", () => {
    const files = [
      ingested("dist/manifest.json"),
      ingested("dist/logo.png", { isBinary: true }),
      ingested("dist/huge.js", { size: 10_000 }),
    ];
    const ctx = baseContext({
      gitignoreContent: "dist/\n",
      forceIncludePatterns: ["dist/manifest.json", "dist/logo.png", "dist/huge.js"],
      limits: { maxFileSizeBytes: 1000, maxTotalSourceBytes: 100_000_000 },
    });
    const result = classifyAndFilter(files, ctx);
    expect(result.find((f) => f.path === "dist/manifest.json")?.included).toBe(true);
    expect(result.find((f) => f.path === "dist/logo.png")?.included).toBe(false);
    expect(result.find((f) => f.path === "dist/huge.js")?.included).toBe(false);
    expect(result.find((f) => f.path === "dist/huge.js")?.exclusionReason?.code).toBe("max-file-size");
  });

  it("excludes a file larger than the per-file size limit", () => {
    const files = [ingested("big.json", { size: 5000 })];
    const ctx = baseContext({ limits: { maxFileSizeBytes: 1000, maxTotalSourceBytes: 100_000_000 } });
    const result = classifyAndFilter(files, ctx);
    expect(result[0].included).toBe(false);
    expect(result[0].exclusionReason?.code).toBe("max-file-size");
  });

  it("excludes files (in path order) once the cumulative total-size budget is exceeded", () => {
    const files = [
      ingested("a.ts", { size: 400 }),
      ingested("b.ts", { size: 400 }),
      ingested("c.ts", { size: 400 }),
    ];
    const ctx = baseContext({ limits: { maxFileSizeBytes: 1_000_000, maxTotalSourceBytes: 900 } });
    const result = classifyAndFilter(files, ctx);
    // a.ts (400) then b.ts (800) fit; c.ts would push the total to 1200 > 900.
    expect(includedPaths(result)).toEqual(["a.ts", "b.ts"]);
    expect(result.find((f) => f.path === "c.ts")?.exclusionReason?.code).toBe("max-total-size");
  });

  it("marks an unreadable file excluded regardless of any other rule", () => {
    const files = [ingested("src/app.ts", { readError: true })];
    const result = classifyAndFilter(files, baseContext());
    expect(result[0].included).toBe(false);
    expect(result[0].exclusionReason?.code).toBe("unreadable");
  });
});
