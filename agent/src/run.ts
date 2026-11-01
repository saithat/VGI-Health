/**
 * Run orchestrator: N work-days x personas (BRIEF 8.1).
 *
 *   for each day d, for each persona:
 *     login (load the deployed program) -> simulate the shift -> logout
 *   then, unless d is the last day, the night: vendor release v1.1 before
 *   Day 4 (surface-feature), v2 before Day 7 (migrate), else the nightly loop.
 *   Only certified versions are deployed; they take effect at the next login.
 *
 * After the last day, each deployed change gets its TEST measurement: day
 * night+2 (never used to select it) replayed on the old and new versions.
 */
import { RELEASE_IDS, RELEASE_DAYS } from './release-config.js';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { recordingEhr } from './recording-ehr.js';
import { LlmAgent } from './agent.js';
import { RecordingLlm } from './backends/recording.js';
import type { JsonLlm } from './backends/types.js';
import { createEhr, type EhrClient } from './ehr.js';
import { runMigration, runSurfaceFeature } from './modes.js';
import { daySeed, deployVersion, makeHoldout, replayDay, runNight, type LoopDeps, type NightResult } from './night.js';
import { createScreenChecker, type ScreenChecker } from './screencheck.js';
import type { TrainDay } from './observe.js';
import { personalize } from './program.js';
import type { HistoryItem, PersonaView } from './prompts.js';
import { loadRelease, releaseForPersona, type Release } from './releases.js';
import { dayResultSchema, programSchema, type DecisionRecord, type Program } from './schema.js';
import { rejectionKind, type SeedPolicy, type SeedState } from './seeded.js';
import { RunStore } from './store.js';
import { loadWorld } from './world.js';
import { REPO_ROOT, readJson, writeJson } from './util.js';

export interface RunOptions {
  days: number;
  llm: JsonLlm;
  worldDir: string;
  runsRoot?: string;
  runId?: string;
  /** Reuse completed days/decisions and certified programs; retry only the unfinished night. */
  resume?: boolean;
  personas?: string[];
  seedPolicy?: SeedPolicy;
  /** Day on which each release takes effect at login. */
  releaseDays?: { v1_1: number; v2: number };
  ehr?: EhrClient;
  /** Offline screen check (default: fake under EHR_FAKE=1, else render-screens + app screen-check). */
  screens?: ScreenChecker;
  /** Sample FHIR bundles for render-screens (default: EHR_SAMPLE_FHIR). */
  fhirBundles?: string[];
  log?: (line: string) => void;
}

export interface PersonaTimeline {
  persona: string;
  days: { day: number; programVersion: number; specVersion: string; load: string; clicks: number; keystrokes: number; scrolls: number; klmSec: number }[];
  nights: { night: number; mode: string; outcome: string; versionBefore: number; versionAfter: number; rejected: number; seeded: number }[];
}

export interface RunSummary {
  runId: string;
  dir: string;
  timelines: PersonaTimeline[];
  rejections: { night: number; persona: string; candidate: string; seeded: boolean; property: string | null; message: string | null }[];
  seededRejectedKinds: string[];
  llmErrors: { persona: string; night: number; message: string }[];
}

export function deployedPatch(r: DecisionRecord): HistoryItem['patch'] {
  if (!r.deployed || r.outcome === 'migration-fallback' || r.outcome === 'recertified' || r.outcome === 'not-surfaced') return [];
  const ok = [...r.certification.attempts].reverse().find((a) => a.check.status === 'pass');
  return ok?.patch ?? [];
}

export function historyItem(r: DecisionRecord): HistoryItem {
  const byId = new Map(r.candidates.map((e) => [e.candidate.id, e.candidate]));
  const outcome = r.outcome === 'deployed' || r.outcome === 'surfaced' || r.outcome === 'migrated' ? 'accepted' : r.outcome;
  return {
    night: r.night,
    mode: r.mode,
    outcome,
    chosen: (r.chosen?.candidateIds ?? []).map((id) => {
      const c = byId.get(id);
      return { id, summary: c?.summary ?? '', moveType: c?.moveType ?? '' };
    }),
    patch: deployedPatch(r),
  };
}

export async function runDays(opts: RunOptions): Promise<RunSummary> {
  const log = opts.log ?? (() => undefined);
  const underlyingEhr = opts.ehr ?? createEhr();
  const world = await loadWorld(opts.worldDir);
  const personaIds = opts.personas ?? world.manifest.personas;
  if (personaIds.length === 0 || new Set(personaIds).size !== personaIds.length || personaIds.some((id) => !world.personas.has(id)))
    throw new Error('Every requested persona must occur exactly once in the world');
  const releaseDays = opts.releaseDays ?? RELEASE_DAYS;
  const runId = opts.runId ?? `${opts.llm.name}-w${world.manifest.seed}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const dir = path.join(opts.runsRoot ?? path.join(REPO_ROOT, 'runs'), runId);
  await mkdir(dir, { recursive: true });
  const ehr = underlyingEhr.mode === 'real' ? recordingEhr(underlyingEhr, path.join(dir, 'ehr')) : underlyingEhr;
  const store = new RunStore(dir);
  const recorder = new RecordingLlm(opts.llm, dir, opts.resume ?? false);
  const seedState: SeedState = { rejected: new Set(), injected: 0 };
  const screens = opts.screens ?? createScreenChecker(ehr, { ...(opts.fhirBundles ? { bundles: opts.fhirBundles } : {}), artifactsDir: path.join(dir, 'reports/screens') });
  const deps: LoopDeps = {
    runId, store, ehr, screens, agent: new LlmAgent(recorder), seedPolicy: opts.seedPolicy ?? 'until-each-rejected', seedState,
    worldDir: world.dir, worldSeed: world.manifest.seed,
  };
  const manifestFile = path.join(dir, 'manifest.json');
  const resumeManifestSchema = z.object({
    releaseIds: z.object({ base: z.string(), feature: z.string(), migration: z.string() }).optional(),
    createdAt: z.string(), world: z.string(), backend: z.string(), personas: z.array(z.string()),
    ehr: z.object({ mode: z.string() }), resumes: z.array(z.string()).optional(),
    releaseDays: z.object({ v1_1: z.number(), v2: z.number() }), seedPolicy: z.string(),
  });
  let previous: z.infer<typeof resumeManifestSchema> | null = null;
  if (!opts.resume && existsSync(manifestFile)) throw new Error('Run already exists; use --resume or a new run id');
  if (opts.resume) {
    if (!opts.runId || !existsSync(manifestFile)) throw new Error('--resume requires an existing --run-id');
    previous = resumeManifestSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')));
    if (previous.releaseIds && JSON.stringify(previous.releaseIds) !== JSON.stringify(RELEASE_IDS)) throw new Error('Release identities changed; start a new run after the rename');
    if (previous.world !== world.dir || previous.backend !== opts.llm.name || previous.ehr.mode !== ehr.mode ||
        JSON.stringify(previous.personas) !== JSON.stringify(personaIds) ||
        JSON.stringify(previous.releaseDays) !== JSON.stringify(releaseDays) || previous.seedPolicy !== deps.seedPolicy) {
      throw new Error('resume world/backend/ehr/personas/release days/seed policy must match the recorded run');
    }
  }
  const manifestData = {
    status: 'initializing',
    releaseIds: RELEASE_IDS,
    buildBindingRequired: ehr.mode === 'real',
    runId, createdAt: previous?.createdAt ?? new Date().toISOString(),
    resumes: [...(previous?.resumes ?? []), ...(opts.resume ? [new Date().toISOString()] : [])], days: opts.days, personas: personaIds, world: world.dir, worldSeed: world.manifest.seed,
    worldIsFake: world.manifest.fake ?? false, backend: opts.llm.name, model: opts.llm.model, ehr: { mode: ehr.mode, binary: ehr.binary },
    seedPolicy: deps.seedPolicy, releaseDays,
    warning: ehr.mode === 'fake' ? 'EHR_FAKE=1: checker and simulator are fakes; nothing in this run is certified' : null,
  };
  await writeJson(manifestFile, manifestData);

  const releases = new Map<string, Release>();
  const release = async (id: string) => {
    const hit = releases.get(id);
    if (hit) return hit;
    const r = await loadRelease(id, ehr);
    releases.set(id, r);
    return r;
  };
  let inForce = await release(RELEASE_IDS.base);

  // Fail with every initial obstruction before spending browser/model time. No bypass.
  if (ehr.mode === 'real') {
    const blocked: string[] = [];
    for (const id of personaIds) {
      const params = world.personas.get(id);
      if (!params) continue;
      const initial = await releaseForPersona(inForce, id);
      const program = personalize(initial.canonical, params, world.userId(id));
      const verdict = await ehr.check({ specVersion: inForce.specVersion, program, prev: program, canonical: initial.canonical });
      await writeJson(path.join(dir, 'preflight', `${id}.json`), { program, verdict });
      if (verdict !== 'ok') blocked.push(`${id}: ${verdict.violation.property}: ${verdict.violation.message}`);
    }
    if (blocked.length) {
      await writeJson(manifestFile, { ...manifestData, status: 'blocked', blockers: blocked });
      throw new Error(`Initial certification blocked (nothing deployed):\n${blocked.join('\n')}`);
    }
  }

  // Day-1 programs: the canonical program personalized per user (version 0), deployed with a certificate.
  const views = new Map<string, PersonaView>();
  const programs = new Map<string, Map<number, Program>>();
  const train = new Map<string, TrainDay[]>();
  const history = new Map<string, HistoryItem[]>();
  const records: DecisionRecord[] = [];
  const timelines = new Map<string, PersonaTimeline>();
  for (const id of personaIds) {
    const params = world.personas.get(id);
    if (!params) continue;
    const view: PersonaView = { id, userId: world.userId(id), params };
    views.set(id, view);
    if (opts.resume && existsSync(path.join(dir, 'programs', id, 'deployed.json'))) {
      const versions = new Map<number, Program>();
      for (const file of await readdir(path.join(dir, 'programs', id))) {
        if (!/^v\d+\.json$/.test(file)) continue;
        const program = await readJson(path.join(dir, 'programs', id, file), programSchema);
        versions.set(program.version, program);
      }
      const deployed = await store.login(id);
      if (deployed.certificate.verdict !== 'ok' || !versions.has(0)) throw new Error(`resume ${id}: missing certified version`);
      programs.set(id, versions);
    } else {
      const initialRelease = await releaseForPersona(inForce, id);
      const v0 = personalize(initialRelease.canonical, params, view.userId);
      const dep = await deployVersion(deps, id, v0, { specVersion: inForce.specVersion, prev: v0, canonical: initialRelease.canonical, nextVersion: 0 });
      if (!dep.ok) throw new Error(`day-1 canonical program for ${id} was not deployed (${dep.reason}): ${dep.check.property ?? ''} ${dep.check.message ?? ''}`);
      programs.set(id, new Map([[0, v0]]));
    }
    train.set(id, []);
    history.set(id, []);
    timelines.set(id, { persona: id, days: [], nights: [] });
  }

  await writeJson(manifestFile, { ...manifestData, status: 'running' });
  for (let day = 1; day <= opts.days; day++) {
    // Login -> shift -> logout.
    for (const [id, view] of views) {
      const schedule = await world.schedule(day, id);
      if (!schedule) throw new Error(`world has no schedule for day ${day} / ${id}`);
      const { program } = await store.login(id);
      programs.get(id)?.set(program.version, program);
      const recorded = opts.resume && existsSync(store.dayPath(day, id));
      const result = recorded ? await readJson(store.dayPath(day, id), dayResultSchema) : await ehr.simulate({ specVersion: inForce.specVersion, program, persona: view.params, schedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, day) });
      if (!recorded) await store.writeDay(result);
      train.get(id)?.push({ result, schedule });
      const m = result.tasks.reduce((a, t) => ({ c: a.c + t.clicks, k: a.k + t.keystrokes, s: a.s + t.scrolls, t: a.t + t.klmDeciSec }), { c: 0, k: 0, s: 0, t: 0 });
      timelines.get(id)?.days.push({ day, programVersion: result.programVersion, specVersion: inForce.specVersion, load: schedule.load, clicks: m.c, keystrokes: m.k, scrolls: m.s, klmSec: m.t / 10 });
      log(`${recorded ? 'recorded ' : ''}day ${day} ${id}: v${result.programVersion} ${m.c} clicks, ${m.k} keys, ${m.s} scrolls, ${(m.t / 10).toFixed(0)}s`);
    }
    if (day === opts.days) break;

    // Night `day`: the release (if any) takes effect at the next login.
    const nextRelease = day + 1 === releaseDays.v1_1 ? await release(RELEASE_IDS.feature) : day + 1 === releaseDays.v2 ? await release(RELEASE_IDS.migration) : null;
    for (const [id, view] of views) {
      const { program: current } = await store.login(id);
      const nightInput = {
        night: day, persona: view, release: await releaseForPersona(inForce, id), current,
        train: [...(train.get(id) ?? [])], programs: programs.get(id) ?? new Map<number, Program>(), history: [...(history.get(id) ?? [])],
        holdout: makeHoldout(deps, view, await world.schedule(day + 1, id)),
      };
      let res: NightResult;
      const next = nextRelease ? await releaseForPersona(nextRelease, id) : null;
      if (opts.resume && existsSync(store.decisionPath(day, id))) {
        const record = await store.readDecision(day, id);
        for (const candidate of record.candidates) {
          const kind = rejectionKind(candidate.check);
          if (kind) seedState.rejected.add(kind);
          if (candidate.candidate.seeded) seedState.injected++;
        }
        res = { record, deployed: record.deployed ? programs.get(id)?.get(record.versionAfter) ?? null : null };
      } else if (next?.id === RELEASE_IDS.feature) res = await runSurfaceFeature(deps, { ...nightInput, next });
      else if (next) res = await runMigration(deps, { ...nightInput, next });
      else res = await runNight(deps, nightInput);
      const r = res.record;
      records.push(r);
      history.get(id)?.push(historyItem(r));
      if (res.deployed) programs.get(id)?.set(res.deployed.version, res.deployed);
      timelines.get(id)?.nights.push({
        night: day, mode: r.mode, outcome: r.outcome, versionBefore: r.versionBefore, versionAfter: r.versionAfter,
        rejected: r.candidates.filter((e) => e.check.status !== 'pass').length, seeded: r.candidates.filter((e) => e.candidate.seeded).length,
      });
      log(`night ${day} ${id}: ${r.mode} -> ${r.outcome} (v${r.versionBefore} -> v${r.versionAfter}); ${r.candidates.length} candidates, ${r.candidates.filter((e) => e.check.status !== 'pass').length} rejected`);
    }
    if (nextRelease) inForce = nextRelease;
  }

  // Test measurement: day night+2 replayed on the old and new versions (never used for selection).
  for (const r of records) {
    if (!r.deployed || r.versionAfter === r.versionBefore) continue;
    const testDay = r.night + 2;
    const view = views.get(r.persona);
    const schedule = testDay <= world.manifest.days ? await world.schedule(testDay, r.persona) : null;
    const before = programs.get(r.persona)?.get(r.versionBefore);
    const after = programs.get(r.persona)?.get(r.versionAfter);
    if (!view || !schedule || !before || !after) continue;
    const args = { specVersion: r.specVersion, persona: view.params, schedule, worldDir: world.dir, seed: daySeed(world.manifest.seed, testDay) };
    const b = await ehr.simulate({ ...args, program: before });
    const a = await ehr.simulate({ ...args, program: after });
    r.measured.test = replayDay(testDay, schedule.load, b, a);
    await store.writeDecision(r);
  }

  const summary: RunSummary = {
    runId,
    dir,
    timelines: [...timelines.values()],
    rejections: records.flatMap((r) => [
      ...r.candidates.filter((e) => e.check.status !== 'pass').map((e) => ({
        night: r.night, persona: r.persona, candidate: e.candidate.id, seeded: e.candidate.seeded, property: e.check.property, message: e.check.message,
      })),
      ...r.certification.attempts.filter((a) => a.source === 'screen-check').map((a) => ({
        night: r.night, persona: r.persona, candidate: a.candidateIds.join('+'), seeded: false, property: a.check.property, message: `${(a.check.screens ?? []).join(', ')}: ${a.check.message ?? ''}`,
      })),
    ]),
    seededRejectedKinds: [...seedState.rejected],
    llmErrors: records.flatMap((r) => r.flags.filter((flag) => flag.startsWith('llm-error')).map((message) => ({ persona: r.persona, night: r.night, message }))),
  };
  await writeJson(path.join(dir, 'summary.json'), summary);
  await writeJson(manifestFile, { ...manifestData, status: summary.llmErrors.length ? 'failed' : 'completed', llmErrors: summary.llmErrors });
  return summary;
}
