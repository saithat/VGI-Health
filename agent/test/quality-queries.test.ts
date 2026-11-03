import path from 'node:path';
import { chmod, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { attachGeometry } from '../src/geometry.js';
import { localityDigest } from '../src/locality.js';
import { trainingQueryBundle, withQueries, writeQueryDirectory } from '../src/quality-queries.js';
import { auditQueryTranscript, boundedQueryTranscript, queryUsage } from '../src/backends/query-audit.js';
import { auditTranscript, confinedArgs } from '../src/backends/isolation.js';
import type { DayResult } from '../src/schema.js';
import type { NightInput } from '../src/night.js';
import type { GeometryAtlas } from '../../app/src/metrics/geometry.js';

const atlas:GeometryAtlas={schemaVersion:1,programHash:'p',componentsSha256:'c',appSha256:'a',viewport:{width:1440,height:900},source:'recorded-fixture',aliases:{},states:[{
  screen:'screen',state:'screen',viewport:{width:1440,height:900},scrollers:{},components:{target:{center:{x:50,y:50},reveal:{x:50,y:50},chain:[],offsets:{}}},
}]};
const result:DayResult=attachGeometry({day:1,persona:'P1',programVersion:0,tasks:[{task:'train-task',clicks:1,keystrokes:0,scrolls:0,popups:0,overrides:0,searches:0,backtracks:0,klmDeciSec:987654321,completed:true}],trace:[{task:'train-task',t:123456789,screen:'screen',event:{click:{comp:'target'}},ops:['point','click','think'],result:'ok'}],floor:[],complaints:[]},atlas);
const train:NightInput['train']=[{result,schedule:{day:1,persona:'P1',load:'busy',tasks:[{id:'train-task',day:1,persona:'P1',workflow:'W1',patientId:'patient',startMin:0,choices:{orders:[],administer:[],ackResult:false,immunizations:[],noteSections:[]},todayResources:[],interruptions:0}]}}];
const context={ledger:[],locality:localityDigest([{result,atlas}])};
const item=(command:string,cwd?:string,output='')=>JSON.stringify({type:'item.completed',item:{id:'tool-1',type:'command_execution',command,...(cwd?{cwd}:{}),aggregated_output:output,status:'completed',exit_code:0}});

it('writes only train projections even when the containing context holds holdout results and repository paths',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'quality-queries-'));
 const poison={...result,complaints:['VALIDATION_SECRET','TEST_SECRET'],trace:result.trace.map(t=>({...t,screen:'VALIDATION_SECRET'}))};
 const input={night:1,train,validation:poison,test:poison,worldDir:'/home/private/repository/runs/day-10'};
 const quality={...context,validation:poison,test:poison,locality:{...context.locality,validation:'VALIDATION_SECRET',worldDir:'/home/private/repository'},ledger:[]};
 const poisonedAtlas={...atlas,validation:'VALIDATION_SECRET'};
 const bundle=trainingQueryBundle(input,[poisonedAtlas],quality);
 await writeQueryDirectory(dir,bundle);
 const files=await readdir(dir),bytes=(await Promise.all(files.map(f=>readFile(path.join(dir,f),'utf8')))).join('\n');
 expect(files.sort()).toEqual(['README.md','attribution.json','geometry.json','ledger.json','locality.json','query.mjs','traces.json'].sort());
 expect(bytes).not.toMatch(/VALIDATION_SECRET|TEST_SECRET|\/home\/private|987654321|123456789|klmDeciSec/);
 const parts={system:'unchanged',prompt:'unchanged'};expect(withQueries(parts)).toBe(parts);
 expect(withQueries(parts,bundle).prompt).toContain('node query.mjs');
 expect(()=>trainingQueryBundle({...input,train:[{...train[0],result:{...result,day:2},schedule:{...train[0]?.schedule,day:2,persona:'P1',load:'busy',tasks:[]}}]},[atlas],context)).toThrow('train days');
});
it('runs all six bounded queries inside bwrap with no dependencies or mutation',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'quality-query-cli-'));
 await writeQueryDirectory(dir,trainingQueryBundle({night:1,train},[atlas],context));
 const files=await readdir(dir),before=await Promise.all(files.map(f=>readFile(path.join(dir,f),'utf8')));
 for(const args of [['screens'],['steps','--task','train-task'],['targets','--sort','travel'],['scroll-past','--target','target'],['sequences'],['ledger']]) {
  const run=spawnSync('bwrap',confinedArgs(dir,'/usr/bin/node',['query.mjs',...args]),{cwd:dir,encoding:'utf8'});
  expect(run.stderr).toBe('');expect(run.status).toBe(0);expect(run.stdout.length).toBeLessThanOrEqual(16000);
  const output=z.object({query:z.string(),cwd:z.literal(dir),rows:z.array(z.unknown())}).parse(JSON.parse(run.stdout));
  expect(output.query).toBe(args[0]);
  if(args[0]==='screens')expect(output.rows).toEqual(context.locality.screens);
  expect(auditQueryTranscript(item(`/usr/bin/node query.mjs ${args.join(' ')}`,undefined,run.stdout),dir).status).toBe('pass');
 }
 expect(await Promise.all(files.map(f=>readFile(path.join(dir,f),'utf8')))).toEqual(before);
 // Long values and huge row counts still produce bounded, parseable JSON.
 await chmod(path.join(dir,'ledger.json'),0o600);
 await writeFile(path.join(dir,'ledger.json'),JSON.stringify(Array.from({length:1000},()=>({summary:'x'.repeat(50000)}))));
 const bounded=spawnSync('/usr/bin/node',['query.mjs','ledger','--limit','100'],{cwd:dir,encoding:'utf8'});
 expect(bounded.status).toBe(0);expect(bounded.stdout.length).toBeLessThanOrEqual(16000);expect(JSON.parse(bounded.stdout).truncated).toBe(true);
 const outside=spawnSync('/usr/bin/node',[path.join(dir,'query.mjs'),'screens'],{cwd:path.dirname(dir),encoding:'utf8'});expect(outside.status).not.toBe(0);
});
it('queries all repeated sequences rather than the fixed digest top-N',async()=>{
 const ids=['first','second'];
 const repeated=attachGeometry({...result,tasks:ids.map(task=>({...result.tasks[0],task,clicks:3,keystrokes:0,scrolls:0,popups:0,overrides:0,searches:0,backtracks:0,klmDeciSec:0,completed:true})),trace:ids.flatMap(task=>Array.from({length:3},(_,t)=>({task,t,screen:'screen',event:{click:{comp:'target'}},ops:['point' as const,'click' as const],result:'ok' as const})))},atlas);
 const template=train[0]?.schedule.tasks[0];if(!template)throw new Error('Missing task fixture');
 const days=[{result:repeated,schedule:{day:1,persona:'P1',load:'busy',tasks:ids.map(id=>({...template,id}))}}];
 const quality={ledger:[],locality:localityDigest([{result:repeated,atlas}],1)};
 const dir=await mkdtemp(path.join(tmpdir(),'quality-query-sequences-'));
 await writeQueryDirectory(dir,trainingQueryBundle({night:1,train:days},[atlas],quality));
 const query=spawnSync('/usr/bin/node',['query.mjs','sequences','--limit','100'],{cwd:dir,encoding:'utf8'});
 expect(query.status).toBe(0);expect(quality.locality.sequences).toHaveLength(1);
 expect(JSON.parse(query.stdout).rows).toHaveLength(2);
});
it('audits command cwd, writes, forbidden tools, deduplicated queries and bounded outputs',()=>{
 const dir='/private/request';
 for(const command of ['echo x > traces.json','echo x | tee file','rm file','cp file other','mv file other','touch file','mkdir sub',`python3 -c "open('f','w').write('x')"`,`node -e "require('fs').writeFileSync('f','x')"`,'cat codex-home/auth.json'])expect(auditQueryTranscript(item(command,dir),dir).status).toBe('fail');
 for(const type of ['mcp_tool_call','web_search','file_change','function_call'])expect(auditQueryTranscript(JSON.stringify({type:'item.completed',item:{type}}),dir).status).toBe('fail');
 for(const type of ['mcp_call','web_search_call','unknown_tool'])expect(auditQueryTranscript(JSON.stringify({type}),dir).status).toBe('fail');
 expect(auditQueryTranscript(item('jq . traces.json','/outside'),dir).status).toBe('fail');
 expect(auditQueryTranscript(item('jq . traces.json'),dir).status).toBe('fail');
 expect(auditQueryTranscript(item('jq . traces.json',dir),dir).status).toBe('pass');
 expect(auditQueryTranscript(item("jq '.clicks > 0' locality.json",dir),dir).status).toBe('pass');
 expect(auditQueryTranscript(item("/bin/bash -lc 'echo x > f'",dir),dir).status).toBe('fail');
 const pwdCommand='/usr/bin/pwd && jq . traces.json';
 const pwdStart=JSON.stringify({type:'item.started',item:{id:'tool-1',type:'command_execution',command:pwdCommand,aggregated_output:''}});
 expect(auditQueryTranscript(pwdStart+'\n'+item(pwdCommand,undefined,dir+'\n{}'),dir).status).toBe('pass');
 expect(auditQueryTranscript(item('node query.mjs screens',dir,JSON.stringify({cwd:'/outside',query:'screens'})),dir).status).toBe('fail');
 expect(auditQueryTranscript(item('/usr/bin/pwd && jq . traces.json',undefined,'/outside\n{}'),dir).status).toBe('fail');
 const command='node query.mjs screens',started=JSON.stringify({type:'item.started',item:{id:'tool-1',type:'command_execution',command}});
 const audit=auditQueryTranscript(started+'\n'+item(command,undefined,JSON.stringify({query:'screens',cwd:dir})),dir);
 expect(audit.status).toBe('pass');expect(audit.commands).toHaveLength(1);expect(queryUsage({isolationAudit:audit})).toEqual({count:1,tally:{screens:1}});
 const bounded=auditQueryTranscript(item('jq . traces.json',dir,'x'.repeat(50000)),dir);expect(bounded.commands[0]?.output).toHaveLength(16000);expect(bounded.commands[0]?.truncated).toBe(true);
 const persisted=z.object({item:z.object({aggregated_output:z.string()})}).parse(JSON.parse(boundedQueryTranscript(item('jq . traces.json',dir,'x'.repeat(50000)))));
 expect(persisted.item.aggregated_output.length).toBeLessThanOrEqual(16000);expect(persisted.item.aggregated_output).toContain('[truncated command output]');
});
it('keeps the production audit object and serialized bytes unchanged',()=>{
 const safe='{"type":"item.completed","item":{"type":"agent_message","text":"{}"}}';
 const legacy={status:'pass',outsideTempReadAudit:'no file-read/tool events',forbiddenToolEvents:0,toolEvents:[],confinement:'bwrap-private-request-directory',policy:'No tool events allowed; all filesystem reads outside request/runtime denied by OS'};
 expect(JSON.stringify(auditTranscript(safe))).toBe(JSON.stringify(legacy));
 const command=JSON.parse(item('node query.mjs screens','/private/request'));
 const rejected={...legacy,status:'fail',outsideTempReadAudit:'forbidden tool attempt; filesystem confinement remains enforced',forbiddenToolEvents:1,toolEvents:[command]};
 expect(JSON.stringify(auditTranscript(JSON.stringify(command)))).toBe(JSON.stringify(rejected));
});
