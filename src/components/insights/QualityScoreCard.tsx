import { CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import type { RepoFileMeta, ScanStats } from "../../app/app-types";
import { scoreContextQuality } from "../../lib/context-quality";

export interface QualityScoreCardProps {
  stats: ScanStats;
  files: RepoFileMeta[];
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

export function QualityScoreCard({ stats, files }: QualityScoreCardProps) {
  const report = useMemo(() => scoreContextQuality(stats, files), [stats, files]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <div className={`cf-mono text-3xl font-semibold ${scoreTone(report.score)}`}>
          {report.score}
          <span className="text-base font-normal text-text-muted">/100</span>
        </div>
        <p className="text-xs text-text-muted">
          {report.noisePercent}% of scanned bytes are excluded as noise (dependencies, build output, binaries).
        </p>
      </div>

      <ul className="space-y-2.5">
        {report.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2.5 text-sm">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            )}
            <div>
              <div className="font-medium text-text-primary">{check.label}</div>
              <div className="text-xs text-text-secondary">{check.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
