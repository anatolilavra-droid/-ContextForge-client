import { BINARY_SNIFF_BYTES, looksBinary } from "../lib/text-normalize";
import { joinRootPath, resolveRootPrefix } from "../lib/file-path";
import type { IngestFileEntry } from "./worker-protocol";

export interface IngestedFile {
  path: string;
  file: File;
  size: number;
  isBinary: boolean;
  readError: boolean;
}

export interface IngestResult {
  files: IngestedFile[];
  gitignoreContent: string | null;
  contextforgeignoreContent: string | null;
}

const BATCH_SIZE = 48;

export async function ingestFiles(
  entries: IngestFileEntry[],
  onProgress: (processed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<IngestResult | null> {
  const files: IngestedFile[] = [];
  let gitignoreContent: string | null = null;
  let contextforgeignoreContent: string | null = null;

  const rootPrefix = resolveRootPrefix(entries.map((e) => e.path));
  const gitignorePath = joinRootPath(rootPrefix, ".gitignore");
  const contextforgeignorePath = joinRootPath(rootPrefix, ".contextforgeignore");

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    if (isCancelled()) return null;
    const batch = entries.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (entry) => {
        const { path, file } = entry;
        let isBinary = false;
        let readError = false;

        try {
          const sampleBlob = file.slice(0, BINARY_SNIFF_BYTES);
          const buffer = await sampleBlob.arrayBuffer();
          isBinary = looksBinary(new Uint8Array(buffer));
        } catch {
          readError = true;
        }

        files.push({ path, file, size: file.size, isBinary, readError });

        if (path === gitignorePath || path === contextforgeignorePath) {
          try {
            const text = await file.text();
            if (path === gitignorePath) gitignoreContent = text;
            if (path === contextforgeignorePath) contextforgeignoreContent = text;
          } catch {
            // Ignore-file itself unreadable: treat as absent rather than failing the scan.
          }
        }
      }),
    );

    onProgress(Math.min(i + BATCH_SIZE, entries.length), entries.length);
    if (isCancelled()) return null;
  }

  return { files, gitignoreContent, contextforgeignoreContent };
}
