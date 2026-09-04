import { describe, expect, it } from "vitest";
import {
  classifyLanguage,
  fenceLanguageTag,
  isConfigFile,
  isLockFile,
  isPrimaryOptimizedLanguage,
  isReadmeFile,
  isSourceMapFile,
  isTestOrFixturePath,
} from "./language";

describe("classifyLanguage", () => {
  it.each([
    ["src/app.tsx", "tsx"],
    ["src/app.ts", "typescript"],
    ["src/app.js", "javascript"],
    ["src/app.jsx", "javascript"],
    ["scripts/build.mjs", "javascript"],
    ["main.py", "python"],
    ["main.go", "go"],
    ["lib.rs", "rust"],
    ["README.md", "markdown"],
    ["package.json", "json"],
    ["config.jsonc", "json"],
    ["values.yaml", "yaml"],
    ["style.scss", "css"],
    ["index.html", "html"],
    ["notes.txt", "text"],
    ["Dockerfile", "unknown"],
    ["logo.png", "unknown"],
  ])("classifies %s as %s", (path, expected) => {
    expect(classifyLanguage(path)).toBe(expected);
  });
});

describe("isPrimaryOptimizedLanguage", () => {
  it("flags the languages with real transform support", () => {
    for (const lang of ["javascript", "typescript", "tsx", "python", "go", "rust", "markdown", "json"] as const) {
      expect(isPrimaryOptimizedLanguage(lang)).toBe(true);
    }
  });

  it("does not flag css/html/text/binary", () => {
    for (const lang of ["css", "html", "text", "binary", "unknown", "yaml"] as const) {
      expect(isPrimaryOptimizedLanguage(lang)).toBe(false);
    }
  });
});

describe("isConfigFile", () => {
  it.each([
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "vite.config.ts",
    "eslint.config.js",
    ".prettierrc",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "Dockerfile",
    ".env",
    ".env.local",
  ])("recognizes %s as a config file", (name) => {
    expect(isConfigFile(name)).toBe(true);
  });

  it("does not flag ordinary source files", () => {
    expect(isConfigFile("src/app.ts")).toBe(false);
    expect(isConfigFile("README.md")).toBe(false);
  });

  it("is case-insensitive on the filename", () => {
    expect(isConfigFile("DOCKERFILE")).toBe(true);
  });
});

describe("isTestOrFixturePath", () => {
  it.each([
    "src/utils/__tests__/math.ts",
    "tests/app.test.ts",
    "src/app.spec.ts",
    "spec/app_spec.rb",
    "fixtures/sample.json",
    "examples/demo.ts",
  ])("flags %s as a test/fixture path", (path) => {
    expect(isTestOrFixturePath(path)).toBe(true);
  });

  it("does not flag ordinary source paths", () => {
    expect(isTestOrFixturePath("src/utils/math.ts")).toBe(false);
    expect(isTestOrFixturePath("src/protest/loud.ts")).toBe(false);
  });
});

describe("isLockFile / isSourceMapFile / isReadmeFile", () => {
  it("recognizes common lock file names", () => {
    expect(isLockFile("package-lock.json")).toBe(true);
    expect(isLockFile("yarn.lock")).toBe(true);
    expect(isLockFile("pnpm-lock.yaml")).toBe(true);
    expect(isLockFile("Cargo.lock")).toBe(true);
    expect(isLockFile("src/app.ts")).toBe(false);
  });

  it("recognizes .map files", () => {
    expect(isSourceMapFile("dist/app.js.map")).toBe(true);
    expect(isSourceMapFile("dist/app.js")).toBe(false);
  });

  it("recognizes README variants case-insensitively", () => {
    expect(isReadmeFile("README.md")).toBe(true);
    expect(isReadmeFile("readme.txt")).toBe(true);
    expect(isReadmeFile("README")).toBe(true);
    expect(isReadmeFile("NOTREADME.md")).toBe(false);
  });
});

describe("fenceLanguageTag", () => {
  it("maps known languages to a fence tag and falls back to text", () => {
    expect(fenceLanguageTag("typescript")).toBe("typescript");
    expect(fenceLanguageTag("binary")).toBe("text");
    expect(fenceLanguageTag("unknown")).toBe("text");
  });
});
