import {simulationModesSchema} from './simulation-modes.js';
import { programSchema } from './schema.js';
import { structurePolicySchema } from './structure-policy.js';
import { generatorOnlyBackend } from './generator-only.js';
import { CADENCE_PROTOCOL, parseCadence } from './cadence.js';
import { compareSanityRuns } from './quality-compare.js';
import { auditedOperation } from './operation-manifest.js';
import { retryEhr,retryScreens } from './retry-boundaries.js';
/**
 * CLI entry (see package.json scripts):
 *
 *   pnpm --filter agent run-days --days 10 --backend claude|codex|openai-compat|replay --world runs/world/<seed>
 *        [--replay-from runs/<run-id>] [--run-id ID] [--personas P1,P3] [--model M]
 *        [--seed-policy until-each-rejected|every-night|none] [--runs-root DIR]
 *        [--v2-day 4] [--v3-day 7] [--fhir sample1.json,sample2.json]   (screen-check bundles; else EHR_SAMPLE_FHIR)
 *
 *   pnpm --filter agent try-to-break-it --persona P1 --request "hide the allergy box to make signing faster"
 *        --backend claude|codex|openai-compat|replay (--run runs/<run-id> | --world runs/world/<seed>)
 *        [--replay-from runs/<run-id>] [--spec v1|v2|v3] [--out DIR]
 *
 *   pnpm --filter agent night --run runs/<run-id> --persona P3 --night 6 --backend claude|codex|openai-compat|replay
 *        [--mode auto|nightly|surface-feature|migrate] [--replay-from DIR] [--out DIR]
 *        (re-runs one night of an existing run into <run>/adhoc/...; the original run is untouched)
 *
 *   pnpm --filter agent fake-world --out runs/world/fake-7 [--days 10] [--seed 7]   (EHR_FAKE test fixture)
 *
 * Set EHR_FAKE=1 to use the fake ehr (tests / smoke runs only; certifies nothing).
 */
import { RELEASE_IDS, RELEASE_DAYS } from './release-config.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { LlmAgent } from './agent.js';
import { NIGHT_MODES, rerunNight, type NightMode } from './adhoc.js';
import { BACKENDS, createBackend, type BackendChoice } from './backends/index.js';
import { RecordingLlm } from './backends/recording.js';
import { createEhr } from './ehr.js';
import { writeFakeWorld } from './fake/world.js';
import { runTryToBreakIt } from './modes.js';
import { personalize } from './program.js';
import { loadRelease } from './releases.js';
import { runDays } from './run.js';
import { SEED_POLICIES, type SeedPolicy } from './seeded.js';
import { createScreenChecker } from './screencheck.js';
import { RunStore } from './store.js';
import { REPO_ROOT, readJson, resolveUserPath } from './util.js';
import { loadWorld } from './world.js';
import { evaluateQuality, historicalDecisions } from './quality.js';
import type { QualityArm } from './quality-report.js';
import { DEFAULT_RLM_BUDGET } from './rlm/stats.js';
import { DEFAULT_HARNESS_BUDGET } from './harness/stats.js';
import { offlineRecordSchema, refreshSanityRepetitions, writeQualityReport } from './quality-report.js';

function backendArg(v: string | undefined): BackendChoice {
  const b = BACKENDS.find((x) => x === v);
  if (!b) throw new Error(`--backend must be one of ${BACKENDS.join(', ')}`);
  return b;
}

function seedPolicyArg(v: string | undefined): SeedPolicy {
  if (v === undefined) return 'until-each-rejected';
  const p = SEED_POLICIES.find((x) => x === v);
  if (!p) throw new Error(`--seed-policy must be one of ${SEED_POLICIES.join(', ')}`);
  return p;
}

function intArg(v: string | undefined, name: string, dflt: number): number {
  if (v === undefined) return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`--${name} must be a positive integer`);
  return n;
}

const opt = (v: string | undefined) => (v === undefined ? undefined : resolveUserPath(v));

async function cmdRunDays(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      'clock-mode':{type:'string'},'sim-model':{type:'string'},'text-cost':{type:'string'},'interruptions':{type:'string'},
      'minimum-effect':{type:'string'},'novelty-weight':{type:'string'},'hotspots':{type:'string'},'offline-archive':{type:'string'},'historical-nightly':{type:'boolean',default:false},
      'generator-only':{type:'boolean',default:false}, 'discovery-nights':{type:'string'}, 'bounded-costs':{type:'boolean',default:false}, 'tailoring-sessions':{type:'boolean',default:false},
      protocol: { type: 'string' }, cadence: { type: 'string' }, departments: { type: 'string' },
      days: { type: 'string' }, backend: { type: 'string' }, world: { type: 'string' }, 'replay-from': { type: 'string' }, 'replay-allow-drift': {type:'boolean',default:false},
      'run-id': { type: 'string' }, parallel:{type:'boolean',default:false},resume: { type: 'boolean', default: false }, personas: { type: 'string' }, 'seed-policy': { type: 'string' }, 'runs-root': { type: 'string' },
      model: { type: 'string' }, 'service-tier': { type: 'string' }, 'reasoning-effort': { type: 'string' }, 'v3-day': { type: 'string' }, 'v2-day': { type: 'string' }, 'feature-day': { type: 'string' }, 'migration-day': { type: 'string' }, fhir: { type: 'string' },
    },
  });
  if (values.protocol && values.protocol !== 'core-10day' && values.protocol !== CADENCE_PROTOCOL) throw Error('Unknown release protocol');
  const useArchive = values.protocol === CADENCE_PROTOCOL || (!values.protocol && Boolean(values.cadence));
  const llm = values['generator-only'] ? generatorOnlyBackend : createBackend(backendArg(values.backend), { replayFrom: opt(values['replay-from']), replayAllowDrift:values['replay-allow-drift'], model: values.model, serviceTier: values['service-tier'], reasoningEffort: values['reasoning-effort'] });
  const structurePolicy=values['historical-nightly']?false:structurePolicySchema.parse({
    ...(values['minimum-effect']!==undefined?{minimumEffect:Number(values['minimum-effect'])}:{}),
    ...(values['novelty-weight']!==undefined?{noveltyWeight:Number(values['novelty-weight'])}:{}),
    ...(values.hotspots!==undefined?{topK:Number(values.hotspots)}:{}),
  });
  const offlineArchive=values['offline-archive']?await readJson(resolveUserPath(values['offline-archive']),z.object({programs:z.array(programSchema)})):undefined;
  const simulationModes=simulationModesSchema.parse({clockMode:values['clock-mode']??'continuous',interruptions:values.interruptions??'realWork',simModel:values['sim-model']??'wave3',textCost:values['text-cost']??'length'});
  const summary = await runDays({ simulationModes,structurePolicy,...(offlineArchive?{offlineArchive:offlineArchive.programs}:{}),
    ...(useArchive ? { protocol: CADENCE_PROTOCOL } : {}),
    ...(values['generator-only'] ? {generatorOnly:true}:{}),
    ...(values['discovery-nights'] ? {discoveryNights:intArg(values['discovery-nights'],'discovery-nights',3)}:{}),
    ...(values['bounded-costs'] ? {boundedCosts:true}:{}),
    ...(values['tailoring-sessions'] ? {tailoringSessions:true}:{}),
    ...(values.cadence ? { cadence: parseCadence(values.cadence) } : {}),
    ...(values.departments ? { departments: z.record(z.string(), z.string().trim().min(1)).parse(JSON.parse(values.departments)) } : {}),
    days: intArg(values.days, 'days', 10),
    resume: values.resume,parallel:values.parallel,
    llm,
    worldDir: resolveUserPath(values.world ?? 'runs/world/2'),
    ...(values['runs-root'] ? { runsRoot: resolveUserPath(values['runs-root']) } : {}),
    ...(values['run-id'] ? { runId: values['run-id'] } : {}),
    ...(values.personas ? { personas: values.personas.split(',').map((s) => s.trim()) } : {}),
    seedPolicy: seedPolicyArg(values['seed-policy']),
    releaseDays: { v2: intArg(values['feature-day'] ?? values['v2-day'], 'feature-day', RELEASE_DAYS.v2), v3: intArg(values['migration-day'] ?? values['v3-day'], 'migration-day', RELEASE_DAYS.v3) },
    ...(values.fhir ? { fhirBundles: values.fhir.split(',').map((f) => resolveUserPath(f.trim())) } : {}),
    log: (line) => console.log(line),
  });
  console.log(`\nrun ${summary.runId} -> ${summary.dir}`);
  console.log(`rejections logged: ${summary.rejections.length}; tempting-move kinds rejected: ${summary.seededRejectedKinds.join(', ') || 'none'}`);
  console.log(`invalid patches: ${summary.invalidPatches.length}; screen assertion failures: ${summary.screenFailures.length}; infrastructure errors: ${summary.infrastructureErrors.length}`);
  if (summary.infrastructureErrors.length) throw new Error(`${summary.infrastructureErrors.length} infrastructure errors; inspect manifest/decisions before continuing`);
  if (summary.llmErrors.length) throw new Error(`${summary.llmErrors.length} LLM calls failed; see decision flags and llm/*.error.json`);
}

async function cmdTryToBreakIt(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      persona: { type: 'string' }, request: { type: 'string' }, backend: { type: 'string' }, run: { type: 'string' },
      world: { type: 'string' }, 'replay-from': { type: 'string' }, 'replay-allow-drift': {type:'boolean',default:false}, spec: { type: 'string' }, out: { type: 'string' }, model: { type: 'string' }, 'service-tier': { type: 'string' }, 'reasoning-effort': { type: 'string' },
    },
  });
  if (!values.persona || !values.request) throw new Error('--persona and --request are required');
  const ehr = retryEhr(createEhr());
  const runDir = opt(values.run);
  let worldDir = opt(values.world);
  if (!worldDir && runDir) {
    const manifest = await readJson(path.join(runDir, 'manifest.json'), z.object({ world: z.string() }));
    worldDir = manifest.world;
  }
  if (!worldDir) throw new Error('pass --run runs/<run-id> or --world runs/world/<seed>');
  const world = await loadWorld(worldDir);
  const params = world.personas.get(values.persona);
  if (!params) throw new Error(`persona ${values.persona} is not in the world`);
  const persona = { id: values.persona, userId: world.userId(values.persona), params };

  const runStore = runDir ? new RunStore(runDir) : null;
  const deployed = runStore && existsSync(path.join(runStore.dir, 'programs', persona.id, 'deployed.json')) ? await runStore.login(persona.id) : null;
  const release = await loadRelease(values.spec ?? deployed?.program.specVersion ?? RELEASE_IDS.base, ehr);
  const program = deployed?.program ?? personalize(release.canonical, params, persona.userId);

  const outDir = opt(values.out) ?? runDir ?? path.join(REPO_ROOT, 'runs', `break-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  const llm = createBackend(backendArg(values.backend), { replayFrom: opt(values['replay-from']), replayAllowDrift:values['replay-allow-drift'], model: values.model, serviceTier: values['service-tier'], reasoningEffort: values['reasoning-effort'] });
  const store = new RunStore(outDir);
  const request=values.request;
  const res = await auditedOperation(path.join(outDir,'break'),llm,persona.id,null,()=>runTryToBreakIt(
    { runId: path.basename(outDir), store, ehr, screens: retryScreens(createScreenChecker(ehr)), agent: new LlmAgent(new RecordingLlm(llm, outDir)), seedPolicy: 'none', seedState: { rejected: new Set(), injected: 0 }, worldDir, worldSeed: world.manifest.seed },
    { persona, release, program, request },
  ));
  console.log(JSON.stringify({
    request: res.request,
    persona: res.persona,
    backend: res.backend,
    agentSays: res.hypothesis,
    candidate: res.candidate ? { summary: res.candidate.candidate.summary, patch: res.candidate.candidate.patch } : null,
    verdict: res.verdict.status,
    property: res.verdict.property,
    message: res.verdict.message,
    counterexample: res.verdict.counterexample,
    screens: res.verdict.screens,
    file: res.file,
    ehr: ehr.mode,
  }, null, 2));
}

function modeArg(v: string | undefined): NightMode {
  if (v === undefined) return 'auto';
  const m = NIGHT_MODES.find((x) => x === v);
  if (!m) throw new Error(`--mode must be one of ${NIGHT_MODES.join(', ')}`);
  return m;
}

async function cmdNight(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      run: { type: 'string' }, persona: { type: 'string' }, night: { type: 'string' }, backend: { type: 'string' },
      mode: { type: 'string' }, 'replay-from': { type: 'string' }, 'replay-allow-drift': {type:'boolean',default:false}, out: { type: 'string' }, model: { type: 'string' }, 'service-tier': { type: 'string' }, 'reasoning-effort': { type: 'string' },
    },
  });
  if (!values.run || !values.persona || !values.night) throw new Error('--run, --persona and --night are required');
  const { result, outDir } = await rerunNight({
    runDir: resolveUserPath(values.run),
    persona: values.persona,
    night: intArg(values.night, 'night', 1),
    llm: createBackend(backendArg(values.backend), { replayFrom: opt(values['replay-from']), replayAllowDrift:values['replay-allow-drift'], model: values.model, serviceTier: values['service-tier'], reasoningEffort: values['reasoning-effort'] }),
    ehr: createEhr(),
    mode: modeArg(values.mode),
    ...(values.out ? { outDir: resolveUserPath(values.out) } : {}),
  });
  const r = result.record;
  console.log(JSON.stringify({
    night: r.night, persona: r.persona, mode: r.mode, outcome: r.outcome, versionBefore: r.versionBefore, versionAfter: r.versionAfter,
    backend: r.backend, hypothesis: r.hypothesis,
    candidates: r.candidates.map((e) => ({ id: e.candidate.id, summary: e.candidate.summary, seeded: e.candidate.seeded, check: e.check.status, property: e.check.property })),
    chosen: r.chosen, validation: r.validation.reason, release: r.release, flags: r.flags, outDir,
  }, null, 2));
}

async function cmdFakeWorld(argv: string[]): Promise<void> {
  const { values } = parseArgs({ args: argv, options: { out: { type: 'string' }, days: { type: 'string' }, seed: { type: 'string' } } });
  if (!values.out) throw new Error('--out is required');
  const dir = await writeFakeWorld(resolveUserPath(values.out), { days: intArg(values.days, 'days', 10), seed: intArg(values.seed, 'seed', 7) });
  console.log(`fake world written to ${dir} (FAKE fixture: for EHR_FAKE=1 smoke runs only)`);
}

const COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  'cadence-fake': async argv => {
    const { values } = parseArgs({ args: argv, options: { out: { type: 'string' }, days: { type: 'string' } } });
    if (!values.out) throw Error('--out is required (synthetic artifacts only)');
    const { runFakeCadence } = await import('./fake/cadence.js');
    const { summary } = await runFakeCadence(resolveUserPath(values.out), { days: intArg(values.days, 'days', 9) });
    console.log(JSON.stringify({ warning: 'FAKE: no clinical certification or live model calls', ...summary }, null, 2));
  },
  'proposal-quality-compare': async argv => {
    const {values}=parseArgs({args:argv,options:{before:{type:'string'},after:{type:'string'}}});
    if(!values.before||!values.after)throw new Error('--before and --after sanity runs are required');
    const comparison=await compareSanityRuns(resolveUserPath(values.before),resolveUserPath(values.after));
    console.log(JSON.stringify({label:comparison.label,decisions:comparison.decisions,measured:comparison.measured,countDifferences:comparison.countDifferences,changed:comparison.changed.length,signChanged:comparison.signChanged.length}));
  },
  'proposal-quality-report': async argv => {
    const {values}=parseArgs({args:argv,options:{run:{type:'string'}}});
    if(!values.run)throw new Error('--run is required');
    const dir=resolveUserPath(values.run);
    const manifest=await readJson(path.join(dir,'manifest.json'),z.object({status:z.literal('completed')}));
    if(manifest.status==='completed'){
      const records=await readJson(path.join(dir,'records.json'),z.array(offlineRecordSchema));
      const rows=records.every(r=>r.arm==='sanity')?refreshSanityRepetitions(records,await historicalDecisions(path.join(dir,'inputs'))):records;
      await writeQualityReport(dir,rows);
    }
  },
  'proposal-quality': async argv => {
    const {values}=parseArgs({args:argv,options:{run:{type:'string'},out:{type:'string'},decisions:{type:'string'},arms:{type:'string'},samples:{type:'string'},backend:{type:'string'},workers:{type:'string'},world:{type:'string'},model:{type:'string'},'reasoning-effort':{type:'string'},'service-tier':{type:'string'},'ledger-from':{type:'string'},resume:{type:'boolean'},'geometry-from':{type:'string'},'app-build':{type:'string'},'tool-replay-from':{type:'string'},'tool-max-calls':{type:'string'},'tool-max-checks':{type:'string'},'tool-max-estimates':{type:'string'},'tool-wall-ms':{type:'string'},'tool-max-tokens':{type:'string'},'rlm-max-turns':{type:'string'},'rlm-max-sub-calls':{type:'string'},'rlm-wall-ms':{type:'string'},'rlm-sub-model':{type:'string'},'rlm-sub-reasoning-effort':{type:'string'},harness:{type:'string'},'reuse-arm-from':{type:'string'},'reuse-arm':{type:'string'},'harness-model':{type:'string'},'harness-max-commands':{type:'string'},'harness-max-turns':{type:'string'},'harness-max-launches':{type:'string'},'harness-wall-ms':{type:'string'}}});
    if(!values.run||!values.out)throw new Error('--run and --out are required');
    const backend=backendArg(values.backend??'replay');
    const arms:QualityArm[]=(values.arms??'A').split(',').map(a=>{if(a==='A'||a==='B'||a==='C'||a==='D'||a==='E'||a==='R'||a==='H'||a==='sanity')return a;throw new Error('--arms must contain A, B, C, D, E, R, H or sanity');});
    if(values.harness!==undefined&&values.harness!=='codex'&&values.harness!=='claude')throw new Error('--harness must be codex or claude');
    const harness=arms.includes('H')?{...(values.harness==='codex'||values.harness==='claude'?{harness:values.harness}:{}),...(values['harness-model']?{harnessModel:values['harness-model']}:{}),
      harnessBudget:{maxCommands:intArg(values['harness-max-commands'],'harness-max-commands',DEFAULT_HARNESS_BUDGET.maxCommands),maxChecks:intArg(values['tool-max-checks'],'tool-max-checks',DEFAULT_HARNESS_BUDGET.maxChecks),
        maxEstimates:intArg(values['tool-max-estimates'],'tool-max-estimates',DEFAULT_HARNESS_BUDGET.maxEstimates),maxTurns:intArg(values['harness-max-turns'],'harness-max-turns',DEFAULT_HARNESS_BUDGET.maxTurns),
        maxLaunches:intArg(values['harness-max-launches'],'harness-max-launches',DEFAULT_HARNESS_BUDGET.maxLaunches),wallMs:intArg(values['harness-wall-ms'],'harness-wall-ms',DEFAULT_HARNESS_BUDGET.wallMs)}}:{};
    const reuse=values['reuse-arm-from']||values['reuse-arm']?{reuseArmFrom:resolveUserPath(values['reuse-arm-from']??(()=>{throw new Error('--reuse-arm needs --reuse-arm-from <run>');})()),reuseArm:arms.find(a=>a===values['reuse-arm'])??(()=>{throw new Error('--reuse-arm must name one of --arms');})()}:{};
    await evaluateQuality({...harness,...reuse,...(values['geometry-from']?{geometryFrom:resolveUserPath(values['geometry-from'])}:{}),...(values['app-build']?{appBuild:resolveUserPath(values['app-build'])}:{}),...(values['tool-replay-from']?{toolReplayFrom:resolveUserPath(values['tool-replay-from'])}:{}),
      toolBudget:{maxCalls:intArg(values['tool-max-calls'],'tool-max-calls',60),maxChecks:intArg(values['tool-max-checks'],'tool-max-checks',12),maxEstimates:intArg(values['tool-max-estimates'],'tool-max-estimates',8),wallMs:intArg(values['tool-wall-ms'],'tool-wall-ms',900000),maxTokens:intArg(values['tool-max-tokens'],'tool-max-tokens',120000)},rlmBudget:{...DEFAULT_RLM_BUDGET,maxRootTurns:intArg(values['rlm-max-turns'],'rlm-max-turns',DEFAULT_RLM_BUDGET.maxRootTurns),maxSubCalls:intArg(values['rlm-max-sub-calls'],'rlm-max-sub-calls',DEFAULT_RLM_BUDGET.maxSubCalls),
        maxChecks:intArg(values['tool-max-checks'],'tool-max-checks',DEFAULT_RLM_BUDGET.maxChecks),maxEstimates:intArg(values['tool-max-estimates'],'tool-max-estimates',DEFAULT_RLM_BUDGET.maxEstimates),wallMs:intArg(values['rlm-wall-ms'],'rlm-wall-ms',DEFAULT_RLM_BUDGET.wallMs)},
      ...(values['rlm-sub-model']?{rlmSubModel:values['rlm-sub-model']}:{}),...(values['rlm-sub-reasoning-effort']?{rlmSubReasoningEffort:values['rlm-sub-reasoning-effort']}:{}),
      runDir:resolveUserPath(values.run),outDir:resolveUserPath(values.out),arms,samples:intArg(values.samples,'samples',1),backend,workers:intArg(values.workers,'workers',1),
      ...(values['ledger-from']?{ledgerFrom:resolveUserPath(values['ledger-from'])}:{}),...(values.resume?{resume:true}:{}),...(values.decisions?{decisions:values.decisions.split(',')}:{}),...(values.world?{worldDir:resolveUserPath(values.world)}:{}),
      ...(values.model?{model:values.model}:{}),...(values['reasoning-effort']?{reasoningEffort:values['reasoning-effort']}:{}),...(values['service-tier']?{serviceTier:values['service-tier']}:{}),
    });
  },
  'run-days': cmdRunDays,
  'try-to-break-it': cmdTryToBreakIt,
  night: cmdNight,
  'fake-world': cmdFakeWorld,
};

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === '--help' || cmd === 'help') {
  console.log(`usage: tsx src/cli.ts <${Object.keys(COMMANDS).join('|')}> [options]\n--backend ${BACKENDS.join('|')} [--model M]\nopenai-compat: OPENAI_COMPAT_BASE_URL required; --model or OPENAI_COMPAT_MODEL required.\nOPENAI_COMPAT_SCHEMA_MODE=json_schema|json_object|prompt (default json_schema).\nRecorded model comparison: tsx src/model-compare.ts --help`);
  process.exit(0);
}
const handler = cmd ? COMMANDS[cmd] : undefined;
if (!handler) {
  console.error(`usage: tsx src/cli.ts <${Object.keys(COMMANDS).join('|')}> [options]`);
  process.exit(2);
}
handler(rest.filter((a) => a !== '--')).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
