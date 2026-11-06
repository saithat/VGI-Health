import { withData } from './data.js';
import path from 'node:path';
import { readFile,readdir } from 'node:fs/promises';
import { ReplayLlm,ReplayDivergedError } from '../src/backends/replay.js';
import { RecordingLlm } from '../src/backends/recording.js';
import type { JsonLlm,JsonRequest } from '../src/backends/types.js';
import { retryInfrastructure,infrastructureContext } from '../src/infrastructure.js';
import { InfrastructureError } from '../src/errors.js';
import { recordingEhr } from '../src/recording-ehr.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { contentDigest,firstDifference } from '../src/content-digest.js';
import { armCrashHook } from '../src/crash-hook.js';
import { tmp } from './helpers.js';
import { writeJson } from '../src/util.js';
const request:JsonRequest={callId:'night-01/P1/propose-0',purpose:'propose',system:'System',prompt:'Original',schemaName:'Test',schema:{}};
const llm:JsonLlm={name:'scripted',model:'fixture',complete:async()=>({json:{ok:true},backend:'scripted',model:'fixture',servedBy:null,replayOf:null,promptMatched:null,usage:null})};
it('replay fails closed with the call, field, first offset and excerpts',async()=>{
 const dir=await tmp('replay');await new RecordingLlm(llm,dir).complete(request);
 const replay=new ReplayLlm(dir);
 for(const [field,value,offset]of [['system','SysXem',3],['prompt','Origin',6]] as const){
  try {await replay.complete({...request,[field]:value});throw new Error('Expected divergence');}
  catch(error){expect(error).toBeInstanceOf(ReplayDivergedError);expect(error).toMatchObject({callId:request.callId,field,offset});expect(String(error)).toContain('expected');}
 }
 expect((await replay.complete(request)).promptMatched).toBe(true);
});
it('explicit replay drift is retained in success records and the backend audit',async()=>{
 const dir=await tmp('drift-source'),output=await tmp('drift-target');await new RecordingLlm(llm,dir).complete(request);
 const replay=new ReplayLlm(dir,{allowDrift:true});await new RecordingLlm(replay,output).complete({...request,prompt:'Changed'});
 expect(replay.driftedCallIds).toEqual([request.callId]);
 expect(JSON.parse(await readFile(path.join(output,'llm',request.callId+'.json'),'utf8')).promptMatched).toBe(false);
});
it('retries the identical operation twice, records attempts, then stops',async()=>{
 const dir=await tmp('retry'),entries:unknown[]=[];let attempts=0;
 await expect(infrastructureContext({dir,persona:'P1',day:2,night:null,record:async entry=>{entries.push(entry);}},()=>retryInfrastructure('native',async()=>{attempts++;throw new InfrastructureError('timeout');}))).rejects.toThrow('failed after 3 attempts');
 expect(attempts).toBe(3);expect(entries).toHaveLength(3);expect(await readdir(path.join(dir,'infrastructure'))).toHaveLength(3);
 let retry=0;expect(await retryInfrastructure('native',async()=>{if(retry++<2)throw new InfrastructureError('timeout');return 42;})).toBe(42);
});
it('LLM retries keep one callId, retain failed attempts and publish only success',async()=>{
 const dir=await tmp('llm-retry'),calls:string[]=[];let count=0;
 const transport:JsonLlm={...llm,complete:async req=>{calls.push(req.callId);if(count++<2)throw new Error('transport');return llm.complete(req);}};
 await new RecordingLlm(transport,dir).complete(request);
 expect(calls).toEqual([request.callId,request.callId,request.callId]);
 const files=await readdir(path.join(dir,'llm/night-01/P1'));expect(files.filter(f=>f.includes('.attempt-'))).toHaveLength(2);expect(files).toContain('propose-0.json');
});
it('recording IDs are deterministic, worker-scoped and idempotent',async()=>{
 const ids:string[][]=[];
 for(let i=0;i<2;i++){
  const dir=await tmp('ids'),ehr=recordingEhr(createFakeEhr(),dir,'P1');await ehr.specExport('v1');await ehr.specExport('v1');
  ids.push((await readdir(dir)).filter(f=>f.endsWith('.gz')));
 }
 expect(ids[0]).toEqual(ids[1]);expect(ids[0]).toHaveLength(1);expect(ids[0]?.[0]).toMatch(/^P1-1-spec-export-[a-f0-9]{8}\.json\.gz$/);
});
it('digests exclude declared provenance but detect clinical time and array order',async()=>{
 const a=await tmp('digest-a'),b=await tmp('digest-b');
 await writeJson(path.join(a,'manifest.json'),{createdAt:'a',resumes:[],runId:'a',status:'completed'});await writeJson(path.join(b,'manifest.json'),{createdAt:'b',resumes:['b'],runId:'b',status:'completed'});
 await writeJson(path.join(a,'trace.json'),{createdAt:'metadata',events:[{time:1},{time:2}]});await writeJson(path.join(b,'trace.json'),{createdAt:'metadata2',events:[{time:1},{time:2}]});
 await writeJson(path.join(a,'attempt.error.json'),{error:'a'});await writeJson(path.join(b,'digest.json'),{contentDigest:'b'});
 expect((await contentDigest(a)).contentDigest).toBe((await contentDigest(b)).contentDigest);
 await writeJson(path.join(b,'trace.json'),{events:[{time:2},{time:1}]});expect(firstDifference(await contentDigest(a,undefined,true),await contentDigest(b,undefined,true))).toContain('trace.json $.events.0.time');
});
it('crash hook refuses live backends before any write',()=>{
 vi.stubEnv('EHR_CRASH_TEST','1');vi.stubEnv('EHR_CRASH_AFTER_WRITES','1');
 try{expect(()=>armCrashHook('codex')).toThrow('refuses live');expect(()=>armCrashHook('claude')).toThrow('refuses live');}finally{vi.unstubAllEnvs();}
});

withData('runs/core-10day-live/decisions').it('run manifests persist the explicit drift policy and every affected call',async()=>{
 const {runDays}=await import('../src/run.js');const {fakeWorld}=await import('./helpers.js');
 const source=await tmp('manifest-drift-source'),root=await tmp('manifest-drift');
 const noChange:JsonLlm={...llm,complete:async()=>({...await llm.complete(request),json:{hypothesis:'fixture',decision:'noChange',candidates:[]}})};
 await new RecordingLlm(noChange,source).complete({...request,schemaName:'LlmProposal'});
 const replay=new ReplayLlm(source,{allowDrift:true});
 const run=await runDays({days:2,personas:['P1'],worldDir:await fakeWorld(2),runsRoot:root,runId:'drift',llm:replay,ehr:createFakeEhr(),seedPolicy:'none'});
 const manifest=JSON.parse(await readFile(path.join(run.dir,'manifest.json'),'utf8'));
 expect(manifest).toMatchObject({replayAllowDrift:true,driftedCallIds:[request.callId],status:'completed'});
});

it('publication retries are idempotent after the durable pointer is already visible',async()=>{
 const {RunStore}=await import('../src/store.js');const {fakeCanonical}=await import('../src/fake/fixtures.js');
 const dir=await tmp('idempotent-publication'),store=new RunStore(dir),program=fakeCanonical('v1');
 const result=await createFakeEhr().deploy({specVersion:'v1',program,prev:program,canonical:program,outDir:dir});
 if(!result.deployed)throw new Error('Fixture must certify');
 const first=await store.deploy('P1',program,result.certificate);
 expect(await store.deploy('P1',program,result.certificate)).toEqual(first);
 await expect(store.deploy('P1',{...program,id:'changed'},result.certificate)).rejects.toThrow('immutable');
});

it('outer boundaries do not multiply an exhausted retry budget',async()=>{
 let attempts=0;
 await expect(retryInfrastructure('outer',()=>retryInfrastructure('inner',async()=>{attempts++;throw new InfrastructureError('timeout');}))).rejects.toThrow('inner failed after 3 attempts');
 expect(attempts).toBe(3);
});
it('normalizes temporary export paths while retaining their semantic filenames',async()=>{
 const {normalizeMetadataPaths}=await import('../src/content-digest.js');const {tmpdir}=await import('node:os');
 expect(normalizeMetadataPaths(path.join(tmpdir(),'screens-ABC123/b0/sign.json'),'/elsewhere/run')).toBe('<TMP>/screens/b0/sign.json');
});

it('retains failed attempt files across repeated operations and resumed contexts',async()=>{
 const dir=await tmp('repeated-retries');
 for(let run=0;run<2;run++){
  let attempt=0;
  await infrastructureContext({dir,persona:'P1',day:null,night:1,record:async()=>{}},()=>retryInfrastructure('native',async()=>{if(attempt++===0)throw new InfrastructureError('timeout');return 1;}));
 }
 expect(await readdir(path.join(dir,'infrastructure'))).toHaveLength(2);
});
