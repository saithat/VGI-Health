import { z } from "zod";
import {
  decisionRecordSchema,
  dayResultSchema,
  programSchema,
  certificateSchema,
  eventSchema,
  type DecisionRecord,
  type DayResult,
  type Program,
} from "../../../agent/src/schema";

export const runIndexSchema = z.array(
  z.object({ id: z.string().regex(/^[\w-]+$/), files: z.array(z.string()) }),
);
export const manifestSchema = z.object({
  runId: z.string(),
  days: z.number().int().positive(),
  personas: z.array(z.string()),
  warning: z.string().nullable().optional(),
  ehr: z.object({ mode: z.enum(["real", "fake"]) }),
});
const sideSchema = z.object({
  version: z.number().int().nonnegative(),
  trace: z.array(
    z.object({
      event: eventSchema,
      ops: z.array(
        z.enum(["click", "key", "scroll", "scan", "point", "think", "wait"]),
      ),
      klmDeciSec: z.number().nonnegative(),
    }),
  ),
});
// App-only replay inputs supplement the agent run; never reinterpret clinical state here.
export const replaySchema = z.object({
  mode: z.enum(["mock", "wasm"]),
  contexts: z.array(
    z.object({
      persona: z.string(),
      version: z.number().int().nonnegative().optional(),
      specVersion: z.string().optional(),
      spec: z.unknown(),
      bundle: z.unknown(),
      user: z.unknown(),
    }),
  ),
  tasks: z.array(
    z.object({
      persona: z.string(),
      id: z.string(),
      title: z.string(),
      before: sideSchema,
      after: sideSchema,
    }),
  ),
});
export type Replay = z.infer<typeof replaySchema>;
export interface RunData {
  manifest: z.infer<typeof manifestSchema>;
  records: DecisionRecord[];
  days: DayResult[];
  programs: Map<string, Program>;
  certs: Map<string, z.infer<typeof certificateSchema>>;
  replay: Replay | null;
}
export type ReadJson = (path: string) => Promise<unknown>;

/** The only dashboard network boundary: same-origin recorded JSON under /runs/. */
export const readRunJson: ReadJson = async (path) => {
  if (
    !/^\/runs\/(?:[\w.-]+\/)*[\w.-]+\.json$/.test(path) ||
    path.split("/").includes("..")
  )
    throw new Error("Invalid recorded-run path");
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path} (${response.status})`);
  return response.json();
};
export async function loadRun(
  id: string,
  files: string[],
  read: ReadJson = readRunJson,
): Promise<RunData> {
  if (!/^[\w-]+$/.test(id)) throw new Error("Invalid run id");
  for (const file of files) {
    if (
      !/^(?:[\w.-]+\/)*[\w.-]+\.json$/.test(file) ||
      file.split("/").includes("..")
    )
      throw new Error("Invalid run file");
  }
  const get = (file: string) => {
    if (
      !/^(?:[\w.-]+\/)*[\w.-]+\.json$/.test(file) ||
      file.split("/").includes("..")
    )
      throw new Error("Invalid run file");
    return read(`/runs/${id}/${file}`);
  };
  const manifest = manifestSchema.parse(await get("manifest.json"));
  if (manifest.runId !== id) throw new Error("Run id does not match manifest");
  const run: RunData = {
    manifest,
    records: [],
    days: [],
    programs: new Map(),
    certs: new Map(),
    replay: null,
  };
  await Promise.all(
    files.map(async (file) => {
      if (/^(decisions|break)\/.+\.json$/.test(file)) {
        const record = decisionRecordSchema.parse(await get(file));
        if (record.runId !== id || !manifest.personas.includes(record.persona))
          throw new Error("Decision belongs to another run or persona");
        run.records.push(record);
      } else if (/^days\/day-\d+\/[\w-]+\.json$/.test(file))
        run.days.push(dayResultSchema.parse(await get(file)));
      else if (/^programs\/[\w-]+\/v\d+\.json$/.test(file))
        run.programs.set(file, programSchema.parse(await get(file)));
      else if (/^certs\/[\w-]+\/v\d+\.json$/.test(file))
        run.certs.set(file, certificateSchema.parse(await get(file)));
      else if (file === "replay.json")
        run.replay = replaySchema.parse(await get(file));
    }),
  );
  run.records.sort(
    (a, b) => a.night - b.night || a.persona.localeCompare(b.persona),
  );
  run.days.sort((a, b) => a.day - b.day);
  return run;
}
export function programAt(
  run: RunData,
  persona: string,
  version: number,
): Program {
  const program = run.programs.get(`programs/${persona}/v${version}.json`);
  if (!program)
    throw new Error(`Missing recorded program ${persona}/v${version}`);
  return program;
}
export function testPoints(run: RunData, persona: string) {
  // Each point is the independent test replay for a decision, never its validation/training data.
  return run.records
    .filter((r) => r.persona === persona && r.mode !== "try-to-break-it")
    .flatMap((r) =>
      r.measured.test ? [{ ...r.measured.test, version: r.versionAfter }] : [],
    )
    .sort((a, b) => a.day - b.day);
}
