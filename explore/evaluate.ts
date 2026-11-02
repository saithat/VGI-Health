import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { EhrClient } from '../agent/src/ehr.js';
import type { ScreenChecker } from '../agent/src/screencheck.js';
import type { Program, Spec, PersonaParams, DaySchedule } from '../agent/src/schema.js';
import { programHash } from '../agent/src/program.js';
import { validateCandidate, type Candidate } from './generator.js';
import type { Evaluation, Metrics } from './archive.js';
export const write = async(file:string,value:unknown) => {await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value,null,2)+'\n');};
export interface Workload { department: string; role: Program['role']; worldDir: string; persona: PersonaParams; schedules: DaySchedule[]; }
export function makeEvaluator(opts:{ehr:EhrClient;screen:ScreenChecker;baseline:Program;spec:Spec;workload:Workload;out:string;
  checkedRenderer?: (candidate:Candidate,directory:string)=>Promise<Record<string,unknown>>}) {
  return async(candidate:Candidate,id:string):Promise<Evaluation>=>{
    const e:Evaluation={id,candidate,status:'error',evidence:{}};
    const dir=path.join(opts.out,'candidates',id);await mkdir(dir,{recursive:true});
    try { validateCandidate(candidate,opts.baseline,opts.spec); }
    catch(error){e.status='static-rejected';e.evidence['error']=String(error);await write(path.join(dir,'evaluation.json'),e);return e;}
    await write(path.join(dir,'candidate.json'),candidate);
    await write(path.join(dir,'program.json'),candidate.program);
    e.evidence['programSha256']=programHash(candidate.program);
    try {
      const verdict=await opts.ehr.check({specVersion:opts.spec.version,program:candidate.program,prev:opts.baseline,canonical:opts.baseline});
      e.evidence['leanVerdict']=verdict;
      await write(path.join(dir,'lean-verdict.json'),verdict);
      if(verdict!=='ok'&&candidate.point.tier!=='sandbox'){e.status='lean-rejected';return e;}
      if(candidate.point.tier!=='sandbox'){
        const result=await opts.screen.check({specVersion:opts.spec.version,program:candidate.program});
        e.evidence['screenStatus']=result.status;e.evidence['screen']=result;
        if(result.status!=='pass'){e.status='screen-rejected';return e;}
        if(candidate.point.tier==='checked'){
          if(!opts.checkedRenderer)throw Error('Checked tier requires an independent renderer gate; Lean-renderer evidence cannot certify a custom renderer');
          const evidence=await opts.checkedRenderer(candidate,dir);
          if(evidence['status']!=='pass')throw Error('Custom renderer gate did not pass');
          e.evidence['customRenderer']=evidence;
        }
      }else e.evidence['sandboxMetricScope']='Backing interpreter program only; custom-component interaction costs are not modeled';
      const metrics:Metrics={tasks:0,completed:0,clicks:0,scrolls:0,keystrokes:0};
      for(const schedule of opts.workload.schedules){
        const result=await opts.ehr.simulate({specVersion:opts.spec.version,program:candidate.program,persona:opts.workload.persona,
          schedule,worldDir:opts.workload.worldDir,seed:700+schedule.day});
        await write(path.join(dir,`day-${schedule.day}.json`),result);
        for(const t of result.tasks){metrics.tasks++;metrics.completed+=Number(t.completed);metrics.clicks+=t.clicks;metrics.scrolls+=t.scrolls;metrics.keystrokes+=t.keystrokes;}
      }
      if(!metrics.tasks)throw Error('Empty workload');
      e.metrics=metrics;e.quality=-(metrics.clicks+metrics.scrolls+metrics.keystrokes/20)/metrics.tasks;
      e.evidence['metricScope']='Native deterministic simulator effort estimates; no Chromium pointer geometry applied';
      e.status='accepted';return e;
    }catch(error){e.status='error';e.evidence['error']=String(error);return e;}
    finally{await write(path.join(dir,'evaluation.json'),e);}
  };
}
