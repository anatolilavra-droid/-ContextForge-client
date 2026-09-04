import { describe, expect, it } from "vitest";
import type { BundleMetrics, ForgeSettings, RepoFileMeta } from "../app/app-types";
import { createSettingsForPreset } from "../lib/defaults";
import { buildMarkdownBundle } from "./build-markdown-bundle";

function file(path: string, overrides: Partial<RepoFileMeta> = {}): RepoFileMeta {
  return {
    id: path,
    path,
    name: path.split("/").pop() ?? path,
    dirPath: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "",
    ext: path.includes(".") ? path.split(".").pop()! : "",
    size: 20,
    language: "javascript",
    isConfig: false,
    isTest: false,
    isLockFile: false,
    isSourceMap: false,
    included: true,
    exclusionReason: null,
    ...overrides,
  };
}

function metrics(overrides: Partial<BundleMetrics> = {}): BundleMetrics {
  return {
    filesIncluded: 1,
    rawInputBytes: 100,
    forgedOutputBytes: 80,
    rawTokensGpt: 50,
    forgedTokensGpt: 40,
    approxClaudeTokensRaw: 54,
    approxClaudeTokensForged: 43,
    tokensSaved: 10,
    percentSaved: 20,
    bytesSaved: 20,
    percentBytesSaved: 20,
    warningsCount: 0,
    ...overrides,
  };
}

function settings(overrides: Partial<ForgeSettings> = {}): ForgeSettings {
  const base = createSettingsForPreset("balanced");
  return { ...base, ...overrides, toggles: { ...base.toggles, ...overrides.toggles } };
}

describe("buildMarkdownBundle", () => {
  it("includes the header block with counts and the preset label", () => {
    const md = buildMarkdownBundle({
      settings: settings(),
      includedFiles: [{ meta: file("app.js"), forgedContent: "code" }],
      excludedFiles: [],
      allFilesForTree: [file("app.js")],
      metrics: metrics(),
    });

    expect(md).toContain("# ContextForge Bundle");
    expect(md).toContain("> Files included: 1");
    expect(md).toContain("> Estimated GPT tokens: 40");
    expect(md).toContain("> Approximate Claude-equivalent tokens: 43");
    expect(md).toContain("> Compression: 20.0%");
    expect(md).toContain("> Profile: Balanced");
  });

  it("embeds each included file's forged content in a fenced block tagged with its language", () => {
    const md = buildMarkdownBundle({
      settings: settings(),
      includedFiles: [{ meta: file("app.js", { language: "javascript" }), forgedContent: "const x = 1;" }],
      excludedFiles: [],
      allFilesForTree: [file("app.js")],
      metrics: metrics(),
    });

    expect(md).toContain("### `app.js`");
    expect(md).toContain("```javascript\nconst x = 1;\n```");
  });

  it("uses a longer fence when the forged content already contains a backtick run", () => {
    const md = buildMarkdownBundle({
      settings: settings(),
      includedFiles: [{ meta: file("readme.md", { language: "markdown" }), forgedContent: "```js\ncode\n```" }],
      excludedFiles: [],
      allFilesForTree: [file("readme.md")],
      metrics: metrics(),
    });

    expect(md).toContain("````markdown");
  });

  it("adds a file-level metadata comment only when the toggle is on", () => {
    const withMeta = buildMarkdownBundle({
      settings: settings({ toggles: { addFileMetadata: true } as ForgeSettings["toggles"] }),
      includedFiles: [{ meta: file("app.js"), forgedContent: "code" }],
      excludedFiles: [],
      allFilesForTree: [file("app.js")],
      metrics: metrics(),
    });
    expect(withMeta).toMatch(/<!-- file: app\.js \| language: javascript \| original size: .* -->/);

    const withoutMeta = buildMarkdownBundle({
      settings: settings({ toggles: { addFileMetadata: false } as ForgeSettings["toggles"] }),
      includedFiles: [{ meta: file("app.js"), forgedContent: "code" }],
      excludedFiles: [],
      allFilesForTree: [file("app.js")],
      metrics: metrics(),
    });
    expect(withoutMeta).not.toContain("<!-- file:");
  });

  it("adds an excluded-file appendix only when the toggle is on and there are exclusions", () => {
    const excludedFile = file("node_modules/x.js", {
      included: false,
      exclusionReason: { code: "builtin-ignore", detail: 'Matches built-in ignore pattern "node_modules/".' },
    });

    const withAppendix = buildMarkdownBundle({
      settings: settings({ toggles: { showExcludedAppendix: true } as ForgeSettings["toggles"] }),
      includedFiles: [],
      excludedFiles: [excludedFile],
      allFilesForTree: [excludedFile],
      metrics: metrics({ filesIncluded: 0 }),
    });
    expect(withAppendix).toContain("## Excluded Files");
    expect(withAppendix).toContain("node_modules/x.js");

    const withoutAppendix = buildMarkdownBundle({
      settings: settings({ toggles: { showExcludedAppendix: false } as ForgeSettings["toggles"] }),
      includedFiles: [],
      excludedFiles: [excludedFile],
      allFilesForTree: [excludedFile],
      metrics: metrics({ filesIncluded: 0 }),
    });
    expect(withoutAppendix).not.toContain("## Excluded Files");
  });

  it("notes when no files matched the current settings", () => {
    const md = buildMarkdownBundle({
      settings: settings(),
      includedFiles: [],
      excludedFiles: [],
      allFilesForTree: [],
      metrics: metrics({ filesIncluded: 0 }),
    });
    expect(md).toContain("_No files matched the current settings._");
  });

  it("produces byte-identical output for the same input (deterministic)", () => {
    const input = {
      settings: settings(),
      includedFiles: [{ meta: file("app.js"), forgedContent: "code" }],
      excludedFiles: [],
      allFilesForTree: [file("app.js")],
      metrics: metrics(),
    };
    expect(buildMarkdownBundle(input)).toBe(buildMarkdownBundle(input));
  });
});
