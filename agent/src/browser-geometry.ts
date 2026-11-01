import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {z} from 'zod';
import {screenGeometrySchema,geometryProgramHash,geometryComponentsHash,type GeometryProvider} from './geometry.js';
import {compilePresentations} from './presentation-compiler.js';
import type {EhrClient} from './ehr.js';
import {REPO_ROOT} from './util.js';
export function browserGeometry(ehr:EhrClient,bundles:string[]|((input:Parameters<GeometryProvider>[0])=>string[]),cache:string){
 const child=spawn(process.execPath,[path.join(REPO_ROOT,'app/scripts/geometry-browser.mjs')],{cwd:REPO_ROOT,env:{...process.env,EHR_GEOMETRY_CACHE:cache},stdio:['pipe','pipe','inherit']});
 let sequence=0;const waiting=new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void}>();
 const lines=createInterface({input:child.stdout});lines.on('line',line=>{try{const data=z.object({id:z.number()}).passthrough().parse(JSON.parse(line));const p=waiting.get(data.id);if(p){waiting.delete(data.id);p.resolve(data);}}catch{/* Vite startup output is not a response. */}});
 child.on('exit',code=>{for(const p of waiting.values())p.reject(new Error(`Geometry browser exited ${code}`));waiting.clear();});
 const provider:GeometryProvider=async input=>{
  const dir=await mkdtemp(path.join(tmpdir(),'geometry-render-'));
  try{
   const files:string[]=[];for(const [i,bundle]of (typeof bundles==='function'?bundles(input):bundles).entries())files.push(...await ehr.renderScreens({specVersion:input.specVersion,program:input.program,fhir:bundle,ui:true,outDir:path.join(dir,`b${i}`),...(i===0&&input.schedule&&input.worldDir?{workspace:{schedule:input.schedule,worldDir:input.worldDir}}:{})}));
   const id=++sequence;const response=await new Promise<unknown>((resolve,reject)=>{waiting.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,files,bundle:compilePresentations(input.program)})+'\n');});
   const data=z.object({error:z.string().optional(),appSha256:z.string().optional(),states:z.array(screenGeometrySchema).optional()}).parse(response);
   if(data.error||!data.states||!data.appSha256)throw new Error(data.error??'No browser geometry');
   return {schemaVersion:1,programHash:geometryProgramHash(input.program),componentsSha256:geometryComponentsHash(input.program),appSha256:data.appSha256,viewport:{width:1440,height:900},states:data.states,source:'chromium'};
  }finally{await rm(dir,{recursive:true,force:true});}
 };
 return {provider,close:()=>new Promise<void>((resolve)=>{child.on('exit',()=>resolve());child.stdin.end();})};
}
