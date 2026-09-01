export function sanitizeRelativePath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".");

  const cleaned: string[] = [];
  for (const segment of segments) {
    if (segment === "..") {
      cleaned.pop();
      continue;
    }
    cleaned.push(segment);
  }

  return cleaned.join("/");
}

export function fileNameOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

export function dirNameOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

export function extensionOf(name: string): string {
  const base = fileNameOf(name);
  const idx = base.lastIndexOf(".");
  if (idx <= 0) return "";
  return base.slice(idx + 1).toLowerCase();
}

/**
 * Finds the directory segments shared by every ingested path, so a root-level
 * file like `.gitignore` can be located even when the user's chosen folder
 * name (e.g. "my-repo/") prefixes every path.
 */
export function resolveRootPrefix(paths: string[]): string {
  if (paths.length === 0) return "";

  let common: string[] | null = null;
  for (const path of paths) {
    const segments = dirNameOf(path).split("/").filter(Boolean);
    if (common === null) {
      common = segments;
      continue;
    }
    let i = 0;
    while (i < common.length && i < segments.length && common[i] === segments[i]) i += 1;
    common = common.slice(0, i);
    if (common.length === 0) break;
  }

  return (common ?? []).join("/");
}

export function joinRootPath(root: string, name: string): string {
  return root ? `${root}/${name}` : name;
}

/**
 * Deterministically resolves duplicate relative paths (e.g. produced by
 * combining multiple drag-drop batches) by suffixing repeats with a stable
 * numeric index in first-seen order.
 */
export function dedupePaths(paths: string[]): string[] {
  const seen = new Map<string, number>();
  const result: string[] = [];

  for (const path of paths) {
    const count = seen.get(path) ?? 0;
    seen.set(path, count + 1);

    if (count === 0) {
      result.push(path);
      continue;
    }

    const dot = path.lastIndexOf(".");
    const slash = path.lastIndexOf("/");
    const suffix = ` (${count})`;
    if (dot > slash) {
      result.push(`${path.slice(0, dot)}${suffix}${path.slice(dot)}`);
    } else {
      result.push(`${path}${suffix}`);
    }
  }

  return result;
}
