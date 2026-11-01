import { z } from 'zod';

const programEntrySchema = z.object({
  path: z.string(), release: z.string(), persona: z.string(), role: z.string(),
  group: z.string(), label: z.string(), run: z.string().nullable(),
  deployed: z.boolean(), mock: z.boolean(), version: z.number(),
});
const patientSchema = z.object({
  id: z.string(), name: z.string(), age: z.number(), sex: z.string(), file: z.string(),
  encounterClass: z.string(),
  flags: z.object({ pediatric: z.boolean(), allergic: z.boolean(), anticoagulated: z.boolean(), surgical: z.boolean() }),
});
export const catalogSchema = z.object({
  programs: z.array(programEntrySchema), patients: z.array(patientSchema), referenceDate: z.string(),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type ProgramEntry = Catalog['programs'][number];
export type Patient = Catalog['patients'][number];
export const personas = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;

/** Same-origin committed artifacts only. No Medplum or remote service calls. */
export async function readArtifact(path: string): Promise<unknown> {
  if (!/^\/(?:catalog\.json|verdicts\.json|(?:releases|programs|fixtures|runs)\/(?:[\w.-]+\/)*[\w.-]+\.json)$/.test(path) || path.split('/').includes('..'))
    throw new Error('Invalid offline artifact path');
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path} (${response.status})`);
  return response.json();
}
let catalog: Promise<Catalog> | undefined;
export const loadCatalog = () => catalog ??= readArtifact('/catalog.json').then(data => catalogSchema.parse(data));
export function defaultPatient(catalog: Catalog, persona: string): Patient {
  const found = catalog.patients.find(patient => persona === 'P2' ? patient.encounterClass === 'EMER'
    : persona === 'P3' ? patient.encounterClass === 'IMP'
    : persona === 'P4' ? patient.flags.pediatric
    : persona === 'P5' ? patient.flags.surgical : !patient.flags.pediatric);
  const patient = found ?? catalog.patients[0];
  if (!patient) throw new Error('No committed patients');
  return patient;
}
export function currentProgram(catalog: Catalog, persona: string, run: string | null): ProgramEntry {
  const deployed = catalog.programs.find(program => program.run === run && run !== null && program.persona === persona && program.deployed);
  const program = deployed ?? catalog.programs.find(program => program.path === `releases/v1/personas/${persona}.json`);
  if (!program) throw new Error(`No program for ${persona}`);
  return program;
}
export function ehrUrl(program: ProgramEntry, patient: string, persona = program.persona) {
  return `/ehr?${new URLSearchParams({ release: program.release, program: program.path, persona, patient })}`;
}
export const verdictsSchema = z.object({ programs: z.record(z.string(), z.object({ status: z.string(), output: z.unknown().optional() })) });
