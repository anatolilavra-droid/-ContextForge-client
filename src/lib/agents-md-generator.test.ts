import { describe, expect, it } from "vitest";
import type { RepoFileMeta, ScanStats } from "../app/app-types";
import { generateAgentsMd } from "./agents-md-generator";

function file(overrides: Partial<RepoFileMeta> & Pick<RepoFileMeta, "path">): RepoFileMeta {
  return {
    id: overrides.path,
    name: overrides.path.split("/").pop() ?? overrides.path,
    dirPath: overrides.path.includes("/") ? overrides.path.slice(0, overrides.path.lastIndexOf("/")) : "",
    ext: overrides.path.includes(".") ? overrides.path.split(".").pop()! : "",
    size: 100,
    language: "text",
    isConfig: false,
    isTest: false,
    isLockFile: false,
    isSourceMap: false,
    included: true,
    exclusionReason: null,
    ...overrides,
  };
}

function stats(overrides: Partial<ScanStats> = {}): ScanStats {
  return {
    totalFiles: 0,
    eligibleFiles: 0,
    excludedFiles: 0,
    totalInputBytes: 0,
    eligibleInputBytes: 0,
    rawEstimatedTokens: 0,
    languages: [],
    ...overrides,
  };
}

describe("generateAgentsMd", () => {
  it("lists detected languages, entry points, dirs, tests, and config from the scan", () => {
    const files = [
      file({ path: "src/index.ts", language: "typescript" }),
      file({ path: "src/lib/util.ts", language: "typescript" }),
      file({ path: "src/lib/util.test.ts", language: "typescript", isTest: true }),
      file({ path: "package.json", isConfig: true }),
    ];
    const md = generateAgentsMd(
      stats({ languages: [{ language: "typescript", files: 3, bytes: 300 }] }),
      files,
      { projectName: "Widget" },
    );

    expect(md).toContain("# Agent instructions for Widget");
    expect(md).toContain("**typescript** -- 3 files");
    expect(md).toContain("`src/index.ts`");
    expect(md).toContain("`src/`");
    expect(md).toContain("`src/lib`");
    expect(md).toContain("`package.json`");
    expect(md).not.toMatch(/TODO: no languages detected/);
  });

  it("marks every unknown section as TODO instead of guessing", () => {
    const md = generateAgentsMd(stats(), []);
    expect(md).toContain("# Agent instructions for this project");
    expect(md).toContain("TODO: no languages detected");
    expect(md).toContain("TODO: no entry point auto-detected");
    expect(md).toContain("TODO: describe the top-level layout");
    expect(md).toContain("TODO: no test directory detected");
    expect(md).toContain("TODO: no config files detected");
  });

  it("excludes files the current scan marked as not included", () => {
    const files = [file({ path: "dist/bundle.js", included: false, isConfig: true })];
    const md = generateAgentsMd(stats(), files);
    expect(md).not.toContain("dist/bundle.js");
  });
});
