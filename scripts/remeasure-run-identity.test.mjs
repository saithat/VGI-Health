import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {rebindRecordedChoices} from '../agent/src/remeasure.ts';
import {writeDayDigest,writeNightDigest} from '../agent/src/content-digest.ts';
import {completedPrefix} from './run-prefix.mjs';

test('copied historical choices expose a complete new review prefix without changing source evidence',async()=>{
  const scratch=await mkdtemp(path.join(tmpdir(),'vgi-remeasure-identity-'));
  try {
    const source=path.join(scratch,'source'),copy=path.join(scratch,'copy');
    const save=async(file,value)=>{await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(value));};
    const original={runId:'control',night:1,persona:'P1',versionBefore:0,versionAfter:1,
      sourceRunId:'original-experiment',deployed:{program:'programs/P1/v1.json'},
      hypothesis:'Control prompt and estimates are historical',measured:{validation:{before:17,after:11}}};
    const decision=path.join('decisions','night-01','P1.json');
    await save(path.join(source,decision),original);
    await cp(source,copy,{recursive:true});
    await rebindRecordedChoices(copy,'control','real-work',2,['P1']);
    const adopted=JSON.parse(await readFile(path.join(copy,decision),'utf8'));
    assert.deepEqual(adopted,{...original,runId:'real-work'});
    assert.deepEqual(JSON.parse(await readFile(path.join(source,decision),'utf8')),original);
    await save(path.join(copy,'manifest.json'),{runId:'real-work',days:2,personas:['P1'],completionProtocol:'atomic-prefix-v1'});
    for(const day of [1,2]) {
      await save(path.join(copy,'days',`day-0${day}`,'P1.json'),{day,persona:'P1',programVersion:day-1});
      await writeDayDigest(copy,day,['P1']);
    }
    await writeNightDigest(copy,1,['P1']);
    const prefix=await completedPrefix(copy);
    assert.equal(prefix.manifest.daysCompleted,2);
    assert.equal(prefix.manifest.nightsCompleted,1);
    await assert.rejects(rebindRecordedChoices(copy,'foreign','other',2,['P1']),/Foreign recorded choice/);
  } finally {await rm(scratch,{recursive:true,force:true});}
});
