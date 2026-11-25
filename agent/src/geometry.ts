import {publishReplayPointer, taskSlots} from './replay-pool.js';
import {designOf} from './layout-design.js';
import { BOUNDED_POINT_ASSUMPTION, projectBoundedPoints } from '../../app/src/dashboard/bounded-pointing.js';
import { measuredPointingTrace } from '../../app/src/dashboard/trajectory-travel.js';
import {z} from 'zod';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pointerTravel,pointerSteps,type GeometryAtlas} from '../../app/src/metrics/geometry.js';
import {expandProgram} from './composites.js';
import {sha256,stableStringify} from './program.js';
import {writeJson} from './util.js';
import {readStoredGeometry} from './geometry-format.mjs';
import {readGeometryJson} from './geometry-json.mjs';
import {saveGeometry,geometryResultKey} from './geometry-store.js';
import type {EhrClient,CheckInput,SimulateInput} from './ehr.js';
import type {DayResult,Program} from './schema.js';
const point=z.object({x:z.number().finite(),y:z.number().finite()});
const bounds=point.extend({w:z.number().nonnegative(),h:z.number().nonnegative()});
export const screenGeometrySchema=z.object({screen:z.string(),state:z.string(),sample:z.string().exactOptional(),viewport:z.object({width:z.number(),height:z.number()}),components:z.record(z.string(),z.object({center:point,reveal:point,chain:z.array(z.string()),offsets:z.record(z.string(),point),bounds:bounds.exactOptional(),clips:z.record(z.string(),bounds).exactOptional()})),scrollers:z.record(z.string(),z.object({maxX:z.number(),maxY:z.number(),width:z.number(),height:z.number()}))});
export const geometryAtlasSchema=z.object({schemaVersion:z.literal(1),programHash:z.string(),componentsSha256:z.string().exactOptional(),appSha256:z.string(),viewport:z.object({width:z.literal(1440),height:z.literal(900)}),states:z.array(screenGeometrySchema),aliases:z.record(z.string(),z.array(z.string())).exactOptional(),source:z.enum(['chromium','recorded-fixture']),traceTargets:z.record(z.string(),z.string()).exactOptional()});
export const geometryProgramHash=(program:Program)=>sha256(stableStringify(expandProgram(program)));
export const geometryComponentsHash=(program:Program)=>sha256(stableStringify(designOf(program)?.length?{components:[],layouts:designOf(program)}:[]));
export const geometryCacheKey=(program:Program)=>`${geometryProgramHash(program)}:${geometryComponentsHash(program)}`;
export type GeometryProvider=(input:Pick<CheckInput,'specVersion'|'program'> & Partial<Pick<SimulateInput,'schedule'|'worldDir'>> & {result?:DayResult})=>Promise<GeometryAtlas|null>;
// The measurement reads its exact atlas once more for per-screen attribution.
const replayAtlases = new WeakMap<DayResult, GeometryAtlas & {traceTargets?:Record<string,string>}>();
export function takeReplayAtlas(result: DayResult) {
 const atlas = replayAtlases.get(result);
 replayAtlases.delete(result);
 return atlas;
}
export function attachGeometry(result:DayResult,atlas:GeometryAtlas):DayResult{
 const metadata=z.object({traceTargets:z.record(z.string(),z.string()).exactOptional()}).parse(atlas);
 const {trace,bounded}=measuredPointingTrace(result.trace,{...atlas,...metadata},result);
 const costs=pointerTravel(trace,atlas,result.day);
 return {...result,...(bounded ? {complaints:[...new Set([...result.complaints,BOUNDED_POINT_ASSUMPTION])]}:{}),geometry:{programHash:atlas.programHash,...(atlas.componentsSha256?{componentsSha256:atlas.componentsSha256}:{}),appSha256:atlas.appSha256,source:atlas.source,viewport:atlas.viewport,missingTargets:Object.values(costs).flatMap(c=>c.missingTargets)},tasks:result.tasks.map(t=>{
  const cost=costs[t.task];return {...t,rawScrolls:t.rawScrolls??t.scrolls,mouseTravelPx:cost?.mouseTravelPx??null,scrollPx:cost?.scrollPx??null,...(cost?{scrolls:cost.scrolls}:{})};
 })};
}
/** Specification (owner approved 2026-11-25): target-reveal counts are computed from
 * admitted geometry, then paid by the native simulator before each action.
 * A fixed point is required: time can change receipts, interruptions and paths.
 * Discovery passes are never returned as measured results. */
export function geometryScrollPlan(result:DayResult, atlas:GeometryAtlas & {traceTargets?:Record<string,string>}):NonNullable<SimulateInput['scrollPlan']>{
 const {trace}=measuredPointingTrace(result.trace,atlas,result);
 const steps=pointerSteps(trace,atlas,result.day), indices=new Map<string,number>();
 const plan:NonNullable<SimulateInput['scrollPlan']>=[];
 for(const [i,row] of result.trace.entries()){
  if('scroll' in row.event)continue;
  const index=indices.get(row.task)??0;indices.set(row.task,index+1);
  const step=steps[i];
  if(!step || step.scrollPx===null)throw Error('Target scrolling requires complete admitted geometry');
  if(step.scrolls)plan.push({task:row.task,index,event:row.event,scrolls:step.scrolls});
 }
 return plan;
}
export async function convergeScrollGeometry(
 inner:EhrClient,input:SimulateInput,
 measure:(result:DayResult)=>Promise<{result:DayResult;atlas:GeometryAtlas & {traceTargets?:Record<string,string>}}>,
):Promise<DayResult>{
 let scrollPlan:NonNullable<SimulateInput['scrollPlan']>=[];
 const seen=new Set<string>();
 for(let pass=0;pass<8;pass++){
  const raw=await inner.simulate({...input,scrollPlan});
  const measured=await measure(raw),next=geometryScrollPlan(raw,measured.atlas);
  const key=stableStringify(next);
  if(key===stableStringify(scrollPlan)){
   const indices=new Map<string,number>();
   const paid:NonNullable<SimulateInput['scrollPlan']>=[];
   for(const row of raw.trace){
    if('scroll' in row.event)continue;
    const index=indices.get(row.task)??0;indices.set(row.task,index+1);
    const scrolls=row.ops.filter(op=>op==='scroll').length;
    if(scrolls)paid.push({task:row.task,index,event:row.event,scrolls});
   }
   if(stableStringify(paid)!==key)throw Error('Native target scrolling did not match admitted geometry');
   return measured.result;
  }
  if(seen.has(key))throw Error('Geometry scroll plan oscillated; refusing unpriced replay');
  seen.add(key);scrollPlan=next;
 }
 throw Error('Geometry scroll plan did not converge; refusing unpriced replay');
}
/** Native transcripts remain in the command journal; enriched results name their geometry atlas. */
export function geometryEhr(inner:EhrClient,provider:GeometryProvider,dir:string,traceAware=false):EhrClient{
 // Only in-flight calls live here. Completed captures are read through the disk
 // store, so repeated validation calls reuse evidence without retaining trees.
 const pendingCaptures=new Map<string,Promise<GeometryAtlas|null>>();
 const directory=path.join(dir,'geometry');
 return {mode:inner.mode,binary:inner.binary,check:i=>inner.check(i),deploy:i=>inner.deploy(i),renderScreens:i=>inner.renderScreens(i),minClicks:i=>inner.minClicks(i),runBatch:i=>inner.runBatch(i),specExport:i=>inner.specExport(i),async simulate(input){
  const measure=async(result:DayResult)=>{
  const hash=geometryProgramHash(input.program),components=geometryComponentsHash(input.program);
  const base=path.join(directory,`${hash}.${components}`);
  const key=sha256(geometryCacheKey(input.program)+`:${input.worldDir}:${sha256(stableStringify(input.schedule))}${traceAware?`:${sha256(stableStringify(result.trace))}`:''}`);
  const captureFile=path.join(base,'captures',`${key}.json`);
  let pending=pendingCaptures.get(key);
  if(!pending){
   pending=(async()=>{
    if(existsSync(captureFile))return loadGeometry(captureFile,undefined,directory);
    const captured=await provider({...input,...(traceAware?{result}:{})});
    if(captured){
     if(captured.programHash!==hash)throw new Error('Geometry atlas belongs to another executable');
     await writeJson(captureFile,await saveGeometry(directory,{...captured,componentsSha256:components},`capture:${key}`));
    }
    return captured;
   })();
   pendingCaptures.set(key,pending);
  }
  let captured:GeometryAtlas|null;
  try{captured=await pending;}finally{if(pendingCaptures.get(key)===pending)pendingCaptures.delete(key);}
  if(!captured)throw Error('Target scrolling requires admitted geometry');
  const aliases:Record<string,string[]>={};
  for(const screen of expandProgram(input.program).screens)for(const component of screen.components){
   const kind:unknown=component.kind;
   if(kind&&typeof kind==='object'&&'alert' in kind){
    const parsed=z.object({alert:z.object({alert:z.string()})}).safeParse(kind);
    if(parsed.success)(aliases[parsed.data.alert.alert]??=[]).push(component.id);
   }
  }
  const measured=projectBoundedPoints(result,expandProgram(input.program),{...captured,aliases});
  const atlas={...measured,componentsSha256:components};
  const resultKey=geometryResultKey(result);
  const pointer=await saveGeometry(directory,atlas,`result:${key}:${resultKey}`);
  for (const file of [path.join(base,'results',`${resultKey}.json`), path.join(base,'days',`${result.day}.json`),
    path.join(directory,`${hash}.${components}.json`),path.join(directory,`${hash}.json`)]) {
    await publishReplayPointer(file, () => writeJson(file,pointer));
  }
  const enriched = attachGeometry(result,atlas);
  if(taskSlots.getStore()) replayAtlases.set(enriched,atlas);
  return {result:enriched,atlas};
  };
  if(inner.mode==='real'){
   if((input.policy??input.persona.policy)==='bounded'){
    const expertInput={...input};delete expertInput.memory;
    let expertScrollPlan:NonNullable<SimulateInput['scrollPlan']>=[];
    await convergeScrollGeometry(inner,{...expertInput,policy:'expert'},async raw=>{
     const measured=await measure(raw);expertScrollPlan=geometryScrollPlan(raw,measured.atlas);return measured;
    });
    return convergeScrollGeometry(inner,{...input,expertScrollPlan},measure);
   }
   return convergeScrollGeometry(inner,input,measure);
  }
  return (await measure(await inner.simulate(input))).result;
 }};
}
export async function loadGeometry(file:string,result?:Pick<DayResult,'day'|'persona'|'trace'|'observations'>,directory?:string){
 return geometryAtlasSchema.parse(await readStoredGeometry(file,async current=>current===file?readGeometryJson(file):JSON.parse(await readFile(current,'utf8')),result?{resultKey:geometryResultKey(result)}:undefined,directory));
}
export async function loadGeometryDay(file:string,day:number){
 return geometryAtlasSchema.parse(await readStoredGeometry(file,async current=>current===file?readGeometryJson(file):JSON.parse(await readFile(current,'utf8')),{day}));
}
