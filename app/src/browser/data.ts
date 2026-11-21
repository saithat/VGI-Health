import {assertRecordingMode} from "../../../agent/src/recording-mode";
import { readCachedJson } from "./json-cache";
import {layoutDesignSchema, type LayoutDesign} from "../../../agent/src/layout-design";
import {
  assertBuildBinding,
  buildBindingSchema,
  contentHash,
} from "../core/buildBinding";
import { z } from "zod";
import { verdictSchema } from "../../../agent/src/schema";

const programEntrySchema = z.object({
  path: z.string(),
  release: z.string(),
  persona: z.string(),
  role: z.string(),
  group: z.string(),
  label: z.string(),
  run: z.string().nullable(),
  deployed: z.boolean(),
  version: z.number(),
  recordedCertificate: z
    .enum(["certified", "rejected"])
    .nullable()
    .default(null),
  expectedProperty: z.string().optional(),
});
const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  sex: z.string(),
  file: z.string(),
  bundlePath: z
    .string()
    .regex(/^fixtures\/(?:synthea|synthetic-hospital)\/[\w.-]+\.json$/),
  source: z.enum(["synthea", "synthetic-hospital"]),
  encounterClass: z.string(),
  mrn: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  problems: z.array(z.string()).default([]),
  weight: z
    .object({ value: z.string(), date: z.string() })
    .nullable()
    .default(null),
  flags: z.object({
    pediatric: z.boolean(),
    allergic: z.boolean(),
    anticoagulated: z.boolean(),
    surgical: z.boolean(),
  }),
});
export const catalogSchema = z.object({
  programs: z.array(programEntrySchema),
  patients: z.array(patientSchema),
  referenceDate: z.string(),
  runs: z
    .array(
      z.object({
        id: z.string(),
        days: z.number(),
        createdAt: z.string(),
      }),
    )
    .default([]),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type ProgramEntry = Catalog["programs"][number];
export type Patient = Catalog["patients"][number];
export const personas = ["P1", "P2", "P3", "P4", "P5"] as const;

/** Same-origin committed artifacts only. No commit service or remote service calls. */
export async function readArtifact(path: string): Promise<unknown> {
  if (
    !/^\/(?:catalog\.json|verdicts\.json|build\.json|ehr\/manifest\.json|(?:releases|programs|fixtures|runs)\/(?:[\w.-]+\/)*[\w.-]+\.json)$/.test(
      path,
    ) ||
    path.split("/").includes("..")
  )
    throw new Error("Invalid offline artifact path");
  const read = async () => {
    const response = await fetch(path);
    if (!response.ok)
      throw new Error(`Cannot load ${path} (${response.status})`);
    return response.json();
  };
  // Rebind/rejection pointers and installed build evidence must be fresh on every
  // verification. HTTP ETags still avoid retransmitting unchanged evidence.
  const evidence =
    path === "/build.json" ||
    path === "/catalog.json" ||
    /^\/runs\/(?:index|default)\.json$/.test(path) ||
    /^\/runs\/[\w-]+\/(?:summary|complexity|conformance|replay|trajectories\/index)\.json$/.test(
      path,
    ) ||
    path === "/ehr/manifest.json" ||
    /^\/runs\/[\w-]+\/manifest\.json$/.test(path) ||
    path.includes("/certs/") ||
    /\.(?:source|layouts)\.json$/.test(path);
  return evidence ? read() : readCachedJson(path, read);
}
export const loadCatalog = () =>
  readArtifact("/catalog.json").then((data) => catalogSchema.parse(data));
export function defaultPatient(catalog: Catalog, persona: string): Patient {
  const found = catalog.patients.find((patient) =>
    persona === "P2"
      ? patient.encounterClass === "EMER"
      : persona === "P3"
        ? patient.encounterClass === "IMP"
        : persona === "P4"
          ? patient.flags.pediatric
          : persona === "P5"
            ? patient.flags.surgical
            : !patient.flags.pediatric,
  );
  const patient = found ?? catalog.patients[0];
  if (!patient) throw new Error("No committed patients");
  return patient;
}
export function currentProgram(
  catalog: Catalog,
  persona: string,
  run: string | null,
): ProgramEntry {
  const deployed = catalog.programs.find(
    (program) =>
      program.run === run &&
      run !== null &&
      program.persona === persona &&
      program.deployed,
  );
  const program =
    deployed ??
    catalog.programs.find(
      (program) => program.path === `releases/v1/personas/${persona}.json`,
    );
  if (!program) throw new Error(`No program for ${persona}`);
  return program;
}
export function ehrUrl(
  program: ProgramEntry,
  persona = program.persona,
  day?: number,
) {
  return `/lean.html?${new URLSearchParams({ release: program.release, program: program.path, persona, ...(day === undefined ? {} : { day: String(day) }) })}`;
}
export const verdictsSchema = z.object({
  programs: z.record(
    z.string(),
    z.object({ status: z.string(), output: z.unknown().optional() }),
  ),
});

/** Rebind history is immutable; a rejected current pointer always refuses login. */
export async function readRecordedBinding(file: string) {
  const raw = await readArtifact(file);
  const data = z
    .object({
      status: z.string().optional(),
      current: z.string().nullable().optional(),
      reason: z.string().optional(),
    })
    .parse(raw);
  if (data.status === "rejected")
    throw new Error(`Build rebind refused: ${data.reason}`);
  if (data.status === "bound") {
    if (!/^v\d+\.build\.\d+\.json$/.test(data.current ?? ""))
      throw new Error("Invalid build binding pointer");
    return buildBindingSchema.parse(
      await readArtifact(
        file.replace(/[^/]+$/, z.string().parse(data.current)),
      ),
    );
  }
  return buildBindingSchema.parse(raw);
}

export async function recordingManifest(run: string) {
  const raw = await readArtifact(`/runs/${run}/manifest.json`);
  assertRecordingMode(raw);
  return z.object({buildBindingRequired: z.boolean().optional()}).parse(raw);
}

/** New run certificates bind their complete program and installed build; old recordings retain historical provenance. */
export async function verifyRecordedBuild(
  programPath: string,
  program: unknown,
): Promise<LayoutDesign> {
  const match = /^runs\/([\w-]+)\/programs\/(P[1-5])\/v(\d+)\.json$/.exec(
    programPath,
  );
  if (!match) return [];
  const [, run, persona, version] = match;
  const manifest = await recordingManifest(run ?? "");
  if (!manifest.buildBindingRequired) throw Error("The recording has no certified build binding");
  const [binding, certificate, build, wasm] = await Promise.all([
    readRecordedBinding(`/runs/${run}/certs/${persona}/v${version}.build.json`),
    readArtifact(`/runs/${run}/certs/${persona}/v${version}.json`),
    readArtifact("/build.json").then((v) =>
      z.object({ appSha256: z.string() }).parse(v),
    ),
    readArtifact("/ehr/manifest.json").then((v) =>
      z.object({ assets: z.record(z.string(), z.string()) }).parse(v),
    ),
  ]);
  if (binding.sourceProgramSha256) {
    const source = await readArtifact(
      `/runs/${run}/programs/${persona}/v${version}.source.json`,
    );
    if ((await contentHash(source)) !== binding.sourceProgramSha256)
      throw new Error("Certified source program mismatch");
  }
  const design = layoutDesignSchema.parse(await readArtifact('/' + programPath.replace(/\.json$/, '.layouts.json')));
  await assertBuildBinding(
    binding,
    {
      appSha256: build.appSha256,
      wasmSha256: wasm.assets["ehr-interp.wasm"] ?? "",
      componentsSha256: await contentHash(design.length ? {components: [], layouts: design} : []),
    },
    program,
    certificate,
  );
  return design;
}

/** Historical replay uses its frozen contract; aliases change display names only. */
export function programSpecPath(program: ProgramEntry): string {
  if (program.run && program.run !== "run1-preflight")
    return `/runs/${program.run}/certifications/${program.persona}/v${program.version}/spec.json`;
  if (program.path.startsWith("programs/benchmarks/releases/"))
    return `/${program.path.split("/").slice(0, 4).join("/")}/spec.json`;
  return `/releases/${program.release}/spec.json`;
}

const revisionCheckSchema = z.object({
  release: z.string(),
  verdict: verdictSchema,
  reason: z.string().nullable(),
  checkOnly: z.literal(true),
});
/** Same-origin check-only branch of the local attempt endpoint. */
export async function recheckRecordedRevision(
  program: ProgramEntry,
  persona: string,
) {
  const response = await fetch("/__dev/try-to-break-it", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "check-revision",
      program: program.path,
      persona,
    }),
  });
  const body: unknown = await response.json();
  if (
    !response.ok ||
    (typeof body === "object" && body !== null && "error" in body)
  )
    throw new Error(z.object({ error: z.string() }).parse(body).error);
  return revisionCheckSchema.parse(body);
}

/** Constrained read-only JSON from the loopback layout-research server. */
export async function loadDiscoveryRun() {
  const { discoveryRun } = await import('./discovery/types');
  const response = await fetch('/api/run');
  if (!response.ok) throw new Error('Discovery run unavailable');
  return discoveryRun.parse(await response.json());
}
export async function loadDiscoveryPreview(persona: string, id: string) {
  const { discoveryPreview } = await import('./discovery/types');
  const response = await fetch(`/api/design?persona=${encodeURIComponent(persona)}&id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Discovery preview unavailable');
  return discoveryPreview.parse(await response.json());
}
