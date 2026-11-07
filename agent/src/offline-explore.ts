/** Native adapter for the offline structural-search hook. No model calls,
 * deployment, held-out tasks, carried actor memory or relearning penalty. */
import path from 'node:path';
import { offlineMapElites, type StructuralOperator } from '../../explore/offline.js';
import type { Evaluation } from '../../explore/archive.js';
import { validateCandidate } from '../../explore/generator.js';
import { assertTrain } from './online-context.js';
import { daySeed, type LoopDeps, type NightInput } from './night.js';
import { trainEstimateWindow } from './protocol.js';
import { retryScreens } from './retry-boundaries.js';
import { sumMetrics } from './observe.js';
import { writeJson } from './util.js';

export async function runOfflineExploration(deps:LoopDeps,input:NightInput,options:{out:string;iterations:number;operators?:readonly StructuralOperator[];noveltyWeight?:number}) {
  assertTrain(input);
  const train=trainEstimateWindow(input.train);
  if(!train.length)throw Error('Offline exploration requires train tasks');
  const workflows=[...new Set(train.flatMap(d=>d.schedule.tasks.map(t=>t.workflow)))];
  const result=await offlineMapElites({baseline:input.current,spec:input.release.spec,workflows,iterations:options.iterations,
    ...(options.operators?{operators:options.operators}:{}),...(options.noveltyWeight!==undefined?{noveltyWeight:options.noveltyWeight}:{}),
    async evaluate(candidate,id):Promise<Evaluation> {
      validateCandidate(candidate,input.current,input.release.spec);
      const evidence:Evaluation['evidence']={trainDays:train.map(d=>d.schedule.day),policy:'expert',memory:'none',switchCost:0};
      const verdict=await deps.ehr.check({specVersion:input.release.specVersion,program:candidate.program,prev:input.current,canonical:input.release.canonical});
      evidence.leanVerdict=verdict;
      if(verdict!=='ok')return {id,candidate,status:'lean-rejected',evidence};
      const screen=await retryScreens(deps.screens).check({specVersion:input.release.specVersion,program:candidate.program});
      evidence.screenStatus=screen.status;
      if(screen.status!=='pass')return {id,candidate,status:'screen-rejected',evidence};
      const tasks=[];
      for(const day of train) {
        const r=await deps.ehr.simulate({specVersion:input.release.specVersion,program:candidate.program,
          persona:{...input.persona.params,policy:'expert'},policy:'expert',schedule:day.schedule,worldDir:deps.worldDir,seed:daySeed(deps.worldSeed,day.schedule.day)});
        if(JSON.stringify(r.tasks.map(t=>t.task).sort())!==JSON.stringify(day.schedule.tasks.map(t=>t.id).sort()))throw Error('Offline simulation substituted train tasks');
        tasks.push(...r.tasks);
      }
      const metrics=sumMetrics(tasks);
      return {id,candidate,status:metrics.tasks>0&&metrics.completed===metrics.tasks?'accepted':'error',metrics,evidence};
    },
  });
  await writeJson(path.join(options.out,'archive.json'),{objective:result.objective,baseline:result.baseline,programs:result.programs,evaluations:result.evaluations,archive:result.archive.json()});
  return result;
}
