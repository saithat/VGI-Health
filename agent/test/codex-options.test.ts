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
