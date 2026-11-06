/** Real W3 source-time integration and independent UTC coordinate check. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { expandProgram } from '../agent/src/composites.ts';
import { archivedBundle, boundInitial } from './workspace.mjs';
import { write } from './evaluate.ts';
import { atoms } from '../app/scripts/exotic-gate.mjs';
const out=process.argv[2]??'runs/promote-ordinary';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const call=(name,input)=>JSON.parse(wasm.call(name,JSON.stringify(input)));
const spec=await read('releases/v1/spec.json');
const program=expandProgram((await read(`${out}/proposals.json`)).results.find(p=>p.id==='r2-008').candidate.program);
const cases=[];
for(const id of ['d01-P2-W3-001','d01-P2-W3-002','d02-P2-W3-001','d02-P2-W3-002']){
 const task=await read(`runs/core-10day/trajectories/tasks/${id}.json`),facts=task.context.segments[0].facts;
 const fixture=archivedBundle(await read(task.context.fixtureFile),facts.sourcePatientId);
 const bundle={...fixture,entry:[...fixture.entry,...task.context.resources.map(resource=>({resource}))]};
 const projected=call('ehr_facts',{bundle,context:{today:task.context.today,now:task.context.startMin,receipts:[],record:[]}});
 assert.equal(projected.display.sourcePatientId,facts.sourcePatientId);
 const raw=bundle.entry.flatMap(e=>{const r=e.resource,resource=`${r.resourceType}/${r.id||e.fullUrl||''}`;
  const effective=r.effectiveDateTime?{resource,field:'effectiveDateTime',timestamp:r.effectiveDateTime}:
   r.effectivePeriod?.start?{resource,field:'effectivePeriod.start',timestamp:r.effectivePeriod.start}:null;
  return [...(effective?[effective]:[]),...(r.issued?[{resource,field:'issued',timestamp:r.issued}]:[])];});
 assert.deepEqual(projected.display.timelineSources,raw);
 const input={spec,program,facts,display:projected.display,user:{id:program.owner,role:'physician'}};
 input.state=boundInitial(call,input);
 // Exercise the actual W3 laboratory tab, rather than claiming sources behind
 // an initially collapsed patientSidebar or an unselected tab are visible.
 input.state={...input.state,screen:'chartHistory',tabSel:[['chartHistory.recordTabs',2]]};
 const request={op:'dated',render:input},result=call('ehr_exotic',request);
 assert.deepEqual(result,JSON.parse(execFileSync('lean/.lake/build/bin/exotic-api',[],{input:JSON.stringify(request),encoding:'utf8'})));
 const ordinary=call('ehr_exotic',{op:'render',render:input}).screen;
 const infos=atoms([...ordinary.workspace,...ordinary.side]).filter(n=>n.info).map(n=>n.info);
 const eligible=raw.filter((source,occurrence)=>(projected.display.timelineBackings??[]).some(b=>
   b.occurrence===occurrence&&b.source.resource===source.resource&&b.source.field===source.field&&b.source.timestamp===source.timestamp&&
   !(facts.infoPayloads??[]).some(p=>p.info===b.info)&&infos.some(n=>n.infoId===b.info&&n.rows.some(row=>JSON.stringify(row)===JSON.stringify(b.row)))));
 assert.ok(eligible.length>0,'Real shown-source integration');
 assert.ok(eligible.length<raw.length,'Unshown whole-bundle candidates withheld');
 const multiset=xs=>xs.map(x=>JSON.stringify([x.resource,x.field,x.timestamp])).sort();
 assert.deepEqual(multiset([...result.dated.map(d=>d.source),...result.undated]),multiset(eligible));
 for(const item of result.dated){
  assert.match(item.source.timestamp,/(Z|[+-]\d{2}:\d{2})$/);
  assert.equal(item.utcSecond,Math.floor(Date.parse(item.source.timestamp)/1000));
  const fraction=/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(item.source.timestamp)?.[1]??'';
  assert.equal(item.nanosecond,Number(fraction.padEnd(9,'0')));
 }
 cases.push({id,candidates:raw.length,eligible:eligible.length,withheld:raw.length-eligible.length,dated:result.dated.length,unpositioned:result.undated.length});
}
await write(`${out}/source-time-check.json`,{status:'pass',cases,nativeWasmMismatches:0,utcReference:'ECMAScript Date.parse seconds plus exact raw fractional digits; no local timestamps supplied'});
console.log(JSON.stringify({status:'pass',cases}));
