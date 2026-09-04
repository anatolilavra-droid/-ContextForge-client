import { describe, expect, it } from "vitest";
import { createSettingsForPreset, DEFAULT_MAX_FILE_SIZE_BYTES, DEFAULT_MAX_TOTAL_SOURCE_BYTES } from "./defaults";

describe("createSettingsForPreset", () => {
  it("Safe preserves comments and function bodies (no syntax-aware transforms on)", () => {
    const s = createSettingsForPreset("safe");
    expect(s.toggles.stripComments).toBe(false);
    expect(s.toggles.stripDebugLogging).toBe(false);
    expect(s.toggles.compactJson).toBe(false);
    expect(s.toggles.replaceFunctionBodies).toBe(false);
    expect(s.toggles.normalizeWhitespace).toBe(true);
  });

  it("Balanced adds comment stripping, debug-log removal, and JSON compaction, but not body stubbing", () => {
    const s = createSettingsForPreset("balanced");
    expect(s.toggles.stripComments).toBe(true);
    expect(s.toggles.stripDebugLogging).toBe(true);
    expect(s.toggles.compactJson).toBe(true);
    expect(s.toggles.replaceFunctionBodies).toBe(false);
  });

  it("Architecture additionally enables function-body stubbing", () => {
    const s = createSettingsForPreset("architecture");
    expect(s.toggles.replaceFunctionBodies).toBe(true);
    expect(s.toggles.excludeFixturesInMax).toBe(false);
  });

  it("Maximum enables everything Architecture does, plus fixture exclusion", () => {
    const s = createSettingsForPreset("maximum");
    expect(s.toggles.stripComments).toBe(true);
    expect(s.toggles.stripDebugLogging).toBe(true);
    expect(s.toggles.compactJson).toBe(true);
    expect(s.toggles.replaceFunctionBodies).toBe(true);
    expect(s.toggles.excludeFixturesInMax).toBe(true);
  });

  it("uses documented defaults for limits/budget/ignore rules when there is no previous settings object", () => {
    const s = createSettingsForPreset("safe");
    expect(s.limits).toEqual({
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
      maxTotalSourceBytes: DEFAULT_MAX_TOTAL_SOURCE_BYTES,
    });
    expect(s.ignoreRules).toEqual({ customIgnorePatterns: [], forceIncludePatterns: [] });
    expect(s.budget.provider).toBe("gpt");
  });

  it("carries over limits/budget/ignore rules from the previous settings when switching presets", () => {
    const previous = createSettingsForPreset("safe");
    previous.limits.maxFileSizeBytes = 999;
    previous.ignoreRules.customIgnorePatterns = ["*.generated.ts"];
    previous.budget.contextWindow = 32000;

    const next = createSettingsForPreset("maximum", previous);
    expect(next.limits.maxFileSizeBytes).toBe(999);
    expect(next.ignoreRules.customIgnorePatterns).toEqual(["*.generated.ts"]);
    expect(next.budget.contextWindow).toBe(32000);
    // But the toggle set is fully re-derived from the new preset, not carried over.
    expect(next.toggles.replaceFunctionBodies).toBe(true);
  });
});
