import { ChevronRight, File, Folder } from "lucide-react";
import type { RepoFileMeta, TreeEntry } from "../../app/app-types";
import { ExclusionReasonBadge } from "./ExclusionReasonBadge";

export interface TreeNodeProps {
  entry: TreeEntry;
  depth: number;
  expanded: Set<string> | null;
  onToggleDir: (path: string) => void;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  metaByPath: Map<string, RepoFileMeta>;
}

export function TreeNode({ entry, depth, expanded, onToggleDir, selectedPath, onSelectFile, metaByPath }: TreeNodeProps) {
  const indentStyle = { paddingLeft: `${depth * 16 + 8}px` };

  if (entry.kind === "dir") {
    const isOpen = expanded === null ? true : expanded.has(entry.path);
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleDir(entry.path)}
          style={indentStyle}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-1.5 rounded-[8px] py-1 pr-2 text-left text-sm text-text-secondary transition-colors duration-150 hover:bg-surface-raised hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
          <Folder className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
          <span className="cf-mono truncate text-xs">{entry.name}</span>
        </button>
        {isOpen && entry.children && (
          <div role="group">
            {entry.children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleDir={onToggleDir}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                metaByPath={metaByPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const meta = metaByPath.get(entry.path);
  const isSelected = selectedPath === entry.path;

  return (
    <button
      type="button"
      onClick={() => onSelectFile(entry.path)}
      style={indentStyle}
      aria-current={isSelected ? "true" : undefined}
      className={`flex w-full items-center gap-1.5 rounded-[8px] py-1 pr-2 text-left text-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan ${
        isSelected
          ? "bg-accent-cyan-soft text-accent-cyan"
          : entry.included
            ? "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
            : "text-text-muted hover:bg-surface-raised"
      }`}
    >
      <File className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className={`cf-mono truncate text-xs ${!entry.included ? "line-through decoration-text-muted/60" : ""}`}>
        {entry.name}
      </span>
      {meta && !meta.included && meta.exclusionReason && (
        <span className="ml-auto shrink-0">
          <ExclusionReasonBadge reason={meta.exclusionReason} />
        </span>
      )}
    </button>
  );
}
