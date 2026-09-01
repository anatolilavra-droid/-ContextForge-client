import type { FileForgeResult } from "../../app/app-types";
import { formatBytes, formatCount, formatPercent, safePercent } from "../../lib/file-size";
import { EmptyState } from "../ui/EmptyState";

export interface CompressionInspectorProps {
  fileResults: FileForgeResult[];
  onSelectFile: (path: string) => void;
}

export function CompressionInspector({ fileResults, onSelectFile }: CompressionInspectorProps) {
  if (fileResults.length === 0) {
    return (
      <EmptyState
        title="No results yet"
        description="Per-file compression details appear here once forging starts."
      />
    );
  }

  const sorted = [...fileResults].sort(
    (a, b) => b.originalBytes - b.forgedBytes - (a.originalBytes - a.forgedBytes),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="cf-label border-b border-border">
            <th className="px-3 py-2 font-medium">Path</th>
            <th className="px-3 py-2 font-medium">Original</th>
            <th className="px-3 py-2 font-medium">Forged</th>
            <th className="px-3 py-2 font-medium">Saved</th>
            <th className="px-3 py-2 font-medium">Warnings</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((result) => {
            const saved = safePercent(result.originalTokensGpt - result.forgedTokensGpt, result.originalTokensGpt);
            return (
              <tr key={result.path} className="border-b border-border/60 hover:bg-surface-raised">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onSelectFile(result.path)}
                    className="cf-mono rounded text-text-secondary hover:text-accent-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
                  >
                    {result.path}
                  </button>
                </td>
                <td className="cf-mono px-3 py-2 text-text-secondary">{formatBytes(result.originalBytes)}</td>
                <td className="cf-mono px-3 py-2 text-text-secondary">{formatBytes(result.forgedBytes)}</td>
                <td className="cf-mono px-3 py-2 text-success">{formatPercent(saved)}</td>
                <td className="px-3 py-2 text-text-muted">
                  {result.warnings.length > 0 ? formatCount(result.warnings.length) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
