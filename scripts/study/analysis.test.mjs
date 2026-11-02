import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sequence, sessionSchema, emptyEffort } from '../../app/src/dashboard/study/model.ts';
import { reliability, distribution, ci, effort } from './analysis.mjs';

test('Williams allocation balances periods and all directed carryover pairs', () => {
  const pairs = new Set();
  for (let slot=0;slot<4;slot++) {
    const order=sequence(slot);
    assert.equal(new Set(order.map(x=>x.design)).size,4);
    assert.equal(new Set(order.map(x=>x.caseIndex)).size,4);
    for(let i=0;i<3;i++)pairs.add(`${order[i].design}/${order[i+1].design}`);
  }
  assert.equal(pairs.size,12);
  for(let position=0;position<4;position++) assert.equal(new Set([0,1,2,3].map(s=>sequence(s)[position].design)).size,4);
  for(let slot=0;slot<16;slot++) assert.equal(new Set(sequence(slot).map(x=>x.caseIndex)).size,4);
  assert.throws(()=>sequence(-1)); assert.throws(()=>sequence(0.5));
});
test('calibration bins include probability one, exact ECE and stable ties', () => {
  const result=reliability([{confidence:.8,correct:1},{confidence:.8,correct:0},{confidence:1,correct:1}]);
  assert.ok(Math.abs(result.ece-.2)<1e-10);
  assert.equal(result.top1,2/3); assert.equal(result.curve[4].n,3);
  assert.equal(distribution(['b','a'],{a:.5,b:.5}),'b');
  assert.equal(reliability([]).ece,null);
  assert.throws(()=>distribution(['a','b'],{a:1}));
  assert.throws(()=>distribution(['a','b'],{a:-1,b:2}));
  assert.throws(()=>reliability([{confidence:NaN,correct:1}]));
});
test('participant-paired effort, raw TLX and standard SUS scoring',()=>{
  const trial=(design,clicks)=>({design,caseId:'synthetic',position:0,practice:false,completed:true,stopReason:'complete',effort:{...emptyEffort(),clicks},trace:[],tlx:[10,20,30,40,50,60],sus:[5,1,5,1,5,1,5,1,5,1]});
  const result=effort([{participant:'P001',trials:[trial('stack',10),trial('board',7)]},{participant:'P002',trials:[trial('stack',20),trial('board',15)]}]);
  assert.equal(result.summary.stack.rawTlx.mean,35);assert.equal(result.summary.stack.susScore.mean,100);
  assert.equal(result.pairedVsStack.board.clicks.meanDifference,-4);
  assert.deepEqual(ci([2,2]),[2,2]);assert.equal(ci([1]),null);
  assert.equal(result.summary.dated.clicks.mean,null);
});
test('session schema accepts practice positions and rejects identifying IDs and unknown fields',()=>{
  const stamp=new Date().toISOString();
  const valid={schemaVersion:1,studyId:'study-test',manifestHash:'hash',sessionId:'12345678-1234-4234-8234-123456789012',participant:'P001',slot:0,provenance:'simulated-dry-run',consentVersion:'v1',consentAt:stamp,startedAt:stamp,status:'in-progress',viewport:{width:1440,height:1000,pixelRatio:1},trials:[]};
  assert.equal(sessionSchema.safeParse(valid).success,true);
  assert.equal(sessionSchema.safeParse({...valid,participant:'Dr Smith'}).success,false);
  assert.equal(sessionSchema.safeParse({...valid,realName:'identifier'}).success,false);
  assert.equal(sessionSchema.safeParse({...valid,consentAt:undefined}).success,false);
});
