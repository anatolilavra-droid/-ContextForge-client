import { useCallback, useMemo } from "react";
import { dedupePaths, sanitizeRelativePath } from "../lib/file-path";
import type { IngestFileEntry } from "../worker/worker-protocol";

function finalize(entries: IngestFileEntry[]): IngestFileEntry[] {
  const sanitized = dedupePaths(entries.map((e) => sanitizeRelativePath(e.path)));
  return entries.map((e, i) => ({ path: sanitized[i], file: e.file }));
}

function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = (): void => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
          return;
        }
        all.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

async function walkFileSystemEntry(entry: FileSystemEntry, basePath: string, out: IngestFileEntry[]): Promise<void> {
  const path = basePath ? `${basePath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    try {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      out.push({ path, file });
    } catch {
      // Unreadable entry (permission denied, race with filesystem changes): skip gracefully.
    }
    return;
  }

  if (entry.isDirectory) {
    try {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await readAllDirectoryEntries(reader);
      await Promise.all(children.map((child) => walkFileSystemEntry(child, path, out)));
    } catch {
      // Unreadable directory: skip its subtree gracefully.
    }
  }
}

async function walkDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  basePath: string,
  out: IngestFileEntry[],
): Promise<void> {
  try {
    for await (const [name, child] of handle.entries()) {
      const path = basePath ? `${basePath}/${name}` : name;
      if (child.kind === "file") {
        try {
          const file = await (child as FileSystemFileHandle).getFile();
          out.push({ path, file });
        } catch {
          // Unreadable file: skip gracefully.
        }
      } else {
        await walkDirectoryHandle(child as FileSystemDirectoryHandle, path, out);
      }
    }
  } catch {
    // Unreadable directory: skip its subtree gracefully.
  }
}

function fileListToEntries(files: FileList): IngestFileEntry[] {
  const out: IngestFileEntry[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    out.push({ path: file.webkitRelativePath || file.name, file });
  }
  return out;
}

function openFileInput(options: { directory: boolean }): Promise<IngestFileEntry[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    if (options.directory) input.setAttribute("webkitdirectory", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";

    let settled = false;
    const cleanup = (): void => {
      input.remove();
    };
    const settle = (value: IngestFileEntry[] | null): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    input.addEventListener("change", () => {
      const files = input.files;
      settle(files && files.length > 0 ? finalize(fileListToEntries(files)) : null);
    });
    input.addEventListener("cancel", () => settle(null));

    document.body.appendChild(input);
    input.click();
  });
}

export interface UseRepositoryIntakeResult {
  isDirectoryPickerSupported: boolean;
  isDirectoryInputSupported: boolean;
  pickDirectory: () => Promise<IngestFileEntry[] | null>;
  pickFiles: () => Promise<IngestFileEntry[] | null>;
  pickDirectoryViaInput: () => Promise<IngestFileEntry[] | null>;
  collectFromDataTransfer: (dataTransfer: DataTransfer) => Promise<IngestFileEntry[]>;
}

export function useRepositoryIntake(): UseRepositoryIntakeResult {
  const isDirectoryPickerSupported = useMemo(() => typeof window.showDirectoryPicker === "function", []);
  const isDirectoryInputSupported = useMemo(() => "webkitdirectory" in document.createElement("input"), []);

  const pickDirectory = useCallback(async (): Promise<IngestFileEntry[] | null> => {
    if (!window.showDirectoryPicker) return null;
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      const out: IngestFileEntry[] = [];
      await walkDirectoryHandle(handle, handle.name, out);
      return finalize(out);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      throw error;
    }
  }, []);

  const pickFiles = useCallback((): Promise<IngestFileEntry[] | null> => openFileInput({ directory: false }), []);

  const pickDirectoryViaInput = useCallback(
    (): Promise<IngestFileEntry[] | null> => openFileInput({ directory: true }),
    [],
  );

  const collectFromDataTransfer = useCallback(async (dataTransfer: DataTransfer): Promise<IngestFileEntry[]> => {
    const out: IngestFileEntry[] = [];
    const items = dataTransfer.items;

    if (items && items.length > 0 && typeof items[0]?.webkitGetAsEntry === "function") {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      await Promise.all(entries.map((entry) => walkFileSystemEntry(entry, "", out)));
    } else {
      out.push(...fileListToEntries(dataTransfer.files));
    }

    return finalize(out);
  }, []);

  return {
    isDirectoryPickerSupported,
    isDirectoryInputSupported,
    pickDirectory,
    pickFiles,
    pickDirectoryViaInput,
    collectFromDataTransfer,
  };
}
