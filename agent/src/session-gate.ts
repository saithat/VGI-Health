/** Off-shift cadence adapter. Certificates are prepared in scratch, never deployed to the active store. */
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ReviewGate } from './cadence.js';
import type { EhrClient } from './ehr.js';
import type { PersonaParams } from './schema.js';
import { boundedSessionChooser, IncompleteBoundedReplay } from './bounded-tailoring.js';
import { SessionUnavailable, answerSession, prepareSession, recordSession, sessionGeneratorInput, type SessionChooser, type ArchivedSessionBundle } from './session.js';
import { sessionSchema, type FrictionFlag, type TailoringSession } from './session-schema.js';
import type { TrainDay } from './observe.js';
import { sha256, stableStringify } from './program.js';

export const SESSION_GATE_ID='bounded-tailoring-session-v1';
export async function pastSessions(runsRoot:string,night:number):Promise<TailoringSession[]> {
  let files:string[];
  try {files=await readdir(path.join(runsRoot,'sessions'));}
  catch(e){if(e instanceof Error && 'code' in e && e.code==='ENOENT')return [];throw e;}
  const sessions=[];
  for(const file of files.sort())if(file.endsWith('.json')) {
    const s=sessionSchema.parse(JSON.parse(await readFile(path.join(runsRoot,'sessions',file),'utf8')));
    if(s.asOfDay<night)sessions.push(s);
  }
  return sessions;
}
/** Require provenance in the supplied train tasks, including friction task/day, before exporting feedback. */
export async function tailoringFeedback(runsRoot:string,night:number,clinician:string,train:readonly TrainDay[],flags:readonly FrictionFlag[]=[]) {
  const tasks=new Set(train.flatMap(d=>d.schedule.tasks.map(t=>`${t.day}:${t.id}`)));
  const sessions=(await pastSessions(runsRoot,night)).filter(s=>s.schedules.every(d=>d.tasks.every(t=>tasks.has(`${d.day}:${t.id}`))));
  const validFlags=[...new Map([...flags,...sessions.flatMap(s=>s.flags)].filter(f=>tasks.has(`${f.day}:${f.task}`)).map(f=>[f.id,f])).values()];
  return sessionGeneratorInput(clinician,night-1,validFlags,sessions);
}
export function sessionReviewGate(input:{ehr:EhrClient;persona:PersonaParams;runsRoot:string;flags?:readonly FrictionFlag[];chooser?:SessionChooser}):ReviewGate {
  const privatePersona=structuredClone(input.persona);
  return {id:SESSION_GATE_ID,async review(request) {
    const c=request.sessionContext;
    if(!c)throw Error('Session gate requires train context');
    if(request.bundles.length<2)return {chosenBundle:null,reason:'Keep current: fewer than two diverse certified options.'};
    const scratch=await mkdtemp(path.join(tmpdir(),'session-cert-'));
    try {
      const candidates:ArchivedSessionBundle[]=[];
      for(const b of request.bundles) {
        const certified=await input.ehr.deploy({specVersion:b.program.specVersion,program:b.program,prev:c.current,canonical:c.canonical,outDir:path.join(scratch,b.id)});
        if(certified.deployed)candidates.push({id:b.id,label:`Archived ${b.evidence.niche}`,program:b.program,certificate:certified.certificate});
      }
      if(candidates.length<2)return {chosenBundle:null,reason:'Keep current: fewer than two recertified options.'};
      const flags=(input.flags??[]).filter(f=>f.clinician===c.current.owner && c.train.some(d=>d.schedule.day===f.day && d.schedule.tasks.some(t=>t.id===f.task)));
      const memory=c.train.at(-1)?.result.memory;
      const prepared=await prepareSession({id:`night-${request.night}-${sha256(request.clinician).slice(0,12)}`,
        createdAt:new Date(Date.UTC(2026,10,2+request.night)).toISOString(),phase:'offShift',cadence:'weekly',asOfDay:request.night,
        current:c.current,canonical:c.canonical,persona:privatePersona,recentDays:c.train.map(d=>d.schedule),worldDir:c.worldDir,seed:c.seed,
        archive:{candidates:async()=>candidates},ehr:input.ehr,flags,bounded:{...(memory?{memory}:{})}});
      const chooser=input.chooser ?? (input.ehr.binary ? boundedSessionChooser(input.ehr.binary,privatePersona,c.seed):null);
      if(!chooser)throw Error('Bounded session chooser requires native binary (or explicit test chooser)');
      const answered=await answerSession(prepared,chooser);
      try {await recordSession(answered,input.runsRoot);}
      catch(e) {
        if(!(e instanceof Error && 'code' in e && e.code==='EEXIST'))throw e;
        const existing=sessionSchema.parse(JSON.parse(await readFile(path.join(input.runsRoot,'sessions',`${answered.id}.json`),'utf8')));
        // Re-certification issues a fresh timestamp. Compare every other field
        // against the immutable original; never rewrite its saved bytes.
        const retry=structuredClone(answered);
        for(const option of retry.options) {
          const original=existing.options.find(o=>o.id===option.id);
          if(original)option.certificate.time=original.certificate.time;
        }
        if(stableStringify(existing)!==stableStringify(retry))throw Error('Session retry differs from recorded session');
      }
      if(!answered.choice)throw Error("Missing session choice");
      return {chosenBundle:answered.choice.chosen,reason:answered.choice.reason};
    } catch(e) {
      if(e instanceof SessionUnavailable || e instanceof IncompleteBoundedReplay)return {chosenBundle:null,reason:`Keep current: ${e.message}`};
      throw e;
    } finally {await rm(scratch,{recursive:true,force:true});}
  }};
}
