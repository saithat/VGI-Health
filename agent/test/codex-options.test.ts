import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { CodexLlm } from '../src/backends/codex.js';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { confinedArgs, auditTranscript, queryRequirements } from '../src/backends/isolation.js';
import { tmp } from './helpers.js';
it('confines file reads to request/runtime directories, with no LLM call', async () => {
  const directory = await tmp('codex-isolation');
  const script = path.join(directory,'probe');
  await writeFile(path.join(directory,'input'),'allowed');
  await writeFile(script, `#!/bin/sh\ntest -f '${directory}/input' || exit 1\ntest ! -e '${process.cwd()}/package.json' || exit 2\ntest ! -e '${path.join(homedir(), '.codex/auth.json')}' || exit 3\nprintf '{"status":"pass"}' > '${directory}/result'\n`);
  await chmod(script,0o755);
  const result = spawnSync('bwrap',confinedArgs(directory,script,[]));
  expect(result.stderr.toString()).toBe(''); expect(result.status).toBe(0);
  expect(JSON.parse(await readFile(path.join(directory,'result'),'utf8'))).toEqual({status:'pass'});
});
it('rejects tool events including outside-temp file reads', () => {
  expect(auditTranscript('{"type":"item.completed","item":{"type":"command_execution","command":"cat /home/world/day9"}}').status).toBe('fail');
  expect(auditTranscript('{"type":"item.completed","item":{"type":"agent_message","text":"{}"}}').status).toBe('pass');
});

it('passes default service tier and high reasoning to a confined stub with zero LLM calls', async()=>{
 const dir=await tmp('codex-stub'), binary=path.join(dir,'stub');
 await writeFile(binary,`#!/bin/sh
 for arg in "$@"; do printf '{"type":"item.completed","item":{"type":"agent_message","text":"%s"}}\\n' "$(printf '%s' "$arg" | sed 's/"/\\\\"/g')"; done
 while [ "$#" -gt 0 ]; do if [ "$1" = "-o" ]; then shift; printf '{"ok":true}' > "$1"; fi; shift; done
 cat >/dev/null
 `);
 await chmod(binary,0o755);
 const result=await new CodexLlm({binary,model:'FAKE',serviceTier:'default',reasoningEffort:'high'}).complete({callId:'stub',purpose:'test',system:'FAKE',prompt:'FAKE',schemaName:'Fake',schema:{}});
 const transcript=JSON.stringify(result.transcript);
 expect(transcript).toContain('service_tier=');expect(transcript).toContain('default');expect(transcript).toContain('model_reasoning_effort=');expect(transcript).toContain('high');
 expect(result.json).toEqual({ok:true});
});
it('accepts the captured live stream and safe metadata items, and records served model only when present',async()=>{
 const {servedModel,transcriptFailure}=await import('../src/backends/codex.js');
 const fixture=JSON.parse(await readFile(path.join(import.meta.dirname,'fixtures/codex-isolated-probe.json'),'utf8'));
 const stream=fixture.events.map((e:unknown)=>JSON.stringify(e)).join('\n');
 expect(auditTranscript(stream).status).toBe('pass');expect(servedModel(stream)).toBe(null);expect(transcriptFailure(stream)).toBe(false);
 expect(servedModel('{"type":"response.created","response":{"model":"served-model"}}')).toBe('served-model');
 for(const type of ['todo_list','error'])expect(auditTranscript(JSON.stringify({type:'item.completed',item:{type}})).status).toBe('pass');
 expect(transcriptFailure('{"type":"item.completed","item":{"type":"error"}}')).toBe(true);
});
it('passes the configured model explicitly when no CLI model is supplied',async()=>{
 const home=await tmp('configured-model'),binary=path.join(home,'stub');
 await writeFile(path.join(home,'config.toml'),'model = "configured-model"\n');
 await writeFile(binary,`#!/bin/sh\nmodel=''\nwhile [ "$#" -gt 0 ]; do case "$1" in -m) shift; model="$1";; -o) shift; output="$1";; esac; shift; done\nprintf '{"model":"%s"}' "$model" > "$output"\ncat >/dev/null\nprintf '{"type":"turn.completed","model":"actual-served"}\\n'\n`);await chmod(binary,0o755);
 const original=process.env['CODEX_HOME'];process.env['CODEX_HOME']=home;
 try{const backend=new CodexLlm({binary}),res=await backend.complete({callId:'configured',purpose:'test',system:'FAKE',prompt:'FAKE',schemaName:'Fake',schema:{}});expect(res.json).toEqual({model:'configured-model'});expect(res.model).toBe('configured-model');expect(res.servedBy).toBe('actual-served');}
 finally{if(original===undefined)delete process.env['CODEX_HOME'];else process.env['CODEX_HOME']=original;}
});

it('rejects Codex fast mode before starting a subprocess',()=>{expect(()=>new CodexLlm({model:'FAKE',serviceTier:'fast'})).toThrow('fast mode is prohibited');});
it('stages arm C train files and enables only confined read-only shell execution (stub, no model)',async()=>{
 const {trainingQueryBundle}=await import('../src/quality-queries.js');
 const {localityDigest}=await import('../src/locality.js');
 const home=await tmp('codex-query-stub'),binary=path.join(home,'stub');
 await writeFile(binary,`#!/usr/bin/python3
import json, os, subprocess, sys
args=sys.argv[1:]
output=args[args.index('-o')+1]
result=subprocess.run(['/usr/bin/node','query.mjs','screens','--limit','1'],capture_output=True,text=True,check=True)
print(json.dumps({'type':'item.completed','item':{'type':'command_execution','id':'query-1','command':'/usr/bin/node query.mjs screens --limit 1','aggregated_output':result.stdout,'status':'completed','exit_code':0}}))
with open(output,'w') as f: json.dump({'args':args,'files':sorted(os.listdir('.'))},f)
sys.stdin.read()
`);await chmod(binary,0o755);
 const bundle=trainingQueryBundle({night:1,train:[]},[],{ledger:[],locality:localityDigest([])});
 const request={callId:'C',purpose:'test',system:'FAKE',prompt:'FAKE',schemaName:'Fake',schema:{},queryBundle:bundle};
 await expect(new CodexLlm({binary,model:'FAKE'}).complete(request)).rejects.toThrow('explicit offline arm-C');
 const response=await new CodexLlm({binary,model:'FAKE',serviceTier:'default',queryMode:true}).complete(request);
 const {z}=await import('zod');
 const result=z.object({args:z.array(z.string()),files:z.array(z.string())}).parse(response.json);
 expect(result.args).toContain('features.shell_tool=true');expect(result.args).toContain('web_search="disabled"');expect(result.args).toContain('mcp_servers={}');expect(result.args).toContain('read-only');
 for(const file of ['traces.json','geometry.json','ledger.json','locality.json','query.mjs','README.md'])expect(result.files).toContain(file);
 const {queryUsage}=await import('../src/backends/query-audit.js');expect(queryUsage(response.usage)).toEqual({count:1,tally:{screens:1}});
});

it.skipIf(!existsSync('/usr/local/bin/codex'))('enforces managed auth read denial and read-only tools in the real Codex sandbox without a model',async()=>{
 const dir=await tmp('codex-query-permissions'),home=path.join(dir,'codex-home');await mkdir(home,{mode:0o700});
 await writeFile(path.join(home,'auth.json'),'FAKE_CREDENTIAL_MARKER');
 await writeFile(path.join(home,'query-requirements.toml'),queryRequirements(dir));
 const {trainingQueryBundle,writeQueryDirectory}=await import('../src/quality-queries.js');
 const {localityDigest}=await import('../src/locality.js');
 await writeQueryDirectory(dir,trainingQueryBundle({night:1,train:[]},[],{ledger:[],locality:localityDigest([])}));
 const probe=`import json, subprocess
r={}
for key,filename,mode in [('train','traces.json','r'),('credential','codex-home/auth.json','r'),('write','new-file','w')]:
 try:
  with open(filename,mode) as f: pass
  r[key]='allowed'
 except OSError: r[key]='denied'
query=subprocess.run(['/usr/bin/node','query.mjs','screens'],capture_output=True,text=True,check=True)
r['query']=json.loads(query.stdout)['query']
print(json.dumps(r))`;
 const run=spawnSync('bwrap',confinedArgs(dir,'/usr/local/bin/codex',['sandbox','-P',':read-only','--include-managed-config','-C',dir,'--','/usr/bin/python3','-c',probe],true),{cwd:dir,encoding:'utf8'});
 expect(run.stderr).toBe('');expect(run.status).toBe(0);expect(JSON.parse(run.stdout)).toEqual({train:'allowed',credential:'denied',write:'denied',query:'screens'});
});
