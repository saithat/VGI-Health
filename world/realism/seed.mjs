#!/usr/bin/env node
// Idempotent, version-checked migration. No reset/delete endpoints.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, PERSONA_SYSTEM } from '../../infra/scripts/lib.mjs';
import { read, write, id, ref, hash, tag, SYSTEM } from './common.mjs';
import { ROOT } from './generate.mjs';

const require=createRequire(resolve(ROOT,'infra/scripts/package.json'));
const {MedplumClient}=require('@medplum/core');
const WORLD='https://vgi-health.example/fhir/sid/world';
const FIELDS={
  Patient:['generalPractitioner'],
  Encounter:['type','serviceType','location','serviceProvider'],
  MedicationRequest:['status','dosageInstruction','note'],
  MedicationStatement:['status','dosage','note'],
  AllergyIntolerance:['code','clinicalStatus','verificationStatus','criticality','reaction','recordedDate','note']
};
export function rewrite(value, resolved) {
  if(Array.isArray(value))return value.map(v=>rewrite(v,resolved));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='reference'&&typeof v==='string'?resolved.get(v)??v:rewrite(v,resolved)]));
  return value;
}
const keyOf=r=>r.resourceType+'/'+r.id;
const token=r=>r.identifier?.map(i=>i.system+'|'+i.value)??[];
const signature=(r,patient)=>[r.resourceType,patient,
  r.resourceType==='Encounter'?JSON.stringify([r.period,r.class?.code]):
  r.resourceType==='AllergyIntolerance'?r.code?.coding?.map(c=>c.system+'|'+c.code).join(',')||r.code?.text:
  JSON.stringify([r.medicationCodeableConcept?.coding?.map(c=>c.system+'|'+c.code)??r.medicationCodeableConcept?.text,r.authoredOn??r.effectivePeriod?.start??r.dateAsserted??''])
].join('|');
function pointers(value,out=[]) {
  if(!value||typeof value!=='object')return out;
  if(typeof value.reference==='string'&&!value.reference.startsWith('#'))out.push(value.reference);
  for(const [k,v] of Object.entries(value))if(k!=='meta'&&typeof v==='object')pointers(v,out);
  return out;
}
function canonical(v) { if(Array.isArray(v))return v.map(canonical); if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])); return v; }
function same(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
function combineTags(existing,desired) {
  const tags=new Map([...(existing??[]),...(desired??[])].map(t=>[t.system+'|'+t.code,t]));
  return [...tags.values()];
}
export async function reseed({day=1,dryRun=false,report='runs/world/2/live-reseed.json'}={}) {
  loadEnv();
  const client=new MedplumClient({baseUrl:process.env.MEDPLUM_BASE_URL});
  await client.startClientLogin(process.env.MEDPLUM_CLIENT_ID,process.env.MEDPLUM_CLIENT_SECRET);
  const context=read(resolve(ROOT,`runs/world/2/context/day-${String(day).padStart(2,'0')}.json`));
  const changes=read(resolve(ROOT,'fixtures/clinical/overrides.json')).entry;
  const audit=read(resolve(ROOT,'fixtures/clinical/audit.json'));
  const seed=read(resolve(ROOT,'runs/world/2/world.json')).seed;
  const state=read(resolve(ROOT,`runs/world/2/state-day-${day}.json`));
  const previous=read(resolve(ROOT,`runs/world/2/state-day-${day-1}.json`));
  const schedules=Object.fromEntries(['P1','P2','P3','P4','P5'].map(p=>[p,read(resolve(ROOT,`runs/world/2/day-${day}-${p}.json`))]));
  const all=new Map();
  const types=new Set([...Object.keys(FIELDS),'Practitioner','Organization','Location','Coverage','Provenance',...context.entry.map(e=>e.resource.resourceType)]);
  for(const type of types) {
    for await(const page of client.searchResourcePages(type,{_count:'1000',...(type==='Observation'?{_tag:WORLD+'|day'+day+','+SYSTEM+'|managed'}:{})}))for(const r of page)all.set(keyOf(r),r);
  }
  const byIdentifier=new Map();
  for(const r of all.values())for(const t of token(r))byIdentifier.set(t,r);
  const resolved=new Map(),bindings=new Map(),sourceRaw=new Map();
  function bind(key,r,fullUrl) {
    if(!r)throw new Error('Missing imported resource: '+key);
    resolved.set(key,keyOf(r)); if(fullUrl)resolved.set(fullUrl,keyOf(r));
    bindings.set(key,r);
  }
  // Identity binding uses source identifiers or immutable clinical timestamps/codes.
  // It never matches patients by name or medications merely by ingredient.
  for(const source of audit.sourceFiles) {
    if(hash(await import('node:fs').then(fs=>fs.readFileSync(resolve(ROOT,source.file),'utf8')))!==source.sha256)throw new Error('Changed import: '+source.file);
    const bundle=read(resolve(ROOT,source.file));
    const p=bundle.entry.find(e=>e.resource.resourceType==='Patient');
    const pr=token(p.resource).map(t=>byIdentifier.get(t)).find(Boolean);
    const pid=p.resource.id??p.fullUrl.replace('urn:uuid:','');
    bind('Patient/'+pid,pr,p.fullUrl);
    const buckets=new Map();
    for(const r of all.values())if(FIELDS[r.resourceType]&&r.resourceType!=='Patient'&&(r.subject?.reference??r.patient?.reference)===keyOf(pr)) {
      const sig=signature(r,keyOf(pr)); if(!buckets.has(sig))buckets.set(sig,[]);buckets.get(sig).push(r);
    }
    for(const bucket of buckets.values())bucket.sort((a,b)=>a.id.localeCompare(b.id));
    const used=new Set();
    for(const e of [...bundle.entry].sort((a,b)=>(a.resource.id??a.fullUrl).localeCompare(b.resource.id??b.fullUrl))) {
      const r=e.resource,key=r.resourceType+'/'+(r.id??e.fullUrl.replace('urn:uuid:',''));
      sourceRaw.set(key,r);
      if(r.resourceType==='Patient')continue;
      if(!FIELDS[r.resourceType])continue;
      const exact=token(r).map(t=>byIdentifier.get(t)).find(Boolean);
      const found=exact??buckets.get(signature(r,keyOf(pr)))?.find(x=>!used.has(keyOf(x)));
      bind(key,found,e.fullUrl);used.add(keyOf(found));
    }
  }
  for(const e of context.entry)if(e.resource.resourceType==='Practitioner') {
    const existing=token(e.resource).map(t=>byIdentifier.get(t)).find(Boolean);
    if(existing)bind(e.fullUrl,existing);
  }
  const owned=new Map();
  for(const r of all.values())for(const t of r.meta?.tag??[])if(t.system===SYSTEM&&t.code.includes('/'))owned.set(t.code,r);
  const alias=(type,sourceId,legacy)=> {
    const r=byIdentifier.get(WORLD+'|day'+day+'-'+legacy);
    if(r)bind(type+'/'+sourceId,r);
  };
  for(const p of ['P1','P4']) {
    const visits=[...new Set(schedules[p].tasks.filter(t=>['W1','W5'].includes(t.workflow)).map(t=>t.patientId))].slice(0,18);
    for(const [i,pid] of visits.entries())alias('Appointment',id(seed,day,p+'-slot-'+i),'appointment-'+schedules[p].tasks.find(t=>['W1','W5'].includes(t.workflow)&&t.patientId===pid).id);
  }
  for(const a of state.today.ed.arrivals)alias('Encounter',id(seed,day,'ed-'+a.taskId),'ed-'+a.taskId);
  for(const [i,ip] of state.today.ward.censusAtShiftStart.entries()) {
    const admission=previous.inpatients.find(x=>x.patientId===ip.patientId);
    if(admission)alias('Encounter',id(seed,day,'ward-'+i),'inpatient-'+admission.admissionId);
  }
  for(const schedule of Object.values(schedules))for(const t of schedule.tasks) {
    for(const r of t.todayResources)alias(r.resourceType,r.id,'source-'+r.resourceType+'-'+r.id);
    if(t.workflow==='W2') {
      alias('Task',id(seed,day,t.id+'-result-message'),'result-task-'+t.id);
      alias('DiagnosticReport',id(seed,day,t.id+'-report'),'result-report-'+t.id);
    }
  }
  const desired=new Map(changes.filter(e=>e.action==='create').map(e=>[e.key,structuredClone(e.resource)]));
  for(const e of context.entry)if(e.resource.resourceType!=='Patient')desired.set(e.fullUrl,structuredClone(e.resource));
  // A newly reported world allergy invalidates a baseline no-allergy assertion.
  let nkaWithdrawn=0;
  for(const r of desired.values())if(r.resourceType==='AllergyIntolerance'&&r.code?.coding?.some(c=>c.code==='716186003')) {
    const patient=resolved.get(r.patient.reference);
    const real=[...all.values(),...desired.values()].some(a=>a.resourceType==='AllergyIntolerance'&&(resolved.get(a.patient?.reference)??a.patient?.reference)===patient&&a.clinicalStatus?.coding?.some(c=>c.code==='active')&&!a.verificationStatus?.coding?.some(c=>c.code==='entered-in-error')&&!a.code?.coding?.some(c=>['609328004','716186003','409137002'].includes(c.code))&&!/^(NKDA|no known|none known)/i.test(a.code?.text??''));
    if(real) {delete r.clinicalStatus;r.verificationStatus={coding:[{system:'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',code:'entered-in-error'}]};nkaWithdrawn++;}
  }
  // Existing managed identities take precedence over legacy aliases on recovery.
  for(const [key] of desired)if(owned.has(key))bind(key,owned.get(key));
  const newKeys=new Set([...desired.keys()].filter(key=>!resolved.has(key)));
  const ordered=[],visiting=new Set(),done=new Set();
  function visit(key) {
    if(done.has(key))return;
    if(visiting.has(key))throw new Error('Reference cycle: '+key);
    visiting.add(key);
    for(const target of pointers(desired.get(key))) {
      if(desired.has(target)&&!resolved.has(target))visit(target);
      else if(!resolved.has(target)&&!all.has(target)&&!target.startsWith('#'))throw new Error('Unresolved reference: '+target);
    }
    visiting.delete(key);done.add(key);ordered.push(key);
  }
  for(const key of desired.keys())visit(key);
  const stats={day,dryRun,patients:audit.patients,patientCountBefore:[...all.values()].filter(r=>r.resourceType==='Patient').length,created:0,updated:0,unchanged:0,nkaWithdrawn,sourceSha256:hash(audit.sourceFiles),contextSha256:hash(context),byType:{}};
  const count=(kind,type)=>{stats[kind]++;stats.byType[type]??={created:0,updated:0,unchanged:0};stats.byType[type][kind]++;};
  async function batch(entries) {
    if(!entries.length)return [];
    const result=await client.executeBatch({resourceType:'Bundle',type:'transaction',entry:entries});
    if(result.entry?.length!==entries.length||result.entry.some(e=>!e.response?.status?.startsWith('2')))throw new Error('Failed migration transaction: '+JSON.stringify(result));
    return result.entry;
  }
  const createOrder=ordered.filter(key=>newKeys.has(key));
  for(let offset=0;offset<createOrder.length;offset+=8) {
    const keys=createOrder.slice(offset,offset+8),local=new Map(resolved);
    for(const key of keys) {
      const hex=hash(key).slice(0,32);
      local.set(key,'urn:uuid:'+hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5'));
    }
    const entries=keys.map(key=>{
      const r=rewrite(structuredClone(desired.get(key)),local);delete r.id;
      tag(r,'managed',key);
      return {fullUrl:local.get(key),resource:r,request:{method:'POST',url:r.resourceType,ifNoneExist:new URLSearchParams({_tag:SYSTEM+'|'+key}).toString()}};
    });
    if(dryRun) {for(const key of keys){resolved.set(key,key);count('created',desired.get(key).resourceType);}continue;}
    const results=await batch(entries);
    for(const [i,key] of keys.entries()) {
      const e=results[i],location=e.response?.location?.match(/([A-Za-z]+\/[A-Za-z0-9.-]+)(?:\/_history\/[^/]+)?$/)?.[1];
      const actual=e.resource??await client.readReference(ref(location));
      bind(key,actual);all.set(keyOf(actual),actual);count(e.response.status.startsWith('201')?'created':'unchanged',actual.resourceType);
    }
  }
  const updates=new Map();
  for(const change of changes.filter(e=>e.action!=='create')) {
    const old=bindings.get(change.key);
    if(!old)throw new Error('Unbound source update '+change.key);
    const desiredSource=rewrite(change.resource,resolved),next=structuredClone(old),raw=sourceRaw.get(change.key);
    for(const field of FIELDS[old.resourceType]) {
      // A source-active prescription does not reactivate clinical work completed since import.
      if(field==='status'&&desiredSource.status===raw.status)continue;
      if(desiredSource[field]===undefined)delete next[field];else next[field]=desiredSource[field];
    }
    const mergedTags=combineTags(old.meta?.tag,desiredSource.meta?.tag);
    next.meta={...old.meta,...(mergedTags.length?{tag:mergedTags}:{})};
    updates.set(keyOf(old),next);
  }
  for(const key of ordered.filter(k=>!newKeys.has(k))) {
    const old=bindings.get(key),r=rewrite(structuredClone(desired.get(key)),resolved);
    // Setup owns clinician identity; do not rename the actual signed-in users.
    if(r.resourceType==='Practitioner'&&r.identifier?.some(i=>i.system===PERSONA_SYSTEM))continue;
    const next={...old,...r,id:old.id,meta:{...old.meta,tag:combineTags(old.meta?.tag,r.meta?.tag)}};
    next.identifier=[...new Map([...(old.identifier??[]),...(r.identifier??[])].map(i=>[i.system+'|'+i.value,i])).values()];
    if(!next.identifier.length)delete next.identifier;
    tag(next,'managed',key);next.meta.tag=combineTags([],next.meta.tag);
    if(r.resourceType==='Task'&&r.focus?.reference==='#current-rx'&&old.focus?.reference&&!old.focus.reference.startsWith('#')) {
      const rx=r.contained.find(c=>c.id==='current-rx'),oldRx=all.get(old.focus.reference);
      if(!oldRx)throw new Error('Unresolved existing refill prescription '+old.focus.reference);
      updates.set(keyOf(oldRx),{...oldRx,dispenseRequest:rx.dispenseRequest});
      next.focus=old.focus;
      next.contained=r.contained.filter(c=>c.id!=='current-rx').map(c=>c.resourceType==='MedicationDispense'?{...c,authorizingPrescription:[old.focus]}:c);
    }
    updates.set(keyOf(old),next);
  }
  // Retire only superseded synthetic plans owned by this day, preserving their history.
  let retiredContextResources=0;
  for(const [key,old] of owned)if(!desired.has(key)&&['CarePlan','ServiceRequest'].includes(old.resourceType)&&old.meta.tag.some(t=>t.system===SYSTEM&&t.code==='day-'+day)&&old.status==='active') {
    updates.set(keyOf(old),{...old,status:'revoked'});retiredContextResources++;
  }
  stats.retiredContextResources=retiredContextResources;
  const pending=[];stats.changedFields=[];
  for(const [key,next] of updates) {
    const old=all.get(key);
    if(same(old,next)){count('unchanged',next.resourceType);continue;}
    // Optimistic locking prevents silent concurrent changes to the shared chart.
    if(stats.changedFields.length<8)stats.changedFields.push({type:next.resourceType,fields:[...new Set([...Object.keys(old),...Object.keys(next)])].filter(k=>!same(old[k],next[k]))});
    pending.push({resource:next,request:{method:'PUT',url:key,ifMatch:'W/"'+old.meta.versionId+'"'}});
    count('updated',next.resourceType);
  }
  if(!dryRun)for(let i=0;i<pending.length;i+=32)await batch(pending.slice(i,i+32));
  // Confirm the generated graph resolves on the server, including all 12 List collections.
  if(!dryRun) {
    const known=new Set([...all.keys(),...resolved.values()]);
    for(const key of ordered)for(const target of pointers(rewrite(desired.get(key),resolved)))if(!known.has(target))throw new Error('Unverified reference '+target);
    stats.patientCountAfter=(await client.search('Patient',{_summary:'count'})).total;
    if(stats.patientCountBefore!==stats.patientCountAfter)throw new Error('Unexpected shared patient population change');
    stats.lists=context.entry.filter(e=>e.resource.resourceType==='List').map(e=>({title:e.resource.title,rows:e.resource.entry.length}));
  }
  write(resolve(ROOT,report),stats,2);
  console.log(JSON.stringify(stats,null,2));return stats;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),value=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
  if(args.some((a,i)=>!['--day','--dry-run','--report'].includes(a)&&!['--day','--report'].includes(args[i-1])))throw new Error('Usage: seed.mjs [--day N] [--dry-run] [--report PATH]');
  reseed({day:Number(value('--day')??1),dryRun:args.includes('--dry-run'),...(value('--report')?{report:value('--report')}:{})}).catch(e=>{console.error(e.outcome?JSON.stringify(e.outcome):e.stack);process.exitCode=1;});
}
