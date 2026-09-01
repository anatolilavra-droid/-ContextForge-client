// Shared domain types for ContextForge. Imported by both the main thread and
// the worker, so this file must stay free of DOM- or Worker-only globals.

export type ForgePresetId = "safe" | "balanced" | "architecture" | "maximum";

export type TokenProvider = "gpt" | "claude" | "custom";

export interface ForgeToggles {
  respectGitignore: boolean;
  stripComments: boolean;
  stripDebugLogging: boolean;
  normalizeWhitespace: boolean;
  compactJson: boolean;
  replaceFunctionBodies: boolean;
  includeMarkdown: boolean;
  includeTests: boolean;
  includeConfig: boolean;
  includeLockFiles: boolean;
  addFileMetadata: boolean;
  showExcludedAppendix: boolean;
  excludeSourceMaps: boolean;
  excludeFixturesInMax: boolean;
}

export interface ForgeLimits {
  maxFileSizeBytes: number;
  maxTotalSourceBytes: number;
}

export interface TokenBudget {
  provider: TokenProvider;
  contextWindow: number;
  reservedPromptTokens: number;
  reservedResponseTokens: number;
  customTokensPerChar: number;
}

export interface IgnoreRuleSettings {
  customIgnorePatterns: string[];
  forceIncludePatterns: string[];
}

export interface ForgeSettings {
  preset: ForgePresetId;
  toggles: ForgeToggles;
  limits: ForgeLimits;
  budget: TokenBudget;
  ignoreRules: IgnoreRuleSettings;
}

export type FileLanguage =
  | "javascript"
  | "typescript"
  | "tsx"
  | "python"
  | "go"
  | "rust"
  | "markdown"
  | "json"
  | "yaml"
  | "css"
  | "html"
  | "text"
  | "binary"
  | "unknown";

export type ExclusionReasonCode =
  | "builtin-ignore"
  | "gitignore"
  | "contextforgeignore"
  | "user-ignore"
  | "binary-detected"
  | "max-file-size"
  | "max-total-size"
  | "excluded-tests"
  | "excluded-config"
  | "excluded-markdown"
  | "excluded-lockfile"
  | "excluded-sourcemap"
  | "excluded-fixture"
  | "unreadable";

export interface ExclusionReason {
  code: ExclusionReasonCode;
  detail: string;
}

export interface RepoFileMeta {
  id: string;
  path: string;
  name: string;
  dirPath: string;
  ext: string;
  size: number;
  language: FileLanguage;
  isConfig: boolean;
  isTest: boolean;
  isLockFile: boolean;
  isSourceMap: boolean;
  included: boolean;
  exclusionReason: ExclusionReason | null;
}

export interface LanguageCount {
  language: FileLanguage;
  files: number;
  bytes: number;
}

export interface ScanStats {
  totalFiles: number;
  eligibleFiles: number;
  excludedFiles: number;
  totalInputBytes: number;
  eligibleInputBytes: number;
  rawEstimatedTokens: number;
  languages: LanguageCount[];
}

export type TreeEntryKind = "dir" | "file";

export interface TreeEntry {
  kind: TreeEntryKind;
  name: string;
  path: string;
  fileId: string | null;
  included: boolean;
  children: TreeEntry[] | null;
}

export interface FileTransformWarning {
  code: string;
  message: string;
}

export interface FileForgeResult {
  fileId: string;
  path: string;
  originalBytes: number;
  forgedBytes: number;
  originalTokensGpt: number;
  forgedTokensGpt: number;
  transformationsApplied: string[];
  warnings: FileTransformWarning[];
  skipped: boolean;
}

export interface BundleMetrics {
  filesIncluded: number;
  rawInputBytes: number;
  forgedOutputBytes: number;
  rawTokensGpt: number;
  forgedTokensGpt: number;
  approxClaudeTokensRaw: number;
  approxClaudeTokensForged: number;
  tokensSaved: number;
  percentSaved: number;
  bytesSaved: number;
  percentBytesSaved: number;
  warningsCount: number;
}

export interface FilePreviewData {
  path: string;
  language: FileLanguage;
  original: string;
  forged: string;
  transformationsApplied: string[];
  warnings: FileTransformWarning[];
  originalTokensGpt: number;
  forgedTokensGpt: number;
  truncated: boolean;
}
