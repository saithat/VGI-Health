/** Policy change: a failed task costs its matched canonical task plus a penalty. */
import { z } from 'zod';
import type { DayResult, Metrics, TaskMetrics } from './schema.js';
import { sumMetrics } from './observe.js';
export const releaseScoringSchema = z.object({
  incompletePenalty: z.number().finite().positive().default(0.5),
});
export const RELEASE_SCORING_POLICY = 'canonical-incomplete-penalty-v1';
export type ReleaseScoring = z.infer<typeof releaseScoringSchema>;
const keys = ['clicks','scrolls','keystrokes','klmDeciSec','popups','overrides','searches','backtracks','mouseTravelPx','scrollPx'] as const;
export function assertMatchedTasks(results: readonly Pick<DayResult,'tasks'>[]): void {
  const expected = results[0]?.tasks.map(t=>t.task).sort();
  for (const result of results) {
    const ids = result.tasks.map(t=>t.task).sort();
    if (new Set(ids).size !== ids.length || JSON.stringify(ids)!==JSON.stringify(expected)) throw Error('Scoring requires identical unique task IDs');
  }
}
export function scoredMetrics(result: Pick<DayResult,'tasks'>, vendor: Pick<DayResult,'tasks'>, penalty = 0.5): Metrics {
  releaseScoringSchema.parse({incompletePenalty:penalty});
  assertMatchedTasks([result,vendor]);
  const canonical = new Map(vendor.tasks.map(t=>[t.task,t]));
  const tasks = result.tasks.map(t => {
    if (t.completed) return t;
    const vendorTask = canonical.get(t.task);
    if (!vendorTask) throw Error(`Missing canonical task ${t.task}`);
    // If the vendor layout also fails, neither cost is a full-task cost: charge the
    // larger of the two partial costs plus the penalty, never less than either arm.
    const cost = vendorTask.completed ? vendorTask : t;
    const charged: TaskMetrics = {...cost,completed:true};
    for (const key of keys) {
      const value = cost[key], other = vendorTask[key];
      const base = typeof value === 'number' ? (!vendorTask.completed && typeof other === 'number' ? Math.max(value, other) : value) : value;
      if (typeof base === 'number') charged[key] = Math.ceil(base * (1+penalty));
      else if (key==='mouseTravelPx' || key==='scrollPx') charged[key] = null;
    }
    return charged;
  });
  return {...sumMetrics(tasks), completed:result.tasks.filter(t=>t.completed).length};
}
export function scoredPair(before: DayResult, after: DayResult, vendor: DayResult, penalty = 0.5) {
  assertMatchedTasks([before,after,vendor]);
  return {before:scoredMetrics(before,vendor,penalty),after:scoredMetrics(after,vendor,penalty)};
}
