import { adtCommandInput, canonical, commandInput, configSchema, digest, num, obj, objs, required, sharedAction, sharedKey, str } from '../src/types.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Lean } from '../src/lean.ts';

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
  assert.deepEqual(sharedAction(actor, { modelId: 7 }, w),
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

test('JSON narrowing preserves mutable object/array identities and rejects wrong shapes', () => {
  const entry = { resource: { id: 'original' } };
  const entries = [entry];
  assert.strictEqual(obj(entry), entry);
  assert.strictEqual(objs(entries), entries);
  objs(entries).push({ resource: { id: 'added' } });
  assert.equal(entries.length, 2);
  obj(entry.resource).id = 'changed';
  assert.equal(entry.resource.id, 'changed');
  for (const value of [null, [], 'object', 1]) assert.throws(() => obj(value));
  for (const value of [null, {}, [1], [null]]) assert.throws(() => objs(value));
  assert.throws(() => str(3));
  assert.throws(() => num('3'));
  assert.throws(() => required(undefined));
});


test('ADT codec requires exact swap/cancellation operands and positive original event ordinals', () => {
  const base = {requestId:'new-adt',expected:[{key:'patient:a',version:1}],patient:'a'};
  const good = [
    {...base,action:'swap',other:'b',source:401,bed:402},
    {...base,action:'cancelAdmit',event:1},
    {...base,action:'cancelTransfer',event:2},
    {...base,action:'cancelDischarge',event:3,bed:402},
  ];
  for (const c of good) assert.ok(adtCommandInput.safeParse(c).success);
  for (const c of [
    {...good[0],other:undefined}, {...good[0],source:undefined},
    {...good[1],event:0}, {...good[1],bed:401}, {...good[2],source:401},
    {...good[3],bed:undefined}, {...good[1],originalState:{}}, {...good[1],event:-1},
    {...base,action:'discharge',event:1},
  ]) assert.equal(adtCommandInput.safeParse(c).success,false);
});

test('ADT cancellation preserves later clinical documentation and reopens only the original encounter', () => {
  const config = configSchema.parse({tenant:'compensation',units:{west:{name:'West',marOnService:true}},
    adt:{patients:['a'],beds:[{id:401,unit:'west',resource:'bed-a'},{id:402,unit:'west',resource:'bed-b'}]},
    actors:[{token:'synthetic-adt-projection-token',user:{id:'manager',role:'physician'},modelId:1,patients:['a']}],releases:{}});
  const none = {id:'a',admitted:false,bed:null,revision:0,encounter:0,last:null};
  const admitted = {...none,admitted:true,bed:401,revision:1,encounter:1,last:{kind:'admit',source:null,target:401}};
  const bundle = projectAdt({adt:none,bundle:{entry:[]}},admitted,config,'original-encounter','2026-11-07T10:00:00Z');
  const note = {resourceType:'DocumentReference',id:'later-note',status:'current',context:{encounter:[{reference:'Encounter/original-encounter'}]}};
  objs(obj(bundle).entry).push({resource:note});
  const snapshot = {adt:admitted,bundle};
  const original = structuredClone(snapshot);
  const cancelled = {...admitted,admitted:false,bed:null,revision:2,last:null};
  const cancelledBundle = projectAdt(snapshot,cancelled,config,'cancel-admit','2026-11-07T10:05:00Z',{action:'cancelAdmit',event:1,actor:'manager'});
  assert.deepEqual(snapshot,original,'projection must not mutate its input');
  const resources = objs(obj(cancelledBundle).entry).map(e => obj(e.resource));
  assert.deepEqual(resources.find(r => r.id === 'later-note'),note);
  assert.equal(required(resources.find(r => r.id === 'original-encounter')).status,'entered-in-error');
  const readmitted = {...admitted,revision:3,encounter:3,last:{kind:'admit',source:null,target:401}};
  const next = projectAdt({adt:cancelled,bundle:cancelledBundle},readmitted,config,'new-encounter','2026-11-07T11:00:00Z');
  const discharged = {...readmitted,admitted:false,bed:null,revision:4,last:{kind:'discharge',source:401,target:null}};
  const finished = projectAdt({adt:readmitted,bundle:next},discharged,config,'discharge','2026-11-07T12:00:00Z');
  const reopened = {...readmitted,bed:402,revision:5,last:null};
  const restored = projectAdt({adt:discharged,bundle:finished},reopened,config,'cancel-discharge','2026-11-07T12:05:00Z',{action:'cancelDischarge',event:4,actor:'manager'});
  const final = objs(obj(restored).entry).map(e => obj(e.resource));
  assert.equal(final.filter(r => r.resourceType === 'Encounter').length,2);
  assert.equal(required(final.find(r => r.id === 'original-encounter')).status,'entered-in-error');
  const active = required(final.find(r => r.id === 'new-encounter'));
  assert.equal(active.status,'in-progress'); assert.equal(obj(active.period).end,undefined);
  assert.equal(objs(active.location).filter(l => l.status === 'active').length,1);
  assert.equal(obj(required(objs(active.location).find(l => l.status === 'active')).location).reference,'Location/bed-b');
  assert.deepEqual(final.find(r => r.id === 'later-note'),note);
  const provenance = required(final.find(r => r.id === 'cancel-discharge-cancel'));
  assert.equal(obj(obj(objs(provenance.entity)[0].what).identifier).value,'a:4');
  assert.equal(objs(provenance.target)[0].reference,'Encounter/new-encounter');
});
