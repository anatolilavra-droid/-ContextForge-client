import { Copy, Download, Flame, Square } from "lucide-react";
import { formatCount, formatPercent } from "../../lib/file-size";
import { Button } from "../ui/Button";

export interface BottomActionBarProps {
  fileCount: number;
  rawTokens: number;
  forgedTokens: number | null;
  percentSaved: number | null;
  isForging: boolean;
  canForge: boolean;
  hasBundle: boolean;
  onForge: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function BottomActionBar({
  fileCount,
  rawTokens,
  forgedTokens,
  percentSaved,
  isForging,
  canForge,
  hasBundle,
  onForge,
  onCancel,
  onCopy,
  onDownload,
}: BottomActionBarProps) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <span className="cf-mono text-text-secondary">
            <span className="text-text-primary">{formatCount(fileCount)}</span> files
          </span>
          <span className="cf-mono text-text-secondary">
            <span className="text-text-primary">{formatCount(rawTokens)}</span> raw tokens
          </span>
          {forgedTokens !== null && (
            <span className="cf-mono text-text-secondary">
              <span className="text-text-primary">{formatCount(forgedTokens)}</span> forged tokens
            </span>
          )}
          {percentSaved !== null && <span className="cf-mono text-success">{formatPercent(percentSaved)} saved</span>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={onCopy}
            disabled={!hasBundle}
          >
            Copy Markdown
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={onDownload}
            disabled={!hasBundle}
          >
            Download .md
          </Button>
          {isForging ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Square className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Flame className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={onForge}
              disabled={!canForge}
            >
              Forge Context
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
