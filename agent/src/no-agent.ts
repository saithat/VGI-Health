import { interruptionDayResultSchema as dayResultSchema } from '../../app/src/dashboard/interruption-schema.js';
/** Deterministic vendor-only control: no designer/model calls, no optional surfacing. */
import { InfrastructureError } from './errors.js';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {RunStore} from './store.js';
import {assertCertified} from './certification.js';
import {personalize} from './program.js';
import {checkPatch,completionOk,deployVersion,daySeed,type LoopDeps,type Holdout} from './night.js';
import {certificateSchema,programSchema,type DaySchedule} from './schema.js';
import type {Release} from './releases.js';
import type {PersonaView} from './prompts.js';
import {pad2,readJson,writeJson} from './util.js';
export async function noAgentDay(deps:LoopDeps,persona:PersonaView,release:Release,schedule:DaySchedule,holdout:Holdout) {
 const armDir=path.join(deps.store.dir,'no-agent'), armStore=new RunStore(armDir,path.join(armDir,'custom'));
 const day=schedule.day, file=path.join(armDir,'days',`day-${pad2(day)}`,`${persona.id}.json`);
 if(existsSync(file))return readJson(file,dayResultSchema);
 const previous=day===1?null:path.join(armDir,'days',`day-${pad2(day-1)}`,persona.id);
 let program=previous?await readJson(`${previous}.program.json`,programSchema):await deps.store.readProgram(persona.id,0);
 let certificate=previous?await readJson(`${previous}.certificate.json`,certificateSchema):await readJson(deps.store.certPath(persona.id,0),certificateSchema);
 if(program.specVersion!==release.specVersion){
  const canonical={...personalize(release.canonical,persona.params,persona.userId),id:program.id,version:program.version+1,specVersion:release.specVersion};
  const gate={specVersion:release.specVersion,prev:program,canonical:release.canonical,nextVersion:program.version+1};
  const restamped=await checkPatch(deps.ehr,program,[],gate);
  const attempts:unknown[]=[];
  let accepted=false;
  // After a crash, a fully gated published arm version is a reusable checkpoint.
  const pointer=path.join(armDir,'programs',persona.id,'deployed.json');
  if(existsSync(pointer)){
   const old=await armStore.login(persona.id);
   if(old.program.version===canonical.version && old.program.specVersion===release.specVersion){program=old.program;certificate=old.certificate;accepted=true;}
  }
  for(const candidate of accepted?[]:[restamped.program,canonical]){
   if(!candidate)continue;
   const fallback=candidate===canonical;
   const validation=await holdout.validate(canonical,candidate,release.specVersion).catch(error=>{if(error instanceof InfrastructureError)throw error;attempts.push({fallback,error:String(error)});return null;});
   if(!completionOk(validation)){attempts.push({fallback,reason:'validation incomplete'});continue;}
   const checked=await deps.ehr.check({specVersion:release.specVersion,program:candidate,prev:fallback?canonical:gate.prev,canonical:release.canonical});
   if(checked!=='ok'){attempts.push({fallback,check:checked});continue;}
   const deployed=await deployVersion({...deps,store:armStore},persona.id,candidate,{...gate,prev:fallback?canonical:gate.prev,validation});
   attempts.push({fallback,validation,deployed});
   if(deployed.ok){program=candidate;certificate=deployed.certificate;accepted=true;break;}
  }
  await writeJson(path.join(armDir,'releases',`day-${pad2(day)}`,`${persona.id}.json`),{release:release.id,attempts,accepted,programVersion:program.version});
  if(!accepted)throw new Error(`ABORT no-agent canonical fallback failed: ${persona.id}/${release.id}`);
 }
 assertCertified(program,certificate,release.specVersion,deps.ehr.mode);
 const memory=persona.params.policy==='bounded'&&previous?(await readJson(`${previous}.json`,dayResultSchema)).memory:undefined;
 const result=await deps.ehr.simulate({specVersion:release.specVersion,program,persona:persona.params,schedule,worldDir:deps.worldDir,seed:daySeed(deps.worldSeed,day),...(memory?{memory}:{})});
 await writeJson(file.replace('.json','.program.json'),program);
 await writeJson(file.replace('.json','.certificate.json'),certificate);
 await writeJson(file,result);
 return result;
}
