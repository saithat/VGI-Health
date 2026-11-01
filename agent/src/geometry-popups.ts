/** Supplement representative native exports with possible alert-popup states.
 * Uses the existing native facts/init/render-ui APIs; never changes programs or rules.
 */
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {expandProgram} from './composites.js';
import {isRecord} from './jsonpatch.js';
import {specSchema,type Program} from './schema.js';
import {writeJson} from './util.js';
function jsonCommand(binary:string,command:string,input:unknown):Promise<unknown>{return new Promise((resolve,reject)=>{
 const child=spawn(binary,[command],{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',(d:Buffer)=>{stdout+=d.toString();});child.stderr.on('data',(d:Buffer)=>{stderr+=d.toString();});child.on('error',reject);child.on('close',code=>{if(code!==0)reject(new Error(`Native ${command}: ${stderr}`));else{try{resolve(JSON.parse(stdout));}catch(error){reject(error);}}});child.stdin.end(JSON.stringify(input));
});}
export async function exportPopupGeometry(binary:string,input:{program:Program;specFile:string;fhir:string;outDir:string}):Promise<void>{
 const spec=await readFile(input.specFile,'utf8').then(s=>specSchema.parse(JSON.parse(s))),program=expandProgram(input.program);
 const targets=program.screens.flatMap(screen=>screen.components.flatMap(component=>{
  const kind:unknown=component.kind;if(!isRecord(kind)||!isRecord(kind['alert']))return [];
  const payload=kind['alert'],id=payload['alert'];
  return typeof id==='string'&&spec.alerts.some(a=>a.id===id&&(a.tier==='interruptive'||a.tier==='removable'&&payload['popup']===true))?[{screen:screen.id,id}]:[];
 }));
 if(!targets.length)return;
 const bundle=JSON.parse(await readFile(input.fhir,'utf8'));
 const index=z.object({referenceDate:z.string()}).parse(JSON.parse(await readFile(path.join(path.dirname(input.fhir),'index.json'),'utf8').catch(()=>readFile(path.join(import.meta.dirname,'../../fixtures/synthea/index.json'),'utf8'))));
 const projection=z.object({facts:z.unknown(),display:z.unknown()}).parse(await jsonCommand(binary,'facts',{bundle,context:{today:index.referenceDate,now:0,record:[],receipts:[]}}));
 const user={id:program.owner,role:program.role};
 const state=z.record(z.string(),z.unknown()).parse(await jsonCommand(binary,'init',{spec,program,facts:projection.facts,user}));
 for(const target of targets){
  const ui=await jsonCommand(binary,'render-ui',{spec,program,facts:projection.facts,display:projection.display,user,state:{...state,screen:target.screen,popup:[target.id,'geometry-probe']}});
  const name=`${target.screen}-popup-${target.id}-geometry.json`;if(!/^[\w.-]+$/.test(name))throw new Error('Unsafe geometry output path');
  await writeJson(path.join(input.outDir,name),ui);
 }
}
