import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');

/** Only the real executable decides state, visibility, validity and commits. */
export class Native {
  constructor(binary) {
    this.binary = binary;
    this.sha256 = digest(readFileSync(binary));
    this.cache = new Map();
    this.calls = 0;
  }
  call(command, input) {
    const json = JSON.stringify(input);
    const key = command + digest(json);
    if (this.cache.has(key)) return structuredClone(this.cache.get(key));
    const result = spawnSync(this.binary, [command], {
      input: json, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30000,
      env: { ...process.env, LEAN_NUM_THREADS: '8' },
    });
    this.calls++;
    if (result.error || result.status !== 0) throw new Error(`native ${command}: ${result.error?.message ?? result.stderr ?? result.stdout}`);
    const output = JSON.parse(result.stdout);
    if (output.error) throw new Error(`native ${command}: ${output.error}`);
    this.cache.set(key, output);
    return structuredClone(output);
  }
}
