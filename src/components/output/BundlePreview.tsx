import { FileText } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "../ui/EmptyState";

export interface BundlePreviewProps {
  bundleMarkdown: string | null;
}

const MAX_PREVIEW_CHARS = 400_000;

export function BundlePreview({ bundleMarkdown }: BundlePreviewProps) {
  const { text, truncated } = useMemo(() => {
    if (!bundleMarkdown) return { text: "", truncated: false };
    if (bundleMarkdown.length <= MAX_PREVIEW_CHARS) return { text: bundleMarkdown, truncated: false };
    return { text: bundleMarkdown.slice(0, MAX_PREVIEW_CHARS), truncated: true };
  }, [bundleMarkdown]);

  if (!bundleMarkdown) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" aria-hidden="true" />}
        title="No bundle yet"
        description="Forge the context to generate the Markdown bundle preview."
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <pre className="cf-mono flex-1 overflow-auto whitespace-pre-wrap break-words px-4 py-4 text-xs leading-relaxed text-text-primary">
        {text}
      </pre>
      {truncated && (
        <p className="cf-mono border-t border-border px-4 py-1.5 text-[11px] text-warning">
          Preview truncated for display. Copy or download to get the full bundle.
        </p>
      )}
    </div>
  );
}
