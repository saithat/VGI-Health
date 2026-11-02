/** Build local visual-review inputs from the committed world and actual FHIR
 * seeder. Does not contact Medplum or write clinical records.
 * Usage: node lean/Ehr/Canonical/review_surgery_data.mjs /tmp/surg-review [day]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadWorld, buildResources } from '../../../infra/scripts/seed-world.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = process.argv[2] ?? '/tmp/surg-review';
const day = Number(process.argv[3] ?? '2');
const read = async path => JSON.parse(await readFile(`${root}/${path}`, 'utf8'));
const index = await read('fixtures/synthea/index.json');
const data = loadWorld({ world: `${root}/runs/world/2`, day });
const patients = Object.fromEntries(index.patients.map(p => [p.id, `Patient/${p.id}`]));
// Synthetic practitioner names are the same ones in infra/scripts/setup.mjs.
const names = { P1: ['Maya', 'Chen'], P2: ['Marcus', 'Okafor'], P3: ['Rosa', 'Delgado'],
  RN2: ['Ethan', 'Park'], P4: ['Priya', 'Raman'], P5: ['James', 'Whitaker'] };
const practitioners = Object.fromEntries(Object.keys(names).map(p => [p, `Practitioner/${p}`]));
const entries = buildResources(data, patients, practitioners);
const references = new Map(entries.map(e => [e.fullUrl, `${e.resource.resourceType}/${e.fullUrl.slice(9)}`]));
function rewrite(value, mapping) {
  if (typeof value === 'string') return mapping.get(value) ?? value;
  if (Array.isArray(value)) return value.map(v => rewrite(v, mapping));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, mapping)]));
  return value;
}
const generated = entries.map(e => ({ ...rewrite(e.resource, references), id: e.fullUrl.slice(9) }));
const team = Object.entries(names).map(([id, [given, family]]) => ({ resourceType: 'Practitioner', id,
  name: [{ family, given: [given] }] }));
await mkdir(out, { recursive: true });
for (const [name, current] of [
  ['case', data.state.surgicalCases.find(c => c.orDay === day)],
  ['consult', data.state.surgicalCases.find(c => c.consultDay === day)],
]) {
  if (!current) continue;
  const patient = index.patients.find(p => p.id === current.patientId);
  if (!patient) throw new Error('World patient is absent from the Synthea index');
  const chart = await read(`fixtures/synthea/${patient.file}`);
  // Mirror transaction import: give resources their fullUrl UUID and resolve
  // the transaction's references, preserving every original chart resource.
  const mapping = new Map(chart.entry.filter(e => e.fullUrl?.startsWith('urn:uuid:'))
    .map(e => [e.fullUrl, `${e.resource.resourceType}/${e.fullUrl.slice(9)}`]));
  for (const entry of chart.entry) {
    entry.resource = rewrite(entry.resource, mapping);
    if (entry.fullUrl?.startsWith('urn:uuid:')) entry.resource.id = entry.fullUrl.slice(9);
  }
  const own = generated.filter(r =>
    [r.subject, r.patient, r.for].some(ref => ref?.reference === patients[current.patientId]) ||
    ['Location', 'Organization', 'PractitionerRole'].includes(r.resourceType));
  chart.entry.push(...[...own, ...team].map(resource => ({ resource })));
  await writeFile(`${out}/${name}-bundle.json`, JSON.stringify(chart, null, 2));
  await writeFile(`${out}/${name}-context.json`, JSON.stringify({ today: data.date, now: 480,
    encounterKind: name === 'case' ? 'preop' : 'consult', receipts: [], record: [] }, null, 2));
  process.stdout.write(`${name}: ${patient.file}, ${data.date}, ${current.procedure}\n`);
}
await writeFile(`${out}/user.json`, JSON.stringify({ id: 'P5', role: 'surgeon' }));
