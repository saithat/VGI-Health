import { z } from "zod";
import { eventSchema } from "../../../agent/src/schema";

const path = z
  .string()
  .regex(/^(?:[\w.-]+\/)*[\w.-]+\.json$/)
  .refine((p) => !p.split("/").includes(".."));
const nat = z.number().int().nonnegative();
const user = z.object({ id: z.string().min(1), role: z.string().min(1) });
export const trajectoryBundleSchema = z
  .object({
    entry: z.array(
      z
        .object({
          resource: z
            .object({ resourceType: z.string(), id: z.string().optional() })
            .passthrough(),
          fullUrl: z.string().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
const resource = z
  .object({ resourceType: z.string(), id: z.string().optional() })
  .passthrough();
const metrics = z.object({
  task: z.string(),
  clicks: nat,
  keystrokes: nat,
  scrolls: nat,
  klmDeciSec: nat,
  mouseTravelPx:z.number().nonnegative().nullable().optional(),scrollPx:z.number().nonnegative().nullable().optional(),
  completed: z.boolean(),
});
const fields = {
  id: z.string().min(1),
  persona: z.string(),
  day: nat.positive(),
  workflow: z.string(),
  programVersion: nat,
  release: z.string(),
  programPath: path,
  specPath: path,
  user,
  patient: z.object({ syntheaId: z.string().min(1), fixtureFile: path }),
  todayResources: z.array(resource),
  metrics,
  theoreticalMinimum: metrics,
  completed: z.boolean(),
  eventCount: nat,
  file: path,
};
const baseline = z.object({ ...fields, simulationSeed: nat });
export const trajectoryIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string(),
    releaseNaming: z.string().optional(),
    minimumDefinition: z.string(),
    tasks: z.array(z.object({ ...fields, baseline: baseline.optional() })),
  })
  .superRefine((index, ctx) => {
    const ids = new Set<string>();
    for (const task of index.tasks) {
      if (
        ids.has(task.id) ||
        task.metrics.task !== task.id ||
        task.theoreticalMinimum.task !== task.id ||
        task.completed !== task.metrics.completed
      )
        ctx.addIssue({
          code: "custom",
          message: `Inconsistent task ${task.id}`,
        });
      ids.add(task.id);
    }
  });
export const trajectorySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string(),
    context: z.object({
      programPath: path,
      specPath: path,
      user,
      startMin: nat,
      today: z.string(),
      fixtureFile: path,
      resources: z.array(resource),
      segments: z
        .array(
          z.object({
            start: nat,
            end: nat,
            facts: z.unknown(),
            seed: z.object({ kind: z.literal("init"), clock: nat }),
            goalsMet: z.boolean(),
          }),
        )
        .min(1),
    }),
    trace: z.array(
      z.object({
        task: z.string(),
        t: nat,
        screen: z.string(),
        event: eventSchema,
        ops: z.array(z.string()),
        result: z.union([
          z.literal("ok"),
          z.literal("ignored"),
          z.object({ blocked: z.object({ reason: z.string() }) }),
        ]),
      }),
    ),
    nativeMismatch: z.unknown(),
  })
  .superRefine((task, ctx) => {
    let end = 0;
    for (const segment of task.context.segments) {
      if (
        segment.start !== end ||
        segment.end < segment.start ||
        segment.end > task.trace.length
      )
        ctx.addIssue({ code: "custom", message: "Invalid episode coverage" });
      end = segment.end;
    }
    if (end !== task.trace.length || task.trace.some((e) => e.task !== task.id))
      ctx.addIssue({
        code: "custom",
        message: "Trace does not match task/episodes",
      });
  });
export type TrajectoryIndex = z.infer<typeof trajectoryIndexSchema>;
export type TrajectoryEntry = TrajectoryIndex["tasks"][number];
