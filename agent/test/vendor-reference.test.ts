import {it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {noAgentReference} from '../src/vendor-reference.js';
import {fakeCanonical} from '../src/fake/fixtures.js';
import {writeJson,readJson,REPO_ROOT} from '../src/util.js';
import {programSchema} from '../src/schema.js';
import {historyItem} from '../src/run.js';
import {releaseReference,screenCheckRejection} from '../src/screencheck.js';
it('uses the actual no-agent release snapshot at the candidate night, without future snapshots',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'reference-'));
 try {
  const p={...fakeCanonical('v1'),id:'P2',owner:'clinician-p2'};
  const input={specVersion:'frozen-spec.json',program:p};
  expect(await noAgentReference(dir)(input)).toBeNull();
  for(const [day,program] of [[1,p],[2,{...p,version:1}],[3,{...p,version:2,specVersion:'v2'}],[4,{...p,version:3}]] as const)
   await writeJson(path.join(dir,'no-agent/days',`day-0${day}/P2.program.json`),program);
  expect((await noAgentReference(dir,2)(input))?.version).toBe(1);
  expect((await noAgentReference(dir,3)({...input,program:{...p,specVersion:'v2'}}))?.version).toBe(2);
  expect((await noAgentReference(dir,4)(input))?.version).toBe(3);
  expect(await noAgentReference(dir,2)({...input,program:{...p,specVersion:'v2'}})).toBeNull();
  await writeJson(path.join(dir,'no-agent/days/day-99/P2.program.json'),{...p,version:99});
  await writeJson(path.join(dir,'no-agent/days/day-100/P2.program.json'),{...p,version:100});
  expect((await noAgentReference(dir)(input))?.version).toBe(100);
  await writeJson(path.join(dir,'no-agent/days/day-02/P2.program.json'),{});
  await expect(noAgentReference(dir,2)(input)).rejects.toThrow();
 } finally {await rm(dir,{recursive:true,force:true});}
});
it('falls back to the release vendor role program and preserves detailed agent feedback',async()=>{
 const program=await readJson(path.join(REPO_ROOT,'releases/v1/personas/P2.json'),programSchema);
 const ref=await releaseReference({specVersion:'frozen/spec.json',program:{...program,owner:'another-user'}});
 expect(ref.role).toBe(program.role);expect(ref.screens).toEqual(program.screens);expect(ref.owner).toBe('another-user');
 const message='R5 w3OrderSets: 62 active targets > limit 61 (active)';
 expect(screenCheckRejection({status:'fail',mode:'real',pages:1,bundles:[],failingFiles:['w3OrderSets.json'],failingScreens:['w3OrderSets'],message}).message).toBe(message);
});

it.skipIf(!existsSync(path.join(REPO_ROOT,'runs/core-10day/decisions/night-01/P2.json')))('keeps screen/count/limit and failed patch in the next agent prompt',async()=>{
 const {decisionRecordSchema}=await import('../src/schema.js');
 const record=decisionRecordSchema.parse(JSON.parse(await (await import('node:fs/promises')).readFile(path.join(REPO_ROOT,'runs/core-10day/decisions/night-01/P2.json'),'utf8')));
 const message='R5 w3Provider: 19 active targets > limit 16 (active)';
 const patch=record.certification.attempts[0]?.patch??[];
 record.certification.attempts.push({attempt:1,candidateIds:['dense'],source:'screen-check',patch,check:{status:'fail',property:'ScreenCheck',message,screens:['w3Provider'],counterexample:null,verdict:null}});
 const history=historyItem(record);
 expect(history.screenFailures).toEqual([{message,screens:['w3Provider'],patch}]);
 const {nightlyPrompt}=await import('../src/prompts.js');
 const {FAKE_PERSONAS}=await import('../src/fake/world.js');
 const {fakeSpec}=await import('../src/fake/fixtures.js');
 const params=FAKE_PERSONAS[0];if(!params)throw Error('Missing persona');
 const prompt=nightlyPrompt({night:2,persona:{id:'P2',userId:'P2',params},spec:fakeSpec('v1'),program:fakeCanonical('v1'),evidence:record.evidence,history:[history]});
 expect(prompt.prompt).toContain(message);
 expect(prompt.prompt).toContain('screenFailures');
});
