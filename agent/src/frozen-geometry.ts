/** Read-only atlas provider for lanes where starting a browser is prohibited.
 * Missing/mismatched inputs fail closed; never fabricate or rescale geometry. */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { geometryComponentsHash,geometryProgramHash,loadGeometry,type GeometryProvider } from './geometry.js';
import type { GeometryAtlas } from '../../app/src/metrics/geometry.js';
export async function frozenGeometry(directory:string,appSha256:string):Promise<GeometryProvider>{
  const files=new Map<string,string[]>();
  async function visit(root:string){
    for(const e of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(root,e.name);
      if(e.isDirectory())await visit(file);
      else if(/^[a-f0-9]{64}\.[a-f0-9]{64}\.json$/.test(e.name))files.set(e.name,[...(files.get(e.name)??[]),file]);
    }
  }
  await visit(directory);
  return async input=>{
    const programHash=geometryProgramHash(input.program),componentsSha256=geometryComponentsHash(input.program);
    const candidates=files.get(`${programHash}.${componentsSha256}.json`)??[];
    const states:GeometryAtlas['states']=[];let found=false;
    for(const file of candidates){
      const atlas=await loadGeometry(file);
      if(atlas.programHash!==programHash||atlas.componentsSha256!==componentsSha256||atlas.appSha256!==appSha256||atlas.source!=='chromium')continue;
      found=true;
      for(const state of atlas.states){
        if(state.sample?.startsWith('workspace-d')&&state.sample!==`workspace-d${String(input.schedule?.day).padStart(2,'0')}`)continue;
        const prior=states.find(s=>s.state===state.state&&s.sample===state.sample);
        if(prior&&JSON.stringify(prior)!==JSON.stringify(state))throw new Error('Conflicting frozen geometry for exact inputs');
        if(!prior)states.push(state);
      }
    }
    if(!found)throw new Error(`No matching frozen Chromium atlas for program ${programHash}; browser capture required in a permitted lane`);
    return {schemaVersion:1,programHash,componentsSha256,appSha256,viewport:{width:1440,height:900},states,source:'chromium'};
  };
}
