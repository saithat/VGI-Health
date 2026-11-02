import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { prepare } from './prepare.mjs';
import { startStudy } from './server.mjs';
import { analyze } from './analysis.mjs';
import { outputDir, writeNew } from './common.mjs';

test('consent, immutable export, withdrawal exclusion, allocation, and loopback guards',async()=>{
  const out=outputDir(`runs/study-api-test-${Date.now()}`);
  await prepare(out);
  await assert.rejects(()=>writeNew(path.join(out,'manifest.json'),{overwrite:true}),{code:'EEXIST'});
  await assert.rejects(()=>startStudy({out}),/adapted/);
  await assert.rejects(()=>startStudy({out,consent:awaitableTemplate}),/adapted/);
  const server=await startStudy({out,dryRun:true});
  const base=new URL(server.url).origin;
  try {
    const config=await fetch(`${base}/api/study/config`).then(r=>r.json());
    assert.equal(config.dryRun,true);
    const session={schemaVersion:1,studyId:config.id,manifestHash:config.manifestHash,
      participant:'P001',slot:0,sessionId:randomUUID(),provenance:'simulated-dry-run',consentVersion:config.consent,
      consentAt:new Date().toISOString(),startedAt:new Date().toISOString(),status:'in-progress',
      viewport:{width:1440,height:1000,pixelRatio:1},trials:[]};
    const post=body=>fetch(`${base}/api/study/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const accepted=await post(session);assert.equal(accepted.status,200);
    const receipt=await accepted.json();assert.ok(receipt.file.startsWith(`runs/${config.id}/sessions/P001--`));
    assert.equal((await stat(path.resolve(receipt.file))).mode & 0o777,0o600);
    const again=await post(session);assert.equal(again.status,200);assert.notEqual((await again.json()).file,receipt.file);
    assert.equal((await post({...session,sessionId:randomUUID()})).status,400,'reject participant overwrite');
    assert.equal((await post({...session,consentVersion:'different'})).status,400);
    assert.equal((await post({...session,provenance:'human'})).status,400);
    assert.equal((await post({...session,status:'complete'})).status,400,'require four measured ratings');
    assert.equal((await post({...session,participant:'Dr Smith'})).status,400);
    const cross=await fetch(`${base}/api/study/session`,{method:'POST',headers:{origin:'https://example.org','content-type':'application/json'},body:JSON.stringify(session)});
    assert.equal(cross.status,400);
    const withdrawn=await post({...session,status:'withdrawn'});assert.equal(withdrawn.status,200);
    const report=await analyze(out);assert.equal(report.participants,0);assert.equal(report.excludedSessions[0].status,'withdrawn');
    const files=await readdir(path.join(out,'sessions'));assert.equal(files.length,3);
    const body=JSON.parse(await readFile(path.resolve(receipt.file),'utf8'));assert.equal(body.status,'in-progress','earlier export immutable');
  } finally {await server.close();}
  await assert.rejects(()=>startStudy({out,consent:'Adapted investigator information and explicit consent.'}),/mode\/consent changed/);
});
const awaitableTemplate='Institution: [INSTITUTION AND INVESTIGATOR]';
