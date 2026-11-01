// Native preflight; captures exact inputs, stdout, stderr, exit code and timings.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve('runs/run1-preflight');
mkdirSync(out, { recursive: true });
const binary = resolve('lean/.lake/build/bin/ehr');
const results = [];
function check(name, program, canonical) {
  const args = ['check', '--spec', 'releases/v1/spec.json', '--program', program, '--prev', program, '--canonical', canonical];
  const start = Date.now();
  const r = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let verdict; try { verdict = JSON.parse(r.stdout); } catch { verdict = null; }
  const result = { name, command: [binary, ...args], exit: r.status, ms: Date.now() - start, verdict, stdout: r.stdout, stderr: r.stderr, error: r.error?.message };
  results.push(result);
  writeFileSync(`${out}/${name}.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(name, r.status, JSON.stringify(verdict));
  return result;
}
const personas = [];
for (const p of ['P1', 'P2', 'P3', 'P4', 'P5']) {
  const file = `releases/v1/personas/${p}.json`;
  const full = check(`${p}-full-canonical`, file, 'releases/v1/canonical.json');
  const projected = check(`${p}-persona-canonical`, file, file);
  personas.push({ persona: p, full: full.exit, projected: projected.exit });
}
for (const p of readdirSync('programs/bad').filter(p => p.endsWith('.json')).sort()) {
  check(`bad-${p.replace('.json', '')}`, `programs/bad/${p}`, 'releases/v1/canonical.json');
}
writeFileSync(`${out}/results.json`, JSON.stringify({ personas, selected: personas.find(p => p.full === 0 || p.projected === 0)?.persona ?? null, results }, null, 2) + '\n');
