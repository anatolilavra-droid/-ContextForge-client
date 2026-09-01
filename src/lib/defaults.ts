import type { ForgePresetId, ForgeSettings } from "../app/app-types";

export const BUILTIN_IGNORE_PATTERNS: string[] = [
  ".git/",
  ".svn/",
  ".hg/",
  "node_modules/",
  "vendor/",
  "dist/",
  "build/",
  "coverage/",
  ".next/",
  ".nuxt/",
  "out/",
  ".target/",
  ".cache/",
  ".vite/",
  ".turbo/",
  ".vercel/",
  ".DS_Store",
  "Thumbs.db",
  "*.lock",
  "*.map",
  "*.min.js",
  "*.min.css",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.webp",
  "*.svg",
  "*.ico",
  "*.pdf",
  "*.zip",
  "*.tar",
  "*.gz",
  "*.rar",
  "*.7z",
  "*.mp3",
  "*.wav",
  "*.mp4",
  "*.mov",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.otf",
];

export const DEFAULT_MAX_FILE_SIZE_BYTES = 512 * 1024;
export const DEFAULT_MAX_TOTAL_SOURCE_BYTES = 24 * 1024 * 1024;

export const PRESET_LABELS: Record<ForgePresetId, string> = {
  safe: "Safe",
  balanced: "Balanced",
  architecture: "Architecture",
  maximum: "Maximum compression",
};

export const PRESET_DESCRIPTIONS: Record<ForgePresetId, string> = {
  safe: "Ignore rules only. Normalizes line endings and trims trailing whitespace. Comments and function bodies are preserved.",
  balanced:
    "Safe, plus syntax-aware comment stripping, standalone debug-log removal, JSON compaction, and blank-line collapsing.",
  architecture:
    "Balanced, plus function and method bodies are replaced with implementation-omitted stubs. Public API shape is preserved.",
  maximum:
    "Architecture, plus aggressive blank-line compaction and optional exclusion of test fixtures. Implementation detail is intentionally removed.",
};

function presetToggles(preset: ForgePresetId): ForgeSettings["toggles"] {
  const base: ForgeSettings["toggles"] = {
    respectGitignore: true,
    stripComments: false,
    stripDebugLogging: false,
    normalizeWhitespace: true,
    compactJson: false,
    replaceFunctionBodies: false,
    includeMarkdown: true,
    includeTests: true,
    includeConfig: true,
    includeLockFiles: false,
    addFileMetadata: true,
    showExcludedAppendix: true,
    excludeSourceMaps: true,
    excludeFixturesInMax: false,
  };

  if (preset === "safe") {
    return base;
  }

  if (preset === "balanced") {
    return { ...base, stripComments: true, stripDebugLogging: true, compactJson: true };
  }

  if (preset === "architecture") {
    return {
      ...base,
      stripComments: true,
      stripDebugLogging: true,
      compactJson: true,
      replaceFunctionBodies: true,
    };
  }

  return {
    ...base,
    stripComments: true,
    stripDebugLogging: true,
    compactJson: true,
    replaceFunctionBodies: true,
    excludeFixturesInMax: true,
  };
}

export function createSettingsForPreset(preset: ForgePresetId, previous?: ForgeSettings): ForgeSettings {
  return {
    preset,
    toggles: presetToggles(preset),
    limits: previous?.limits ?? {
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
      maxTotalSourceBytes: DEFAULT_MAX_TOTAL_SOURCE_BYTES,
    },
    budget: previous?.budget ?? {
      provider: "gpt",
      contextWindow: 128000,
      reservedPromptTokens: 2000,
      reservedResponseTokens: 4000,
      customTokensPerChar: 0.25,
    },
    ignoreRules: previous?.ignoreRules ?? {
      customIgnorePatterns: [],
      forceIncludePatterns: [],
    },
  };
}

export const DEFAULT_SETTINGS: ForgeSettings = createSettingsForPreset("balanced");

export const SETTINGS_STORAGE_KEY = "contextforge.settings.v1";

export type ToggleKey = keyof ForgeSettings["toggles"];

export interface ToggleMeta {
  key: ToggleKey;
  label: string;
  impact: string;
}

export const TOGGLE_META: ToggleMeta[] = [
  {
    key: "respectGitignore",
    label: "Respect .gitignore",
    impact: "Keeps generated and dependency directories out of the bundle. Saves the most on most repositories.",
  },
  {
    key: "stripComments",
    label: "Strip comments",
    impact: "Potentially saves 8–15% on comment-heavy repositories. Uses syntax-aware parsing, never regex.",
  },
  {
    key: "stripDebugLogging",
    label: "Strip debug logging",
    impact: "Removes standalone console/print/log statements only. Saves 1–4% typically.",
  },
  {
    key: "normalizeWhitespace",
    label: "Normalize whitespace",
    impact: "Normalizes line endings and trims trailing whitespace. Saves 1–3%, zero semantic risk.",
  },
  {
    key: "compactJson",
    label: "Compact valid JSON",
    impact: "Re-serializes parseable JSON without indentation. Saves 15–40% on JSON-heavy repositories.",
  },
  {
    key: "replaceFunctionBodies",
    label: "Replace function bodies",
    impact: "Keeps signatures and types, omits implementation. Saves 40–70% but removes behavior detail.",
  },
  {
    key: "includeMarkdown",
    label: "Include Markdown & README files",
    impact: "Documentation often carries useful context for AI tools at low token cost.",
  },
  {
    key: "includeTests",
    label: "Include tests",
    impact: "Tests can double as usage examples. Excluding them saves tokens on test-heavy repositories.",
  },
  {
    key: "includeConfig",
    label: "Include configuration files",
    impact: "package.json, tsconfig.json and similar files help tools infer tooling and dependencies.",
  },
  {
    key: "includeLockFiles",
    label: "Include lock files",
    impact: "Lock files are rarely useful context and are large. Off by default.",
  },
  {
    key: "addFileMetadata",
    label: "Add file-level metadata comments",
    impact: "Adds a small header per file (path, language, size) to help the model orient itself.",
  },
  {
    key: "showExcludedAppendix",
    label: "Show excluded-file appendix",
    impact: "Lists excluded files and reasons at the end of the bundle for auditability.",
  },
  {
    key: "excludeSourceMaps",
    label: "Exclude source maps",
    impact: "Source maps carry no independent signal for AI context and are often large.",
  },
  {
    key: "excludeFixturesInMax",
    label: "Exclude test fixtures & examples",
    impact: "Available in Maximum compression. Drops fixture/example data that inflates token count.",
  },
];
