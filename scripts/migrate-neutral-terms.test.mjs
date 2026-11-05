import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {migrateTerms,rewriteLocalData} from './migrate-neutral-terms.mjs';
test('advisory labels and identifiers retain their casing without changing unrelated HTML or rule text',()=>{
 const lower=['b','p','a'].join(''),upper=lower.toUpperCase();
 assert.deepEqual(migrateTerms({[lower+'Dismissed']:true,kind:lower,css:lower+'-banner',label:upper,constant:upper+'_PANEL',other:'tabpanel /subpart-C'}),{advisoryDismissed:true,kind:'advisory',css:'advisory-banner',label:'Advisory',constant:'ADVISORY_PANEL',other:'tabpanel /subpart-C'});
});
test('one-time migration rewrites references and data on disk without a runtime alias',async()=>{
 const old=['in','BasketResults'].join(''),label=['Patient Story','board'].join('');
 const browserApi=['navi','gator'].join(''),script=`${browserApi}.language; globalThis.${browserApi}?.userAgent`;
 const value={id:old,click:{comp:old},label,url:'/subpart-C',role:'tabpanel',script};
 assert.deepEqual(migrateTerms(value),{id:'inboxResults',click:{comp:'inboxResults'},label:'Patient sidebar',url:'/subpart-C',role:'tabpanel',script});
 const dir=await mkdtemp(join(tmpdir(),'neutral-migration-test-'));
 try{await writeFile(join(dir,`${old}.json`),JSON.stringify(value));await rewriteLocalData([dir]);const file=join(dir,'inboxResults.json');assert.deepEqual(JSON.parse(await readFile(file,'utf8')),migrateTerms(value));const first=await readFile(file,'utf8');await rewriteLocalData([dir]);assert.equal(await readFile(file,'utf8'),first);}finally{await rm(dir,{recursive:true});}
});
test('migration refuses a path collision instead of overwriting local data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'neutral-collision-test-'));
 try{
  await writeFile(join(dir,['in','BasketResults.json'].join('')),'{}');
  await writeFile(join(dir,'inboxResults.json'),'{}');
  await assert.rejects(rewriteLocalData([dir]),/Migration path collision/);
 }finally{await rm(dir,{recursive:true});}
});
test('migration recomputes fixture index bytes and every dependent file digest',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'neutral-digest-test-'));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 try{
  const fixtures=join(dir,'fixtures/synthea'),runs=join(dir,'runs');await mkdir(fixtures,{recursive:true});await mkdir(runs);
  const bundle=JSON.stringify({resourceType:'Organization',id:'org',name:'Source Facility Example'});
  const index=JSON.stringify({patients:[{id:'p',file:'p.json',bytes:Buffer.byteLength(bundle),sha256:hash(bundle)}],totalBytes:Buffer.byteLength(bundle)});
  await writeFile(join(fixtures,'p.json'),bundle);await writeFile(join(fixtures,'index.json'),index);
  await writeFile(join(runs,'inputs.json'),JSON.stringify({fixtureIndexSha256:hash(index),bundleSha256:hash(bundle)}));
  await rewriteLocalData([fixtures,runs]);
  const actual=await readFile(join(fixtures,'p.json')),actualIndex=await readFile(join(fixtures,'index.json')),metadata=JSON.parse(actualIndex),inputs=JSON.parse(await readFile(join(runs,'inputs.json'),'utf8'));
  assert.equal(metadata.patients[0].sha256,hash(actual));assert.equal(metadata.patients[0].bytes,actual.length);assert.equal(metadata.totalBytes,actual.length);
  assert.equal(inputs.bundleSha256,hash(actual));assert.equal(inputs.fixtureIndexSha256,hash(actualIndex));
  assert.equal((await rewriteLocalData([fixtures,runs])).modifiedFiles,0);
 }finally{await rm(dir,{recursive:true});}
});
