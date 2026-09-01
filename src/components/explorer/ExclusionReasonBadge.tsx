import type { ExclusionReason } from "../../app/app-types";
import { Tooltip } from "../ui/Tooltip";

const CODE_LABELS: Record<ExclusionReason["code"], string> = {
  "builtin-ignore": "Built-in",
  gitignore: ".gitignore",
  contextforgeignore: ".contextforgeignore",
  "user-ignore": "Custom rule",
  "binary-detected": "Binary",
  "max-file-size": "Too large",
  "max-total-size": "Budget",
  "excluded-tests": "Tests off",
  "excluded-config": "Config off",
  "excluded-markdown": "Markdown off",
  "excluded-lockfile": "Lockfile",
  "excluded-sourcemap": "Source map",
  "excluded-fixture": "Fixture",
  unreadable: "Unreadable",
};

export function ExclusionReasonBadge({ reason }: { reason: ExclusionReason }) {
  return (
    <Tooltip content={reason.detail}>
      <span className="cf-mono inline-flex items-center rounded-[6px] border border-border-strong bg-surface-elevated px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
        {CODE_LABELS[reason.code]}
      </span>
    </Tooltip>
  );
}
