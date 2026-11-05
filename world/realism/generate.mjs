#!/usr/bin/env node
// Pure output augmentation: imported fixtures and all simulator task inputs stay unchanged.
import { fictionalize } from '../../scripts/fictional-identities.mjs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { read, write, hash, resourceKey, id, tag, ref, cc } from './common.mjs';
import { reconcileBundle } from './reconcile.mjs';
import { dayContext } from './context.mjs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export function augment({world=resolve(ROOT,'runs/world/2'),fixtures=resolve(ROOT,'fixtures/synthea/index.json'),clinical=resolve(ROOT,'fixtures/clinical')}={}) {
  const sources=[fixtures];
  // Real imported patients supply list context, without expanding the scenario cohort.
  if(existsSync(resolve(ROOT,'fixtures/synthetic-hospital/index.json'))&&fixtures!==resolve(ROOT,'fixtures/synthetic-hospital/index.json')) sources.push(resolve(ROOT,'fixtures/synthetic-hospital/index.json'));
  const charts=new Map(),population=[],overlays=[],audit={sourceFiles:[],changed:{},rejectedAllergyFindings:0,patients:0};
  for(const path of sources) {
    const index=read(path),base=dirname(path);
    for(const p of index.patients??index) {
      const file=resolve(base,p.file??p.bundle??`bundles/${p.id}.json`);
      const bytes=readFileSync(file,'utf8'),source=JSON.parse(bytes);
      const original=source.entry.map(e=>({key:resourceKey(e),resource:e.resource,fullUrl:e.fullUrl}));
      const result=reconcileBundle(source);
      const patient=result.bundle.entry.find(e=>e.resource.resourceType==='Patient').resource;
      const pid=patient.id;
      charts.set(pid,result);
      const age=Math.floor((Date.parse('2026-11-02')-Date.parse(patient.birthDate))/31557600000);
      population.push({id:pid,age,name:patient.name?.[0]?.text??[...(patient.name?.[0]?.given??[]),patient.name?.[0]?.family].filter(Boolean).join(' '),...(p.personaFits?{personaFits:p.personaFits}:{})});
      const old=new Map(original.map(e=>[e.key,e]));
      for(const e of result.bundle.entry) {
        const key=resourceKey(e),prior=old.get(key);
        if(!prior||JSON.stringify({...prior.resource,id:e.resource.id})!==JSON.stringify(e.resource)) {
          overlays.push({source:relative(ROOT,file),sourceFullUrl:prior?.fullUrl??null,key,resource:fictionalize(e.resource),action:prior?'replace':'create'});
          audit.changed[e.resource.resourceType]=(audit.changed[e.resource.resourceType]??0)+1;
        }
      }
      for(const r of result.rejected) {
        const before=original.find(e=>e.key===`${r.resourceType}/${r.id}`);
        // Live migration withdraws source findings; no deletes or loss of import history.
        const withdrawn={...r,verificationStatus:cc('entered-in-error','Entered in error','http://terminology.hl7.org/CodeSystem/allergyintolerance-verification'),note:[...(r.note??[]),{text:'Synthetic chart reconciliation: non-allergen finding or superseded no-allergy assertion; excluded from active allergy list.'}]};
        delete withdrawn.clinicalStatus;
        tag(withdrawn,'reconciled');
        overlays.push({source:relative(ROOT,file),sourceFullUrl:before?.fullUrl??null,key:`${r.resourceType}/${r.id}`,resource:withdrawn,action:'withdraw'});
        audit.rejectedAllergyFindings++;
      }
      const nka=result.bundle.entry.find(e=>e.resource.resourceType==='AllergyIntolerance'&&e.resource.code?.coding?.some(c=>c.code==='716186003'));
      if(nka) {
        const provenance={resourceType:'Provenance',id:id(pid,'allergy-review'),target:[ref(nka.resource)],recorded:'2026-11-02T07:00:00-08:00',activity:cc('allergy-review','Allergies reviewed'),agent:[{who:fictionalize(patient.generalPractitioner[0])}]};
        overlays.push({source:relative(ROOT,file),sourceFullUrl:null,key:`Provenance/${provenance.id}`,resource:provenance,action:'create'});
      }
      audit.sourceFiles.push({file:relative(ROOT,file),sha256:hash(bytes)});
    }
  }
  audit.patients=population.length;
  write(resolve(clinical,'overrides.json'),{schemaVersion:1,referenceDate:'2026-11-02',description:'Deterministic presentation/live chart overlay. Apply replacements by source resource identity; retain imported source bundles for unchanged scenario replay. Withdrawn findings are excluded from the active chart.',entry:overlays});
  write(resolve(clinical,'index.json'),{schemaVersion:1,patients:population,overrides:'overrides.json',audit:'audit.json'});
  write(resolve(clinical,'audit.json'),audit);
  const generated=[];
  if(existsSync(resolve(world,'context'))) rmSync(resolve(world,'context'),{recursive:true});
  const manifest=read(resolve(world,'manifest.json'));
  const operationHistory=new Map();
  for(const d of manifest.perDay) {
    const schedules=Object.fromEntries(['P1','P2','P3','P4','P5'].map(p=>[p,read(resolve(world,`day-${d.day}-${p}.json`))]));
    const context=dayContext({seed:manifest.seed,day:d.day,date:d.date,schedules,state:read(resolve(world,`state-day-${d.day}.json`)),previous:read(resolve(world,`state-day-${d.day-1}.json`)),population,charts,operationHistory});
    const file=`context/day-${String(d.day).padStart(2,'0')}.json`;
    write(resolve(world,file),context); generated.push(file);
  }
  manifest.files=manifest.files.filter(f=>!f.startsWith('context/')).concat(generated);
  manifest.clinicalData={schemaVersion:1,fixtures:relative(ROOT,clinical),context:'context/day-{DD}.json',sourceCohorts:sources.map(p=>relative(ROOT,p)),taskInputs:'unchanged imported scenario fixtures',listContextTag:'urn:vgi:world:realism|list-context'};
  write(resolve(world,'manifest.json'),manifest,2);
  console.log(`Clinical overlays: ${audit.patients} patients, ${overlays.length} resource changes; ${generated.length} shared day bundles`);
  return {audit,overlays,generated};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
  augment({...(arg('--world')?{world:resolve(arg('--world'))}:{}),...(arg('--fixtures')?{fixtures:resolve(arg('--fixtures'))}:{}),...(arg('--clinical')?{clinical:resolve(arg('--clinical'))}:{})});
}
