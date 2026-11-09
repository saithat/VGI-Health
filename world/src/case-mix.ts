/**
 * Case mix within each setting from Synthetic Hospital v1.3 (Park et al.
 * 2026), labeled synthetic-benchmark: a generator's distribution, not observed
 * care. `legacy` keeps the original local weights for frozen archives.
 *
 * Weight rule (dataset mode, settings with at least MIX_MIN_MATCHED matched
 * encounters; thinner settings keep the legacy weights): a local scenario that the legacy weights make
 * ineligible for this patient (weight 0: e.g. hyperglycemia without diabetes)
 * stays ineligible. Every eligible scenario gets its dataset count plus one
 * (add-one smoothing, declared scenario choice: unmatched scenarios stay
 * reachable), times the declared seasonal or urgent-care factor. Age, sex and
 * history modifiers in the legacy weights are replaced.
 */
import mix from "./synthetic-hospital-mix.json";
import { hashHex } from "./rng";

export type CaseMixMode = "synthetic-hospital" | "legacy";
export const CASE_MIX_MODES: readonly CaseMixMode[] = ["synthetic-hospital", "legacy"];
export type MixSetting = keyof typeof mix.settings;

/** Smoothing pseudo-count (scenario; declared, uncited). */
export const MIX_PSEUDO_COUNT = 1;

/** Minimum matched dataset encounters before a setting uses dataset weights
 * (scenario; declared, uncited; owner-approved 2026-11-09). Thinner settings
 * keep their local weights even in dataset mode. */
export const MIX_MIN_MATCHED = 30;

/** Whether a setting has enough matched encounters to use dataset weights. */
export function settingQualifies(setting: MixSetting): boolean {
  return mix.settings[setting].covered >= MIX_MIN_MATCHED;
}

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
  if (mode === "legacy" || !settingQualifies(setting)) return [...entries];
  return entries.map(([item, legacy]) => [item, legacy > 0 ? (datasetCount(setting, key(item)) + MIX_PSEUDO_COUNT) * factor(item) : 0] as const);
}

export type ImagingPriority = "stat" | "urgent" | "routine";
export type ImagingSetting = keyof typeof mix.imagingPriority.bySetting;

/** Dataset imaging priority split for one setting, as weighted entries. */
export function imagingPriorityWeights(setting: ImagingSetting): [ImagingPriority, number][] {
  const split: Partial<Record<ImagingPriority, number>> = mix.imagingPriority.bySetting[setting];
  return (["stat", "urgent", "routine"] as const).map((p) => [p, split[p] ?? 0]);
}

/** Deterministic categorical draw from the setting's dataset split, keyed by
 * order identity (no random stream is consumed). */
export function drawImagingPriority(setting: ImagingSetting, key: string): ImagingPriority {
  const weights = imagingPriorityWeights(setting);
  const total = weights.reduce((n, [, w]) => n + w, 0);
  let u = (parseInt(hashHex(`imaging-priority|${key}`).slice(-8), 16) / 2 ** 32) * total;
  for (const [p, w] of weights) { u -= w; if (u < 0) return p; }
  return "routine";
}

export const SYNTHETIC_HOSPITAL_MIX = mix;
