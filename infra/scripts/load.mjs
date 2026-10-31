#!/usr/bin/env node
// Upload the trimmed Synthea fixtures (fixtures/synthea/*.json) into Medplum, exactly once each.
//
//   node infra/scripts/load.mjs [--dry-run] [--only <file>]      (or: make load)
//
// Needs .env from setup.mjs (MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET).
//
// Idempotency: each file is POSTed as one FHIR transaction with an extra entry, a marker
//   Basic resource with identifier https://vgi-health.example/fhir/sid/fixture-file|<file name>
//   (code fixture-load-marker, extension with the file's sha256). setup.mjs enables Medplum's
//   'transaction-bundles' project feature, so the patient's data and its marker commit atomically:
//   a file is either fully loaded with a marker, or not loaded at all. Files that already have a
//   marker are skipped and never uploaded again (if a committed fixture changed since it was
//   loaded, the loader warns; reset with `make infra-reset` to reload from scratch). As a second
//   guard, a file whose Patient (identifier https://github.com/synthetichealth/synthea|<id>)
//   already exists is not uploaded either.
//
// Env: LOAD_CONCURRENCY (default 3).
import { MedplumClient } from '@medplum/core';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FIXTURE_FILE_SYSTEM, loadEnv, log, REPO_ROOT } from './lib.mjs';

const FIXTURES = resolve(REPO_ROOT, 'fixtures/synthea');
const SYNTHEA_ID_SYSTEM = 'https://github.com/synthetichealth/synthea';
const MARKER_CODE_SYSTEM = 'https://vgi-health.example/fhir/CodeSystem/vgi-infra';
const MARKER_CODE = 'fixture-load-marker';
const EXT_SHA = 'https://vgi-health.example/fhir/StructureDefinition/fixture-sha256';
const EXT_COUNT = 'https://vgi-health.example/fhir/StructureDefinition/fixture-resource-count';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const concurrency = Math.max(1, Number(process.env.LOAD_CONCURRENCY ?? 3));

const env = loadEnv();
for (const k of ['MEDPLUM_BASE_URL', 'MEDPLUM_CLIENT_ID', 'MEDPLUM_CLIENT_SECRET']) {
  if (!env[k] && !process.env[k]) {
    console.error(`${k} is not set. Run \`node infra/scripts/setup.mjs\` (make setup) first.`);
    process.exit(1);
  }
}

function listFiles() {
  if (!existsSync(FIXTURES)) throw new Error(`${FIXTURES} does not exist`);
  const files = readdirSync(FIXTURES)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort();
  return only ? files.filter((f) => f === only) : files;
}

/** All load markers already in the project, keyed by fixture file name. */
async function fetchMarkers(medplum) {
  const markers = new Map();
  for await (const page of medplum.searchResourcePages('Basic', { code: `${MARKER_CODE_SYSTEM}|${MARKER_CODE}`, _count: '1000' })) {
    for (const b of page) {
      const id = b.identifier?.find((i) => i.system === FIXTURE_FILE_SYSTEM)?.value;
      if (id) markers.set(id, b);
    }
  }
  return markers;
}

function markerEntry(file, sha256, patientUrl, resourceCount) {
  return {
    fullUrl: `urn:uuid:${createHash('sha256').update(`marker:${file}`).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, '$1-$2-$3-$4-$5')}`,
    resource: {
      resourceType: 'Basic',
      identifier: [{ system: FIXTURE_FILE_SYSTEM, value: file }],
      code: { coding: [{ system: MARKER_CODE_SYSTEM, code: MARKER_CODE, display: 'Synthea fixture file loaded' }] },
      subject: { reference: patientUrl },
      created: new Date().toISOString().slice(0, 10),
      extension: [
        { url: EXT_SHA, valueString: sha256 },
        { url: EXT_COUNT, valueInteger: resourceCount },
      ],
    },
    request: { method: 'POST', url: 'Basic' },
  };
}

async function loadFile(medplum, file, markers, stats) {
  const text = readFileSync(join(FIXTURES, file), 'utf8');
  const sha256 = createHash('sha256').update(text).digest('hex');
  const existing = markers.get(file);
  if (existing) {
    const loadedSha = existing.extension?.find((x) => x.url === EXT_SHA)?.valueString;
    if (loadedSha !== sha256) {
      stats.changed.push(file);
    }
    stats.skipped++;
    return;
  }
  const bundle = JSON.parse(text);
  const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
  const syntheaId = patientEntry.resource.identifier?.find((i) => i.system === SYNTHEA_ID_SYSTEM)?.value ?? patientEntry.resource.id;
  const dup = await medplum.searchOne('Patient', { identifier: `${SYNTHEA_ID_SYSTEM}|${syntheaId}` });
  if (dup) {
    log(`  WARN   ${file}: Patient/${dup.id} with Synthea id ${syntheaId} exists but has no load marker; not uploading again`);
    stats.orphans.push(file);
    return;
  }
  if (dryRun) {
    log(`  would load ${file} (${bundle.entry.length} resources)`);
    stats.loaded++;
    return;
  }
  bundle.entry.push(markerEntry(file, sha256, patientEntry.fullUrl, bundle.entry.length));
  const started = Date.now();
  const res = await medplum.executeBatch(bundle);
  const failed = (res.entry ?? []).filter((e) => !String(e.response?.status ?? '').startsWith('2'));
  if (failed.length > 0 || (res.entry ?? []).length !== bundle.entry.length) {
    throw new Error(`${file}: ${failed.length} entries failed: ${JSON.stringify(failed.slice(0, 3))}`);
  }
  stats.loaded++;
  stats.resources += bundle.entry.length - 1;
  log(`  loaded ${file} (${bundle.entry.length - 1} resources, ${((Date.now() - started) / 1000).toFixed(1)}s) [${stats.loaded + stats.skipped}/${stats.total}]`);
}

async function main() {
  const baseUrl = process.env.MEDPLUM_BASE_URL;
  const medplum = new MedplumClient({ baseUrl });
  await medplum.startClientLogin(process.env.MEDPLUM_CLIENT_ID, process.env.MEDPLUM_CLIENT_SECRET);
  const project = medplum.getProject();
  log(`Loading fixtures into ${baseUrl} (project ${project?.name ?? '?'})`);
  if (!project?.features?.includes('transaction-bundles')) {
    console.error("Project does not have the 'transaction-bundles' feature, so uploads would not be atomic. Re-run setup.mjs.");
    process.exit(1);
  }

  const files = listFiles();
  const markers = await fetchMarkers(medplum);
  const stats = { total: files.length, loaded: 0, skipped: 0, resources: 0, changed: [], orphans: [] };
  log(`  ${files.length} fixture files, ${markers.size} already marked as loaded`);

  const queue = [...files];
  const errors = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          await loadFile(medplum, file, markers, stats);
        } catch (err) {
          errors.push(file);
          console.error(`  FAILED ${file}: ${err?.outcome ? JSON.stringify(err.outcome).slice(0, 2000) : err?.message ?? err}`);
        }
      }
    })
  );

  if (stats.changed.length) {
    log(`  WARN   ${stats.changed.length} file(s) changed since they were loaded (not re-uploaded): ${stats.changed.slice(0, 5).join(', ')}${stats.changed.length > 5 ? ', ...' : ''}`);
    log('         To reload everything: make infra-reset && make infra-up setup load');
  }
  const total = await medplum.search('Patient', { _summary: 'count' });
  log(`Done: ${stats.loaded} loaded (${stats.resources} resources), ${stats.skipped} already loaded, ${stats.orphans.length} unmarked duplicates skipped, ${errors.length} failed. Patients on server: ${total.total}`);
  if (errors.length) process.exit(1);
}

main().catch((err) => {
  console.error('load failed:', err?.outcome ? JSON.stringify(err.outcome) : err);
  process.exit(1);
});
