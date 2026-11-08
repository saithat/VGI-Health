/** Offline replay of fixed recorded layout choices; never proposes or deploys.
 * Each arm and calibration partition owns its own clinician memory. */
import {existsSync} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {interruptionDayResultSchema as dayResultSchema} from '../../app/src/dashboard/interruption-schema.js';
import {dayScheduleSchema,personaParamsSchema,programSchema,type UserMemory} from '../../app/src/dashboard/measurement-schema.js';
import type {EhrClient} from './ehr.js';
import {daySeed} from './night.js';
import {calibrationPartition,isMeasurementDay,validationSeed} from './protocol.js';
import {sumMetrics} from './observe.js';
import {readJson,writeJson,pad2} from './util.js';
import {withSimulationModes,type SimulationModes} from './simulation-modes.js';

const manifestSchema=z.object({days:z.number().int().positive(),personas:z.array(z.string()),world:z.string(),worldSeed:z.number()});
/** Adopt copied choices into their review container without rewriting historical evidence. */
export async function rebindRecordedChoices(directory:string,sourceRunId:string,runId:string,days:number,personas:string[]) {
  for(let night=1;night<days;night++)for(const persona of personas) {
    const file=path.join(directory,'decisions',`night-${pad2(night)}`,`${persona}.json`);
    const record=await readJson(file,z.object({runId:z.string(),sourceRunId:z.string().optional()}).passthrough());
    if(record.runId!==sourceRunId)throw Error(`Foreign recorded choice: ${night}/${persona}`);
    await writeJson(file,{...record,runId,sourceRunId:record.sourceRunId??sourceRunId});
  }
}
export async function remeasureRun(directory:string,inner:EhrClient,modes:SimulationModes,worldOverride?:string) {
  const manifest=await readJson(path.join(directory,'manifest.json'),manifestSchema);
  const world=worldOverride??manifest.world;
  const ehr=withSimulationModes(inner,modes);
  const memories=new Map<string,UserMemory>();
  const measurements=[];
  for(let day=1;day<=manifest.days;day++)for(const persona of manifest.personas) {
    const folder=`day-${pad2(day)}`;
    const actualFile=path.join(directory,'days',folder,`${persona}.json`);
    if(!existsSync(actualFile))continue;
    const prior=await readJson(actualFile,dayResultSchema);
    const active=await readJson(path.join(directory,'programs',persona,`v${prior.programVersion}.json`),programSchema);
    const params=await readJson(path.join(world,'personas',`${persona}.json`),personaParamsSchema);
    const schedule=await readJson(path.join(world,'schedules',folder,`${persona}.json`),dayScheduleSchema);
    const specVersion=path.join(directory,'certifications',persona,`v${active.version}`,'spec.json');
    const canonicalFile=path.join(directory,'baselines',folder,`${persona}.program.json`);
    const controlFile=path.join(directory,'no-agent','days',folder,`${persona}.program.json`);
    if(!existsSync(canonicalFile)||!existsSync(controlFile))throw Error(`Missing recorded control program: ${day}/${persona}`);
    const arms=[
      {name:'actual',program:active,file:actualFile},
      {name:'canonical',program:await readJson(canonicalFile,programSchema),file:canonicalFile.replace('.program.json','.json')},
      {name:'no-agent',program:await readJson(controlFile,programSchema),file:controlFile.replace('.program.json','.json')},
    ];
    for(const arm of arms) {
      if(arm.program.specVersion!==active.specVersion)throw Error(`Mismatched control specification: ${day}/${persona}/${arm.name}`);
      const key=`${persona}/${arm.name}`,memory=params.policy==='bounded'?memories.get(key):undefined;
      const result=await ehr.simulate({specVersion,program:arm.program,persona:params,schedule,worldDir:world,
        seed:daySeed(manifest.worldSeed,day),...(memory?{memory}:{})});
      if(result.memory)memories.set(key,result.memory);
      await writeJson(arm.file,result);
      measurements.push({day,persona,arm:arm.name,metrics:sumMetrics(result.tasks),workload:result.workload??null,
        interruptions:result.tasks.flatMap(t=>t.interruptions?[{task:t.task,...t.interruptions}]:[]),geometry:result.geometry});
      console.log(`remeasured ${day}/${persona}/${arm.name}: ${result.tasks.filter(t=>t.completed).length}/${result.tasks.length}`);
    }
    if(!isMeasurementDay(day))for(const side of ['train','validation'] as const) {
      const key=`${persona}/${side}`,memory=params.policy==='bounded'&&side==='train'?memories.get(key):undefined;
      const result=await ehr.simulate({specVersion,program:active,persona:params,schedule:calibrationPartition(schedule,side),
        worldDir:world,seed:side==='validation'?validationSeed(manifest.worldSeed,day):daySeed(manifest.worldSeed,day),...(memory?{memory}:{})});
      if(result.memory&&side==='train')memories.set(key,result.memory);
      await writeJson(path.join(directory,side==='train'?'training':'validation',`day-${day}`,`${persona}.json`),result);
      measurements.push({day,persona,arm:side,metrics:sumMetrics(result.tasks),workload:result.workload??null,
        interruptions:result.tasks.flatMap(t=>t.interruptions?[{task:t.task,...t.interruptions}]:[]),geometry:result.geometry});
    }
  }
  await writeJson(path.join(directory,'metrics','remeasurement.json'),{modes,world,recordedChoicesPreserved:true,modelCalls:0,measurements});
  return measurements;
}
