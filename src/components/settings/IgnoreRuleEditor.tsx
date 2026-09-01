import { useId } from "react";
import type { ForgeLimits, IgnoreRuleSettings } from "../../app/app-types";

export interface IgnoreRuleEditorProps {
  ignoreRules: IgnoreRuleSettings;
  onChangeIgnoreRules: (rules: Partial<IgnoreRuleSettings>) => void;
  limits: ForgeLimits;
  onChangeLimits: (limits: Partial<ForgeLimits>) => void;
}

function linesToPatterns(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function IgnoreRuleEditor({ ignoreRules, onChangeIgnoreRules, limits, onChangeLimits }: IgnoreRuleEditorProps) {
  const ignoreId = useId();
  const includeId = useId();
  const maxFileId = useId();
  const maxTotalId = useId();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="cf-label mb-1.5 block" htmlFor={maxFileId}>
            Maximum file size (KB)
          </label>
          <input
            id={maxFileId}
            type="number"
            min={1}
            value={Math.round(limits.maxFileSizeBytes / 1024)}
            onChange={(event) => onChangeLimits({ maxFileSizeBytes: Math.max(1, Number(event.target.value)) * 1024 })}
            className="cf-mono w-full rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
          />
        </div>
        <div>
          <label className="cf-label mb-1.5 block" htmlFor={maxTotalId}>
            Maximum total source (MB)
          </label>
          <input
            id={maxTotalId}
            type="number"
            min={1}
            value={Math.round(limits.maxTotalSourceBytes / (1024 * 1024))}
            onChange={(event) =>
              onChangeLimits({ maxTotalSourceBytes: Math.max(1, Number(event.target.value)) * 1024 * 1024 })
            }
            className="cf-mono w-full rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
          />
        </div>
      </div>

      <div>
        <label className="cf-label mb-1.5 block" htmlFor={ignoreId}>
          Additional ignore patterns
        </label>
        <textarea
          id={ignoreId}
          rows={4}
          defaultValue={ignoreRules.customIgnorePatterns.join("\n")}
          onBlur={(event) => onChangeIgnoreRules({ customIgnorePatterns: linesToPatterns(event.target.value) })}
          placeholder={"*.generated.ts\nsrc/legacy/"}
          className="cf-mono w-full resize-y rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        />
        <p className="mt-1.5 text-xs text-text-muted">
          One gitignore-style pattern per line. Applied after .gitignore and .contextforgeignore.
        </p>
      </div>
      <div>
        <label className="cf-label mb-1.5 block" htmlFor={includeId}>
          Force-include patterns
        </label>
        <textarea
          id={includeId}
          rows={3}
          defaultValue={ignoreRules.forceIncludePatterns.join("\n")}
          onBlur={(event) => onChangeIgnoreRules({ forceIncludePatterns: linesToPatterns(event.target.value) })}
          placeholder={"dist/manifest.json"}
          className="cf-mono w-full resize-y rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        />
        <p className="mt-1.5 text-xs text-text-muted">
          Overrides ignore rules and exclusion toggles. Binary detection and size limits still apply.
        </p>
      </div>
    </div>
  );
}
