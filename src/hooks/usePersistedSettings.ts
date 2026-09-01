import { useEffect, useReducer } from "react";
import type { ForgeLimits, ForgePresetId, ForgeSettings, IgnoreRuleSettings, TokenBudget } from "../app/app-types";
import { createSettingsForPreset, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type ToggleKey } from "../lib/defaults";

function loadPersistedSettings(): ForgeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ForgeSettings>;
    const base = createSettingsForPreset(parsed.preset ?? DEFAULT_SETTINGS.preset);
    return {
      preset: base.preset,
      toggles: { ...base.toggles, ...parsed.toggles },
      limits: { ...base.limits, ...parsed.limits },
      budget: { ...base.budget, ...parsed.budget },
      ignoreRules: { ...base.ignoreRules, ...parsed.ignoreRules },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type SettingsAction =
  | { type: "SET_PRESET"; preset: ForgePresetId }
  | { type: "TOGGLE"; key: ToggleKey }
  | { type: "SET_LIMITS"; limits: Partial<ForgeLimits> }
  | { type: "SET_BUDGET"; budget: Partial<TokenBudget> }
  | { type: "SET_IGNORE_RULES"; ignoreRules: Partial<IgnoreRuleSettings> }
  | { type: "RESET_TO_DEFAULTS" };

function settingsReducer(state: ForgeSettings, action: SettingsAction): ForgeSettings {
  switch (action.type) {
    case "SET_PRESET":
      return createSettingsForPreset(action.preset, state);
    case "TOGGLE":
      return { ...state, toggles: { ...state.toggles, [action.key]: !state.toggles[action.key] } };
    case "SET_LIMITS":
      return { ...state, limits: { ...state.limits, ...action.limits } };
    case "SET_BUDGET":
      return { ...state, budget: { ...state.budget, ...action.budget } };
    case "SET_IGNORE_RULES":
      return { ...state, ignoreRules: { ...state.ignoreRules, ...action.ignoreRules } };
    case "RESET_TO_DEFAULTS":
      return createSettingsForPreset("balanced");
    default:
      return state;
  }
}

export interface UsePersistedSettingsResult {
  settings: ForgeSettings;
  setPreset: (preset: ForgePresetId) => void;
  toggle: (key: ToggleKey) => void;
  setLimits: (limits: Partial<ForgeLimits>) => void;
  setBudget: (budget: Partial<TokenBudget>) => void;
  setIgnoreRules: (ignoreRules: Partial<IgnoreRuleSettings>) => void;
  resetToDefaults: () => void;
}

export function usePersistedSettings(): UsePersistedSettingsResult {
  const [settings, dispatch] = useReducer(settingsReducer, undefined, loadPersistedSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable (private mode, quota); settings simply won't persist across sessions.
    }
  }, [settings]);

  return {
    settings,
    setPreset: (preset) => dispatch({ type: "SET_PRESET", preset }),
    toggle: (key) => dispatch({ type: "TOGGLE", key }),
    setLimits: (limits) => dispatch({ type: "SET_LIMITS", limits }),
    setBudget: (budget) => dispatch({ type: "SET_BUDGET", budget }),
    setIgnoreRules: (ignoreRules) => dispatch({ type: "SET_IGNORE_RULES", ignoreRules }),
    resetToDefaults: () => dispatch({ type: "RESET_TO_DEFAULTS" }),
  };
}
