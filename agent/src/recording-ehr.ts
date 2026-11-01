/** Journal every real checker/simulator/deploy operation, including rejected and failed calls. */
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import type { EhrClient } from './ehr.js';
import { sha256 } from './program.js';

export function recordingEhr(inner: EhrClient, directory: string): EhrClient {
  let sequence = 0;
  const call = async <T>(command: string, input: unknown, operation: () => Promise<T>): Promise<T> => {
    const id = `${Date.now()}-${process.pid}-${++sequence}-${command}`;
    const startedAt = new Date().toISOString();
    let result: T;
    try {
      result = await operation();
    } catch (error) {
      await save({ startedAt, command, input, error: error instanceof Error ? error.message : String(error) }, false);
      throw error;
    }
    await save({ startedAt, command, input, result }, true);
    return result;
    async function save(record: unknown, ok: boolean) {
      await mkdir(directory, { recursive: true });
      const json = JSON.stringify(record);
      const file = `${id}.json.gz`;
      await writeFile(path.join(directory, file), gzipSync(json));
      await appendFile(path.join(directory, 'index.jsonl'), JSON.stringify({ id, command, file, ok, sha256: sha256(json) }) + '\n');
    }
  };
  return {
    mode: inner.mode, binary: inner.binary,
    check: (input) => call('check', input, () => inner.check(input)),
    simulate: (input) => call('simulate', input, () => inner.simulate(input)),
    minClicks: (input) => call('min-clicks', input, () => inner.minClicks(input)),
    deploy: (input) => call('deploy', input, () => inner.deploy(input)),
    renderScreens: (input) => call('render-screens', input, () => inner.renderScreens(input)),
    runBatch: (input) => call('run-batch', input, () => inner.runBatch(input)),
    specExport: (input) => call('spec-export', input, () => inner.specExport(input)),
  };
}
