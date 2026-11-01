import { CodexLlm } from '../src/backends/codex.js';
import { spawnSync } from 'node:child_process';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { confinedArgs, auditTranscript } from '../src/backends/isolation.js';
import { tmp } from './helpers.js';
it('confines file reads to request/runtime directories, with no LLM call', async () => {
  const directory = await tmp('codex-isolation');
  const script = path.join(directory,'probe');
  await writeFile(path.join(directory,'input'),'allowed');
  await writeFile(script, `#!/bin/sh\ntest -f '${directory}/input' || exit 1\ntest ! -e '${process.cwd()}/package.json' || exit 2\ntest ! -e '/home/saithat/.codex/auth.json' || exit 3\nprintf '{"status":"pass"}' > '${directory}/result'\n`);
  await chmod(script,0o755);
  const result = spawnSync('bwrap',confinedArgs(directory,script,[]));
  expect(result.stderr.toString()).toBe(''); expect(result.status).toBe(0);
  expect(JSON.parse(await readFile(path.join(directory,'result'),'utf8'))).toEqual({status:'pass'});
});
it('rejects tool events including outside-temp file reads', () => {
  expect(auditTranscript('{"type":"item.completed","item":{"type":"command_execution","command":"cat /home/world/day9"}}').status).toBe('fail');
  expect(auditTranscript('{"type":"item.completed","item":{"type":"agent_message","text":"{}"}}').status).toBe('pass');
});

it('passes fast service tier and high reasoning to a confined stub with zero LLM calls', async()=>{
 const dir=await tmp('codex-stub'), binary=path.join(dir,'stub');
 await writeFile(binary,`#!/bin/sh
 for arg in "$@"; do printf '{"type":"item.completed","item":{"type":"agent_message","text":"%s"}}\\n' "$(printf '%s' "$arg" | sed 's/"/\\\\"/g')"; done
 while [ "$#" -gt 0 ]; do if [ "$1" = "-o" ]; then shift; printf '{"ok":true}' > "$1"; fi; shift; done
 cat >/dev/null
 `);
 await chmod(binary,0o755);
 const result=await new CodexLlm({binary,model:'FAKE',serviceTier:'fast',reasoningEffort:'high'}).complete({callId:'stub',purpose:'test',system:'FAKE',prompt:'FAKE',schemaName:'Fake',schema:{}});
 const transcript=JSON.stringify(result.transcript);
 expect(transcript).toContain('service_tier=');expect(transcript).toContain('fast');expect(transcript).toContain('model_reasoning_effort=');expect(transcript).toContain('high');
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
