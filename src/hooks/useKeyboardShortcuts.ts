import { useEffect, useRef } from "react";

export interface KeyboardShortcutHandlers {
  /** Ctrl/Cmd+Enter — start forging. */
  onForge?: () => void;
  /** Ctrl/Cmd+Shift+C — copy the forged bundle. */
  onCopy?: () => void;
  /** Ctrl/Cmd+Shift+S — download the forged bundle. */
  onDownload?: () => void;
  /** "/" — focus the explorer search field. */
  onFocusSearch?: () => void;
  /** Escape — cancel an in-progress forge, or close a focused panel. */
  onEscape?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const mod = event.ctrlKey || event.metaKey;
      const current = handlersRef.current;

      if (event.key === "Escape") {
        current.onEscape?.();
        return;
      }

      if (mod && event.key === "Enter") {
        event.preventDefault();
        current.onForge?.();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        current.onCopy?.();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        current.onDownload?.();
        return;
      }

      if (!mod && event.key === "/" && !isEditableTarget(event.target)) {
        event.preventDefault();
        current.onFocusSearch?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
