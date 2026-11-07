import { offlineMapElites, placementOperator } from '../../explore/offline.js';
import { describeProgram } from '../../explore/generator.js';
import { Archive } from '../../explore/archive.js';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';

const baseline=fakeCanonical('v1'),spec=fakeSpec('v1');
it('runs bounded MAP-Elites without switching cost and exports release bytes',async()=>{
  const changed=structuredClone(baseline),component=changed.screens.flatMap(s=>s.components).find(c=>c.id==='w7-labs');
  if(!component)throw Error('Missing fixture');component.tab=0;
  const candidate=describeProgram(changed,['W1','W7']);
  let calls=0;
  const result=await offlineMapElites({baseline,spec,workflows:['W1','W7'],iterations:3,operators:[{id:'test-placement',enumerate:()=>[candidate]}],
    async evaluate(c,id){calls++;return {id,candidate:c,status:'accepted',metrics:{tasks:2,completed:2,clicks:10,scrolls:2,keystrokes:20},quality:-10000,evidence:{leanVerdict:'ok',screenStatus:'pass',switchCost:99999}};}});
  expect(calls).toBe(1);expect(result.programs).toHaveLength(1);
  expect([...result.archive.cells.values()][0]?.quality).toBe(-6.5);
  expect(result.evaluations[0]?.evidence.switchCost).toBe(0);
});
it('novelty cannot admit a checker rejection or overwrite quality',async()=>{
  const candidate=describeProgram(baseline,['W1']),archive=new Archive();
  expect(archive.explorationRank(candidate,baseline,7,0.25)).toBe(7);
  expect(archive.insert({id:'bad',candidate,status:'lean-rejected',metrics:{tasks:1,completed:1,clicks:0,scrolls:0,keystrokes:0},quality:999,evidence:{leanVerdict:'fail'}})).toBe(false);
  const result=await offlineMapElites({baseline,spec,workflows:['W1'],iterations:1,operators:[{id:'bad',enumerate:()=>[candidate]}],
    async evaluate(c,id){return {id,candidate:c,status:'lean-rejected',metrics:{tasks:1,completed:1,clicks:0,scrolls:0,keystrokes:0},evidence:{leanVerdict:'fail'}};}});
  expect(result.programs).toHaveLength(0);expect(result.evaluations).toHaveLength(1);
});
it('refuses substituted programs and rejects invalid budgets',async()=>{
  const candidate=describeProgram(baseline,['W1']);
  await expect(offlineMapElites({baseline,spec,workflows:['W1'],iterations:1,operators:[{id:'test',enumerate:()=>[candidate]}],async evaluate(c,id){return {id,candidate:{...c,program:{...c.program,version:99}},status:'accepted',evidence:{leanVerdict:'ok'}};}})).rejects.toThrow('substituted');
  await expect(offlineMapElites({baseline,spec,workflows:['W1'],iterations:0,async evaluate(){throw Error('unused');}})).rejects.toThrow('budget');
});
it('today’s public placement operator enumerates real program changes',()=>{
  expect(placementOperator.enumerate(baseline,spec,['W1','W7']).every(c=>JSON.stringify(c.program)!==JSON.stringify(baseline))).toBe(true);
});

it('requires explicit native and screen evidence even from an optimistic evaluator',async()=>{
  const candidate=describeProgram(baseline,['W1']);
  for(const evidence of [{leanVerdict:'fail',screenStatus:'pass'},{leanVerdict:'ok',screenStatus:'fail'},{leanVerdict:'ok'}]) {
    const result=await offlineMapElites({baseline,spec,workflows:['W1'],iterations:1,operators:[{id:'test',enumerate:()=>[candidate]}],
      async evaluate(c,id){return {id,candidate:c,status:'accepted',metrics:{tasks:1,completed:1,clicks:0,scrolls:0,keystrokes:0},evidence};}});
    expect(result.programs).toHaveLength(0);
    expect(result.evaluations[0]?.status).toBe(evidence.leanVerdict==='ok'?'screen-rejected':'lean-rejected');
  }
});
