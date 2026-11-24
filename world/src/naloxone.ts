/** Finalize emitted schedules with the native simulator's clinical decision.
 * The pure scenario library retains its frozen draws; these are replaced at
 * the output boundary, after all orders and FHIR resources have been assembled.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { clinicalObservation } from "./fhir";
import { getString } from "./json";
import { SHIFTS } from "./calendar";
import { Rng } from "./rng";
import type { DaySchedule } from "./schema";

export interface NaloxoneEvidence {
  task: string;
  required: boolean;
  response: string | null;
  currentMedClasses: string[];
  lines: { slot: number; drug: string; highMme: boolean; unknownMme: boolean }[];
  documentation: [string, unknown][];
}

const evidenceSchema = z.array(z.object({
  task: z.string(), required: z.boolean(), response: z.string().nullable(),
  currentMedClasses: z.array(z.string()),
  lines: z.array(z.object({slot: z.number(), drug: z.string(), highMme: z.boolean(), unknownMme: z.boolean()})),
  documentation: z.array(z.tuple([z.string(), z.unknown()])),
}));

let helperBinary: string | undefined;

/** Link a generation-only driver against the existing native build. Cache by
 * source and build identity; never replace ehr or change its Lake targets. */
function nativeHelper(root: string): string {
  if (process.env.VGI_NALOXONE_BIN) return process.env.VGI_NALOXONE_BIN;
  if (helperBinary !== undefined) return helperBinary;
  const build = join(root, "lean/.lake/build");
  const source = join(root, "world/native/Naloxone.lean");
  const response = readFileSync(join(build, "bin/ehr.rsp"), "utf8");
  const key = createHash("sha256").update(readFileSync(source))
    .update(readFileSync(join(build, "bin/ehr.hash"))).update(response).digest("hex");
  const cache = join(root, ".cache/naloxone");
  mkdirSync(cache, {recursive: true});
  const binary = join(cache, key);
  if (!existsSync(binary)) {
    const temp = mkdtempSync(join(cache, "build-"));
    try {
      const c = join(temp, "Naloxone.c");
      execFileSync(process.env.LEAN_BIN ?? "lean", ["-R", root, "-c", c, source], {
        cwd: join(root, "lean"), encoding: "utf8",
        env: {...process.env, LEAN_PATH: join(build, "lib/lean")},
      });
      const objects = response.split("\n").filter(line => line.trim()).map((line): string => z.string().parse(JSON.parse(line)))
        .filter(path => path.endsWith(".c.o.export") && path !== join(build, "ir/Main.c.o.export"));
      if (objects.length === 0) throw new Error("build Lean before generating a world");
      const output = join(temp, "naloxone-tasks");
      execFileSync(process.env.LEANC_BIN ?? "leanc", ["-O2", "-o", output, c, ...objects], {cwd: join(root, "lean"), encoding: "utf8"});
      renameSync(output, binary);
    } finally { rmSync(temp, {recursive: true, force: true}); }
  }
  helperBinary = binary;
  return binary;
}

export function nativeNaloxoneBinary(): string {
  return nativeHelper(fileURLToPath(new URL("../../", import.meta.url)));
}

export function naloxoneEvidenceBatch(requests: {spec: string; schedule: string; world: string}[]): NaloxoneEvidence[][] {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const output = execFileSync(nativeHelper(root), ["--batch"], {
    cwd: join(root, "lean"), encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    input: JSON.stringify(requests) + "\n",
  });
  const results = z.array(evidenceSchema).parse(JSON.parse(output));
  if (results.length !== requests.length) throw new Error("missing native schedule evidence");
  return results;
}

export function naloxoneEvidence(spec: string, schedule: string, world: string): NaloxoneEvidence[] {
  const rows = naloxoneEvidenceBatch([{spec, schedule, world}])[0];
  if (rows === undefined) throw new Error("missing native schedule evidence");
  return rows;
}

export function withNaloxoneResponses(schedule: DaySchedule, evidence: NaloxoneEvidence[], seed: number): DaySchedule {
  const byTask = new Map(evidence.map(row => [row.task, row]));
  if (byTask.size !== evidence.length || evidence.length !== schedule.tasks.length)
    throw new Error("naloxone evidence must cover exactly one row per task");
  return { ...schedule, tasks: schedule.tasks.map(task => {
    const row = byTask.get(task.id);
    if (row === undefined) throw new Error(`missing naloxone evidence: ${task.id}`);
    const resources = task.todayResources.filter(r => !(getString(r, "resourceType") === "Observation" &&
      getString(r, "code", "coding", 0, "system") === "urn:vgi:world:clinical" &&
      getString(r, "code", "coding", 0, "code") === "naloxoneOffer"));
    if (row.required) resources.push(clinicalObservation(`${task.id}-naloxone-response`, task.patientId,
      task.day, SHIFTS[task.persona].startClock + task.startMin,
      { code: "naloxoneOffer", value: new Rng(`${seed}:naloxone:${task.id}`).chance(0.65) ? "accepted" : "declined" }));
    return { ...task, todayResources: resources };
  }) };
}
