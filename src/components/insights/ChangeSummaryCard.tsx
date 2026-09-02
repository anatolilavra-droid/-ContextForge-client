import { useId, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { parseDiffText } from "../../lib/diff-summary";

const PLACEHOLDER = `Paste the output of "git diff" or "git diff --stat" here.

Nothing is sent anywhere -- this is parsed entirely in your browser.`;

export function ChangeSummaryCard() {
  const [text, setText] = useState("");
  const textareaId = useId();

  const summary = useMemo(() => parseDiffText(text), [text]);
  const hasInput = text.trim().length > 0;
  const hasResult = summary.files.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary">
        Paste a <code className="cf-mono">git diff</code> or <code className="cf-mono">git diff --stat</code> to see
        what changed, grouped by directory -- useful for a quick self-review before you ship, or to sanity-check an
        AI-generated diff before merging it.
      </p>

      <div>
        <label className="sr-only" htmlFor={textareaId}>
          Paste a git diff
        </label>
        <textarea
          id={textareaId}
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={PLACEHOLDER}
          className="cf-mono w-full resize-y rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        />
      </div>

      {hasInput && !hasResult && (
        <p className="text-xs text-danger">
          Couldn't parse that as a git diff or `--stat` summary. Paste the raw output of `git diff` or
          `git diff --stat`, unedited.
        </p>
      )}

      {hasResult && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Files" value={summary.totals.files} />
            <Stat label="Insertions" value={summary.totals.insertions} tone="text-success" prefix="+" />
            <Stat label="Deletions" value={summary.totals.deletions} tone="text-danger" prefix="-" />
            <Stat label="Directories touched" value={summary.directories.length} />
          </div>

          {summary.breadthWarning && (
            <div className="flex items-start gap-2.5 rounded-[10px] border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{summary.breadthWarning}</span>
            </div>
          )}

          <div>
            <h4 className="cf-label mb-2">By directory</h4>
            <ul className="space-y-1.5">
              {summary.directories.map((dir) => (
                <li key={dir.dir} className="flex items-center justify-between gap-3 text-xs">
                  <span className="cf-mono truncate text-text-primary">{dir.dir}</span>
                  <span className="cf-mono shrink-0 text-text-muted">
                    {dir.files} file{dir.files === 1 ? "" : "s"} ·{" "}
                    <span className="text-success">+{dir.insertions}</span>{" "}
                    <span className="text-danger">-{dir.deletions}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="cf-label mb-2">Most-changed files</h4>
            <ul className="space-y-1.5">
              {summary.mostChanged.map((file) => (
                <li key={file.path} className="flex items-center justify-between gap-3 text-xs">
                  <span className="cf-mono truncate text-text-primary">{file.path}</span>
                  <span className="cf-mono shrink-0 text-text-muted">
                    <span className="text-success">+{file.insertions}</span>{" "}
                    <span className="text-danger">-{file.deletions}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone, prefix }: { label: string; value: number; tone?: string; prefix?: string }) {
  return (
    <div>
      <div className={`cf-mono text-lg font-semibold ${tone ?? "text-text-primary"}`}>
        {prefix ?? ""}
        {value}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
