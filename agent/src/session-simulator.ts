/** Temporary pure user-model adapter: deterministic hidden weights, simulator-only. */
import { hash32, rng } from "./util.js";
import type { SessionChooser } from "./session.js";
export function seededSessionChooser(
  seed: number,
  clinician: string,
): SessionChooser {
  const random = rng(hash32(`${seed}:${clinician}:session-preferences-v1`));
  const weights = {
    clicks: 0.5 + random(),
    scrolls: 1 + random() * 3,
    relearning: 1 + random() * 5,
    threshold: random() * 2,
  };
  // The closure keeps preferences out of the session evidence and generator inputs.
  return (session) => {
    if (session.clinician !== clinician)
      throw new Error("Chooser belongs to another clinician");
    const ranked = session.options
      .map((option) => {
        const e = option.evidence;
        return {
          id: option.id,
          score:
            e.savings.clicks * weights.clicks +
            e.savings.scrolls * weights.scrolls -
            e.relearning.estimatedMinutes * weights.relearning,
        };
      })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const best = ranked[0];
    const chosen = best && best.score > weights.threshold ? best.id : null;
    return {
      chosen,
      reason: chosen
        ? "Simulated preference: interaction savings justify the estimated relearning."
        : "Simulated preference: keep the familiar layout; savings do not justify relearning.",
      reasons: ranked.map((r) => ({
        option: r.id,
        reason:
          r.id === chosen
            ? "Preferred simulated tradeoff."
            : "Less attractive than the selected layout or keeping current.",
      })),
    };
  };
}
