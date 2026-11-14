#!/usr/bin/env node
// Read-only combined-rule replay; stdout is evidence, never a new certificate.
// node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/replay-design-rules.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replayInteractionGate } from '../agent/src/replay-interaction-gate.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = path.resolve(process.argv[2] ?? path.join(root, 'runs/core-10day'));
assert.ok(process.env.TMPDIR, 'Set disk-backed TMPDIR');
const scratch = await mkdtemp(path.join(process.env.TMPDIR, 'design-rules-'));
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const binary = path.join(root, 'lean/.lake/build/bin/ehr');
const layout = path.join(root, 'lean/.lake/build/bin/ui-layout');
const revisions = [];
try {
  for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) {
    const folder = path.join(run, 'certifications', persona);
    for (const version of (await readdir(folder)).filter(v => /^v\d+$/.test(v)).sort()) {
      const specPath = path.join(folder, version, 'spec.json');
      const inputPath = path.join(folder, version, 'inputs.json');
      const programPath = path.join(run, 'programs', persona, `${version}.json`);
      const inputs = await read(inputPath);
      const program = await read(programPath);
      const spec = await read(specPath);
      assert.deepEqual(program, inputs.program, `${persona}/${version}: recorded program differs`);
      // Native check uses the frozen previous and canonical programs, including
      // both R3's added-copy charge and R7's surviving-copy displacement.
      const canonical = path.join(scratch, 'canonical.json');
      const previous = path.join(scratch, 'previous.json');
      await writeFile(canonical, JSON.stringify(inputs.canonical));
      const args = ['check', '--spec', specPath, '--program', programPath, '--canonical', canonical];
      if (inputs.prev) {
        await writeFile(previous, JSON.stringify(inputs.prev));
        args.push('--prev', previous);
      }
      const nativeVerdict = JSON.parse(execFileSync(binary, args, { cwd: root, encoding: 'utf8', timeout: 120_000 }));
      assert.equal(nativeVerdict, 'ok', `${persona}/${version}: R3/R7`);
      const density = JSON.parse(execFileSync(layout, [], {
        input: JSON.stringify({ op: 'program-check', spec, program }) + '\n',
        encoding: 'utf8', timeout: 120_000,
      }));
      assert.equal(density.accepted, true, `${persona}/${version}: R5/G10`);
      revisions.push({ persona, version, nativeVerdict, density,
        specSha256: digest(await readFile(specPath)), inputsSha256: digest(await readFile(inputPath)),
        programSha256: digest(await readFile(programPath)) });
    }
  }
  assert.equal(revisions.length, 33, 'Expected all retained revision bindings');
  const interaction = await replayInteractionGate(run);
  const shipped = interaction.decisions.filter(d => d.shipped);
  assert.equal(interaction.decisions.length, 45);
  assert.equal(shipped.length, 28);
  assert.equal(shipped.filter(d => d.refused).length, 0, 'R1 newly refuses a shipped change');
  console.log(JSON.stringify({
    scope: 'Offline combined R1/R3/R5/R7 checks on frozen inputs and metrics; no recording writes or recertification. G10 covers the fixed Lean shell, not React geometry.',
    nativeSha256: digest(await readFile(binary)), layoutSha256: digest(await readFile(layout)),
    summary: { revisions: revisions.length, nativeAccepted: revisions.length,
      densityAccepted: revisions.length, decisions: interaction.decisions.length,
      shipped: shipped.length, shippedRefused: 0 }, revisions, interaction,
  }, null, 2));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
