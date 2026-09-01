import { useId } from "react";
import type { TokenBudget, TokenProvider } from "../../app/app-types";
import { computeBudgetFit } from "../../lib/budget";
import { formatCount } from "../../lib/file-size";

export interface TokenBudgetPanelProps {
  budget: TokenBudget;
  onChange: (budget: Partial<TokenBudget>) => void;
  gptTokens: number | null;
  claudeTokens: number | null;
  bundleCharCount: number | null;
}

const PROVIDERS: { id: TokenProvider; label: string }[] = [
  { id: "gpt", label: "GPT-style" },
  { id: "claude", label: "Claude-equivalent" },
  { id: "custom", label: "Custom" },
];

export function TokenBudgetPanel({ budget, onChange, gptTokens, claudeTokens, bundleCharCount }: TokenBudgetPanelProps) {
  const providerId = useId();

  const usedTokens =
    budget.provider === "gpt"
      ? gptTokens
      : budget.provider === "claude"
        ? claudeTokens
        : bundleCharCount !== null
          ? Math.ceil(bundleCharCount * Math.max(budget.customTokensPerChar, 0))
          : null;

  const fit =
    usedTokens !== null
      ? computeBudgetFit(usedTokens, budget.contextWindow, budget.reservedPromptTokens, budget.reservedResponseTokens)
      : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="cf-label mb-1.5 block" htmlFor={providerId}>
          Target provider
        </label>
        <select
          id={providerId}
          value={budget.provider}
          onChange={(event) => onChange({ provider: event.target.value as TokenProvider })}
          className="w-full rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {budget.provider === "custom" && (
        <NumberField
          label="Tokens per character"
          value={budget.customTokensPerChar}
          step={0.01}
          min={0}
          onChange={(v) => onChange({ customTokensPerChar: v })}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumberField
          label="Context window"
          value={budget.contextWindow}
          min={0}
          onChange={(v) => onChange({ contextWindow: v })}
        />
        <NumberField
          label="Reserved prompt"
          value={budget.reservedPromptTokens}
          min={0}
          onChange={(v) => onChange({ reservedPromptTokens: v })}
        />
        <NumberField
          label="Reserved response"
          value={budget.reservedResponseTokens}
          min={0}
          onChange={(v) => onChange({ reservedResponseTokens: v })}
        />
      </div>

      {usedTokens === null || !fit ? (
        <p className="text-xs text-text-muted">Forge a bundle to simulate the context budget.</p>
      ) : (
        <div
          role="status"
          className={`rounded-[12px] border p-3.5 ${fit.fits ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10"}`}
        >
          <p className={`text-sm font-medium ${fit.fits ? "text-success" : "text-danger"}`}>
            {fit.fits ? "Fits within the available context" : "Exceeds the available context"}
          </p>
          <p className="cf-mono mt-1 text-xs text-text-secondary">
            {formatCount(usedTokens)} used of {formatCount(fit.availableTokens)} available
          </p>
          <p className="cf-mono text-xs text-text-secondary">
            {fit.fits
              ? `${formatCount(fit.headroomTokens)} tokens remaining`
              : `${formatCount(fit.overrunTokens)} tokens over budget`}
          </p>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <div>
      <label className="cf-label mb-1.5 block" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        step={step ?? 1}
        onChange={(event) => onChange(Number(event.target.value))}
        className="cf-mono w-full rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
      />
    </div>
  );
}
