/**
 * Returns a backtick fence long enough that it cannot be confused with any
 * backtick run already present in `content`, so arbitrary source (including
 * markdown containing its own fenced blocks) can be embedded safely.
 */
export function chooseFence(content: string): string {
  const matches = content.match(/`{3,}/g);
  const longest = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  return "`".repeat(Math.max(3, longest + 1));
}

interface FenceState {
  inFence: boolean;
  fenceChar: string;
  fenceLen: number;
}

function fenceOpenerLength(line: string, char: "`" | "~"): number {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith(char)) return 0;
  let i = 0;
  while (trimmed[i] === char) i += 1;
  return i >= 3 ? i : 0;
}

/** Splits markdown source into lines tagged with whether they sit inside a fenced code block. */
export function markMarkdownFenceLines(source: string): { line: string; inFence: boolean }[] {
  const lines = source.split("\n");
  const state: FenceState = { inFence: false, fenceChar: "", fenceLen: 0 };
  const tagged: { line: string; inFence: boolean }[] = [];

  for (const line of lines) {
    if (!state.inFence) {
      const backtickLen = fenceOpenerLength(line, "`");
      const tildeLen = fenceOpenerLength(line, "~");
      if (backtickLen > 0) {
        state.inFence = true;
        state.fenceChar = "`";
        state.fenceLen = backtickLen;
        tagged.push({ line, inFence: true });
        continue;
      }
      if (tildeLen > 0) {
        state.inFence = true;
        state.fenceChar = "~";
        state.fenceLen = tildeLen;
        tagged.push({ line, inFence: true });
        continue;
      }
      tagged.push({ line, inFence: false });
    } else {
      tagged.push({ line, inFence: true });
      const closeLen = fenceOpenerLength(line, state.fenceChar as "`" | "~");
      if (closeLen >= state.fenceLen) {
        state.inFence = false;
        state.fenceChar = "";
        state.fenceLen = 0;
      }
    }
  }

  return tagged;
}

/** Removes `<!-- ... -->` spans, but only when they lie entirely outside fenced code blocks. */
export function stripHtmlCommentsOutsideFences(source: string): string {
  const tagged = markMarkdownFenceLines(source);
  const withNewlines = tagged.map((t, i) => (i < tagged.length - 1 ? `${t.line}\n` : t.line));
  const joined = withNewlines.join("");

  const lineStartOffsets: number[] = [];
  let offset = 0;
  for (const l of withNewlines) {
    lineStartOffsets.push(offset);
    offset += l.length;
  }

  const lineIndexForOffset = (pos: number): number => {
    let lo = 0;
    let hi = lineStartOffsets.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (lineStartOffsets[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const commentPattern = /<!--[\s\S]*?-->/g;
  let match: RegExpExecArray | null;
  let output = "";
  let lastIndex = 0;

  while ((match = commentPattern.exec(joined)) !== null) {
    const startLine = lineIndexForOffset(match.index);
    const endLine = lineIndexForOffset(match.index + match[0].length - 1);
    const spansFence = tagged.slice(startLine, endLine + 1).some((t) => t.inFence);
    if (!spansFence) {
      output += joined.slice(lastIndex, match.index);
      lastIndex = match.index + match[0].length;
    }
  }
  output += joined.slice(lastIndex);
  return output;
}

export function collapseMarkdownBlankLines(source: string, maxConsecutive: number): string {
  const tagged = markMarkdownFenceLines(source);
  const output: string[] = [];
  let blankRun = 0;

  for (const { line, inFence } of tagged) {
    if (!inFence && line.trim().length === 0) {
      blankRun += 1;
      if (blankRun <= maxConsecutive) output.push("");
    } else {
      blankRun = 0;
      output.push(line);
    }
  }

  return output.join("\n");
}
