/** Opt-in bounded clinician adapters. All counterfactual memory is cloned and discarded. */
import { z } from 'zod';
import type { EhrClient } from './ehr.js';
import type { DayResult, DaySchedule, PersonaParams, Program, UserMemory } from './schema.js';
import type { SwitchCost } from './cadence.js';
import { usageWeightedSwitchCost } from './cadence.js';
import type { SessionChooser } from './session.js';
import { expandProgram } from './composites.js';
import { runNative } from './native-process.js';
import { stableStringify } from './program.js';

export const BOUNDED_COST_MODEL = 'bounded-matched-relearning-v1';
export interface EffortCost { seconds: number; actions: number; }
export interface RelearningEstimate {
  model: string;
  assumption: string;
  k: number;
  warmBlocks: number;
  before: EffortCost;
  after: EffortCost;
  expertBefore: EffortCost;
  expertAfter: EffortCost;
  /** Signed first-k excess over same-program warm reference, then after minus before. */
  beforeExcess: EffortCost;
  afterExcess: EffortCost;
  incremental: EffortCost;
}
export const effortCost = (days: readonly Pick<DayResult, 'tasks'>[]): EffortCost => ({
  seconds: days.flatMap(d => d.tasks).reduce((n,t) => n + t.klmDeciSec / 10, 0),
  actions: days.flatMap(d => d.tasks).reduce((n,t) => n + t.clicks + t.scrolls, 0),
});
const subtract = (a: EffortCost,b: EffortCost): EffortCost => ({seconds:a.seconds-b.seconds,actions:a.actions-b.actions});
export class IncompleteBoundedReplay extends Error {}
export interface BoundedReplayInput {
  before: Program; after: Program; persona: PersonaParams; schedules: readonly DaySchedule[];
  memory?: UserMemory; worldDir: string; seed: number;
}
/** k = supplied matched train days (normally latest two); 3 practice blocks, one warm reference.
 * Dates, tasks and paired seeds stay fixed to isolate practice from changing case mix/forgetting. */
export function boundedRelearning(ehr: EhrClient, warmBlocks = 3) {
  if (!Number.isInteger(warmBlocks) || warmBlocks<0) throw Error('Invalid practice block count');
  const cache = new Map<string, Promise<{first:DayResult[];steady:DayResult[]} | null>>();
  const replay = (input: BoundedReplayInput, program:Program) => {
    const key = stableStringify({...input, before:undefined, after:undefined,program});
    let pending = cache.get(key);
    if (!pending) {
      pending = (async () => {
        let memory = structuredClone(input.memory);
        const block = async () => {
          const days: DayResult[] = [];
          for (const schedule of input.schedules) {
            const day = await ehr.simulate({specVersion:program.specVersion,program,persona:input.persona,
              schedule,worldDir:input.worldDir,seed:input.seed+schedule.day,policy:'bounded',...(memory?{memory}: {})});
            if (day.policy !== 'bounded' || !day.memory || !day.expert) return null;
            if (day.day !== schedule.day || day.persona !== schedule.persona || day.programVersion!==program.version ||
                day.expert.day!==schedule.day || day.expert.persona!==schedule.persona || day.expert.programVersion!==program.version ||
                day.tasks.length !== schedule.tasks.length || day.expert.tasks.length!==schedule.tasks.length ||
                schedule.tasks.some(t => !day.tasks.some(r => r.task===t.id)) ||
                schedule.tasks.some(t => !day.expert?.tasks.some(r => r.task===t.id)))
              throw new Error('Mismatched bounded/expert replay identity');
            if (day.tasks.some(t=>!t.completed) || day.expert.tasks.some(t=>!t.completed))
              throw new IncompleteBoundedReplay('Incomplete bounded/expert replay');
            memory = day.memory; days.push(day);
          }
          return days;
        };
        const first = await block(); if (!first) return null;
        for (let n=0;n<warmBlocks;n++) if (!await block()) return null;
        const steady = await block(); return steady ? {first,steady} : null;
      })();
      cache.set(key,pending);
      // Keep memory use bounded across long cadence runs.
      if (cache.size>128) {const oldest=cache.keys().next().value;if(oldest!==undefined)cache.delete(oldest);}
    }
    return pending;
  };
  return async (input: BoundedReplayInput) => {
    if (!input.schedules.length || !input.memory) return null;
    if (input.memory.actor && input.memory.actor!==input.before.owner) throw Error('Foreign clinician memory');
    if (input.schedules.some(s=>s.persona!==input.persona.id)) throw Error('Foreign clinician schedule');
    const before = await replay(input,input.before), after = await replay(input,input.after);
    if (!before || !after) return null;
    const b=effortCost(before.first), a=effortCost(after.first);
    const be=subtract(b,effortCost(before.steady)), ae=subtract(a,effortCost(after.steady));
    const estimate:RelearningEstimate = {model:BOUNDED_COST_MODEL,
      assumption:`simulation assumption: carried memory; matched dated train workloads; ${warmBlocks} practice blocks and one warm reference; signed first-k excess; actions are clicks+scrolls; browser accounting, when supplied, labels ordinal-slot projections for ignored remembered clicks`,
      k:input.schedules.length,warmBlocks,before:b,after:a,
      expertBefore:effortCost(before.first.map(d=>{if(!d.expert)throw Error("Missing expert evidence");return d.expert;})),expertAfter:effortCost(after.first.map(d=>{if(!d.expert)throw Error("Missing expert evidence");return d.expert;})),
      beforeExcess:be,afterExcess:ae,incremental:subtract(ae,be)};
    return {estimate,beforeDays:before.first,afterDays:after.first};
  };
}
export type BoundedEstimator = ReturnType<typeof boundedRelearning>;
export function boundedSwitchCost(ehr:EhrClient, persona:PersonaParams, worldDir:string, seed:number):SwitchCost {
  const estimate=boundedRelearning(ehr);
  return async (before,after,context) => {
    const train=context.train;
    const memory=train.at(-1)?.result.memory;
    const result=await estimate({before,after,persona,worldDir,seed,schedules:train.map(d=>d.schedule),
      ...(memory ? {memory}: {})});
    if (!result) {
      const fallback=await usageWeightedSwitchCost(before,after,context);
      return {...fallback,assumption:`${fallback.assumption}; fallback: bounded carried memory or backend evidence unavailable`};
    }
    return {cost:Math.max(0,result.estimate.incremental.actions)/result.estimate.k,
      model:BOUNDED_COST_MODEL,assumption:result.estimate.assumption,relearning:result.estimate};
  };
}
const ratingSchema=z.object({score:z.number().int(),chooseAfter:z.boolean(),disruption:z.number().int()});
/** Preferences and numerical utility remain in this private simulated-clinician closure. */
export function boundedSessionChooser(binary:string, persona:PersonaParams, seed:number):SessionChooser {
  const privatePersona=structuredClone(persona);
  return async session => {
    if (session.clinician!==session.current.program.owner || session.schedules.some(s=>s.persona!==privatePersona.id))
      throw Error('Chooser belongs to another clinician');
    const keys=new Map(expandProgram(session.current.program).screens.flatMap(s=>s.components.map(c=>[c.id,c.tag||c.id])));
    const recent=session.current.days.map(d=>({costMs:Math.round(effortCost([d]).seconds*1000),
      usedTags:d.trace.flatMap(t=>{const e=t.event;const id='click' in e?e.click.comp:'enter' in e?e.enter.comp:'confirm' in e?e.confirm.comp:'selectTab' in e?e.selectTab.comp:null;return id?[keys.get(id)??id]:[];})}));
    const ranked=[];
    for (const option of session.options) {
      const res=await runNative(binary,['rate-programs'],{input:JSON.stringify({before:expandProgram(session.current.program),after:expandProgram(option.program),
        actor:session.clinician,seed,preferences:privatePersona.hiddenPreferences??null,recent})});
      if(res.code!==0)throw Error(`Bounded choice failed: ${res.stderr}`);
      ranked.push({id:option.id,...ratingSchema.parse(JSON.parse(res.stdout))});
    }
    ranked.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const chosen=ranked[0]?.chooseAfter?ranked[0].id:null;
    return {chosen,reason:chosen?'Simulated clinician prefers the placement tradeoff after disruption.':'Simulated clinician keeps the familiar layout; no offered placement justifies disruption.',
      reasons:ranked.map(r=>({option:r.id,reason:r.id===chosen?'Preferred placement tradeoff.':'Less preferred than the choice or keeping current.'}))};
  };
}
