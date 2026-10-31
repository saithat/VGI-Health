/**
 * Re-run ONE night of an existing run for one persona (live demos: "run this
 * night again with Claude"), without touching the original run. The night's
 * mode follows the run's calendar (surface-feature before the v1.1 day,
 * migrate before the v2 day, else nightly) unless overridden.
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
  releaseDays: z.object({ v1_1: z.number().int(), v2: z.number().int() }),
});

export async function rerunNight(args: {
  runDir: string; persona: string; night: number; llm: JsonLlm; ehr: EhrClient; mode?: NightMode; outDir?: string;
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
    const result = await readJson(source.dayPath(d, args.persona), dayResultSchema);
    const schedule = await world.schedule(d, args.persona);
    if (!schedule) throw new Error(`world has no schedule for day ${d}`);
    train.push({ result, schedule });
  }
  const usedOnDay = train[train.length - 1]?.result.programVersion;
  const current = usedOnDay === undefined ? undefined : programs.get(usedOnDay);
  if (!current) throw new Error(`cannot find the program used on day ${args.night}`);
  const history: HistoryItem[] = [];
  for (let n = 1; n < args.night; n++) {
    if (existsSync(source.decisionPath(n, args.persona))) history.push(historyItem(await source.readDecision(n, args.persona)));
  }

  const rd = manifest.releaseDays;
  const inForceId = args.night >= rd.v2 ? 'v2' : args.night >= rd.v1_1 ? 'v1.1' : 'v1';
  const auto: Exclude<NightMode, 'auto'> = args.night + 1 === rd.v1_1 ? 'surface-feature' : args.night + 1 === rd.v2 ? 'migrate' : 'nightly';
  const mode = !args.mode || args.mode === 'auto' ? auto : args.mode;
  const release = await loadRelease(inForceId, args.ehr);

  const outDir = args.outDir ?? path.join(args.runDir, 'adhoc', `night-${pad2(args.night)}-${args.persona}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  const store = new RunStore(outDir);
  const deps: LoopDeps = {
    runId: `${manifest.runId}/adhoc`, store, ehr: args.ehr, agent: new LlmAgent(new RecordingLlm(args.llm, outDir)),
    seedPolicy: 'none', seedState: { rejected: new Set(), injected: 0 }, worldDir: world.dir, worldSeed: world.manifest.seed,
  };
  const input = {
    night: args.night, persona, release, current, train, programs, history,
    holdout: makeHoldout(deps, persona, await world.schedule(args.night + 1, args.persona)),
  };
  let result: NightResult;
  if (mode === 'surface-feature') result = await runSurfaceFeature(deps, { ...input, next: await loadRelease('v1.1', args.ehr) });
  else if (mode === 'migrate') result = await runMigration(deps, { ...input, next: await loadRelease('v2', args.ehr) });
  else result = await runNight(deps, input);
  return { result, outDir };
}
