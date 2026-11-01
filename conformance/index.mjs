#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, renameSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { Native, digest } from './native.mjs';
import { fixtures, scenarioCatalog } from './scenarios.mjs';
import { historicalRunIds, historicalReleaseId } from '../scripts/historical-releases.mjs';

export const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const rel = file => path.relative(root, file).split(path.sep).join('/');
const equal = (a, b) => digest(a) === digest(b);

export function canonicals() {
  return ['v1', 'v2', 'v3'].flatMap(release => ['P1', 'P2', 'P3', 'P4', 'P5'].map(persona => {
    const programPath = path.join(root, 'releases', release, 'personas', `${persona}.json`);
    const specPath = path.join(root, 'releases', release, 'spec.json');
    return { id: `canonical/${release}/${persona}`, persona, kind: 'canonical', release, semanticRelease: release,
      programPath, specPath, program: read(programPath), spec: read(specPath), certification: 'canonical export; checker evidence recorded separately' };
  }));
}

export function runTargets(id) {
  if (!/^[\w-]+$/.test(id)) throw new Error('Invalid run id');
  const dir = path.join(root, 'runs', id), manifest = read(path.join(dir, 'manifest.json'));
  if (manifest.runId !== id || manifest.ehr.mode !== 'real') throw new Error('Expected matching real native run manifest');
  const replay = existsSync(path.join(dir, 'replay.json')) ? read(path.join(dir, 'replay.json')) : null;
  const result = [];
  for (const persona of manifest.personas) {
    const folder = path.join(dir, 'programs', persona);
    const versions = readdirSync(folder).filter(name => /^v\d+\.json$/.test(name)).sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)));
    for (const version of versions) {
      const programPath = path.join(folder, version), program = read(programPath);
      const certPath = path.join(dir, 'certs', persona, version);
      if (!existsSync(certPath)) throw new Error(`Revision ${persona}/${version} has no deployment certificate; refusing to silently omit it`);
      const certificate = read(certPath);
      if (certificate.verdict !== 'ok' || certificate.specVersion !== program.specVersion) throw new Error(`Certificate mismatch: ${rel(certPath)}`);
      const frozenPath = path.join(dir, 'certifications', persona, version.slice(0, -5), 'spec.json');
      const trajectoryPath = path.join(dir, 'trajectories', 'specs', `${program.specVersion}.json`);
      const candidates = replay?.contexts.filter(c => c.specVersion === program.specVersion) ?? [];
      if (candidates.some(c => !equal(c.spec, candidates[0].spec))) throw new Error(`Ambiguous archived spec ${program.specVersion}`);
      // Frozen deployment inputs outrank trajectories and archived replay. Never
      // relabel an archived release into today's rules and silently retest it.
      let spec, specPath;
      if (existsSync(frozenPath)) { spec = read(frozenPath); specPath = frozenPath; }
      else if (existsSync(trajectoryPath)) { spec = read(trajectoryPath); specPath = trajectoryPath; }
      else if (candidates.length) { spec = candidates[0].spec; specPath = path.join(dir, 'replay.json'); }
      else if (historicalRunIds.has(id)) throw new Error(`No immutable archived spec for ${id}/${program.specVersion}`);
      else { specPath = path.join(root, 'releases', program.specVersion, 'spec.json'); spec = read(specPath); }
      if (spec.version !== program.specVersion) throw new Error(`Spec version mismatch: ${rel(programPath)}`);
      result.push({ id: `${id}/${persona}/${version.slice(0, -5)}`, persona, kind: 'deployed', revision: program.version,
        release: program.specVersion, semanticRelease: historicalRunIds.has(id) ? historicalReleaseId(program.specVersion) : program.specVersion,
        archived: historicalRunIds.has(id), programPath, specPath, program, spec, certificate,
        certification: `recorded ${rel(certPath)}; not a new certification` });
    }
  }
  return result;
}

export function table(report) {
  const targets = report.targets.map(t => t.id);
  const rows = [`| Scenario | ${targets.join(' | ')} |`, `|---|${targets.map(() => '---').join('|')}|`];
  for (const scenario of report.scenarios) rows.push(`| ${scenario.id} | ${targets.map(id => {
    const r = report.results.find(r => r.target === id && r.scenario === scenario.id);
    return r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : '—';
  }).join(' | ')} |`);
  rows.push('', '— = not applicable (role, workflow, release, or optional feature); exact reasons in JSON.', '', '| Revision | Passed | Failed | Not applicable |', '|---|---:|---:|---:|');
  for (const t of report.targets) rows.push(`| ${t.id} | ${t.passed} | ${t.failed} | ${t.notApplicable} |`);
  rows.push('', '| Scenario | Revision | Observed outcome |', '|---|---|---|');
  for (const r of report.results.filter(r => r.status === 'fail')) rows.push(`| ${r.scenario} | ${r.target} | ${r.observed.replaceAll('|', '\\|').replaceAll('\n', ' ')} |`);
  return rows.join('\n') + '\n';
}

export async function runSuite({ targets, binary, runId = null, selected }) {
  const native = new Native(binary);
  const scenarios = scenarioCatalog.filter(s => !selected || selected.split(',').some(part => s.id.includes(part)));
  const report = { schemaVersion: 1, suite: 'held-out-core-rule-conformance', runId,
    generatedAt: new Date().toISOString(), independentOfChecker: true, deploymentGate: false,
    boundary: 'Native interpreter + FHIR projection. Does not exercise browser painter, persistence, or shell patient-selection wiring.',
    native: { binary: realpathSync(binary), sha256: native.sha256, calls: 0 },
    scenarios: scenarios.map(({ run, applies, ...s }) => s), targets: [], results: [] };
  for (const target of targets) {
    const fixture = fixtures(native, target);
    const { program, spec, programPath, specPath, ...metadata } = target;
    const result = { ...metadata, programPath: rel(programPath), specPath: rel(specPath),
      programSha256: digest(readFileSync(programPath)), specSha256: digest(spec), passed: 0, failed: 0, notApplicable: 0 };
    for (const s of scenarios) {
      native.lastDriver = null;
      if (!s.applies(target)) {
        result.notApplicable++;
        report.results.push({ target: target.id, scenario: s.id, status: 'not-applicable', observed: 'Outside this role/workflow/release or optional feature not surfaced' });
        continue;
      }
      try {
        const { d, observed, ...details } = s.run(fixture);
        result.passed++;
        report.results.push({ target: target.id, scenario: s.id, status: 'pass', observed, ...details,
          testedProgramSha256: digest(d.program), steps: d.trace.length });
      } catch (e) {
        result.failed++;
        const d = native.lastDriver;
        report.results.push({ target: target.id, scenario: s.id, status: 'fail', observed: e.message,
          scope: s.scope ?? 'exact-program', ...(d ? { facts: d.facts, user: d.input.user, trace: d.trace, finalState: d.state,
            testedProgramSha256: digest(d.program) } : {}) });
      }
    }
    report.targets.push(result);
    native.cache.clear();
    console.error(`${target.id}: ${result.passed} pass / ${result.failed} fail / ${result.notApplicable} not applicable`);
  }
  report.native.calls = native.calls;
  report.summary = { targets: targets.length, scenarios: scenarios.length,
    passed: report.results.filter(r => r.status === 'pass').length, failed: report.results.filter(r => r.status === 'fail').length,
    notApplicable: report.results.filter(r => r.status === 'not-applicable').length };
  return report;
}

/** Workers run read-only native processes; no model calls or agent delegation. */
export async function runParallel({ targets, binary, runId = null, selected, jobs = 2 }) {
  if (targets.length < 2 || jobs === 1) return runSuite({ targets, binary, runId, selected });
  const reports = new Array(targets.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, targets.length) }, async () => {
    while (next < targets.length) {
      const i = next++;
      reports[i] = await new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./worker.mjs', import.meta.url), { workerData: { target: targets[i], binary, selected } });
        worker.once('message', m => m.error ? reject(new Error(m.error)) : resolve(m.report));
        worker.once('error', reject);
        worker.once('exit', code => { if (code) reject(new Error(`Conformance worker exited ${code}`)); });
      });
    }
  }));
  const first = reports[0];
  return { ...first, runId, generatedAt: new Date().toISOString(),
    native: { ...first.native, calls: reports.reduce((n, r) => n + r.native.calls, 0), jobs },
    targets: reports.flatMap(r => r.targets), results: reports.flatMap(r => r.results),
    summary: { targets: targets.length, scenarios: first.scenarios.length,
      passed: reports.reduce((n, r) => n + r.summary.passed, 0), failed: reports.reduce((n, r) => n + r.summary.failed, 0),
      notApplicable: reports.reduce((n, r) => n + r.summary.notApplicable, 0) } };
}

function writeAtomic(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n'); renameSync(temp, file);
}
export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args: args.filter(x => x !== '--'), options: {
    program: { type: 'string' }, spec: { type: 'string' }, run: { type: 'string' },
    binary: { type: 'string' }, out: { type: 'string' }, canonical: { type: 'boolean' }, scenario: { type: 'string' },
    jobs: { type: 'string', default: '2' },
  } });
  if (!!values.program !== !!values.spec) throw new Error('--program and --spec are required together');
  if (!values.program && !values.run && !values.canonical) throw new Error('Usage: pnpm conformance --program <file> --spec <file> | --run <id> | --canonical');
  const binary = values.binary ?? process.env.EHR_BIN ?? [path.join(root, 'lean/.lake/build/bin/ehr'), path.join(root, '.cache/conformance/ehr')].find(existsSync);
  if (!binary) throw new Error('Native ehr missing: build with LEAN_NUM_THREADS=8 or set EHR_BIN');
  let targets;
  if (values.program) {
    const programPath = path.resolve(values.program), specPath = path.resolve(values.spec), program = read(programPath), spec = read(specPath);
    const persona = /(?:^|[\/.-])(P[1-5])(?:[\/.-]|$)/.exec(programPath)?.[1];
    targets = [{ id: `program/${program.id}/v${program.version}`, kind: 'program', persona, release: spec.version,
      semanticRelease: spec.version, revision: program.version, programPath, specPath, program, spec, certification: 'not evaluated by this behavioral runner' }];
  } else targets = [...canonicals(), ...(values.run ? runTargets(values.run) : [])];
  const jobs = Number(values.jobs);
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 4) throw new Error('--jobs must be 1–4');
  const report = await runParallel({ targets, binary: path.resolve(binary), runId: values.run ?? null, selected: values.scenario, jobs });
  const output = values.out ? path.resolve(values.out) : values.run
    ? path.join(root, 'runs', values.run, values.scenario ? 'conformance.partial.json' : 'conformance.json')
    : path.join(root, 'conformance/results', values.program ? 'program.json' : 'canonical.json');
  writeAtomic(output, report);
  writeFileSync(output.replace(/\.json$/, '') + '.md', table(report));
  console.log(table(report));
  console.log(`JSON: ${rel(output)}\n${report.summary.passed} passed; ${report.summary.failed} failed; ${report.summary.notApplicable} not applicable`);
  return report.summary.failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(e => { console.error(e); process.exitCode = 2; });
}
