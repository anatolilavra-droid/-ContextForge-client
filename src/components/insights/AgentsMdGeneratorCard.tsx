import { useId, useMemo, useState } from "react";
import type { RepoFileMeta, ScanStats } from "../../app/app-types";
import { generateAgentsMd } from "../../lib/agents-md-generator";
import { copyToClipboard } from "../../lib/clipboard";
import { downloadMarkdown } from "../../lib/download";
import { ExportActions } from "../output/ExportActions";

export interface AgentsMdGeneratorCardProps {
  stats: ScanStats;
  files: RepoFileMeta[];
  onNotify: (message: string, tone: "success" | "error" | "info") => void;
}

export function AgentsMdGeneratorCard({ stats, files, onNotify }: AgentsMdGeneratorCardProps) {
  const [projectName, setProjectName] = useState("");
  const nameId = useId();

  const draft = useMemo(() => generateAgentsMd(stats, files, { projectName }), [stats, files, projectName]);

  const handleCopy = async (): Promise<boolean> => {
    const ok = await copyToClipboard(draft);
    onNotify(ok ? "AGENTS.md copied to clipboard." : "Copy failed. Try downloading instead.", ok ? "success" : "error");
    return ok;
  };

  const handleDownload = (): void => {
    downloadMarkdown("AGENTS.md", draft);
    onNotify("Downloaded AGENTS.md", "success");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary">
        A draft AGENTS.md / CLAUDE.md built only from facts in the current scan -- detected languages, entry points,
        layout, and test locations. Every gap it can't infer is left as an explicit TODO instead of guessed.
      </p>

      <div>
        <label className="cf-label mb-1.5 block" htmlFor={nameId}>
          Project name (optional)
        </label>
        <input
          id={nameId}
          type="text"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="e.g. Widget API"
          className="w-full rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        />
      </div>

      <ExportActions disabled={false} onCopy={handleCopy} onDownload={handleDownload} />

      <pre className="cf-mono max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-border bg-surface-raised px-4 py-4 text-xs leading-relaxed text-text-primary">
        {draft}
      </pre>
    </div>
  );
}
