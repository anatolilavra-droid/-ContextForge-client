import type { ReactNode } from "react";

export interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ title, actions, children, className = "", padded = true }: CardProps) {
  return (
    <div className={`cf-panel ${padded ? "p-4 sm:p-5" : ""} ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="cf-label">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
