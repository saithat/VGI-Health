/** Frozen-archive, decision-driven ED cohort experiment. Outputs are always ignored. */
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadEhrInterp } from '../app/public/ehr/interp-loader.mjs';
import { createEhr } from '../agent/src/ehr.ts';
import { createScreenChecker } from '../agent/src/screencheck.ts';
import { expandProgram } from '../agent/src/composites.ts';
import { validateCandidate } from './generator.ts';
import { programSchema, specSchema } from '../agent/src/schema.ts';
import { LocalDecision } from './decision.ts';
import { CachedDecision, PhysicianDecision, physicians, spread, digest } from './cohort.ts';
import { sourceAxis } from '../app/src/ehr/ui/exotic-axis.ts';
import { patientBound, hydrationEvent, workspaceChoice, boundInitial } from './workspace.mjs';
import { typingCost } from './cost.ts';
import { niche } from './design.ts';
import { write } from './evaluate.ts';
import { startLab, paint, measureEvent, atoms } from '../app/scripts/exotic-gate.mjs';
const out=path.resolve(process.argv[2]??'runs/explore-round2');
if(!out.startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const read=async f=>JSON.parse(await readFile(f,'utf8'));
let priorReport=null,priorProtocol=null;
try{priorReport=await read(path.join(out,'round2-report.json'));if(priorReport.phase==='complete')throw Error('Completed run is immutable; use a fresh run directory');}catch(error){if(error.code!=='ENOENT')throw error;}
try{priorProtocol=await read(path.join(out,'protocol.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
const proposals=await read(path.join(out,'proposals.json'));
const baseline=programSchema.parse(await read('releases/v1/personas/P2.json'));
const spec=specSchema.parse(await read('releases/v1/spec.json'));
const smoke=process.argv.includes('--smoke');
const seedIndex=process.argv.indexOf('--cohort-seed');
const cohortSeed=seedIndex<0?20261103:Number(process.argv[seedIndex+1]);
if(!Number.isInteger(cohortSeed))throw Error('Integer cohort seed required');
const cohort=physicians(cohortSeed);
if(priorProtocol&&(priorProtocol.evaluationVersion!==3||priorProtocol.geometryVersion!==3||priorProtocol.seed!==cohortSeed))throw Error('Resume cohort/protocol mismatch');
const health=await fetch('http://127.0.0.1:8788/health',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
if(health.device!=='cuda')throw Error('Expected supplied GPU server; CPU fallback must be explicitly recorded');
const model=new CachedDecision(new LocalDecision('http://127.0.0.1:8788/v1',health.model));
try { model.prime((await read(path.join(out,'decision-cache.json'))).rows); }
catch(error) { if(error.code!=='ENOENT')throw error; }
const importedModelRows=model.rows.length;
const sumTasks=tasks=>Object.fromEntries(['actions','clicks','keys','mouseTravelPx','scrollPx','backtracks','missingGeometry','blocked'].map(k=>[k,tasks.reduce((n,t)=>n+t[k],0)]));
let cacheFlush=Promise.resolve();
const wasm=await loadEhrInterp({wasmBinary:await readFile('app/public/ehr/ehr-interp.wasm')});
const call=(name,input)=>{const value=JSON.parse(wasm.call(name,JSON.stringify(input)));if(value.error)throw Error(value.error);return value;};
const exotic=input=>call('ehr_exotic',input);
const ehr=createEhr({binary:path.resolve('lean/.lake/build/bin/ehr')});
const screen=createScreenChecker(ehr,{artifactsDir:path.join(out,'stock-gates'),cacheDir:path.join(out,'stock-screen-cache')});
const index=await read('runs/core-10day-live/trajectories/index.json');
const searchIds=index.tasks.filter(t=>t.persona==='P2'&&t.workflow==='W3'&&t.day===1).slice(0,2);
if(smoke)searchIds.splice(1);
const usedPatients=new Set(searchIds.map(t=>t.patient.syntheaId));
const heldIds=index.tasks.filter(t=>t.persona==='P2'&&t.workflow==='W3'&&t.day===2&&!usedPatients.has(t.patient.syntheaId)).slice(0,2);
if(smoke)heldIds.splice(1);
if(!searchIds.length||!heldIds.length)throw Error('Missing disjoint W3 task inputs');
const schedules={search:await read('runs/world/2/schedules/day-01/P2.json'),heldout:await read('runs/world/2/schedules/day-02/P2.json')};
const scenarios={};
for(const [split,ids]of Object.entries({search:searchIds,heldout:heldIds})) {
 scenarios[split]=await Promise.all(ids.map(async entry=>{
  const trajectory=await read(path.join('runs/core-10day-live/trajectories',entry.file));
  const task=schedules[split].tasks.find(t=>t.id===entry.id);if(!task)throw Error('Missing task');
  const bundle=await read(trajectory.context.fixtureFile);
  const projected=call('ehr_facts',{bundle:{...bundle,entry:[...bundle.entry,...trajectory.context.resources.map(resource=>({resource}))]},context:{today:trajectory.context.today,now:task.startMin,receipts:[],record:[]}});
  // Reuse the archived clinical projection and episode segmentation, never its action labels.
  return {id:entry.id,patient:entry.patient.syntheaId,task,segments:trajectory.context.segments,display:projected.display};
 }));
}
const modeOf=c=>c.point.patientScope==='multi'?'board':c.point.navigation==='command'?'command':c.point.layout==='spatial'?'spatial':c.point.temporalView==='aligned'?'dated':null;
const build=await read('app/dist/build.json');
await write(path.join(out,'protocol.json'),{schemaVersion:1,evaluationVersion:3,geometryVersion:3,patientSelection:'Unchanged true; actual native open/hydrate controls are exercised and measured',smoke,cohort,seed:cohortSeed,health,build,
 wasmSha256:(await read('app/public/ehr/manifest.json')).assets['ehr-interp.wasm'],baselineSha256:digest(baseline),
 searchTasks:searchIds.map(t=>t.id),heldoutTasks:heldIds.map(t=>t.id),taskSplit:'Day 1 search; disjoint day 2 patients held out; no recorded next-action label supplied to cohort decisions',
 learning:'Experience resets for each design and increases after each task',
 precomputedSearchScores:importedModelRows,model:'Frozen Decider plus declared seeded behavior mixture; no tuning using heldout outcomes',
 resume:'Complete saved members only; re-score typing from raw events; reuse only frozen-model predictions keyed by exact input',
 geometry:'Actual Chromium target rectangles/scrollIntoView at 1440x900; straight-line pointer travel, not human path lengths',
 objective:'Lexicographic completion then clicks + keys/20 + mouseTravelPx/1000 + scrollPx/1000',
 publication:'none; sandbox never acquires certification from its backing program',codexCalls:proposals.calls,serviceTier:proposals.serviceTier});
try{await read(path.join(out,'metric-definition.json'));}catch(error){
 if(error.code!=='ENOENT')throw error;
 await write(path.join(out,'metric-definition.json'),{version:3,declaredAt:new Date().toISOString(),beforeHeldout:true,
  keys:'entered text for both devices + one keyboard activation; palette clicks = comp ID length + 2; confirmations/acknowledgments = one activation',geometry:'Unique DOM scrolling elements including patient-pane root; document counted once'});
}
const lab=await startLab();
const geometryCache=new Map();const rows=[],archive={},rejections=[];
if(priorReport)rejections.push(...priorReport.rejections);
const canonical=exotic({op:'canonical'});
const fixtureAgree=JSON.parse(execFileSync('lean/.lake/build/bin/exotic-api',{input:JSON.stringify({op:'canonical'})+'\n',encoding:'utf8'}));
if(JSON.stringify(fixtureAgree)!==JSON.stringify(canonical))throw Error('Native/WASM canonical disagreement');
await write(path.join(out,'agreement.json'),{canonical:true,root:'Ehr.Sem.ExoticApi'});
async function evaluate(candidate,id,split) {
 const program=expandProgram(candidate.program);
 if(program.patientSelection!==true)throw Error("Expected the unchanged patient-selection program");
 const mode=modeOf(candidate),people=cohort.filter(p=>p.split===split).slice(0,smoke?1:undefined),memberRows=[];

 const inputFor=(scenario,facts,state)=>({spec,program,facts,display:scenario.display,user:{id:program.owner,role:'physician'},state});
 const boardOthers=new Map(scenarios[split].map(other=>{
   const facts=other.segments[0].facts;
   const state=boundInitial(call,{spec,program,facts,display:other.display,user:{id:program.owner,role:'physician'}});
   return [other.patient,exotic({op:'render',render:inputFor(other,facts,state)}).screen];
 }));
 const step=(input,event)=>call('ehr_step_envelope',{...input,event});
 const runMember=async physician=>{
  // Complete saved members are replay-independent checkpoints. Preserve their
  // measured geometry and recompute the declared typing proxy from raw events.
  const saved=[];
  try{for(const scenario of scenarios[split])saved.push(await read(path.join(out,'cohort',id,split,physician.id,`${scenario.id}.json`)));}
  catch(error){if(error.code!=='ENOENT')throw error;}
  if(saved.length===scenarios[split].length){
   if(saved.some(row=>row.evaluationVersion!==3))throw Error('Refusing pre-bound clinical-core checkpoints');
   if(saved.some(row=>row.geometryVersion!==3))throw Error('Geometry protocol mismatch');
   const tasks=saved.map(row=>({...row.metric,keys:row.trace.reduce((n,t)=>n+typingCost(t.event,t.device==='keyboard',mode==='command'&&t.phase!=='selection'),0)}));
   const totals=sumTasks(tasks),completed=tasks.filter(t=>t.completed).length;
   memberRows.push({physician:physician.id,tasks:tasks.length,completed,...totals,effort:totals.clicks+totals.keys/20+totals.mouseTravelPx/1000+totals.scrollPx/1000});
   process.stderr.write(`[round2 resume] ${id}/${split}/${physician.id}\n`);return;
  }
  const page=await lab.browser.newPage({viewport:{width:1440,height:900}});await page.goto(mode?lab.url:lab.stockUrl);
  const picker=mode?await lab.browser.newPage({viewport:{width:1440,height:900}}):page;if(mode)await picker.goto(lab.stockUrl);
  try {
   const policy=new PhysicianDecision(model,physician);const tasks=[];
   for(const scenario of scenarios[split]) {
    const metric={task:scenario.id,completed:true,actions:0,clicks:0,keys:0,mouseTravelPx:0,scrollPx:0,backtracks:0,missingGeometry:0,blocked:0};
    let previous=[0,0];const trace=[];
    for(const [episode,segment]of scenario.segments.entries()) {
     const facts=segment.facts;
     let state=call('ehr_init_envelope',{spec,program,facts,user:{id:program.owner,role:'physician'}});
     let done=false;
     for(let fuel=0;fuel<450;fuel++) {
      let input=inputFor(scenario,facts,state);
      const hydrate=hydrationEvent(input);
      if(hydrate){const r=step(input,hydrate);state=r.state;input=inputFor(scenario,facts,state);trace.push({episode,phase:'hydration',event:hydrate,result:r.result,stateScreen:state.screen,device:'host',geometry:{mouseTravelPx:0,scrollPx:0,position:previous,missing:false},choice:null,prediction:null});}
      const envelope=exotic({op:'render',render:input}),s=envelope.screen;
      const selecting=!patientBound(input);
      const workspace=selecting?workspaceChoice(input,s):null;
      const options=selecting?{done:false,events:[workspace.event],problems:[]}:exotic({op:'choices',render:input,task:scenario.task,episode});
      if(options.done){done=true;break;}
      if(!options.events.length){metric.reason=options.problems;break;}
      const cs=atoms([...s.workspace,...s.side,...(s.modal?[s.modal]:[])]);
      const label=e=>{const v=Object.values(e)[0];return cs.find(n=>Object.values(n)[0].comp===(v.comp??v.alert))?.[Object.keys(cs.find(n=>Object.values(n)[0].comp===(v.comp??v.alert))??{})[0]]?.label??Object.keys(e)[0];};
      const offers=options.events.slice(0,9).map((event,i)=>({id:`a${i}`,label:workspace?.label??label(event),event}));
      const nav=s.modal||selecting?[]:s.nav.flatMap(([,pairs])=>pairs).filter(([id])=>!id.startsWith('workspace.'));
      if(nav.length&&policy.random()<.3) {
       const [comp,caption]=nav[Math.floor(policy.random()*nav.length)];
       if(!offers.some(o=>o.event.click?.comp===comp))offers.push({id:'detour',label:`Reinspect ${caption}`,event:{click:{comp}}});
      }
      // No recorded next event, patient identity or future outcome enters the model.
      const prediction=await policy.choice({state:{screen:s.title,slot:state.currentSlot,mode:mode??candidate.point.layout},
       options:offers.map(o=>({...o,event:{kind:Object.keys(o.event)[0],comp:Object.values(o.event)[0]?.comp}}))});
      const choice=policy.sample(prediction),event=offers.find(o=>o.id===choice).event;
      const keyboard=policy.random()<physician.keyboardShare;
      const view=mode&&!selecting?{mode,panes:[{patient:scenario.patient,screen:s},...(mode==='board'?scenarios[split].filter(x=>x.patient!==scenario.patient).map(other=>({patient:other.patient,screen:boardOthers.get(other.patient)})):[])],...(mode==='dated'?{axis:sourceAxis(s)}:{})}:null;
      const target=Object.values(event)[0]?.comp??Object.values(event)[0]?.alert;
      const key=digest({s,mode,target,keyboard});
      const currentPage=selecting?picker:page;
      if(mode&&!selecting)await paint(currentPage,view);else await currentPage.evaluate(screen=>window.renderUi(screen),s);
      const geo=await measureEvent(currentPage,{patient:scenario.patient,event,keyboard,previous});
      geometryCache.set(key,geo);
      if(split==='search'&&physician===people[0]&&fuel===0&&episode===0) {
        const shot=path.join(out,'screenshots',`${id}-${scenario.id}-1440.png`);await mkdir(path.dirname(shot),{recursive:true});await page.screenshot({path:shot,fullPage:false});
      }
      metric.mouseTravelPx+=geo.mouseTravelPx;
      if(!keyboard)previous=geo.position;
      metric.scrollPx+=geo.scrollPx;metric.missingGeometry+=Number(geo.missing);
      if(fuel%100===0)process.stderr.write(`[round2 progress] ${id}/${split}/${physician.id}/${scenario.id} step=${fuel} screen=${s.title}\n`);
      metric.actions++;metric.clicks+=Number(!keyboard);metric.keys+=typingCost(event,keyboard,mode==='command'&&!selecting);
      metric.backtracks+=Number(choice==='detour');
      state={...state,clock:state.clock+10};
      const result=step({...input,state},event);state=result.state;metric.blocked+=Number(typeof result.result==='object'&&'blocked'in result.result);
      trace.push({episode,phase:selecting?'selection':'clinical',event,result:result.result,stateScreen:state.screen,device:keyboard?'keyboard':'mouse',geometry:geo,choice,prediction});
     }
     metric.completed&&=done;
    }
    tasks.push(metric);policy.experience++;
    await write(path.join(out,'cohort',id,split,physician.id,`${scenario.id}.json`),{physician,metric,trace,geometryVersion:3,evaluationVersion:3,provenance:'simulator-generated; not human'});
   }
   const totals=sumTasks(tasks);
   const completed=tasks.filter(t=>t.completed).length;
   memberRows.push({physician:physician.id,tasks:tasks.length,completed,...totals,effort:totals.clicks+totals.keys/20+totals.mouseTravelPx/1000+totals.scrollPx/1000});
   cacheFlush=cacheFlush.then(()=>write(path.join(out,'decision-cache.json'),{calls:model.calls,rows:model.rows}));await cacheFlush;
   process.stderr.write(`[round2 ${id}/${split}] ${physician.id}: ${completed}/${tasks.length}; model calls=${model.calls}\n`);
  }finally{if(picker!==page)await picker.close();await page.close();}
 };
 // Three isolated pages bound CPU/memory and share only a frozen model cache.
 for(let start=0;start<people.length;start+=3){
  const settled=await Promise.allSettled(people.slice(start,start+3).map(runMember));
  const failed=settled.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
 }
 memberRows.sort((a,b)=>a.physician.localeCompare(b.physician));
 const summary={members:memberRows,completion:spread(memberRows.map(r=>r.completed/r.tasks)),effort:spread(memberRows.map(r=>r.effort/r.tasks)),mouseTravelPx:spread(memberRows.map(r=>r.mouseTravelPx/r.tasks)),scrollPx:spread(memberRows.map(r=>r.scrollPx/r.tasks)),missingGeometry:memberRows.reduce((n,r)=>n+r.missingGeometry,0)};
 await write(path.join(out,'evaluation',`${id}-${split}.json`),summary);return summary;
}
try {
 for(const proposal of (smoke?proposals.results.filter(p=>p.candidate.point.tier==='sandbox').slice(0,1):proposals.results)) {
  const {id,candidate}=proposal;
  if(proposal.rejection)rejections.push({id,stage:'operator',reason:proposal.rejection});
  const row={id,point:candidate.point,niche:niche(candidate.point),origin:proposal.origin,tier:candidate.point.tier,certified:false};
  try {
   validateCandidate(candidate,baseline,spec);
   row.leanVerdict=await ehr.check({specVersion:'v1',program:candidate.program,prev:baseline,canonical:baseline});
   if(row.leanVerdict!=='ok')throw Error(`Lean rejected ${JSON.stringify(row.leanVerdict)}`);
   if(candidate.point.tier!=='sandbox') {
    row.screen=await screen.check({specVersion:'v1',program:candidate.program});
    if(row.screen.status!=='pass')throw Error(`Screen rejected ${row.screen.message}`);
    row.certified=true;
   }else row.missingProofs=modeOf(candidate)==='board'?['Scoped session state-update simulation and patient/encounter/version-bound receipt refinement','Cross-patient urgency over all moments','Typed UiNode constructor, all traversals and whole-version gate integration']:['Typed UiNode constructor and ordinary program opt-in','Focus/scroll/pin/axis transition simulation and measured exposure bounds','Whole-version independent gate coverage; canonical samples alone do not admit a primitive'];
   const native=await ehr.simulate({specVersion:'v1',program:candidate.program,persona:await read('runs/world/2/personas/P2.json'),schedule:{...schedules.search,tasks:scenarios.search.map(s=>s.task)},worldDir:path.resolve('runs/world/2'),seed:700});
   row.nativeReference=native.tasks;await write(path.join(out,'native',`${id}.json`),native);
   row.search=await evaluate(candidate,id,'search');
   if(row.search.missingGeometry)throw Error('Missing measured target geometry');
   for(const rejection of rejections.filter(r=>r.id===id&&r.stage==='browser-infrastructure'))rejection.resolution='Repaired: renderer sources frozen, HMR disabled; complete members resumed and unfinished members rerun from their seeds';
   const previous=archive[row.niche];
   if(!previous||row.search.completion.mean>previous.search.completion.mean||row.search.completion.mean===previous.search.completion.mean&&row.search.effort.mean<previous.search.effort.mean)archive[row.niche]=row;
  }catch(error){row.rejection=String(error);rejections.push({id,reason:String(error)});}
  rows.push(row);await write(path.join(out,'round2-report.json'),{phase:'search',rows,archive,rejections,codexCalls:proposals.calls});
 }
 // This immutable manifest is written BEFORE the first held-out choice request.
 await write(path.join(out,'frozen-archive.json'),{ids:Object.values(archive).map(r=>r.id),searchOnly:true,selectionHash:digest(Object.values(archive).map(r=>({id:r.id,search:r.search}))),time:new Date().toISOString()});
 for(const row of Object.values(archive)) {
  row.heldout=await evaluate(proposals.results.find(p=>p.id===row.id).candidate,row.id,'heldout');
  await write(path.join(out,'round2-report.json'),{phase:'heldout',rows,archive,rejections,codexCalls:proposals.calls});
 }
 await write(path.join(out,'round2-report.json'),{phase:'complete',rows,archive,rejections,codexCalls:proposals.calls,modelCalls:model.calls,geometryStates:geometryCache.size,importedModelScores:importedModelRows,newModelRequests:model.calls-importedModelRows});
 console.log(JSON.stringify({out,niches:Object.keys(archive).length,modelCalls:model.calls}));
}finally{await lab.close();}
