/** Declared provenance exclusions, inventoried in agent/src.
 * Clinical trace timestamps, simulated clock values and task order remain content.
 */
import { readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { sha256,stableStringify } from './program.js';
import { writeJson } from './util.js';
export const VOLATILE_FILES = [/^\.cache\//, /(^|\/)digest\.json$/, /\.tmp$/, /\.error\.json(?:\.gz)?$/, /^completion\//, /^infrastructure\//, /^recovery\//, /^screen-cache\//, /^reports\/screens\/.*\/output\.txt$/];
export const VOLATILE_FIELDS = [
 {file:/.*/,keys:['createdAt','startedAt','resumes']},
 {file:/(^|\/)manifest\.json$/,keys:['runId','parallel','personaWorkers','screenWorkersPerPersona','contentDigest','infrastructureRetries']},
 {file:/^(rebind|recovery)\//,keys:['timestamp']},
 {file:/^decisions\//,keys:['runId']},
 {file:/^(conformance\.json$|metrics\/)/,keys:['generatedAt']},
 {file:/^summary\.json$/,keys:['runId','dir']},
 {file:/^(certs|native|decisions|no-agent\/.*certificate)\//,keys:['time']},
 {file:/^no-agent\/.*\.certificate\.json$/,keys:['time']},
 {file:/^ehr\/.*-deploy-/,keys:['time']},
 {file:/\.build(?:\.\d+)?\.json$/,keys:['certificateSha256']},
 {file:/^ehr\/.*index\.jsonl$/,keys:['sha256']},
];
/** Temporary native/screen export directories are provenance, including in state labels. */
export const VOLATILE_TEMP_PREFIXES=['ehr','screens','screens-fake'] as const;
export function normalizeMetadataPaths(value:string,runDir:string):string {
 let normalized=value.replaceAll(runDir,'<RUN>');
 for(const root of new Set([tmpdir(),'/tmp']))for(const prefix of VOLATILE_TEMP_PREFIXES){
  const escaped=`${root}/${prefix}-`.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  normalized=normalized.replace(new RegExp(escaped+'[A-Za-z0-9]{6}(?=/|:|$)','g'),`<TMP>/${prefix}`);
 }
 return normalized;
}
export function canonicalContent(value:unknown,file:string,runDir:string):unknown {
 const keys=new Set(VOLATILE_FIELDS.filter(rule=>rule.file.test(file)).flatMap(rule=>rule.keys));
 const visit=(item:unknown):unknown=>{
  if(Array.isArray(item))return item.map(visit);
  if(item&&typeof item==='object')return Object.fromEntries(Object.entries(item).filter(([key])=>!keys.has(key)).map(([key,val])=>[key,visit(val)]));
  if(typeof item==='string')return normalizeMetadataPaths(item,runDir);
  return item;
 };return visit(value);
}
export interface ContentDigest { contentDigest:string; files:Record<string,{sha256:string;content?:unknown}> }
export async function contentDigest(dir:string,include:(file:string)=>boolean=()=>true,retainContent=false):Promise<ContentDigest>{
 const files:ContentDigest['files']={};
 async function walk(root:string):Promise<void>{
  for(const entry of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const absolute=path.join(root,entry.name),file=path.relative(dir,absolute);
   if(VOLATILE_FILES.some(pattern=>pattern.test(file)))continue;
   if(entry.isDirectory()){await walk(absolute);continue;}
   if(!entry.isFile())throw new Error(`Digest refuses symlink: ${file}`);
   if(!include(file))continue;
   const bytes=await readFile(absolute),text=(file.endsWith('.gz')?gunzipSync(bytes):bytes).toString();
   let value:unknown;
   if(file.endsWith('.jsonl'))value=text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(row=>!file.startsWith('ehr/')||row.ok).sort((a,b)=>String(a.file??'').localeCompare(String(b.file??'')));
   else if(/\.json(?:\.gz)?$/.test(file))value=JSON.parse(text);
   else if(/\.(txt|md|tsx?|html|css|svg)$/.test(file))value=text;
   else value={bytes:bytes.toString('base64')};
   const content=canonicalContent(value,file,dir);files[file]={sha256:sha256(stableStringify(content)),...(retainContent?{content}:{})};
  }
 }await walk(dir);
 return {contentDigest:sha256(stableStringify(Object.fromEntries(Object.entries(files).map(([file,entry])=>[file,entry.sha256])))),files};
}
export function firstDifference(left:ContentDigest,right:ContentDigest):string|null{
 const difference=(a:unknown,b:unknown,p:string):string|null=>{
  if(stableStringify(a)===stableStringify(b))return null;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
   for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()){
    const found=difference(Object.entries(a).find(([k])=>k===key)?.[1],Object.entries(b).find(([k])=>k===key)?.[1],`${p}.${key}`);if(found)return found;
   }
  }return `${p}: ${JSON.stringify(a)?.slice(0,180)} != ${JSON.stringify(b)?.slice(0,180)}`;
 };
 for(const file of [...new Set([...Object.keys(left.files),...Object.keys(right.files)])].sort()){
  if(left.files[file]?.sha256!==right.files[file]?.sha256)return `${file} ${difference(left.files[file]?.content,right.files[file]?.content,'$')}`;
 }return null;
}
export async function writeDayDigest(dir:string,day:number,personas:string[]):Promise<void>{
 const padded=String(day).padStart(2,'0'),prefix=`days/day-${padded}/`;
 const daily=(file:string)=>[prefix,`baselines/day-${padded}/`,`no-agent/days/day-${padded}/`,`training/day-${day}/`].some(p=>file.startsWith(p));
 const combined=await contentDigest(dir,daily);
 const perPersona=Object.fromEntries(await Promise.all(personas.map(async persona=>[persona,(await contentDigest(dir,file=>daily(file)&&path.basename(file).startsWith(persona+'.'))).contentDigest])));
 await writeJson(path.join(dir,prefix,'digest.json'),{schemaVersion:1,personas:perPersona,contentDigest:combined.contentDigest});
}

/** All clinicians' durable decisions and deploy pointers precede this fence. */
export async function writeNightDigest(dir:string,night:number,personas:string[]):Promise<void>{
 const prefix=`decisions/night-${String(night).padStart(2,'0')}/`;
 const digest=await contentDigest(dir,file=>file.startsWith(prefix));
 await writeJson(path.join(dir,'completion',`night-${String(night).padStart(2,'0')}.json`),{schemaVersion:1,night,personas,contentDigest:digest.contentDigest});
}
