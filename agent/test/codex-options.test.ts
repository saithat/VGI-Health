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
