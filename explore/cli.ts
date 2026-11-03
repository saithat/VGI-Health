import { readFile, mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createBackend } from '../agent/src/backends/index.js';
import { createEhr } from '../agent/src/ehr.js';
import { createScreenChecker } from '../agent/src/screencheck.js';
import { programSchema,specSchema,personaParamsSchema,dayScheduleSchema } from '../agent/src/schema.js';
import { programHash, sha256 } from '../agent/src/program.js';
import { DeterministicDecision, LocalDecision, TabPFNScreen } from './decision.js';
import { LlmOperator } from './operators.js';
import { makeEvaluator,write } from './evaluate.js';
import { search } from './search.js';
import { taskContract } from './tasks.js';
import { externalRendererGate } from './renderer.js';
import { provenance } from './provenance.js';
const args=process.argv.slice(2);
const arg=(key:string,fallback:string)=>{const n=args.indexOf(`--${key}`);return n<0?fallback:args[n+1]??fallback;};
const out=path.resolve(arg('out','runs/explore-ed-first'));
if(!out.startsWith(path.resolve('runs')+path.sep))throw Error('Exploration data must be under ignored runs/');
const backend=arg('backend','codex');
if(!['codex','claude','none'].includes(backend))throw Error('Backend must be codex, claude or none');
const budget=Number(arg('budget','4')),iterations=Number(arg('iterations','4'));
if(!Number.isInteger(budget)||budget<0||budget>60||!Number.isInteger(iterations)||iterations<1||iterations>60)throw Error('Invalid budget/iterations (1–60)');
const binary=process.env['EHR_BIN']??path.resolve('lean/.lake/build/bin/ehr');
const read=async(file:string):Promise<unknown>=>JSON.parse(await readFile(file,'utf8'));
const baseline=programSchema.parse(await read('releases/v1/personas/P2.json'));
const spec=specSchema.parse(await read('releases/v1/spec.json'));
const worldDir=path.resolve(arg('world','runs/world/2'));
const persona=personaParamsSchema.parse(await read(path.join(worldDir,'personas/P2.json')));
const days=arg('days','1,2').split(',').map(Number);
if(days.some(d=>!Number.isInteger(d)||d<1||d>3))throw Error('Initial v1 exploration supports days 1–3 only');
const schedules=await Promise.all(days.map(async day=>{
  const s=dayScheduleSchema.parse(await read(path.join(worldDir,`schedules/day-${String(day).padStart(2,'0')}/P2.json`)));
  return {...s,tasks:s.tasks.filter(t=>t.workflow==='W3')};}));
// mkdir without recursive is an exclusive run claim: accidental reruns cannot reset the call budget.
await mkdir(path.dirname(out),{recursive:true});await mkdir(out);
const ehr=createEhr({binary});
const screen=createScreenChecker(ehr,{artifactsDir:path.join(out,'screens'),cacheDir:path.resolve('runs/explore-screen-cache')});
const endpoint=arg('decision-endpoint','');
if(!['deterministic','local','tabpfn'].includes(arg('decision','deterministic')))throw Error('Unknown decision backend');
if(!['distribution','token-logprobs'].includes(arg('decision-protocol','distribution')))throw Error('Unknown decision protocol');
const decision=arg('decision','deterministic')==='tabpfn'?new TabPFNScreen(endpoint):endpoint?
  new LocalDecision(endpoint,arg('decision-model','HuggingFaceTB/SmolLM2-135M-Instruct'),arg('decision-protocol','distribution') as 'distribution'|'token-logprobs'):new DeterministicDecision();
const context={department:'ED',role:'physician',workflows:['W3'],release:'v1',days,
  policy:'P2 deterministic synthetic policy; not human or a sampled department population',worldDir,
  workloadSummary:{tasks:schedules.reduce((n,s)=>n+s.tasks.length,0),patients:new Set(schedules.flatMap(s=>s.tasks.map(t=>t.patientId))).size,orderLines:schedules.flatMap(s=>s.tasks).reduce((n,t)=>n+t.choices.orders.length,0)},
  baselineSha256:programHash(baseline),specSha256:sha256(await readFile('releases/v1/spec.json','utf8')),
  ehrSha256:(await import('node:crypto')).createHash('sha256').update(await readFile(binary)).digest('hex'),build:await read('app/dist/build.json'),
  source:await provenance(),publication:'none; reviewed slow-cadence release only',screenViewports:[[1440,900],[390,844]],budget};
await write(path.join(out,'context.json'),context);await write(path.join(out,'tasks.json'),taskContract(spec,baseline,['W3']));
const rendererScript=arg('renderer-gate','');
const operator=backend==='none'?undefined:new LlmOperator(createBackend(backend as 'codex'|'claude',{serviceTier:'default'}),budget);
const lock=await open(path.join(out,'.search.lock'),'wx');
try { await search({baseline,spec,workflows:['W3'],...(operator?{operator}:{}),
  evaluate:makeEvaluator({ehr,screen,baseline,spec,workload:{department:'ED',role:'physician',worldDir,persona,schedules},out,
    ...(rendererScript?{checkedRenderer:externalRendererGate(ehr,path.resolve(rendererScript),arg('renderer-bundles','fixtures/synthea/Ashly_Rippin_149fcc1f.json').split(','))}:{})}),
  out,iterations,decision,context,lookahead:Number(arg('lookahead','1'))});
} finally { await lock.close();await unlink(path.join(out,'.search.lock')); }
