/** Offline FHIR import. This is the only initial-state loader; it never overwrites
 * a live stream. Clinical changes after import must use guarded commands. */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { digest, type Obj, type Patient } from './types.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
export function rewrite(value: any, ids: Map<string, string>): any {
  if (Array.isArray(value)) return value.map(v => rewrite(v, ids));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'reference' ? ids.get(String(v)) ?? v : rewrite(v, ids)]));
}
export function normalize(entries: Obj[]) {
  const ids = new Map<string, string>();
  const keys: string[] = [];
  for (const e of entries) {
    const r = e.resource;
    const id = r.id ?? (e.fullUrl?.startsWith('urn:uuid:') ? e.fullUrl.slice(9) :
      createHash('sha256').update(e.fullUrl ?? JSON.stringify(r)).digest('hex').slice(0, 32));
    if (!/^[A-Za-z0-9.-]{1,64}$/.test(id)) throw new Error(`Invalid import id: ${id}`);
    const key = `${r.resourceType}/${id}`;
    keys.push(key);
    if (e.fullUrl) ids.set(e.fullUrl, key);
    ids.set(key, key);
  }
  return entries.map((e, index) => {
    const key = keys[index];
    return { ...rewrite(e.resource, ids), id: key.split('/')[1], meta: { ...e.resource.meta, versionId: '1' } };
  });
}
export async function initialPatients(options: { hospital?: boolean; world?: string; day?: number } = {}): Promise<Patient[]> {
  const entries: Obj[] = [];
  const bases: Obj[][] = [];
  for (const dir of ['fixtures/synthea', ...(options.hospital ? ['fixtures/synthetic-hospital'] : [])]) {
    const index = await read(resolve(root, dir, 'index.json'));
    for (const p of index.patients) {
      const bytes = await readFile(resolve(root, dir, p.file));
      if (p.sha256 && createHash('sha256').update(bytes).digest('hex') !== p.sha256) throw new Error(`Changed fixture: ${p.file}`);
      const b = JSON.parse(bytes.toString());
      entries.push(...b.entry); bases.push(b.entry);
    }
  }
  const world = resolve(root, options.world ?? 'runs/world/2');
  const day = options.day ?? 1;
  const manifest = await read(resolve(world, 'manifest.json'));
  const today = manifest.perDay.find((d: Obj) => d.day === day)?.date;
  if (!today) throw new Error('World day missing');
  const clinical = await read(resolve(root, 'fixtures/clinical/overrides.json')).catch(e => { if (e.code === 'ENOENT') return { entry: [] }; throw e; });
  const context = await read(resolve(world, `context/day-${String(day).padStart(2, '0')}.json`)).catch(e => { if (e.code === 'ENOENT') return undefined; throw e; });
  const { buildResources, loadWorld } = await import(new URL('../../../infra/scripts/seed-world.mjs', import.meta.url).href);
  const data = loadWorld({ world, day });
  const patientRefs = Object.fromEntries(bases.map(es => { const p = es.find(e => e.resource.resourceType === 'Patient')!; const id = p.resource.id ?? p.fullUrl.slice(9); return [id, `Patient/${id}`]; }));
  const generated = buildResources(data, patientRefs, Object.fromEntries(['P1','P2','P3','RN2','P4','P5'].map(p => [p, `Practitioner/${p}`])));
  if (context) {
    const seed = (await read(resolve(world, 'world.json'))).seed;
    const worldId = (...parts: unknown[]) => `wr-${createHash('sha256').update(parts.join('|')).digest('hex').slice(0,32)}`;
    const aliases = new Map<string, string>();
    const alias = (kind: string, id: string, legacy: string) => aliases.set(`day${day}-${legacy}`, `${kind}/${id}`);
    for (const persona of ['P1','P4']) {
      const tasks = data.schedules[persona].tasks;
      const visits = [...new Set(tasks.filter((t: Obj) => ['W1','W5'].includes(t.workflow)).map((t: Obj) => t.patientId))].slice(0,18);
      for (const [i, patient] of visits.entries()) alias('Appointment', worldId(seed, day, `${persona}-slot-${i}`), 'appointment-' + tasks.find((t: Obj) => ['W1','W5'].includes(t.workflow) && t.patientId === patient).id);
    }
    for (const arrival of data.state.today.ed.arrivals) alias('Encounter', worldId(seed, day, `ed-${arrival.taskId}`), `ed-${arrival.taskId}`);
    for (const [i, ip] of data.state.today.ward.censusAtShiftStart.entries()) {
      const admission = data.previous.inpatients.find((p: Obj) => p.patientId === ip.patientId);
      if (admission) alias('Encounter', worldId(seed, day, `ward-${i}`), `inpatient-${admission.admissionId}`);
    }
    for (const schedule of Object.values(data.schedules) as Obj[]) for (const task of schedule.tasks) {
      for (const r of task.todayResources) alias(r.resourceType, r.id, `source-${r.resourceType}-${r.id}`);
      if (task.workflow === 'W2') {
        alias('Task', worldId(seed, day, `${task.id}-result-message`), `result-task-${task.id}`);
        alias('DiagnosticReport', worldId(seed, day, `${task.id}-report`), `result-report-${task.id}`);
      }
    }
    for (const e of generated) {
      const key = e.resource.identifier.find((i: Obj) => i.system === 'https://vgi-health.example/fhir/sid/world').value;
      const target = aliases.get(key);
      if (target) e.resource.id = target.split('/')[1];
    }
  }
  entries.push(...generated, ...(context?.entry ?? []));
  if (!context) {
    const groups: [string,string,string[]][] = [
      ['P1','clinic-schedule',['P1-appointments']], ['P1','inbox',['P1-inbox','P1-refills']],
      ['P2','ed-census',['P2-ed']], ['P3','my-patients',['P3-census']], ['P3','unit-census',['P3-census']],
      ['P4','clinic-schedule',['P4-appointments']], ['P5','clinic-schedule',['P5-appointments']],
      ['P5','or-schedule',['P5-or']], ['P5','consults',['P5-consults']],
    ];
    for (const [persona, code, tags] of groups) entries.push({ resource: { resourceType: 'List', id: `initial-${persona}-${code}-d${day}`,
      status: 'current', mode: 'snapshot', date: today, code: { coding: [{ code }] },
      meta: { tag: [{ system: 'urn:vgi:world:realism', code: persona }] },
      entry: generated.filter((e: Obj) => e.resource.meta.tag.some((t: Obj) => tags.includes(t.code))).map((e: Obj) => ({ item: { reference: e.fullUrl } })) } });
    for (const persona of ['P1','P2','P3','RN2','P4','P5']) entries.push({ resource: { resourceType: 'Practitioner', id: persona,
      name: [{ text: persona }], identifier: [{ system: 'https://vgi-health.example/fhir/sid/persona', value: persona }] } });
  }
  // All rewrites happen before import; they are part of the immutable baseline.
  entries.push(...clinical.entry.filter((e: Obj) => e.resource && (options.hospital || !String(e.key).includes('/sh-')))
    .map((e: Obj) => ({ fullUrl: e.key, resource: { ...e.resource, id: e.key.split('/')[1] } })));
  const resources = normalize(entries);
  const byKey = new Map<string, Obj>();
  for (const r of resources) byKey.set(`${r.resourceType}/${r.id}`, r);
  const knownPatients = [...byKey.values()].filter(r => r.resourceType === 'Patient');
  const patientKeys = new Set(knownPatients.map(r => `Patient/${r.id}`));
  function owner(r: Obj) { return [r.subject?.reference, r.patient?.reference, r.for?.reference, r.beneficiary?.reference,
    ...(r.participant ?? []).map((p: Obj) => p.actor?.reference)].find(v => patientKeys.has(v)); }
  const global = [...byKey.values()].filter(r => r.resourceType !== 'Patient' && !owner(r) &&
    ['Organization','Practitioner','PractitionerRole','Location','List'].includes(r.resourceType));
  return knownPatients.sort((a,b) => a.id.localeCompare(b.id)).map((p, index) => ({ patient: p.id, modelId: index + 1,
    context: { today, now: 600, receipts: [], record: [] },
    bundle: { resourceType: 'Bundle', type: 'collection', entry: [p, ...[...byKey.values()].filter(r => owner(r) === `Patient/${p.id}`), ...global]
      .filter((r, i, all) => all.findIndex(x => x.resourceType === r.resourceType && x.id === r.id) === i).map(resource => ({ resource })) } }));
}
export async function localReleases() {
  const spec = await read(resolve(root, 'releases/v3/spec.json'));
  const releases: Obj = {};
  for (const persona of ['P1','P2','P3','P4','P5']) {
    const program = await read(resolve(root, `releases/v3/personas/${persona}.json`));
    releases[`${persona}-baseline`] = { spec, program, workflows: { chart: { commit: 'signNote', commits: [...spec.commits.map((c: Obj) => c.id), 'markReviewed'], project: true } } };
    releases[persona] = releases[`${persona}-baseline`];
    const run = process.env.COMMIT_RECORDED_RUN ?? 'core-10day-live';
    if (!/^[A-Za-z0-9.-]+$/.test(run)) throw new Error('Invalid recorded run');
    try {
      const dir = resolve(root, 'runs', run);
      const version = (await read(resolve(dir, 'programs', persona, 'deployed.json'))).version;
      const recorded = await read(resolve(dir, 'programs', persona, `v${version}.json`));
      let binding = await read(resolve(dir, 'certs', persona, `v${version}.build.json`));
      if (binding.status === 'bound') {
        if (!/^v[0-9]+\.build\.[0-9]+\.json$/.test(binding.current)) throw new Error('Invalid binding pointer');
        binding = await read(resolve(dir, 'certs', persona, binding.current));
      }
      const build = await read(resolve(root, 'app/dist/build.json'));
      const manifest = await read(resolve(root, 'app/public/ehr/manifest.json'));
      const certificate = await read(resolve(dir, 'certs', persona, `v${version}.json`));
      const nativeHash = createHash('sha256').update(await readFile(resolve(root, 'lean/.lake/build/bin/ehr'))).digest('hex');
      if (binding.appSha256 === build.appSha256 && binding.wasmSha256 === manifest.assets['ehr-interp.wasm'] && binding.ehrSha256 === nativeHash && binding.programSha256 === digest(recorded) && binding.certificateSha256 === digest(certificate) && certificate.verdict === 'ok') {
        const recordedSpec = await read(resolve(dir, 'certifications', persona, `v${version}`, 'spec.json'));
        releases[persona] = { ...releases[persona], spec: recordedSpec, program: recorded, workflows: { chart: { commit: 'signNote', commits: [...recordedSpec.commits.map((c: Obj) => c.id), 'markReviewed'], project: true } } };
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return releases;
}
