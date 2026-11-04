/** Durable, train-only archive. Night snapshots are atomic; an unfinished night
 * is rebuilt from strictly earlier snapshots, so retry never imports its future. */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { candidateSchema, checkResultSchema, programSchema, screenCheckResultSchema, trainEstimateSchema, type Program } from './schema.js';
import { programHash, sha256, stableStringify } from './program.js';
import { readJson, writeJson } from './util.js';
import { designFeedback } from '../../explore/operators.js';

const observationSchema = z.object({
  night: z.number().int(), baseHash: z.string(), specHash: z.string(), programHash: z.string().nullable(),
  check: checkResultSchema, trainEstimate: trainEstimateSchema.nullable(),
  screen: screenCheckResultSchema.nullable(),
  staticError: z.string().nullable(),
  switchCost: z.object({ cost: z.number().finite().nonnegative(), model: z.string(), assumption: z.string() }).nullable(),
});
export type ArchiveObservation = z.infer<typeof observationSchema>;
const entrySchema = z.object({
  id: z.string(), night: z.number().int(), candidateIds: z.array(z.string()),
  candidate: candidateSchema, program: programSchema.nullable(), observations: z.array(observationSchema),
});
export type ArchiveEntry = z.infer<typeof entrySchema>;
const snapshotSchema = z.object({
  schemaVersion: z.literal(1), protocol: z.literal('certified-cadence-archive-v1'),
  clinician: z.string(), owner: z.string(), department: z.string(), role: z.string(),
  night: z.number().int(), ehrMode: z.enum(['fake', 'real']), entries: z.array(entrySchema),
  cells: z.record(z.string(), z.string()),
});
export type ArchiveSnapshot = z.infer<typeof snapshotSchema>;
export interface ArchiveScope { clinician: string; owner: string; department: string; role: Program['role']; }
const scopeKey = (value: unknown) => sha256(stableStringify(value));
/** Versions are publication metadata, not distinct designs. */
export const designHash = (p: Program): string => programHash({ ...p, version: 0 });
export class DesignArchiveStore {
  readonly directory: string;
  constructor(private readonly root: string, readonly scope: ArchiveScope) {
    this.directory = path.join(root, 'clinicians', scopeKey(scope));
  }
  async before(night: number, ehrMode: 'fake' | 'real'): Promise<ArchiveSnapshot> {
    let files: string[];
    try { files = await readdir(this.directory); }
    catch (e) { if (e instanceof Error && 'code' in e && e.code === 'ENOENT') files = []; else throw e; }
    const prior = files.map(file => ({ file, day: Number(/^night-(\d+)\.json$/.exec(file)?.[1]) }))
      .filter(x => Number.isInteger(x.day) && x.day < night).sort((a,b) => b.day-a.day)[0];
    if (!prior) return { schemaVersion: 1, protocol: 'certified-cadence-archive-v1', ...this.scope, night: 0, ehrMode, entries: [], cells: {} };
    const snapshot = await readJson(path.join(this.directory, prior.file), snapshotSchema);
    if (snapshot.clinician !== this.scope.clinician || snapshot.owner !== this.scope.owner ||
      snapshot.department !== this.scope.department || snapshot.role !== this.scope.role || snapshot.ehrMode !== ehrMode)
      throw Error('Archive scope/backend mismatch');
    return snapshot;
  }
  async save(snapshot: ArchiveSnapshot): Promise<void> {
    const file = path.join(this.directory, `night-${snapshot.night}.json`);
    await writeJson(file, snapshotSchema.parse(snapshot));
    // Department × role view is sharded by clinician: no concurrent lost update,
    // no pooling of another clinician's estimates or training traces.
    await writeJson(path.join(this.root, 'departments', scopeKey([snapshot.department, snapshot.role]),
      scopeKey(this.scope), `night-${snapshot.night}.json`), {
      schemaVersion: 1, department: snapshot.department, role: snapshot.role, clinician: snapshot.clinician,
      archive: path.relative(this.root, file), cells: snapshot.cells,
    });
  }
}
/** Intentionally projects no validation, review decisions, user response or test data. */
export function archiveFeedback(snapshot: ArchiveSnapshot) {
  const distinct = [...new Map(snapshot.entries.map(e => [stableStringify(e.candidate.patch), e])).values()];
  const recent = distinct.map(entry => {
    const observation = entry.observations.at(-1);
    const train = observation?.trainEstimate;
    // Full-program exploration patches would repeat the entire EHR in every
    // prompt. Retain their hash and paths here; exact bytes stay in snapshots.
    const serialized = stableStringify(entry.candidate.patch);
    const patch = serialized.length <= 6000 ? entry.candidate.patch : {
      sha256: sha256(serialized), paths: entry.candidate.patch.map(op => op.path),
    };
    return { id: entry.id, specHash: observation?.specHash, baseHash: observation?.baseHash, summary: entry.candidate.summary, patch,
      check: observation?.check, staticError: observation?.staticError, screen: observation?.screen,
      trainEstimate: train, switchCost: observation?.switchCost,
      knownDud: observation?.check.status !== 'pass' || observation.staticError !== null ||
        observation.screen?.status !== 'pass' || Boolean(train && (train.before.clicks + train.before.scrolls - train.after.clicks - train.after.scrolls) / train.days.length <= (observation.switchCost?.cost ?? 0)) };
  });
  return designFeedback(Object.keys(snapshot.cells), recent);
}
