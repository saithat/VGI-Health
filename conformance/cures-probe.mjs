#!/usr/bin/env node
/** Separate checker evidence; never a behavioral scenario expectation. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { digest } from './native.mjs';
import { info } from './driver.mjs';

export function curesProbe(target, binary) {
  const scratch = mkdtempSync(join(tmpdir(), 'cures-probe-'));
  try {
    const program = structuredClone(target.program);
    for (const screen of program.screens) screen.components = screen.components.filter(c => !info('curesReport')(c));
    const programPath = join(scratch, 'program.json');
    writeFileSync(programPath, JSON.stringify(program));
    const result = spawnSync(binary, ['check', '--spec', target.specPath, '--program', programPath, '--canonical', target.programPath], {
      encoding:'utf8', env:process.env, timeout:120000,
    });
    assert.ifError(result.error);
    const verdict = JSON.parse(result.stdout);
    assert.equal(result.status, 1, 'Removing mandatory CURES display without a reachable waiver must fail');
    assert.equal(verdict.violation?.property, 'completable');
    assert.match(verdict.violation.message, /curesReport/);
    return {program:'P1 v3 copy with only curesReport panels removed',
      command:'ehr check --spec releases/v3/spec.json --program <copy> --canonical releases/v3/personas/P1.json',
      binarySha256:digest(readFileSync(binary)), programSha256:digest(program), specSha256:digest(target.spec),
      exitCode:result.status, verdict, purpose:'Separate audit, not consulted by behavioral suite'};
  } finally { rmSync(scratch, {recursive:true, force:true}); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const {canonicals, root} = await import('./index.mjs');
  const probe = curesProbe(canonicals().find(t => t.release === 'v3' && t.persona === 'P1'),
    process.env.EHR_BIN ?? join(root, 'lean/.lake/build/bin/ehr'));
  writeFileSync(join(root,'conformance/results/cures-probe-check.json'),JSON.stringify(probe,null,2)+'\n');
  console.log(`CURES removal: ${probe.verdict.violation.property} refusal; current inputs bound`);
}
