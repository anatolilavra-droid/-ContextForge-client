import { ShieldCheck } from "lucide-react";

export function PrivacyBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface-raised px-3 py-1.5">
      <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
      <span className="cf-label text-text-secondary">Local-only</span>
      <span className="h-3 w-px bg-border-strong" aria-hidden="true" />
      <span className="cf-mono text-xs text-text-muted">0 files sent</span>
    </div>
  );
}
