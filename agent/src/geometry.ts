import {z} from 'zod';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pointerTravel,type GeometryAtlas} from '../../app/src/metrics/geometry.js';
import {compilePresentations} from './presentation-compiler.js';
import {expandProgram} from './composites.js';
import {sha256,stableStringify} from './program.js';
import {writeJson} from './util.js';
import type {EhrClient,CheckInput,SimulateInput} from './ehr.js';
import type {DayResult,Program} from './schema.js';
const point=z.object({x:z.number().finite(),y:z.number().finite()});
export const screenGeometrySchema=z.object({screen:z.string(),state:z.string(),sample:z.string().exactOptional(),viewport:z.object({width:z.number(),height:z.number()}),components:z.record(z.string(),z.object({center:point,reveal:point,chain:z.array(z.string()),offsets:z.record(z.string(),point)})),scrollers:z.record(z.string(),z.object({maxX:z.number(),maxY:z.number(),width:z.number(),height:z.number()}))});
export const geometryAtlasSchema=z.object({schemaVersion:z.literal(1),programHash:z.string(),componentsSha256:z.string().exactOptional(),appSha256:z.string(),viewport:z.object({width:z.literal(1440),height:z.literal(900)}),states:z.array(screenGeometrySchema),aliases:z.record(z.string(),z.array(z.string())).optional(),source:z.enum(['chromium','recorded-fixture'])});
export const geometryProgramHash=(program:Program)=>sha256(stableStringify(expandProgram(program)));
export const geometryComponentsHash=(program:Program)=>sha256(stableStringify(compilePresentations(program)??[]));
export const geometryCacheKey=(program:Program)=>`${geometryProgramHash(program)}:${geometryComponentsHash(program)}`;
export type GeometryProvider=(input:Pick<CheckInput,'specVersion'|'program'> & Partial<Pick<SimulateInput,'schedule'|'worldDir'>>)=>Promise<GeometryAtlas|null>;
export function attachGeometry(result:DayResult,atlas:GeometryAtlas):DayResult{
 const costs=pointerTravel(result.trace,atlas,result.day);
 return {...result,geometry:{programHash:atlas.programHash,...(atlas.componentsSha256?{componentsSha256:atlas.componentsSha256}:{}),appSha256:atlas.appSha256,source:atlas.source,viewport:atlas.viewport,missingTargets:Object.values(costs).flatMap(c=>c.missingTargets)},tasks:result.tasks.map(t=>{
  const cost=costs[t.task];return {...t,rawScrolls:t.rawScrolls??t.scrolls,mouseTravelPx:cost?.mouseTravelPx??null,scrollPx:cost?.scrollPx??null,...(cost?{scrolls:cost.scrolls}:{})};
 })};
}
/** Native transcripts remain in the command journal; enriched results name their geometry atlas. */
export function geometryEhr(inner:EhrClient,provider:GeometryProvider,dir:string):EhrClient{
 const cache=new Map<string,Promise<GeometryAtlas|null>>();
 const collected=new Map<string,GeometryAtlas>();
 return {mode:inner.mode,binary:inner.binary,check:i=>inner.check(i),deploy:i=>inner.deploy(i),renderScreens:i=>inner.renderScreens(i),minClicks:i=>inner.minClicks(i),runBatch:i=>inner.runBatch(i),specExport:i=>inner.specExport(i),async simulate(input){
  const result=await inner.simulate(input),hash=geometryProgramHash(input.program);
  const key=geometryCacheKey(input.program)+`:${input.worldDir}:${input.schedule.day}`;let pending=cache.get(key);if(!pending){pending=provider(input);cache.set(key,pending);}
  const captured=await pending;if(!captured)return result;
  const aliases:Record<string,string[]>={};
  for(const screen of expandProgram(input.program).screens)for(const component of screen.components){
   const kind:unknown=component.kind;
   if(kind&&typeof kind==='object'&&'alert' in kind){
    const parsed=z.object({alert:z.object({alert:z.string()})}).safeParse(kind);
    if(parsed.success)(aliases[parsed.data.alert.alert]??=[]).push(component.id);
   }
  }
  const prior=collected.get(geometryCacheKey(input.program));
  const atlas={...captured,states:[...(prior?.states??[]),...captured.states.filter(state=>!prior?.states.some(old=>old.state===state.state&&old.sample===state.sample))],componentsSha256:geometryComponentsHash(input.program),aliases};
  collected.set(geometryCacheKey(input.program),atlas);
  if(atlas.programHash!==hash)throw new Error('Geometry atlas belongs to another executable');
  await mkdir(path.join(dir,'geometry'),{recursive:true});await writeJson(path.join(dir,'geometry',`${hash}.${atlas.componentsSha256}.json`),atlas);await writeJson(path.join(dir,'geometry',`${hash}.json`),atlas);
  return attachGeometry(result,atlas);
 }};
}
export async function loadGeometry(file:string){return geometryAtlasSchema.parse(JSON.parse(await readFile(file,'utf8')));}
