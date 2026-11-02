import path from 'node:path';
import { Archive, type Evaluation } from './archive.js';
import { generate, validateCandidate, type Candidate } from './generator.js';
import { seedPoints, type Workflow } from './design.js';
import { LlmOperator } from './operators.js';
import type { Program, Spec } from '../agent/src/schema.js';
import type { DecisionModel } from './decision.js';
import { write } from './evaluate.js';
export async function search(opts:{baseline:Program;spec:Spec;workflows:Workflow[];operator?:LlmOperator;
  evaluate:(c:Candidate,id:string)=>Promise<Evaluation>;out:string;iterations:number;decision:DecisionModel;context:unknown;lookahead?:number}){
  const archive=new Archive(),evaluations:Evaluation[]=[],events:unknown[]=[];
  const seeds=seedPoints(),lookahead=opts.lookahead??1;
  if(!Number.isInteger(lookahead)||lookahead<1||lookahead>8)throw Error('Lookahead must be 1–8');
  const flush=()=>write(path.join(opts.out,'report.json'),{schemaVersion:1,context:opts.context,
    llmCalls:opts.operator?.calls??0,attemptedLlmCalls:events.filter(e=>(e as {kind:string}).kind==='llm-attempt').length,
    objective:'completion fraction, then -(clicks + scrolls + keystrokes/20)/tasks',
    archive:archive.json(),evaluations,events});
  for(let start=0;start<opts.iterations;start+=lookahead){
    const queue:{candidate:Candidate;id:string;rank:number}[]=[];
    for(let i=start;i<Math.min(start+lookahead,opts.iterations);i++){
      const id=`candidate-${String(i+1).padStart(3,'0')}`;
      let candidate= i<seeds.length?generate(seeds[i]!,opts.workflows,opts.baseline,opts.spec):
        structuredClone(archive.parent(i)?.candidate??generate(seeds[i%seeds.length]!,opts.workflows,opts.baseline,opts.spec));
      if(opts.operator&&opts.operator.calls<opts.operator.limit){
        events.push({id,kind:'llm-attempt',call:opts.operator.calls+1});await flush();
        try{
          const result=await opts.operator.propose(candidate,opts.baseline,opts.spec,
            {workload:opts.context,archive:[...archive.cells.keys()],recent:evaluations.slice(-4).map(e=>({point:e.candidate.point,status:e.status,metrics:e.metrics,evidence:e.evidence}))},i<seeds.length);
          await write(path.join(opts.out,'llm',`${id}.json`),result.record);candidate=result.candidate;
        }catch(error){
          events.push({id,kind:'operator-error',error:String(error)});
          const detail=error as {transcript?:unknown;audit?:unknown};
          await write(path.join(opts.out,'llm',`${id}-error.json`),{error:String(error),transcript:detail.transcript,audit:detail.audit});
          await flush();continue;
        }
      }
      try{validateCandidate(candidate,opts.baseline,opts.spec);}
      catch(error){evaluations.push({id,candidate,status:'static-rejected',evidence:{error:String(error)}});await flush();continue;}
      // Surrogates rank the pending batch only. No prediction is certification evidence.
      let rank=0;
      try{
        const prediction=await opts.decision.screen({point:candidate.point,
          programFeatures:[candidate.program.screens.length],context:{workload:opts.context,program:candidate.program}});
        rank=prediction.pass*prediction.improvement;
        events.push({id,kind:'screen-prediction',prediction});
      }catch(error){events.push({id,kind:'surrogate-error',error:String(error)});}
      queue.push({candidate,id,rank});
    }
    queue.sort((a,b)=>b.rank-a.rank);
    for(const {candidate,id} of queue){
      const evaluation=await opts.evaluate(candidate,id);evaluations.push(evaluation);
      const inserted=archive.insert(evaluation);events.push({id,kind:'archive',inserted});
      process.stderr.write(`[explore] ${id}: ${evaluation.status}; niches=${archive.cells.size}\n`);await flush();
    }
  }
  await flush();return archive;
}
