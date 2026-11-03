/** Explicit continuation/recheck of a stopped research run. Never deployment. */
import {readFile,open,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {createBackend} from '../agent/src/backends/index.js';
import {createEhr} from '../agent/src/ehr.js';
import {createScreenChecker} from '../agent/src/screencheck.js';
import {programSchema,specSchema,personaParamsSchema,dayScheduleSchema,jsonPatchOpSchema} from '../agent/src/schema.js';
import {generate} from './generator.js';
import {applyPatch} from '../agent/src/jsonpatch.js';
import {programHash} from '../agent/src/program.js';
import {seedPoints} from './design.js';
import {Archive,type Evaluation} from './archive.js';
import {LlmOperator} from './operators.js';
import {makeEvaluator,write} from './evaluate.js';
import {bindTasks} from './bindings.js';
import {provenance} from './provenance.js';
const args=process.argv.slice(2),arg=(key:string,fallback:string)=>{const i=args.indexOf(`--${key}`);return i<0?fallback:args[i+1]??fallback;};
const out=path.resolve(arg('run','runs/explore-ed-first'));
if(!out.startsWith(path.resolve('runs')+path.sep))throw Error('Expected ignored run path');
if(existsSync(path.join(out,'.search.lock')))throw Error('Search is still running');
const lock=await open(path.join(out,'.review.lock'),'wx');
const read=async(p:string):Promise<unknown>=>JSON.parse(await readFile(p,'utf8'));
interface Report {context:{worldDir:string;days:number[];[key:string]:unknown};llmCalls:number;evaluations:Evaluation[];events:unknown[];archive:Record<string,Evaluation>;[k:string]:unknown;}
try{
 const report=await read(path.join(out,'report.json')) as Report;
 if(report.context.worldDir!==path.resolve('runs/world/2'))throw Error('This review CLI currently supports the initial world/2 ED protocol');
 const baseline=programSchema.parse(await read('releases/v1/personas/P2.json')),spec=specSchema.parse(await read('releases/v1/spec.json'));
 const persona=personaParamsSchema.parse(await read(path.join(report.context.worldDir,'personas/P2.json')));
 const schedules=await Promise.all(report.context.days.map(async day=>{const s=dayScheduleSchema.parse(await read(path.join(report.context.worldDir,`schedules/day-${String(day).padStart(2,'0')}/P2.json`)));return {...s,tasks:s.tasks.filter(t=>t.workflow==='W3')};}));
 const ehr=createEhr({binary:process.env['EHR_BIN']??path.resolve('lean/.lake/build/bin/ehr')});
 const screen=createScreenChecker(ehr,{artifactsDir:path.join(out,'screens'),cacheDir:path.resolve('runs/explore-screen-cache')});
 const evaluate=makeEvaluator({ehr,screen,baseline,spec,workload:{department:'ED',role:'physician',worldDir:report.context.worldDir,persona,schedules},out});
 const add=arg('add-layout','');
 if(add){
  const point=seedPoints().find(p=>p.layout===add);if(!point)throw Error('Choose stack, columns, document or timeline');
  const backend=arg('backend','codex');if(!['codex','claude','none'].includes(backend))throw Error('Invalid backend');
  const id=`candidate-${String(Math.max(0,...report.evaluations.map(e=>Number(e.id.replace('candidate-',''))))+1).padStart(3,'0')}`;
  let c=generate(point,['W3'],baseline,spec);
  if(backend!=='none'){
   const attempts=report.events.filter(e=>(e as {kind?:string}).kind==='llm-attempt').length;
   if(Math.max(report.llmCalls,attempts)>=60)throw Error('Shared run LLM call budget exhausted');
   report.llmCalls=Math.max(report.llmCalls,attempts)+1;
   report.events.push({id,kind:'llm-attempt',call:report.llmCalls,continuation:true});
   await write(path.join(out,'report.json'),report);
   const operator=new LlmOperator(createBackend(backend as 'codex'|'claude',{serviceTier:'default'}),1);
   const result=await operator.propose(c,baseline,spec,{feedback:arg('feedback','Preserve complete historical record rows; use the supplied admitted layout. Prior renderer failure is retained in the report.'),previous:report.evaluations.filter(e=>e.candidate.point.layout===add).map(e=>({status:e.status,evidence:e.evidence}))},true);
   await write(path.join(out,'llm',`${id}.json`),result.record);c=result.candidate;
  }
  const result=await evaluate(c,id);report.evaluations.push(result);
  report.events.push({id,kind:'continuation-evaluation',status:result.status});
 }else if(arg('repair','')){
  const parent=report.evaluations.find(e=>e.id===arg('repair',''));if(!parent)throw Error('Unknown repair parent');
  const patchFile=arg('patch','');if(!patchFile)throw Error('Provide an explicit data-only JSON patch file');
  const ops=(await read(patchFile) as unknown[]).map(x=>jsonPatchOpSchema.parse(x));
  const c=structuredClone(parent.candidate);c.program=programSchema.parse(applyPatch(c.program,ops).doc);
  c.taskMapping=bindTasks(c.program,c.workflows,c.point);
  const id=`candidate-${String(Math.max(...report.evaluations.map(e=>Number(e.id.replace('candidate-',''))))+1).padStart(3,'0')}`;
  await write(path.join(out,'operators',`${id}.json`),{operator:'explicit-json-repair',parent:parent.id,parentProgramSha256:programHash(parent.candidate.program),patch:ops});
  const result=await evaluate(c,id);report.evaluations.push(result);
  report.events.push({id,kind:'explicit-repair',parent:parent.id,status:result.status});
 }else if(args.includes('--recheck')){
  const checks=[];
  for(const entry of report.evaluations.filter(e=>e.status==='accepted')){
   entry.candidate.taskMapping=bindTasks(entry.candidate.program,entry.candidate.workflows,entry.candidate.point);
   const result=await evaluate(entry.candidate,entry.id);
   checks.push({id:entry.id,status:result.status,metrics:result.metrics});
   Object.assign(entry,result);
  }
  report['finalRecheck']={source:await provenance(),checks};
  // Early runs hashed decoded binary text; the final byte digest is authoritative.
  report.context['ehrSha256']=(await import('node:crypto')).createHash('sha256').update(await readFile(ehr.binary!)).digest('hex');
  await write(path.join(out,'context-final.json'),report.context);
 }else throw Error('Use --add-layout <layout>, --repair <id> --patch <file>, or --recheck');
 const archive=new Archive();for(const e of report.evaluations)archive.insert(e);
 report.archive=archive.json();report['attemptedLlmCalls']=report.events.filter(e=>(e as {kind?:string}).kind==='llm-attempt').length;
 report['lastReviewSource']=await provenance();await write(path.join(out,'report.json'),report);
 console.log(JSON.stringify({llmCalls:report.llmCalls,niches:archive.cells.size,statuses:report.evaluations.map(e=>[e.id,e.status])}));
}finally{await lock.close();await unlink(path.join(out,'.review.lock'));}
