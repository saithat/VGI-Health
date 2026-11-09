import { z } from 'zod';
import { handoverSchema } from './measurement-schema.js';
import type { InterruptionMetrics } from '../../../lean/generated/sim-types.js';
const nat = z.number().int().nonnegative();
export const interruptionMetricsSchema: z.ZodType<InterruptionMetrics> = z.object({
  model: z.string(), profile: z.string(), ratePerHourMilli: nat, exposureMinutes: nat, closureWaitMs: nat,
  idle: z.array(z.object({readyMs: nat, startMs: nat, finishMs: nat})).default([]),
  reorientations: z.array(z.object({readyMs: nat, startMs: nat, finishMs: nat})).default([]),
  offered: z.array(z.object({ id: z.string(), patient: z.string(),
    kind: z.enum(['page', 'urgentResult', 'colleagueQuestion', 'familyRequest', 'pharmacyClarification']),
    urgency: z.enum(['urgent', 'timeSensitive', 'routine']), arrivedAtMs: nat, essential: z.boolean(), message: z.string(), serviceMs: nat.exactOptional() })),
  handled: nat, deferred: nat, resumptionDelayMs: nat, reorientationMs: nat,
  revalidationPrevented: nat, abandoned: nat, workMs: nat,
  work: z.array(z.object({
    work: z.object({
      id: z.string(), patient: z.string(),
      kind: z.enum(['page', 'urgentResult', 'colleagueQuestion', 'familyRequest', 'pharmacyClarification']),
      urgency: z.enum(['urgent', 'timeSensitive', 'routine']), arrivedAtMs: nat, essential: z.boolean(), message: z.string(), serviceMs: nat.exactOptional(),
    }),
    startedAtMs: nat, completedAtMs: nat, deferred: z.boolean(),
    steps: z.array(z.enum(['identifyPatient', 'readMessage', 'assess', 'reply', 'escalate', 'document'])),
    outcome: z.string(), completed: z.boolean(),
  })),
  handoffs: z.array(handoverSchema).exactOptional(),
  frames: z.array(z.object({
    task: z.string(), owner: z.string(), patient: z.string(), suspendedAtMs: nat, closedAtMs: nat,
    disposition: z.enum(['resumed', 'handedOver', 'discarded']), reason: z.string().min(1),
  })),
});

// Keep review measurements outside the clinical wire schema and certified hash.
// Independent validation retains metadata which the historical schema strips.
import { dayResultSchema as baseDayResultSchema } from './measurement-schema.js';
const taskWork = z.object({ interruptions: interruptionMetricsSchema.exactOptional() });
export const interruptionDayResultSchema = z.intersection(baseDayResultSchema, z.object({
  tasks: z.array(taskWork),
  expert: z.object({ tasks: z.array(taskWork) }).exactOptional(),
}));
