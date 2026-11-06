import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { confinedArgs } from '../agent/src/backends/isolation.ts';

const root = path.resolve(import.meta.dirname, '..');
test('actual overnight bwrap sandbox cannot see held-out scenarios or results', () => {
  const request = mkdtempSync(path.join(tmpdir(), 'conformance-isolation-'));
  try {
    writeFileSync(path.join(request, 'allowed.json'), '{}');
    const forbidden = [path.join(root, 'conformance'), path.join(root, 'conformance/scenarios.mjs'), path.join(root, 'runs/core-10day/conformance.json')];
    // Explicit argv; no shell interpolation of any path.
    const probe = spawnSync('bwrap', confinedArgs(request, '/bin/sh', ['-c',
      'test -r "$1/allowed.json" || exit 10; shift; for p do test ! -e "$p" || exit 11; done; printf confined',
      'probe', request, ...forbidden]), { encoding: 'utf8' });
    assert.equal(probe.error, undefined);
    assert.equal(probe.status, 0, probe.stderr);
    assert.equal(probe.stdout, 'confined');
  } finally { rmSync(request, { recursive: true, force: true }); }
});

test('prompt and capabilities dependency graph never imports or reads held-out files', () => {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /(?:conformance[\/\\]|conformance\.json|scenarioCatalog|HELDOUT_PRIVATE_SENTINEL)/i, file);
    for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)) {
      const name = path.resolve(path.dirname(file), match[1].replace(/\.js$/, '.ts'));
      if (existsSync(name)) visit(name);
    }
  }
  for (const entry of ['agent/src/prompts.ts', 'agent/src/manual.ts', 'agent/src/backends/codex.ts', 'agent/src/backends/claude.ts']) {
    const file = path.join(root, entry); if (existsSync(file)) visit(file);
  }
  assert.ok(visited.size > 5, 'Must examine real builder dependencies');
});
