/** Synthetic full-release service for the DOM painter's browser regressions.
 * Auth transport alone is substituted; native replay and Postgres are real. */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import { host } from './helpers.ts';
import { migrate } from '../src/store.ts';
import { configSchema } from '../src/types.ts';
const url=process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required');
const read=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const spec=read('../../../releases/v3/spec.json');
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'painter-test',alg:'RS256',use:'sig'};
const issuerHost=createServer((_request,response)=>{response.setHeader('Content-Type','application/json');response.end(JSON.stringify({keys:[jwk]}));});
issuerHost.listen(0,'127.0.0.1');await once(issuerHost,'listening');
const address=issuerHost.address();if(!address||typeof address==='string')throw Error('Missing issuer port');
const issuer=`http://127.0.0.1:${address.port}`;
// New specification for owner review: optional allergy evidence exercises an
// interruptive alert and its severity plot in one occurrence through real replay.
const alertFixture=process.env.LEAN_PAINTER_TEST_ALERT === '1';
const scheduledTime=new Date().toISOString().slice(0,13)+':00:00Z';
const config=configSchema.parse({tenant:`lean-painter-${randomUUID()}`,
  oidc:{issuer,audience:'vgi-commit',clientId:'vgi-mar'},
  // New specification for owner review: a second, independently authenticated
  // nurse (RN2) and a high-alert dose on its own patient exercise cosigning.
  actors:['P1','P2','P3','RN2'].map((persona,i)=>({subject:persona,persona,user:{id:persona,role:persona==='P3'||persona==='RN2'?'rn':'physician'},modelId:i+1,patients:['painter-patient','painter-second','painter-high']})),
  releases:{...Object.fromEntries(['P1','P2','P3'].map(persona=>[persona,{spec,program:{...read(`../../../releases/v3/personas/${persona}.json`),patientSelection:true},workflows:{chart:{commit:persona==='P3'?'chartAssessment':'signNote',commits:['signOrders','markReviewed','chartAssessment'],project:true}}}])),
    ...(process.env.LEAN_PAINTER_TEST_PERSONA === 'P3' ? {mar:{spec,program:{...read('../../../releases/v3/personas/P3.json'),patientSelection:false},workflows:{dose:{commit:'administerMed',shared:{kind:'dose',order:9,occurrence:600},mar:{patient:'painter-patient',medicationRequest:'painter-order',encounter:'painter-enc',scheduledTime}},
      high:{commit:'administerMed',shared:{kind:'dose',order:10,occurrence:600},mar:{patient:'painter-high',medicationRequest:'painter-insulin',encounter:'painter-high-enc',scheduledTime}}}}} : {})
  }});
const tokens=Object.fromEntries(await Promise.all(config.actors.map(async actor=>[actor.persona,await new SignJWT({typ:'Bearer',azp:'vgi-mar',sid:`painter-${actor.persona}`,persona:actor.persona,name:`Painter ${actor.persona}`,realm_access:{roles:[actor.user.role]}}).setProtectedHeader({alg:'RS256',kid:'painter-test'}).setSubject(actor.user.id).setIssuer(issuer).setAudience('vgi-commit').setIssuedAt().setExpirationTime('30m').sign(privateKey)])));

const a=await host(url,config);
let closing=false;
async function close() {
  if (closing) return;closing=true;
  for (const table of ['commit_mar_cosigns','commit_draft_checkpoints','commit_requests','commit_sessions','commit_events','commit_streams']) await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`,[config.tenant]);
  await a.close();
  await new Promise<void>((resolve,reject)=>issuerHost.close(error=>error?reject(error):resolve()));
}
process.on('SIGTERM',()=>{void close();});
try {
  await migrate(a.db);
  const id='painter-patient';
  await a.store.importPatient({patient:id,modelId:1,context:{today:'2026-11-15',now:600,receipts:[],record:[],encounterId:'painter-enc'},bundle:{resourceType:'Bundle',type:'collection',entry:[
    {resource:{resourceType:'Patient',id,meta:{versionId:'1'},name:[{text:'Alex Painter',given:['Alex'],family:'Painter'}],identifier:[{system:'http://hospital.example/mrn',value:'PAINTER-001'}],birthDate:'1968-01-01',gender:'male'}},
    {resource:{resourceType:'Encounter',id:'painter-enc',meta:{versionId:'1'},status:'in-progress',class:{code:process.env.LEAN_PAINTER_TEST_PERSONA === 'P3' ? 'IMP' : process.env.LEAN_PAINTER_TEST_PERSONA === 'P2' ? 'EMER' : 'AMB'},subject:{reference:`Patient/${id}`},period:{start:'2026-11-15T00:00:00Z'}}},
    {resource:{resourceType:'MedicationRequest',id:'painter-order',meta:{versionId:'1'},status:'active',intent:'order',subject:{reference:`Patient/${id}`},encounter:{reference:'Encounter/painter-enc'},medicationCodeableConcept:{text:'amoxicillin'},dosageInstruction:[{timing:{event:[scheduledTime]},route:{text:'PO'},doseAndRate:[{doseQuantity:{value:500,unit:'mg'}}]}]}},
    {resource:{resourceType:'AllergyIntolerance',id:'painter-nka',meta:{versionId:'1'},patient:{reference:`Patient/${id}`},code:{coding:[alertFixture?{system:'http://www.nlm.nih.gov/research/umls/rxnorm',code:'7980',display:'Penicillin'}:{system:'http://snomed.info/sct',code:'716186003',display:'No known allergy'}]},clinicalStatus:{coding:[{code:'active'}]}}},
  ]}});
  await a.store.importPatient({patient:'painter-second',modelId:2,context:{today:'2026-11-15',now:600,receipts:[],record:[],encounterId:'painter-second-enc'},bundle:{resourceType:'Bundle',type:'collection',entry:[
    {resource:{resourceType:'Patient',id:'painter-second',meta:{versionId:'1'},name:[{text:'Blair Painter',given:['Blair'],family:'Painter'}],identifier:[{system:'http://hospital.example/mrn',value:'PAINTER-002'}],birthDate:'1972-01-01',gender:'female'}},
    {resource:{resourceType:'Encounter',id:'painter-second-enc',meta:{versionId:'1'},status:'in-progress',class:{code:'EMER'},subject:{reference:'Patient/painter-second'},period:{start:'2026-11-15T00:00:00Z'}}}
  ]}});
  if (process.env.LEAN_PAINTER_TEST_PERSONA === 'P3') await a.store.importPatient({patient:'painter-high',modelId:3,context:{today:'2026-11-15',now:600,receipts:[],record:[],encounterId:'painter-high-enc'},bundle:{resourceType:'Bundle',type:'collection',entry:[
    {resource:{resourceType:'Patient',id:'painter-high',meta:{versionId:'1'},name:[{text:'Casey Painter',given:['Casey'],family:'Painter'}],identifier:[{system:'http://hospital.example/mrn',value:'PAINTER-003'}],birthDate:'1960-01-01',gender:'female'}},
    {resource:{resourceType:'Encounter',id:'painter-high-enc',meta:{versionId:'1'},status:'in-progress',class:{code:'IMP'},subject:{reference:'Patient/painter-high'},period:{start:'2026-11-15T00:00:00Z'}}},
    {resource:{resourceType:'MedicationRequest',id:'painter-insulin',meta:{versionId:'1'},status:'active',intent:'order',subject:{reference:'Patient/painter-high'},encounter:{reference:'Encounter/painter-high-enc'},medicationCodeableConcept:{text:'insulin lispro'},dosageInstruction:[{timing:{event:[scheduledTime]},route:{text:'SC'},doseAndRate:[{doseQuantity:{value:4,unit:'units'}}]}]}},
    {resource:{resourceType:'AllergyIntolerance',id:'painter-high-nka',meta:{versionId:'1'},patient:{reference:'Patient/painter-high'},code:{coding:[{system:'http://snomed.info/sct',code:'716186003',display:'No known allergy'}]},clinicalStatus:{coding:[{code:'active'}]}}},
  ]}});
  process.stdout.write(JSON.stringify({base:a.base,tokens,users:Object.fromEntries(config.actors.map(actor=>[actor.persona,{user:actor.user,persona:actor.persona,name:`Painter ${actor.persona}`}]))})+'\n');
} catch (error) {await close();throw error;}
