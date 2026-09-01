import type { RepoFileMeta, TreeEntry } from "../app/app-types";

interface MutableDir {
  kind: "dir";
  name: string;
  path: string;
  children: Map<string, MutableNode>;
}

interface MutableFile {
  kind: "file";
  name: string;
  path: string;
  fileId: string;
  included: boolean;
}

type MutableNode = MutableDir | MutableFile;

function dirHasIncludedDescendant(dir: MutableDir): boolean {
  for (const child of dir.children.values()) {
    if (child.kind === "file" && child.included) return true;
    if (child.kind === "dir" && dirHasIncludedDescendant(child)) return true;
  }
  return false;
}

function toEntries(dir: MutableDir): TreeEntry[] {
  const nodes = [...dir.children.values()];
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return nodes.map((node): TreeEntry => {
    if (node.kind === "dir") {
      return {
        kind: "dir",
        name: node.name,
        path: node.path,
        fileId: null,
        included: dirHasIncludedDescendant(node),
        children: toEntries(node),
      };
    }
    return {
      kind: "file",
      name: node.name,
      path: node.path,
      fileId: node.fileId,
      included: node.included,
      children: null,
    };
  });
}

/** Builds a sorted (dirs-first, case-insensitive) tree from flat repo-relative paths. */
export function buildTree(files: RepoFileMeta[]): TreeEntry[] {
  const root: MutableDir = { kind: "dir", name: "", path: "", children: new Map() };

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let cursor = root;

    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      const existing = cursor.children.get(segment);
      if (existing && existing.kind === "dir") {
        cursor = existing;
        continue;
      }
      const dir: MutableDir = {
        kind: "dir",
        name: segment,
        path: segments.slice(0, i + 1).join("/"),
        children: new Map(),
      };
      cursor.children.set(segment, dir);
      cursor = dir;
    }

    const leafName = segments[segments.length - 1] ?? file.path;
    cursor.children.set(leafName, {
      kind: "file",
      name: leafName,
      path: file.path,
      fileId: file.id,
      included: file.included,
    });
  }

  return toEntries(root);
}

export function renderAsciiTree(entries: TreeEntry[], includedOnly: boolean, rootLabel = "."): string {
  const lines: string[] = [`${rootLabel}/`];

  function walk(nodes: TreeEntry[], prefix: string): void {
    const visible = includedOnly ? nodes.filter((n) => n.included) : nodes;
    visible.forEach((node, index) => {
      const isLast = index === visible.length - 1;
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${node.name}${node.kind === "dir" ? "/" : ""}`);
      if (node.kind === "dir" && node.children) {
        walk(node.children, prefix + (isLast ? "    " : "│   "));
      }
    });
  }

  walk(entries, "");
  return lines.length > 1 ? lines.join("\n") : `${rootLabel}/ (no files)`;
}
