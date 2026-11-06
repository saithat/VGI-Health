import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEhr } from '../agent/src/ehr.js';
import { movePlacement, placementVariants } from './placements.js';
import { programSchema, specSchema } from '../agent/src/schema.js';
import { offlinePersonaParams, offlineRoleProfiles } from '../agent/src/offline-preferences.js';
const read = (file:string) => JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const spec = specSchema.parse(read('releases/v1/spec.json'));
const ehr = createEhr({fake:false});
for (const [persona,workflow] of [['P1','W1'],['P2','W3']] as const) {
  const baseline=programSchema.parse(read(`releases/v1/personas/${persona}.json`));
  test(`${persona}: public placement proposal is natively certified, keeps identities and realizes the role's simulated review target`,async()=>{
    const variant=placementVariants(baseline,spec,[workflow])[0]!;
    const candidate=variant.candidate.program;
    assert.ok(variant.hypothesis.includes('allergyList'));
    assert.deepEqual(baseline.screens.flatMap(s=>s.components.map(c=>[c.id,c.kind,c.visibility,c.tag,c.copyOf])).sort(),
      candidate.screens.flatMap(s=>s.components.map(c=>[c.id,c.kind,c.visibility,c.tag,c.copyOf])).sort());
    const result=await ehr.check({specVersion:'v1',program:candidate,prev:baseline,canonical:baseline});
    assert.equal(result,'ok',JSON.stringify(result));
    const preference=offlinePersonaParams(persona,1).hiddenPreferences!.placements[0]!;
    const screen=candidate.screens.find(s=>s.id===offlineRoleProfiles[persona].screen)!;
    assert.equal(screen.components.findIndex(c=>c.tag===preference.tag),1+screen.components.findIndex(c=>c.tag===preference.nearTag));
    assert.equal(screen.components.find(c=>c.tag===preference.tag)?.parent,screen.components.find(c=>c.tag===preference.nearTag)?.parent);
  });
  test(`${persona}: moving a complete group preserves descendants and passes the same native gate`,async()=>{
    const variants=placementVariants(baseline,spec,[workflow]);
    const variant=variants.find(v=>v.hypothesis.startsWith('Move the complete'))!;
    assert.ok(variant);
    const result=await ehr.check({specVersion:'v1',program:variant.candidate.program,prev:baseline,canonical:baseline});
    assert.equal(result,'ok',JSON.stringify(result));
    assert.deepEqual(variant.candidate.program.screens.flatMap(s=>s.components.map(c=>[c.id,c.parent,c.tab])).sort(),
      baseline.screens.flatMap(s=>s.components.map(c=>[c.id,c.parent,c.tab])).sort());
  });
}
test('placement rejects cycles, missing anchors and noncontainers before native certification',()=>{
  const p=programSchema.parse(read('releases/v1/personas/P2.json'));
  const screen=p.screens.find(s=>s.id==='w3Orders')!;
  const root=screen.components.find(c=>c.kind && typeof c.kind==='object' && 'group' in c.kind && screen.components.some(x=>x.parent===c.id))!;
  const child=screen.components.find(c=>c.parent===root.id)!;
  assert.throws(()=>movePlacement(p,spec,['W3'],{component:root.id,screen:screen.id,parent:child.id,tab:0}),/cycle/);
  assert.throws(()=>movePlacement(p,spec,['W3'],{component:child.id,screen:screen.id,tab:0,after:'absent'}),/sibling/);
  assert.throws(()=>movePlacement(p,spec,['W3'],{component:child.id,screen:screen.id,parent:child.id,tab:0}),/cycle/);
  assert.throws(()=>movePlacement(p,spec,['W1'],{component:child.id,screen:screen.id,tab:0}),/workflows/);
});
test('offline tastes are seeded per task role, exist in each canonical and leave public behavior unchanged',()=>{
  for (const id of ['P1','P2'] as const) {
    const p=programSchema.parse(read(`releases/v1/personas/${id}.json`));
    const params=offlinePersonaParams(id,1);
    assert.deepEqual(params,offlinePersonaParams(id,1));
    for (const preference of params.hiddenPreferences!.placements) {
      const tags=p.screens.flatMap(s=>s.components.map(c=>c.tag));
      assert.ok(tags.includes(preference.tag));assert.ok(tags.includes(preference.nearTag));
    }
    assert.ok(params.hiddenPreferences!.changeSensitivity>=1 && params.hiddenPreferences!.changeSensitivity<=3);
  }
  assert.notDeepEqual(offlinePersonaParams('P1',1).hiddenPreferences,offlinePersonaParams('P2',1).hiddenPreferences);
});
