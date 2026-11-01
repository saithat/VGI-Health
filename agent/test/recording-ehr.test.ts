import { RELEASE_IDS } from '../src/release-config.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { recordingEhr } from '../src/recording-ehr.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { tmp } from './helpers.js';

it('retains checker refusals and command failures in a compressed, indexed command journal', async () => {
  const directory = await tmp('command-journal');
  const inner = createFakeEhr();
  const ehr = recordingEhr(inner, directory);
  const p = fakeCanonical(RELEASE_IDS.base);
  await ehr.check({ specVersion: RELEASE_IDS.base, program: p, prev: p, canonical: p });
  vi.spyOn(inner, 'specExport').mockRejectedValueOnce(new Error('native failure'));
  await expect(ehr.specExport(RELEASE_IDS.base)).rejects.toThrow('native failure');
  const index = (await readFile(path.join(directory, 'index.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  expect(index.map((row) => row.command)).toEqual(['check', 'spec-export']);
  expect(index.map((row) => row.ok)).toEqual([true, false]);
  const failure = JSON.parse(gunzipSync(await readFile(path.join(directory, index[1].file))).toString());
  expect(failure).toMatchObject({ command: 'spec-export', input: RELEASE_IDS.base, error: 'native failure' });
});
