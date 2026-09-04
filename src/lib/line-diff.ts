export interface LineDiffStats {
  added: number;
  removed: number;
  unchanged: number;
  /** True when the inputs were too large for an exact diff and an O(n) approximation was used instead. */
  approximate: boolean;
}

// An exact LCS-based diff costs O(n*m) time and space. Cap the grid size so
// a huge file falls back to a cheap approximation instead of freezing the
// tab the "Diff summary" view runs on.
const MAX_DIFF_CELLS = 4_000_000;

function computeLcsGrid(a: string[], b: string[]): Uint32Array {
  const n = a.length;
  const m = b.length;
  const grid = new Uint32Array((n + 1) * (m + 1));
  const idx = (i: number, j: number): number => i * (m + 1) + j;

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      grid[idx(i, j)] =
        a[i] === b[j] ? grid[idx(i + 1, j + 1)] + 1 : Math.max(grid[idx(i + 1, j)], grid[idx(i, j + 1)]);
    }
  }

  return grid;
}

function exactDiff(a: string[], b: string[]): LineDiffStats {
  const grid = computeLcsGrid(a, b);
  const m = b.length;
  const idx = (i: number, j: number): number => i * (m + 1) + j;

  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      unchanged += 1;
      i += 1;
      j += 1;
    } else if (grid[idx(i + 1, j)] >= grid[idx(i, j + 1)]) {
      removed += 1;
      i += 1;
    } else {
      added += 1;
      j += 1;
    }
  }
  removed += a.length - i;
  added += b.length - j;

  return { added, removed, unchanged, approximate: false };
}

/**
 * A cheap O(n+m) multiset-difference approximation used only when the exact
 * LCS diff would be too expensive. It correctly counts *how many* lines
 * differ but, unlike the exact diff, ignores line order, so a large block
 * that only moved would be reported as a remove+add rather than unchanged.
 */
function approximateDiff(a: string[], b: string[]): LineDiffStats {
  const counts = new Map<string, number>();
  for (const line of a) counts.set(line, (counts.get(line) ?? 0) + 1);
  for (const line of b) counts.set(line, (counts.get(line) ?? 0) - 1);

  let added = 0;
  let removed = 0;
  for (const count of counts.values()) {
    if (count > 0) removed += count;
    else if (count < 0) added += -count;
  }

  const unchanged = Math.max(Math.min(a.length, b.length) - Math.min(added, removed), 0);
  return { added, removed, unchanged, approximate: true };
}

/** Line-level diff stats between two texts, computed locally (nothing leaves the browser). */
export function diffLineStats(original: string, forged: string): LineDiffStats {
  if (original === forged) {
    const lines = original.length === 0 ? 0 : original.split("\n").length;
    return { added: 0, removed: 0, unchanged: lines, approximate: false };
  }

  const a = original.split("\n");
  const b = forged.split("\n");

  if (a.length * b.length > MAX_DIFF_CELLS) {
    return approximateDiff(a, b);
  }

  return exactDiff(a, b);
}
