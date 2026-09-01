import { useId, useState, type ReactNode } from "react";

export interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} className="inline-flex">
        {children}
      </span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="animate-fade-in pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-border-strong bg-surface-elevated px-2.5 py-1.5 text-xs text-text-secondary shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}
