import { required } from '../src/types.ts';
/** Generate synthetic-only operator inputs from the Lean test fixture. */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fixture, configuration, patient } from './helpers.ts';
const f = await fixture();
const dir = resolve(process.argv[2] ?? required(process.env.TMPDIR));
await mkdir(dir, { recursive: true });
const config = configuration(f, 'dev', ['pt-1']);
await writeFile(resolve(dir, 'commit-config.json'), JSON.stringify(config, null, 2), { mode: 0o600 });
await writeFile(resolve(dir, 'commit-patient.json'), JSON.stringify(patient(f, 'pt-1', 1, true), null, 2));
process.stdout.write(`Synthetic operator inputs: ${dir}/commit-{config,patient}.json\n`);
