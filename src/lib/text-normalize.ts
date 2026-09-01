export function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}

export function trimTrailingWhitespace(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
}

export function collapseBlankLines(source: string, maxConsecutive: number): string {
  if (maxConsecutive < 1) maxConsecutive = 1;
  const lines = source.split("\n");
  const output: string[] = [];
  let blankRun = 0;

  for (const line of lines) {
    if (line.trim().length === 0) {
      blankRun += 1;
      if (blankRun <= maxConsecutive) output.push("");
    } else {
      blankRun = 0;
      output.push(line);
    }
  }

  return output.join("\n");
}

export function safeNormalize(source: string, trimTrailing: boolean): string {
  let out = normalizeLineEndings(source);
  if (trimTrailing) out = trimTrailingWhitespace(out);
  return out;
}

/**
 * Heuristically detects binary content from a byte sample without decoding
 * the whole file as text: a NUL byte anywhere in the sample, or a high
 * proportion of non-printable / non-UTF8-friendly bytes, marks it binary.
 */
export function looksBinary(sample: Uint8Array): boolean {
  if (sample.length === 0) return false;

  let suspicious = 0;
  const len = sample.length;

  for (let i = 0; i < len; i += 1) {
    const byte = sample[i];
    if (byte === 0) return true;
    const isControl = byte < 9 || (byte > 13 && byte < 32);
    if (isControl) suspicious += 1;
  }

  return suspicious / len > 0.1;
}

export const BINARY_SNIFF_BYTES = 4096;
