/** Frozen-model evaluation. Historical trajectory choices are simulator-generated, never human. */
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { replayTrajectory } from '../app/src/dashboard/trajectory-replay.ts';
import { DeterministicDecision, LocalDecision } from './decision.ts';
import { write } from './evaluate.ts';
import { defaultPoint } from './design.ts';
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(`--${key}`);return i<0?fallback:args[i+1];};
const run=arg('source','runs/core-10day'),out=arg('out','runs/explore-calibration');
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Calibration outputs belong under ignored runs/');
const endpoint=arg('endpoint',''),limit=Number(arg('limit','24'));
if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('Invalid calibration limit');
const model=endpoint?new LocalDecision(endpoint,arg('model','HuggingFaceTB/SmolLM2-135M-Instruct')):new DeterministicDecision();
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const binaryRows=[],choiceRows=[],excluded=[];
for(const night of (await readdir(path.join(run,'decisions'))).sort())for(const file of (await readdir(path.join(run,'decisions',night))).sort()){
  const source=path.join(run,'decisions',night,file),decision=await read(source);
  for(const row of decision.candidates??[]){
    if(binaryRows.length>=limit)break;
    if(!['pass','fail'].includes(row.check?.status)||!row.check?.verdict)continue;
    // Input contains the proposal only, never its verdict/validation or future outcome.
    const context={candidate:row.candidate,specVersion:decision.specVersion,role:decision.persona};
    const pred=await model.screen({point:defaultPoint,programFeatures:[row.candidate.patch?.length??0,row.componentsMoved??0],context});
    binaryRows.push({source,candidate:row.candidate.id,group:night,label:Number(row.check.verdict==='ok'),probability:pred.pass,
      provenance:'Lean certification verdict; historical proposal metadata; full design point unavailable'});
  }
}
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const interp={init:(spec,program,facts,user)=>wasm.init(`{"spec":${spec},"program":${program},"facts":${facts},"user":${user}}`),
  step:(spec,program,facts,user,state,event)=>wasm.step(`{"spec":${spec},"program":${program},"facts":${facts},"user":${user},"state":${state},"event":${event}}`)};
const index=await read(path.join(run,'trajectories/index.json'));
for(const entry of index.tasks.filter(t=>t.persona==='P2'&&t.workflow==='W3').slice(0,30)){
  if(choiceRows.length>=limit)break;
  const source=path.join(run,'trajectories',entry.file),task=await read(source);
  const program=await read(entry.programPath),spec=await read(entry.specPath);
  for(let count=0;count<task.trace.length;count++){
    const next=task.trace[count];if(!next.event.click||next.result!=='ok')continue;
    const replay=replayTrajectory(interp,task,spec,program,count);
    if(replay.firstMismatch){excluded.push({source,count,reason:'replay mismatch'});break;}
    // Honor the same clock update as the recorded simulator event.
    replay.state.clock=next.t-task.context.startMin*600;
    const envelope=`{"spec":${replay.args[0]},"program":${replay.args[1]},"facts":${replay.args[2]},"user":${replay.args[3]},"state":${JSON.stringify(replay.state)}}`;
    const view=JSON.parse(wasm.view(envelope));
    if(view.popup)continue;
    const options=view.items.filter(it=>it.shown&&view.enabled.includes(it.comp.id)&&
      typeof it.comp.kind==='object'&&('button'in it.comp.kind||'macro'in it.comp.kind||it.comp.kind.group?.collapsible))
      .map(it=>({id:it.comp.id,label:it.comp.label,event:{click:{comp:it.comp.id}}}));
    if(options.length<2||options.length>10||!options.some(o=>o.id===next.event.click.comp))continue;
    // One label per trajectory avoids thousands of nearly identical confirmations.
    const prediction=await model.choice({state:{screen:view.screen,title:view.title,
      visible:view.items.filter(it=>it.shown).map(it=>({label:it.comp.label,value:it.value,kind:it.comp.kind})).slice(0,30)},options});
    const winner=Object.keys(prediction.probabilities).reduce((a,b)=>prediction.probabilities[a]>=prediction.probabilities[b]?a:b);
    choiceRows.push({source,eventIndex:count,group:`day-${entry.day}`,label:next.event.click.comp,options,prediction,
      confidence:prediction.probabilities[winner],correct:Number(winner===next.event.click.comp),
      provenance:'simulator-generated next click conditional on visible enabled click actions; not human; entries/tabs/popups excluded'});
    break;
  }
}
export function reliability(rows,probability,label,bins=10){
  const curve=Array.from({length:bins},(_,i)=>({lower:i/bins,upper:(i+1)/bins,n:0,confidence:0,frequency:0}));
  for(const r of rows){const p=probability(r),y=label(r);if(!Number.isFinite(p)||p<0||p>1||![0,1].includes(y))throw Error('Invalid calibration row');
    const b=curve[Math.min(bins-1,Math.floor(p*bins))];b.n++;b.confidence+=p;b.frequency+=y;}
  for(const b of curve)if(b.n){b.confidence/=b.n;b.frequency/=b.n;}
  return {n:rows.length,ece:rows.length?curve.reduce((n,b)=>n+b.n/rows.length*Math.abs(b.confidence-b.frequency),0):null,
    brier:rows.length?rows.reduce((n,r)=>n+(probability(r)-label(r))**2,0)/rows.length:null,curve};
}
await mkdir(out,{recursive:true});
await write(path.join(out,'calibration.json'),{model:endpoint?'local-tiny-open-model':'deterministic-stand-in',
  protocol:'Frozen model, no temperature fitting or parameter tuning on these labels; grouped source IDs retained for future train/calibration/test splits. Small selected sample is a smoke evaluation, not a deployment calibration claim.',
  screen:reliability(binaryRows,r=>r.probability,r=>r.label),choice:reliability(choiceRows,r=>r.confidence,r=>r.correct),
  binaryRows,choiceRows,excluded,llmRequests:endpoint?binaryRows.length*2+choiceRows.length:0});
console.log(JSON.stringify({screenLabels:binaryRows.length,choiceLabels:choiceRows.length,out}));
