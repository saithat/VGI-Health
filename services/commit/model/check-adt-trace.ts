/** ADT transaction-linearized refinement TEST. The explicit provisioned baseline
 * must precede every traced writer. Native administrative state uses positional
 * aliases; clinical/FHIR projections remain covered by independent replay tests. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { adtPatientSchema } from '../src/projection-codecs.ts';
import { protocolTrace } from '../src/protocol-trace.ts';
import { z } from 'zod';
import { digest, obj, objs, str, required } from '../src/types.ts';
import type { Actor, Config, Obj } from '../src/types.ts';

export function recordAdtBaseline(actor: Actor, config: Config, board: Obj) {
  const trace = protocolTrace(actor, { requestId: 'test-baseline', action: 'discharge', patient: 'test-baseline', expected: [] }, config.tenant, config.adt);
  assert.ok(trace, 'COMMIT_PROTOCOL_TRACE required');
  trace.emit('baseline', { board: trace.board(board.state),
    versions: objs(board.versions).map(v => ({ ...v, key: trace.key(str(v.key)) })) });
}
const versionSchema = z.object({ key: z.string(), version: z.number().int().nonnegative() });
const boardSchema = z.looseObject({
  patients: z.array(adtPatientSchema),
  beds: z.array(z.looseObject({ id: z.number(), unit: z.string(), active: z.boolean().default(true), phase: z.string(), occupant: z.string().nullable() })),
});
const inputSchema = z.looseObject({ state: boardSchema, versions: z.array(versionSchema),
  expected: z.array(versionSchema), role: z.string(), command: z.record(z.string(), z.unknown()) });
const rowSchema = z.looseObject({
  schema: z.string(), attempt: z.string(), step: z.string(),
  id: z.string().optional(), payload: z.string().optional(), endpoint: z.string().optional(),
  board: boardSchema.optional(), versions: z.array(z.tuple([z.string(), z.number()])).optional(),
  adt: inputSchema.optional(), input: inputSchema.optional(), adtBoard: boardSchema.optional(),
  expectedBoard: z.array(versionSchema).optional(),
  keys: z.array(z.string()).optional(), key: z.string().optional(), patient: z.string().optional(),
  before: z.number().optional(), after: z.number().optional(), status: z.number().optional(),
  answer: z.string().optional(), accept: z.boolean().optional(), uncertain: z.boolean().optional(),
  revision: z.number().optional(), sessionRevision: z.number().optional(),
  expectedVersion: z.number().optional(), sessionVersion: z.number().optional(),
});
// Baseline versions are objects; writer read versions are key/version tuples.
const baselineSchema = z.looseObject({ board: boardSchema, versions: z.array(versionSchema) });
type Board = z.infer<typeof boardSchema>;
type Row = z.infer<typeof rowSchema>;
const keys = (s: Board): string[] => [...s.patients.map(p => `patient:${p.id}`), ...s.beds.map(b => `bed:${b.id}`)].sort();
const value = (s: Board, key: string) => key.startsWith('patient:') ? s.patients.find(p => `patient:${p.id}` === key) : s.beds.find(b => `bed:${b.id}` === key);
export function compileAdtTrace(input: unknown[]) {
  const rows = input.map(value => rowSchema.parse(obj(value).step === 'baseline' ? { ...obj(value), versions: undefined } : value));
  assert.ok(rows.length);
  const baselines = rows.filter(r => r.step === 'baseline');
  assert.equal(baselines.length, 1, 'exactly one explicit provisioned baseline required');
  const base = required(baselines[0]);
  const baseline = baselineSchema.parse(input[rows.indexOf(base)]);
  const baselineKeys = keys(baseline.board);
  assert.deepEqual(baseline.versions.map(v => v.key), baselineKeys);
  const offsets = new Map<string, number>(baseline.versions.map(v => [v.key, v.version]));
  const relative = (vs: z.infer<typeof versionSchema>[]) => vs.map(v => {
    const offset = required(offsets.get(v.key));
    assert.ok(Number.isInteger(v.version) && v.version >= offset, 'version predates baseline');
    return { ...v, version: v.version - offset };
  });
  const groups = new Map<string, { rows: Row[]; first: number; last: number }>();
  const allowed = new Set(['begin','baseline','request-locked','plan','lock','read','native','screens','screen-refused',
    'adt-decision','stage','update','write','finish','replay','commit-start','committed','aborted','respond']);
  rows.forEach((r, i) => {
    assert.equal(r.schema, 'vgi-commit-protocol-test-v1');
    assert.ok(typeof r.attempt === 'string' && allowed.has(r.step), 'unknown trace row');
    if (r.attempt === base.attempt) return;
    assert.ok(i > rows.indexOf(base), 'writer before explicit baseline');
    let g = groups.get(r.attempt);
    if (!g) { g = { rows: [], first: i, last: i }; groups.set(r.attempt, g); }
    g.rows.push(r); g.last = i;
  });
  const attempts = [...groups.values()];
  const metadata = new Map<string, Row>();
  for (const g of attempts) {
    const read = g.rows.find(r => r.step === 'read');
    if (read) metadata.set(g.rows[0].id + '/' + g.rows[0].payload, read);
  }
  const stable = new Map<string, string>();
  const compiled = attempts.map((g, i) => {
    const rs = g.rows, begin = rs[0];
    assert.equal(begin.step, 'begin');
    assert.ok(['adt','clinical-adt'].includes(required(begin.endpoint)), 'unsupported endpoint');
    const at = (s: string) => rs.findIndex(r => r.step === s);
    const one = (s: string) => {
      const matches = rs.filter(r => r.step === s); assert.ok(matches.length <= 1, `repeated ${s}`); return matches[0];
    };
    const read = one('read'), plan = one('plan'), native = one('native'), decision = one('adt-decision');
    const finish = one('finish'), replay = one('replay'), response = one('respond');
    const aborted = one('aborted'), committed = one('committed');
    assert.ok(Boolean(aborted) !== Boolean(committed), 'incomplete transaction');
    assert.ok(!(finish && replay));
    assert.ok(one('request-locked') || aborted, 'missing request lock');
    const locks = rs.filter(r => r.step === 'lock').map(r => r.key);
    const writes = rs.filter(r => r.step === 'write');
    if (plan) {
      assert.deepEqual(plan.keys, baselineKeys, 'complete sorted board lock plan required');
      assert.deepEqual(locks, plan.keys.slice(0, locks.length), 'lock order changed');
      assert.ok(at('plan') > at('request-locked'));
    }
    if (read) {
      assert.ok(plan && at('read') > at('lock') && at('lock') > at('plan'));
      assert.deepEqual(locks, baselineKeys);
      assert.deepEqual((read.adt?.versions ?? required(read.versions).map(([key, version]: [string, number]) => ({ key, version }))).map(v => v.key), baselineKeys);
    }
    if (native) assert.ok(read && at('native') > at('read'));
    if (decision) {
      assert.ok(native?.accept && at('adt-decision') > at('native'));
      assert.deepEqual(required(decision.input).state, required(read.adtBoard), 'native input differs from locked board');
      assert.deepEqual(required(decision.input).versions, required(read.versions).map(([key, version]: [string, number]) => ({ key, version })));
      assert.deepEqual(required(decision.input).expected, read.expectedBoard);
    }
    if (writes.length) assert.ok(read && native?.accept && at('stage') > at('native') && writes.every(w => rs.indexOf(w) > at('stage')));
    if (finish) assert.ok(read && at('finish') > at('read'));
    if (at('commit-start') >= 0) assert.ok((finish || replay) && at('commit-start') > Math.max(at('finish'),at('replay')));
    if (committed) {
      assert.ok(at('commit-start') >= 0 && response && at('committed') > at('commit-start') && at('respond') > at('committed'));
      assert.equal(response.answer, (finish ?? replay)?.answer);
      assert.equal(response.status, (finish ?? replay)?.status);
      const key = begin.id + '/' + begin.payload;
      if (stable.has(key)) assert.equal(response.answer, stable.get(key), 'durable answer changed');
      stable.set(key, required(response.answer));
    }
    if (replay) assert.equal(locks.length + writes.length, 0, 'receipt replay touched streams');
    const meta = read ?? metadata.get(begin.id + '/' + begin.payload);
    const input = read?.adt ?? decision?.input;
    const state = input?.state ?? read?.adtBoard;
    const accepted = begin.endpoint === 'adt' ? native : decision;
    const observed = read ? relative(input?.versions ?? required(required(read).versions).map(([key, version]: [string, number]) => ({ key, version }))) : [];
    for (const w of writes) {
      const before = (input?.versions ?? required(required(read).versions).map(([key, version]: [string, number]) => ({ key, version }))).find(v => v.key === w.key)?.version;
      assert.equal(w.before, before); assert.equal(w.after, required(w.before) + 1);
    }
    const privateSteps = rs.filter(r => ['update','write'].includes(r.step));
    let pending: string | undefined;
    for (const step of privateSteps) {
      if (step.step === 'update') {
        assert.equal(pending, undefined, 'UPDATE before prior event INSERT');
        pending = required(step.key);
      } else {
        assert.equal(step.key, pending, 'event INSERT without matching UPDATE');
        pending = undefined;
      }
    }
    if (!aborted) assert.equal(pending, undefined, 'committed private UPDATE without event');
    if (finish?.status === 201 && !aborted) {
      assert.ok(accepted?.accept && accepted.board, 'accepted without ADT reducer');
      const changed = baselineKeys.filter(k => digest(value(required(state), k)) !== digest(value(required(accepted.board), k)));
      assert.deepEqual(writes.map(w => w.key), changed, 'partial/unexpected multi-stream write set');
    } else if (!aborted && finish) assert.equal(writes.length, 0);
    const expected = input?.expected ?? read?.expectedBoard ?? meta?.adt?.expected ?? [];
    const sessionValid = begin.endpoint === 'adt' || !read || (begin.revision === read.sessionRevision &&
      begin.expectedVersion === read.sessionVersion && begin.expectedVersion === required(read.versions).find(([k]) => k === read.patient)?.[1]);
    const request = { id: begin.id, payload: begin.payload, expected: relative(expected),
      command: input?.command ?? meta?.adt?.command ?? { discharge: { patient: baseline.board.patients[0].id } },
      role: input?.role ?? meta?.adt?.role ?? 'bedManager', versionValid: sessionValid,
      eligible: begin.endpoint === 'adt' || native?.accept === true };
    // Replays do not inspect intent fields; the durable payload hash binds them.
    const ops: string[] = [];
    if (at('request-locked') >= 0) ops.push('request');
    ops.push(...locks.map(() => 'lock'));
    if (read) ops.push('read');
    if (finish || native) ops.push('guard');
    ops.push(...rs.filter(r => ['update','write'].includes(r.step)).map(r => r.step));
    if (finish || replay) ops.push('stage');
    const alternateOps = aborted?.uncertain ? [...ops, 'commit', 'crash'] : [];
    if (aborted) ops.push('crash'); else ops.push('commit','unlock','respond');
    const result = aborted ? 'aborted' : required(finish ?? replay).status === 201 ? 'accepted' : required(finish ?? replay).status === 409 ? 'conflict' : 'refused';
    return { request, ops, alternateOps, observed, observedBoard: state ?? null,
      acceptedBoard: accepted?.accept ? accepted.board : null, result,
      after: attempts.flatMap((other,j) => other.last < g.first && i !== j ? [j] : []) };
  });
  assert.ok(compiled.length, 'no attempts');
  return { baseline: baseline.board, attempts: compiled };
}
export function checkAdtTrace(path: string) {
  const rows = readFileSync(path,'utf8').trim().split('\n').map(l => JSON.parse(l));
  const input = compileAdtTrace(rows);
  const dir = mkdtempSync(join(tmpdir(),'adt-refinement-'));
  try {
    const program = join(dir,'program.json'); writeFileSync(program, JSON.stringify(input));
    const binary = process.env.EHR_BIN ?? resolve(dirname(fileURLToPath(import.meta.url)),'../../../lean/.lake/build/bin/ehr');
    const checked = spawnSync(binary,['adt-protocol-trace',program], {
      encoding: 'utf8', timeout: 120_000,
      env: { ...process.env, LEAN_NUM_THREADS: '6' }, maxBuffer: 1024*1024 });
    assert.equal(checked.status,0,`Lean ADT trace checker failed: ${checked.error ?? ''}\n${checked.stdout}\n${checked.stderr}`);
    return checked.stdout.trim();
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'usage: check-adt-trace.ts trace.jsonl');
  console.log(checkAdtTrace(process.argv[2]));
}
