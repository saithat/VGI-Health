/** Offline MAP-Elites: no release or relearning objective. The evaluator owns
 * native/screen admission and train-only simulation. Nothing here deploys. */
import { structuralDistance } from './structure.js';
import { Archive, type Evaluation } from './archive.js';
import { describeProgram, generate, validateCandidate, type Candidate } from './generator.js';
import { movePlacement, placementVariants } from './placements.js';
import { kindTag } from '../agent/src/program.js';
import { seedPoints, type Workflow } from './design.js';
import type { Program, Spec } from '../agent/src/schema.js';

/** Extend this operator interface when the UI library gains structural kinds. */
export interface StructuralOperator {
  id: string;
  enumerate(parent:Program,spec:Spec,workflows:Workflow[]): Candidate[];
}
export const placementOperator:StructuralOperator={id:'placement-v1',enumerate(parent,spec,workflows) {
  const candidates=placementVariants(parent,spec,workflows).map(v=>v.candidate);
  // Cross-screen relocation is proposed, never presumed legal. Banners, clinical
  // gates and reachability remain the independent evaluator's responsibility.
  for(const source of parent.screens.filter(s=>workflows.includes(s.workflow as Workflow))) {
    for(const component of source.components.filter(c=>!c.parent&&['group','panel','table','trend'].includes(kindTag(c.kind)))) {
      for(const target of parent.screens.filter(s=>s.workflow===source.workflow&&s.id!==source.id)) {
        try {candidates.push(movePlacement(parent,spec,workflows,{component:component.id,screen:target.id,tab:0}));}
        catch { /* cycle/identity budget/static contract refusal */ }
      }
    }
  }
  return candidates;
}};
export const layoutOperator:StructuralOperator={id:'admitted-layout-v1',enumerate(parent,spec,workflows) {
  return seedPoints().flatMap(point=>{
    try{return [generate(point,workflows,parent,spec)];}catch{return [];}
  });
}};
export interface OfflineSearchOptions {
  baseline:Program;spec:Spec;workflows:Workflow[];iterations:number;
  operators?:readonly StructuralOperator[];
  noveltyWeight?:number;
  /** Must return native/screen evidence. Quality is recomputed here without any
   * online switching penalty, even if the adapter supplies one. */
  evaluate(candidate:Candidate,id:string):Promise<Evaluation>;
}
export async function offlineMapElites(opts:OfflineSearchOptions) {
  if(!Number.isSafeInteger(opts.iterations)||opts.iterations<1)throw Error('Positive offline iteration budget required');
  const archive=new Archive(),evaluations:Evaluation[]=[],seen=new Set<string>();
  const operators=opts.operators??[placementOperator,layoutOperator];
  if(!operators.length)throw Error('At least one structural operator required');
  const noveltyWeight=opts.noveltyWeight??0.25;
  if(!Number.isFinite(noveltyWeight)||noveltyWeight<0)throw Error('Invalid novelty weight');
  let pending:Candidate[]=[];
  for(let iteration=0;iteration<opts.iterations;iteration++) {
    if(!pending.length) {
      const parent=archive.parent(iteration)?.candidate.program??opts.baseline;
      pending=operators.flatMap(op=>op.enumerate(structuredClone(parent),opts.spec,opts.workflows))
        .filter(c=>!seen.has(JSON.stringify({...c.program,version:0})));
      pending.sort((a,b)=>archive.explorationRank(b,opts.baseline,0,noveltyWeight)-archive.explorationRank(a,opts.baseline,0,noveltyWeight));
    }
    const candidate=pending.shift();if(!candidate)break;
    const key=JSON.stringify({...candidate.program,version:0});if(seen.has(key)){iteration--;continue;}seen.add(key);
    const id=`offline-${iteration+1}`;
    try{validateCandidate(candidate,opts.baseline,opts.spec);}
    catch(error){evaluations.push({id,candidate,status:'static-rejected',evidence:{error:String(error)}});continue;}
    const result=await opts.evaluate(candidate,id);
    // An adapter cannot substitute a different candidate under supplied evidence.
    if(JSON.stringify(result.candidate)!==JSON.stringify(candidate))throw Error('Offline evaluator substituted candidate');
    if(result.status==='accepted'&&result.evidence.leanVerdict!=='ok')result.status='lean-rejected';
    if(result.status==='accepted'&&result.evidence.screenStatus!=='pass')result.status='screen-rejected';
    const m=result.metrics;
    const evaluation:Evaluation={...result,descriptor:`screens-${candidate.program.screens.length}/distance-${Math.floor(structuralDistance(opts.baseline,candidate.program)*10)}`,quality:m&&m.tasks>0?-(m.clicks+m.scrolls+m.keystrokes/20)/m.tasks:-Infinity,
      evidence:{...result.evidence,objective:'offline-effort-no-relearning-v1',switchCost:0}};
    evaluations.push(evaluation);archive.insert(evaluation);
  }
  return {archive,evaluations,programs:[...archive.cells.values()].map(e=>e.candidate.program),
    baseline:describeProgram(opts.baseline,opts.workflows).point,objective:'offline-effort-no-relearning-v1' as const};
}
