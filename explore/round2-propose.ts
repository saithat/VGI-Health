import path from 'node:path';
import { readFile, open } from 'node:fs/promises';
import { createBackend } from '../agent/src/backends/index.js';
import { programSchema, specSchema } from '../agent/src/schema.js';
import { LlmOperator } from './operators.js';
import { generate, validateCandidate } from './generator.js';
import { defaultPoint, type DesignPoint } from './design.js';
import { write } from './evaluate.js';
import { stableStringify } from '../agent/src/program.js';
const out=path.resolve(process.argv[2]??'runs/explore-round2');
if(!out.startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const claim=await open(path.join(out,'proposal-budget.json'),'wx');
await claim.writeFile(JSON.stringify({limit:8,serviceTier:'default',maximumAttempts:8}));await claim.close();
const baseline=programSchema.parse(JSON.parse(await readFile('releases/v1/personas/P2.json','utf8')));
const spec=specSchema.parse(JSON.parse(await readFile('releases/v1/spec.json','utf8')));
const points:DesignPoint[]=[
 ...(['stack','columns','document','timeline'] as const).map(layout=>({...defaultPoint,layout,temporalView:layout==='timeline'?'longitudinal' as const:'encounter' as const})),
 {...defaultPoint,tier:'sandbox',navigation:'command',input:'keyboard'},
 {...defaultPoint,tier:'sandbox',layout:'spatial'},
 {...defaultPoint,tier:'sandbox',layout:'board',patientScope:'multi'},
 {...defaultPoint,tier:'sandbox',layout:'timeline',temporalView:'aligned'},
];
const operator=new LlmOperator(createBackend('codex',{serviceTier:'default'}),8);
const results=[];
for(const [i,point]of points.entries()){
 const id=`r2-${String(i+1).padStart(3,'0')}`;
 const seed=generate(point,['W3'],baseline,spec);
 await write(path.join(out,'proposal-progress.json'),{attempts:i+1,limit:8,serviceTier:'default'});
 try{
  const result=await operator.propose(seed,baseline,spec,{round:2,requestedPoint:point,
   instruction:'Keep the requested dimensions exactly. One clinical program underlies the research painter. For exotic niches preserve the baseline allocation: the trusted sandbox painter supplies command/spatial/board/dated interactions. For document use noteSummary only; historical records retain presentation. Preserve the strict identity movement budget.'},true);
  await write(path.join(out,'operators',`${id}.json`),result.record);
  if(stableStringify(result.candidate.point)!==stableStringify(point))throw Error('Requested niche changed');
  validateCandidate(result.candidate,baseline,spec);
  results.push({id,candidate:result.candidate,origin:'codex-default'});
 }catch(error){
  const detail=error as {transcript?:unknown;audit?:unknown};
  await write(path.join(out,'operators',`${id}-rejected.json`),{reason:String(error),transcript:detail.transcript,audit:detail.audit});
  results.push({id,candidate:seed,origin:'compiler-seed-after-rejected-proposal',rejection:String(error)});
 }
 await write(path.join(out,'proposals.json'),{calls:operator.calls,limit:8,serviceTier:'default',results});
 process.stderr.write(`[round2 proposal] ${id} ${results.at(-1)!.origin}\n`);
}
