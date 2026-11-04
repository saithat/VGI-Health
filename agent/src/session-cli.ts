/** Offline harness. No LLM calls and no deployment. Run using `pnpm --filter agent exec tsx src/session-cli.ts input.json`. */
import { readFile } from "node:fs/promises";
import { z } from "zod";
import path from "node:path";
import { REPO_ROOT } from "./util.js";
import { createEhr } from "./ehr.js";
import {
  certificateSchema,
  dayScheduleSchema,
  personaParamsSchema,
  programSchema,
} from "./schema.js";
import { frictionFlagSchema } from "./session-schema.js";
import { answerSession, prepareSession, recordSession } from "./session.js";
import { seededSessionChooser } from "./session-simulator.js";
const inputSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  phase: z.literal("offShift"),
  cadence: z.enum(["weekly", "monthly"]),
  asOfDay: z.number().int().nonnegative(),
  current: programSchema,
  canonical: programSchema,
  persona: personaParamsSchema,
  recentDays: z.array(dayScheduleSchema).min(1),
  worldDir: z.string(),
  seed: z.number().int(),
  candidates: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      program: programSchema,
      certificate: certificateSchema,
    }),
  ),
  flags: z.array(frictionFlagSchema).default([]),
  runsRoot: z.string().default(path.join(REPO_ROOT, "runs")),
});
const file = process.argv[2];
if (!file)
  throw new Error("Usage: tsx src/session-cli.ts input.json (see inputSchema)");
const input = inputSchema.parse(JSON.parse(await readFile(file, "utf8")));
const prepared = await prepareSession({
  ...input,
  ehr: createEhr(),
  archive: { candidates: async () => input.candidates },
});
const answered = await answerSession(
  prepared,
  seededSessionChooser(input.seed, prepared.clinician),
);
console.log(await recordSession(answered, input.runsRoot));
