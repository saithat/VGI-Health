import { interruptionDayResultSchema as dayResultSchema } from '../../app/src/dashboard/interruption-schema.js';
import { retryInfrastructure } from './infrastructure.js';
import { InfrastructureError } from './errors.js';
import {exportPopupGeometry} from './geometry-popups.js';
/**
 * Adapter for the native Lean `ehr` CLI (lean/.lake/build/bin/ehr; override
 * with EHR_BIN). Inputs go to JSON files in a temp dir; outputs are read from
 * stdout and validated against the Lean-format mirrors.
 *
 * Native command lines (JSON spec files for check, deploy and render):
 *
 *   ehr check     --spec <spec.json> --program P.json --prev PREV.json --canonical C.json
 *                 stdout: Verdict              exit 0 = ok, 1 = violation
 *   ehr simulate  --spec <spec.json> --program P.json --persona PP.json --schedule DAY.json
 *                 --world <worldDir> --seed <n> [--policy expert|bounded] [--memory-in FILE]
 *                 stdout: DayResult
 *   ehr min-clicks --spec <spec.json> --program P.json --schedule DAY.json --world <worldDir>
 *                 stdout: { tasks: [{ task, workflow?, clicks, keystrokes }] }
 *   ehr deploy    --spec <spec.json> --program P.json --prev PREV.json --canonical C.json --out <dir>
 *                 stdout: Certificate (exit 0 published, exit 1 refused; T4)
 *   ehr render-screens --spec <spec.json> --program P.json --fhir <bundle.json> --out <dir>
 *                 writes one page-tree JSON (Html) per screen/state into <dir>,
 *                 named <screenId>.json or <screenId>__<state>.json; exit 0 = ok
 *                 (input to the offline screen check, src/screencheck.ts)
 *
 * IMPLEMENTED by lane/lean-core (lean/Main.lean, M3), matched here:
 *   ehr run-batch <file.jsonl>   one BatchCase {spec, program, facts, user, events} per line
 *                                stdout: one BatchStep {case, index, state, result, view} per event (JSONL)
 *   ehr spec-export <name>       stdout: Spec
 *   (also init / step / view on stdin; the agent loop does not need them)
 *
 * The adapter resolves release versions to releases/<version>/spec.json.
 * Simulator also accepts release version names; spec-export uses names.
 *
 * EHR_FAKE=1 swaps in `createFakeEhr()` (src/fake/ehr-fake.ts): plausible,
 * deterministic outputs FOR TESTS ONLY. It certifies nothing.
 */
import { expandProgram } from './composites.js';
import { programSchema } from '../../app/src/dashboard/measurement-schema.js';
import {runNative,nativeTimeout,type NativeResult} from './native-process.js';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { z } from 'zod';
import {
  certificateSchema, minClicksResultSchema, specSchema, verdictSchema,
  type Certificate, type DayResult, type DaySchedule, type MinClicksResult, type PersonaParams, type Program, type UserMemory,
  type Spec, type Verdict,
} from '../../app/src/dashboard/measurement-schema.js';
import { REPO_ROOT, writeJson } from './util.js';
import { createFakeEhr } from './fake/ehr-fake.js';

export interface CheckInput { specVersion: string; program: Program; prev: Program; canonical: Program; workload?: DaySchedule['tasks'] }
export interface SimulateInput {
  specVersion: string;
  program: Program;
  persona: PersonaParams;
  schedule: DaySchedule;
  worldDir: string;
  seed: number;
  memory?: UserMemory;
  policy?: 'expert' | 'bounded';
  clockMode?: 'continuous' | 'legacy';
  interruptions?: 'realWork' | 'fixedCost';
  simModel?: 'wave3' | 'legacy';
  textCost?: 'length' | 'legacy';
  interruptionProfile?: 'wardNurse' | 'surgicalPhysician' | 'clinicPrescriber' | 'emergencyPhysician' | 'inpatientPharmacy';
}
export interface MinClicksInput { specVersion: string; program: Program; schedule: DaySchedule; worldDir: string }
export interface DeployInput extends CheckInput { outDir: string }
export interface RenderInput { specVersion: string; program: Program; fhir: string; outDir: string; ui?: boolean; workspace?: { schedule: DaySchedule; worldDir: string } }
export type DeployResult = { deployed: true; certificate: Certificate } | { deployed: false; verdict: Verdict };

export interface EhrClient {
  readonly mode: 'real' | 'fake';
  readonly binary: string | null;
  check(input: CheckInput): Promise<Verdict>;
  simulate(input: SimulateInput): Promise<DayResult>;
  minClicks(input: MinClicksInput): Promise<MinClicksResult>;
  deploy(input: DeployInput): Promise<DeployResult>;
  /** `ehr render-screens`: page trees for every screen of the program; returns the files written. */
  renderScreens(input: RenderInput): Promise<string[]>;
  /** `ehr run-batch`: cases in, one output object per event (JSONL parsed). */
  runBatch(cases: readonly unknown[]): Promise<unknown[]>;
  specExport(specVersion: string): Promise<Spec>;
}

export const DEFAULT_EHR_BIN = path.join(REPO_ROOT, 'lean', '.lake', 'build', 'bin', 'ehr');

export function createEhr(opts: { fake?: boolean; binary?: string; timeoutMs?:number } = {}): EhrClient {
  const fake = opts.fake ?? process.env['EHR_FAKE'] === '1';
  if (fake) {
    if (process.env['NODE_ENV'] !== 'test' && process.env['VITEST'] !== 'true') {
      throw new Error('EHR_FAKE is only available in unit tests; live runs require the real Lean CLI');
    }
    return createFakeEhr();
  }
  return new CliEhr(opts.binary ?? process.env['EHR_BIN'] ?? DEFAULT_EHR_BIN,opts.timeoutMs??nativeTimeout());
}

type ExecResult=NativeResult;

function parseOut<T extends z.ZodType>(cmd: string, res: ExecResult, schema: T): z.infer<T> {
  let json: unknown;
  try {
    json = JSON.parse(res.stdout);
  } catch {
    throw new InfrastructureError(`ehr ${cmd}: exit ${res.code}, stdout is not JSON. stderr: ${res.stderr.slice(0, 2000)}`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new InfrastructureError(`ehr ${cmd}: unexpected output shape (${first ? `${first.path.join('.')}: ${first.message}` : '?'})`);
  }
  return parsed.data;
}

class CliEhr implements EhrClient {
  readonly mode = 'real' as const;
  constructor(readonly binary: string,private readonly timeoutMs:number) {}
  private run(args:string[]){return retryInfrastructure(`ehr:${args[0]??'command'}`,()=>runNative(this.binary,args,{timeoutMs:this.timeoutMs}));}

  private async withFiles<T>(files: Record<string, unknown>, fn: (paths: Record<string, string>) => Promise<T>): Promise<T> {
    if (!existsSync(this.binary)) {
      throw new InfrastructureError(`ehr binary not found at ${this.binary} (build lean/ with \`lake build\`, set EHR_BIN, or EHR_FAKE=1 for tests)`);
    }
    const dir = await mkdtemp(path.join(tmpdir(), 'ehr-'));
    try {
      const paths: Record<string, string> = {};
      for (const [name, value] of Object.entries(files)) {
        const p = path.join(dir, `${name}.json`);
        await writeJson(p, ['program', 'prev', 'canonical'].includes(name) ? expandProgram(programSchema.parse(value)) : value);
        paths[name] = p;
      }
      return await fn(paths);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private specPath(version: string): string {
    return version.endsWith('.json') ? path.resolve(version) : path.join(REPO_ROOT, 'releases', version, 'spec.json');
  }

  check(i: CheckInput): Promise<Verdict> {
    return this.withFiles({ program: i.program, prev: i.prev, canonical: i.canonical, ...(i.workload ? {workload:i.workload} : {}) }, async (p) => {
      const res = await this.run(['check', '--spec', this.specPath(i.specVersion), '--program', p['program'] ?? '', '--prev', p['prev'] ?? '', '--canonical', p['canonical'] ?? '', ...(i.workload ? ['--workload',p['workload'] ?? ''] : [])]);
      return parseOut('check', res, verdictSchema);
    });
  }

  simulate(i: SimulateInput): Promise<DayResult> {
    return this.withFiles({ program: i.program, persona: i.persona, schedule: i.schedule, ...(i.memory ? {memory:i.memory} : {}) }, async (p) => {
      const res = await this.run([
        'simulate', '--spec', this.specPath(i.specVersion), '--program', p['program'] ?? '', '--persona', p['persona'] ?? '',
        '--schedule', p['schedule'] ?? '', '--world', i.worldDir, '--seed', String(i.seed),
        ...(i.policy ? ['--policy',i.policy] : []),
        ...(i.clockMode ? ['--clock-mode', i.clockMode] : []),
        ...(i.interruptions ? ['--interruptions', i.interruptions] : []),
        ...(i.simModel ? ['--sim-model', i.simModel] : []),
        ...(i.textCost ? ['--text-cost', i.textCost] : []),
        ...(i.interruptionProfile ? ['--interruption-profile', i.interruptionProfile] : []),
        ...(i.memory ? ['--memory-in',p['memory'] ?? ''] : []),
      ]);
      if (res.code !== 0) throw new InfrastructureError(`ehr simulate: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
      return parseOut('simulate', res, dayResultSchema);
    });
  }

  minClicks(i: MinClicksInput): Promise<MinClicksResult> {
    return this.withFiles({ program: i.program, schedule: i.schedule }, async (p) => {
      const res = await this.run([
        'min-clicks', '--spec', this.specPath(i.specVersion), '--program', p['program'] ?? '', '--schedule', p['schedule'] ?? '', '--world', i.worldDir,
      ]);
      if (res.code !== 0) throw new InfrastructureError(`ehr min-clicks: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
      return parseOut('min-clicks', res, minClicksResultSchema);
    });
  }

  deploy(i: DeployInput): Promise<DeployResult> {
    return this.withFiles({ program: i.program, prev: i.prev, canonical: i.canonical, ...(i.workload ? {workload:i.workload} : {}) }, async (p) => {
      const res = await this.run([
        'deploy', '--spec', this.specPath(i.specVersion), '--program', p['program'] ?? '', '--prev', p['prev'] ?? '',
        '--canonical', p['canonical'] ?? '', '--out', i.outDir,
        ...(i.workload ? ['--workload',p['workload'] ?? ''] : []),
      ]);
      const certificate = parseOut('deploy', res, certificateSchema);
      if (res.code === 0 && certificate.verdict === 'ok') return { deployed: true, certificate };
      return { deployed: false, verdict: certificate.verdict };
    });
  }

  renderScreens(i: RenderInput): Promise<string[]> {
    return this.withFiles({ program: i.program, user: { id: i.program.owner, role: i.program.role }, ...(i.workspace ? { schedule: i.workspace.schedule } : {}) }, async (p) => {
      await mkdir(i.outDir, { recursive: true });
      const res = await this.run(['render-screens', ...(i.ui ? ['--ui'] : []), ...(i.workspace ? ['--schedule', p['schedule'] ?? '', '--world', i.workspace.worldDir] : []), '--spec', this.specPath(i.specVersion), '--program', p['program'] ?? '', '--fhir', i.fhir, '--user', p['user'] ?? '', '--out', i.outDir]);
      if (res.code !== 0) throw new InfrastructureError(`ehr render-screens: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
      if(i.ui)await exportPopupGeometry(this.binary,{program:i.program,specFile:this.specPath(i.specVersion),fhir:i.fhir,outDir:i.outDir});
      return (await readdir(i.outDir)).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(i.outDir, f));
    });
  }

  async runBatch(cases: readonly unknown[]): Promise<unknown[]> {
    if (!existsSync(this.binary)) throw new InfrastructureError(`ehr binary not found at ${this.binary}`);
    const dir = await mkdtemp(path.join(tmpdir(), 'ehr-'));
    try {
      const file = path.join(dir, 'batch.jsonl');
      await writeFile(file, cases.map((c) => JSON.stringify(c)).join('\n') + '\n');
      const res = await this.run(['run-batch', file]);
      const out = res.stdout.split('\n').filter((l) => l.trim() !== '').map((l): unknown => JSON.parse(l));
      if (res.code !== 0) throw new InfrastructureError(`ehr run-batch: exit ${res.code}: ${res.stderr.slice(0, 2000)} ${JSON.stringify(out.slice(0, 3))}`);
      return out;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async specExport(specVersion: string): Promise<Spec> {
    if (!existsSync(this.binary)) throw new InfrastructureError(`ehr binary not found at ${this.binary}`);
    const res = await this.run(['spec-export', specVersion]);
    if (res.code !== 0) throw new InfrastructureError(`ehr spec-export: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
    return parseOut('spec-export', res, specSchema);
  }
}
