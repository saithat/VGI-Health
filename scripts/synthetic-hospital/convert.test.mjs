import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { convertPatient, diagnosisLookup, personaFits, readFormulary, selectCohort, SOURCE_TAG, SYSTEM } from './convert.mjs';
import { root, sha256, verifyCache } from './fetch.mjs';

const profile = { sex: 'F', age_at_first_encounter: 40, allergies: ['Penicillin (rash)'],
  chronic_conditions: ['Hypertension', 'Unknown condition'], surgical_history: ['Appendectomy', 'None'],
  family_history: ['Father with hypertension'], smoking_status: 'Never smoker', alcohol_use: 'None', occupation: 'Teacher', insurance: 'Demo',
  home_medications: [{ name: 'Metformin', dose: '500 mg PO twice daily' }, { name: 'Metformin combo', dose: '1 tablet daily' }] };
const row = { patient_id: 123, profile: JSON.stringify(profile), age: 40, sex: 'F', primary_diagnoses: '["Acute illness"]', comorbidities: '["Hypertension"]',
  encounters: [{ encounter_id: 2, encounter_date: '2021-04-16', encounter_order: 1, encounter_type: 'inpatient', chief_complaint: 'Pain', department: 'Medicine', attending_name: 'Dr. Demo', note_text: 'HPI\nSource date 2021-04-16; café' },
    { encounter_id: 1, encounter_date: '2020-01-15', encounter_order: 0, encounter_type: 'ed', chief_complaint: 'Pain', department: 'Emergency', attending_name: 'Dr. Other', note_text: 'ED note' }] };
const options = { referenceDate: '2026-10-31', formulary: { metformin: '6809' },
  lookup: diagnosisLookup({ diagnoses: [{ display_name: 'Hypertension', icd10_code: 'I10' }], patients: {} }) };
const resources = (bundle, type) => bundle.entry.map((e) => e.resource).filter((r) => r.resourceType === type);

test('cache verification fails closed on modified upstream data', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'vgi-sh-checksum-'));
  try {
    await writeFile(resolve(directory, 'patient_profiles.jsonl'), 'changed data');
    await assert.rejects(verifyCache(directory), /Checksum mismatch/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('deterministic R4 transaction, conditional patient identifier, provenance, and resolvable references', () => {
  const { bundle } = convertPatient(row, options);
  assert.deepEqual(convertPatient(row, options).bundle, bundle);
  assert.equal(bundle.type, 'transaction');
  const urls = new Set(bundle.entry.map((e) => e.fullUrl));
  assert.equal(urls.size, bundle.entry.length);
  for (const e of bundle.entry) {
    assert.ok(e.resource.meta.tag.some((t) => t.system === SOURCE_TAG.system && t.code === SOURCE_TAG.code));
    assert.equal(e.request.method, 'POST');
    assert.ok(e.request.ifNoneExist);
  }
  const patient = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
  assert.equal(new URLSearchParams(patient.request.ifNoneExist).get('identifier'), `${SYSTEM}|123`);
  assert.equal(patient.resource.birthDate, '1986-10-31');
  assert.equal(patient.resource.name[0].text, convertPatient(row, options).patient.name);
  const provenance = resources(bundle, 'Provenance')[0];
  assert.match(provenance.entity[0].what.display, /911f34c4ac65a508543c4b3b90c373a0cd16534d/);
  assert.equal(provenance.target.length, bundle.entry.length - 1);
  for (const r of JSON.stringify(bundle).matchAll(/"reference":"(urn:uuid:[^"]+)"/g)) assert.ok(urls.has(r[1]));
});
test('shifts all encounter dates by one offset, preserves spacing, order, and source note bytes', () => {
  const { bundle } = convertPatient(row, options);
  const encounters = resources(bundle, 'Encounter');
  assert.equal(encounters[0].class.code, 'EMER');
  assert.equal(encounters[1].class.code, 'IMP');
  assert.equal(Date.parse(encounters[1].period.start) - Date.parse(encounters[0].period.start), Date.parse('2021-04-16') - Date.parse('2020-01-15'));
  const age = (Date.parse(options.referenceDate) - Date.parse(encounters[1].period.start)) / 86400000;
  assert.ok(age >= 1 && age <= 365);
  const notes = resources(bundle, 'DocumentReference');
  assert.equal(notes[0].type.coding[0].code, '11506-3');
  assert.equal(notes[1].type.coding[0].code, '34117-2');
  assert.equal(Buffer.from(notes[1].content[0].attachment.data, 'base64').toString('utf8'), row.encounters[0].note_text);
  assert.equal(notes[1].author[0].display, 'Dr. Demo');
  assert.equal(notes[1].context.encounter[0].reference, bundle.entry.find((e) => e.resource === encounters[1]).fullUrl);
});
test('exact DB codes only, deduplicated diagnoses, missing codes explained', () => {
  const conditions = resources(convertPatient(row, options).bundle, 'Condition');
  assert.equal(conditions.length, 3);
  assert.equal(conditions[0].code.coding[0].code, 'I10');
  assert.equal(conditions[1].code.coding, undefined);
  assert.match(conditions[1].note[0].text, /text only/);
  const lookup = diagnosisLookup({ diagnoses: [{ display_name: 'A', icd10_code: 'I10' }, { display_name: 'A', icd10_code: 'I11' },
    { display_name: 'B', icd10_code: 'not a code' }], patients: { 123: [{ display_name: 'A', icd10: 'I12', first_encounter_id: 1 }] } });
  assert.equal(lookup(123, 'a').code, 'I12');
  assert.equal(lookup(456, 'A'), undefined);
  assert.equal(lookup(123, 'A extra'), undefined);
  assert.equal(lookup(123, 'B'), undefined);
});
test('punctuation in clinical names never becomes conditional-search operators', () => {
  const p = { ...profile, chronic_conditions: ['A', 'A, B', 'A | B', 'A\\B'] };
  const { bundle } = convertPatient({ ...row, profile: JSON.stringify(p), primary_diagnoses: '[]', comorbidities: '[]' }, options);
  const entries = bundle.entry.filter((e) => e.resource.resourceType === 'Condition');
  const keys = entries.map((e) => new URLSearchParams(e.request.ifNoneExist).get('identifier'));
  assert.equal(new Set(keys).size, 4);
  for (const key of keys) assert.match(key, /^urn:vgi:synthetic-hospital\|123:condition:[a-f0-9-]+$/);
  assert.equal(entries[1].resource.code.text, 'A, B');
});
test('maps only exact formulary drugs; retains sig and text of unsupported drugs', () => {
  const meds = resources(convertPatient(row, options).bundle, 'MedicationStatement');
  assert.equal(meds[0].medicationCodeableConcept.coding[0].code, '6809');
  assert.equal(meds[0].dosage[0].text, '500 mg PO twice daily');
  assert.equal(meds[1].medicationCodeableConcept.coding, undefined);
  assert.equal(meds[1].medicationCodeableConcept.text, 'Metformin combo');
});
test('preserves allergy, family and social statements; does not invent surgery from negative history', () => {
  const { bundle } = convertPatient(row, options);
  assert.equal(resources(bundle, 'AllergyIntolerance')[0].code.text, profile.allergies[0]);
  assert.equal(resources(bundle, 'FamilyMemberHistory')[0].condition[0].code.text, profile.family_history[0]);
  assert.equal(resources(bundle, 'Procedure').length, 1);
  assert.equal(resources(bundle, 'Observation').find((r) => r.code.coding?.[0]?.code === '72166-2').valueString, 'Never smoker');
  assert.equal(resources(bundle, 'Observation').find((r) => r.code.coding?.[0]?.code === '11331-6').valueString, 'None');
});
test('selection is independent of source row order and validates size and identity', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ ...row, patient_id: i, age: i % 2 ? 12 : 40 }));
  assert.deepEqual(selectCohort(rows, 15), selectCohort(rows.toReversed(), 15));
  assert.equal(new Set(selectCohort(rows, 15).map((r) => r.row.patient_id)).size, 15);
  assert.equal(personaFits(rows[1]).P4, true);
  assert.throws(() => selectCohort(rows, 0));
  assert.throws(() => selectCohort([row, row], 1));
  assert.throws(() => convertPatient({ ...row, encounters: [] }, options));
});
test('committed cohort integrity, persona coverage and FHIR note/resource counts', async () => {
  const index = JSON.parse(await readFile(resolve(root, 'fixtures/synthetic-hospital/index.json'), 'utf8'));
  const formulary = readFormulary(await readFile(resolve(root, 'lean/Ehr/Formulary.lean'), 'utf8'));
  assert.equal(Object.keys(formulary).length, 25);
  assert.equal(index.patientCount, 150);
  assert.deepEqual((await readdir(resolve(root, 'fixtures/synthetic-hospital'))).filter((f) => /^\d+\.json$/.test(f)).sort(), index.patients.map((p) => p.file).sort());
  assert.equal(index.sourcePediatricPatients, 248);
  assert.deepEqual(index.selectedForCounts, { P1: 30, P2: 30, P3: 30, P4: 30, P5: 30 });
  assert.ok(index.patients.reduce((n, p) => n + p.bytes, 0) < 10 * 1024 * 1024);
  const counts = {};
  for (const patient of index.patients) {
    const data = await readFile(resolve(root, 'fixtures/synthetic-hospital', patient.file));
    assert.equal(sha256(data), patient.sha256);
    const bundle = JSON.parse(data);
    for (const e of bundle.entry) counts[e.resource.resourceType] = (counts[e.resource.resourceType] ?? 0) + 1;
    assert.equal(resources(bundle, 'DocumentReference').length, patient.encounters);
    assert.equal(resources(bundle, 'Patient')[0].id, patient.id);
    for (const encounter of resources(bundle, 'Encounter')) assert.ok(encounter.period.start >= patient.birthDate);
  }
  assert.deepEqual(counts, index.resourceCounts);
});
