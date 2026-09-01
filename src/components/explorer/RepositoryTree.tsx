import { Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { RepoFileMeta, TreeEntry } from "../../app/app-types";
import { EmptyState } from "../ui/EmptyState";
import { TreeNode } from "./TreeNode";

export type ExplorerTab = "included" | "excluded";

export interface RepositoryTreeProps {
  tree: TreeEntry[];
  files: RepoFileMeta[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function filterTree(entries: TreeEntry[], mode: ExplorerTab, query: string): TreeEntry[] {
  const q = query.trim().toLowerCase();

  function walk(nodes: TreeEntry[]): TreeEntry[] {
    const out: TreeEntry[] = [];
    for (const node of nodes) {
      if (node.kind === "file") {
        const matchesMode = mode === "included" ? node.included : !node.included;
        const matchesQuery = q === "" || node.path.toLowerCase().includes(q);
        if (matchesMode && matchesQuery) out.push(node);
      } else {
        const children = node.children ? walk(node.children) : [];
        if (children.length > 0) out.push({ ...node, children });
      }
    }
    return out;
  }

  return walk(entries);
}

function countLeaves(entries: TreeEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.kind === "file") count += 1;
    else if (entry.children) count += countLeaves(entry.children);
  }
  return count;
}

export function RepositoryTree({ tree, files, selectedPath, onSelectFile }: RepositoryTreeProps) {
  const [tab, setTab] = useState<ExplorerTab>("included");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpanded(new Set(tree.filter((e) => e.kind === "dir").map((e) => e.path)));
  }, [tree]);

  const metaByPath = useMemo(() => new Map(files.map((f) => [f.path, f] as const)), [files]);
  const includedCount = useMemo(() => files.filter((f) => f.included).length, [files]);
  const excludedCount = files.length - includedCount;

  const filtered = useMemo(() => filterTree(tree, tab, query), [tree, tab, query]);
  const visibleCount = useMemo(() => countLeaves(filtered), [filtered]);
  const effectiveExpanded = query.trim() ? null : expanded;

  const toggleDir = (path: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border p-2" role="tablist" aria-label="File list">
        <TabButton active={tab === "included"} onClick={() => setTab("included")}>
          Included <span className="cf-mono text-text-muted">({includedCount})</span>
        </TabButton>
        <TabButton active={tab === "excluded"} onClick={() => setTab("excluded")}>
          Excluded <span className="cf-mono text-text-muted">({excludedCount})</span>
        </TabButton>
      </div>

      <div className="border-b border-border p-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            id="explorer-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search paths…"
            aria-label="Search file paths"
            className="w-full rounded-[10px] border border-border-strong bg-surface-raised py-1.5 pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5" role="tree" aria-label={`${tab} files`}>
        {filtered.length === 0 ? (
          <EmptyState
            title={tab === "included" ? "No included files" : "No excluded files"}
            description={query ? "No paths match your search." : undefined}
          />
        ) : (
          filtered.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              expanded={effectiveExpanded}
              onToggleDir={toggleDir}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              metaByPath={metaByPath}
            />
          ))
        )}
      </div>
      <p className="cf-mono border-t border-border px-3 py-1.5 text-[11px] text-text-muted">{visibleCount} shown</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan ${
        active ? "bg-accent-cyan-soft text-accent-cyan" : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
