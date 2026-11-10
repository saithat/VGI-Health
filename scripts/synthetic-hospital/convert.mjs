#!/usr/bin/env node
import { fictionalize } from '../fictional-identities.mjs';
import { readFile, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { cache, root, source, sha256, verifyCache } from './fetch.mjs';
import { RULES, classify, loadExport, settingOf, withAges } from './mix.mjs';

export const SYSTEM = 'urn:vgi:synthetic-hospital';
export const SOURCE_TAG = { system: 'urn:vgi:source', code: 'synthetic-hospital' };
export const RECORD_TAG = `${SYSTEM}:record`;
const DAY = 86400000;
const cc = (system, code, display) => ({ coding: [{ system, code, ...(display ? { display } : {}) }] });
const text = (value) => ({ text: String(value) });
const ref = (reference) => ({ reference });
export const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const list = (value) => typeof value === 'string' ? JSON.parse(value) : value ?? [];
export const absentHistory = (value) => /^(none(?: known)?|no (?:known |prior |previous )?(?:surger(?:y|ies)|surgical history)|n\/?a|negative|noncontributory)[.!]?$/i.test(value.trim());
const validIcd = (value) => /^[A-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$/.test(value?.toUpperCase() ?? '');
const uuid = (value) => {
  const h = sha256(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const intHash = (value) => parseInt(sha256(String(value)).slice(0, 8), 16);
const dateOf = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid date: ${value}`);
  return Date.parse(`${value}T00:00:00Z`);
};
export const encounterClass = (type) => ({ ed: 'EMER', inpatient: 'IMP', icu: 'IMP', outpatient: 'AMB', follow_up: 'AMB', telehealth: 'VR', procedure: 'AMB' })[type] ?? 'AMB';
/** Approximate DOB. The source `age` is the age at the first encounter
 * (profile.age_at_first_encounter), so the DOB falls in the year before the
 * shifted first encounter: age years plus a deterministic 0–364-day offset. */
export function birthDateOf(row, referenceDate) {
  const times = row.encounters.map((e) => dateOf(e.encounter_date));
  const first = new Date(Math.min(...times) + shiftDaysOf(row, referenceDate) * DAY);
  const anniversary = Date.UTC(first.getUTCFullYear() - row.age, first.getUTCMonth(), Math.min(first.getUTCDate(), 28));
  return new Date(anniversary - (intHash(`dob:${row.patient_id}`) % 365) * DAY).toISOString().slice(0, 10);
}
/** One offset per patient: the newest encounter lands 1–365 days before the reference date. */
export function shiftDaysOf(row, referenceDate) {
  const latest = Math.max(...row.encounters.map((e) => dateOf(e.encounter_date)));
  return (dateOf(referenceDate) - (1 + intHash(`anchor:${row.patient_id}`) % 365) * DAY - latest) / DAY;
}
export const ageOn = (birthDate, date) => {
  const [by, bm, bd] = birthDate.split('-').map(Number), [y, m, d] = date.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
};
/** Age on the reference date; without one (unit tests) the source age is used. */
const currentAge = (row, referenceDate) => referenceDate ? ageOn(birthDateOf(row, referenceDate), referenceDate) : row.age;
export function personaFits(row, referenceDate) {
  const p = JSON.parse(row.profile);
  const types = row.encounters.map((e) => e.encounter_type);
  const age = currentAge(row, referenceDate);
  const surgical = p.surgical_history.some((s) => !absentHistory(s)) ||
    /appendic|cholecyst|hernia|bowel obstruction|perforation|colectomy/i.test(list(row.primary_diagnoses).join(' '));
  return { P1: age >= 18 && types.some((t) => ['outpatient', 'follow_up', 'telehealth'].includes(t)),
    P2: types.includes('ed'), P3: types.some((t) => ['inpatient', 'icu'].includes(t)),
    P4: age < 18, P5: surgical };
}
export function selectCohort(rows, count = rows.length, referenceDate) {
  if (!Number.isInteger(count) || count < 1 || count > rows.length) throw new Error('Count must be an integer within the source population');
  if (new Set(rows.map((r) => r.patient_id)).size !== rows.length) throw new Error('Duplicate source patient id');
  const candidates = rows;
  const sorted = [...candidates].sort((a, b) => sha256(`cohort-v1:${a.patient_id}`).localeCompare(sha256(`cohort-v1:${b.patient_id}`)));
  const fits = new Map(sorted.map((r) => [r.patient_id, personaFits(r, referenceDate)]));
  const selected = new Map();
  const assigned = {};
  const personas = ['P1', 'P2', 'P3', 'P4', 'P5'];
  // Round-robin quotas give each persona distinct primary selections until its
  // eligible pool runs out. Other eligible personas are recorded too; fit is not a clinical assignment.
  while (selected.size < count) {
    let progress = false;
    for (const persona of personas) {
      const row = sorted.find((r) => !selected.has(r.patient_id) && fits.get(r.patient_id)[persona]);
      if (row) {
        selected.set(row.patient_id, row); assigned[row.patient_id] = persona; progress = true;
        if (selected.size === count) break;
      }
    }
    if (!progress) {
      for (const row of sorted) {
        if (!selected.has(row.patient_id)) { selected.set(row.patient_id, row); assigned[row.patient_id] = 'other'; }
        if (selected.size === count) break;
      }
    }
  }
  return [...selected.values()].sort((a, b) => a.patient_id - b.patient_id)
    .map((row) => ({ row, selectedFor: assigned[row.patient_id] }));
}
export function readFormulary(leanSource) {
  const entries = [...leanSource.matchAll(/\{ name := "([^"]+)"[^\n]*?rxnorm := \["([^"]+)"/g)];
  if (entries.length !== 25) throw new Error('Formulary changed: review exact-name RxNorm mapping before exporting');
  return Object.fromEntries(entries.map((m) => [m[1], m[2]]));
}
export function diagnosisLookup(db) {
  const byName = new Map();
  for (const d of db.diagnoses) {
    const key = normalize(d.display_name);
    byName.set(key, [...(byName.get(key) ?? []), d]);
  }
  return (patientId, name) => {
    const matches = (db.patients[String(patientId)] ?? []).filter((d) => normalize(d.display_name) === normalize(name));
    const candidates = matches.length ? matches.map((d) => ({ ...d, icd10_code: d.icd10 })) : byName.get(normalize(name)) ?? [];
    const codes = [...new Set(candidates.map((d) => d.icd10_code?.toUpperCase()).filter(validIcd))];
    // Never choose between conflicting mappings or fuzzy-match a diagnosis name.
    return codes.length === 1 ? { code: codes[0], firstEncounterId: matches[0]?.first_encounter_id,
      origin: matches.length ? 'patient longitudinal diagnosis ground truth' : 'exact display_name in diagnoses table' } : undefined;
  };
}
export function convertPatient(row, { referenceDate, formulary, lookup = () => undefined }) {
  const p = JSON.parse(row.profile);
  if (!Number.isInteger(row.age) || row.age < 0 || row.age > 120 || !row.encounters.length) throw new Error(`Invalid patient ${row.patient_id}`);
  const entries = [];
  const add = (key, resource) => {
    const value = `${row.patient_id}:${key}`;
    const id = `sh-${uuid(value)}`;
    const fullUrl = `urn:uuid:${uuid(value)}`;
    // Token search treats commas/pipes as operators even after URL encoding.
    // Hash condition keys so clinical punctuation can never broaden the search.
    const identifierValue = resource.resourceType === 'Condition' ? `${row.patient_id}:condition:${uuid(key)}` : value;
    const provenance = resource.resourceType === 'Provenance';
    entries.push({ fullUrl, resource: { ...resource, id,
      ...(!provenance ? { identifier: [...(resource.identifier ?? []), { system: SYSTEM, value: identifierValue }] } : {}),
      meta: { tag: [SOURCE_TAG, { system: RECORD_TAG, code: value }] } },
      request: { method: 'POST', url: resource.resourceType,
        ifNoneExist: new URLSearchParams(provenance ? { _tag: `${RECORD_TAG}|${value}` } :
          { identifier: `${SYSTEM}|${resource.resourceType === 'Patient' ? row.patient_id : identifierValue}` }).toString() } });
    return ref(fullUrl);
  };
  const given = ['Avery', 'Morgan', 'Jordan', 'Cameron', 'Riley', 'Taylor', 'Alex', 'Casey', 'Quinn', 'Jamie', 'Reese', 'Robin', 'Sage', 'Rowan', 'Drew', 'Skyler'][intHash(row.patient_id) % 16];
  const family = ['Holloway', 'Bennett', 'Reed', 'Sullivan', 'Brooks', 'Rivera', 'Patel', 'Hayes', 'Chen', 'Park', 'Ellis', 'Foster', 'Shaw', 'Nguyen', 'Torres', 'Grant'][intHash(`family:${row.patient_id}`) % 16];
  const name = `${given} ${family}`;
  const birthDate = birthDateOf(row, referenceDate);
  const patient = add('patient', { resourceType: 'Patient', active: true,
    identifier: [{ system: SYSTEM, value: String(row.patient_id) }, { system: 'http://hospital.smarthealthit.org', value: `SH${String(row.patient_id).padStart(8, '0')}` }],
    name: [{ use: 'official', given: [given], family, text: name }],
    gender: { M: 'male', F: 'female' }[row.sex] ?? 'unknown', birthDate,
    extension: [{ url: `${SYSTEM}:source-profile`, valueString: row.profile },
      { url: `${SYSTEM}:birthdate-basis`, valueString: `Approximate DOB: source age ${row.age} at the first encounter (age_at_first_encounter=${p.age_at_first_encounter}); deterministic day within that year` }] });
  // Index uses the actual deterministic resource id, distinct from the numeric upstream id.
  const patientResource = entries[0].resource;
  const latest = Math.max(...row.encounters.map((e) => dateOf(e.encounter_date)));
  const shiftDays = shiftDaysOf(row, referenceDate);
  const shifted = (date) => new Date(dateOf(date) + shiftDays * DAY).toISOString().slice(0, 10);
  const encRefs = new Map();
  const ordered = [...row.encounters].sort((a, b) => dateOf(a.encounter_date) - dateOf(b.encounter_date) || a.encounter_order - b.encounter_order || a.encounter_id - b.encounter_id);
  if (new Set(ordered.map((e) => e.encounter_id)).size !== ordered.length) throw new Error('Duplicate encounter id');
  for (const e of ordered) {
    const start = shifted(e.encounter_date);
    const encounter = add(`encounter:${e.encounter_id}`, { resourceType: 'Encounter', status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: encounterClass(e.encounter_type) },
      type: [text(e.encounter_type)], serviceType: text(e.department), subject: patient,
      period: { start, end: start }, reasonCode: [text(e.chief_complaint)],
      participant: [{ individual: { display: e.attending_name } }],
      extension: [{ url: `${SYSTEM}:original-date`, valueDate: e.encounter_date },
        { url: `${SYSTEM}:shift-days`, valueInteger: shiftDays }] });
    encRefs.set(e.encounter_id, encounter);
    const hp = ['inpatient', 'icu'].includes(e.encounter_type);
    add(`note:${e.encounter_id}`, { resourceType: 'DocumentReference', status: 'current', docStatus: 'final',
      type: cc('http://loinc.org', hp ? '34117-2' : '11506-3', hp ? 'History and physical note' : 'Progress note'),
      subject: patient, date: `${start}T12:00:00Z`, author: [{ display: e.attending_name }],
      description: `${e.department}: ${e.chief_complaint}. Source date ${e.encounter_date}; structured dates shifted ${shiftDays} days. Note text retained verbatim.`,
      context: { encounter: [encounter], period: { start, end: start } },
      content: [{ attachment: { contentType: 'text/plain', language: 'en', title: `${e.encounter_type} · ${e.encounter_date}`,
        data: Buffer.from(e.note_text, 'utf8').toString('base64'), creation: `${start}T12:00:00Z` } }] });
  }
  const conditions = new Map();
  for (const [kind, values] of [['chronic', p.chronic_conditions], ['diagnosis', list(row.primary_diagnoses)], ['comorbidity', list(row.comorbidities)]]) {
    for (const value of values) {
      if (!conditions.has(normalize(value))) conditions.set(normalize(value), { value, kind });
    }
  }
  let codedConditions = 0;
  for (const { value, kind } of conditions.values()) {
    const mapping = lookup(row.patient_id, value);
    const valid = mapping && validIcd(mapping.code);
    if (valid) codedConditions++;
    add(`condition:${normalize(value)}`, { resourceType: 'Condition', subject: patient,
      ...(kind === 'chronic' ? { clinicalStatus: cc('http://terminology.hl7.org/CodeSystem/condition-clinical', 'active') } : {}),
      category: [cc('http://terminology.hl7.org/CodeSystem/condition-category', kind === 'chronic' ? 'problem-list-item' : 'encounter-diagnosis')],
      code: { text: value, ...(valid ? cc('http://hl7.org/fhir/sid/icd-10-cm', mapping.code.toUpperCase(), value) : {}) },
      ...(mapping?.firstEncounterId && encRefs.has(mapping.firstEncounterId) ? { encounter: encRefs.get(mapping.firstEncounterId) } : {}),
      note: [{ text: valid ? `Source ${kind}; ICD-10-CM supplied by ${mapping.origin}. Upstream mapping, not independently clinically validated.` :
        `Source ${kind}; text only: no unambiguous single ICD-10-CM code in the released DB for this exact diagnosis. No code inferred.` }] });
  }
  for (const [i, allergy] of p.allergies.entries()) {
    const negative = /^(NKDA|no known (?:drug )?allergies|none(?: known)?)$/i.test(allergy.trim());
    add(`allergy:${i}`, { resourceType: 'AllergyIntolerance', patient,
      code: text(allergy), clinicalStatus: cc('http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', 'active'),
      note: [{ text: negative ? 'Explicit negative allergy statement in the source profile; not an allergen.' : 'Reported in synthetic source profile; reaction and severity retained in source text, not inferred.' }] });
  }
  for (const [i, med] of p.home_medications.entries()) {
    const code = formulary[normalize(med.name)];
    add(`medication:${i}`, { resourceType: 'MedicationStatement', status: 'active', subject: patient,
      medicationCodeableConcept: { text: med.name, ...(code ? cc('http://www.nlm.nih.gov/research/umls/rxnorm', code, normalize(med.name)) : {}) },
      dosage: [{ text: med.dose || 'Dose not provided in source' }],
      note: [{ text: code ? 'Home medication reported by source; exact generic-name match to the project formulary.' : 'Home medication reported by source; text only, no exact generic-name match in project formulary.' }] });
  }
  for (const [i, history] of p.surgical_history.entries()) {
    if (absentHistory(history)) continue;
    add(`surgery:${i}`, { resourceType: 'Procedure', status: 'completed', subject: patient, code: text(history),
      note: [{ text: 'Historical procedure reported in source profile; date, performer, and coding not supplied.' }] });
  }
  for (const [i, history] of p.family_history.entries()) {
    add(`family:${i}`, { resourceType: 'FamilyMemberHistory', status: 'completed', patient,
      relationship: text('Family member (see source statement)'), condition: [{ code: text(history) }],
      note: [{ text: history }] });
  }
  for (const [key, code, label] of [['smoking_status', '72166-2', 'Tobacco smoking status'], ['alcohol_use', '11331-6', 'History of Alcohol use']]) {
    if (p[key]) add(`social:${key}`, { resourceType: 'Observation', status: 'final', subject: patient,
      category: [cc('http://terminology.hl7.org/CodeSystem/observation-category', 'social-history')],
      code: cc('http://loinc.org', code, label), valueString: p[key],
      note: [{ text: 'Undated source profile statement; no measurement time inferred.' }] });
  }
  if (p.occupation) add('social:occupation', { resourceType: 'Observation', status: 'final', subject: patient,
    category: [cc('http://terminology.hl7.org/CodeSystem/observation-category', 'social-history')],
    code: { text: 'Occupation' }, valueString: p.occupation });
  if (p.insurance) add('coverage', { resourceType: 'Coverage', status: 'active', beneficiary: patient, payor: [{ display: p.insurance }] });
  add('provenance', { resourceType: 'Provenance', target: entries.map((e) => ref(e.fullUrl)),
    recorded: `${referenceDate}T00:00:00Z`,
    activity: text('Deterministic conversion of released synthetic longitudinal EHR data to FHIR R4'),
    agent: [{ who: { display: 'VGI Health Synthetic Hospital converter v1' } }],
    entity: [{ role: 'source', what: { identifier: { system: source.repository, value: source.commit },
      display: `${source.repository}/tree/${source.commit} — ${source.citation}` } }] });
  return { bundle: fictionalize({ resourceType: 'Bundle', type: 'transaction', meta: { tag: [SOURCE_TAG] }, entry: entries }),
    patient: { id: patientResource.id, sourceId: row.patient_id, identifier: `${SYSTEM}|${row.patient_id}`, name, birthDate,
      mrn: `SH${String(row.patient_id).padStart(8, '0')}`, age: ageOn(birthDate, referenceDate), sourceAgeAtFirstEncounter: row.age, sex: row.sex,
      encounterClass: encounterClass(ordered.at(-1).encounter_type),
      flags: { pediatric: ageOn(birthDate, referenceDate) < 18, surgical: personaFits(row).P5, allergic: p.allergies.some((a) => !/^(NKDA|no known (?:drug )?allergies|none(?: known)?)$/i.test(a.trim())),
        anticoagulated: p.home_medications.some((m) => ['warfarin', 'apixaban', 'enoxaparin', 'heparin'].includes(normalize(m.name))) },
      personaFits: personaFits(row, referenceDate), shiftDays, sourceNewestDate: new Date(latest).toISOString().slice(0, 10), newestDate: shifted(new Date(latest).toISOString().slice(0, 10)),
      encounters: ordered.length, codedConditions, textOnlyConditions: conditions.size - codedConditions } };
}
export async function exportCohort({ count, output = resolve(root, 'fixtures/synthetic-hospital') } = {}) {
  await verifyCache();
  const rows = (await readFile(resolve(cache, 'patient_profiles.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  const db = JSON.parse(execFileSync('python3', [resolve(import.meta.dirname, 'inspect-db.py'), resolve(cache, 'benchmark_v1.3.db')], { maxBuffer: 32 * 1024 * 1024 }));
  const synthea = JSON.parse(await readFile(resolve(root, 'fixtures/synthea/index.json'), 'utf8'));
  const referenceDate = synthea.referenceDate;
  const formulary = readFormulary(await readFile(resolve(root, 'lean/Ehr/Formulary.lean'), 'utf8'));
  await mkdir(output, { recursive: true });
  const patients = [];
  const resourceCounts = {};
  for (const { row, selectedFor } of selectCohort(rows, count ?? rows.length, referenceDate)) {
    const { bundle, patient } = convertPatient(row, { referenceDate, formulary, lookup: diagnosisLookup(db) });
    const file = `${row.patient_id}.json`;
    const data = JSON.stringify(bundle) + '\n';
    await writeFile(resolve(output, file), data);
    patients.push({ ...patient, selectedFor, file, bytes: Buffer.byteLength(data), sha256: sha256(data) });
    for (const e of bundle.entry) resourceCounts[e.resource.resourceType] = (resourceCounts[e.resource.resourceType] ?? 0) + 1;
  }
  const sections = await exportSections(rows);
  const index = { source, label: 'synthetic-benchmark', referenceDate, selection: 'cohort-v1 SHA256 ordering, round-robin P1–P5 eligibility; primary selections disjoint, fits overlap',
    sourcePatients: rows.length, sourcePediatricPatients: rows.filter((r) => r.age < 18).length,
    sourceEncounters: rows.reduce((n, r) => n + r.encounters.length, 0), encounterCount: patients.reduce((n, p) => n + p.encounters, 0),
    currentPediatricPatients: patients.filter((p) => p.flags.pediatric).length, sections,
    dbInspection: { tableCounts: db.tableCounts, diagnosisRowsWithIcd10: db.diagnoses.filter((d) => d.icd10_code).length,
      terminologyTables: Object.keys(db.tableCounts).filter((k) => /terminolog/i.test(k)) },
    patientCount: patients.length, resourceCounts,
    selectedForCounts: Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => [p, patients.filter((r) => r.selectedFor === p).length])),
    personaFitCounts: Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => [p, patients.filter((r) => r.personaFits[p]).length])), patients };
  await writeFile(resolve(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  const exported = new Set(patients.map((p) => p.file));
  for (const file of await readdir(output)) {
    if (/^\d+\.json$/.test(file) && !exported.has(file)) await rm(resolve(output, file));
  }
  console.log(JSON.stringify({ patients: patients.length, resourceCounts, selectedFor: index.selectedForCounts, fits: index.personaFitCounts, bytes: patients.reduce((n, p) => n + p.bytes, 0) }, null, 2));
  return index;
}
export const SECTIONS_PATH = resolve(root, 'fixtures/synthetic-hospital-sections.json');
/** Chart sections for world note text (synthetic-benchmark): every released
 * encounter_ehr_sections row with its setting, the encounter's sex, age
 * and matched local scenarios. Organization and clinician names are replaced
 * exactly as in the bundles. Kept beside (not inside) the bundle directory,
 * whose *.json files are all bundles; never committed. */
export async function exportSections(rows, path = SECTIONS_PATH) {
  const data = await loadExport();
  const encounters = new Map(withAges(data).map((e) => [e.id, e]));
  const insurance = new Map(rows.map((r) => [r.patient_id, JSON.parse(r.profile).insurance]));
  const byEncounter = new Map();
  for (const [encounter, type, order, text] of data.sections) {
    if (!byEncounter.has(encounter)) byEncounter.set(encounter, []);
    byEncounter.get(encounter).push({ type, order, text });
  }
  const out = [];
  for (const [id, list] of byEncounter) {
    const e = encounters.get(id);
    const scenarios = [...new Set(Object.values(RULES).flatMap((rules) => classify(rules, e.icd10)))].sort();
    // Same identity sources as the bundle: attending as author, payer as payor.
    const named = fictionalize({ author: [{ display: e.attending }], payor: [{ display: insurance.get(e.patient) }], sections: list });
    out.push({ encounter: id, patient: e.patient, setting: settingOf(e.type), sex: e.sex, age: e.age, scenarios, sections: named.sections });
  }
  const file = { label: 'synthetic-benchmark', source: { repository: source.repository, commit: source.commit }, encounters: out };
  const text = JSON.stringify(file) + '\n';
  await writeFile(path, text);
  return { file: relative(root, path), encounters: out.length, sections: data.sections.length, bytes: Buffer.byteLength(text), sha256: sha256(text) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--count')) throw new Error('Usage: convert.mjs [--count N] (default: all patients)');
  await exportCohort({ count: args.length ? Number(args[1]) : undefined });
}
