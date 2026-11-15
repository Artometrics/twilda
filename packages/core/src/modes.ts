/**
 * The three modes (presets) a site can be in. Kept in its own file so the site schema
 * can name them without importing the presets, which import the site schema.
 */
export const PRESET_IDS = ["corporate", "magazine", "leadgen"] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const DEFAULT_MODE: PresetId = "magazine";

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && (PRESET_IDS as readonly string[]).includes(value);
}
