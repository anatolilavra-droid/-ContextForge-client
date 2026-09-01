import type { BundleMetrics as BundleMetricsData } from "../../app/app-types";
import { formatBytes, formatCount, formatPercent } from "../../lib/file-size";

export interface BundleMetricsProps {
  metrics: BundleMetricsData | null;
}

export function BundleMetrics({ metrics }: BundleMetricsProps) {
  if (!metrics) {
    return <p className="text-sm text-text-muted">Forge the context to see bundle metrics.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Files included" value={formatCount(metrics.filesIncluded)} />
        <Tile label="Bytes saved" value={formatBytes(metrics.bytesSaved)} accent="success" />
        <Tile label="Size reduction" value={formatPercent(metrics.percentBytesSaved)} accent="success" />
        <Tile
          label="Warnings"
          value={formatCount(metrics.warningsCount)}
          accent={metrics.warningsCount > 0 ? "warning" : undefined}
        />
      </div>

      <div className="cf-panel p-4">
        <p className="cf-label mb-3">Tokens</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat term="Estimated GPT tokens (raw)" value={formatCount(metrics.rawTokensGpt)} />
          <Stat term="Estimated GPT tokens (forged)" value={formatCount(metrics.forgedTokensGpt)} />
          <Stat term="Approximate Claude-equivalent tokens (raw)" value={formatCount(metrics.approxClaudeTokensRaw)} />
          <Stat
            term="Approximate Claude-equivalent tokens (forged)"
            value={formatCount(metrics.approxClaudeTokensForged)}
          />
        </dl>
        <p className="cf-mono mt-3 text-sm text-success">
          {formatCount(metrics.tokensSaved)} tokens saved ({formatPercent(metrics.percentSaved)})
        </p>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" }) {
  const color = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-text-primary";
  return (
    <div className="cf-panel p-3.5">
      <p className="cf-label mb-1.5">{label}</p>
      <p className={`cf-mono text-lg ${color}`}>{value}</p>
    </div>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{term}</dt>
      <dd className="cf-mono mt-0.5 text-text-primary">{value}</dd>
    </div>
  );
}
