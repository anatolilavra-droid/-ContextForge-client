import { useId } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled = false }: SwitchProps) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="flex cursor-pointer items-start justify-between gap-4 py-2.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-text-primary">{label}</span>
        {description && <span className="text-xs leading-snug text-text-secondary">{description}</span>}
      </span>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan disabled:opacity-50 ${
          checked ? "border-accent-cyan bg-accent-cyan/80" : "border-border-strong bg-surface-elevated"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg shadow-sm transition-transform duration-150 ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
