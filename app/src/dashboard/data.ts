import { readArtifact } from "../browser/data";
import { checkResultSchema, jsonPatchSchema } from "../../../agent/src/schema";
import {
  ruleConformanceSchema,
  type RuleConformance,
} from "./conformance-data";
import {
  complexityReleaseLabels,
  historicalRunIds,
} from "../../../scripts/historical-releases.mjs";
import { z } from "zod";
import { complexitySchema, type ComplexityData } from "./complexity-data";
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
export const defaultRunSchema = z.object({
  runId: z.string().regex(/^[\w-]+$/),
});
export const manifestSchema = z.object({
  runId: z.string(),
  days: z.number().int().positive(),
  personas: z.array(z.string()),
  warning: z.string().nullable().optional(),
  buildBindingRequired: z.boolean().optional(),
  measurementProtocol: z.object({ name: z.string() }).optional(),
  status: z.string().optional(),
  blockers: z.array(z.string()).optional(),
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
  baselines?: DayResult[];
  noAgentDays?: DayResult[];
  programs: Map<string, Program>;
  sources?: Map<string, Program>;
  certs: Map<string, z.infer<typeof certificateSchema>>;
  replay: Replay | null;
  complexity: ComplexityData | null;
  ruleConformance?: RuleConformance | null;
  files?: string[];
}
export type ReadJson = (path: string) => Promise<unknown>;

/** Same-origin recorded JSON only; shared with the offline browser. */
export const readRunJson: ReadJson = async (path) => {
  if (
    !/^\/runs\/(?:[\w.-]+\/)*[\w.-]+\.json$/.test(path) ||
    path.split("/").includes("..")
  )
    throw new Error("Invalid recorded-run path");
  return readArtifact(path);
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
    baselines: [],
    noAgentDays: [],
    programs: new Map(),
    sources: new Map(),
    certs: new Map(),
    replay: null,
    complexity: null,
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
      else if (/^no-agent\/days\/day-\d+\/[\w-]+\.json$/.test(file))
        run.noAgentDays?.push(dayResultSchema.parse(await get(file)));
      else if (/^baselines\/day-\d+\/[\w-]+\.json$/.test(file))
        run.baselines?.push(dayResultSchema.parse(await get(file)));
      else if (/^programs\/[\w-]+\/v\d+\.json$/.test(file))
        run.programs.set(file, programSchema.parse(await get(file)));
      else if (/^programs\/[\w-]+\/v\d+\.source\.json$/.test(file))
        run.sources?.set(
          file.replace(/\.source\.json$/, ".json"),
          programSchema.parse(await get(file)),
        );
      else if (/^certs\/[\w-]+\/v\d+\.json$/.test(file))
        run.certs.set(file, certificateSchema.parse(await get(file)));
      else if (file === "complexity.json") {
        const raw = complexitySchema.parse(await get(file));
        const complexity = historicalRunIds.has(id)
          ? complexityReleaseLabels(raw)
          : raw;
        if (complexity.runId !== id)
          throw new Error("Complexity belongs to another run");
        run.complexity = complexity;
      } else if (file === "replay.json")
        run.replay = replaySchema.parse(await get(file));
      else if (file === "conformance.json") {
        const evidence = ruleConformanceSchema.parse(await get(file));
        if (evidence.runId !== id)
          throw new Error("Rule conformance belongs to another run");
        run.ruleConformance = evidence;
      }
    }),
  );
  run.records.sort(
    (a, b) => a.night - b.night || a.persona.localeCompare(b.persona),
  );
  run.days.sort((a, b) => a.day - b.day);
  return run;
}
/** Summary contains measured outcomes, never program trees, patient contexts or traces. */
export async function loadRunSummary(
  id: string,
  read: ReadJson = readRunJson,
): Promise<RunData> {
  const data = z
    .object({
      manifest: manifestSchema,
      records: z.array(decisionRecordSchema),
      days: z.array(dayResultSchema),
      baselines: z.array(dayResultSchema).default([]),
      noAgentDays: z.array(dayResultSchema).default([]),
      complexity: complexitySchema.nullable(),
      files: z.array(z.string()),
      certificates: z.record(z.string(), certificateSchema).default({}),
    })
    .parse(await read(`/runs/${id}/summary.json`));
  if (
    data.manifest.runId !== id ||
    data.records.some(
      (r) => r.runId !== id || !data.manifest.personas.includes(r.persona),
    )
  )
    throw new Error("Summary belongs to another run");
  data.records.sort(
    (a, b) => a.night - b.night || a.persona.localeCompare(b.persona),
  );
  data.days.sort((a, b) => a.day - b.day);
  const ruleConformance = data.files.includes("conformance.json")
    ? ruleConformanceSchema.parse(await read(`/runs/${id}/conformance.json`))
    : null;
  if (ruleConformance && ruleConformance.runId !== id)
    throw new Error("Rule conformance belongs to another run");
  return {
    ...data,
    ruleConformance,
    complexity:
      data.complexity && historicalRunIds.has(id)
        ? complexityReleaseLabels(data.complexity)
        : data.complexity,
    programs: new Map(),
    sources: new Map(),
    certs: new Map(Object.entries(data.certificates)),
    replay: null,
  };
}
/** Hydrate only this persona when opening a decision or replay. */
export async function loadRunDetails(
  run: RunData,
  persona: string,
  read: ReadJson = readRunJson,
): Promise<RunData> {
  if (!run.files) return run;
  const detail = {
    ...run,
    programs: new Map(run.programs),
    sources: new Map(run.sources),
    certs: new Map(run.certs),
    days: [...run.days],
  };
  await Promise.all(
    run.files.map(async (file) => {
      if (file === "replay.json")
        detail.replay = replaySchema.parse(
          await read(`/runs/${run.manifest.runId}/${file}`),
        );
      else if (new RegExp(`^programs/${persona}/v\\d+\\.json$`).test(file))
        detail.programs.set(
          file,
          programSchema.parse(
            await read(`/runs/${run.manifest.runId}/${file}`),
          ),
        );
      else if (
        new RegExp(`^programs/${persona}/v\\d+\\.source\\.json$`).test(file)
      )
        detail.sources.set(
          file.replace(/\.source\.json$/, ".json"),
          programSchema.parse(
            await read(`/runs/${run.manifest.runId}/${file}`),
          ),
        );
      else if (new RegExp(`^certs/${persona}/v\\d+\\.json$`).test(file))
        detail.certs.set(
          file,
          certificateSchema.parse(
            await read(`/runs/${run.manifest.runId}/${file}`),
          ),
        );
      else if (new RegExp(`^days/day-\\d+/${persona}\\.json$`).test(file)) {
        const day = dayResultSchema.parse(
          await read(`/runs/${run.manifest.runId}/${file}`),
        );
        detail.days = detail.days
          .filter((d) => d.persona !== day.persona || d.day !== day.day)
          .concat(day);
      }
    }),
  );
  return detail;
}
export function programAt(
  run: RunData,
  persona: string,
  version: number,
): Program {
  const key = `programs/${persona}/v${version}.json`;
  const program = run.sources?.get(key) ?? run.programs.get(key);
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

const breakCapabilitySchema = z.object({
  available: z.boolean(),
  backend: z.string().nullable(),
  reason: z.string().nullable(),
});
export async function breakCapability() {
  const response = await fetch("/__dev/try-to-break-it");
  if (!response.ok)
    throw new Error("Live attempts require the local Vite server.");
  return breakCapabilitySchema.parse(await response.json());
}
const liveBreakSchema = z.object({
  request: z.string(),
  persona: z.string(),
  agentSays: z.string(),
  verdict: z.enum(["pass", "fail", "invalid-patch"]),
  property: z.string().nullable(),
  message: z.string().nullable(),
  counterexample: checkResultSchema.shape.counterexample,
  candidate: z
    .object({ summary: z.string(), patch: jsonPatchSchema })
    .nullable(),
});
export async function submitBreakAttempt(
  persona: string,
  request: string,
  run: string,
) {
  const response = await fetch("/__dev/try-to-break-it", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, request, run }),
  });
  const body: unknown = await response.json();
  if (
    !response.ok ||
    (typeof body === "object" && body !== null && "error" in body)
  )
    throw new Error(z.object({ error: z.string() }).parse(body).error);
  return liveBreakSchema.parse(body);
}
