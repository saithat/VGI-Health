import type { Program } from './schema.js';
import type { TrainDay } from './observe.js';
import { expandProgram } from './composites.js';
import { componentById } from './program.js';

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
