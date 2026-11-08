import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { RlmSandbox, sandboxArgs } from '../src/rlm/sandbox.js';
import { RlmNightAgent, renderHistory, ROOT_SCHEMA, type TurnEntry } from '../src/rlm/loop.js';
import { rlmReplData } from '../src/rlm/context.js';
import { DEFAULT_RLM_BUDGET, type RlmBudget } from '../src/rlm/stats.js';
import { RecordingLlm, llmRecordSchema } from '../src/backends/recording.js';
import { ReplayLlm } from '../src/backends/replay.js';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { FAKE_PERSONAS } from '../src/fake/world.js';
import { RunStore } from '../src/store.js';
import { runNight, type LoopDeps, type NightInput } from '../src/night.js';
import { sumMetrics } from '../src/observe.js';
import { auditRunTranscripts } from '../src/backends/isolation.js';
import { writeJson } from '../src/util.js';
import type { JsonLlm, JsonRequest } from '../src/backends/types.js';

const bwrap = existsSync('/usr/bin/bwrap');
const dirs: string[] = [];
async function scratch() { const dir = await mkdtemp(path.join(tmpdir(), 'rlm-test-')); dirs.push(dir); return dir; }
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
const noChange = { hypothesis: 'No measured benefit yet', decision: 'noChange', candidates: [], chosen: [], rationale: 'Keep the current version', rejected: [] };
const LIMITS = { cellSyncMs: 1000, cellWallMs: 3000, memoryMb: 256, rawOutputBytes: 65_536 };

async function fixture() {
  const dir = await scratch(), current = fakeCanonical('v1'), spec = fakeSpec('v1'), params = FAKE_PERSONAS[0];
  if (!params) throw new Error('Missing persona');
  const old = { ...structuredClone(current), version: 0, start: 'SECRET_OLD_PROGRAM' };
  const unused = { name: 'scripted', model: 'fixture', proposeCandidates: async () => { throw new Error('Unused'); }, chooseCandidates: async () => { throw new Error('Unused'); } };
  const deps: LoopDeps = { runId: 'fixture', store: new RunStore(dir), ehr: createFakeEhr(), screens: { mode: 'fake', check: async () => { throw new Error('Forbidden browser'); } }, agent: unused,
    seedPolicy: 'none', seedState: { injected: 0, rejected: new Set() }, worldDir: dir, worldSeed: 1 };
  const input: NightInput = { night: 1, persona: { id: 'P1', userId: 'P1', params }, current, release: { id: 'v1', specVersion: 'v1', spec, canonical: current, notes: '', leanSpecSource: null, fake: true },
    programs: new Map([[0, old], [current.version, current]]), train: [], history: [{ night: 0, mode: 'nightly', outcome: 'SECRET_HISTORY', chosen: [], patch: [] }],
    holdout: { day: 1, validate: async () => { throw new Error('SECRET_HOLDOUT'); } } };
  const files = { 'traces.json': '[]', 'attribution.json': '[]', 'geometry.json': '[]', 'ledger.json': '[{"night":0,"id":"old","moveType":"reorder","targets":["x"],"summary":"train ledger row","trainDaySaving":null,"chosen":false,"nightOutcome":"no-change","seeded":false}]', 'locality.json': '{}' };
  const screen = current.screens[0], component = screen?.components[0];
  if (!screen || !component) throw new Error('Missing component');
  const patch = [{ op: 'replace', path: `/screens/[id=${screen.id}]/components/[id=${component.id}]/size`, from: '', valueJson: '"compact"' }];
  const candidate = (id: string) => ({ id, summary: 'Compact', moveType: 'reorder', rationale: 'less scroll', targets: [component.id], patch, predicted: { clicks: 0, keystrokes: 0, scrolls: 1, mouseTravelPx: 0, scrollPx: 10 } });
  return { dir, input, deps, files, bundle: { files }, patch, candidate };
}
/** Scripted root: one reply per root call, in order; sub-calls answer with their prompt length. */
function scripted(replies: unknown[], seen: JsonRequest[] = []): JsonLlm {
  let i = 0;
  return { name: 'scripted', model: 'fixture', async complete(req) {
    seen.push(req);
    if (req.purpose === 'rlm-sub') return { json: { answer: `sub saw ${req.prompt.length} chars` }, backend: 'scripted', model: 'fixture', servedBy: null, replayOf: null, promptMatched: null, usage: { input_tokens: 7, output_tokens: 3, cached_input_tokens: 1 } };
    const json = replies[Math.min(i++, replies.length - 1)];
    return { json, backend: 'scripted', model: 'fixture', servedBy: null, replayOf: null, promptMatched: null, usage: { input_tokens: 100, output_tokens: 10, cached_input_tokens: 50 } };
  } };
}
const code = (text: string) => ({ thought: 'step', code: text, final: null });
function agent(f: Awaited<ReturnType<typeof fixture>>, llm: JsonLlm, dir: string, extra: { budget?: RlmBudget; replayFrom?: string } = {}) {
  return new RlmNightAgent(f.input, f.deps, f.bundle, { root: new RecordingLlm(llm, dir), sub: new RecordingLlm(llm, dir), runDir: dir, limits: LIMITS, confinement: bwrap ? 'bwrap' : 'none', ...extra });
}
const ctx = (a: RlmNightAgent, purpose: 'propose' | 'repair' = 'propose', callId = 'night-01/P1/propose-0') => ({ callId, purpose, source: purpose === 'repair' ? 'repair' as const : 'llm' as const, parts: a.toolPrompt() });

it.skipIf(!bwrap)('confines the REPL: no fs, network, process, require, import or code generation, and survives each attempt', async () => {
  const sb = new RlmSandbox(JSON.stringify({ meta: { night: 1 }, program: { screens: [{ id: 's1' }] } }), JSON.stringify({ 'ledger.json': '[]' }), async (name, args) => ({ name, args }), LIMITS, 'bwrap');
  try {
    const run = async (c: string) => sb.run(c);
    expect((await run('return [typeof require, typeof process, typeof fetch, typeof setTimeout, typeof Buffer, typeof WebAssembly === "object" ? "wasm" : "none"].join()')).stdout).toBe('undefined,undefined,undefined,undefined,undefined,wasm');
    expect((await run('return this.constructor.constructor("return process")()')).error).toMatch(/Code generation from strings disallowed/);
    expect((await run('return eval("1+1")')).error).toMatch(/Code generation/);
    expect((await run('return (async()=>{}).constructor("return 1")')).error).toMatch(/Code generation/);
    expect((await run('return await import("node:fs")')).error).toMatch(/dynamic import/);
    expect((await run('return check_patch.constructor("return process")()')).error).toMatch(/Code generation/);
    expect((await run('program.screens.push(1)')).error).toMatch(/not extensible/);
    expect((await run('meta.night = 9; return meta.night')).stdout).toBe('1');
    expect((await run('return [Date.now(), new Date().getTime(), Math.random() === Math.random()]')).stdout).toBe('[0,0,false]');
    expect((await run('globalThis.kept = 41; return "ok"')).stdout).toBe('ok');
    expect((await run('while (true) {}')).error).toMatch(/timed out/);
    expect((await run('return kept + 1')).stdout).toBe('42');
    const wall = await run('await check_patch([]); while (true) {}');
    expect(wall).toMatchObject({ restarted: true }); expect(wall.error).toMatch(/restarted/);
    expect((await run('return [typeof kept, meta.night].join()')).stdout).toBe('undefined,1');
    expect(sb.restarts).toBe(1);
  } finally { await sb.close(); }
});
it.skipIf(!bwrap)('applies OS confinement with the exact production arguments: no writes, reads, processes or network', async () => {
  const dir = await scratch();
  await writeFile(path.join(dir, 'sandbox-child.mjs'), `import fs from 'node:fs'; import cp from 'node:child_process';
const r = {};
const t = async (k, f) => { try { await f(); r[k] = 'allowed'; } catch (e) { r[k] = e.code ?? e.cause?.code ?? e.name; } };
await t('writeRlm', () => fs.writeFileSync('/rlm/x', 'y'));
await t('writeTmp', () => fs.writeFileSync('/tmp/x', 'y'));
await t('readEtc', () => fs.readFileSync('/etc/passwd'));
await t('readHome', () => fs.readdirSync('${process.env['HOME'] ?? '/home'}'));
await t('spawn', () => cp.execFileSync('/usr/bin/true'));
await t('network', () => fetch('http://1.1.1.1/', { signal: AbortSignal.timeout(3000) }));
await t('codegen', () => new Function('return 1')());
process.stdout.write(JSON.stringify({ env: Object.keys(process.env).sort(), ...r }));`);
  await copyFile(new URL('../src/query-engine.mjs', import.meta.url), path.join(dir, 'query-engine.mjs'));
  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn('bwrap', sandboxArgs(dir, '/usr/bin/node', 128)); let text = '';
    child.stdout.on('data', (d: Buffer) => { text += d.toString(); }); child.on('error', reject); child.on('close', () => resolve(text));
  });
  const r = JSON.parse(out);
  expect(r).toMatchObject({ writeRlm: 'ERR_ACCESS_DENIED', writeTmp: 'ERR_ACCESS_DENIED', readEtc: 'ERR_ACCESS_DENIED', readHome: 'ERR_ACCESS_DENIED', spawn: 'ERR_ACCESS_DENIED' });
  expect(r.network).not.toBe('allowed'); expect(r.codegen).not.toBe('allowed');
  expect(r.env.filter((k: string) => !['PATH', 'PWD'].includes(k))).toEqual([]);
  expect(sandboxArgs(dir, '/usr/bin/node', 128)).toEqual(expect.arrayContaining(['--unshare-all', '--clearenv', '--permission', '--disallow-code-generation-from-strings', '--max-old-space-size=128']));
});
it('preloads only the train-only bundle and current program/spec projections; nothing from holdout, history or earlier programs', async () => {
  const f = await fixture(), repl = rlmReplData(f.input, f.bundle), text = repl.data + repl.files;
  expect(text).not.toMatch(/SECRET/);
  expect(Object.keys(JSON.parse(repl.data)).sort()).toEqual(['MOVE_TYPES', 'SAFETY_PROPERTIES', 'SUBMIT_SCHEMA', 'meta', 'program', 'render', 'screens', 'specRules', 'train']);
  expect(Object.keys(JSON.parse(repl.files)).sort()).toEqual(Object.keys(f.files).sort());
  const seen: JsonRequest[] = [];
  const a = agent(f, scripted([code('return Object.keys(globalThis).sort().join()'), code('return [train.ledger.length, query("ledger",{}).totalRows, Object.keys(specRules).length].join()'), { thought: 'done', code: '', final: noChange }], seen), f.dir);
  try {
    await a.proposeCandidates(ctx(a));
    expect(a.entries[0]?.stdout).toBe('FINAL,MOVE_TYPES,SAFETY_PROPERTIES,SUBMIT_SCHEMA,check_patch,complain,console,estimate_patch,llm_query,meta,peek,print,program,query,render,screens,size,specRules,train');
    expect(a.entries[1]?.stdout).toBe(`1,1,${f.input.current.screens.length}`);
  } finally { await a.close(); }
  const prompts = seen.map(r => r.system + r.prompt).join('\n');
  expect(prompts).not.toMatch(/SECRET|worldDir|holdout|\/home\//);
  for (const r of seen) expect(Buffer.byteLength(r.system + r.prompt)).toBeLessThanOrEqual(DEFAULT_RLM_BUDGET.maxRootPromptBytes);
  expect((await readFile(path.join(f.dir, 'llm/night-01/P1/propose-0/root-00.request.json'), 'utf8'))).not.toMatch(/SECRET/);
});
it('bounds every root prompt by eliding old turns, newest verbatim', () => {
  const entries: TurnEntry[] = Array.from({ length: 40 }, (_, i) => ({ kind: 'turn', callId: `c/${i}`, turn: i + 1, thought: `t${i}`, code: 'x'.repeat(7000), final: false, stdout: 'y'.repeat(2900), error: null, restarted: false }));
  const text = renderHistory(entries, 30_000);
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(30_000);
  expect(text).toContain('### Turn 40\n'); expect(text).toContain('(summarized)'); expect(text).toMatch(/earlier turn\(s\) omitted/);
  expect(text.indexOf('### Turn 40\n')).toBeGreaterThan(text.indexOf('(summarized)'));
});
it('ends cleanly on exhausted root turns and refuses over-budget checks and sub-calls inside the REPL', async () => {
  const f = await fixture(), budget = { ...DEFAULT_RLM_BUDGET, maxRootTurns: 4, maxChecks: 0, maxSubCalls: 1, maxSubPromptBytes: 2_000 };
  const a = agent(f, scripted([
    code('try { await check_patch([]); return "ran" } catch (e) { return e.message }'),
    code('const a = await llm_query("big", "z".repeat(5000)).catch(e => e.message); const b = await llm_query("small", {n: 1}); const c = await llm_query("again", {}).catch(e => e.message); return [a, b, c].join(" | ")'),
    code('return 1'),
  ]), f.dir, { budget });
  try {
    await expect(a.proposeCandidates(ctx(a))).rejects.toThrow('root turn budget exhausted');
    expect(a.entries[0]?.stdout).toBe('check budget exhausted');
    expect(a.entries[1]?.stdout).toMatch(/^llm_query request is \d+ bytes; limit 2000\. Send a smaller slice\. \| sub saw \d+ chars \| sub-call budget exhausted$/);
    expect(a.stats()).toMatchObject({ rootTurns: 4, subCalls: 1, checks: 1, exceeded: 'root turn budget exhausted', tokens: { root: { input: 400, output: 40, cachedInput: 200 }, sub: { input: 7, output: 3, cachedInput: 1 } } });
  } finally { await a.close(); }
  const error = llmRecordSchema.parse(JSON.parse(await readFile(path.join(f.dir, 'llm/night-01/P1/propose-0.error.json'), 'utf8')));
  expect(error.transcript).toMatchObject({ error: 'root turn budget exhausted' });
  // Through the ordinary loop, the decision ends as a recorded llm-error, not a crash.
  const g = await fixture(), b = agent(g, scripted([code('return 1')]), g.dir, { budget: { ...DEFAULT_RLM_BUDGET, maxRootTurns: 2 } });
  g.deps.agent = b;
  try { const result = await runNight(g.deps, g.input, { offline: true }); expect(result.record.outcome).toBe('llm-error'); expect(result.record.flags.join()).toContain('root turn budget exhausted'); }
  finally { await b.close(); }
});
it('replays a recorded decision bit-for-bit, re-executing cells and host calls, and detects tampering', async () => {
  const f = await fixture(), rec = await scratch();
  const final = { hypothesis: 'h', decision: 'change', candidates: [f.candidate('c1')], chosen: ['c1'], rationale: 'measured', rejected: [] };
  const replies = [code('globalThis.p = ' + JSON.stringify(f.patch) + '; const r = await check_patch(p); return r.status'), code('return (await llm_query("summarize", train.ledger)).length'),
    code('return await FINAL(' + JSON.stringify(final) + ')')];
  const first = agent(f, scripted(replies), rec);
  let original;
  try { original = await first.proposeCandidates(ctx(first)); } finally { await first.close(); }
  expect(first.entries.map(e => e.stdout)).toEqual(['pass', expect.stringMatching(/^\d+$/), '{"submitted":true}\nFINAL accepted']);
  const out = await scratch(), again = agent(f, new ReplayLlm(rec), out, { replayFrom: rec });
  try {
    const replayed = await again.proposeCandidates(ctx(again));
    expect(replayed.candidates).toEqual(original.candidates);
    expect(again.transcript()).toEqual(first.transcript());
  } finally { await again.close(); }
  const summary = path.join(rec, 'llm/night-01/P1/propose-0.json'), changed = JSON.parse(await readFile(summary, 'utf8'));
  changed.transcript.rlm.hostEvents[0].result.status = 'fail'; await writeJson(summary, changed);
  const tampered = agent(f, new ReplayLlm(rec), await scratch(), { replayFrom: rec });
  try { await expect(tampered.proposeCandidates(ctx(tampered))).rejects.toThrow('RLM replay diverged'); } finally { await tampered.close(); }
  const root = path.join(rec, 'llm/night-01/P1/propose-0/root-01.json'), r1 = JSON.parse(await readFile(root, 'utf8'));
  r1.prompt += ' '; await writeJson(root, r1);
  const drift = agent(f, new ReplayLlm(rec), await scratch(), { replayFrom: rec });
  try { await expect(drift.proposeCandidates(ctx(drift))).rejects.toThrow('Replay diverged'); } finally { await drift.close(); }
  expect(ROOT_SCHEMA.required).toEqual(['thought', 'code', 'final']);
});
it('repairs a final-gate rejection in the same REPL session through ordinary certification and validation', async () => {
  const f = await fixture();
  const submit = (id: string) => ({ thought: 'submit', code: '', final: { hypothesis: 'h', decision: 'change', candidates: [f.candidate(id)], chosen: [id], rationale: 'r', rejected: [] } });
  const a = agent(f, scripted([code('globalThis.kept = "from propose"; return kept'), submit('c1'), code('return kept'), submit('c2')]), f.dir);
  f.deps.agent = a;
  const inner = f.deps.ehr.check.bind(f.deps.ehr);
  let n = 0;
  f.deps.ehr = { ...f.deps.ehr, check: async (i) => (++n === 2 ? { violation: { property: 'WithinBudgets', message: 'moves too much', counterexample: [], screens: [] } } : inner(i)) };
  f.input.holdout = { day: 1, validate: vi.fn(async () => ({ day: 1, load: 'busy', before: { ...sumMetrics([]), tasks: 1, completed: 1, clicks: 10, scrolls: 5, scrollPx: 100, mouseTravelPx: 100 }, after: { ...sumMetrics([]), tasks: 1, completed: 1, clicks: 10, scrolls: 4, scrollPx: 90, mouseTravelPx: 100 }, saving: { clicks: 0, keystrokes: 0, scrolls: 1, scrollPx: 10, mouseTravelPx: 0, klmDeciSec: 0 }, pctAboveFloor: { before: null, after: null } })) };
  try {
    const result = await runNight(f.deps, f.input, { offline: true });
    expect(result.record.certification.attempts.map(x => [x.source, x.check.status])).toEqual([['merged', 'fail'], ['repair', 'pass']]);
    expect(result.record.validation.accepted).toBe(true);
    expect(a.entries.map(e => e.kind)).toEqual(['turn', 'turn', 'gate', 'turn', 'turn']);
    expect(a.entries[2]?.stdout).toContain('WithinBudgets');
    expect(a.entries[3]?.stdout).toBe('from propose');
    expect(a.entries[3]?.callId).toBe('night-01/P1/repair-1/root-00');
  } finally { await a.close(); }
  expect(existsSync(path.join(f.dir, 'llm/night-01/P1/repair-1.json'))).toBe(true);
  expect((await auditRunTranscripts(f.dir)).status).toBe('pass');
});
