import { z } from 'zod';
import type { Program, ScreenCheckResult, TrainEstimate } from './schema.js';
import type { TrainDay } from './observe.js';
import { expandProgram } from './composites.js';
import { componentById } from './program.js';

export const CADENCE_PROTOCOL = 'certified-cadence-archive-v1';
export const cadenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('nightly') }),
  z.object({ kind: z.literal('every-n-days'), days: z.number().int().positive().safe() }),
  z.object({ kind: z.literal('weekly') }),
]);
export type ReleaseCadence = z.infer<typeof cadenceSchema>;
/** Fixed simulation calendar: nightly=1, weekly=7,14,…; a veto waits until the next slot. */
export function releaseDue(night: number, cadence: ReleaseCadence = { kind: 'nightly' }): boolean {
  const c = cadenceSchema.parse(cadence);
  return night > 0 && night % (c.kind === 'nightly' ? 1 : c.kind === 'weekly' ? 7 : c.days) === 0;
}
export function parseCadence(value = 'nightly'): ReleaseCadence {
  if (value === 'nightly' || value === 'weekly') return { kind: value };
  return cadenceSchema.parse({ kind: 'every-n-days', days: Number(value) });
}
export interface ClinicianContext {
  clinician: string;
  department: string;
  role: Program['role'];
  /** Only the recent train partition, never validation or blind measurement days. */
  train: readonly TrainDay[];
}
export interface SwitchCostEstimate {
  /** Click-equivalent effort per train day; nonnegative, finite. */
  cost: number;
  model: string;
  assumption: string;
  relearning?: import("./bounded-tailoring.js").RelearningEstimate;
}
export type SwitchCost = (prev: Program, next: Program, context: ClinicianContext) => SwitchCostEstimate | Promise<SwitchCostEstimate>;
/** Simulation assumption: each displaced control costs one extra interaction per
 * observed use/day. Includes screen/parent/tab, order, size, layout and hotkey
 * changes; source identities, rather than tags or copyOf claims, identify moves.
 * This is an effort proxy, not measured learning or the bounded-knowledge user. */
export const usageWeightedSwitchCost: SwitchCost = (prev, next, context) => {
  const old = componentById(expandProgram(prev)), after = componentById(expandProgram(next));
  const moved = new Set<string>();
  for (const [id, a] of old) {
    const b = after.get(id);
    if (!b || a.screen.id !== b.screen.id || a.component.parent !== b.component.parent ||
      a.component.tab !== b.component.tab || a.component.size !== b.component.size ||
      a.component.hotkey !== b.component.hotkey || a.component.tag !== b.component.tag ||
      a.screen.components.indexOf(a.component) !== b.screen.components.indexOf(b.component)) moved.add(id);
  }
  // A changed group's placement/layout also displaces its descendants, even
  // when an expanded group itself generated no click in the trace.
  for (let pass = 0; pass < old.size; pass++) {
    let changed = false;
    for (const [id, a] of old) {
      const b = after.get(id);
      if (!moved.has(id) && ((a.component.parent && moved.has(a.component.parent)) ||
        (b?.component.parent && moved.has(b.component.parent)))) {
        moved.add(id); changed = true;
      }
    }
    if (!changed) break;
  }
  let uses = 0;
  for (const day of context.train) for (const trace of day.result.trace) {
    const event = trace.event;
    const id = 'click' in event ? event.click.comp : 'enter' in event ? event.enter.comp :
      'confirm' in event ? event.confirm.comp : 'selectTab' in event ? event.selectTab.comp : null;
    if (id && moved.has(id)) uses++;
  }
  return { cost: uses / Math.max(1, context.train.length), model: 'usage-weighted-movement-v1',
    assumption: 'simulation assumption: one extra click-equivalent per observed use of a displaced control, averaged over recent train days; no learning/forgetting model' };
};
export interface ReviewBundle {
  id: string;
  candidateIds: string[];
  program: Program;
  evidence: {
    train: TrainEstimate;
    switchCost: SwitchCostEstimate;
    /** Daily click+scroll saving minus switch cost; completion is mandatory. */
    score: number;
    moved: number;
    leanVerdict: 'ok';
    screen: ScreenCheckResult;
    niche: string;
  };
}
export type ReviewChoices = readonly [ReviewBundle] | readonly [ReviewBundle, ReviewBundle] | readonly [ReviewBundle, ReviewBundle, ReviewBundle];
export interface ReviewRequest {
  protocol: typeof CADENCE_PROTOCOL;
  night: number;
  clinician: string;
  department: string;
  role: Program['role'];
  bundles: ReviewChoices;
  /** Present only in the opt-in session protocol; train schedules and carried memory only. */
  sessionContext?: {
    current: Program; canonical: Program;
    train: readonly TrainDay[]; worldDir: string; seed: number;
  };
}
export interface ReviewDecision { chosenBundle: string | null; reason: string; }
export interface ReviewGate {
  /** Stable identity recorded in run manifests; change it when behavior changes. */
  id: string;
  review(request: ReviewRequest): Promise<ReviewDecision>;
}
export const autoApprove: ReviewGate = {
  id: 'auto-approve-v1',
  async review(request) { return { chosenBundle: request.bundles[0].id, reason: 'Highest positive train score, including switch cost' }; },
};
