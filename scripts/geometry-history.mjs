/** Preserve incompatible atlas generations before explicit run re-certification.
 * The geometry adapter's strict input checks stay unchanged.
 */
import {access, mkdir, readFile, readdir, rename, writeFile} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {join, relative} from 'node:path';

export async function archiveStaleGeometry(runDirectory, appSha256) {
  const directory=join(runDirectory,'geometry');
  try {await access(directory);} catch {return null;}
  const inspected=[], incompatible=[];
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const match=/^([a-f0-9]{64})(?:\.([a-f0-9]{64}))?\.json$/.exec(entry.name);
    if(!entry.isFile()||!match)continue;
    const bytes=await readFile(join(directory,entry.name));
    let atlas;try{atlas=JSON.parse(bytes);}catch{atlas=null;}
    const record={file:entry.name,sha256:createHash('sha256').update(bytes).digest('hex'),appSha256:atlas?.appSha256??null};
    inspected.push(record);
    if(atlas?.appSha256!==appSha256||atlas.programHash!==match[1]||
       !/^[a-f0-9]{64}$/.test(atlas.componentsSha256??'')||
       (match[2]&&atlas.componentsSha256!==match[2]))incompatible.push(entry.name);
  }
  if(!incompatible.length)return null;
  const history=join(runDirectory,'migration','geometry-history');
  await mkdir(history,{recursive:true});
  const destination=join(history,`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}`);
  // Rename the complete generation, including aliases and task slices; never
  // overwrite or delete the previous build's measurements.
  await rename(directory,destination);
  await mkdir(directory);
  const receipt={schemaVersion:1,currentAppSha256:appSha256,
    archivedDirectory:relative(runDirectory,destination),incompatible,files:inspected};
  await writeFile(`${destination}.receipt.json`,JSON.stringify(receipt,null,2)+'\n');
  return receipt;
}
