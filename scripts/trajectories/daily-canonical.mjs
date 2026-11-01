import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { historicalRunIds } from '../historical-releases.mjs';
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const exists=async file=>{try{await access(file);return true;}catch{return false;}};
/** Release cost belongs to the vendor: never compare a later day against v0's old contract. */
export async function dailyCanonical({root,runDir,runId,dayFolder,persona,program}) {
 const recorded=path.join(runDir,'baselines',dayFolder,`${persona}.program.json`);
 if(await exists(recorded)){
   const canonical=await read(recorded);
   if(canonical.specVersion!==program.specVersion)throw new Error('Daily canonical uses a different release');
   return canonical;
 }
 const source=historicalRunIds.has(runId)?'programs/benchmarks/releases':'releases';
 const canonical=await read(path.join(root,source,program.specVersion,'personas',`${persona}.json`));
 return {...canonical,owner:program.owner,role:program.role};
}
/** World directories are identities; world/2 intentionally retains world/1's seed. */
export async function recordedWorld({root,manifest}) {
 for(const candidate of [manifest.world,path.join(root,'runs/world',path.basename(manifest.world ?? '')),path.join(root,'runs/world',String(manifest.worldSeed))]) {
   if(candidate && await exists(path.join(candidate,'world.json')))return candidate;
 }
 throw new Error('Recorded world is unavailable');
}
