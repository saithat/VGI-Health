/** Synthetic full-release service for the DOM painter's browser regressions.
 * Auth transport alone is substituted; native replay and Postgres are real. */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { host } from './helpers.ts';
import { migrate } from '../src/store.ts';
import { configSchema } from '../src/types.ts';
const url=process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required');
const read=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const spec=read('../../../releases/v3/spec.json');
const config=configSchema.parse({tenant:`lean-painter-${randomUUID()}`,actors:[
  {token:'synthetic-lean-painter-P1-only',persona:'P1',user:{id:'P1',role:'physician'},modelId:1,patients:['painter-patient']},
  {token:'synthetic-lean-painter-P3-only',persona:'P3',user:{id:'P3',role:'rn'},modelId:3,patients:['painter-patient']},
],releases:Object.fromEntries(['P1','P3'].map(persona=>[persona,{spec,program:{...read(`../../../releases/v3/personas/${persona}.json`),patientSelection:true},workflows:{chart:{commit:persona==='P1'?'signNote':'chartAssessment',commits:['signOrders','markReviewed','chartAssessment'],project:true}}}]))});
const a=await host(url,config);
let closing=false;
async function close() {
  if (closing) return;closing=true;
  for (const table of ['commit_draft_checkpoints','commit_requests','commit_sessions','commit_events','commit_streams']) await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`,[config.tenant]);
  await a.close();
}
process.on('SIGTERM',()=>{void close();});
try {
  await migrate(a.db);
  const id='painter-patient';
  await a.store.importPatient({patient:id,modelId:1,context:{today:'2026-11-15',now:600,receipts:[],record:[],encounterId:'painter-enc'},bundle:{resourceType:'Bundle',type:'collection',entry:[
    {resource:{resourceType:'Patient',id,meta:{versionId:'1'},name:[{text:'Alex Painter',given:['Alex'],family:'Painter'}],identifier:[{system:'http://hospital.example/mrn',value:'PAINTER-001'}],birthDate:'1968-01-01',gender:'male'}},
    {resource:{resourceType:'Encounter',id:'painter-enc',meta:{versionId:'1'},status:'in-progress',class:{code:process.env.LEAN_PAINTER_TEST_PERSONA === 'P3' ? 'IMP' : 'AMB'},subject:{reference:`Patient/${id}`},period:{start:'2026-11-15T00:00:00Z'}}},
    {resource:{resourceType:'AllergyIntolerance',id:'painter-nka',meta:{versionId:'1'},patient:{reference:`Patient/${id}`},code:{coding:[{system:'http://snomed.info/sct',code:'716186003',display:'No known allergy'}]},clinicalStatus:{coding:[{code:'active'}]}}},
  ]}});
  process.stdout.write(JSON.stringify({base:a.base,tokens:Object.fromEntries(config.actors.map(actor=>[actor.persona,actor.token])),users:Object.fromEntries(config.actors.map(actor=>[actor.persona,{user:actor.user,persona:actor.persona,name:`Painter ${actor.persona}`}]))})+'\n');
} catch (error) {await close();throw error;}
