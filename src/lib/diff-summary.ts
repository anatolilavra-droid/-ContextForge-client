export interface FileChange {
  path: string;
  insertions: number;
  deletions: number;
}

export interface DirectoryChange {
  dir: string;
  files: number;
  insertions: number;
  deletions: number;
}

export interface DiffSummary {
  format: "unified" | "stat" | "unknown";
  files: FileChange[];
  directories: DirectoryChange[];
  totals: { files: number; insertions: number; deletions: number };
  mostChanged: FileChange[];
  breadthWarning: string | null;
}

function emptySummary(): DiffSummary {
  return {
    format: "unknown",
    files: [],
    directories: [],
    totals: { files: 0, insertions: 0, deletions: 0 },
    mostChanged: [],
    breadthWarning: null,
  };
}

function parseUnifiedDiff(text: string): FileChange[] {
  const files: FileChange[] = [];
  let current: FileChange | null = null;

  for (const line of text.split("\n")) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (match) {
      if (current) files.push(current);
      current = { path: match[2], insertions: 0, deletions: 0 };
      continue;
    }
    if (!current) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) current.insertions += 1;
    else if (line.startsWith("-")) current.deletions += 1;
  }
  if (current) files.push(current);
  return files;
}

// `git diff --stat` truncates a wide diff to a fixed-width bar of +/- marks,
// so the mark counts don't sum to the reported total once a file has enough
// changes -- distribute the total proportionally to the +/- ratio instead of
// trusting the marks verbatim.
function parseStatFormat(text: string): FileChange[] {
  const files: FileChange[] = [];
  const lineRe = /^\s*(.+?)\s+\|\s+(\d+)\s+([+-]*)\s*$/;

  for (const line of text.split("\n")) {
    const match = lineRe.exec(line);
    if (!match) continue;
    const path = match[1].trim();
    const total = Number(match[2]);
    const marks = match[3];
    const plus = (marks.match(/\+/g) ?? []).length;
    const minus = (marks.match(/-/g) ?? []).length;

    if (plus + minus === 0) {
      files.push({ path, insertions: total, deletions: 0 });
      continue;
    }
    const ratio = total / (plus + minus);
    files.push({ path, insertions: Math.round(plus * ratio), deletions: Math.round(minus * ratio) });
  }
  return files;
}

function summarize(files: FileChange[], format: "unified" | "stat"): DiffSummary {
  const dirMap = new Map<string, DirectoryChange>();
  for (const file of files) {
    const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "(root)";
    const existing = dirMap.get(dir) ?? { dir, files: 0, insertions: 0, deletions: 0 };
    existing.files += 1;
    existing.insertions += file.insertions;
    existing.deletions += file.deletions;
    dirMap.set(dir, existing);
  }
  const directories = [...dirMap.values()].sort(
    (a, b) => b.insertions + b.deletions - (a.insertions + a.deletions),
  );

  const totals = files.reduce(
    (acc, file) => ({
      files: acc.files + 1,
      insertions: acc.insertions + file.insertions,
      deletions: acc.deletions + file.deletions,
    }),
    { files: 0, insertions: 0, deletions: 0 },
  );

  const mostChanged = [...files]
    .sort((a, b) => b.insertions + b.deletions - (a.insertions + a.deletions))
    .slice(0, 10);

  const breadthWarning =
    directories.length >= 5
      ? `This change touches ${directories.length} different directories -- worth double-checking it's really one logical change, not several bundled together.`
      : null;

  return { format, files, directories, totals, mostChanged, breadthWarning };
}

/**
 * Parses pasted `git diff` or `git diff --stat` / `git log --stat` output
 * into a structured, module-grouped summary. Deliberately not LLM-based --
 * the numbers come straight from the diff, so there's nothing to hallucinate
 * and nothing to send anywhere.
 */
export function parseDiffText(text: string): DiffSummary {
  const trimmed = text.trim();
  if (!trimmed) return emptySummary();

  if (/^diff --git /m.test(trimmed)) {
    return summarize(parseUnifiedDiff(trimmed), "unified");
  }

  const statFiles = parseStatFormat(trimmed);
  if (statFiles.length > 0) {
    return summarize(statFiles, "stat");
  }

  return emptySummary();
}
