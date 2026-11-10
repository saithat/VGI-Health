import type {} from "../../../lean/generated/sim-types.js";
/** Simulator-only extensions. Keeping these in the review source boundary
 * preserves the certified clinical app's runtime schema bytes. */
import {z} from 'zod';
import {dayResultSchema as baseDay, dayScheduleSchema as baseSchedule} from '../../../agent/src/schema.js';
export * from '../../../agent/src/schema.js';
const nat = z.number().int().nonnegative();
const arrival = z.object({arrivalMs:nat, readyMs:nat, priority:nat,
  clinicalServiceMs:nat.exactOptional(),boardingMs:nat.exactOptional(),
  resultAgeMs:nat,deadlineMs:nat.exactOptional(), resultAvailableMs:nat.exactOptional(), doseWindows:z.array(z.tuple([z.string(),nat]))});
const shift = z.object({id:z.string(),startMs:nat,endMs:nat});
const clocks = z.object({uiMs:nat,readingMs:nat,clinicalMs:nat,communicationMs:nat,passiveWaitMs:nat,reorientationMs:nat,queueMs:nat});
export const handoverSchema = z.object({task:z.string(),patient:z.string(),sender:z.string(),recipient:z.string(),offeredAtMs:nat,acceptedAtMs:nat.exactOptional(),reason:z.string()});
const timing = z.object({task:z.string(),arrival,startMs:nat.exactOptional(),finishMs:nat.exactOptional(),shift:z.string().exactOptional(),
  suspensions:z.array(z.object({suspendedMs:nat,resumedMs:nat,reason:z.string()})),
  queueDelayMs:nat,overtimeMs:nat,handovers:nat,overdueDoses:z.array(z.string()),resultResponseMs:nat.exactOptional(),
  disposition:z.enum(['finished','carried','abandoned']),reason:z.string().exactOptional(),
  clocks:clocks.exactOptional(),actor:z.string().exactOptional(),handover:handoverSchema.exactOptional(),
  ed:z.object({providerQueueMs:nat,providerStartMs:nat,decisionMs:nat,departureMs:nat,boardingMs:nat}).exactOptional()});
export const workloadSchema = z.object({protocol:z.literal('continuous-workload-v1'),shifts:z.array(shift),timings:z.array(timing),
  pending:z.array(z.string()),queueDelayMs:nat,overdueScheduledDoses:nat,resultResponseMs:nat,resultsResponded:nat,
  overtimeMs:nat,tasksCarriedOver:nat});
const workloadEnvelope = z.object({workload:workloadSchema.exactOptional()});
export const dayResultSchema = baseDay.and(workloadEnvelope).and(z.object({expert:workloadEnvelope.exactOptional()}));
export const dayScheduleSchema = baseSchedule.and(z.object({clockMode:z.enum(['continuous','legacy']).exactOptional(),shifts:z.array(shift).exactOptional(),
  sourceDates:z.array(z.tuple([nat,z.string()])).exactOptional(),tasks:z.array(z.object({timing:arrival.exactOptional()}))}));
