import { FileText, FolderUp } from "lucide-react";
import type { UseRepositoryIntakeResult } from "../../hooks/useRepositoryIntake";
import type { IngestFileEntry } from "../../worker/worker-protocol";
import { Button } from "../ui/Button";

export interface FolderPickerProps {
  intake: UseRepositoryIntakeResult;
  onFilesCollected: (entries: IngestFileEntry[]) => void;
}

export function FolderPicker({ intake, onFilesCollected }: FolderPickerProps) {
  const handlePickFolder = async (): Promise<void> => {
    const entries = intake.isDirectoryPickerSupported
      ? await intake.pickDirectory()
      : await intake.pickDirectoryViaInput();
    if (entries && entries.length > 0) onFilesCollected(entries);
  };

  const handlePickFiles = async (): Promise<void> => {
    const entries = await intake.pickFiles();
    if (entries && entries.length > 0) onFilesCollected(entries);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <Button
        variant="secondary"
        size="sm"
        icon={<FolderUp className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={(event) => {
          event.stopPropagation();
          void handlePickFolder();
        }}
      >
        Select folder
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={(event) => {
          event.stopPropagation();
          void handlePickFiles();
        }}
      >
        Select files
      </Button>
    </div>
  );
}
