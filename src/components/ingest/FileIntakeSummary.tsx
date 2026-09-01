import type { ScanStats } from "../../app/app-types";
import { formatBytes, formatCount } from "../../lib/file-size";
import type { ScanPhase } from "../../worker/worker-protocol";
import { Skeleton } from "../ui/Skeleton";

const PHASE_LABELS: Record<ScanPhase, string> = {
  collecting: "Collecting files…",
  "applying-ignore-rules": "Applying ignore rules…",
  classifying: "Classifying languages…",
  estimating: "Estimating source size…",
  ready: "Ready to forge.",
};

export interface FileIntakeSummaryProps {
  phase: ScanPhase | null;
  processed: number;
  total: number;
  stats: ScanStats | null;
}

export function FileIntakeSummary({ phase, processed, total, stats }: FileIntakeSummaryProps) {
  const isScanning = phase !== null && phase !== "ready";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="cf-mono text-text-secondary">{phase ? PHASE_LABELS[phase] : "Waiting…"}</span>
        {isScanning && total > 0 && (
          <span className="cf-mono text-text-muted">
            {formatCount(processed)} / {formatCount(total)}
          </span>
        )}
      </div>

      {isScanning && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-accent-cyan transition-[width] duration-200"
            style={{ width: total > 0 ? `${Math.min(100, (processed / total) * 100)}%` : "8%" }}
          />
        </div>
      )}

      {!stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total files" value={formatCount(stats.totalFiles)} />
            <StatTile label="Eligible" value={formatCount(stats.eligibleFiles)} accent="success" />
            <StatTile label="Excluded" value={formatCount(stats.excludedFiles)} accent="muted" />
            <StatTile label="Input size" value={formatBytes(stats.totalInputBytes)} />
          </div>

          <div className="cf-panel p-4">
            <p className="cf-label mb-2">Raw estimated tokens</p>
            <p className="cf-mono text-lg text-text-primary">{formatCount(stats.rawEstimatedTokens)}</p>
          </div>

          {stats.languages.length > 0 && (
            <div className="cf-panel p-4">
              <p className="cf-label mb-3">Language distribution</p>
              <ul className="space-y-2">
                {stats.languages.slice(0, 8).map((lang) => (
                  <li key={lang.language} className="flex items-center justify-between gap-3 text-xs">
                    <span className="cf-mono text-text-secondary">{lang.language}</span>
                    <span className="flex items-center gap-3">
                      <span className="cf-mono text-text-muted">{formatCount(lang.files)} files</span>
                      <span className="cf-mono text-text-muted">{formatBytes(lang.bytes)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: "success" | "muted" }) {
  const color = accent === "success" ? "text-success" : accent === "muted" ? "text-text-muted" : "text-text-primary";
  return (
    <div className="cf-panel p-3.5">
      <p className="cf-label mb-1.5">{label}</p>
      <p className={`cf-mono text-lg ${color}`}>{value}</p>
    </div>
  );
}
