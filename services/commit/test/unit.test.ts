import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Lean } from '../src/lean.ts';
import { canonical, commandInput, configSchema, digest, sharedAction, sharedKey } from '../src/types.ts';
import { versions } from '../src/store.ts';
import { projectAdt } from '../src/clinical-adt.ts';

const fake = (code: string, ms = 1000) => new Lean(process.execPath, ms, ['--input-type=module', '-e', code]);
test('payload hash is canonical, including nested objects, and binds all intent', () => {
  assert.equal(canonical({ z: 1, a: { y: 2, x: [3, 4] } }), canonical({ a: { x: [3, 4], y: 2 }, z: 1 }));
  assert.notEqual(digest({ version: 1 }), digest({ version: 2 }));
  assert.notEqual(digest([1, 2]), digest([2, 1]));
});
test('HTTP command codec rejects caller authority fields and unsafe versions', () => {
  const good = { requestId: 'id-1', sessionId: '3c85bb4e-690d-4e72-93a7-f42fb0858aa7', revision: 0,
    expectedVersion: 1, event: { click: { comp: 'sign' } } };
  assert.ok(commandInput.safeParse(good).success);
  for (const extra of [{ state: {} }, { user: {} }, { spec: {} }, { currentBundle: {} }, { expectedVersion: -1 }, { expectedVersion: 1.5 }])
    assert.equal(commandInput.safeParse({ ...good, ...extra }).success, false);
});
test('complete version vectors reject partial, duplicate or injectable identities', () => {
  const resource = { resourceType: 'Patient', id: 'p', meta: { versionId: '3' } };
  const bundle = (entry: unknown[]) => ({ resourceType: 'Bundle', type: 'collection', entry });
  assert.deepEqual(versions(bundle([{ resource }])), [{ url: 'Patient/p', version: '3' }]);
  for (const b of [bundle([{ resource }, { resource }]), bundle([{ resource: { ...resource, meta: {} } }]),
    bundle([{ resource: { ...resource, id: 'p\nHeader:' } }]), { ...bundle([]), type: 'searchset' },
    { ...bundle([]), link: [{ relation: 'next' }] }]) assert.throws(() => versions(b));
});
test('workflow selects shared identity; authenticated actor/patient select model IDs', () => {
  const w = { commit: 'administerMed', shared: { kind: 'dose' as const, order: 9, occurrence: 600 } };
  assert.equal(sharedKey('p', w), 'dose:p:9:600');
  assert.equal(sharedKey('other', w), 'dose:other:9:600');
  const actor = { token: 'x'.repeat(24), user: { id: 'nurse', role: 'rn' as const }, modelId: 2, patients: ['p'] };
  assert.deepEqual(sharedAction(actor, { patient: 'p', modelId: 7, bundle: {}, context: {} }, w),
    { administer: { actor: 2, dose: { patient: 7, order: 9, occurrence: 600 } } });
});
test('supervisor serializes concurrent calls and isolates operation errors', async () => {
  const l = fake(`import readline from 'node:readline';
    readline.createInterface({input:process.stdin}).on('line',line=>{
      const q=JSON.parse(line); console.log(JSON.stringify(q.op==='bad'?{id:q.id,error:'codec'}:{id:q.id,result:q.input}));
    });`);
  try {
    assert.deepEqual(await Promise.all(Array.from({ length: 20 }, (_, n) => l.call('echo', { n }))),
      Array.from({ length: 20 }, (_, n) => ({ n })));
    await assert.rejects(l.call('bad', {}), /codec/);
    assert.deepEqual(await l.call('echo', { recovered: true }), { recovered: true });
  } finally { l.close(); }
});
test('supervisor restarts after crash, protocol corruption and timeout; close rejects work', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vgi-lean-supervisor-'));
  try {
    for (const mode of ['exit', 'malformed', 'timeout']) {
      const file = join(dir, mode);
      const l = fake(`import fs from 'node:fs'; import readline from 'node:readline';
        const file=${JSON.stringify(file)}; const first=!fs.existsSync(file); fs.writeFileSync(file,'1');
        readline.createInterface({input:process.stdin}).on('line',line=>{
          if(first) { ${mode === 'exit' ? 'process.exit(1)' : mode === 'malformed' ? "console.log('corrupt')" : ''}; return; }
          const q=JSON.parse(line); console.log(JSON.stringify({id:q.id,result:{restarted:true}}));
        });`, 300);
      try {
        await assert.rejects(l.call('echo', {}));
        assert.deepEqual(await l.call('echo', {}), { restarted: true });
        l.close();
        await assert.rejects(l.call('echo', {}), /unavailable/);
      } finally { l.close(); }
    }
  } finally { await rm(dir, { recursive: true }); }
});

test('JSONB/native key order cannot rewrite an unchanged inpatient episode', () => {
  const config = configSchema.parse({ tenant: 'projection-test', units: { west: { name: 'West', marOnService: true } },
    adt: { patients: ['unrelated'], beds: [{ id: 42, unit: 'west', resource: 'bed-a' }] },
    actors: [{ token: 'synthetic-projection-test-token-only', user: { id: 'nurse', role: 'rn' }, modelId: 1, patients: ['unrelated'] }], releases: {} });
  const snapshot = { adt: { admitted: true, bed: 42, id: 'unrelated' }, bundle: { entry: [{ resource: {
    resourceType: 'Encounter', id: 'episode', meta: { versionId: '7' }, status: 'in-progress', class: { code: 'IMP' }, subject: { reference: 'Patient/unrelated' },
    location: [{ location: { reference: 'Location/bed-a' }, status: 'active', period: { start: '2026-11-01T10:00:00Z' } }],
  } }] } };
  const after = { id: 'unrelated', admitted: true, bed: 42 };
  assert.strictEqual(projectAdt(snapshot, after, config, 'new-action', '2026-11-05T12:00:00Z'), snapshot.bundle);
});
