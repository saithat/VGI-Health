import type { DaySchedule } from './schema.js';
/** The nightly estimator measures the most recent two train days, while prompts
 * and locality retain all past training evidence. Shared with ledger validation.
 */
const TRAIN_ESTIMATE_DAYS=2;
export const trainEstimateWindow=<T>(days:readonly T[])=>days.slice(-TRAIN_ESTIMATE_DAYS);
/** Odd calendar days are calibration only; even days are blind headline measurement. */
export const isMeasurementDay = (day: number) => day % 2 === 0;
export const calibrationDay = (night: number) => night % 2 ? night : night - 1;
export const validationSeed = (worldSeed: number, night: number) => 90_000_000 + worldSeed * 1000 + night;
export function calibrationPartition(schedule: DaySchedule, side: 'train' | 'validation'): DaySchedule {
  const held = new Set(schedule.tasks.filter((_task, i) => i % 3 === 0).map((t) => t.id));
  return { ...schedule, tasks: schedule.tasks.filter((t) => side === 'validation' ? held.has(t.id) : !held.has(t.id)) };
}
export const measurementProtocol = {
  name: 'past-calibration-blind-even-days-v1', calibrationDays: [1, 3, 5, 7, 9], measurementDays: [2, 4, 6, 8, 10],
  validation: 'Every third task of the most recent past odd calibration day; never shown to the designer or included in headline metrics. Independent validation seed namespace.',
  training: 'Remaining tasks of past odd calibration days only. Even-day traces/schedules never enter selection prompts.',
  tests: 'Next even measurement day, only when the accepted version is actually measured there. Night 9 is measured on day 10, not an absent day 11. Superseded/unmeasured versions are reported explicitly.',
};
