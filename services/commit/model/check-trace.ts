import { required } from '../src/types.ts';
/** Transaction-linearized refinement TEST, not host verification.
 * The exporter must cover every writer in one fresh tenant. Clinical ADT and
 * projection internals require their existing tests; this bridge rejects
 * read sets with skipped/no-op stream writes instead of certifying them.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';

const abortedScreen = (rows: Row[]) => rows.some(r => r.step === 'aborted') && !rows.some(r => ['stage','write','finish','commit-start','committed'].includes(r.step));

const vector = z.array(z.tuple([z.string(), z.number()]));
const rowSchema = z.looseObject({
  attempt: z.string(), step: z.string(), schema: z.string(),
  id: z.string().optional(), payload: z.string().optional(),
  key: z.string().optional(), patient: z.string().optional(), keys: z.array(z.string()).optional(),
  baseline: vector.optional(), versions: vector.optional(),
  expected: z.array(z.tuple([z.string(), z.number().nullable()])).optional(),
  version: z.number().optional(), before: z.number().optional(), after: z.number().optional(),
  expectedVersion: z.number().optional(), expectedSharedVersion: z.number().optional(),
  sessionVersion: z.number().optional(), revision: z.number().optional(), sessionRevision: z.number().optional(),
  cacheVersion: z.number().nullable().optional(), status: z.number().optional(),
  answer: z.string().optional(), reason: z.string().optional(), projection: z.string().optional(),
  accept: z.boolean().optional(), valid: z.boolean().optional(), uncertain: z.boolean().optional(),
});
type Row = z.infer<typeof rowSchema>;
export function compileTrace(input: unknown[]) {
  const rows = input.map(row => rowSchema.parse(row));
  assert.ok(rows.length, 'empty trace');
  const groups = new Map<string, { rows: Row[]; first: number; last: number }>();
  rows.forEach((r, index) => {
    assert.equal(r.schema, 'vgi-commit-protocol-test-v1', 'unknown schema');
    assert.ok(typeof r.attempt === 'string' && typeof r.step === 'string');
    assert.ok(['begin','request-locked','plan','lock','read','screens','screen-refused','native','stage','write','finish','replay','commit-start','committed','aborted','respond'].includes(r.step), 'unknown step');
    let g = groups.get(r.attempt);
    if (!g) { g = { rows: [], first: index, last: index }; groups.set(r.attempt, g); }
    g.rows.push(r); g.last = index;
  });
  const attempts = [...groups.values()];
  const baseline = new Map<string, number>();
  // Fresh test-tenant baselines are explicit, never inferred from a suffix.
  // Patient imports start at 1; shared streams start at 0.
  for (const { rows } of attempts) for (const r of rows) if (r.step === 'read') {
    for (const [k, v] of required(r.baseline)) {
      if (baseline.has(k)) assert.equal(baseline.get(k), v, 'baseline changed');
      baseline.set(k, v);
    }
  }
  const relative = (key: string, version: number) => version - (baseline.get(key) ?? 0);
  const metadata = new Map<string, Row>();
  for (const { rows } of attempts) {
    const begin = rows[0]; const read = rows.find(r => r.step === 'read');
    if (read) metadata.set(begin.id + '/' + begin.payload, read);
  }
  const stable = new Map<string, string>();
  return attempts.map((g, index) => {
    const { rows } = g; const begin = rows[0];
    assert.equal(begin.step, 'begin');
    const at = (step: string) => rows.findIndex(r => r.step === step);
    const read = rows.find(r => r.step === 'read');
    const plan = rows.find(r => r.step === 'plan');
    const meta = read ?? plan ?? metadata.get(begin.id + '/' + begin.payload);
    const locked = rows.filter(r => r.step === 'lock');
    const native = rows.find(r => r.step === 'native');
    const screens = rows.find(r => r.step === 'screens');
    if (screens) assert.ok(at('read') < at('screens'));
    if (at('screen-refused') >= 0) {
      assert.equal(screens?.valid, false);
      assert.ok(abortedScreen(rows), 'enforced screen mismatch must roll back');
    }
    const finish = rows.find(r => r.step === 'finish');
    const replay = rows.find(r => r.step === 'replay');
    const response = rows.find(r => r.step === 'respond');
    const writes = rows.filter(r => r.step === 'write');
    const aborted = at('aborted') >= 0;
    assert.ok(aborted !== (at('committed') >= 0), 'incomplete/ambiguous transaction');
    assert.equal(rows.filter(r => r.step === 'request-locked').length, at('request-locked') < 0 ? 0 : 1);
    if (plan) assert.deepEqual(locked.map(r => r.key), required(plan.keys).slice(0, locked.length), 'lock acquisition order changed');
    if (read) {
      assert.deepEqual(locked.map(r => r.key), read.keys, 'read requires the full locked set');
      assert.ok(at('request-locked') < at('lock') && at('lock') < at('read'));
      if (native) { assert.ok(at('read') < at('native')); assert.equal(native.version, required(required(read.versions).find(([k]) => k === read.patient))[1]); }
    }
    if (at('commit-start') >= 0) {
      assert.ok(finish || replay, 'COMMIT started before outcome');
      assert.ok(at('commit-start') > Math.max(at('finish'), at('replay')));
    }
    if (!aborted) {
      assert.ok(finish || replay, 'committed without staged outcome');
      assert.ok(response && at('commit-start') < at('committed') && at('committed') < at('respond'));
      assert.equal(response.answer, required((finish ?? replay)).answer, 'response changed after commit');
      const stableKey = begin.id + '/' + begin.payload;
      if (stable.has(stableKey)) assert.equal(response.answer, stable.get(stableKey), 'unstable durable answer');
      stable.set(stableKey, required(response.answer));
    }
    if (writes.length) {
      assert.ok(read && screens?.valid === true && at('screens') < at('stage') && native?.accept && at('native') < at('stage'), 'append without native acceptance');
      assert.ok(writes.every(w => rows.indexOf(w) > at('stage')));
      for (const w of writes) {
        assert.equal(w.before, required(read.versions).find(([k]) => k === w.key)?.[1], 'write replaced a different version');
        assert.equal(w.after, required(w.before) + 1);
      }
    }
    if (!aborted && finish?.status === 201) {
      assert.deepEqual(writes.map(w => w.key), read?.keys, 'unsupported/no-op read set or incomplete atomic write trace');
    } else if (!aborted) assert.equal(writes.length, 0, 'refused command wrote');
    const patient = meta?.patient ?? 'unopened-session';
    const keys = meta?.keys ?? [];
    const expected = (read?.expected ?? meta?.expected ?? []).map(([k, v]: [string, number | null]) => {
      const supplied = k === patient ? begin.expectedVersion : v;
      // Missing optional shared versions are explicit mismatches in the model.
      const current = read?.versions?.find(([key]) => key === k)?.[1] ?? baseline.get(k) ?? 0;
      return [k, supplied == null ? relative(k, current) + 1 : relative(k, required(supplied))];
    });
    if (read && !read.action && begin.expectedSharedVersion !== undefined)
      expected.push(['unexpected-shared-version', begin.expectedSharedVersion]);
    const request = { id: begin.id, payload: begin.payload, patient, keys, expected,
      sessionVersion: relative(patient, meta?.sessionVersion ?? 0), revision: begin.revision,
      sessionRevision: meta?.sessionRevision ?? begin.revision,
      screenValid: screens?.valid !== false,
      native: !(finish && finish.status !== 201 && finish.reason !== 'version_conflict' && finish.reason !== 'shared_guard'),
      action: meta?.action ?? null, cacheVersion: meta?.cacheVersion == null ? null : relative(patient, meta.cacheVersion),
      cacheNative: true, projection: writes.find(w => w.key === patient)?.projection ?? '' };
    const ops: string[] = [];
    if (at('request-locked') >= 0) ops.push('request');
    ops.push(...locked.map(() => 'lock'));
    if (read) ops.push('read');
    if (finish) ops.push('guard', 'stage');
    else if (replay) ops.push('stage');
    else if (native && screens?.valid !== false) ops.push('guard');
    const alternateOps = aborted && rows.find(r => r.step === 'aborted')?.uncertain ? [...ops, 'commit', 'crash'] : [];
    if (aborted) ops.push('crash');
    else ops.push('commit', 'unlock', 'respond');
    const result = aborted ? 'aborted' : required((finish ?? replay)).status === 201 ? 'accepted' :
      required((finish ?? replay)).status === 409 ? 'conflict' : 'refused';
    // Payload conflicts throw and roll back; the stable answer belongs to the
    // earlier transaction. No invented outcome is added to such attempts.
    const after = attempts.flatMap((other, j) => other.last < g.first && j !== index ? [j] : []);
    return { request, ops, alternateOps, observed: (read?.versions ?? []).map(([k, v]: [string, number]) => [k, relative(k, v)]), result, after };
  });
}
export function checkTrace(path: string) {
  const rows = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const program = compileTrace(rows);
  const dir = mkdtempSync(join(tmpdir(), 'commit-protocol-test-'));
  try {
    const input = join(dir, 'program.json'); writeFileSync(input, JSON.stringify(program));
    const binary = process.env.EHR_BIN ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../lean/.lake/build/bin/ehr');
    const checked = spawnSync(binary, ['protocol-trace', input],
      { encoding: 'utf8', timeout: 60_000, env: { ...process.env, LEAN_NUM_THREADS: '6' }, maxBuffer: 1024 * 1024 });
    assert.equal(checked.status, 0, `Lean trace checker failed: ${checked.error ?? ''}\n${checked.stdout}\n${checked.stderr}`);
    return checked.stdout.trim();
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'usage: check-trace.ts trace.jsonl');
  console.log(checkTrace(process.argv[2]));
}
