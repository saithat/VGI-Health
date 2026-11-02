import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {defaultPoint} from './design.js';
import {DeterministicDecision, LocalDecision, JevDecision, validateDistribution} from './decision.js';
import {Archive,type Evaluation} from './archive.js';
import {generate} from './generator.js';
import {programSchema,specSchema} from '../agent/src/schema.js';
import {readFileSync} from 'node:fs';
test('probability validation fails closed',()=>{
  assert.throws(()=>validateDistribution(['a','b'],{a:1}),/Invalid/);
  assert.throws(()=>validateDistribution(['a','b'],{a:NaN,b:0}),/Invalid/);
  assert.throws(()=>validateDistribution(['a','b'],{a:-1,b:2}),/Invalid/);
});
test('decision transports keep option identities and reject missing logprobs',async()=>{
  const server=createServer((_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({decision_probabilities:{'0':0.8,'1':0.2},choices:[]}));});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const address=server.address();if(!address||typeof address==='string')throw Error('address');
    const url=`http://127.0.0.1:${address.port}/v1`;
    const input={state:{},options:[{id:'review',label:'Review',event:null},{id:'next',label:'Next',event:null}]};
    assert.deepEqual((await new LocalDecision(url,'test').choice(input)).probabilities,{review:0.8,next:0.2});
    await assert.rejects(()=>new LocalDecision(url,'test','token-logprobs').choice(input),/logprobs/);
    assert.equal((await new DeterministicDecision().choice(input)).probabilities['review'],0.5);
    await assert.rejects(()=>new JevDecision().choice(input),/unconfigured/);
  }finally{server.close();}
});
test('MAP-Elites keeps slower novel niches, hard gates and completion precedence',()=>{
  const base=programSchema.parse(JSON.parse(readFileSync('releases/v1/personas/P2.json','utf8')));
  const spec=specSchema.parse(JSON.parse(readFileSync('releases/v1/spec.json','utf8')));
  const make=(layout:'stack'|'columns',quality:number,completed=1):Evaluation=>({id:layout,candidate:generate({...defaultPoint,layout},['W3'],base,spec),status:'accepted',metrics:{tasks:1,completed,clicks:10,scrolls:2,keystrokes:5},quality,evidence:{leanVerdict:'ok'}});
  const a=new Archive();assert.equal(a.insert(make('stack',-10)),true);assert.equal(a.insert(make('columns',-100)),true);
  assert.equal(a.cells.size,2);assert.equal(a.insert(make('stack',100,0)),false);
  const e=make('stack',100);e.evidence['leanVerdict']='violation';assert.equal(a.insert(e),false);
  e.candidate.point.tier='checked';e.evidence['leanVerdict']='ok';assert.equal(a.insert(e),false);
});
test('real CPU endpoint smoke (opt in)',{skip:!process.env['EXPLORE_DECISION_ENDPOINT']},async()=>{
  const d=new LocalDecision(process.env['EXPLORE_DECISION_ENDPOINT']!,'HuggingFaceTB/SmolLM2-135M-Instruct');
  const r=await d.choice({state:'Review orders',options:[{id:'review',label:'Review allergies',event:null},{id:'sign',label:'Sign',event:null}]});
  assert.equal(Object.keys(r.probabilities).length,2);
});

test('checked renderer requires every state and viewport independently',async()=>{
  const {requireRendererCoverage}=await import('./renderer.js');
  const evidence={rendererSha256:'a'.repeat(64),assertions:[{stateSha256:'state',viewport:[1440,900] as [number,number],accessibility:'pass' as const,geometry:'pass' as const,artifact:'assertions.json'}]};
  assert.throws(()=>requireRendererCoverage(['state'],[[1440,900],[390,844]],evidence),/coverage/);
  requireRendererCoverage(['state'],[[1440,900]],evidence);
});
