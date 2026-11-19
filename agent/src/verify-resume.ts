import { CADENCE_PROTOCOL } from './cadence.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {runFingerprints,treeHash,leanFingerprints} from './fingerprints.js';
import {installedBuild} from './build-binding.js';
import {stableStringify} from './program.js';
import {createEhr} from './ehr.js';
import {REPO_ROOT} from './util.js';
export async function verifyResume(dir:string,root=REPO_ROOT) {
 const manifest=z.object({screenGate:z.enum(['lean','browser']).optional(),protocol:z.string().optional(),nightlyDiscovery:z.unknown().optional(),world:z.string(),fingerprints:z.unknown(),ehr:z.object({mode:z.literal('real'),binary:z.string()})}).parse(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')));
 const lean=manifest.screenGate==='lean';
 // A copied recording can be checked against this checkout's corresponding
 // immutable inputs. The full digests, including agent source, must still match.
 const recordedRoot=path.resolve(path.dirname(manifest.ehr.binary),'../../../..');
 const local=(file:string)=>manifest.ehr.binary.endsWith('/lean/.lake/build/bin/ehr')&&file.startsWith(recordedRoot+path.sep)?path.join(root,path.relative(recordedRoot,file)):file;
 const binary=local(manifest.ehr.binary),world=local(manifest.world);
 if(!lean)await installedBuild(root,binary);
 const fingerprints={...(lean?await leanFingerprints(root):{}),...await runFingerprints({...createEhr({fake:false}),binary},world,root,lean?'lean':'browser'),
   ...((manifest.protocol===CADENCE_PROTOCOL||manifest.nightlyDiscovery)?{explore:await treeHash(path.join(root,'explore'))}:{})};
 if(stableStringify(manifest.fingerprints)!==stableStringify(fingerprints)){
   const old=z.record(z.string(),z.unknown()).parse(manifest.fingerprints);
   const measured:Record<string,unknown>=fingerprints;
   const changed=[...new Set([...Object.keys(old),...Object.keys(measured)])].filter(k=>stableStringify(old[k])!==stableStringify(measured[k]));
   throw new Error('Resume refused: build/source/gate/world/fixture fingerprints changed: '+changed.join(', '));
 }
 return fingerprints;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {parseArgs}=await import('node:util');const {values}=parseArgs({options:{run:{type:'string'}}});
 if(!values.run)throw new Error('Usage: verify-resume --run <id>');
 await verifyResume(path.isAbsolute(values.run)?values.run:path.join(REPO_ROOT,'runs',values.run));
 console.log('Existing native/app builds and run inputs verified; no build performed');
}
