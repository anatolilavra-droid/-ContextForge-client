import { AlertTriangle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FileIntakeSummary } from "../components/ingest/FileIntakeSummary";
import { RepositoryDropzone } from "../components/ingest/RepositoryDropzone";
import { AppHeader } from "../components/layout/AppHeader";
import { BottomActionBar } from "../components/layout/BottomActionBar";
import { WorkspaceHeader } from "../components/layout/WorkspaceHeader";
import { FileDetailsPanel } from "../components/explorer/FileDetailsPanel";
import { RepositoryTree } from "../components/explorer/RepositoryTree";
import { BundleMetrics } from "../components/output/BundleMetrics";
import { BundlePreview } from "../components/output/BundlePreview";
import { CompressionInspector } from "../components/output/CompressionInspector";
import { ExportActions } from "../components/output/ExportActions";
import { ProcessingProgress } from "../components/output/ProcessingProgress";
import { ForgePresetSelector } from "../components/settings/ForgePresetSelector";
import { IgnoreRuleEditor } from "../components/settings/IgnoreRuleEditor";
import { TokenBudgetPanel } from "../components/settings/TokenBudgetPanel";
import { TransformToggleList } from "../components/settings/TransformToggleList";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useForgeWorker } from "../hooks/useForgeWorker";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { usePersistedSettings } from "../hooks/usePersistedSettings";
import { useRepositoryIntake } from "../hooks/useRepositoryIntake";
import { copyToClipboard } from "../lib/clipboard";
import { downloadMarkdown } from "../lib/download";
import type { IngestFileEntry } from "../worker/worker-protocol";

type RightTab = "settings" | "output";

interface ToastItem {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

function makeToastId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AppShell() {
  const settings = usePersistedSettings();
  const forge = useForgeWorker();
  const intake = useRepositoryIntake();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("settings");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = makeToastId();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hasRepository = forge.state.jobId !== null;
  const hasStats = forge.state.stats !== null;
  const canForge = hasStats && (forge.state.stats?.eligibleFiles ?? 0) > 0 && !forge.state.isForging;

  const fileResultsArray = useMemo(() => Object.values(forge.state.fileResults), [forge.state.fileResults]);

  const handleFilesCollected = useCallback(
    (entries: IngestFileEntry[]) => {
      forge.startIngest(entries, settings.settings);
      setSelectedPath(null);
      setRightTab("settings");
    },
    [forge, settings.settings],
  );

  const handleReset = useCallback(() => {
    forge.resetAll();
    setSelectedPath(null);
    setRightTab("settings");
  }, [forge]);

  const handleForge = useCallback(() => {
    forge.startForge(settings.settings);
  }, [forge, settings.settings]);

  const handleCancel = useCallback(() => {
    forge.cancelForge();
  }, [forge]);

  const handleCopy = useCallback(async (): Promise<boolean> => {
    if (!forge.state.bundleMarkdown) return false;
    const ok = await copyToClipboard(forge.state.bundleMarkdown);
    pushToast(ok ? "Bundle copied to clipboard." : "Copy failed. Try downloading instead.", ok ? "success" : "error");
    return ok;
  }, [forge.state.bundleMarkdown, pushToast]);

  const handleDownload = useCallback(() => {
    if (!forge.state.bundleMarkdown) return;
    downloadMarkdown("contextforge-bundle.md", forge.state.bundleMarkdown);
    pushToast("Downloaded contextforge-bundle.md", "success");
  }, [forge.state.bundleMarkdown, pushToast]);

  // Re-apply ignore rules/limits instantly against already-ingested files
  // whenever those settings change, without re-reading from disk.
  const rescanKey = JSON.stringify({
    respectGitignore: settings.settings.toggles.respectGitignore,
    includeMarkdown: settings.settings.toggles.includeMarkdown,
    includeTests: settings.settings.toggles.includeTests,
    includeConfig: settings.settings.toggles.includeConfig,
    includeLockFiles: settings.settings.toggles.includeLockFiles,
    excludeSourceMaps: settings.settings.toggles.excludeSourceMaps,
    excludeFixturesInMax: settings.settings.toggles.excludeFixturesInMax,
    limits: settings.settings.limits,
    ignoreRules: settings.settings.ignoreRules,
    isMaximumPreset: settings.settings.preset === "maximum",
  });
  const initialScanDone = useRef(false);
  useEffect(() => {
    if (!hasStats) return;
    if (!initialScanDone.current) {
      initialScanDone.current = true;
      return;
    }
    forge.rescan(settings.settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescanKey, hasStats]);
  useEffect(() => {
    if (!hasRepository) initialScanDone.current = false;
  }, [hasRepository]);

  // Keep the file preview in sync with the currently selected path and with
  // any transform-affecting settings changes.
  useEffect(() => {
    if (!selectedPath || !forge.state.jobId) return;
    forge.requestPreview(selectedPath, settings.settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath, settings.settings.preset, settings.settings.toggles, forge.state.jobId]);

  const prevForgeCancelled = useRef(false);
  useEffect(() => {
    if (forge.state.forgeCancelled && !prevForgeCancelled.current) pushToast("Forge cancelled.", "info");
    prevForgeCancelled.current = forge.state.forgeCancelled;
  }, [forge.state.forgeCancelled, pushToast]);

  const prevBundle = useRef<string | null>(null);
  useEffect(() => {
    if (forge.state.bundleMarkdown && forge.state.bundleMarkdown !== prevBundle.current) {
      pushToast("Forge complete.", "success");
      setRightTab("output");
    }
    prevBundle.current = forge.state.bundleMarkdown;
  }, [forge.state.bundleMarkdown, pushToast]);

  const prevForgeError = useRef<string | null>(null);
  useEffect(() => {
    if (forge.state.forgeError && forge.state.forgeError !== prevForgeError.current) {
      pushToast(forge.state.forgeError, "error");
    }
    prevForgeError.current = forge.state.forgeError;
  }, [forge.state.forgeError, pushToast]);

  const prevScanError = useRef<string | null>(null);
  useEffect(() => {
    if (forge.state.scanError && forge.state.scanError !== prevScanError.current) {
      pushToast(forge.state.scanError, "error");
    }
    prevScanError.current = forge.state.scanError;
  }, [forge.state.scanError, pushToast]);

  useKeyboardShortcuts({
    onForge: () => {
      if (canForge) handleForge();
    },
    onCopy: () => void handleCopy(),
    onDownload: handleDownload,
    onFocusSearch: () => document.getElementById("explorer-search")?.focus(),
    onEscape: () => {
      if (forge.state.isForging) handleCancel();
      else if (selectedPath) setSelectedPath(null);
    },
  });

  const rawTokensForBar = forge.state.metrics?.rawTokensGpt ?? forge.state.stats?.rawEstimatedTokens ?? 0;
  const forgedTokensForBar = forge.state.metrics?.forgedTokensGpt ?? null;
  const percentSavedForBar = forge.state.metrics?.percentSaved ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader hasRepository={hasRepository} onReset={handleReset} />

      {!hasRepository && (
        <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
          <WorkspaceHeader />
          <RepositoryDropzone intake={intake} onFilesCollected={handleFilesCollected} />
        </main>
      )}

      {hasRepository && !hasStats && (
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <FileIntakeSummary
            phase={forge.state.scanPhase}
            processed={forge.state.scanProcessed}
            total={forge.state.scanTotal}
            stats={forge.state.stats}
          />
        </main>
      )}

      {hasRepository && hasStats && (
        <>
          <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            <aside className="flex h-72 shrink-0 flex-col border-b border-border lg:h-auto lg:w-[320px] lg:border-b-0 lg:border-r">
              <RepositoryTree
                tree={forge.state.tree}
                files={forge.state.files}
                selectedPath={selectedPath}
                onSelectFile={setSelectedPath}
              />
            </aside>

            <section className="flex flex-1 flex-col overflow-hidden">
              {selectedPath ? (
                <FileDetailsPanel
                  path={selectedPath}
                  preview={forge.state.preview?.path === selectedPath ? forge.state.preview : null}
                  loading={forge.state.previewLoading}
                  error={forge.state.previewError}
                />
              ) : (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex items-center gap-1 border-b border-border p-2" role="tablist" aria-label="Right panel">
                    <RightTabButton active={rightTab === "settings"} onClick={() => setRightTab("settings")}>
                      Settings
                    </RightTabButton>
                    <RightTabButton active={rightTab === "output"} onClick={() => setRightTab("output")}>
                      Output
                    </RightTabButton>
                  </div>

                  <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
                    {rightTab === "settings" ? (
                      <>
                        <Card title="Forge preset">
                          <ForgePresetSelector preset={settings.settings.preset} onSelect={settings.setPreset} />
                        </Card>
                        <Card title="Transforms">
                          <TransformToggleList
                            settings={settings.settings}
                            preset={settings.settings.preset}
                            onToggle={settings.toggle}
                          />
                        </Card>
                        <Card title="Ignore rules & limits">
                          <IgnoreRuleEditor
                            ignoreRules={settings.settings.ignoreRules}
                            onChangeIgnoreRules={settings.setIgnoreRules}
                            limits={settings.settings.limits}
                            onChangeLimits={settings.setLimits}
                          />
                        </Card>
                        <Card title="Context budget simulator">
                          <TokenBudgetPanel
                            budget={settings.settings.budget}
                            onChange={settings.setBudget}
                            gptTokens={forge.state.metrics?.forgedTokensGpt ?? null}
                            claudeTokens={forge.state.metrics?.approxClaudeTokensForged ?? null}
                            bundleCharCount={forge.state.bundleMarkdown?.length ?? null}
                          />
                        </Card>
                      </>
                    ) : (
                      <>
                        {forge.state.isForging && (
                          <ProcessingProgress
                            phase={forge.state.forgePhase}
                            processed={forge.state.forgeProcessed}
                            total={forge.state.forgeTotal}
                            onCancel={handleCancel}
                          />
                        )}
                        <Card title="Bundle metrics">
                          <BundleMetrics metrics={forge.state.metrics} />
                        </Card>
                        <Card title="Export">
                          <ExportActions
                            disabled={!forge.state.bundleMarkdown}
                            onCopy={handleCopy}
                            onDownload={handleDownload}
                          />
                        </Card>
                        <Card title="Bundle preview" padded={false} className="flex h-[420px] flex-col overflow-hidden">
                          <BundlePreview bundleMarkdown={forge.state.bundleMarkdown} />
                        </Card>
                        <Card title="Per-file compression">
                          <CompressionInspector fileResults={fileResultsArray} onSelectFile={setSelectedPath} />
                        </Card>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          </main>

          <BottomActionBar
            fileCount={forge.state.stats?.eligibleFiles ?? 0}
            rawTokens={rawTokensForBar}
            forgedTokens={forgedTokensForBar}
            percentSaved={percentSavedForBar}
            isForging={forge.state.isForging}
            canForge={canForge}
            hasBundle={!!forge.state.bundleMarkdown}
            onForge={handleForge}
            onCancel={handleCancel}
            onCopy={() => void handleCopy()}
            onDownload={handleDownload}
          />
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {forge.state.fatalError && <FatalErrorPanel message={forge.state.fatalError} onRetry={handleReset} />}
    </div>
  );
}

function RightTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan ${
        active ? "bg-accent-cyan-soft text-accent-cyan" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`animate-fade-in pointer-events-auto flex items-center gap-2.5 rounded-[12px] border bg-surface-elevated px-4 py-2.5 text-sm shadow-lg ${
            toast.tone === "success"
              ? "border-success/30 text-success"
              : toast.tone === "error"
                ? "border-danger/30 text-danger"
                : "border-border-strong text-text-secondary"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="rounded text-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

function FatalErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-danger/30 bg-surface-elevated/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-danger">{message}</p>
        </div>
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
