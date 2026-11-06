#!/usr/bin/env node
// Trim raw Synthea bundles (fixtures/raw/<cohort>/fhir/*.json) into the committed fixtures
// (fixtures/synthea/*.json + fixtures/synthea/index.json).
//
//   node infra/synthea/trim.mjs [--years 5] [--detail-years 2] [--encounters 20] [--notes 6]
//                               [--raw fixtures/raw] [--out fixtures/synthea]
//
// All dates are relative to the fixed reference date REF_DATE (default 20261031, as in generate.sh).
// What it keeps (see infra/README.md for the rationale and the size budget):
//   - only resource types from BRIEF section 5a ("FHIR resources used");
//   - encounters in the last --years years: every well-child visit, the latest adult general
//     examination per year, and the --encounters most recent other encounters (heavy utilizers,
//     e.g. dialysis 3x/week, would otherwise dominate the fixture size);
//   - from those encounters: labs and trend vitals (BP, weight, height, BMI, head circumference)
//     for the whole window; all other observations, prescriptions, procedures, and medication
//     administrations for the last --detail-years years; resolved disorders for the whole window
//     and resolved findings for --detail-years; the --notes most recent clinical notes;
//   - always: the Patient, every AllergyIntolerance and Immunization, active Conditions and
//     MedicationRequests, general-surgery episodes (procedure + its encounter + everything recorded
//     in it, any date), the latest observation of each social-history code and the latest PRAPARE,
//     and for pediatric patients every vital sign (growth chart);
//   - non-encounter resources that a kept resource references (referential closure). An encounter
//     outside the kept set that is referenced by an always-kept resource becomes a display-only
//     reference ("Encounter for check up on 2017-03-02").
// What it removes: Synthea's billing (Claim, ExplanationOfBenefit), CarePlan, CareTeam, Goal,
// Device, ImagingStudy, SupplyDelivery, Medication (inlined as medicationCodeableConcept),
// Organization/Location/Practitioner (references become display-only with a type), Synthea's
// bulk-import Provenance (not a review receipt), DiagnosticReports that only duplicate a clinical
// note or wrap a survey score, screening/assessment procedures older than 12 months, narratives
// (`text`), US Core meta.profile tags, resource ids (Import sources assign its own; fullUrls link the
// entries), `issued` (= effective time), and CodeableConcept.text that repeats the display.
// Patients get a deterministic 8-digit MRN (Synthea's MRN is the UUID).
//
// Output bundles are FHIR R4 transaction bundles (POST + urn:uuid), one entry per line.
import { fictionalize, identityCatalog } from '../../scripts/fictional-identities.mjs';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const YEARS = Number(arg('--years', process.env.TRIM_YEARS ?? 5));
const MAX_NOTES = Number(arg('--notes', process.env.TRIM_NOTES ?? 6));
const MAX_ENCOUNTERS = Number(arg('--encounters', process.env.TRIM_ENCOUNTERS ?? 20));
const DETAIL_YEARS = Number(arg('--detail-years', process.env.TRIM_DETAIL_YEARS ?? 2));
const RAW = resolve(ROOT, arg('--raw', 'fixtures/raw'));
const OUT = resolve(ROOT, arg('--out', 'fixtures/synthea'));
const REF = process.env.REF_DATE ?? '20261031';
const REF_DATE = `${REF.slice(0, 4)}-${REF.slice(4, 6)}-${REF.slice(6, 8)}`;
const CUTOFF = `${Number(REF.slice(0, 4)) - YEARS}-${REF.slice(4, 6)}-${REF.slice(6, 8)}`;
const LAST_YEAR = `${Number(REF.slice(0, 4)) - 1}-${REF.slice(4, 6)}-${REF.slice(6, 8)}`;
const DETAIL_CUTOFF = `${Number(REF.slice(0, 4)) - DETAIL_YEARS}-${REF.slice(4, 6)}-${REF.slice(6, 8)}`;

const SYNTHEA_ID_SYSTEM = 'https://github.com/synthetichealth/synthea';

/** BRIEF section 5a, "FHIR resources used". */
const KEEP_TYPES = new Set([
  'Patient',
  'Encounter',
  'AllergyIntolerance',
  'Observation',
  'DiagnosticReport',
  'Condition',
  'MedicationRequest',
  'MedicationStatement',
  'MedicationAdministration',
  'Immunization',
  'ServiceRequest',
  'Procedure',
  'Consent',
  'DocumentReference',
  'Questionnaire',
  'QuestionnaireResponse',
  'Provenance',
  'AuditEvent',
  'Task',
]);

/** General-surgery procedures (P5's case mix) present in Synthea's modules. */
const SURGICAL_PROCEDURES = new Map([
  ['80146002', 'Appendectomy'],
  ['45595009', 'Laparoscopic cholecystectomy'],
  ['38102005', 'Cholecystectomy'],
  ['43075005', 'Partial colectomy'],
  ['392021009', 'Lumpectomy of breast'],
  ['69031006', 'Excision of breast tissue'],
  ['172043006', 'Simple mastectomy'],
]);
/** Conditions that belong to a surgical history and are kept regardless of date. */
const SURGICAL_CONDITIONS = new Set(['74400008', '47693006', '428251008', '65275009', '235919008']);

const PRAPARE = '93025-5';
const VITAL_SIGNS = 'vital-signs';
const SOCIAL_HISTORY = 'social-history';
const LABORATORY = 'laboratory';
/** Vital signs that feed trend views; kept for the whole window (others only for DETAIL_YEARS). */
const TREND_VITALS = new Set(['85354-9', '29463-7', '8302-2', '39156-5', '9843-4', '8287-5']);
const SURVEY = 'survey';
/**
 * Wellness visits are kept within the window outside the encounter budget (annual labs and vitals
 * feed trend views): every well-child visit (growth chart, immunizations) and the latest adult
 * general examination per year.
 */
const WELL_CHILD_RE = /well child visit/i;
const ADULT_WELLNESS_RE = /general examination of patient/i;
/** Repetitive screening/administrative procedures: kept for the last 12 months only. */
const ROUTINE_PROCEDURE_RE = /screening|assessment|medication reconciliation|referral|surveillance/i;
const ANTICOAGULANT_RE = /warfarin|apixaban|rivaroxaban|dabigatran|edoxaban|heparin|enoxaparin|dalteparin|fondaparinux/i;
const DRUG_ALLERGY_GROUPS = [
  ['penicillin', /penicillin|amoxicillin|ampicillin/i, ['7984', '7980', '723', '733']],
  ['sulfa', /sulfa|sulfamethoxazole/i, ['10831', '10180']],
  ['cephalosporin', /cef|ceph/i, []],
  ['aspirin', /aspirin/i, ['1191']],
  ['nsaid', /ibuprofen|naproxen/i, ['5640']],
  ['ace-inhibitor', /pril\b/i, []],
];
const CHRONIC = [
  ['hypertension', /hypertension/i],
  ['diabetes', /\bdiabetes/i],
  ['prediabetes', /prediabetes/i],
  ['hyperlipidemia', /hyperlipidemia|hypertriglyceridemia|hypercholesterolemia/i],
  ['ckd', /chronic kidney disease/i],
  ['atrial-fibrillation', /atrial fibrillation/i],
  ['heart-failure', /heart failure/i],
  ['coronary-disease', /ischemic heart disease|myocardial infarction/i],
  ['asthma', /asthma/i],
  ['copd', /chronic obstructive|emphysema|chronic bronchitis/i],
  ['obesity', /obesity/i],
];

// ---------- helpers ----------

const day = (s) => (typeof s === 'string' ? s.slice(0, 10) : undefined);

function clinicalDate(r) {
  switch (r.resourceType) {
    case 'Encounter':
      return r.period?.start;
    case 'Observation':
    case 'DiagnosticReport':
      return r.effectiveDateTime ?? r.effectivePeriod?.start ?? r.issued;
    case 'Condition':
      return r.onsetDateTime ?? r.recordedDate;
    case 'MedicationRequest':
      return r.authoredOn;
    case 'MedicationAdministration':
      return r.effectiveDateTime ?? r.effectivePeriod?.start;
    case 'Procedure':
      return r.performedDateTime ?? r.performedPeriod?.start;
    case 'Immunization':
      return r.occurrenceDateTime;
    case 'DocumentReference':
      return r.date ?? r.context?.period?.start;
    case 'AllergyIntolerance':
      return r.recordedDate ?? r.onsetDateTime;
    default:
      return undefined;
  }
}

const inWindow = (r) => (day(clinicalDate(r)) ?? '0000') >= CUTOFF;
const codes = (cc) => (cc?.coding ?? []).map((c) => String(c.code));
const codeText = (cc) => cc?.text ?? cc?.coding?.[0]?.display ?? '';
const statusCode = (cc) => cc?.coding?.[0]?.code;
const isActiveCondition = (r) => ['active', 'recurrence', 'relapse'].includes(statusCode(r.clinicalStatus));
const isActiveAllergy = (r) => !r.clinicalStatus || statusCode(r.clinicalStatus) === 'active';
const categories = (r) => (r.category ?? []).flatMap((c) => codes(c));

function ageAt(birthDate, ref) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = ref.split('-').map(Number);
  let years = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) years--;
  const months = (ry - by) * 12 + (rm - bm) - (rd < bd ? 1 : 0);
  return { years, months };
}

/** Visits every Reference-shaped object ({reference: string}) in a resource. */
function forEachReference(node, fn, parent = undefined, key = undefined) {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) forEachReference(node[i], fn, node, i);
  } else if (node && typeof node === 'object') {
    if (typeof node.reference === 'string') fn(node, parent, key);
    for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') forEachReference(v, fn, node, k);
  }
}

function mrnFor(uuid) {
  const n = parseInt(createHash('sha256').update(`mrn:${uuid}`).digest('hex').slice(0, 12), 16) % 90_000_000;
  return String(10_000_000 + n);
}

/** Removes CodeableConcept.text where it only repeats coding[0].display. */
function dropRedundantText(node) {
  if (Array.isArray(node)) node.forEach(dropRedundantText);
  else if (node && typeof node === 'object') {
    if (Array.isArray(node.coding) && typeof node.text === 'string' && node.text === node.coding[0]?.display) delete node.text;
    for (const v of Object.values(node)) if (v && typeof v === 'object') dropRedundantText(v);
  }
}

function removeAt(parent, key) {
  if (Array.isArray(parent)) parent.splice(key, 1);
  else if (parent) delete parent[key];
}

function stripEmpty(node) {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      stripEmpty(node[i]);
      if (isEmpty(node[i])) node.splice(i, 1);
    }
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      stripEmpty(v);
      if (isEmpty(v)) delete node[k];
    }
  }
}
const isEmpty = (v) => v === undefined || (Array.isArray(v) && v.length === 0) || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

// ---------- per-patient trim ----------

function trimBundle(raw, cohort) {
  const byUrl = new Map(raw.entry.map((e) => [e.fullUrl, e.resource]));
  const patient = raw.entry.find((e) => e.resource.resourceType === 'Patient')?.resource;
  if (!patient) throw new Error('bundle has no Patient');
  const { years: age, months: ageMonths } = ageAt(patient.birthDate, REF_DATE);
  const pediatric = age < 18;
  const urlOf = new Map(raw.entry.map((e) => [e.resource, e.fullUrl]));

  const isNoteOnlyReport = (r) => r.resourceType === 'DiagnosticReport' && r.presentedForm && !r.result;
  const droppedByPolicy = (r) =>
    !KEEP_TYPES.has(r.resourceType) ||
    r.resourceType === 'Provenance' || // Synthea's bulk-import provenance, not a review receipt
    isNoteOnlyReport(r);

  const res = raw.entry.map((e) => e.resource);
  const encounterOf = (r) =>
    r.resourceType === 'Encounter'
      ? urlOf.get(r)
      : (r.encounter?.reference ?? r.context?.reference ?? r.context?.encounter?.[0]?.reference); // MedicationAdministration.context, DocumentReference.context.encounter
  const isSurgicalProcedure = (r) => r.resourceType === 'Procedure' && codes(r.code).some((c) => SURGICAL_PROCEDURES.has(c));
  const recent = (r) => (day(clinicalDate(r)) ?? '0000') >= LAST_YEAR;
  const detail = (r) => (day(clinicalDate(r)) ?? '0000') >= DETAIL_CUTOFF;

  // 1. Encounters: wellness visits + the most recent MAX_ENCOUNTERS others in the window + surgical.
  const surgicalEncounters = new Set(res.filter(isSurgicalProcedure).map((r) => r.encounter?.reference).filter(Boolean));
  const windowEncounters = res
    .filter((r) => r.resourceType === 'Encounter' && inWindow(r))
    .sort((a, b) => (clinicalDate(b) ?? '').localeCompare(clinicalDate(a) ?? ''));
  const keptEncounters = new Set(surgicalEncounters);
  let others = 0;
  const wellnessYears = new Set();
  for (const enc of windowEncounters) {
    const type = (enc.type ?? []).map(codeText).join(' ');
    const year = (clinicalDate(enc) ?? '').slice(0, 4);
    if (WELL_CHILD_RE.test(type)) keptEncounters.add(urlOf.get(enc));
    else if (ADULT_WELLNESS_RE.test(type) && !wellnessYears.has(year)) {
      wellnessYears.add(year);
      keptEncounters.add(urlOf.get(enc));
    } else if (others++ < MAX_ENCOUNTERS) keptEncounters.add(urlOf.get(enc));
  }
  const encOk = (r) => {
    const enc = encounterOf(r);
    return !enc || keptEncounters.has(enc);
  };
  const isSurveyOnlyReport = (r) => {
    if (r.resourceType !== 'DiagnosticReport' || categories(r).includes('LAB') || !r.result?.length) return false;
    return r.result.every((x) => categories(byUrl.get(x.reference) ?? {}).includes(SURVEY));
  };

  // 2. Seed selection.
  const keep = new Set();
  let latestPrapare;
  const latestSocial = new Map();
  const notes = [];
  for (const r of res) {
    if (droppedByPolicy(r) || isSurveyOnlyReport(r)) continue;
    const t = r.resourceType;
    let k = false;
    if (t === 'Patient' || t === 'AllergyIntolerance' || t === 'Immunization') k = true;
    else if (t === 'Encounter') k = keptEncounters.has(urlOf.get(r));
    else if (t === 'Condition')
      // Resolved disorders for the whole window; resolved findings/situations for DETAIL_YEARS.
      k =
        isActiveCondition(r) ||
        codes(r.code).some((c) => SURGICAL_CONDITIONS.has(c)) ||
        (encOk(r) && (detail(r) || ((inWindow(r) || (day(r.abatementDateTime) ?? '0000') >= CUTOFF) && /\(disorder\)$/.test(codeText(r.code)))));
    else if (t === 'MedicationRequest') k = r.status === 'active' || (detail(r) && encOk(r));
    else if (t === 'Procedure') k = isSurgicalProcedure(r) || (detail(r) && encOk(r) && (!ROUTINE_PROCEDURE_RE.test(codeText(r.code)) || recent(r)));
    else if (t === 'MedicationAdministration') k = detail(r) && encOk(r);
    else if (t === 'Observation') {
      const code = codes(r.code)[0];
      if (code === PRAPARE) {
        if (!latestPrapare || (clinicalDate(r) ?? '') > (clinicalDate(latestPrapare) ?? '')) latestPrapare = r;
        continue;
      }
      if (categories(r).includes(SOCIAL_HISTORY)) {
        const prev = latestSocial.get(code);
        if (!prev || (clinicalDate(r) ?? '') > (clinicalDate(prev) ?? '')) latestSocial.set(code, r);
        k = recent(r) && encOk(r);
      } else {
        const trend = categories(r).includes(LABORATORY) || TREND_VITALS.has(code);
        k = (inWindow(r) && encOk(r) && (detail(r) || trend)) || (pediatric && categories(r).includes(VITAL_SIGNS));
      }
    } else if (t === 'DocumentReference') {
      if (inWindow(r) && encOk(r)) notes.push(r);
      continue;
    } else k = inWindow(r) && encOk(r);
    if (k) keep.add(r);
  }
  if (latestPrapare) keep.add(latestPrapare);
  for (const r of latestSocial.values()) keep.add(r);
  // Most recent clinical notes only (each is a few KB of base64 text).
  notes.sort((a, b) => (clinicalDate(b) ?? '').localeCompare(clinicalDate(a) ?? ''));
  for (const n of notes.slice(0, MAX_NOTES)) keep.add(n);

  // 3. Whole surgical episodes: everything recorded during a surgical encounter.
  for (const r of res) {
    if (droppedByPolicy(r) || keep.has(r)) continue;
    const enc = encounterOf(r);
    if (enc && surgicalEncounters.has(enc)) keep.add(r);
  }

  // 4. Referential closure over kept types. Encounters are not pulled in: an out-of-window
  //    encounter referenced by an always-kept resource (immunization, active problem or med,
  //    pediatric vital sign) becomes a display-only reference instead.
  const queue = [...keep];
  while (queue.length) {
    const r = queue.pop();
    forEachReference(r, (ref) => {
      const target = byUrl.get(ref.reference);
      if (target && target.resourceType !== 'Encounter' && !keep.has(target) && !droppedByPolicy(target)) {
        keep.add(target);
        queue.push(target);
      }
    });
  }

  // 5. Rewrite + strip, in original bundle order.
  const keptUrls = new Set([...keep].map((r) => urlOf.get(r)));
  const entries = [];
  for (const e of raw.entry) {
    if (!keep.has(e.resource)) continue;
    const r = structuredClone(e.resource);
    delete r.text;
    delete r.meta;
    // Server ids are assigned by the store; the fullUrl (urn:uuid:<synthea id>) links entries, and
    // the Patient keeps its Synthea identifier for lookups.
    delete r.id;
    if (r.resourceType !== 'Patient' && r.identifier) r.identifier = r.identifier.filter((i) => i.system !== SYNTHEA_ID_SYSTEM);
    if ((r.resourceType === 'Observation' || r.resourceType === 'DiagnosticReport') && (r.effectiveDateTime || r.effectivePeriod)) delete r.issued;
    if (r.resourceType === 'Encounter') for (const p of r.participant ?? []) delete p.period;
    dropRedundantText(r);
    if (r.resourceType === 'Patient') {
      r.extension = (r.extension ?? []).filter((x) => !/adjusted-life-years$/.test(x.url));
      // Synthea's MRN is the patient UUID; give the banner a realistic 8-digit MRN instead
      // (deterministic; the Synthea identifier is kept for lookups).
      for (const i of r.identifier ?? []) {
        if (i.type?.coding?.some((c) => c.code === 'MR')) i.value = mrnFor(patient.id);
      }
    }
    // medicationReference -> medicationCodeableConcept (Medication is not a kept type).
    if (r.medicationReference) {
      const med = byUrl.get(r.medicationReference.reference);
      r.medicationCodeableConcept = med?.code ?? { text: r.medicationReference.display ?? 'Unknown medication' };
      delete r.medicationReference;
    }
    forEachReference(r, (ref, parent, key) => {
      const s = ref.reference;
      if (s.startsWith('#')) return; // contained
      if (s.startsWith('urn:uuid:')) {
        if (keptUrls.has(s)) return;
        const target = byUrl.get(s);
        if (!target) return removeAt(parent, key);
        delete ref.reference;
        ref.type = target.resourceType;
        ref.display ??=
          target.resourceType === 'Encounter'
            ? `${codeText(target.type?.[0]).replace(/ \((procedure|environment|regime\/therapy)\)$/, '')} on ${day(target.period?.start)}`
            : target.code
              ? codeText(target.code)
              : (target.name?.[0]?.text ?? target.name ?? undefined);
        if (!ref.display) removeAt(parent, key);
        return;
      }
      // Conditional reference into Synthea's hospital/practitioner bundles (not loaded) ->
      // display-only reference with its type.
      const m = /^([A-Za-z]+)\?/.exec(s);
      delete ref.reference;
      if (m) ref.type = m[1];
      if (!ref.display) removeAt(parent, key);
    });
    stripEmpty(r);
    entries.push({ fullUrl: e.fullUrl, resource: r, request: { method: 'POST', url: r.resourceType } });
  }

  // 6. Summary for index.json.
  const kept = entries.map((e) => e.resource);
  const ofType = (t) => kept.filter((r) => r.resourceType === t);
  const activeAllergies = ofType('AllergyIntolerance').filter(isActiveAllergy);
  const drugAllergies = activeAllergies.filter((a) => (a.category ?? []).includes('medication'));
  const drugAllergyGroups = [...new Set(drugAllergies.flatMap((a) => DRUG_ALLERGY_GROUPS.filter(([, re, cs]) => re.test(codeText(a.code)) || codes(a.code).some((c) => cs.includes(c))).map(([g]) => g)))];
  const activeMeds = ofType('MedicationRequest').filter((m) => m.status === 'active');
  const anticoagulants = [...new Set(activeMeds.map((m) => codeText(m.medicationCodeableConcept)).filter((t) => ANTICOAGULANT_RE.test(t)))];
  const surgeries = ofType('Procedure')
    .filter((p) => codes(p.code).some((c) => SURGICAL_PROCEDURES.has(c)))
    .map((p) => ({ procedure: SURGICAL_PROCEDURES.get(codes(p.code).find((c) => SURGICAL_PROCEDURES.has(c))), date: day(clinicalDate(p)) }))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  // "History of appendectomy" stays active for life; when the operation itself predates the export
  // window it is the only trace, so it counts as a surgery (dated by the condition's onset).
  for (const c of ofType('Condition').filter((x) => codes(x.code).includes('428251008'))) {
    const date = day(clinicalDate(c));
    if (!surgeries.some((x) => x.procedure === 'Appendectomy' && x.date === date)) surgeries.push({ procedure: 'Appendectomy', date, fromHistory: true });
  }
  surgeries.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const problems = [...new Set(ofType('Condition').filter((c) => isActiveCondition(c) && /\(disorder\)$/.test(codeText(c.code))).map((c) => codeText(c.code).replace(/ \(disorder\)$/, '')))].sort();
  const chronic = CHRONIC.filter(([, re]) => problems.some((p) => re.test(p))).map(([k]) => k);
  const weights = ofType('Observation')
    .filter((o) => codes(o.code).includes('29463-7') && o.valueQuantity)
    .sort((a, b) => (clinicalDate(b) ?? '').localeCompare(clinicalDate(a) ?? ''));
  const officialName = patient.name?.find((n) => n.use === 'official') ?? patient.name?.[0];
  const mrn = entries.find((e) => e.resource.resourceType === 'Patient').resource.identifier?.find((i) => i.type?.coding?.some((c) => c.code === 'MR'))?.value;
  const byType = {};
  for (const r of kept) byType[r.resourceType] = (byType[r.resourceType] ?? 0) + 1;

  const summary = {
    id: patient.id,
    identifier: { system: SYNTHEA_ID_SYSTEM, value: patient.id },
    mrn,
    name: [officialName?.prefix?.[0], officialName?.given?.join(' '), officialName?.family].filter(Boolean).join(' '),
    birthDate: patient.birthDate,
    age,
    ...(pediatric ? { ageMonths } : {}),
    sex: patient.gender,
    cohort,
    flags: {
      pediatric,
      allergic: drugAllergies.length > 0,
      anticoagulated: anticoagulants.length > 0,
      surgical: surgeries.length > 0,
    },
    drugAllergies: drugAllergies.map((a) => codeText(a.code)),
    drugAllergyGroups,
    otherAllergies: activeAllergies.filter((a) => !drugAllergies.includes(a)).map((a) => codeText(a.code)),
    anticoagulants,
    surgeries,
    chronic,
    problems,
    activeMedications: [...new Set(activeMeds.map((m) => codeText(m.medicationCodeableConcept)))].sort(),
    latestWeight: weights[0] ? { value: weights[0].valueQuantity.value, unit: weights[0].valueQuantity.unit, date: day(clinicalDate(weights[0])) } : null,
    resources: kept.length,
    resourcesByType: byType,
  };
  return { entries, summary, rawCount: raw.entry.length };
}

// ---------- main ----------

function fileNameFor(patient, id) {
  const n = patient.name?.find((x) => x.use === 'official') ?? patient.name?.[0] ?? {};
  const clean = (s) => (s ?? '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '');
  return `${clean(n.given?.[0])}_${clean(n.family)}_${id.slice(0, 8)}.json`;
}

function serialize(entries) {
  // One entry per line: compact but diff-friendly.
  return '{"resourceType":"Bundle","type":"transaction","entry":[\n' + entries.map((e) => JSON.stringify(e)).join(',\n') + '\n]}\n';
}

function main() {
  const catalog = new Map();
  const sourceFiles = walkFiles(RAW);
  for (const file of sourceFiles.filter(f => /(?:hospitalInformation|practitionerInformation).*\.json$/.test(basename(f))))
    identityCatalog(JSON.parse(readFileSync(file, 'utf8')), catalog);
  const rawFiles = sourceFiles
    .filter((f) => f.endsWith('.json') && basename(dirname(f)) === 'fhir')
    .filter((f) => !/^(hospitalInformation|practitionerInformation)/.test(basename(f)))
    .sort();
  if (rawFiles.length === 0) {
    console.error(`No raw Synthea bundles under ${RAW}. Run infra/synthea/generate.sh first.`);
    process.exit(1);
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const patients = [];
  let totalBytes = 0;
  let rawEntries = 0;
  let keptEntries = 0;
  const seen = new Set();
  for (const f of rawFiles) {
    const cohort = basename(dirname(dirname(f)));
    const original = JSON.parse(readFileSync(f, 'utf8'));
    const raw = fictionalize(original, identityCatalog(original, catalog));
    const { entries, summary, rawCount } = trimBundle(raw, cohort);
    const patient = entries.find((e) => e.resource.resourceType === 'Patient').resource;
    if (seen.has(summary.id)) {
      console.warn(`skip duplicate patient ${summary.id} in ${relative(ROOT, f)}`);
      continue;
    }
    seen.add(summary.id);
    if (patients.some((p) => p.mrn === summary.mrn)) throw new Error(`MRN collision for ${summary.id}; change mrnFor()`);
    const file = fileNameFor(patient, summary.id);
    const text = serialize(entries);
    writeFileSync(join(OUT, file), text);
    totalBytes += Buffer.byteLength(text);
    rawEntries += rawCount;
    keptEntries += entries.length;
    patients.push({ ...summary, file, bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex') });
  }
  patients.sort((a, b) => a.file.localeCompare(b.file));

  const count = (pred) => patients.filter(pred).length;
  const index = {
    description: 'Trimmed Synthea population for VGI Health. Generated by infra/synthea/trim.mjs; do not edit by hand.',
    synthea: 'v4.0.0',
    referenceDate: REF_DATE,
    historyCutoff: CUTOFF,
    historyYears: YEARS,
    maxNotesPerPatient: MAX_NOTES,
    maxEncountersPerPatient: MAX_ENCOUNTERS,
    patientIdentifierSystem: SYNTHEA_ID_SYSTEM,
    patientCount: patients.length,
    counts: {
      adult: count((p) => !p.flags.pediatric),
      pediatric: count((p) => p.flags.pediatric),
      allergic: count((p) => p.flags.allergic),
      penicillinAllergy: count((p) => p.drugAllergyGroups.includes('penicillin')),
      sulfaAllergy: count((p) => p.drugAllergyGroups.includes('sulfa')),
      anticoagulated: count((p) => p.flags.anticoagulated),
      surgical: count((p) => p.flags.surgical),
      hypertension: count((p) => p.chronic.includes('hypertension')),
      diabetes: count((p) => p.chronic.includes('diabetes')),
      hyperlipidemia: count((p) => p.chronic.includes('hyperlipidemia')),
    },
    resources: keptEntries,
    totalBytes,
    patients,
  };
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');

  console.log(`Trimmed ${patients.length} patients: ${rawEntries} -> ${keptEntries} resources, ${(totalBytes / 1e6).toFixed(1)} MB in ${relative(ROOT, OUT)}/`);
  console.log(`History window: ${CUTOFF} .. ${REF_DATE} (${YEARS} years), wellness + ${MAX_ENCOUNTERS} other encounters, ${MAX_NOTES} notes per patient`);
  console.log('Counts:', JSON.stringify(index.counts));
}

main();
