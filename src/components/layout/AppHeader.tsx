import { Boxes, RotateCcw } from "lucide-react";
import { PrivacyBadge } from "../ingest/PrivacyBadge";
import { Button } from "../ui/Button";

export interface AppHeaderProps {
  hasRepository: boolean;
  onReset: () => void;
}

export function AppHeader({ hasRepository, onReset }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border-strong bg-surface-raised text-accent-cyan">
            <Boxes className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-medium tracking-tight text-text-primary">ContextForge</span>
        </div>
        <div className="flex items-center gap-3">
          <PrivacyBadge />
          {hasRepository && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={onReset}
            >
              New repository
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
