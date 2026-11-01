import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dailyCanonical,recordedWorld} from './daily-canonical.mjs';
test('later-day baseline uses the active canonical and persists portable provenance',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'FAKE-baseline-')),runDir=path.join(root,'runs/FAKE');
 for(const release of ['v1','v2','v3']){
 const dir=path.join(root,'releases',release,'personas');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'P1.json'),JSON.stringify({specVersion:release,owner:'vendor',role:'physician',marker:release}));
 }
 for(const [dayFolder,release] of [['day-01','v1'],['day-04','v2'],['day-07','v3']]){
 const program={specVersion:release,owner:'P1',role:'physician'};
 const canonical=await dailyCanonical({root,runDir,runId:'FAKE',dayFolder,persona:'P1',program});
 assert.equal(canonical.specVersion,release);assert.equal(canonical.marker,release);assert.equal(canonical.owner,'P1');
 }
 const dir=path.join(runDir,'baselines/day-07');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'P1.program.json'),JSON.stringify({specVersion:'v3',marker:'frozen'}));
 assert.equal((await dailyCanonical({root,runDir,runId:'FAKE',dayFolder:'day-07',persona:'P1',program:{specVersion:'v3'}})).marker,'frozen');
 await assert.rejects(dailyCanonical({root,runDir,runId:'FAKE',dayFolder:'day-07',persona:'P1',program:{specVersion:'v2'}}),/different release/);
});

test('world/2 is never substituted with world/1 just because they share a seed',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'FAKE-world-identity-'));
 for(const id of ['1','2']){const dir=path.join(root,'runs/world',id);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'world.json'),'{}');}
 const world=path.join(root,'runs/world/2');
 assert.equal(await recordedWorld({root,manifest:{world,worldSeed:1}}),world);
 assert.equal(await recordedWorld({root,manifest:{world:'/archived/worktree/runs/world/2',worldSeed:1}}),world);
});
