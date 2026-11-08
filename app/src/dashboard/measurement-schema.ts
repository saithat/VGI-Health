/** Simulator-only extensions. Keeping these in the review source boundary
 * preserves the certified clinical app's runtime schema bytes. */
import {z} from 'zod';
import {dayResultSchema as baseDay, dayScheduleSchema as baseSchedule} from '../../../agent/src/schema.js';
export * from '../../../agent/src/schema.js';
const nat = z.number().int().nonnegative();
const arrival = z.object({arrivalMs:nat, readyMs:nat, priority:nat,
  resultAgeMs:nat,deadlineMs:nat.exactOptional(), resultAvailableMs:nat.exactOptional(), doseWindows:z.array(z.tuple([z.string(),nat]))});
const shift = z.object({id:z.string(),startMs:nat,endMs:nat});
const timing = z.object({task:z.string(),arrival,startMs:nat.exactOptional(),finishMs:nat.exactOptional(),shift:z.string().exactOptional(),
  suspensions:z.array(z.object({suspendedMs:nat,resumedMs:nat,reason:z.string()})),
  queueDelayMs:nat,overtimeMs:nat,handovers:nat,overdueDoses:z.array(z.string()),resultResponseMs:nat.exactOptional(),
  disposition:z.enum(['finished','carried','abandoned']),reason:z.string().exactOptional()});
export const workloadSchema = z.object({protocol:z.literal('continuous-workload-v1'),shifts:z.array(shift),timings:z.array(timing),
  pending:z.array(z.string()),queueDelayMs:nat,overdueScheduledDoses:nat,resultResponseMs:nat,resultsResponded:nat,
  overtimeMs:nat,tasksCarriedOver:nat});
export const dayResultSchema = baseDay.and(z.object({workload:workloadSchema.exactOptional()}));
export const dayScheduleSchema = baseSchedule.and(z.object({clockMode:z.enum(['continuous','legacy']).exactOptional(),shifts:z.array(shift).exactOptional(),
  tasks:z.array(z.object({timing:arrival.exactOptional()}))}));
