import { Square } from "lucide-react";
import { formatCount } from "../../lib/file-size";
import type { ForgePhase } from "../../worker/worker-protocol";
import { Button } from "../ui/Button";

const PHASE_LABELS: Record<ForgePhase, string> = {
  transforming: "Transforming files…",
  "compiling-bundle": "Compiling bundle…",
};

export interface ProcessingProgressProps {
  phase: ForgePhase | null;
  processed: number;
  total: number;
  onCancel: () => void;
}

export function ProcessingProgress({ phase, processed, total, onCancel }: ProcessingProgressProps) {
  const percent = total > 0 ? Math.min(100, (processed / total) * 100) : 8;

  return (
    <div className="cf-panel space-y-3 p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="cf-mono text-sm text-text-primary">{phase ? PHASE_LABELS[phase] : "Preparing…"}</span>
        <Button variant="ghost" size="sm" icon={<Square className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          className="h-full rounded-full bg-accent-cyan transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      {total > 0 && (
        <p className="cf-mono text-xs text-text-muted">
          {formatCount(processed)} / {formatCount(total)} files
        </p>
      )}
    </div>
  );
}
