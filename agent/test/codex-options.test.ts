import { chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CodexLlm } from '../src/backends/codex.js';
import { tmp } from './helpers.js';
it('passes fast service tier and high effort to a stub CLI without making an LLM request', async () => {
  const directory = await tmp('codex-options');
  const binary = path.join(directory, 'stub-codex');
  const log = path.join(directory, 'argv');
  await writeFile(binary, `#!/bin/sh\nprintf '%s\\n' "$@" > '${log}'\nwhile [ "$#" -gt 0 ]; do\n if [ "$1" = "-o" ]; then shift; printf '{"ok":true}' > "$1"; fi\n shift\ndone\ncat >/dev/null\nprintf '{"type":"FAKE_STUB"}\\n'\n`);
  await chmod(binary, 0o755);
  const backend = new CodexLlm({ binary, model: 'stub', serviceTier: 'fast', reasoningEffort: 'high' });
  const response = await backend.complete({ callId: 'stub', purpose: 'test', system: 'FAKE', prompt: 'FAKE', schemaName: 'fake', schema: {} });
  expect(await readFile(log, 'utf8')).toContain('service_tier="fast"');
  expect(await readFile(log, 'utf8')).toContain('model_reasoning_effort="high"');
  expect(response.usage).toEqual({ serviceTier: 'fast', reasoningEffort: 'high' });
});
