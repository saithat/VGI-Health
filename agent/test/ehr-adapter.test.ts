/**
 * The real `ehr` adapter against a stub binary: pins the ASSUMED command
 * lines and output handling (documented in src/ehr.ts and docs/STATUS.md) so the
 * Lean lane can diff its CLI against them.
 */
import { chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEhr } from '../src/ehr.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { fakeSchedule, FAKE_PERSONAS } from '../src/fake/world.js';
import { tmp } from './helpers.js';

const VIOLATION = { violation: { property: 'UnitsRight', message: 'lb', counterexample: [{ click: { comp: 'b' } }], screens: ['s'] } };
const CERT = { specVersion: 'v1', specHash: 'h', programHash: 'p', verdict: 'ok', checkerVersion: 'stub', time: 't' };
const DAY = { day: 1, persona: 'P1', programVersion: 0, trace: [], tasks: [], floor: [], complaints: [] };

async function stub(dir: string, verdictOk: boolean): Promise<{ bin: string; log: string }> {
  const bin = path.join(dir, 'ehr');
  const log = path.join(dir, 'args.log');
  await writeFile(bin, `#!/bin/sh
echo "$@" >> ${log}
case "$1" in
  check) ${verdictOk ? "echo '\"ok\"'" : `echo '${JSON.stringify(VIOLATION)}'; exit 1`} ;;
  deploy) ${verdictOk ? `echo '${JSON.stringify(CERT)}'` : `echo '${JSON.stringify(VIOLATION)}'; exit 1`} ;;
  simulate) echo '${JSON.stringify(DAY)}' ;;
  min-clicks) echo '{"tasks":[{"task":"t1","workflow":"W1","clicks":6,"keystrokes":2}]}' ;;
  run-batch) printf '{"case":0,"index":0}\n{"case":0,"index":1}\n' ;;
  spec-export) echo '{"version":"tiny-1","elements":[],"infos":[],"commits":[],"entries":[],"reviews":[],"alerts":[],"design":{"maxDepth":3,"minTextSize":1,"stabilityBudget":5,"landmarks":["patientBanner"],"catalog":["banner"]}}' ;;
  *) echo "unknown" >&2; exit 2 ;;
esac
`);
  await chmod(bin, 0o755);
  return { bin, log };
}

describe('ehr CLI adapter (stub binary)', () => {
  const program = fakeCanonical('v1');
  const persona = FAKE_PERSONAS[0];
  const schedule = fakeSchedule(1, 'P1', 7);

  it('passes the documented flags and parses Verdict / Certificate / DayResult / min-clicks', async () => {
    const dir = await tmp('stub-ok');
    const { bin, log } = await stub(dir, true);
    const ehr = createEhr({ fake: false, binary: bin });
    expect(ehr.mode).toBe('real');
    expect(await ehr.check({ specVersion: 'v1', program, prev: program, canonical: program })).toBe('ok');
    expect(await ehr.deploy({ specVersion: 'v1', program, prev: program, canonical: program, outDir: dir })).toEqual({ deployed: true, certificate: CERT });
    if (!persona) throw new Error('persona');
    expect((await ehr.simulate({ specVersion: 'v1', program, persona, schedule, worldDir: '/w', seed: 3 })).day).toBe(1);
    expect((await ehr.minClicks({ specVersion: 'v1', program, schedule, worldDir: '/w' })).tasks[0]?.clicks).toBe(6);
    expect(await ehr.runBatch([{ spec: {}, program: {}, facts: {}, user: {}, events: [] }])).toEqual([{ case: 0, index: 0 }, { case: 0, index: 1 }]);
    expect((await ehr.specExport('tiny')).version).toBe('tiny-1');
    const lines = (await readFile(log, 'utf8')).trim().split('\n');
    expect(lines[0]).toMatch(/^check --spec \S+\/releases\/v1\/spec\.json --program \S+program\.json --prev \S+prev\.json --canonical \S+canonical\.json$/);
    expect(lines[1]).toMatch(/^deploy --spec \S+\/releases\/v1\/spec\.json --program \S+ --prev \S+ --canonical \S+ --out /);
    expect(lines[2]).toMatch(/^simulate --spec v1 --program \S+ --persona \S+persona\.json --schedule \S+schedule\.json --world \/w --seed 3$/);
    expect(lines[3]).toMatch(/^min-clicks --spec v1 --program \S+ --schedule \S+ --world \/w$/);
    expect(lines[4]).toMatch(/^run-batch \S+batch\.jsonl$/);
    expect(lines[5]).toBe('spec-export tiny');
  });

  it('reads a violation from a non-zero exit, and deploy refusals as { deployed: false }', async () => {
    const dir = await tmp('stub-bad');
    const { bin } = await stub(dir, false);
    const ehr = createEhr({ fake: false, binary: bin });
    expect(await ehr.check({ specVersion: 'v1', program, prev: program, canonical: program })).toEqual(VIOLATION);
    expect(await ehr.deploy({ specVersion: 'v1', program, prev: program, canonical: program, outDir: dir })).toEqual({ deployed: false, verdict: VIOLATION });
  });

  it('explains a missing binary', async () => {
    const ehr = createEhr({ fake: false, binary: '/nonexistent/ehr' });
    await expect(ehr.check({ specVersion: 'v1', program, prev: program, canonical: program })).rejects.toThrow(/not found/);
  });
});
