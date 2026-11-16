import { durableWriteCompleted } from './crash-hook.js';
import { mkdir, readFile, writeFile, rename, rm, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';

/** Repository root (agent/src/util.ts -> ../..). */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Resolve a user-supplied path against the directory pnpm was invoked from. */
export function resolveUserPath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.env['INIT_CWD'] ?? process.cwd(), p);
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await writeJsonAtomic(file, value);
}

export async function readJson<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T>> {
  const text = await readFile(file, 'utf8');
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`${file}: ${first ? `${first.path.join('.')}: ${first.message}` : 'invalid'}`);
  }
  return parsed.data;
}

export async function readJsonIfExists<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T> | null> {
  return existsSync(file) ? readJson(file, schema) : null;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Small deterministic PRNG (mulberry32) so runs are reproducible from a seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string (FNV-1a), for seeding per-(night, persona) RNGs. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** A same-directory rename is the single publication point; readers see old or new JSON. */
export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await writeChunksAtomic(file,jsonChunks(value));
}
export async function writeJsonCompactAtomic(file:string,value:unknown):Promise<void>{
  function* chunks(){yield* jsonChunks(value,false);yield '\n';}
  await writeChunksAtomic(file,chunks());
}

/** Match JSON.stringify(value, null, 2), with bounded output buffering. A large
 * array no longer needs a second complete, contiguous V8 string. */
export function* jsonChunks(value:unknown,pretty=true):Generator<string> {
  const ancestors=new Set<object>();
  const prepare=(item:unknown,key:string):unknown=>{
    if(item&&(typeof item==='object'||typeof item==='function')&&'toJSON' in item&&typeof item.toJSON==='function')item=item.toJSON(key);
    if(item instanceof Number||item instanceof String||item instanceof Boolean)return item.valueOf();
    return item;
  };
  function* visit(item:unknown,depth:number):Generator<string>{
    if(!item||typeof item!=='object'){yield JSON.stringify(item)??'null';return;}
    if(ancestors.has(item))throw new TypeError('Converting circular structure to JSON');
    ancestors.add(item);
    const newline=pretty?'\n':'',indent=pretty?'  '.repeat(depth+1):'',close=pretty?'  '.repeat(depth):'';
    if(Array.isArray(item)){
      yield '[';
      for(let i=0;i<item.length;i++){
        yield (i?',':'')+newline+indent;
        yield* visit(prepare(item[i],String(i)),depth+1);
      }
      yield item.length?newline+close+']':']';
    }else{
      yield '{';let count=0;
      for(const name of Object.keys(item)){
        const child=prepare(Reflect.get(item,name),name);
        if(child===undefined||typeof child==='function'||typeof child==='symbol')continue;
        yield (count++?',':'')+newline+indent+JSON.stringify(name)+(pretty?': ':':');
        yield* visit(child,depth+1);
      }
      yield count?newline+close+'}':'}';
    }
    ancestors.delete(item);
  }
  const prepared=prepare(value,'');
  if(prepared===undefined||typeof prepared==='function'||typeof prepared==='symbol')yield 'undefined';
  else yield* visit(prepared,0);
  if(pretty)yield '\n';
}

async function writeChunksAtomic(file:string,chunks:Iterable<string>):Promise<void>{
  await mkdir(path.dirname(file),{recursive:true});
  const temporary=`${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try{
    const handle=await open(temporary,'wx');
    try{
      let buffer='',bytes=0;
      for(const chunk of chunks){
        buffer+=chunk;bytes+=Buffer.byteLength(chunk);
        if(bytes>=65536){await handle.writeFile(buffer);buffer='';bytes=0;}
      }
      if(buffer)await handle.writeFile(buffer);
      await handle.sync();
    }finally{await handle.close();}
    await rename(temporary,file);
    const directory=await open(path.dirname(file),'r');
    try{await directory.sync();}finally{await directory.close();}
    durableWriteCompleted(file);
  }finally{await rm(temporary,{force:true});}
}

export async function writeFileAtomic(file:string,content:string|Uint8Array):Promise<void>{
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    const handle = await open(temporary, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, file);
    const directory = await open(path.dirname(file), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
    durableWriteCompleted(file);
  } finally {
    await rm(temporary, { force: true });
  }
}
