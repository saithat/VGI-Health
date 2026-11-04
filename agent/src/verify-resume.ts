import { CADENCE_PROTOCOL } from './cadence.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {runFingerprints,treeHash} from './fingerprints.js';
import {installedBuild} from './build-binding.js';
import {stableStringify} from './program.js';
import {createEhr} from './ehr.js';
import {REPO_ROOT} from './util.js';
export async function verifyResume(dir:string,root=REPO_ROOT) {
 const manifest=z.object({protocol:z.string().optional(),world:z.string(),fingerprints:z.unknown(),ehr:z.object({mode:z.literal('real'),binary:z.string()})}).parse(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')));
 await installedBuild(root,manifest.ehr.binary);
 const fingerprints={...await runFingerprints({...createEhr({fake:false}),binary:manifest.ehr.binary},manifest.world,root),
   ...(manifest.protocol===CADENCE_PROTOCOL?{explore:await treeHash(path.join(root,'explore'))}:{})};
 if(stableStringify(manifest.fingerprints)!==stableStringify(fingerprints))throw new Error('Resume refused: build/source/gate/world/fixture fingerprints changed');
 return fingerprints;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {parseArgs}=await import('node:util');const {values}=parseArgs({options:{run:{type:'string'}}});
 if(!values.run)throw new Error('Usage: verify-resume --run <id>');
 await verifyResume(path.isAbsolute(values.run)?values.run:path.join(REPO_ROOT,'runs',values.run));
 console.log('Existing native/app builds and run inputs verified; no build performed');
}
