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
  assert.throws(()=>generate(defaultPoint,['W5'],baseline,spec),/Workflow absent/);
  assert.equal(generate({...defaultPoint,input:'voice',tier:'sandbox'},['W3'],baseline,spec).sandbox?.deployable,false);
  assert.throws(()=>parsePoint({...defaultPoint,input:'telepathy'}),/input/);
});
test('renaming tags cannot evade independent movement budget',()=>{
  const c=generate(defaultPoint,['W3'],baseline,spec);
  let n=0;
  for(const s of c.program.screens) for(const x of s.components) if(n++<9){x.parent='new-parent';x.tag='renamed';}
  assert.throws(()=>validateCandidate(c,baseline,spec),/budget/);
});

test('admitted board and dated constructors retain the original clinical contract',()=>{
  for(const point of [{...defaultPoint,layout:'board' as const,patientScope:'multi' as const},
    {...defaultPoint,layout:'timeline' as const,temporalView:'aligned' as const}]){
    const candidate=generate(point,['W3'],baseline,spec);
    assert.equal(candidate.sandbox,null);
    assert.deepEqual(taskContract(spec,candidate.program,['W3']).contracts,taskContract(spec,baseline,['W3']).contracts);
    if(point.temporalView==='aligned')assert.ok(candidate.program.screens.some(s=>s.components.some(c=>c.tag.endsWith('.layout.datedTimeline'))));
  }
  assert.throws(()=>generate({...defaultPoint,patientScope:'multi'},['W3'],baseline,spec),/extension/);
});

test('realized descriptors and refreshed niches reuse the offline archive', async () => {
  const {describeProgram}=await import('./generator.js');
  const {archiveFrom}=await import('./search.js');
  const entries=seedPoints().map((point,index)=>{
    const generated=generate(point,['W3'],baseline,spec);
    const described=describeProgram(generated.program,['W3']);
    assert.equal(described.point.layout,point.layout);
    return {id:String(index),candidate:described,status:'accepted' as const,
      metrics:{tasks:2,completed:2,clicks:index+1,scrolls:0,keystrokes:0},quality:-index,
      evidence:{leanVerdict:'ok',screenStatus:'pass'}};
  });
  assert.equal(archiveFrom(entries).cells.size,4);
});
