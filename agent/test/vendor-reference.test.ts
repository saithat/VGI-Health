import { it,expect } from 'vitest';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { noAgentReference } from '../src/vendor-reference.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { writeJson } from '../src/util.js';
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
