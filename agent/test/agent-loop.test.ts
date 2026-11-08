import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { ToolSession,DEFAULT_TOOL_BUDGET } from '../src/tool-session.js';
import { ToolNightAgent,NIGHT_TOOLS,nightToolSession,minimalNightPrompt,SUBMIT_SCHEMA } from '../src/agent-loop.js';
import { queryTraining } from '../src/query-engine.mjs';
import { validateReply,OpenAICompatLlm } from '../src/backends/openai-compat.js';
import { ClaudeLlm } from '../src/backends/claude.js';
import { RecordingLlm,llmRecordSchema } from '../src/backends/recording.js';
import { ReplayLlm } from '../src/backends/replay.js';
import { serveNightTools,auditNightTranscript } from '../src/backends/night-mcp.js';
import { confinedArgs,auditRunTranscripts } from '../src/backends/isolation.js';
import { CodexLlm } from '../src/backends/codex.js';
import { fakeCanonical,fakeSpec } from '../src/fake/fixtures.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { FAKE_PERSONAS } from '../src/fake/world.js';
import { RunStore } from '../src/store.js';
import { runNight,type NightInput,type LoopDeps } from '../src/night.js';
import { geometryProgramHash,geometryComponentsHash } from '../src/geometry.js';
import { frozenGeometry } from '../src/frozen-geometry.js';
import { writeJson } from '../src/util.js';
import { sumMetrics } from '../src/observe.js';
import { queryCacheReport } from '../src/query-cache-report.js';
import { offlineRecordSchema,qualityReport } from '../src/quality-report.js';
import type { JsonRequest,JsonLlm } from '../src/backends/types.js';

const dirs:string[]=[];
async function scratch(){const dir=await mkdtemp(path.join(tmpdir(),'night-tools-'));dirs.push(dir);return dir;}
afterEach(async()=>{vi.unstubAllEnvs();for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
const noChange={hypothesis:'No measured benefit yet',decision:'noChange',candidates:[],chosen:[],rationale:'Keep the current version',rejected:[]};
async function fixture(){
  const dir=await scratch(),current=fakeCanonical('v1'),spec=fakeSpec('v1'),params=FAKE_PERSONAS[0];if(!params)throw new Error('Missing persona');
  const badAgent={name:'scripted',model:'fixture',proposeCandidates:async()=>{throw new Error('Unused');},chooseCandidates:async()=>{throw new Error('Unused');}};
  const deps:LoopDeps={runId:'fixture',store:new RunStore(dir),ehr:createFakeEhr(),screens:{mode:'fake',check:async()=>{throw new Error('Forbidden browser');}},agent:badAgent,seedPolicy:'none',seedState:{injected:0,rejected:new Set()},worldDir:dir,worldSeed:1};
  const input:NightInput={night:1,persona:{id:'P1',userId:'P1',params},current,release:{id:'v1',specVersion:'v1',spec,canonical:current,notes:'',leanSpecSource:null,fake:true},programs:new Map([[current.version,current]]),train:[],history:[{night:0,mode:'nightly',outcome:'SECRET_HISTORY',chosen:[],patch:[]}],holdout:{day:1,validate:async()=>{throw new Error('SECRET_HOLDOUT');}}};
  const files={'traces.json':'[]','attribution.json':'[]','geometry.json':'[]','ledger.json':'[]','locality.json':'{}'};
  const session=()=>nightToolSession(input,deps,{files});
  const req=(s:ToolSession):JsonRequest=>({callId:'night-01/P1/propose-0',purpose:'propose',...minimalNightPrompt(input,s.budget),schemaName:'NightSubmission',schema:SUBMIT_SCHEMA,toolSession:s});
  return {input,deps,session,req,dir,files};
}
it('starts small with identity, allowed moves, safety names and budgets, without dumped context',async()=>{
  const f=await fixture(),p=minimalNightPrompt(f.input,DEFAULT_TOOL_BUDGET),text=p.system+p.prompt+JSON.stringify(NIGHT_TOOLS);
  expect(Buffer.byteLength(text)).toBeLessThan(15000);
  expect(text).not.toMatch(/SECRET|w1-dose|spec\.json|worldDir|\/home\//);
  expect(text).toContain('ReviewsBeforeCommit');expect(text).toContain('maxEstimates');expect(text).toContain('list_screens');
});
it('confines IDs/filters, records complaints and rejects invalid/extra submit keys without ending the loop',async()=>{
  const f=await fixture(),s=f.session(),screen=f.input.current.screens[0];if(!screen)throw new Error('Missing screen');
  expect(await s.execute('get_screen',{id:'../../etc/passwd'})).toEqual({error:'Unknown current screen'});
  expect(await s.execute('screens',{persona:'P2'})).toHaveProperty('error');
  expect(await s.execute('steps',{task:'holdout-task'})).toMatchObject({rows:[]});
  const rules=JSON.stringify(await s.execute('spec_rules',{screenId:screen.id}));expect(rules).toContain('WithinBudgets');expect(rules).not.toMatch(/SECRET/);
  expect(await s.execute('complain',{text:'Need a current measured screen'})).toEqual({recorded:true});
  await s.execute('complain',{text:'Need a current measured screen'});
  expect(s.stats().complaints).toEqual(['Need a current measured screen']);
  expect(await s.execute('submit',{...noChange,chosen:['missing']})).toHaveProperty('error');expect(s.done).toBe(false);
  expect(await s.execute('submit',{...noChange,spec:'mutate'})).toHaveProperty('error');
  await s.execute('submit',noChange);expect(s.final).toEqual(noChange);
  expect(await s.execute('list_screens',{})).toHaveProperty('error');
  expect(JSON.stringify(s.events)).not.toMatch(/SECRET/);
});
it('reuses the arm C query engine and excludes incomplete costs, with bounded deterministic results',()=>{
  const files:Record<string,unknown>={'traces.json':[{day:1,tasks:[{task:'train',completed:true},{task:'unfinished',completed:false}],trace:[]}],
    'attribution.json':[{day:1,steps:[{task:'train',screen:'s',component:'c',clicks:2,scrolls:1},{task:'unfinished',screen:'s',component:'x',clicks:1000}]}]};
  const load=(name:string)=>files[name];
  expect(queryTraining(load,'screens',{})).toMatchObject({rows:[{screen:'s',clicks:2,scrolls:1}]});
  expect(queryTraining(load,'targets',{day:'2'})).toMatchObject({rows:[]});
  expect(()=>queryTraining(load,'sequences',{task:'train'})).toThrow('filters unsupported');
});
it('bounds call/check/estimate/time/tokens independently, logs errors, and never executes an over-budget operation',async()=>{
  const f=await fixture(),dispatch=vi.fn(async()=>({ok:true})),defs=NIGHT_TOOLS;
  const calls=new ToolSession(defs,{...DEFAULT_TOOL_BUDGET,maxCalls:1},dispatch);await calls.execute('list_screens',{});expect(await calls.execute('list_screens',{})).toMatchObject({error:'tool call budget exhausted'});expect(dispatch).toHaveBeenCalledTimes(1);
  for(const [name,budget] of [['check_patch',{...DEFAULT_TOOL_BUDGET,maxChecks:0}],['estimate_patch',{...DEFAULT_TOOL_BUDGET,maxEstimates:0}]] as const){
    const s=new ToolSession(defs,budget,dispatch);expect(await s.execute(name,{patch:[]})).toHaveProperty('error');
  }
  const tokens=f.session();expect(()=>tokens.chargeUsage(DEFAULT_TOOL_BUDGET.maxTokens,0)).toThrow('token budget');
  vi.useFakeTimers();try{const time=f.session();vi.advanceTimersByTime(DEFAULT_TOOL_BUDGET.wallMs);expect(await time.execute('list_screens',{})).toMatchObject({error:'wall time budget exhausted'});}finally{vi.useRealTimers();}
});
it('uses the native check adapter and exact train estimator without reaching holdout',async()=>{
  const f=await fixture(),check=vi.spyOn(f.deps.ehr,'check'),s=f.session();
  const result=await s.execute('check_patch',{patch:[]});expect(result).toMatchObject({status:'pass'});
  expect(await s.execute('estimate_patch',{patch:[]})).toMatchObject({check:{status:'pass'},estimate:null});
  expect(check).toHaveBeenCalledTimes(2);expect(s.stats()).toMatchObject({checks:1,estimates:1});
});
it('records a fake local openai-compat E conversation and replays every query byte exactly',async()=>{
  const f=await fixture(),bodies:unknown[]=[];
  const calls=[{name:'list_screens',arguments:{}},{name:'complain',arguments:{text:'No current geometry in this tiny smoke'}},{name:'submit',arguments:noChange}];
  let count=0;
  const server=createServer(async(req,res)=>{
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));bodies.push(JSON.parse(Buffer.concat(chunks).toString()));
    const c=calls[count++];if(!c){res.writeHead(500);res.end('{}');return;}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({model:'fake-local',usage:{prompt_tokens:100,completion_tokens:10},choices:[{finish_reason:'tool_calls',message:{role:'assistant',content:null,tool_calls:[{id:`t${count}`,type:'function',function:{name:c.name,arguments:JSON.stringify(c.arguments)}}]}}]}));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw new Error('Missing fake address');
  vi.stubEnv('OPENAI_COMPAT_BASE_URL',`http://127.0.0.1:${addr.port}/v1`);vi.stubEnv('OPENAI_COMPAT_MODEL','fake');
  try{
    const s=f.session(),response=await new RecordingLlm(new OpenAICompatLlm(),f.dir).complete(f.req(s));
    expect(response.json).toEqual(noChange);expect(response.usage).toEqual({input_tokens:300,output_tokens:30,cached_input_tokens:0});
    const body=z.object({tools:z.array(z.object({function:z.object({name:z.string()})})),messages:z.array(z.unknown())}).parse(bodies[0]);
    expect(body.tools.map(t=>t.function.name)).toEqual(NIGHT_TOOLS.map(t=>t.name));
    const rec=llmRecordSchema.parse(JSON.parse(await readFile(path.join(f.dir,'llm/night-01/P1/propose-0.json'),'utf8')));
    expect(rec.transcript).toMatchObject({toolEvents:s.events});
    const requestText=await readFile(path.join(f.dir,'llm/night-01/P1/propose-0.request.json'),'utf8');expect(requestText).not.toMatch(/SECRET|worldDir|holdout/);
    const replay=f.session();expect((await new ReplayLlm(f.dir).complete(f.req(replay))).json).toEqual(noChange);expect(replay.events).toEqual(s.events);
    const changed=JSON.parse(await readFile(path.join(f.dir,'llm/night-01/P1/propose-0.json'),'utf8'));changed.transcript.toolEvents[0].result.start='tampered';await writeJson(path.join(f.dir,'llm/night-01/P1/propose-0.json'),changed);
    await expect(new ReplayLlm(f.dir).complete(f.req(f.session()))).rejects.toThrow('replay diverged');expect(count).toBe(3);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
it('records and replays a budget-rejected decision with the same tool journal and refusal',async()=>{
  const f=await fixture(),backend:JsonLlm={name:'scripted',model:'fixture',async complete(req){
    if(!req.toolSession)throw new Error('Missing session');
    await req.toolSession.execute('list_screens',{});await req.toolSession.execute('submit',noChange);
    req.toolSession.chargeUsage(DEFAULT_TOOL_BUDGET.maxTokens,1);throw new Error('Unreachable');
  }};
  const s=f.session();await expect(new RecordingLlm(backend,f.dir).complete(f.req(s))).rejects.toThrow('token budget exhausted');
  const replay=f.session();await expect(new ReplayLlm(f.dir).complete(f.req(replay))).rejects.toThrow('token budget exhausted');
  expect(replay.events).toEqual(s.events);expect(replay.stats()).toMatchObject({inputTokens:DEFAULT_TOOL_BUDGET.maxTokens,outputTokens:1,exceeded:'token budget exhausted'});
});
it('uses the same loop for Claude tool_use and preserves thinking blocks in subsequent messages',async()=>{
  const f=await fixture();vi.stubEnv('ANTHROPIC_API_KEY','test-only');
  const client=new ClaudeLlm({model:'fake'});
  const stream=vi.fn().mockReturnValueOnce({finalMessage:async()=>({model:'fake',stop_reason:'tool_use',usage:{input_tokens:10,output_tokens:3},content:[{type:'thinking',thinking:'inspect',signature:'sig'},{type:'tool_use',id:'t1',name:'list_screens',input:{}}]})})
    .mockReturnValueOnce({finalMessage:async()=>({model:'fake',stop_reason:'tool_use',usage:{input_tokens:20,output_tokens:5},content:[{type:'tool_use',id:'t2',name:'submit',input:noChange}]})});
  // Mock only the SDK transport; the shared loop and dispatcher are real.
  const sdk=await import('@anthropic-ai/sdk');vi.spyOn(sdk.default.Beta.Messages.prototype,'stream').mockImplementation(stream);
  try{expect((await client.complete(f.req(f.session()))).json).toEqual(noChange);expect(stream).toHaveBeenCalledTimes(2);}finally{vi.restoreAllMocks();}
});
it('serves only declared tools through real bwrap/stdio MCP, rejects arbitrary paths and has no resources API',async()=>{
  const f=await fixture(),s=f.session(),socket=path.join(f.dir,'night.sock'),close=await serveNightTools(socket,s);
  const bridge=path.join(f.dir,'bridge.mjs');await writeFile(bridge,await readFile(new URL('../src/night-mcp.mjs',import.meta.url),'utf8'));
  const child=spawn('bwrap',confinedArgs(f.dir,'/usr/bin/node',[bridge,socket]),{stdio:['pipe','pipe','pipe']});
  const pending=new Map<number,(v:unknown)=>void>();createInterface({input:child.stdout}).on('line',line=>{const data=z.object({id:z.number()}).passthrough().parse(JSON.parse(line));pending.get(data.id)?.(data);pending.delete(data.id);});
  let id=0;const call=(method:string,params:unknown={})=>new Promise<unknown>(resolve=>{const key=++id;pending.set(key,resolve);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n');});
  try{
    expect(await call('initialize',{protocolVersion:'2024-11-05'})).toMatchObject({result:{capabilities:{tools:{}}}});
    const listed=z.object({result:z.object({tools:z.array(z.object({name:z.string()}))})}).parse(await call('tools/list'));expect(listed.result.tools.map(t=>t.name)).toEqual(NIGHT_TOOLS.map(t=>t.name));
    expect(JSON.stringify(await call('tools/call',{name:'get_screen',arguments:{id:'/etc/passwd'}}))).toContain('Unknown current screen');
    expect(await call('resources/read',{uri:'file:///etc/passwd'})).toHaveProperty('error');
    expect(JSON.stringify(await call('tools/call',{name:'submit',arguments:noChange}))).toContain('submitted');expect(s.final).toEqual(noChange);
  }finally{child.stdin.end();await new Promise<void>(resolve=>child.once('close',()=>resolve()));await close();}
},15000);
it('audits foreign MCP, shell, file, web and unknown tools fail-closed',()=>{
  const e=(type:string,server='night',tool='list_screens')=>JSON.stringify({type:'item.completed',item:{type,server,tool}});
  expect(auditNightTranscript(e('mcp_tool_call'),NIGHT_TOOLS.map(t=>t.name)).status).toBe('pass');
  for(const text of [e('mcp_tool_call','foreign'),e('mcp_tool_call','night','shell'),e('command_execution'),e('file_change'),e('web_search'),'{bad',JSON.stringify({type:'unknown_tool'})])expect(auditNightTranscript(text,NIGHT_TOOLS.map(t=>t.name)).status).toBe('fail');
});
it('refuses missing, stale, conflicting and wrong-program atlases without launching a renderer',async()=>{
  const f=await fixture(),programHash=geometryProgramHash(f.input.current),componentsSha256=geometryComponentsHash(f.input.current),file=path.join(f.dir,`${programHash}.${componentsSha256}.json`);
  const atlas={schemaVersion:1,programHash,componentsSha256,appSha256:'app',source:'chromium',viewport:{width:1440,height:900},states:[]};
  await writeJson(file,atlas);
  expect(await (await frozenGeometry(f.dir,'app'))({specVersion:'v1',program:f.input.current})).toMatchObject(atlas);
  await expect((await frozenGeometry(f.dir,'stale'))({specVersion:'v1',program:f.input.current})).rejects.toThrow('No matching');
  await expect((await frozenGeometry(f.dir,'app'))({specVersion:'v1',program:{...f.input.current,start:'other'}})).rejects.toThrow('No matching');
});
it('passes a submission through ordinary independent certification and held-out validation without prompting on it',async()=>{
  const f=await fixture(),screen=f.input.current.screens[0],component=screen?.components[0];if(!screen||!component)throw new Error('Missing component');
  const candidate={id:'c1',summary:'Compact',moveType:'reorder',rationale:'less scroll',targets:[component.id],patch:[{op:'replace',path:`/screens/[id=${screen.id}]/components/[id=${component.id}]/size`,from:'',valueJson:'"compact"'}],predicted:{clicks:0,keystrokes:0,scrolls:1,mouseTravelPx:0,scrollPx:10}};
  const submit={hypothesis:'Train-only hypothesis',decision:'change',candidates:[candidate],chosen:['c1'],rationale:'Measured',rejected:[]};
  const backend:JsonLlm={name:'scripted',model:'fixture',async complete(req){if(!req.toolSession)throw new Error('Missing session');await req.toolSession.execute('check_patch',{patch:candidate.patch});await req.toolSession.execute('submit',submit);validateReply(req.schema,req.toolSession.final);return {json:req.toolSession.final,backend:'scripted',model:'fixture',servedBy:null,replayOf:null,promptMatched:null,usage:null};}};
  const s=f.session();f.deps.agent=new ToolNightAgent(new RecordingLlm(backend,f.dir),s,f.input);
  f.input.holdout={day:1,validate:vi.fn(async()=>({day:1,load:'busy',before:{...sumMetrics([]),tasks:1,completed:1,clicks:10,scrolls:5,scrollPx:100,mouseTravelPx:100},after:{...sumMetrics([]),tasks:1,completed:1,clicks:10,scrolls:4,scrollPx:90,mouseTravelPx:100},saving:{clicks:0,keystrokes:0,scrolls:1,scrollPx:10,mouseTravelPx:0,klmDeciSec:0},pctAboveFloor:{before:null,after:null}}))};
  const check=vi.spyOn(f.deps.ehr,'check');const result=await runNight(f.deps,f.input,{offline:true});
  expect(check.mock.calls.length).toBeGreaterThanOrEqual(3);expect(f.input.holdout.validate).toHaveBeenCalledTimes(1);expect(result.record.validation.accepted).toBe(true);expect(result.record.screenCheck).toBeNull();expect(result.record.userResponse.response).toBe('not-offered');
  const r=offlineRecordSchema.parse({...result.record,screenCheck:'skipped',offline:true,label:'offline, screen check skipped, simulator only',decisionId:'night-01/P1',arm:'E',sample:1,queries:{count:s.events.length,tally:s.stats().tally},toolLoop:s.stats(),toolEvents:s.events,tokens:{input:123,output:10,cachedInput:0,source:'backend'},callCount:1,wallTimeMs:100,frozenInputs:'input.json',repeatedMeasuredBad:0,proposedCandidates:1,effects:{train:2,netTrain:2,validation:1,structuralDistance:0}});
  expect(qualityReport([r]).arms[0]).toMatchObject({checkCalls:1,trainValidationGapMean:1,inputTokensPerDecision:123});
  expect(queryCacheReport([r]).status).toContain('proposal-only');expect(queryCacheReport([r]).proposedCachedStartingDigest.queryPlan).toEqual([]);
});
// Codex CLI process contract without an external model. The executable writes
// a normal transcript; MCP dispatch itself is covered by the real bwrap test.
it('rejects Codex tool output without a server-side submit and audits persisted MCP transcripts',async()=>{
  const f=await fixture(),binary=path.join(f.dir,'fake-codex');
  await writeFile(binary,`#!/usr/bin/node\nconst fs=require('fs');const args=process.argv.slice(2);fs.writeFileSync(args[args.indexOf('-o')+1],${JSON.stringify(JSON.stringify(noChange))});console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}));`,{mode:0o700});
  await expect(new CodexLlm({binary,model:'fake'}).complete(f.req(f.session()))).rejects.toThrow('without submit');
  await writeJson(path.join(f.dir,'llm/mcp.json'),{transcript:{stdout:JSON.stringify({type:'item.completed',item:{type:'mcp_tool_call',server:'night',tool:'list_screens'}}),toolEvents:[]}});
  expect((await auditRunTranscripts(f.dir)).status).toBe('pass');
});
it('runs the Codex backend through its private MCP server and records usable replay evidence',async()=>{
  const f=await fixture(),binary=path.join(f.dir,'fake-codex');
  await writeFile(binary,`#!/usr/bin/node
const fs=require('fs'),cp=require('child_process'),rl=require('readline');
const args=process.argv.slice(2),dir=args[args.indexOf('-C')+1];
const config=fs.readFileSync(dir+'/codex-home/config.toml','utf8');
const bridgeArgs=JSON.parse(/^args = (.+)$/m.exec(config)[1]);
const child=cp.spawn('/usr/bin/node',bridgeArgs,{stdio:['pipe','pipe','inherit']});
let id=0;const pending=new Map();rl.createInterface({input:child.stdout}).on('line',line=>{const r=JSON.parse(line);pending.get(r.id)?.(r);pending.delete(r.id);});
const call=(method,params={})=>new Promise(resolve=>{pending.set(++id,resolve);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\\n');});
(async()=>{
 await call('initialize',{protocolVersion:'2024-11-05'});
 await call('tools/call',{name:'list_screens',arguments:{}});
 await call('tools/call',{name:'submit',arguments:${JSON.stringify(noChange)}});
 child.stdin.end();
 fs.writeFileSync(args[args.indexOf('-o')+1],${JSON.stringify(JSON.stringify(noChange))});
 for(const tool of ['list_screens','submit'])console.log(JSON.stringify({type:'item.completed',item:{type:'mcp_tool_call',server:'night',tool}}));
 console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,output_tokens:5,cached_input_tokens:10}}));
})().catch(e=>{console.error(e);process.exit(1);});
`,{mode:0o700});
  const s=f.session(),first=await new RecordingLlm(new CodexLlm({binary,model:'fake',timeoutMs:10000}),f.dir).complete(f.req(s));
  expect(first.json).toEqual(noChange);expect(first.usage).toMatchObject({input_tokens:100,output_tokens:5,cached_input_tokens:10});expect(s.events.map(e=>e.tool)).toEqual(['list_screens','submit']);
  const replay=f.session();expect((await new ReplayLlm(f.dir).complete(f.req(replay))).json).toEqual(noChange);expect(replay.events).toEqual(s.events);expect(replay.stats().inputTokens).toBe(100);
  expect((await auditRunTranscripts(f.dir)).status).toBe('pass');
},15000);
it('proposes only scope-bound cached digests and keeps complaints verbatim and deduplicated',async()=>{
  const f=await fixture(),s=f.session();await s.execute('list_screens',{});await s.execute('list_screens',{});await s.execute('complain',{text:'Need mouse trajectory'});await s.execute('submit',noChange);
  const backend:JsonLlm={name:'scripted',model:'fixture',async complete(){throw new Error('Unused');}};
  f.deps.agent=new ToolNightAgent(new RecordingLlm(backend,f.dir),s,f.input);
  const {emptyRecord}=await import('../src/night.js');
  const {summarizeTrain}=await import('../src/observe.js');
  const base=emptyRecord(f.deps,{night:1,persona:f.input.persona,specVersion:'v1',current:f.input.current,spec:f.input.release.spec},summarizeTrain('P1',f.input.current,[],f.input.programs));
  const record=offlineRecordSchema.parse({...base,offline:true,screenCheck:'skipped',label:'offline, screen check skipped, simulator only',decisionId:'night-01/P1',arm:'E',sample:1,toolLoop:s.stats(),toolEvents:s.events,tokens:{input:1,output:1,cachedInput:0,source:'backend'},callCount:1,wallTimeMs:1,frozenInputs:'input',repeatedMeasuredBad:0,proposedCandidates:0});
  const report=queryCacheReport([record,{...record,sample:2}]);
  expect(report.frequent[0]).toMatchObject({tool:'list_screens',calls:4,decisions:1});
  expect(report.complaints).toEqual(['Need mouse trajectory']);
  expect(report.proposedCachedStartingDigest.scopedDigests[0]).toMatchObject({decisionId:'night-01/P1',scope:'Only this persona/night/frozen program'});
});
it.skipIf(!process.env['EHR_BIN'])('checks deterministic passing and failing patches with the supplied native binary, without Lean builds',async()=>{
  const {createEhr}=await import('../src/ehr.js'),{checkPatch}=await import('../src/night.js'),{programSchema}=await import('../src/schema.js');
  const current=programSchema.parse(JSON.parse(await readFile(new URL('../../releases/v1/personas/P1.json',import.meta.url),'utf8')));
  const ehr=createEhr({fake:false}),gate={specVersion:'v1',prev:current,canonical:current,nextVersion:current.version+1};
  const first=await checkPatch(ehr,current,[],gate);expect(first.check.status,JSON.stringify(first.check)).toBe('pass');
  const second=await checkPatch(ehr,current,[],gate);expect(second.check).toEqual(first.check);
  const screen=current.screens[0],banner=screen?.components.find(c=>c.kind==='banner');if(!screen||!banner)throw new Error('Missing banner');
  const patch=[{op:'remove' as const,path:`/screens/[id=${screen.id}]/components/[id=${banner.id}]`}];
  const refusal=await checkPatch(ehr,current,patch,gate);expect(refusal.check.status).toBe('fail');expect(refusal.check.property).toBeTruthy();
  expect((await checkPatch(ehr,current,patch,gate)).check).toEqual(refusal.check);
});
