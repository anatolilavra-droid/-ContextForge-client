import { describe, expect, it } from "vitest";
import type { RepoFileMeta, ScanStats } from "../app/app-types";
import { detectEntryPoints, scoreContextQuality } from "./context-quality";

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
    totalFiles: 10,
    eligibleFiles: 10,
    excludedFiles: 0,
    totalInputBytes: 1000,
    eligibleInputBytes: 1000,
    rawEstimatedTokens: 250,
    languages: [],
    ...overrides,
  };
}

describe("detectEntryPoints", () => {
  it("finds common entry-point filenames among included files", () => {
    const files = [
      file({ path: "src/index.ts" }),
      file({ path: "src/utils/helpers.ts" }),
      file({ path: "cmd/server/main.go" }),
    ];
    const entries = detectEntryPoints(files);
    expect(entries.map((f) => f.path)).toEqual(["src/index.ts", "cmd/server/main.go"]);
  });

  it("ignores excluded files even if the name matches", () => {
    const files = [file({ path: "src/index.ts", included: false })];
    expect(detectEntryPoints(files)).toHaveLength(0);
  });
});

describe("scoreContextQuality", () => {
  it("gives a perfect score when every signal is present", () => {
    const files = [
      file({ path: "src/index.ts", language: "typescript" }),
      file({ path: "package.json", isConfig: true }),
      file({ path: "src/index.test.ts", isTest: true }),
      file({ path: "README.md" }),
    ];
    const report = scoreContextQuality(stats({ eligibleInputBytes: 1000, totalInputBytes: 1000 }), files);
    expect(report.score).toBe(100);
    expect(report.noisePercent).toBe(0);
    expect(report.recommendations).toHaveLength(0);
  });

  it("flags high noise and missing signals with matching recommendations", () => {
    const files = [file({ path: "src/utils/helpers.ts" })];
    const report = scoreContextQuality(stats({ eligibleInputBytes: 200, totalInputBytes: 1000 }), files);
    expect(report.noisePercent).toBe(80);
    expect(report.score).toBeLessThan(100);
    const failed = report.checks.filter((c) => !c.passed).map((c) => c.id);
    expect(failed).toContain("noise");
    expect(failed).toContain("entry-points");
    expect(failed).toContain("config");
    expect(report.recommendations.length).toBe(failed.length);
  });

  it("handles a zero-byte scan without dividing by zero", () => {
    const report = scoreContextQuality(stats({ eligibleInputBytes: 0, totalInputBytes: 0 }), []);
    expect(report.noisePercent).toBe(0);
    expect(Number.isFinite(report.score)).toBe(true);
  });
});
