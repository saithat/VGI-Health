// Export authoritative world-seeder resources for the same selected role/task patients.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadWorld, buildResources } from '../../infra/scripts/seed-world.mjs';
const root = resolve(import.meta.dirname, '../..');
const [worldPath, dayText, output] = process.argv.slice(2);
if (!worldPath || !dayText || !output) throw new Error('Expected world, day and output paths');
const world = loadWorld({ world: resolve(worldPath), day: Number(dayText) });
const manifest = JSON.parse(readFileSync(resolve(worldPath, 'manifest.json'), 'utf8'));
const index = JSON.parse(readFileSync(resolve(root, manifest.fixtures.index), 'utf8'));
// These are transaction fixtures: use their source fullUrl, as the real loader does
// before a server assigns its own resource ids.
const patients = Object.fromEntries(index.patients.map(patient => [patient.id, `urn:uuid:${patient.id}`]));
const clinicians = Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5', 'RN2'].map(persona => [persona, `Practitioner/${persona}`]));
const entries = buildResources(world, patients, clinicians);
const result = {};
for (const [persona, workflow] of [['P1', 'W1'], ['P2', 'W3'], ['P3', 'W4'], ['P4', 'W5'], ['P5', 'W6']]) {
  const task = world.schedules[persona].tasks.find(task => task.workflow === workflow);
  if (!task) throw new Error(`Missing ${persona}/${workflow} review task`);
  const matches = reference => reference === `Patient/${task.patientId}` || reference === `urn:uuid:${task.patientId}`;
  result[persona] = entries.filter(({ resource }) =>
    ['Organization', 'Location', 'PractitionerRole'].includes(resource.resourceType) ||
    matches(resource.subject?.reference) || matches(resource.for?.reference) ||
    resource.participant?.some(participant => matches(participant.actor?.reference)));
}
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
