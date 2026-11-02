import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {programSchema,specSchema} from '../agent/src/schema.js';
import {search} from './search.js';
import {DeterministicDecision} from './decision.js';
import {LlmOperator} from './operators.js';
test('surrogate orders a batch while every retained candidate traverses evaluation',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'explore-search-test-'));
 try{
  const baseline=programSchema.parse(JSON.parse(readFileSync('releases/v1/personas/P2.json','utf8')));
  const spec=specSchema.parse(JSON.parse(readFileSync('releases/v1/spec.json','utf8')));
  const seen:string[]=[];
  const decision=new DeterministicDecision();decision.screen=async i=>({pass:i.point.layout==='columns'?0.9:0.1,improvement:0.5,model:'test'});
  const archive=await search({baseline,spec,workflows:['W3'],out,iterations:2,lookahead:2,context:{},decision,
   evaluate:async(c,id)=>{seen.push(id);return {id,candidate:c,status:'accepted',metrics:{tasks:1,completed:1,clicks:1,scrolls:1,keystrokes:1},quality:-3,evidence:{leanVerdict:'ok'}};}});
  assert.deepEqual(seen,['candidate-002','candidate-001']);assert.equal(archive.cells.size,2);
  const report=JSON.parse(await readFile(path.join(out,'report.json'),'utf8'));assert.equal(report.llmCalls,0);
 }finally{await rm(out,{recursive:true,force:true});}
});
test('failed LLM requests consume the strict budget',async()=>{
 const operator=new LlmOperator({name:'scripted',model:'test',complete:async()=>{throw Error('offline');}},1);
 const baseline=programSchema.parse(JSON.parse(readFileSync('releases/v1/personas/P2.json','utf8')));
 const spec=specSchema.parse(JSON.parse(readFileSync('releases/v1/spec.json','utf8')));
 const {generate}=await import('./generator.js'),{defaultPoint}=await import('./design.js');
 const c=generate(defaultPoint,['W3'],baseline,spec);
 await assert.rejects(()=>operator.propose(c,baseline,spec,{}),/offline/);
 assert.equal(operator.calls,1);await assert.rejects(()=>operator.propose(c,baseline,spec,{}),/exhausted/);
});
