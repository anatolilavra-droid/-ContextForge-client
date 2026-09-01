import type { ForgePresetId, ForgeSettings } from "../../app/app-types";
import { TOGGLE_META, type ToggleKey } from "../../lib/defaults";
import { Switch } from "../ui/Switch";

export interface TransformToggleListProps {
  settings: ForgeSettings;
  preset: ForgePresetId;
  onToggle: (key: ToggleKey) => void;
}

export function TransformToggleList({ settings, preset, onToggle }: TransformToggleListProps) {
  const visible = TOGGLE_META.filter((meta) => meta.key !== "excludeFixturesInMax" || preset === "maximum");

  return (
    <div className="divide-y divide-border">
      {visible.map((meta) => (
        <Switch
          key={meta.key}
          checked={settings.toggles[meta.key]}
          onChange={() => onToggle(meta.key)}
          label={meta.label}
          description={meta.impact}
        />
      ))}
    </div>
  );
}
