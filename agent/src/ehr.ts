/**
 * Adapter for the native Lean `ehr` CLI (lean/.lake/build/bin/ehr; override
 * with EHR_BIN). Inputs go to JSON files in a temp dir; outputs are read from
 * stdout and validated against the Lean-format mirrors.
 *
 * ASSUMED command lines (the Lean lane has not published the CLI yet; keep
 * this block in sync with agent/STATUS.md):
 *
 *   ehr check     --spec <ver> --program P.json --prev PREV.json --canonical C.json
 *                 stdout: Verdict              exit 0 = ok, 1 = violation
 *   ehr simulate  --spec <ver> --program P.json --persona PP.json --schedule DAY.json
 *                 --world <worldDir> --seed <n>
 *                 stdout: DayResult
 *   ehr min-clicks --spec <ver> --program P.json --schedule DAY.json --world <worldDir>
 *                 stdout: { tasks: [{ task, workflow?, clicks, keystrokes }] }
 *   ehr deploy    --spec <ver> --program P.json --prev PREV.json --canonical C.json --out <dir>
 *                 stdout: Certificate (exit 0) | Verdict (exit 1, refused; T4)
 *
 * IMPLEMENTED by lane/lean-core (lean/Main.lean, M3), matched here:
 *   ehr run-batch <file.jsonl>   one BatchCase {spec, program, facts, user, events} per line
 *                                stdout: one BatchStep {case, index, state, result, view} per event (JSONL)
 *   ehr spec-export <name>       stdout: Spec
 *   (also init / step / view on stdin; the agent loop does not need them)
 *
 * `--spec` names a Lean spec module version ("v1", "v1.1", "v2"); the spec
 * itself is compiled into the checker, never passed in as JSON.
 *
 * EHR_FAKE=1 swaps in `createFakeEhr()` (src/fake/ehr-fake.ts): plausible,
 * deterministic outputs FOR TESTS ONLY. It certifies nothing.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { z } from 'zod';
import {
  certificateSchema, dayResultSchema, minClicksResultSchema, specSchema, verdictSchema,
  type Certificate, type DayResult, type DaySchedule, type MinClicksResult, type PersonaParams, type Program,
  type Spec, type Verdict,
} from './schema.js';
import { REPO_ROOT, writeJson } from './util.js';
import { createFakeEhr } from './fake/ehr-fake.js';

export interface CheckInput { specVersion: string; program: Program; prev: Program; canonical: Program }
export interface SimulateInput {
  specVersion: string;
  program: Program;
  persona: PersonaParams;
  schedule: DaySchedule;
  worldDir: string;
  seed: number;
}
export interface MinClicksInput { specVersion: string; program: Program; schedule: DaySchedule; worldDir: string }
export interface DeployInput extends CheckInput { outDir: string }
export type DeployResult = { deployed: true; certificate: Certificate } | { deployed: false; verdict: Verdict };

export interface EhrClient {
  readonly mode: 'real' | 'fake';
  readonly binary: string | null;
  check(input: CheckInput): Promise<Verdict>;
  simulate(input: SimulateInput): Promise<DayResult>;
  minClicks(input: MinClicksInput): Promise<MinClicksResult>;
  deploy(input: DeployInput): Promise<DeployResult>;
  /** `ehr run-batch`: cases in, one output object per event (JSONL parsed). */
  runBatch(cases: readonly unknown[]): Promise<unknown[]>;
  specExport(specVersion: string): Promise<Spec>;
}

export const DEFAULT_EHR_BIN = path.join(REPO_ROOT, 'lean', '.lake', 'build', 'bin', 'ehr');

export function createEhr(opts: { fake?: boolean; binary?: string } = {}): EhrClient {
  const fake = opts.fake ?? process.env['EHR_FAKE'] === '1';
  if (fake) return createFakeEhr();
  return new CliEhr(opts.binary ?? process.env['EHR_BIN'] ?? DEFAULT_EHR_BIN);
}

interface ExecResult { code: number; stdout: string; stderr: string }

function run(binary: string, args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { maxBuffer: 1 << 30, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error && typeof error.code !== 'number') {
        reject(new Error(`ehr ${args[0] ?? ''}: ${error.message}`));
        return;
      }
      resolve({ code: error && typeof error.code === 'number' ? error.code : 0, stdout, stderr });
    });
  });
}

function parseOut<T extends z.ZodType>(cmd: string, res: ExecResult, schema: T): z.infer<T> {
  let json: unknown;
  try {
    json = JSON.parse(res.stdout);
  } catch {
    throw new Error(`ehr ${cmd}: exit ${res.code}, stdout is not JSON. stderr: ${res.stderr.slice(0, 2000)}`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`ehr ${cmd}: unexpected output shape (${first ? `${first.path.join('.')}: ${first.message}` : '?'})`);
  }
  return parsed.data;
}

class CliEhr implements EhrClient {
  readonly mode = 'real' as const;
  constructor(readonly binary: string) {}

  private async withFiles<T>(files: Record<string, unknown>, fn: (paths: Record<string, string>) => Promise<T>): Promise<T> {
    if (!existsSync(this.binary)) {
      throw new Error(`ehr binary not found at ${this.binary} (build lean/ with \`lake build\`, set EHR_BIN, or EHR_FAKE=1 for tests)`);
    }
    const dir = await mkdtemp(path.join(tmpdir(), 'ehr-'));
    try {
      const paths: Record<string, string> = {};
      for (const [name, value] of Object.entries(files)) {
        const p = path.join(dir, `${name}.json`);
        await writeJson(p, value);
        paths[name] = p;
      }
      return await fn(paths);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  check(i: CheckInput): Promise<Verdict> {
    return this.withFiles({ program: i.program, prev: i.prev, canonical: i.canonical }, async (p) => {
      const res = await run(this.binary, ['check', '--spec', i.specVersion, '--program', p['program'] ?? '', '--prev', p['prev'] ?? '', '--canonical', p['canonical'] ?? '']);
      return parseOut('check', res, verdictSchema);
    });
  }

  simulate(i: SimulateInput): Promise<DayResult> {
    return this.withFiles({ program: i.program, persona: i.persona, schedule: i.schedule }, async (p) => {
      const res = await run(this.binary, [
        'simulate', '--spec', i.specVersion, '--program', p['program'] ?? '', '--persona', p['persona'] ?? '',
        '--schedule', p['schedule'] ?? '', '--world', i.worldDir, '--seed', String(i.seed),
      ]);
      if (res.code !== 0) throw new Error(`ehr simulate: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
      return parseOut('simulate', res, dayResultSchema);
    });
  }

  minClicks(i: MinClicksInput): Promise<MinClicksResult> {
    return this.withFiles({ program: i.program, schedule: i.schedule }, async (p) => {
      const res = await run(this.binary, [
        'min-clicks', '--spec', i.specVersion, '--program', p['program'] ?? '', '--schedule', p['schedule'] ?? '', '--world', i.worldDir,
      ]);
      if (res.code !== 0) throw new Error(`ehr min-clicks: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
      return parseOut('min-clicks', res, minClicksResultSchema);
    });
  }

  deploy(i: DeployInput): Promise<DeployResult> {
    return this.withFiles({ program: i.program, prev: i.prev, canonical: i.canonical }, async (p) => {
      const res = await run(this.binary, [
        'deploy', '--spec', i.specVersion, '--program', p['program'] ?? '', '--prev', p['prev'] ?? '',
        '--canonical', p['canonical'] ?? '', '--out', i.outDir,
      ]);
      if (res.code === 0) return { deployed: true, certificate: parseOut('deploy', res, certificateSchema) };
      return { deployed: false, verdict: parseOut('deploy', res, verdictSchema) };
    });
  }

  async runBatch(cases: readonly unknown[]): Promise<unknown[]> {
    if (!existsSync(this.binary)) throw new Error(`ehr binary not found at ${this.binary}`);
    const dir = await mkdtemp(path.join(tmpdir(), 'ehr-'));
    try {
      const file = path.join(dir, 'batch.jsonl');
      await writeFile(file, cases.map((c) => JSON.stringify(c)).join('\n') + '\n');
      const res = await run(this.binary, ['run-batch', file]);
      const out = res.stdout.split('\n').filter((l) => l.trim() !== '').map((l): unknown => JSON.parse(l));
      if (res.code !== 0) throw new Error(`ehr run-batch: exit ${res.code}: ${res.stderr.slice(0, 2000)} ${JSON.stringify(out.slice(0, 3))}`);
      return out;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async specExport(specVersion: string): Promise<Spec> {
    if (!existsSync(this.binary)) throw new Error(`ehr binary not found at ${this.binary}`);
    const res = await run(this.binary, ['spec-export', specVersion]);
    if (res.code !== 0) throw new Error(`ehr spec-export: exit ${res.code}: ${res.stderr.slice(0, 2000)}`);
    return parseOut('spec-export', res, specSchema);
  }
}
