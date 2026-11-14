#!/usr/bin/env node
// Read-only replay: harden only high-alert tiers in frozen specifications.
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
if (!process.env.TMPDIR) throw Error('Set disk-backed TMPDIR');
const dir = mkdtempSync(join(process.env.TMPDIR, 'high-alert-policy-'));
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const ehr = process.env.EHR_BIN ?? join(root, 'lean/.lake/build/bin/ehr');
const revisions = [];
try {
  for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5'])
    for (const version of readdirSync(join(root, 'runs/core-10day/certifications', persona)).filter(n => /^v\d+$/.test(n)).sort((a,b) => +a.slice(1)-+b.slice(1))) {
      const binding = join(root, 'runs/core-10day/certifications', persona, version);
      const specFile = join(binding, 'spec.json'), inputFile = join(binding, 'inputs.json');
      const spec = read(specFile), inputs = read(inputFile);
      const hardened = { ...spec, alerts: spec.alerts.map(a => a.cond === 'highAlertMed' ? { ...a, tier: 'interruptive' } : a) };
      const migrated = structuredClone(inputs.program);
      const affected = new Set(hardened.alerts.filter(a => a.cond === 'highAlertMed').map(a => a.id));
      let declarations = 0;
      for (const s of migrated.screens) for (const c of s.components)
        if (affected.has(c.kind?.alert?.alert) && c.kind.alert.popup) { c.kind.alert.popup = false; declarations++; }
      const check = program => {
        for (const [name, value] of Object.entries({ spec: hardened, program, canonical: inputs.canonical, prev: inputs.prev }))
          writeFileSync(join(dir, `${name}.json`), JSON.stringify(value));
        const run = spawnSync(ehr, ['check', '--spec', join(dir, 'spec.json'), '--program', join(dir, 'program.json'),
          '--canonical', join(dir, 'canonical.json'), '--prev', join(dir, 'prev.json')], { cwd: root, encoding: 'utf8' });
        if (![0,1].includes(run.status)) throw Error(run.stderr || run.stdout);
        const verdict = JSON.parse(run.stdout);
        return { accepted: run.status === 0, verdict };
      };
      revisions.push({ id: `${persona}/${version}`, frozenSpecSha256: hash(specFile), frozenInputsSha256: hash(inputFile),
        raw: check(inputs.program), obsoletePopupDeclarations: declarations, afterPopupMigration: check(migrated) });
    }
  console.log(JSON.stringify({ newSpecification: 'Non-removable high-alert medication notices',
    scope: 'Frozen inputs with only highAlertMed tiers strengthened; separate optional-popup declaration migration; no recording writes',
    checkerSha256: hash(ehr), revisions, refused: revisions.filter(r => !r.raw.accepted).map(r => r.id),
    refusedAfterPopupMigration: revisions.filter(r => !r.afterPopupMigration.accepted).map(r => r.id) }, null, 2));
} finally { rmSync(dir, { recursive: true, force: true }); }
