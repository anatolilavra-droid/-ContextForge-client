// Discriminated message types exchanged between the main thread and the
// forge worker. Kept dependency-free so it can be imported from either side.

import type {
  BundleMetrics,
  FileForgeResult,
  FilePreviewData,
  ForgeSettings,
  RepoFileMeta,
  ScanStats,
  TreeEntry,
} from "../app/app-types";

export interface IngestFileEntry {
  path: string;
  file: File;
}

export type ScanPhase =
  | "collecting"
  | "applying-ignore-rules"
  | "classifying"
  | "estimating"
  | "ready";

export type ForgePhase = "transforming" | "compiling-bundle";

// ---------- Main -> Worker ----------

export interface IngestStartMessage {
  type: "INGEST_START";
  jobId: string;
  entries: IngestFileEntry[];
  ignoreSettings: {
    respectGitignore: boolean;
    customIgnorePatterns: string[];
    forceIncludePatterns: string[];
  };
  toggles: {
    includeMarkdown: boolean;
    includeTests: boolean;
    includeConfig: boolean;
    includeLockFiles: boolean;
    excludeSourceMaps: boolean;
    excludeFixturesInMax: boolean;
  };
  limits: {
    maxFileSizeBytes: number;
    maxTotalSourceBytes: number;
  };
  isMaximumPreset: boolean;
}

export interface RescanMessage {
  type: "RESCAN";
  jobId: string;
  ignoreSettings: IngestStartMessage["ignoreSettings"];
  toggles: IngestStartMessage["toggles"];
  limits: IngestStartMessage["limits"];
  isMaximumPreset: boolean;
}

export interface ForgeStartMessage {
  type: "FORGE_START";
  jobId: string;
  forgeId: string;
  settings: ForgeSettings;
}

export interface ForgeCancelMessage {
  type: "FORGE_CANCEL";
  jobId: string;
  forgeId: string;
}

export interface PreviewRequestMessage {
  type: "PREVIEW_REQUEST";
  jobId: string;
  path: string;
  settings: ForgeSettings;
}

export type MainToWorkerMessage =
  | IngestStartMessage
  | RescanMessage
  | ForgeStartMessage
  | ForgeCancelMessage
  | PreviewRequestMessage;

// ---------- Worker -> Main ----------

export interface ScanProgressMessage {
  type: "SCAN_PROGRESS";
  jobId: string;
  phase: ScanPhase;
  processed: number;
  total: number;
}

export interface ScanCompleteMessage {
  type: "SCAN_COMPLETE";
  jobId: string;
  tree: TreeEntry[];
  files: RepoFileMeta[];
  stats: ScanStats;
}

export interface ScanErrorMessage {
  type: "SCAN_ERROR";
  jobId: string;
  message: string;
}

export interface ForgeProgressMessage {
  type: "FORGE_PROGRESS";
  jobId: string;
  forgeId: string;
  phase: ForgePhase;
  processed: number;
  total: number;
}

export interface FileResultMessage {
  type: "FILE_RESULT";
  jobId: string;
  forgeId: string;
  result: FileForgeResult;
}

export interface ForgeCompleteMessage {
  type: "FORGE_COMPLETE";
  jobId: string;
  forgeId: string;
  bundleMarkdown: string;
  metrics: BundleMetrics;
}

export interface ForgeCancelledMessage {
  type: "FORGE_CANCELLED";
  jobId: string;
  forgeId: string;
}

export interface ForgeErrorMessage {
  type: "FORGE_ERROR";
  jobId: string;
  forgeId: string | null;
  message: string;
  path?: string;
}

export interface PreviewResultMessage {
  type: "PREVIEW_RESULT";
  jobId: string;
  preview: FilePreviewData;
}

export interface PreviewErrorMessage {
  type: "PREVIEW_ERROR";
  jobId: string;
  path: string;
  message: string;
}

export type WorkerToMainMessage =
  | ScanProgressMessage
  | ScanCompleteMessage
  | ScanErrorMessage
  | ForgeProgressMessage
  | FileResultMessage
  | ForgeCompleteMessage
  | ForgeCancelledMessage
  | ForgeErrorMessage
  | PreviewResultMessage
  | PreviewErrorMessage;
