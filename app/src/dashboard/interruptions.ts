import type { DayResult } from './agent-evidence';

/** Include incomplete tasks: interruption work remains work when clinical goals fail.
 * Missing metadata denotes historical/unmeasured data, never measured zero. */
export function interruptionTotals(days: readonly DayResult[], persona: string) {
  const tasks = days.filter(d => d.persona === persona).flatMap(d => d.tasks);
  const measured = tasks.flatMap(t => t.interruptions ? [t.interruptions] : []);
  if (measured.length === 0) return null;
  const sum = (key: 'handled' | 'deferred' | 'resumptionDelayMs' | 'reorientationMs' | 'revalidationPrevented' | 'abandoned' | 'workMs') =>
    measured.reduce((n, m) => n + m[key], 0);
  const resumed = measured.flatMap(m => m.frames).filter(f => f.disposition === 'resumed').length;
  return {
    measuredTasks: measured.length, totalTasks: tasks.length,
    handled: sum('handled'), deferred: sum('deferred'),
    meanResumptionDelayMs: resumed ? sum('resumptionDelayMs') / resumed : null,
    reorientationMs: sum('reorientationMs'), revalidationPrevented: sum('revalidationPrevented'),
    abandoned: sum('abandoned'), workMs: sum('workMs'),
    essential: measured.flatMap(m => m.work).filter(r => r.completed && r.work.essential).length,
    handedOver: measured.flatMap(m => m.frames).filter(f => f.disposition === 'handedOver').length,
  };
}
