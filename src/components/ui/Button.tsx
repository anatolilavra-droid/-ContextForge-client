import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[12px] font-medium whitespace-nowrap transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan disabled:opacity-50 disabled:pointer-events-none select-none";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-cyan text-bg shadow-none hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(77,227,255,0.55)] active:translate-y-0 active:shadow-none",
  secondary:
    "bg-surface-raised text-text-primary border border-border-strong hover:bg-surface-elevated hover:-translate-y-px active:translate-y-0",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/15 hover:-translate-y-px active:translate-y-0",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, loading = false, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});
