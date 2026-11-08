/** Reproduce the unshipped recorded P2 columns candidate without any model calls. */
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {createEhr} from './ehr.js';
import {createScreenChecker} from './screencheck.js';
import {programSchema, dayScheduleSchema} from '../../app/src/dashboard/measurement-schema.js';
import {REPO_ROOT, writeJson} from './util.js';
const {values}=parseArgs({options:{comparison:{type:'string'},out:{type:'string'}}});
const comparison=path.resolve(values.comparison??path.join(REPO_ROOT,'runs/wire-tailoring-20261104/wire-tailoring-medication-comparison'));
if(!values.out)throw Error('Use --out <scratch directory>');
const out=path.resolve(values.out);
const read=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const archives=path.join(comparison,'runs/A/archives/clinicians');
const candidates=[];
for(const shard of await readdir(archives)) {
  const archive=path.join(archives,shard,'night-3.json');
  const snapshot=await read(archive);
  for(const entry of snapshot.entries)if(entry.program?.owner==='P2' && entry.candidate.summary.includes('/columns/'))
    candidates.push({archive,program:programSchema.parse(entry.program)});
}
if(candidates.length!==1)throw Error(`Expected one recorded P2 columns candidate, found ${candidates.length}`);
const selected=candidates[0];
if(!selected)throw Error('Recorded candidate missing');
const {archive,program}=selected;
const worldDir=path.join(comparison,'world');
const schedule=dayScheduleSchema.parse(await read(path.join(worldDir,'schedules/day-03/P2.json')));
const prev=programSchema.parse(await read(path.join(comparison,`runs/A/programs/P2/v${program.version-1}.json`)));
const canonical=programSchema.parse(await read(path.join(REPO_ROOT,'releases/v1/personas/P2.json')));
const ehr=createEhr({fake:false});
const verdict=await ehr.check({specVersion:'v1',program,canonical,prev});
if(verdict!=='ok')throw Error(`Native gate refused recorded candidate: ${JSON.stringify(verdict)}`);
const screens=createScreenChecker(ehr,{artifactsDir:path.join(out,'screens')});
const screen=await screens.check({specVersion:'v1',program,schedule,worldDir});
await writeJson(path.join(out,'result.json'),{archive,program,worldDir,schedule,verdict,screen,modelCalls:0});
console.log(JSON.stringify({verdict,screen}));
if(screen.status!=='pass')process.exitCode=1;
