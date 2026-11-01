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
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
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
  const ehr = opts.ehr ?? createEhr();
  const world = await loadWorld(opts.worldDir);
  const personaIds = (opts.personas ?? world.manifest.personas).filter((p) => world.personas.has(p));
  const releaseDays = opts.releaseDays ?? { v1_1: 4, v2: 7 };
  const runId = opts.runId ?? `${opts.llm.name}-w${world.manifest.seed}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const dir = path.join(opts.runsRoot ?? path.join(REPO_ROOT, 'runs'), runId);
  await mkdir(dir, { recursive: true });
  const store = new RunStore(dir);
  const recorder = new RecordingLlm(opts.llm, dir, opts.resume ?? false);
  const seedState: SeedState = { rejected: new Set(), injected: 0 };
  const screens = opts.screens ?? createScreenChecker(ehr, opts.fhirBundles ? { bundles: opts.fhirBundles } : {});
  const deps: LoopDeps = {
    runId, store, ehr, screens, agent: new LlmAgent(recorder), seedPolicy: opts.seedPolicy ?? 'until-each-rejected', seedState,
    worldDir: world.dir, worldSeed: world.manifest.seed,
  };
  const manifestFile = path.join(dir, 'manifest.json');
  const resumeManifestSchema = z.object({
    createdAt: z.string(), world: z.string(), backend: z.string(), personas: z.array(z.string()),
    ehr: z.object({ mode: z.string() }), resumes: z.array(z.string()).optional(),
    releaseDays: z.object({ v1_1: z.number(), v2: z.number() }), seedPolicy: z.string(),
  });
  let previous: z.infer<typeof resumeManifestSchema> | null = null;
  if (opts.resume) {
    if (!opts.runId || !existsSync(manifestFile)) throw new Error('--resume requires an existing --run-id');
    previous = resumeManifestSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')));
    if (previous.world !== world.dir || previous.backend !== opts.llm.name || previous.ehr.mode !== ehr.mode ||
        JSON.stringify(previous.personas) !== JSON.stringify(personaIds) ||
        JSON.stringify(previous.releaseDays) !== JSON.stringify(releaseDays) || previous.seedPolicy !== deps.seedPolicy) {
      throw new Error('resume world/backend/ehr/personas/release days/seed policy must match the recorded run');
    }
  }
  await writeJson(manifestFile, {
    runId, createdAt: previous?.createdAt ?? new Date().toISOString(),
    resumes: [...(previous?.resumes ?? []), ...(opts.resume ? [new Date().toISOString()] : [])], days: opts.days, personas: personaIds, world: world.dir, worldSeed: world.manifest.seed,
    worldIsFake: world.manifest.fake ?? false, backend: opts.llm.name, model: opts.llm.model, ehr: { mode: ehr.mode, binary: ehr.binary },
    seedPolicy: deps.seedPolicy, releaseDays,
    warning: ehr.mode === 'fake' ? 'EHR_FAKE=1: checker and simulator are fakes; nothing in this run is certified' : null,
  });

  const releases = new Map<string, Release>();
  const release = async (id: string) => {
    const hit = releases.get(id);
    if (hit) return hit;
    const r = await loadRelease(id, ehr);
    releases.set(id, r);
    return r;
  };
  let inForce = await release('v1');

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
    if (opts.resume) {
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
    const nextRelease = day + 1 === releaseDays.v1_1 ? await release('v1.1') : day + 1 === releaseDays.v2 ? await release('v2') : null;
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
      } else if (next?.id === 'v1.1') res = await runSurfaceFeature(deps, { ...nightInput, next });
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
    const schedule = testDay <= opts.days ? await world.schedule(testDay, r.persona) : null;
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
  };
  await writeJson(path.join(dir, 'summary.json'), summary);
  return summary;
}
