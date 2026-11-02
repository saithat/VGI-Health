import { test } from 'node:test';
import assert from 'node:assert/strict';
import { physicians, PhysicianDecision, spread } from './cohort.js';
import { DeterministicDecision } from './decision.js';
test('cohort is seeded, balanced, disjoint and contains varied behavior', () => {
  const a=physicians(); assert.deepEqual(a,physicians()); assert.equal(a.length,24);
  assert.equal(a.filter(x=>x.split==='heldout').length,12);
  assert.equal(new Set(a.map(x=>x.seed)).size,24);
  assert.equal(new Set(a.map(x=>x.searchOrder)).size,3);
  assert.ok(Math.min(...a.map(x=>x.keyboardShare))<.3 && Math.max(...a.map(x=>x.keyboardShare))>.8);
});
test('learning reduces detours and seeded samples reproduce', async () => {
  const a=new PhysicianDecision(new DeterministicDecision(),physicians()[0]!);
  const b=new PhysicianDecision(new DeterministicDecision(),physicians()[0]!);
  const input={state:{},options:[{id:'a',label:'a',event:null},{id:'b',label:'b',event:null},{id:'detour',label:'detour',event:null}]};
  const first=await a.choice(input); assert.equal(a.sample(first),b.sample(await b.choice(input)));
  a.experience=5; assert.ok((await a.choice(input)).probabilities['detour']!<first.probabilities['detour']!);
  assert.deepEqual(spread([1,2,3]).mean,2);
});
test('frozen cache requires exact input identity and normalized probabilities', async () => {
  const {CachedDecision,digest}=await import('./cohort.js');
  const input={state:{screen:'Orders'},options:[{id:'a',label:'Dose',event:null},{id:'b',label:'Route',event:null}]};
  const prediction=await new DeterministicDecision().choice(input);
  const cache=new CachedDecision({choice:async()=>{throw Error('must use cache');},screen:async()=>({pass:0,improvement:0,model:'unused'})});
  assert.throws(()=>cache.prime([{key:'wrong',input,prediction}]),/identity/);
  cache.prime([{key:digest(input),input,prediction}]);
  assert.deepEqual(await cache.choice(input),prediction);
  await assert.rejects(()=>cache.choice({...input,state:{screen:'Different'}}),/must use cache/);
});
