import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";

export interface ExportActionsProps {
  disabled: boolean;
  onCopy: () => Promise<boolean>;
  onDownload: () => void;
}

export function ExportActions({ disabled, onCopy, onDownload }: ExportActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    const ok = await onCopy();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button
        variant="secondary"
        icon={
          copied ? (
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )
        }
        onClick={() => void handleCopy()}
        disabled={disabled}
      >
        {copied ? "Copied" : "Copy Markdown"}
      </Button>
      <Button
        variant="primary"
        icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={onDownload}
        disabled={disabled}
      >
        Download .md
      </Button>
    </div>
  );
}
