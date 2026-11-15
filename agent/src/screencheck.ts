import {ScreenInfrastructureError} from './errors.js';
import {geometryProgramHash,geometryCacheKey,geometryComponentsHash,screenGeometrySchema,type GeometryProvider} from './geometry.js';
import type {GeometryAtlas} from '../../app/src/metrics/geometry.js';
import { z } from 'zod';
import { compilePresentations } from './presentation-compiler.js';
/**
 * Offline per-version SCREEN CHECK (owner principle: nothing is checked at
 * runtime; every version is verified before the clinician logs in).
 *
 *   1. ehr render-screens --spec <ver> --program P.json --fhir <bundle> --out <dir>
 *      (render lane; ASSUMED: writes one page-tree JSON file per screen/state,
 *      named `<screenId>.json` or `<screenId>__<state>.json`)
 *   2. pnpm --filter app screen-check <dir>/*.json   (app lane, on main; exit 0 = pass)
 *      Desktop admission includes R5 DOM action density; detailed results are
 *      retained as screen-policy.json with the other per-version artifacts.
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
import { readFileSync, createWriteStream } from 'node:fs';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { EhrClient,SimulateInput } from './ehr.js';
import { sha256, stableStringify } from './program.js';
import { isRecord } from './jsonpatch.js';
import type { CheckResult, Program, ScreenCheckResult } from './schema.js';

export type { ScreenCheckResult } from './schema.js';
import { programSchema } from './schema.js';
import { REPO_ROOT, errorMessage, resolveUserPath } from './util.js';


export type ScreenCheckInput = { specVersion: string; program: Program; referenceProgram?: Program } & Partial<Pick<SimulateInput,'schedule'|'worldDir'>>;
export type ReferenceProvider = (input: ScreenCheckInput) => Promise<Program | null>;

export interface ScreenChecker {
  readonly mode: 'real' | 'fake';
  geometry?:GeometryProvider;
  check(input: ScreenCheckInput): Promise<ScreenCheckResult>;
}

/** A failed screen check, in the same shape as a checker rejection (for the record). */
export function screenCheckRejection(r: ScreenCheckResult): CheckResult {
  return {
    status: r.status === 'error' ? 'error' : 'fail', property: 'ScreenCheck', message: r.message, counterexample: null,
    screens: r.failingScreens, verdict: null,
  };
}

export function screenOfFile(file: string): string {
  return path.basename(file, '.json').split('__')[0] ?? file;
}

export function bundlesFromEnv(): string[] {
  return (process.env['EHR_SAMPLE_FHIR'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function createScreenChecker(ehr: EhrClient, opts: { fake?: boolean; bundles?: string[]; pnpm?: string; artifactsDir?: string;cacheDir?:string;workers?:number;referenceProgram?:ReferenceProvider } = {}): ScreenChecker {
  const fake = opts.fake ?? ehr.mode === 'fake';
  const bundles = [...(opts.bundles ?? bundlesFromEnv())].map(resolveUserPath);
  if (!fake && !bundles.length) bundles.push(path.join(REPO_ROOT,'fixtures/synthea/Ashly_Rippin_149fcc1f.json'));
  const preferredBundles:Record<string,number>={};
  if (!fake) {
    const catalog = z.object({patients:z.array(z.object({flags:z.object({pediatric:z.boolean(),surgical:z.boolean()}),file:z.string()}))}).parse(JSON.parse(readFileSync(path.join(REPO_ROOT,'fixtures/synthea/index.json'),'utf8')));
    for (const flag of ['pediatric','surgical'] as const) {
      const patient = catalog.patients.find((p) => p.flags[flag]);
      if (!patient) throw new Error(`Missing mandatory ${flag} screen bundle`);
      const file = path.join(REPO_ROOT,'fixtures/synthea',patient.file);
      if (!bundles.includes(file)) bundles.push(file);
      preferredBundles[flag==='pediatric'?'np':'surgeon']=bundles.indexOf(file);
    }
  }
  return fake ? new FakeScreenChecker(ehr) : new CliScreenChecker(ehr, bundles, opts.pnpm ?? process.env['PNPM_BIN'] ?? 'pnpm', opts.artifactsDir,preferredBundles,opts.cacheDir,opts.workers,opts.referenceProgram);
}

function run(cmd: string, args: string[], cwd: string, onOutput?: (chunk: string) => void, env: NodeJS.ProcessEnv = process.env): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const keep = (d: Buffer) => { const chunk = d.toString(); output = (output + chunk).slice(-200_000); onOutput?.(chunk); };
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
  private readonly atlases=new Map<string,GeometryAtlas>();
  private atlasKey(input:Parameters<GeometryProvider>[0]){return geometryCacheKey(input.program)+(input.schedule&&input.worldDir?`:${sha256(JSON.stringify([input.worldDir,input.schedule]))}`:'');}
  geometry:GeometryProvider=async input=>{const hash=this.atlasKey(input);if(!this.atlases.has(hash)){let result:ScreenCheckResult;try{result=await this.check(input);}catch(error){this.atlases.delete(hash);throw new ScreenInfrastructureError(`Geometry screen-check infrastructure: ${errorMessage(error)}`);}if(result.status==='error'){this.atlases.delete(hash);throw new ScreenInfrastructureError(`Geometry screen-check infrastructure: ${result.message}`);}}return this.atlases.get(hash)??null;};
  constructor(private readonly ehr: EhrClient, private readonly bundles: string[], private readonly pnpm: string, private readonly artifactsDir?: string,private readonly preferredBundles:Record<string,number>={},private readonly cacheDir?:string,private readonly workers?:number,private readonly referenceProgram?:ReferenceProvider) {}

  async check(input: ScreenCheckInput): Promise<ScreenCheckResult> {
    const base = { mode: this.mode, bundles: this.bundles };
    if (this.bundles.length === 0) {
      return { ...base, status: 'error', pages: 0, failingScreens: [], failingFiles: [], message: 'no sample FHIR bundle configured (--fhir or EHR_SAMPLE_FHIR); a version that was not screen-checked is never deployed' };
    }
    const dir = await mkdtemp(path.join(tmpdir(), 'screens-'));
    try {
      const components = compilePresentations(input.program);
      const componentFile = path.join(dir, 'components.json');
      if (components) await writeFile(componentFile, JSON.stringify(components));
      const files: string[] = [];
      for (const [i, bundle] of this.bundles.entries()) {
        try {
          files.push(...await this.ehr.renderScreens({ specVersion: input.specVersion, program: input.program, fhir: bundle, ui: true, outDir: path.join(dir, `b${i}`),...(i===0&&input.schedule&&input.worldDir?{workspace:{schedule:input.schedule,worldDir:input.worldDir}}:{}) }));
        } catch (e) {
          return { ...base, status: 'error', pages: files.length, failingScreens: [], failingFiles: [], message: `render-screens failed for ${bundle}: ${errorMessage(e)}` };
        }
      }
      // The reference uses exactly the same bundles/workspace as the candidate.
      // Missing release-day snapshots at stand-alone call sites use the role's
      // release program. An available but unreadable reference is an error.
      const referenceStarted=performance.now();
      // Limits are the per-screen maximum over every vendor layout available to
      // this persona at this release: the no-agent arm's layout (which may leave
      // optional release features unsurfaced) and the release's own persona
      // layout (the certified migration fallback), so neither can be refused.
      const suppliedReference = input.referenceProgram ?? await this.referenceProgram?.(input);
      const release = await releaseReference(input).catch(error=>{if(suppliedReference)return null;throw error;});
      const references = [suppliedReference, release].filter((p):p is Program=>!!p)
        .filter((p,i,all)=>all.findIndex(q=>stableStringify(layoutOf(q))===stableStringify(layoutOf(p)))===i);
      const reference = references[0]!;
      const referenceSource = [input.referenceProgram ? 'explicit' : suppliedReference ? 'no-agent' : null, release && references.includes(release) ? 'release' : null].filter(Boolean).join('+') || 'release';
      if (references.some(r=>r.role !== input.program.role)) throw Error('R5 reference role mismatch');
      const referenceFiles: string[] = [];
      for (const [r, ref] of references.entries()) {
        if(stableStringify(layoutOf(ref))===stableStringify(layoutOf(input.program))){referenceFiles.push(...files);continue;}
        for (const [i, bundle] of this.bundles.entries()) {
          referenceFiles.push(...await this.ehr.renderScreens({specVersion:input.specVersion,program:ref,fhir:bundle,ui:true,
            outDir:path.join(dir,'reference',`r${r}`,`b${i}`),...(i===0&&input.schedule&&input.worldDir?{workspace:{schedule:input.schedule,worldDir:input.worldDir}}:{})}));
        }
      }
      if (!referenceFiles.length) throw Error('R5 reference produced no states');
      const referenceManifest = path.join(dir,'reference-files.json');
      await writeFile(referenceManifest,JSON.stringify(referenceFiles.filter(file=>!/-geometry\.json$/.test(file))));
      if (new Set(references.map(r=>JSON.stringify(compilePresentations(r)??null))).size>1) throw Error('R5 references use different presentation bundles');
      const referenceComponents = compilePresentations(reference), referenceComponentFile=path.join(dir,'reference-components.json');
      if(referenceComponents)await writeFile(referenceComponentFile,JSON.stringify(referenceComponents));
      if (files.length === 0) return { ...base, status: 'error', pages: 0, failingScreens: [], failingFiles: [], message: 'render-screens produced no page trees' };
      // Exactly equal semantic trees have exactly equal fidelity/visibility obligations.
      // Keep a coverage hash for every exported state, checking each distinct tree once.
      const representatives = new Map<string, string>();
      const coverage: { file: string; sha256: string; representative: string }[] = [];
      for (const file of files) {
        const hash = sha256(await readFile(file, 'utf8'));
        const representative = representatives.get(hash) ?? file;
        representatives.set(hash, representative);
        coverage.push({ file: path.relative(dir, file), sha256: hash, representative: path.relative(dir, representative) });
      }
      const reportDir = this.artifactsDir ? path.join(this.artifactsDir, input.program.owner, `v${input.program.version}`,this.atlasKey(input).replaceAll(':','.')) : null;
      if (reportDir) {
        await mkdir(reportDir, { recursive: true });
        await writeFile(path.join(reportDir, 'coverage.json'), JSON.stringify({ pages: files.length, distinct: representatives.size, coverage }, null, 2));
      }
      const transcript = reportDir ? createWriteStream(path.join(reportDir, 'output.txt')) : null;
      process.stderr.write(`[screens] ${input.program.owner}/v${input.program.version}: ${files.length} exported states, ${representatives.size} distinct trees; bounded browser pool, desktop + narrow\n`);
      const res = await run(this.pnpm, ['--filter', 'app', 'screen-check', '--ui', ...representatives.values()], REPO_ROOT, (chunk) => { transcript?.write(chunk); }, { ...process.env,...(this.cacheDir?{EHR_SCREEN_CACHE_DIR:this.cacheDir}:{}),EHR_SCREEN_WORKERS:String(Math.max(1,Math.min(4,this.workers??(Number(process.env['EHR_SCREEN_WORKERS']??4)||4)))), EHR_REFERENCE_EXPORT_MS:String(Math.round(performance.now()-referenceStarted)),EHR_REFERENCE_PROGRAM_HASH:references.map(r=>sha256(stableStringify(r))).join(','),EHR_REFERENCE_SOURCE:referenceSource,EHR_SCREEN_REFERENCE_MANIFEST:referenceManifest,EHR_REFERENCE_PRESENTATION_BUNDLE:referenceComponents?referenceComponentFile:'', EHR_SCREEN_RESULT: path.join(dir,'gate-result.json'), EHR_PRESENTATION_BUNDLE: components ? componentFile : '' });
      if (reportDir) await writeFile(path.join(reportDir, 'screen-policy.json'), await readFile(path.join(dir, 'gate-result.json'), 'utf8').catch(() => '{}'));
      if (transcript) await new Promise<void>((resolve, reject) => { transcript.on('error', reject); transcript.end(resolve); });
      process.stderr.write(`[screens] ${input.program.owner}/v${input.program.version}: ${res.code === 0 ? 'passed' : 'FAILED'}\n`);
      const measured=z.object({geometry:z.array(screenGeometrySchema).optional()}).parse(JSON.parse(await readFile(path.join(dir,'gate-result.json'),'utf8').catch(()=>'{}')));
      if(measured.geometry?.length){
        const build=z.object({appSha256:z.string()}).parse(JSON.parse(await readFile(path.join(REPO_ROOT,'app/dist/build.json'),'utf8')));
        const atlas:GeometryAtlas={schemaVersion:1,programHash:geometryProgramHash(input.program),componentsSha256:geometryComponentsHash(input.program),appSha256:build.appSha256,viewport:{width:1440,height:900},states:[...measured.geometry].sort((a,b)=>Number(b.sample===`b${this.preferredBundles[input.program.role]??0}`)-Number(a.sample===`b${this.preferredBundles[input.program.role]??0}`)),source:'chromium'};
        this.atlases.set(this.atlasKey(input),atlas);if(reportDir)await writeFile(path.join(reportDir,'geometry.json'),JSON.stringify(atlas));
      }
      if (res.code === 0) {
        const result:ScreenCheckResult={ ...base, status: 'pass', pages: files.length, failingScreens: [], failingFiles: [], message: `${files.length} page trees passed` };
        if(reportDir)await writeFile(path.join(reportDir,'result.json'),JSON.stringify(result));return result;
      }
      const treeReport = z.object({densityFailures:z.array(z.object({message:z.string()})).optional(),trees:z.array(z.object({file:z.string(),status:z.enum(['pass','fail','error'])})).optional()}).parse(JSON.parse(await readFile(path.join(dir,'gate-result.json'),'utf8').catch(()=>'{}')));
      const failedHashes = new Set((treeReport.trees ?? []).filter(tree=>tree.status==='fail').map(tree=>coverage.find(entry=>path.resolve(dir,entry.file)===tree.file)?.sha256));
      const failingFiles = treeReport.trees ? coverage.filter(entry=>failedHashes.has(entry.sha256)).map(entry=>path.resolve(dir,entry.file)) : failingFilesFromOutput(res.output, files);
      const result:ScreenCheckResult={
        ...base, status: z.object({status:z.enum(['fail','error'])}).parse(JSON.parse(await readFile(path.join(dir,'gate-result.json'),'utf8').catch(() => '{"status":"error"}'))).status, pages: files.length, failingFiles: failingFiles.map((f) => path.relative(dir, f)),
        failingScreens: [...new Set(failingFiles.map(screenOfFile))],
        message: `screen-check exit ${res.code}: ${(treeReport.densityFailures??[]).map(f=>f.message).join('; ')} ${res.output.slice(-3000)}`,
      };
      if(reportDir)await writeFile(path.join(reportDir,'result.json'),JSON.stringify(result));return result;
    } catch (error) {
      return {...base,status:'error',pages:0,failingScreens:[],failingFiles:[],message:errorMessage(error)};
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

  async check(input: ScreenCheckInput): Promise<ScreenCheckResult> {
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

/** Stand-alone/offline checks without a no-agent arm use the release vendor. */
export async function releaseReference(input: ScreenCheckInput): Promise<Program> {
  const release = input.program.specVersion;
  if (!/^[\w.-]+$/.test(release)) throw Error(`No R5 release reference for ${release}`);
  const directory=path.join(REPO_ROOT,'releases',release);
  const candidates=await Promise.all(['P1','P2','P3','P4','P5'].map(async id=>programSchema.parse(JSON.parse(await readFile(path.join(directory,'personas',`${id}.json`),'utf8')))));
  const reference=candidates.find(p=>p.id===input.program.id && p.role===input.program.role) ?? candidates.find(p=>p.owner===input.program.owner && p.role===input.program.role) ?? candidates.find(p=>p.role===input.program.role);
  if (!reference) throw Error(`No R5 vendor reference for role ${input.program.role}`);
  return {...reference,owner:input.program.owner,id:input.program.id};
}

/** Identity fields do not change rendered layout. */
function layoutOf(p: Program): Program { return {...p,id:'',owner:'',version:0}; }
