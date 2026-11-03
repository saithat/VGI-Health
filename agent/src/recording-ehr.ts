/** Idempotent, content-addressed journal. Repeated identical operations share a success record. */
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import type { EhrClient } from './ehr.js';
import { sha256, stableStringify } from './program.js';
import { normalizeMetadataPaths } from './content-digest.js';
import { writeFileAtomic } from './util.js';
export function recordingEhr(inner:EhrClient,directory:string,namespace='worker'):EhrClient {
 if(!/^[\w-]+$/.test(namespace))throw new Error('Unsafe recorder namespace');
 let writes=Promise.resolve();
 const call=async<T>(command:string,input:unknown,operation:()=>Promise<T>):Promise<T>=>{
  // The sequence is scoped to an exact input, not process scheduling. Identical inputs are idempotent.
  const id=`${namespace}-1-${command}-${sha256(normalizeMetadataPaths(stableStringify(input),directory.includes('/ehr/')?directory.slice(0,directory.indexOf('/ehr/')):directory)).slice(0,8)}`;
  const startedAt=new Date().toISOString();
  try {const result=await operation();await save({startedAt,command,input,result},true);return result;}
  catch(error){await save({startedAt,command,input,error:error instanceof Error?error.message:String(error)},false);throw error;}
  async function save(record:unknown,ok:boolean){
   const pending=writes.then(async()=>{
    await mkdir(directory,{recursive:true});
    let suffix='';if(!ok){let attempt=1;while(existsSync(path.join(directory,`${id}.attempt-${attempt}.error.json.gz`)))attempt++;suffix=`.attempt-${attempt}.error`;}
    const file=`${id}${suffix}.json.gz`,json=JSON.stringify(record),target=path.join(directory,file);
    await writeFileAtomic(target,gzipSync(json));
    const indexFile=path.join(directory,'index.jsonl');
    const rows=existsSync(indexFile)?(await readFile(indexFile,'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
    const row={id,command,file,ok,sha256:sha256(json)};
    const old=rows.findIndex(r=>r.file===file);if(old<0)rows.push(row);else rows[old]=row;
    await writeFileAtomic(indexFile,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
   });writes=pending.catch(()=>undefined);await pending;
  }
 };
 return {mode:inner.mode,binary:inner.binary,
 check:i=>call('check',i,()=>inner.check(i)),simulate:i=>call('simulate',i,()=>inner.simulate(i)),minClicks:i=>call('min-clicks',i,()=>inner.minClicks(i)),deploy:i=>call('deploy',i,()=>inner.deploy(i)),renderScreens:i=>call('render-screens',i,()=>inner.renderScreens(i)),runBatch:i=>call('run-batch',i,()=>inner.runBatch(i)),specExport:i=>call('spec-export',i,()=>inner.specExport(i))};
}
