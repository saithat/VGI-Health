/** Supplement representative native exports with possible alert-popup states.
 * Uses the existing native facts/init/render-ui APIs; never changes programs or rules.
 */
import {runNative,runNativeJsonBatch} from './native-process.js';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {expandProgram} from './composites.js';
import {isRecord} from './jsonpatch.js';
import {specSchema,type Program} from './schema.js';
import {writeJson} from './util.js';
async function jsonCommand(binary:string,command:string,input:unknown):Promise<unknown>{
 const result=await runNative(binary,[command],{input:JSON.stringify(input)});
 if(result.code!==0)throw new Error(`Native ${command}: ${result.stderr}`);
 return JSON.parse(result.stdout);
}

export async function exportPopupGeometry(binary:string,input:{program:Program;specFile:string;fhir:string;outDir:string}):Promise<void>{
 const spec=await readFile(input.specFile,'utf8').then(s=>specSchema.parse(JSON.parse(s))),program=expandProgram(input.program);
 const explicit=program.screens.flatMap(screen=>screen.components.flatMap(component=>{
  const kind:unknown=component.kind;if(!isRecord(kind)||!isRecord(kind['alert']))return [];
  const payload=kind['alert'],id=payload['alert'];
  return typeof id==='string'&&spec.alerts.some(a=>a.id===id&&(a.tier==='interruptive'||a.tier==='removable'&&payload['popup']===true))?[{screen:screen.id,id}]:[];
 }));
 // Alerts raised while composing remain real modal controls on the signing screen.
 const signing=program.screens.filter(screen=>screen.components.some(component=>{
  const kind:unknown=component.kind;return isRecord(kind)&&isRecord(kind['button'])&&isRecord(kind['button']['action'])&&'commit' in kind['button']['action'];
 })).flatMap(screen=>spec.alerts.filter(alert=>alert.tier==='interruptive'&&(!alert.screens.length||alert.screens.includes(screen.workflow))).map(alert=>({screen:screen.id,id:alert.id})));
 const targets=[...new Map([...explicit,...signing].map(target=>[`${target.screen}:${target.id}`,target])).values()];
 if(!targets.length)return;
 const bundle=JSON.parse(await readFile(input.fhir,'utf8'));
 const index=z.object({referenceDate:z.string()}).parse(JSON.parse(await readFile(path.join(path.dirname(input.fhir),'index.json'),'utf8').catch(()=>readFile(path.join(import.meta.dirname,'../../fixtures/synthea/index.json'),'utf8'))));
 const projection=z.object({facts:z.unknown(),display:z.unknown()}).parse(await jsonCommand(binary,'facts',{bundle,worldContext:bundle,context:{today:index.referenceDate,now:0,record:[],receipts:[]}}));
 const user={id:program.owner,role:program.role};
 let state=z.record(z.string(),z.unknown()).parse(await jsonCommand(binary,'init',{spec,program,facts:projection.facts,user}));
 if('patientSelection' in program&&program.patientSelection===true){
  const facts=z.record(z.string(),z.unknown()).parse(projection.facts);
  const directory=z.object({patients:z.array(z.object({id:z.string(),name:z.string(),mrn:z.string()}))}).parse(facts['patientDirectory']);
  const patient=directory.patients.find(p=>p.id===facts['sourcePatientId']);if(!patient)throw new Error('Geometry source patient missing');
  for(const event of [{enter:{comp:'workspace.search',value:{text:{s:patient.mrn||patient.name}}}},{click:{comp:`workspace.open|${patient.id}|0|lookup`}},{scroll:{screen:String(state['screen'])}}]){
   const result=z.object({state:z.record(z.string(),z.unknown())}).parse(await jsonCommand(binary,'step',{spec,program,facts:projection.facts,user,state,event}));state=result.state;
  }
 }
 const rendered=await runNativeJsonBatch(binary,targets.map(target=>({op:'render-screen',input:{spec,program,facts:projection.facts,display:projection.display,user,state:{...state,screen:target.screen,popup:[target.id,'geometry-probe']}}})));
 for(const [index,target] of targets.entries()){
  const ui=z.object({screen:z.unknown()}).parse(rendered[index]).screen;
  const name=`${target.screen}-popup-${target.id}-geometry.json`;if(!/^[\w.-]+$/.test(name))throw new Error('Unsafe geometry output path');
  await writeJson(path.join(input.outDir,name),ui);
 }
}
