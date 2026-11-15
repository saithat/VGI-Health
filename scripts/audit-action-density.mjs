#!/usr/bin/env node
// Read-only measurement of vendor and retained layouts; never issues certificates.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { acquireBrowserLock } from './browser-heavy-lock.mjs';
const root = resolve(import.meta.dirname, '..');
if (!process.env.TMPDIR) throw Error('Set disk-backed TMPDIR');
const out = resolve(process.argv[2] ?? join(process.env.TMPDIR, 'alerts-r5-density'));
mkdirSync(out, { recursive: true });
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (name, value) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + '\n');
const ehr = process.env.EHR_BIN ?? join(root, 'lean/.lake/build/bin/ehr');
const index = read(join(root, 'fixtures/synthea/index.json'));
const bundles = ['adult-allergic', 'pediatric', 'surgical'].map(kind => {
  const p = index.patients.find(p => kind === 'adult-allergic' ? p.flags.allergic && !p.flags.pediatric : p.flags[kind]);
  if (!p) throw Error(`Missing ${kind} fixture`);
  return join(root, 'fixtures/synthea', p.file);
});
const programs = [];
for (const version of ['v1', 'v2', 'v3'])
  for (const persona of ['canonical', 'P1', 'P2', 'P3', 'P4', 'P5'])
    programs.push({ group: 'vendor', id: `${version}/${persona}`, spec: join(root, 'releases', version, 'spec.json'),
      program: join(root, 'releases', version, persona === 'canonical' ? 'canonical.json' : `personas/${persona}.json`) });
for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5'])
  for (const version of readdirSync(join(root, 'runs/core-10day/certifications', persona)).filter(n => /^v\d+$/.test(n)).sort((a,b) => +a.slice(1)-+b.slice(1))) {
    const binding = join(root, 'runs/core-10day/certifications', persona, version);
    const inputs = read(join(binding, 'inputs.json'));
    const file = join(out, `${persona}-${version}.json`);
    writeFileSync(file, JSON.stringify(inputs.program));
    programs.push({ group: 'retained', id: `${persona}/${version}`, spec: join(binding, 'spec.json'), program: file });
  }
// Include the actual vendor v0 and every release-era no-agent reference used
// by retained revisions, rather than silently treating one global maximum as
// the policy. The retained snapshots stay immutable.
for (const persona of ['P1','P2','P3','P4','P5']) {
  const binding=join(root,'runs/core-10day/certifications',persona,'v0');
  const inputs=read(join(binding,'inputs.json'));
  const file=join(out,`${persona}-vendor-v0.json`);writeFileSync(file,JSON.stringify(inputs.program));
  programs.push({group:'vendor-v0',id:persona,spec:join(binding,'spec.json'),program:file});
}
for(const item of programs.filter(p=>p.group==='retained')) {
  const [persona,version]=item.id.split('/');
  const binding=join(root,'runs/core-10day/certifications',persona,version), inputs=read(join(binding,'inputs.json'));
  const day=String((inputs.night ?? 0)+1).padStart(2,'0');
  const reference=join(root,'runs/core-10day/no-agent/days',`day-${day}`,`${persona}.program.json`);
  const p=read(reference);
  if(p.specVersion!==inputs.program.specVersion)throw Error(`Reference release mismatch: ${item.id}`);
  const id=`${persona}/${p.specVersion}`;item.reference=id;
  if(!programs.some(p=>p.group==='reference' && p.id===id))
    programs.push({group:'reference',id,spec:item.spec,program:reference});
}
const files = new Map(), entries = [];
if (!process.argv.includes('--reuse-exports')) {
  for (const [i, item] of programs.entries()) {
    const p = read(item.program), user = join(out, 'user.json');
    writeFileSync(user, JSON.stringify({ id: p.owner, role: p.role }));
    const states = [];
    for (const [b, bundle] of bundles.entries()) {
      const dir = join(out, 'exports', String(i), String(b));
      const result = spawnSync(ehr, ['render-screens', '--spec', item.spec, '--program', item.program,
        ...(p.owner === 'canonical' ? [] : ['--user', user]), '--fhir', bundle, '--today', index.referenceDate, '--ui', '--out', dir], { cwd: root, encoding: 'utf8' });
      if (result.status !== 0) throw Error(result.stderr || result.stdout);
      for (const name of readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
        const file = join(dir, name), hash = createHash('sha256').update(readFileSync(file)).digest('hex');
        if (!files.has(hash)) files.set(hash, file);
        states.push({ file, checkedAs: files.get(hash) });
      }
    }
    entries.push({ ...item, programSha256: createHash('sha256').update(readFileSync(item.program)).digest('hex'), states });
    console.log(`${item.group} ${item.id}: ${states.length} states; ${files.size} distinct total`);
  }
  write('exports.json', { bundles, checkerSha256: createHash('sha256').update(readFileSync(ehr)).digest('hex'), entries });
  write('manifest.json', [...files.values()]);
}
if (process.argv.includes('--export-only')) process.exit(0);
const lock = await acquireBrowserLock();
try {
  const report = join(out, 'playwright.json');
  const result = spawnSync(process.execPath, [join(root, 'app/node_modules/@playwright/test/cli.js'), 'test', 'action-density.spec.ts',
    '--project', 'desktop', '--workers', String(Math.min(4, Number(process.env.EHR_SCREEN_WORKERS ?? 4))), '--reporter', 'list,json'], {
    cwd: join(root, 'app'), stdio: 'inherit', env: { ...process.env, APP_TEST_PREVIEW: '1',
      EHR_DENSITY_MANIFEST: join(out, 'manifest.json'), PLAYWRIGHT_JSON_OUTPUT_NAME: report },
  });
  if (result.status !== 0) throw Error(`Density browser measurement failed: ${result.status}`);
  const samples = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) for (const run of test.results ?? [])
      for (const a of run.attachments ?? []) if (a.name === 'action-density-batch')
        samples.push(...JSON.parse(a.path ? readFileSync(a.path, 'utf8') : Buffer.from(a.body, 'base64').toString()));
    for (const child of suite.suites ?? []) visit(child);
  }
  visit(read(report));
  const byFile = new Map();
  for (const sample of samples) byFile.set(sample.file, [...(byFile.get(sample.file) ?? []), sample]);
  const { entries, bundles } = read(join(out, 'exports.json'));
  const measured = entries.map(entry => {
    const screens = new Map();
    for (const state of entry.states) {
      const measurements = byFile.get(state.checkedAs);
      if (!measurements) throw Error(`Missing density measurement: ${state.file}`);
      for (const m of measurements) {
        const id = m.screen ?? state.file.split('/').at(-1).split('__')[0];
        const prior = screens.get(id) ?? { screen: id, first: 0, scroll: 0, maximum: 0, fixed: 0 };
        prior.first = Math.max(prior.first, m.first);
        prior.scroll = Math.max(prior.scroll, ...m.windows.map(w => w.count));
        prior.maximum = Math.max(prior.maximum, m.maximum);
        prior.fixed = Math.max(prior.fixed, m.fixedTargets);
        screens.set(id, prior);
      }
    }
    return { group: entry.group, id: entry.id, ...(entry.reference?{reference:entry.reference}:{}), programSha256: entry.programSha256,
      states: entry.states.length, screens: [...screens.values()].sort((a,b) => a.screen.localeCompare(b.screen)) };
  });
  const limit = Math.max(...measured.filter(m => m.group === 'vendor').flatMap(m => m.screens.map(s => s.maximum)));
  const refused = measured.filter(m=>m.group==='retained').flatMap(m=>{
    const reference=measured.find(r=>r.group==='reference'&&r.id===m.reference);
    if(!reference)throw Error(`Missing reference ${m.reference}`);
    const limits=Object.fromEntries(reference.screens.map(s=>[s.screen,s.maximum]));
    const screens=m.screens.filter(s=>s.maximum>(limits[s.screen]??57)).map(s=>({screen:s.screen,measured:s.maximum,limit:limits[s.screen]??57}));
    return screens.length?[{id:m.id,reference:m.reference,screens}]:[];
  });
  const summary = { viewport: [1440, 900], bundles, vendorMaximum: limit, fallbackLimit:57, retainedRefused: refused,
    bindings: { app: read(join(root, 'app/dist/build.json')),
      measurementSha256: createHash('sha256').update(readFileSync(join(root, 'app/e2e/action-density.ts'))).digest('hex'),
      policy: read(join(root, 'docs/design/screen-density.json')),
      checkerSha256: read(join(out, 'exports.json')).checkerSha256 },
    distinctTrees: byFile.size, measurements: samples.length, programs: measured };
  write('density-report.json', summary);
  console.log(JSON.stringify({ vendorMaximum: limit, fallbackLimit:57, retainedRefused: refused, distinctTrees: byFile.size }));
} finally { lock.release(); }
