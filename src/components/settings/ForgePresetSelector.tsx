import { AlertTriangle, Check } from "lucide-react";
import type { ForgePresetId } from "../../app/app-types";
import { PRESET_DESCRIPTIONS, PRESET_LABELS } from "../../lib/defaults";

const PRESETS: ForgePresetId[] = ["safe", "balanced", "architecture", "maximum"];

export interface ForgePresetSelectorProps {
  preset: ForgePresetId;
  onSelect: (preset: ForgePresetId) => void;
}

export function ForgePresetSelector({ preset, onSelect }: ForgePresetSelectorProps) {
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="cf-label mb-2">Forge preset</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Forge preset">
          {PRESETS.map((id) => {
            const active = id === preset;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(id)}
                className={`flex flex-col gap-1 rounded-[12px] border p-3.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan ${
                  active
                    ? "border-accent-cyan bg-accent-cyan-soft"
                    : "border-border bg-surface-raised hover:border-border-strong hover:bg-surface-elevated"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${active ? "text-accent-cyan" : "text-text-primary"}`}>
                    {PRESET_LABELS[id]}
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-accent-cyan" aria-hidden="true" />}
                </span>
                <span className="text-xs leading-snug text-text-secondary">{PRESET_DESCRIPTIONS[id]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {preset === "maximum" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[12px] border border-warning/40 bg-warning/10 p-3.5"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-warning">
            Maximum compression intentionally removes implementation detail. Function and method bodies are
            replaced with stubs — the forged bundle will not reflect runtime behavior.
          </p>
        </div>
      )}
    </div>
  );
}
