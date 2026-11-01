import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {extractionKey,cachedExtraction} from './context-cache.mjs';
test('native context cache reuses exact inputs and invalidates every provenance/input change',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'context-cache-'));t.after(()=>rm(dir,{recursive:true,force:true}));let calls=0;const produce=async()=>{calls++;return [{id:'task',nativeMismatch:null,segments:[]}];};
 const inputs=['schedule','program','spec','recording'].map(s=>Buffer.from(s)),key=extractionKey('binary/modules/world/fixtures/adapter',inputs);
 assert.deepEqual(await cachedExtraction(dir,key,produce),await cachedExtraction(dir,key,produce));assert.equal(calls,1);
 assert.notEqual(extractionKey('different build',inputs),key);
 for(let i=0;i<inputs.length;i++){const changed=[...inputs];changed[i]=Buffer.from('changed');const next=extractionKey('binary/modules/world/fixtures/adapter',changed);assert.notEqual(next,key);await cachedExtraction(dir,next,produce);}
 assert.equal(calls,5);assert.notEqual(extractionKey('p',[Buffer.from('a'),Buffer.from('bc')]),extractionKey('p',[Buffer.from('ab'),Buffer.from('c')]));
 await writeFile(path.join(dir,`${key}.json`),'[partial');await assert.rejects(cachedExtraction(dir,key,produce),SyntaxError);assert.equal(calls,5);
});
