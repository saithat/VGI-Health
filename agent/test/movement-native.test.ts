import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createEhr } from '../src/ehr.js';
import { programSchema } from '../src/schema.js';
import { z } from 'zod';
import { withData } from './data.js';

describe.skipIf(!process.env.EHR_BIN)('native retained movement budget', () => {
withData('runs/core-10day/programs', 'runs/core-10day/certifications').it('R7 still accepts all 33 retained revisions with frozen native certification inputs', async () => {
  const root = path.resolve(import.meta.dirname, '../../runs/core-10day');
  const ehr = createEhr({ fake: false });
  const load = async (file: string) => programSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  let checked = 0;
  for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) {
    const directory = path.join(root, 'certifications', persona);
    for (const version of (await readdir(directory)).filter(v => /^v\d+$/.test(v)).sort()) {
      const inputDir = path.join(directory, version);
      const inputs = z.object({ program: programSchema, prev: programSchema, canonical: programSchema })
        .parse(JSON.parse(await readFile(path.join(inputDir, 'inputs.json'), 'utf8')));
      const program = await load(path.join(root, 'programs', persona, `${version}.json`));
      expect(program).toEqual(inputs.program);
      expect(await ehr.check({ specVersion: path.join(inputDir, 'spec.json'), program,
        prev: inputs.prev, canonical: inputs.canonical }), `${persona}/${version}`).toEqual('ok');
      checked++;
    }
  }
  expect(checked).toBe(33);
}, 120_000);
});
