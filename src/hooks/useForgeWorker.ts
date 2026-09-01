import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  BundleMetrics,
  FileForgeResult,
  FilePreviewData,
  ForgeSettings,
  RepoFileMeta,
  ScanStats,
  TreeEntry,
} from "../app/app-types";
import type {
  ForgePhase,
  ForgeStartMessage,
  IngestFileEntry,
  IngestStartMessage,
  ScanPhase,
  WorkerToMainMessage,
} from "../worker/worker-protocol";

function makeId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface ForgeWorkerState {
  jobId: string | null;
  scanPhase: ScanPhase | null;
  scanProcessed: number;
  scanTotal: number;
  tree: TreeEntry[];
  files: RepoFileMeta[];
  stats: ScanStats | null;
  scanError: string | null;

  forgeId: string | null;
  forgePhase: ForgePhase | null;
  forgeProcessed: number;
  forgeTotal: number;
  fileResults: Record<string, FileForgeResult>;
  bundleMarkdown: string | null;
  metrics: BundleMetrics | null;
  forgeError: string | null;
  forgeCancelled: boolean;
  isForging: boolean;

  previewPath: string | null;
  preview: FilePreviewData | null;
  previewLoading: boolean;
  previewError: string | null;

  fatalError: string | null;
}

const initialState: ForgeWorkerState = {
  jobId: null,
  scanPhase: null,
  scanProcessed: 0,
  scanTotal: 0,
  tree: [],
  files: [],
  stats: null,
  scanError: null,

  forgeId: null,
  forgePhase: null,
  forgeProcessed: 0,
  forgeTotal: 0,
  fileResults: {},
  bundleMarkdown: null,
  metrics: null,
  forgeError: null,
  forgeCancelled: false,
  isForging: false,

  previewPath: null,
  preview: null,
  previewLoading: false,
  previewError: null,

  fatalError: null,
};

type Action =
  | { type: "RESET"; jobId: string | null }
  | { type: "FORGE_STARTED"; forgeId: string }
  | { type: "PREVIEW_REQUESTED"; path: string }
  | { type: "WORKER_MESSAGE"; message: WorkerToMainMessage }
  | { type: "FATAL_ERROR"; message: string };

function reducer(state: ForgeWorkerState, action: Action): ForgeWorkerState {
  switch (action.type) {
    case "RESET":
      return { ...initialState, jobId: action.jobId };

    case "FORGE_STARTED":
      return {
        ...state,
        forgeId: action.forgeId,
        forgePhase: null,
        forgeProcessed: 0,
        forgeTotal: 0,
        fileResults: {},
        bundleMarkdown: null,
        metrics: null,
        forgeError: null,
        forgeCancelled: false,
        isForging: true,
      };

    case "PREVIEW_REQUESTED":
      return { ...state, previewPath: action.path, previewLoading: true, previewError: null };

    case "FATAL_ERROR":
      return { ...state, fatalError: action.message, isForging: false };

    case "WORKER_MESSAGE": {
      const message = action.message;

      switch (message.type) {
        case "SCAN_PROGRESS": {
          if (message.jobId !== state.jobId) return state;
          return { ...state, scanPhase: message.phase, scanProcessed: message.processed, scanTotal: message.total };
        }
        case "SCAN_COMPLETE": {
          if (message.jobId !== state.jobId) return state;
          return { ...state, tree: message.tree, files: message.files, stats: message.stats, scanError: null };
        }
        case "SCAN_ERROR": {
          if (message.jobId !== state.jobId) return state;
          return { ...state, scanError: message.message };
        }
        case "FORGE_PROGRESS": {
          if (message.jobId !== state.jobId || message.forgeId !== state.forgeId) return state;
          return { ...state, forgePhase: message.phase, forgeProcessed: message.processed, forgeTotal: message.total };
        }
        case "FILE_RESULT": {
          if (message.jobId !== state.jobId || message.forgeId !== state.forgeId) return state;
          return {
            ...state,
            fileResults: { ...state.fileResults, [message.result.path]: message.result },
          };
        }
        case "FORGE_COMPLETE": {
          if (message.jobId !== state.jobId || message.forgeId !== state.forgeId) return state;
          return { ...state, bundleMarkdown: message.bundleMarkdown, metrics: message.metrics, isForging: false };
        }
        case "FORGE_CANCELLED": {
          if (message.jobId !== state.jobId || message.forgeId !== state.forgeId) return state;
          return { ...state, forgeCancelled: true, isForging: false };
        }
        case "FORGE_ERROR": {
          if (message.jobId !== state.jobId) return state;
          if (message.forgeId !== null && message.forgeId !== state.forgeId) return state;
          return { ...state, forgeError: message.message, isForging: false };
        }
        case "PREVIEW_RESULT": {
          if (message.jobId !== state.jobId || message.preview.path !== state.previewPath) return state;
          return { ...state, preview: message.preview, previewLoading: false, previewError: null };
        }
        case "PREVIEW_ERROR": {
          if (message.jobId !== state.jobId || message.path !== state.previewPath) return state;
          return { ...state, previewLoading: false, previewError: message.message, preview: null };
        }
        default:
          return state;
      }
    }

    default:
      return state;
  }
}

function toIngestPayload(
  jobId: string,
  entries: IngestFileEntry[],
  settings: ForgeSettings,
): IngestStartMessage {
  return {
    type: "INGEST_START",
    jobId,
    entries,
    ignoreSettings: {
      respectGitignore: settings.toggles.respectGitignore,
      customIgnorePatterns: settings.ignoreRules.customIgnorePatterns,
      forceIncludePatterns: settings.ignoreRules.forceIncludePatterns,
    },
    toggles: {
      includeMarkdown: settings.toggles.includeMarkdown,
      includeTests: settings.toggles.includeTests,
      includeConfig: settings.toggles.includeConfig,
      includeLockFiles: settings.toggles.includeLockFiles,
      excludeSourceMaps: settings.toggles.excludeSourceMaps,
      excludeFixturesInMax: settings.toggles.excludeFixturesInMax,
    },
    limits: settings.limits,
    isMaximumPreset: settings.preset === "maximum",
  };
}

export interface UseForgeWorkerResult {
  state: ForgeWorkerState;
  startIngest: (entries: IngestFileEntry[], settings: ForgeSettings) => void;
  rescan: (settings: ForgeSettings) => void;
  startForge: (settings: ForgeSettings) => void;
  cancelForge: () => void;
  requestPreview: (path: string, settings: ForgeSettings) => void;
  resetAll: () => void;
}

export function useForgeWorker(): UseForgeWorkerResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const attachWorker = useCallback((worker: Worker) => {
    worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      dispatch({ type: "WORKER_MESSAGE", message: event.data });
    };
    worker.onerror = (event: ErrorEvent) => {
      dispatch({ type: "FATAL_ERROR", message: event.message || "The forge worker crashed unexpectedly." });
    };
  }, []);

  const startIngest = useCallback(
    (entries: IngestFileEntry[], settings: ForgeSettings) => {
      workerRef.current?.terminate();
      const worker = new Worker(new URL("../worker/forge.worker.ts", import.meta.url), { type: "module" });
      attachWorker(worker);
      workerRef.current = worker;

      const jobId = makeId();
      dispatch({ type: "RESET", jobId });
      worker.postMessage(toIngestPayload(jobId, entries, settings));
    },
    [attachWorker],
  );

  const rescan = useCallback((settings: ForgeSettings) => {
    const worker = workerRef.current;
    const jobId = stateRef.current.jobId;
    if (!worker || !jobId) return;
    worker.postMessage({
      type: "RESCAN",
      jobId,
      ignoreSettings: {
        respectGitignore: settings.toggles.respectGitignore,
        customIgnorePatterns: settings.ignoreRules.customIgnorePatterns,
        forceIncludePatterns: settings.ignoreRules.forceIncludePatterns,
      },
      toggles: {
        includeMarkdown: settings.toggles.includeMarkdown,
        includeTests: settings.toggles.includeTests,
        includeConfig: settings.toggles.includeConfig,
        includeLockFiles: settings.toggles.includeLockFiles,
        excludeSourceMaps: settings.toggles.excludeSourceMaps,
        excludeFixturesInMax: settings.toggles.excludeFixturesInMax,
      },
      limits: settings.limits,
      isMaximumPreset: settings.preset === "maximum",
    });
  }, []);

  const startForge = useCallback((settings: ForgeSettings) => {
    const worker = workerRef.current;
    const jobId = stateRef.current.jobId;
    if (!worker || !jobId) return;
    const forgeId = makeId();
    dispatch({ type: "FORGE_STARTED", forgeId });
    const message: ForgeStartMessage = { type: "FORGE_START", jobId, forgeId, settings };
    worker.postMessage(message);
  }, []);

  const cancelForge = useCallback(() => {
    const worker = workerRef.current;
    const jobId = stateRef.current.jobId;
    const forgeId = stateRef.current.forgeId;
    if (!worker || !jobId || !forgeId) return;
    worker.postMessage({ type: "FORGE_CANCEL", jobId, forgeId });
  }, []);

  const requestPreview = useCallback((path: string, settings: ForgeSettings) => {
    const worker = workerRef.current;
    const jobId = stateRef.current.jobId;
    if (!worker || !jobId) return;
    dispatch({ type: "PREVIEW_REQUESTED", path });
    worker.postMessage({ type: "PREVIEW_REQUEST", jobId, path, settings });
  }, []);

  const resetAll = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    dispatch({ type: "RESET", jobId: null });
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return { state, startIngest, rescan, startForge, cancelForge, requestPreview, resetAll };
}
