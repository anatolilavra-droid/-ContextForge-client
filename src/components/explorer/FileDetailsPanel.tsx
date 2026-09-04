import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import type { FilePreviewData } from "../../app/app-types";
import { formatBytes, formatCount, formatPercent, safePercent } from "../../lib/file-size";
import { diffLineStats } from "../../lib/line-diff";
import { Skeleton } from "../ui/Skeleton";

type ViewMode = "forged" | "original" | "diff";

export interface FileDetailsPanelProps {
  path: string;
  preview: FilePreviewData | null;
  loading: boolean;
  error: string | null;
}

export function FileDetailsPanel({ path, preview, loading, error }: FileDetailsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("forged");

  const originalBytes = preview ? new TextEncoder().encode(preview.original).length : 0;
  const forgedBytes = preview ? new TextEncoder().encode(preview.forged).length : 0;
  const tokensSaved = preview ? preview.originalTokensGpt - preview.forgedTokensGpt : 0;
  const percentSaved = preview ? safePercent(tokensSaved, preview.originalTokensGpt) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4">
        <p className="cf-mono truncate text-sm text-text-primary" title={path}>
          {path}
        </p>
      </div>

      {loading && (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && error && (
        <div className="m-4 flex items-start gap-2.5 rounded-[12px] border border-danger/30 bg-danger/10 p-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {!loading && !error && preview && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid grid-cols-2 gap-3 border-b border-border p-4 sm:grid-cols-4">
            <Metric label="Original" value={formatBytes(originalBytes)} />
            <Metric label="Forged" value={formatBytes(forgedBytes)} />
            <Metric
              label="Tokens saved"
              value={formatCount(tokensSaved)}
              accent={tokensSaved > 0 ? "success" : undefined}
            />
            <Metric
              label="Reduction"
              value={formatPercent(percentSaved)}
              accent={percentSaved > 0 ? "success" : undefined}
            />
          </div>

          {preview.transformationsApplied.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
              {preview.transformationsApplied.map((t) => (
                <span
                  key={t}
                  className="cf-mono rounded-[6px] border border-border-strong bg-surface-elevated px-2 py-0.5 text-[10px] text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className="space-y-1.5 border-b border-border p-3">
              {preview.warnings.map((w) => (
                <div key={w.code} className="flex items-start gap-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 border-b border-border p-2" role="tablist" aria-label="Preview mode">
            {(["forged", "original", "diff"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan ${
                  viewMode === mode
                    ? "bg-accent-cyan-soft text-accent-cyan"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                }`}
              >
                {mode === "diff" ? "Diff summary" : mode}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {viewMode === "diff" ? (
              <DiffSummary preview={preview} />
            ) : (
              <SourceView text={viewMode === "forged" ? preview.forged : preview.original} />
            )}
          </div>

          {preview.truncated && (
            <p className="cf-mono border-t border-border px-3 py-1.5 text-[11px] text-warning">
              Preview truncated for display; token counts reflect the full file.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: "success" }) {
  return (
    <div>
      <p className="cf-label mb-1">{label}</p>
      <p className={`cf-mono text-sm ${accent === "success" ? "text-success" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}

const MAX_RENDERED_LINES = 4000;

function SourceView({ text }: { text: string }) {
  const lines = useMemo(() => text.split("\n"), [text]);
  const shown = lines.slice(0, MAX_RENDERED_LINES);

  return (
    <div className="cf-mono grid grid-cols-[auto_1fr] text-xs leading-relaxed">
      <div
        className="select-none whitespace-pre-wrap bg-surface-raised px-3 py-3 text-right text-text-muted"
        aria-hidden="true"
      >
        {shown.map((_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <pre className="overflow-x-auto whitespace-pre px-3 py-3 text-text-primary">{shown.join("\n")}</pre>
    </div>
  );
}

function DiffSummary({ preview }: { preview: FilePreviewData }) {
  const originalLines = preview.original.length === 0 ? 0 : preview.original.split("\n").length;
  const forgedLines = preview.forged.length === 0 ? 0 : preview.forged.split("\n").length;
  const lineDelta = forgedLines - originalLines;

  // Computed lazily: this component only mounts when the "Diff summary" tab
  // is actually selected, so the O(n*m) LCS diff never runs on every render.
  const diff = useMemo(() => diffLineStats(preview.original, preview.forged), [preview.original, preview.forged]);

  return (
    <div className="space-y-3 p-4 text-sm">
      <div className="cf-panel p-3.5">
        <p className="cf-label mb-2">Line count</p>
        <p className="cf-mono text-text-primary">
          {formatCount(originalLines)} → {formatCount(forgedLines)} lines ({lineDelta > 0 ? "+" : ""}
          {formatCount(lineDelta)})
        </p>
      </div>
      <div className="cf-panel p-3.5">
        <p className="cf-label mb-2">Line diff</p>
        <p className="cf-mono">
          <span className="text-success">+{formatCount(diff.added)}</span>{" "}
          <span className="text-danger">-{formatCount(diff.removed)}</span>{" "}
          <span className="text-text-muted">{formatCount(diff.unchanged)} unchanged</span>
        </p>
        {diff.approximate && (
          <p className="mt-1.5 text-xs text-text-muted">
            File is large; this is an approximate diff (line order isn't accounted for).
          </p>
        )}
      </div>
      <div className="cf-panel p-3.5">
        <p className="cf-label mb-2">Transformations applied</p>
        {preview.transformationsApplied.length === 0 ? (
          <p className="text-xs text-text-muted">No transformations were applied to this file.</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-xs text-text-secondary">
            {preview.transformationsApplied.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
