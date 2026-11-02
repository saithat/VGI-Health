import {geometryEhr} from './geometry.js';
import { calibrationDay, calibrationPartition, isMeasurementDay } from './protocol.js';
import { RELEASE_IDS, LEGACY_RELEASE_IDS } from './release-config.js';
/**
 * Re-run ONE night of an existing run for one persona (live demos: "run this
 * night again with Claude"), without touching the original run. The night's
 * mode follows the run's calendar (surface-feature before the v2 day,
 * migrate before the v3 day, else nightly) unless overridden.
 *
 * State is rebuilt from the run directory: the program used on day N, the
 * DayResults of days <= N (train only), earlier decision records (outcome-only
 * history), and day N+1's schedule from the world (validation holdout).
 * Outputs go to <run>/adhoc/night-<NN>-<P>-<timestamp>/.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { LlmAgent } from './agent.js';
import { RecordingLlm } from './backends/recording.js';
import type { JsonLlm } from './backends/types.js';
import type { EhrClient } from './ehr.js';
import { runMigration, runSurfaceFeature } from './modes.js';
import { makeHoldout, runNight, type LoopDeps, type NightResult } from './night.js';
import type { TrainDay } from './observe.js';
import type { HistoryItem } from './prompts.js';
import { loadRelease } from './releases.js';
import { historyItem } from './run.js';
import { createScreenChecker, type ScreenChecker } from './screencheck.js';
import { dayResultSchema, type Program } from './schema.js';
import { RunStore } from './store.js';
import { pad2, readJson } from './util.js';
import { loadWorld } from './world.js';

export type NightMode = 'auto' | 'nightly' | 'surface-feature' | 'migrate';
export const NIGHT_MODES: readonly NightMode[] = ['auto', 'nightly', 'surface-feature', 'migrate'];

const manifestSchema = z.object({
  runId: z.string(),
  days: z.number().int(),
  world: z.string(),
  releaseIds: z.object({ base: z.string(), feature: z.string(), migration: z.string() }).optional(),
  releaseDays: z.object({ v2: z.number().int(), v3: z.number().int() }),
});

export async function rerunNight(args: {
  runDir: string; persona: string; night: number; llm: JsonLlm; ehr: EhrClient; mode?: NightMode; outDir?: string; screens?: ScreenChecker;
}): Promise<{ result: NightResult; outDir: string }> {
  const manifest = await readJson(path.join(args.runDir, 'manifest.json'), manifestSchema);
  const world = await loadWorld(manifest.world);
  const params = world.personas.get(args.persona);
  if (!params) throw new Error(`persona ${args.persona} is not in the run's world`);
  const persona = { id: args.persona, userId: world.userId(args.persona), params };
  const source = new RunStore(args.runDir);

  // Programs deployed in the run, and the one in use on day N.
  const programs = new Map<number, Program>();
  const progDir = path.join(args.runDir, 'programs', args.persona);
  for (const f of readdirSync(progDir).filter((x) => /^v\d+\.json$/.test(x))) {
    const v = Number(f.slice(1, -5));
    programs.set(v, await source.readProgram(args.persona, v));
  }
  const train: TrainDay[] = [];
  for (let d = 1; d <= args.night; d++) {
    if (isMeasurementDay(d)) continue;
    const trainingFile=path.join(args.runDir,'training',`day-${d}`,`${args.persona}.json`);
    const result = await readJson(existsSync(trainingFile)?trainingFile:source.dayPath(d, args.persona), dayResultSchema);
    const schedule = await world.schedule(d, args.persona);
    if (!schedule) throw new Error(`world has no schedule for day ${d}`);
    const subset=calibrationPartition(schedule,'train');
    const ids=new Set(subset.tasks.map((t)=>t.id));
    train.push({result:{...result,tasks:result.tasks.filter((t)=>ids.has(t.task)),trace:result.trace.filter((t)=>ids.has(t.task)),floor:result.floor.filter((t)=>ids.has(t.task))},schedule:subset});
  }
  const usedOnDay = (await readJson(source.dayPath(args.night,args.persona),dayResultSchema)).programVersion;
  const current = usedOnDay === undefined ? undefined : programs.get(usedOnDay);
  if (!current) throw new Error(`cannot find the program used on day ${args.night}`);
  const history: HistoryItem[] = [];
  for (let n = 1; n < args.night; n++) {
    if (existsSync(source.decisionPath(n, args.persona))) history.push(historyItem(await source.readDecision(n, args.persona)));
  }

  const rd = manifest.releaseDays;
  const ids = manifest.releaseIds ?? LEGACY_RELEASE_IDS;
  const inForceId = args.night >= rd.v3 ? ids.migration : args.night >= rd.v2 ? ids.feature : ids.base;
  const auto: Exclude<NightMode, 'auto'> = args.night + 1 === rd.v2 ? 'surface-feature' : args.night + 1 === rd.v3 ? 'migrate' : 'nightly';
  const mode = !args.mode || args.mode === 'auto' ? auto : args.mode;
  const release = await loadRelease(inForceId, args.ehr);

  const outDir = args.outDir ?? path.join(args.runDir, 'adhoc', `night-${pad2(args.night)}-${args.persona}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  const store = new RunStore(outDir);
  const screens=args.screens??createScreenChecker(args.ehr,{artifactsDir:path.join(outDir,'reports/screens')});
  const ehr=screens.geometry?geometryEhr(args.ehr,screens.geometry,outDir):args.ehr;
  const deps: LoopDeps = {
    runId: `${manifest.runId}/adhoc`, store,ehr,screens, agent: new LlmAgent(new RecordingLlm(args.llm, outDir)),
    seedPolicy: 'none', seedState: { rejected: new Set(), injected: 0 }, worldDir: world.dir, worldSeed: world.manifest.seed,
  };
  const input = {
    night: args.night, persona, release, current, train, programs, history,
    holdout: makeHoldout(deps, persona, await world.schedule(calibrationDay(args.night), args.persona)),
  };
  let result: NightResult;
  if (mode === 'surface-feature') result = await runSurfaceFeature(deps, { ...input, next: await loadRelease(RELEASE_IDS.feature, args.ehr) });
  else if (mode === 'migrate') result = await runMigration(deps, { ...input, next: await loadRelease(RELEASE_IDS.migration, args.ehr) });
  else result = await runNight(deps, input);
  return { result, outDir };
}
