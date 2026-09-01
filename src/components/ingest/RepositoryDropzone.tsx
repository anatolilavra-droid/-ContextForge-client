import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { UseRepositoryIntakeResult } from "../../hooks/useRepositoryIntake";
import type { IngestFileEntry } from "../../worker/worker-protocol";
import { FolderPicker } from "./FolderPicker";

export interface RepositoryDropzoneProps {
  intake: UseRepositoryIntakeResult;
  onFilesCollected: (entries: IngestFileEntry[]) => void;
}

export function RepositoryDropzone({ intake, onFilesCollected }: RepositoryDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const onDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      void (async () => {
        const entries = await intake.collectFromDataTransfer(event.dataTransfer);
        if (entries.length > 0) onFilesCollected(entries);
      })();
    },
    [intake, onFilesCollected],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void (async () => {
        const entries = intake.isDirectoryPickerSupported
          ? await intake.pickDirectory()
          : await intake.pickDirectoryViaInput();
        if (entries && entries.length > 0) onFilesCollected(entries);
      })();
    },
    [intake, onFilesCollected],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a repository folder or files here, or activate to choose a folder"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      className={`group relative mx-auto mt-10 flex w-full max-w-2xl flex-col items-center gap-5 overflow-hidden rounded-[16px] border-2 border-dashed px-8 py-16 text-center transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan ${
        isDragging
          ? "border-accent-cyan bg-accent-cyan-soft shadow-[0_0_0_1px_rgba(77,227,255,0.35),0_0_48px_-10px_rgba(77,227,255,0.5)]"
          : "border-border-strong bg-surface hover:bg-surface-raised"
      }`}
    >
      {isDragging && (
        <span
          aria-hidden="true"
          className="animate-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent-cyan/25 to-transparent"
        />
      )}
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-[14px] border transition-colors duration-150 ${
          isDragging ? "border-accent-cyan text-accent-cyan" : "border-border-strong text-text-muted"
        }`}
      >
        <UploadCloud className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-text-primary">Drop a repository folder or files here</p>
        <p className="max-w-sm text-xs text-text-secondary">
          Everything runs locally in your browser. Source code is read, packaged, and never uploaded anywhere.
        </p>
      </div>
      <FolderPicker intake={intake} onFilesCollected={onFilesCollected} />
    </div>
  );
}
