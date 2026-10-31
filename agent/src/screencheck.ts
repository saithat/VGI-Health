/**
 * Offline per-version SCREEN CHECK (owner principle: nothing is checked at
 * runtime; every version is verified before the clinician logs in).
 *
 *   1. ehr render-screens --spec <ver> --program P.json --fhir <bundle> --out <dir>
 *      (render lane; ASSUMED: writes one page-tree JSON file per screen/state,
 *      named `<screenId>.json` or `<screenId>__<state>.json`)
 *   2. pnpm --filter app screen-check <dir>/*.json   (app lane, on main; exit 0 = pass)
 *   3. only if `ehr check` AND the screen check pass may `ehr deploy` run
 *      (enforced in night.ts `deployVersion`, the only deploy path).
 *
 * Sample bundles: `--fhir a.json,b.json` or EHR_SAMPLE_FHIR (comma-separated).
 * With none configured, the real checker fails closed: nothing deploys.
 *
 * EHR_FAKE=1: the fake ehr renders crude page trees and a fake check applies
 * one visual rule (component text over 80 characters overflows at 390px).
 * FOR TESTS ONLY.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { EhrClient } from './ehr.js';
import { isRecord } from './jsonpatch.js';
import type { CheckResult, Program, ScreenCheckResult } from './schema.js';

export type { ScreenCheckResult } from './schema.js';
import { REPO_ROOT, errorMessage } from './util.js';


export interface ScreenChecker {
  readonly mode: 'real' | 'fake';
  check(input: { specVersion: string; program: Program }): Promise<ScreenCheckResult>;
}

/** A failed screen check, in the same shape as a checker rejection (for the record). */
export function screenCheckRejection(r: ScreenCheckResult): CheckResult {
  return {
    status: 'fail', property: 'ScreenCheck', message: r.message, counterexample: null,
    screens: r.failingScreens, verdict: null,
  };
}

export function screenOfFile(file: string): string {
  return path.basename(file, '.json').split('__')[0] ?? file;
}

export function bundlesFromEnv(): string[] {
  return (process.env['EHR_SAMPLE_FHIR'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function createScreenChecker(ehr: EhrClient, opts: { fake?: boolean; bundles?: string[]; pnpm?: string } = {}): ScreenChecker {
  const fake = opts.fake ?? ehr.mode === 'fake';
  const bundles = opts.bundles ?? bundlesFromEnv();
  return fake ? new FakeScreenChecker(ehr) : new CliScreenChecker(ehr, bundles, opts.pnpm ?? process.env['PNPM_BIN'] ?? 'pnpm');
}

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const keep = (d: Buffer) => { output = (output + d.toString()).slice(-200_000); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', (e) => resolve({ code: 127, output: `${output}\n${e.message}` }));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

/** Files the Playwright report marks as failing ("✘ … visible components: <file>" or "1) … visible components: <file>"). */
export function failingFilesFromOutput(output: string, files: readonly string[]): string[] {
  const failed = new Set<string>();
  for (const line of output.split('\n')) {
    if (!/✘|×|^\s*\d+\)\s|failed|Error/i.test(line)) continue;
    for (const f of files) if (line.includes(f)) failed.add(f);
  }
  return [...failed];
}

class CliScreenChecker implements ScreenChecker {
  readonly mode = 'real' as const;
  constructor(private readonly ehr: EhrClient, private readonly bundles: string[], private readonly pnpm: string) {}

  async check(input: { specVersion: string; program: Program }): Promise<ScreenCheckResult> {
    const base = { mode: this.mode, bundles: this.bundles };
    if (this.bundles.length === 0) {
      return { ...base, status: 'fail', pages: 0, failingScreens: [], failingFiles: [], message: 'no sample FHIR bundle configured (--fhir or EHR_SAMPLE_FHIR); a version that was not screen-checked is never deployed' };
    }
    const dir = await mkdtemp(path.join(tmpdir(), 'screens-'));
    try {
      const files: string[] = [];
      for (const [i, bundle] of this.bundles.entries()) {
        try {
          files.push(...await this.ehr.renderScreens({ specVersion: input.specVersion, program: input.program, fhir: bundle, outDir: path.join(dir, `b${i}`) }));
        } catch (e) {
          return { ...base, status: 'fail', pages: files.length, failingScreens: [], failingFiles: [], message: `render-screens failed for ${bundle}: ${errorMessage(e)}` };
        }
      }
      if (files.length === 0) return { ...base, status: 'fail', pages: 0, failingScreens: [], failingFiles: [], message: 'render-screens produced no page trees' };
      const res = await run(this.pnpm, ['--filter', 'app', 'screen-check', ...files], REPO_ROOT);
      if (res.code === 0) return { ...base, status: 'pass', pages: files.length, failingScreens: [], failingFiles: [], message: `${files.length} page trees passed` };
      const failingFiles = failingFilesFromOutput(res.output, files);
      return {
        ...base, status: 'fail', pages: files.length, failingFiles: failingFiles.map((f) => path.relative(dir, f)),
        failingScreens: [...new Set(failingFiles.map(screenOfFile))],
        message: `screen-check exit ${res.code}: ${res.output.slice(-3000)}`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

// ---------------------------------------------------------------- fake (EHR_FAKE=1)
const MAX_TEXT = 80;

function walk(tree: unknown, visit: (compId: string, text: string) => void): string {
  if (!isRecord(tree)) return '';
  const t = tree['text'];
  if (isRecord(t) && typeof t['s'] === 'string') return t['s'];
  const node = tree['node'];
  if (!isRecord(node)) return '';
  const children = Array.isArray(node['children']) ? node['children'] : [];
  const text = children.map((c) => walk(c, visit)).join(' ');
  const attrs = Array.isArray(node['attrs']) ? node['attrs'] : [];
  const id = attrs.find((a) => isRecord(a) && a['name'] === 'data-comp-id');
  if (isRecord(id) && typeof id['value'] === 'string') visit(id['value'], text);
  return text;
}

class FakeScreenChecker implements ScreenChecker {
  readonly mode = 'fake' as const;
  constructor(private readonly ehr: EhrClient) {}

  async check(input: { specVersion: string; program: Program }): Promise<ScreenCheckResult> {
    const dir = await mkdtemp(path.join(tmpdir(), 'screens-fake-'));
    try {
      const files = await this.ehr.renderScreens({ specVersion: input.specVersion, program: input.program, fhir: 'FAKE', outDir: dir });
      const failures: { file: string; msg: string }[] = [];
      for (const f of files) {
        walk(JSON.parse(readFileSync(f, 'utf8')), (comp, text) => {
          if (text.length > MAX_TEXT) failures.push({ file: f, msg: `${screenOfFile(f)}: component ${comp} text (${text.length} chars) overflows its box at 390px` });
        });
      }
      const failingFiles = [...new Set(failures.map((x) => x.file))];
      return {
        status: failures.length === 0 ? 'pass' : 'fail', mode: 'fake', bundles: ['FAKE'], pages: files.length,
        failingScreens: failingFiles.map(screenOfFile), failingFiles: failingFiles.map((f) => path.basename(f)),
        message: failures.length === 0 ? `${files.length} fake page trees passed (FAKE screen check)` : failures.map((x) => x.msg).join('; '),
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
