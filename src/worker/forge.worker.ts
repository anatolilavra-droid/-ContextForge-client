import type { BundleMetrics, FileForgeResult, FileLanguage, FilePreviewData, RepoFileMeta, TreeEntry } from "../app/app-types";
import { approximateClaudeTokens } from "../lib/token-estimation";
import { safePercent } from "../lib/file-size";
import { classifyAndFilter, type IgnoreContext } from "./apply-ignore-rules";
import { buildTree } from "./build-ascii-tree";
import { buildMarkdownBundle, type BundleFileEntry } from "./build-markdown-bundle";
import { classifyFile } from "./classify-files";
import { heuristicTokenEstimate, tokensForText } from "./estimate-tokens";
import { ingestFiles, type IngestedFile } from "./ingest-files";
import { transformFileContent } from "./transform-source";
import type {
  ForgeStartMessage,
  IngestStartMessage,
  MainToWorkerMessage,
  PreviewRequestMessage,
  RescanMessage,
  WorkerToMainMessage,
} from "./worker-protocol";

/**
 * Minimal surface of the dedicated-worker global scope this file relies on.
 * Casting through this local interface (rather than relying on TypeScript's
 * ambient `self` typing) avoids pulling in the "WebWorker" lib, which would
 * conflict with the "DOM" lib the rest of the app's tsconfig project needs.
 */
interface WorkerScope {
  postMessage(message: WorkerToMainMessage, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<MainToWorkerMessage>) => void) | null;
}

const ctx = self as unknown as WorkerScope;

const BATCH_SIZE = 24;
const PREVIEW_MAX_CHARS = 300_000;

let currentJobId: string | null = null;
let fileRegistry = new Map<string, IngestedFile>();
let latestFileMetas: RepoFileMeta[] = [];

let activeForge: { forgeId: string; cancelled: boolean } | null = null;
let lastGitignoreContent: string | null = null;
let lastContextforgeignoreContent: string | null = null;

function post(message: WorkerToMainMessage): void {
  ctx.postMessage(message);
}

function toIgnoreContext(
  common: {
    ignoreSettings: IngestStartMessage["ignoreSettings"];
    toggles: IngestStartMessage["toggles"];
    limits: IngestStartMessage["limits"];
    isMaximumPreset: boolean;
  },
  gitignoreContent: string | null,
  contextforgeignoreContent: string | null,
): IgnoreContext {
  return {
    respectGitignore: common.ignoreSettings.respectGitignore,
    gitignoreContent,
    contextforgeignoreContent,
    customIgnorePatterns: common.ignoreSettings.customIgnorePatterns,
    forceIncludePatterns: common.ignoreSettings.forceIncludePatterns,
    toggles: common.toggles,
    limits: common.limits,
    isMaximumPreset: common.isMaximumPreset,
  };
}

function computeStats(files: RepoFileMeta[]) {
  let totalFiles = 0;
  let eligibleFiles = 0;
  let excludedFiles = 0;
  let totalInputBytes = 0;
  let eligibleInputBytes = 0;
  let rawEstimatedTokens = 0;
  const languageMap = new Map<FileLanguage, { files: number; bytes: number }>();

  for (const file of files) {
    totalFiles += 1;
    totalInputBytes += file.size;
    if (file.included) {
      eligibleFiles += 1;
      eligibleInputBytes += file.size;
      rawEstimatedTokens += heuristicTokenEstimate(file.size);
      const entry = languageMap.get(file.language) ?? { files: 0, bytes: 0 };
      entry.files += 1;
      entry.bytes += file.size;
      languageMap.set(file.language, entry);
    } else {
      excludedFiles += 1;
    }
  }

  return {
    totalFiles,
    eligibleFiles,
    excludedFiles,
    totalInputBytes,
    eligibleInputBytes,
    rawEstimatedTokens,
    languages: [...languageMap.entries()]
      .map(([language, v]) => ({ language, files: v.files, bytes: v.bytes }))
      .sort((a, b) => b.bytes - a.bytes),
  };
}

async function handleIngestStart(message: IngestStartMessage): Promise<void> {
  currentJobId = message.jobId;
  fileRegistry = new Map();
  latestFileMetas = [];
  activeForge = null;

  const total = message.entries.length;
  post({ type: "SCAN_PROGRESS", jobId: message.jobId, phase: "collecting", processed: 0, total });

  const ingestResult = await ingestFiles(
    message.entries,
    (processed, ingestTotal) => {
      post({ type: "SCAN_PROGRESS", jobId: message.jobId, phase: "collecting", processed, total: ingestTotal });
    },
    () => currentJobId !== message.jobId,
  );

  if (!ingestResult || currentJobId !== message.jobId) return;

  for (const file of ingestResult.files) fileRegistry.set(file.path, file);
  lastGitignoreContent = ingestResult.gitignoreContent;
  lastContextforgeignoreContent = ingestResult.contextforgeignoreContent;

  post({ type: "SCAN_PROGRESS", jobId: message.jobId, phase: "applying-ignore-rules", processed: 0, total });

  const ctxIgnore = toIgnoreContext(message, ingestResult.gitignoreContent, ingestResult.contextforgeignoreContent);
  const metas = classifyAndFilter(ingestResult.files, ctxIgnore);
  latestFileMetas = metas;

  post({ type: "SCAN_PROGRESS", jobId: message.jobId, phase: "classifying", processed: total, total });
  post({ type: "SCAN_PROGRESS", jobId: message.jobId, phase: "estimating", processed: total, total });

  const stats = computeStats(metas);
  const tree = buildTree(metas);

  post({ type: "SCAN_PROGRESS", jobId: message.jobId, phase: "ready", processed: total, total });
  post({ type: "SCAN_COMPLETE", jobId: message.jobId, tree, files: metas, stats });
}

function handleRescan(message: RescanMessage): void {
  if (message.jobId !== currentJobId) return;

  // Re-applies ignore rules and toggles against already-ingested files
  // (no re-reading from disk) so adjusting settings stays instant.
  const ctxIgnore = toIgnoreContext(message, lastGitignoreContent, lastContextforgeignoreContent);
  const metas = classifyAndFilter([...fileRegistry.values()], ctxIgnore);
  latestFileMetas = metas;

  const stats = computeStats(metas);
  const tree = buildTree(metas);
  post({ type: "SCAN_COMPLETE", jobId: message.jobId, tree, files: metas, stats });
}

async function handleForgeStart(message: ForgeStartMessage): Promise<void> {
  if (message.jobId !== currentJobId) return;

  if (activeForge && !activeForge.cancelled) {
    activeForge.cancelled = true;
  }
  const forgeState = { forgeId: message.forgeId, cancelled: false };
  activeForge = forgeState;

  const eligible = latestFileMetas.filter((f) => f.included);
  const tree = buildTree(latestFileMetas);
  const orderedPaths: string[] = [];
  (function walk(entries: TreeEntry[]): void {
    for (const entry of entries) {
      if (entry.kind === "file" && entry.included) orderedPaths.push(entry.path);
      if (entry.kind === "dir" && entry.children) walk(entry.children);
    }
  })(tree);

  const metaByPath = new Map(eligible.map((f) => [f.path, f] as const));
  const total = orderedPaths.length;
  let processed = 0;

  const forgedContent = new Map<string, string>();
  const fileResults: FileForgeResult[] = [];

  for (let i = 0; i < orderedPaths.length; i += BATCH_SIZE) {
    if (forgeState.cancelled) {
      post({ type: "FORGE_CANCELLED", jobId: message.jobId, forgeId: message.forgeId });
      return;
    }

    const batchPaths = orderedPaths.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batchPaths.map(async (path) => {
        if (forgeState.cancelled) return;
        const meta = metaByPath.get(path);
        const ingested = fileRegistry.get(path);
        if (!meta || !ingested) return;

        let originalText: string;
        try {
          originalText = await ingested.file.text();
        } catch {
          post({
            type: "FORGE_ERROR",
            jobId: message.jobId,
            forgeId: message.forgeId,
            message: "File could not be read during forging.",
            path,
          });
          return;
        }

        if (forgeState.cancelled) return;

        const originalTokens = tokensForText(originalText);
        const outcome = await transformFileContent({
          path,
          language: meta.language,
          content: originalText,
          preset: message.settings.preset,
          toggles: message.settings.toggles,
        });
        const forgedTokens = tokensForText(outcome.output);

        forgedContent.set(path, outcome.output);
        const result: FileForgeResult = {
          fileId: meta.id,
          path,
          originalBytes: meta.size,
          forgedBytes: new TextEncoder().encode(outcome.output).length,
          originalTokensGpt: originalTokens.gpt,
          forgedTokensGpt: forgedTokens.gpt,
          transformationsApplied: outcome.transformationsApplied,
          warnings: outcome.warnings,
          skipped: false,
        };
        fileResults.push(result);
        post({ type: "FILE_RESULT", jobId: message.jobId, forgeId: message.forgeId, result });
      }),
    );

    processed = Math.min(i + BATCH_SIZE, total);
    post({ type: "FORGE_PROGRESS", jobId: message.jobId, forgeId: message.forgeId, phase: "transforming", processed, total });

    if (forgeState.cancelled) {
      post({ type: "FORGE_CANCELLED", jobId: message.jobId, forgeId: message.forgeId });
      return;
    }
  }

  post({ type: "FORGE_PROGRESS", jobId: message.jobId, forgeId: message.forgeId, phase: "compiling-bundle", processed: total, total });

  const includedFiles: BundleFileEntry[] = orderedPaths
    .filter((p) => forgedContent.has(p))
    .map((p) => ({ meta: metaByPath.get(p) as RepoFileMeta, forgedContent: forgedContent.get(p) as string }));

  const excludedFiles = latestFileMetas.filter((f) => !f.included);

  const rawInputBytes = fileResults.reduce((sum, r) => sum + r.originalBytes, 0);
  const forgedOutputBytes = fileResults.reduce((sum, r) => sum + r.forgedBytes, 0);
  const rawTokensGpt = fileResults.reduce((sum, r) => sum + r.originalTokensGpt, 0);
  const forgedTokensGpt = fileResults.reduce((sum, r) => sum + r.forgedTokensGpt, 0);
  const warningsCount = fileResults.reduce((sum, r) => sum + r.warnings.length, 0);

  const metrics: BundleMetrics = {
    filesIncluded: includedFiles.length,
    rawInputBytes,
    forgedOutputBytes,
    rawTokensGpt,
    forgedTokensGpt,
    approxClaudeTokensRaw: approximateClaudeTokens(rawTokensGpt),
    approxClaudeTokensForged: approximateClaudeTokens(forgedTokensGpt),
    tokensSaved: rawTokensGpt - forgedTokensGpt,
    percentSaved: safePercent(rawTokensGpt - forgedTokensGpt, rawTokensGpt),
    bytesSaved: rawInputBytes - forgedOutputBytes,
    percentBytesSaved: safePercent(rawInputBytes - forgedOutputBytes, rawInputBytes),
    warningsCount,
  };

  const bundleMarkdown = buildMarkdownBundle({
    settings: message.settings,
    includedFiles,
    excludedFiles,
    allFilesForTree: latestFileMetas,
    metrics,
  });

  post({ type: "FORGE_COMPLETE", jobId: message.jobId, forgeId: message.forgeId, bundleMarkdown, metrics });
}

async function handlePreviewRequest(message: PreviewRequestMessage): Promise<void> {
  if (message.jobId !== currentJobId) return;
  const ingested = fileRegistry.get(message.path);

  if (!ingested || ingested.isBinary || ingested.readError) {
    post({ type: "PREVIEW_ERROR", jobId: message.jobId, path: message.path, message: "This file cannot be previewed." });
    return;
  }

  try {
    const original = await ingested.file.text();
    const { language } = classifyFile(message.path, false);
    const outcome = await transformFileContent({
      path: message.path,
      language,
      content: original,
      preset: message.settings.preset,
      toggles: message.settings.toggles,
    });

    const originalTokens = tokensForText(original).gpt;
    const forgedTokens = tokensForText(outcome.output).gpt;
    const truncated = original.length > PREVIEW_MAX_CHARS || outcome.output.length > PREVIEW_MAX_CHARS;

    const preview: FilePreviewData = {
      path: message.path,
      language,
      original: truncated ? original.slice(0, PREVIEW_MAX_CHARS) : original,
      forged: truncated ? outcome.output.slice(0, PREVIEW_MAX_CHARS) : outcome.output,
      transformationsApplied: outcome.transformationsApplied,
      warnings: outcome.warnings,
      originalTokensGpt: originalTokens,
      forgedTokensGpt: forgedTokens,
      truncated,
    };
    post({ type: "PREVIEW_RESULT", jobId: message.jobId, preview });
  } catch (error) {
    post({
      type: "PREVIEW_ERROR",
      jobId: message.jobId,
      path: message.path,
      message: error instanceof Error ? error.message : "Preview failed.",
    });
  }
}

ctx.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case "INGEST_START":
        void handleIngestStart(message).catch((error: unknown) => {
          post({
            type: "SCAN_ERROR",
            jobId: message.jobId,
            message: error instanceof Error ? error.message : "Scan failed unexpectedly.",
          });
        });
        break;
      case "RESCAN":
        handleRescan(message);
        break;
      case "FORGE_START":
        void handleForgeStart(message).catch((error: unknown) => {
          post({
            type: "FORGE_ERROR",
            jobId: message.jobId,
            forgeId: message.forgeId,
            message: error instanceof Error ? error.message : "Forge failed unexpectedly.",
          });
        });
        break;
      case "FORGE_CANCEL":
        if (activeForge && activeForge.forgeId === message.forgeId) {
          activeForge.cancelled = true;
        }
        break;
      case "PREVIEW_REQUEST":
        void handlePreviewRequest(message);
        break;
    }
  } catch (error) {
    post({
      type: "FORGE_ERROR",
      jobId: currentJobId ?? "",
      forgeId: activeForge?.forgeId ?? null,
      message: error instanceof Error ? error.message : "Unexpected worker error.",
    });
  }
};
