import { describe, expect, it } from "vitest";
import { classifyFile } from "./classify-files";

describe("classifyFile", () => {
  it("classifies language from the extension when the file is not binary", () => {
    expect(classifyFile("src/app.ts", false).language).toBe("typescript");
  });

  it("forces language to 'binary' when the binary flag is set, ignoring the extension", () => {
    expect(classifyFile("src/app.ts", true).language).toBe("binary");
  });

  it("aggregates config/test/lock/source-map classification alongside language", () => {
    expect(classifyFile("package.json", false)).toEqual({
      language: "json",
      isConfig: true,
      isTest: false,
      isLockFile: false,
      isSourceMap: false,
    });

    expect(classifyFile("tests/app.test.ts", false)).toMatchObject({
      language: "typescript",
      isTest: true,
    });

    expect(classifyFile("yarn.lock", false)).toMatchObject({
      isLockFile: true,
    });

    expect(classifyFile("dist/app.js.map", false)).toMatchObject({
      isSourceMap: true,
    });
  });
});
