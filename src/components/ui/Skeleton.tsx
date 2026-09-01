export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-skeleton rounded-[8px] bg-[length:200%_100%] bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_25%,rgba(148,163,184,0.16)_37%,rgba(148,163,184,0.08)_63%)] ${className}`}
    />
  );
}
