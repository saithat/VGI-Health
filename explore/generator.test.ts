import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programSchema, specSchema } from '../agent/src/schema.js';
import { defaultPoint, parsePoint, seedPoints } from './design.js';
import { generate, validateCandidate } from './generator.js';
import { taskContract } from './tasks.js';
const baseline = programSchema.parse(JSON.parse(readFileSync('releases/v1/personas/P2.json','utf8')));
const spec = specSchema.parse(JSON.parse(readFileSync('releases/v1/spec.json','utf8')));
test('four realized layout families preserve clinical kinds and all commit contracts', () => {
  for (const p of seedPoints()) {
    const c = generate(p,['W3'],baseline,spec);
    const original=new Map(baseline.screens.flatMap(s=>s.components.map(c=>[c.id,c.kind] as const)));
    for(const x of c.program.screens.flatMap(s=>s.components))if(original.has(x.id))assert.deepEqual(x.kind,original.get(x.id));
    assert.deepEqual(taskContract(spec,c.program,['W3']).contracts,taskContract(spec,baseline,['W3']).contracts);
  }
});
test('unsupported certified dimensions fail; sandbox is explicitly nondeployable',()=>{
  assert.throws(()=>generate({...defaultPoint,input:'voice'},['W3'],baseline,spec),/extension/);
  assert.equal(generate({...defaultPoint,input:'voice',tier:'sandbox'},['W3'],baseline,spec).sandbox?.deployable,false);
  assert.throws(()=>parsePoint({...defaultPoint,input:'telepathy'}),/input/);
});
test('renaming tags cannot evade independent movement budget',()=>{
  const c=generate(defaultPoint,['W3'],baseline,spec);
  let n=0;
  for(const s of c.program.screens) for(const x of s.components) if(n++<9){x.parent='new-parent';x.tag='renamed';}
  assert.throws(()=>validateCandidate(c,baseline,spec),/budget/);
});
