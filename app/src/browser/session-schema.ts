/** Offline, simulator-only tailoring records. Never interpreter Events or deployment authority. */
import { z } from "zod";
import {
  certificateSchema,
  dayResultSchema,
  dayScheduleSchema,
  eventSchema,
  programSchema,
} from "../../../agent/src/schema.js";
const id = z.string().min(1).max(200);
const text = z.string().trim().min(1).max(2000);
export const frictionFlagSchema = z.object({
  kind: z.literal("friction"),
  id,
  clinician: id,
  programHash: id,
  day: z.number().int().nonnegative(),
  task: id,
  t: z.number().int().nonnegative(),
  screen: id,
  component: id.optional(),
  signal: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("slowHere") }),
    z.object({ kind: z.literal("wish"), text }),
  ]),
});
export type FrictionFlag = z.infer<typeof frictionFlagSchema>;
/** A trace stream can interleave optional feedback; only interaction entries reach the interpreter. */
export const sessionTraceEntrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("interaction"),
    event: z.object({
      task: id,
      t: z.number().int().nonnegative(),
      screen: id,
      event: eventSchema,
      ops: z.array(
        z.enum(["click", "key", "scroll", "scan", "point", "think", "wait"]),
      ),
      result: z.union([
        z.enum(["ok", "ignored"]),
        z.object({ blocked: z.object({ reason: z.string() }) }),
      ]),
    }),
  }),
  frictionFlagSchema,
]);
export type SessionTraceEntry = z.infer<typeof sessionTraceEntrySchema>;
export const locationSchema = z.object({
  screen: id,
  parent: z.string().nullable(),
  tab: z.number().int().nonnegative(),
  index: z.number().int().nonnegative(),
});
export const changeSchema = z.object({
  component: id,
  label: z.string(),
  kind: z.enum(["added", "removed", "moved", "changed"]),
  from: locationSchema.nullable(),
  to: locationSchema.nullable(),
});
export const sessionChoiceSchema = z.object({
  chosen: id.nullable(),
  reason: text,
  reasons: z.array(z.object({ option: id, reason: text })),
});
export type SessionChoice = z.infer<typeof sessionChoiceSchema>;
export const comparisonSchema = z.object({
  session: id,
  clinician: id,
  preferred: id,
  other: id,
  reason: text,
  preferredProgramHash: id,
  otherProgramHash: id,
  preferredChanges: z.array(changeSchema),
  otherChanges: z.array(changeSchema),
  source: z.literal("simulator"),
});
export type PreferenceComparison = z.infer<typeof comparisonSchema>;
const totalsSchema = z.object({
  clicks: z.number(),
  keystrokes: z.number(),
  scrolls: z.number(),
  completed: z.number().int().nonnegative(),
});
const effortCostSchema = z.object({ seconds: z.number().finite(), actions: z.number().finite() });
export const relearningEstimateSchema = z.object({
  model: z.string(), assumption: z.string(), k: z.number().int().positive(), warmBlocks: z.number().int().nonnegative(),
  before: effortCostSchema, after: effortCostSchema, expertBefore: effortCostSchema, expertAfter: effortCostSchema,
  beforeExcess: effortCostSchema, afterExcess: effortCostSchema, incremental: effortCostSchema,
});
export const sessionOptionSchema = z.object({
  id,
  label: text,
  program: programSchema,
  certificate: certificateSchema,
  evidence: z.object({
    days: z.array(dayResultSchema).min(1),
    savings: totalsSchema,
    changes: z.array(changeSchema),
    relearning: z.object({
      estimatedMinutes: z.number().nonnegative(),
      model: z.string(),
      bounded: relearningEstimateSchema.optional(),
      simulatorOnly: z.literal(true),
    }),
  }),
});
export const sessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    simulatorOnly: z.literal(true),
    backend: z.enum(["real", "fake"]),
    id,
    clinician: id,
    createdAt: z.string().datetime(),
    asOfDay: z.number().int().nonnegative(),
    cadence: z.enum(["weekly", "monthly"]),
    phase: z.literal("offShift"),
    current: z.object({
      program: programSchema,
      days: z.array(dayResultSchema).min(1),
    }),
    schedules: z.array(dayScheduleSchema).min(1),
    flags: z.array(frictionFlagSchema),
    options: z.array(sessionOptionSchema).min(2).max(3),
    choice: sessionChoiceSchema.nullable(),
    comparisons: z.array(comparisonSchema),
  })
  .superRefine((s, ctx) => {
    const ids = s.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length || ids.includes("current"))
      ctx.addIssue({
        code: "custom",
        message: "Option IDs must be unique and cannot be current",
      });
    if (s.choice?.chosen && !ids.includes(s.choice.chosen))
      ctx.addIssue({ code: "custom", message: "Unknown chosen option" });
    if (s.choice?.reasons.some((r) => !ids.includes(r.option)))
      ctx.addIssue({ code: "custom", message: "Unknown option reason" });
  });
export type TailoringSession = z.infer<typeof sessionSchema>;
export type SessionOption = z.infer<typeof sessionOptionSchema>;
