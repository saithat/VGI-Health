#!/usr/bin/env node
// Opt-in historical chart cohort; uses the same credentials and atomic transaction feature as load.mjs.
import { MedplumClient } from '@medplum/core';
import { loadTransactions } from './synthetic-hospital-batches.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv, REPO_ROOT } from './lib.mjs';
import { sha256 } from '../../scripts/synthetic-hospital/fetch.mjs';
import { SYSTEM, SOURCE_TAG } from '../../scripts/synthetic-hospital/convert.mjs';

async function main() {
const args = process.argv.slice(2);
if (args.some((a) => !['--dry-run', '--verify-only'].includes(a))) throw new Error('Usage: load-synthetic-hospital.mjs [--dry-run|--verify-only]');
const dryRun = args.includes('--dry-run');
const verifyOnly = args.includes('--verify-only');
const directory = resolve(REPO_ROOT, 'fixtures/synthetic-hospital');
const index = JSON.parse(await readFile(resolve(directory, 'index.json'), 'utf8'));
loadEnv();
for (const key of ['MEDPLUM_BASE_URL', 'MEDPLUM_CLIENT_ID', 'MEDPLUM_CLIENT_SECRET']) {
  if (!process.env[key]) throw new Error(`${key} is missing; reuse the shared stack .env from setup`);
}
const client = new MedplumClient({ baseUrl: process.env.MEDPLUM_BASE_URL });
await client.startClientLogin(process.env.MEDPLUM_CLIENT_ID, process.env.MEDPLUM_CLIENT_SECRET);
if (!client.getProject()?.features?.includes('transaction-bundles')) throw new Error('Medplum project needs transaction-bundles (setup.mjs)');
const tag = `${SOURCE_TAG.system}|${SOURCE_TAG.code}`;
const counts = async () => {
  const result = {};
  for (const type of Object.keys(index.resourceCounts)) {
    result[type] = (await client.search(type, { _tag: tag, _summary: 'count' })).total ?? 0;
  }
  return result;
};
const before = await counts();
const stats = { loaded: 0, existing: 0, resourcesCreated: 0 };
for (const patient of index.patients) {
  const data = await readFile(resolve(directory, patient.file));
  if (sha256(data) !== patient.sha256) throw new Error(`Fixture checksum mismatch: ${patient.file}`);
  const bundle = JSON.parse(data);
  if (dryRun) { console.log(`Would conditionally load ${patient.name} (${bundle.entry.length} resources)`); continue; }
  if (verifyOnly) continue;
  // Every entry has a conditional create, including Patient identifier urn:vgi:synthetic-hospital|<patient_id>.
  // This permits recovery from partial legacy loads and prevents concurrent reruns from duplicating children.
  const { created } = await loadTransactions(client, bundle);
  stats.resourcesCreated += created;
  if (created) stats.loaded++; else stats.existing++;
  if ((stats.loaded + stats.existing) % 25 === 0) console.log(`Synthetic Hospital: ${stats.loaded + stats.existing}/${index.patientCount} transactions verified`);
}
const after = await counts();
if (!dryRun) {
  for (const [type, expected] of Object.entries(index.resourceCounts)) {
    if (after[type] !== expected) throw new Error(`${type}: expected ${expected} source-tagged records, found ${after[type]}`);
  }
}
const found = [];
for (const patient of index.patients) {
  const results = await client.searchResources('Patient', { identifier: `${SYSTEM}|${patient.sourceId}` });
  if (!dryRun && results.length !== 1) throw new Error(`Patient ${patient.sourceId}: expected exactly one identifier match, found ${results.length}`);
  if (results.length === 1) found.push(patient);
}
const fits = Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => [p, found.filter((r) => r.personaFits[p]).length]));
console.log(JSON.stringify({ source: index.source.commit, dryRun, verifyOnly, ...stats, patientsFound: found.length,
  selectedFor: index.selectedForCounts, personaFits: fits, before, after }, null, 2));

}
main().catch((error) => {
  console.error('Synthetic Hospital load failed:', JSON.stringify(error.outcome ?? { message: error.message }));
  process.exitCode = 1;
});
