/** Reconstruct bounded memory exclusively from dated train partitions. Used by
 * offline/single-night readers; live runs persist the same stream as checkpoints. */
import type { EhrClient } from './ehr.js';
import type { TrainDay } from './observe.js';
import type { PersonaParams, Program, UserMemory } from './schema.js';
export async function carriedTrainMemory(ehr:EhrClient, persona:PersonaParams, train:readonly TrainDay[],
  programs:ReadonlyMap<number,Program>, worldDir:string, worldSeed:number):Promise<UserMemory|undefined> {
  let memory:UserMemory|undefined;
  for(const day of train) {
    const program=programs.get(day.result.programVersion);
    if(!program)throw Error('Missing train program for bounded memory');
    const result=await ehr.simulate({specVersion:program.specVersion,program,persona,policy:'bounded',schedule:day.schedule,
      worldDir,seed:worldSeed*1000+day.schedule.day,memory:structuredClone(memory??{actor:program.owner,entries:[]})});
    if(result.policy!=='bounded'||!result.memory||result.memory.actor!==program.owner)throw Error('Missing bounded train memory');
    memory=result.memory;
  }
  return memory;
}
