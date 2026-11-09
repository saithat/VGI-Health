/**
 * Case mix within each setting from Synthetic Hospital v1.3 (Park et al.
 * 2026), labeled synthetic-benchmark: a generator's distribution, not observed
 * care. `legacy` keeps the original local weights for frozen archives.
 *
 * Weight rule (dataset mode): a local scenario that the legacy weights make
 * ineligible for this patient (weight 0: e.g. hyperglycemia without diabetes)
 * stays ineligible. Every eligible scenario gets its dataset count plus one
 * (add-one smoothing, declared scenario choice: unmatched scenarios stay
 * reachable), times the declared seasonal or urgent-care factor. Age, sex and
 * history modifiers in the legacy weights are replaced.
 */
import mix from "./synthetic-hospital-mix.json";

export type CaseMixMode = "synthetic-hospital" | "legacy";
export const CASE_MIX_MODES: readonly CaseMixMode[] = ["synthetic-hospital", "legacy"];
export type MixSetting = keyof typeof mix.settings;

/** Smoothing pseudo-count (scenario; declared, uncited). */
export const MIX_PSEUDO_COUNT = 1;

export function datasetCount(setting: MixSetting, key: string): number {
  const counts: Record<string, number> = mix.settings[setting].counts;
  const n = counts[key];
  if (n === undefined) throw new Error(`no Synthetic Hospital mix entry ${setting}/${key}`);
  return n;
}

/** Replace legacy weights by dataset weights; `factor` carries declared scenario multipliers. */
export function mixWeights<T>(
  mode: CaseMixMode,
  setting: MixSetting,
  entries: readonly (readonly [T, number])[],
  key: (item: T) => string,
  factor: (item: T) => number = () => 1,
): (readonly [T, number])[] {
  if (mode === "legacy") return [...entries];
  return entries.map(([item, legacy]) => [item, legacy > 0 ? (datasetCount(setting, key(item)) + MIX_PSEUDO_COUNT) * factor(item) : 0] as const);
}

export type ImagingPriority = "stat" | "urgent" | "routine";
export type ImagingSetting = keyof typeof mix.imagingPriority.bySetting;

/** Dataset imaging priority split for one setting, as weighted entries. */
export function imagingPriorityWeights(setting: ImagingSetting): [ImagingPriority, number][] {
  const split: Partial<Record<ImagingPriority, number>> = mix.imagingPriority.bySetting[setting];
  return (["stat", "urgent", "routine"] as const).map((p) => [p, split[p] ?? 0]);
}

export const SYNTHETIC_HOSPITAL_MIX = mix;
