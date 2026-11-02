import { z } from "zod";
import type { Event, RenderInput, State, Task } from "../../../../lean/generated/ehr-types";
import type { TrajectoryEvent, TrajectorySegment } from "../trajectory-replay";
import type { Point } from "../../metrics/geometry";
import { eventSchema } from "../../../../agent/src/schema";

export const designs = ["stack", "board", "dated", "command"] as const;
export type Design = (typeof designs)[number];
// Williams square: each design precedes every other design once per four slots.
export const orders: readonly (readonly Design[])[] = [
  ["stack", "board", "command", "dated"],
  ["board", "dated", "stack", "command"],
  ["dated", "command", "board", "stack"],
  ["command", "stack", "dated", "board"],
];
export function sequence(slot: number) {
  if (!Number.isInteger(slot) || slot < 0) throw Error("Nonnegative allocation slot required");
  return (orders[slot % 4] ?? []).map((design, position) => ({
    design, caseIndex: (position + Math.floor(slot / 4)) % 4,
  }));
}
export interface StudyCase {
  id: string;
  patient: string;
  instruction: string;
  task: Task;
  episodes: RenderInput[];
  dateCoverage: number;
  axis: import("../../ehr/ui/exotic-axis").SourceAxis;
}
export interface StudyConfig {
  schemaVersion: 1;
  id: string;
  manifestHash: string;
  synthetic: true;
  consent: string;
  dryRun: boolean;
  provenance: Record<string, unknown>;
  practice: StudyCase;
  cases: StudyCase[];
}
export interface Offer { id: string; label: string; event: Event }
export interface ChoiceContext { state: unknown; options: Offer[] }
export interface StudyTrace extends TrajectoryEvent {
  elapsedMs: number;
  episode: number;
  before: State;
  choice: ChoiceContext;
  chosen: string | null;
}
export type StudySegment = TrajectorySegment;
const count = z.number().int().nonnegative();
const amount = z.number().finite().nonnegative();
export const effortSchema = z.strictObject({
  clicks: count, keys: count, scrolls: count, scrollPx: amount,
  mouseTravelPx: amount, elapsedMs: amount, hiddenMs: amount,
  blocked: count, wrongPatient: count,
});
export type Effort = z.infer<typeof effortSchema>;
export const emptyEffort = (): Effort => ({ clicks: 0, keys: 0, scrolls: 0, scrollPx: 0,
  mouseTravelPx: 0, elapsedMs: 0, hiddenMs: 0, blocked: 0, wrongPatient: 0 });
export function travel(a: Point | null, b: Point) { return a ? Math.hypot(b.x - a.x, b.y - a.y) : 0; }
const traceSchema = z.object({
  task: z.string(), t: amount, elapsedMs: amount, screen: z.string(), event: eventSchema, ops: z.array(z.string()),
  result: z.unknown(), episode: count, before: z.unknown(),
  choice: z.object({ state: z.unknown(), options: z.array(z.object({ id: z.string(), label: z.string(), event: eventSchema })) }),
  chosen: z.string().nullable(),
});
export const trialSchema = z.strictObject({
  design: z.enum(designs), caseId: z.string(), practice: z.boolean(), position: z.number().int().min(-4).max(3),
  completed: z.boolean(), stopReason: z.enum(["complete", "give-up", "withdrawn"]),
  effort: effortSchema, trace: z.array(traceSchema),
  segments: z.array(z.object({ start: count, end: count, facts: z.unknown(), goalsMet: z.boolean(),
    seed: z.object({ kind: z.literal("init"), clock: count, clinical: z.boolean().optional() }) })),
  finalState: z.unknown(),
  tlx: z.array(z.number().int().min(0).max(100)).length(6).nullable(),
  sus: z.array(z.number().int().min(1).max(5)).length(10).nullable(),
});
export type Trial = z.infer<typeof trialSchema>;
export const sessionSchema = z.strictObject({
  schemaVersion: z.literal(1), studyId: z.string(), manifestHash: z.string(),
  sessionId: z.string().uuid(),
  participant: z.string().regex(/^P\d{3}$/), slot: count,
  provenance: z.enum(["human", "simulated-dry-run"]),
  consentVersion: z.string(), consentAt: z.string().datetime(),
  startedAt: z.string().datetime(), status: z.enum(["in-progress", "complete", "withdrawn"]),
  viewport: z.strictObject({ width: count, height: count, pixelRatio: amount }),
  trials: z.array(trialSchema).max(8),
});
export type StudySession = z.infer<typeof sessionSchema>;
export const tlxItems = [
  "Mental demand (low–high)", "Physical demand (low–high)", "Time pressure (low–high)",
  "Performance (successful–unsuccessful)", "Effort (low–high)", "Frustration (low–high)",
];
// Standard SUS wording; participants rate each design immediately after use.
export const susItems = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];
