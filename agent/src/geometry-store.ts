import path from 'node:path';
import { existsSync } from 'node:fs';
import type { GeometryAtlas } from '../../app/src/metrics/geometry.js';
import type { DayResult } from './schema.js';
import { sha256, stableStringify } from './program.js';
import { writeFileAtomic, writeJsonAtomic, jsonChunks } from './util.js';

export const GEOMETRY_STORAGE_VERSION = 2;
function boundedJson(value:unknown){
  const chunks:string[]=[];let bytes=0;
  for(const chunk of jsonChunks(value,false)){
    bytes+=Buffer.byteLength(chunk);
    if(bytes>8*1024*1024)throw Error('A geometry record exceeds the 8 MiB storage limit');
    chunks.push(chunk);
  }
  return chunks.join('');
}
export const geometryResultKey = (result: Pick<DayResult,'day'|'persona'|'trace'|'observations'>) =>
  sha256(stableStringify({day:result.day,persona:result.persona,trace:result.trace,observations:result.observations}));

/** Append immutable, content-addressed bodies and bounded reference chunks.
 * All indexes describe one call, never the accumulated life of a program. */
export async function saveGeometry(directory:string, atlas:GeometryAtlas, identity:string) {
  const {states,...metadata}=atlas;
  const snapshot=sha256(stableStringify([metadata.programHash,metadata.componentsSha256,metadata.appSha256,identity]));
  const root=path.join(directory,'snapshots',snapshot);
  if (!existsSync(path.join(root,'index.json'))) {
    let rows:string[]=[], bytes=0, chunks=0;
    const seen=new Set<string>();
    const flush=async()=>{
      if(!rows.length)return;
      await writeFileAtomic(path.join(root,`${chunks++}.json`),'['+rows.join(',')+']\n');
      rows=[];bytes=0;
    };
    for(const state of states){
      const {state:label,sample,components,...rest}=state;
      const ordinary:typeof components={},targets:Record<string,string>={};
      // Lean event names are aliases of an existing measured box. Store the
      // alias without copying every other control into every trace event.
      const names=new Map(Object.entries(components).filter(([id])=>!id.startsWith('lean-event-')).map(([id,box])=>[JSON.stringify(box),id]));
      for(const [id,box]of Object.entries(components)){
        const source=id.startsWith('lean-event-')?names.get(JSON.stringify(box)):undefined;
        if(source)targets[id]=source;else ordinary[id]=box;
      }
      const body=boundedJson({...rest,components:ordinary});
      const hash=sha256(body),file=path.join(directory,'objects',`${hash}.json`);
      if(!seen.has(hash)){
        if(!existsSync(file))await writeFileAtomic(file,body+'\n');
        seen.add(hash);
      }
      const row=boundedJson({state:label,...(sample===undefined?{}:{sample}),body:hash,...(Object.keys(targets).length?{targets}:{})});
      if(bytes+Buffer.byteLength(row)>1024*1024)await flush();
      rows.push(row);bytes+=Buffer.byteLength(row)+1;
    }
    await flush();
    await writeJsonAtomic(path.join(root,'index.json'),{atlas:metadata,chunks});
  }
  return {schemaVersion:GEOMETRY_STORAGE_VERSION,programHash:atlas.programHash,componentsSha256:atlas.componentsSha256,snapshot};
}
