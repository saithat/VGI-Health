#!/usr/bin/env node
// Synthetic-benchmark case mix, imaging priority and chart-section sizes.
// Aggregates only; the committed table is world/src/synthetic-hospital-mix.json.
// The source is a generator (Park et al. 2026), so these values are labeled
// synthetic-benchmark and never "calibrated from observed care".
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cache, root, source, verifyCache } from './fetch.mjs';

export const MIX_PATH = resolve(root, 'world/src/synthetic-hospital-mix.json');
const YEAR = 365.25 * 86400000;

/** ICD-10-CM prefixes (dots removed) for each local scenario key. Codes are the
 * dataset's single "correct" diagnosis per encounter. A key absent here is a
 * local scenario with no dataset counterpart. */
export const RULES = {
  edAdult: {
    'chest-pain': ['I20', 'I21', 'I22', 'I24', 'I25', 'R07'],
    'abdominal-pain': ['R10', 'K29', 'K52', 'K56', 'K57', 'K59', 'K85'],
    pneumonia: ['J12', 'J13', 'J14', 'J15', 'J16', 'J17', 'J18'],
    pyelonephritis: ['N10', 'N12', 'N30', 'N390'],
    cellulitis: ['L02', 'L03'],
    'copd-asthma-exacerbation': ['J44', 'J45', 'J46'],
    hyperglycemia: ['E100', 'E101', 'E1065', 'E110', 'E111', 'E1165', 'E130', 'E131', 'R73'],
    'pulmonary-embolism': ['I26'],
    migraine: ['G43', 'G44', 'R51'],
    'musculoskeletal-injury': ['S40', 'S42', 'S43', 'S46', 'S50', 'S52', 'S53', 'S56', 'S60', 'S62', 'S63', 'S70', 'S72', 'S73', 'S80', 'S82', 'S83', 'S86', 'S90', 'S92', 'S93'],
    'acute-low-back-pain': ['M545', 'M543', 'M544'],
    'panic-attack': ['F410'],
    'chronic-pain-flare': ['G89'],
    'renal-colic': ['N20', 'N21', 'N23'],
    'influenza-like-illness': ['J09', 'J10', 'J11', 'J06', 'U071', 'B34'],
    syncope: ['R55'],
    laceration: ['S01', 'S11', 'S21', 'S31', 'S41', 'S51', 'S61', 'S71', 'S81', 'S91'],
  },
  edPeds: {
    'peds-fever-otitis': ['H65', 'H66', 'R50'],
    'peds-asthma': ['J45', 'J46', 'J21'],
    'peds-gastroenteritis': ['A02', 'A03', 'A04', 'A05', 'A08', 'A09', 'K52'],
  },
  edSurgicalConsult: { appendicitis: ['K35', 'K36', 'K37'], 'acute-cholecystitis': ['K81', 'K800', 'K801', 'K804'] },
  clinicChronic: {
    htn: ['I10', 'I11', 'I12', 'I13', 'I15', 'I16'],
    dm2: ['E11'],
    hld: ['E78'],
    warfarin: ['I48', 'I82', 'I26', 'Z7901'],
    apixaban: ['I48', 'I82', 'I26', 'Z7901'],
    respiratory: ['J44', 'J45'],
    metabolic: ['R73', 'E66', 'E88'],
    'chronic-pain': ['G89', 'M54', 'M79'],
  },
  clinicAcute: {
    sinusitis: ['J01', 'J32'],
    'strep-pharyngitis': ['J02', 'J03'],
    bronchitis: ['J20', 'J40'],
    uri: ['J00', 'J06'],
    'back-pain': ['M54'],
    'influenza-like': ['J09', 'J10', 'J11', 'U071'],
    'cap-outpatient': ['J12', 'J13', 'J14', 'J15', 'J16', 'J17', 'J18'],
    cellulitis: ['L02', 'L03'],
    'ankle-sprain': ['S93'],
    laceration: ['S01', 'S11', 'S21', 'S31', 'S41', 'S51', 'S61', 'S71', 'S81', 'S91'],
    'dental-pain': ['K02', 'K04', 'K08'],
  },
  pedsSick: {
    'otitis-media': ['H65', 'H66'],
    'strep-pharyngitis': ['J02', 'J03'],
    'uri-fever': ['J00', 'J06', 'R50', 'B34'],
    'asthma-flare': ['J45', 'J46'],
    gastroenteritis: ['A02', 'A03', 'A04', 'A05', 'A08', 'A09', 'K52'],
  },
  wardAdmission: {
    pneumonia: ['J12', 'J13', 'J14', 'J15', 'J16', 'J17', 'J18'],
    cellulitis: ['L02', 'L03'],
    'copd-asthma-exacerbation': ['J44', 'J45', 'J46'],
    pyelonephritis: ['N10', 'N12', 'N390'],
    hyperglycemia: ['E100', 'E101', 'E1065', 'E110', 'E111', 'E1165', 'E130', 'E131'],
  },
};

const PRIMARY_CARE = new Set(['Internal Medicine', 'Family Medicine', 'General Internal Medicine', 'Primary Care']);
const SURGICAL = /surg|obstetric|gynecolog|neonat|pediatric/i;
const OUTPATIENT = new Set(['outpatient', 'follow_up', 'telehealth']);
/** Persona settings: which dataset encounters stand for each local setting. */
export const SETTINGS = {
  edAdult: (e) => e.type === 'ed' && e.age >= 18,
  edPeds: (e) => e.type === 'ed' && e.age < 18,
  edSurgicalConsult: (e) => e.type === 'ed' && e.age >= 18,
  clinicChronic: (e) => OUTPATIENT.has(e.type) && e.age >= 18 && PRIMARY_CARE.has(e.department),
  clinicAcute: (e) => OUTPATIENT.has(e.type) && e.age >= 18,
  pedsSick: (e) => OUTPATIENT.has(e.type) && e.age < 18,
  wardAdmission: (e) => e.type === 'inpatient' && e.age >= 18 && !SURGICAL.test(e.department),
};
/** Imaging and section settings follow the dataset's encounter types. */
export const settingOf = (type) => type === 'ed' ? 'ed' : ['inpatient', 'icu'].includes(type) ? 'inpatient' : 'outpatient';

export const normalizeCode = (code) => (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export function classify(rules, code) {
  const c = normalizeCode(code);
  if (!c) return [];
  return Object.entries(rules).filter(([, prefixes]) => prefixes.some((p) => c.startsWith(p))).map(([key]) => key);
}
const quantiles = (values, qs = [0.1, 0.25, 0.5, 0.75, 0.9]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Object.fromEntries(qs.map((q) => [`p${Math.round(q * 100)}`, sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0]));
};
const summary = (values) => ({ n: values.length, mean: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : 0, ...quantiles(values) });
const sortedCounts = (counter) => Object.fromEntries(Object.entries(counter).sort(([a, x], [b, y]) => y - x || a.localeCompare(b)));

export async function loadExport(db = resolve(cache, 'benchmark_v1.3.db')) {
  return JSON.parse(execFileSync('python3', ['-I', resolve(import.meta.dirname, 'encounters.py'), db], { maxBuffer: 512 * 1024 * 1024 }));
}
/** Age at each encounter: the source `age` is the age at the first encounter. */
export function withAges(data) {
  const first = new Map();
  for (const e of data.encounters) first.set(e.patient, Math.min(first.get(e.patient) ?? Infinity, Date.parse(e.date)));
  return data.encounters.map((e) => ({ ...e, sex: data.patients[e.patient]?.sex,
    age: (data.patients[e.patient]?.age ?? 0) + Math.floor((Date.parse(e.date) - first.get(e.patient)) / YEAR) }));
}
export function buildMix(data) {
  const encounters = withAges(data);
  const byId = new Map(encounters.map((e) => [e.id, e]));
  const settings = {};
  for (const [name, member] of Object.entries(SETTINGS)) {
    const pool = encounters.filter(member);
    const counts = Object.fromEntries(Object.keys(RULES[name]).map((k) => [k, 0]));
    let covered = 0;
    for (const e of pool) {
      const keys = classify(RULES[name], e.icd10);
      // Overlapping keys (e.g. two anticoagulants for one indication) share one encounter.
      for (const k of keys) counts[k] += 1 / keys.length;
      if (keys.length) covered++;
    }
    settings[name] = { encounters: pool.length, covered, counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round(v * 100) / 100])) };
  }
  const departments = {};
  for (const e of encounters) {
    const s = settingOf(e.type);
    departments[s] ??= {};
    departments[s][e.department] = (departments[s][e.department] ?? 0) + 1;
  }
  const imaging = { overall: {}, bySetting: {} };
  for (const [encounter, priority] of data.imaging) {
    const s = settingOf(byId.get(encounter)?.type);
    imaging.overall[priority] = (imaging.overall[priority] ?? 0) + 1;
    imaging.bySetting[s] ??= {};
    imaging.bySetting[s][priority] = (imaging.bySetting[s][priority] ?? 0) + 1;
  }
  const lengths = {};
  const perEncounter = {};
  for (const [encounter, type, , text] of data.sections) {
    const s = settingOf(byId.get(encounter)?.type);
    ((lengths[s] ??= {})[type] ??= []).push(text.length);
    const key = `${s}:${encounter}`;
    perEncounter[key] = (perEncounter[key] ?? 0) + 1;
  }
  const sections = {};
  for (const [s, types] of Object.entries(lengths)) sections[s] = Object.fromEntries(Object.entries(types).sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => [t, summary(v)]));
  const notes = {};
  for (const s of ['ed', 'inpatient', 'outpatient']) {
    const pool = encounters.filter((e) => settingOf(e.type) === s);
    notes[s] = { chars: summary(pool.map((e) => e.noteChars)), sections: summary(pool.map((e) => perEncounter[`${s}:${e.id}`] ?? 0)) };
  }
  const all = data.sections.map((x) => x[3].length);
  return {
    label: 'synthetic-benchmark',
    description: 'Aggregates from Synthetic Hospital v1.3. Synthetic-benchmark scenario source; not calibrated from observed care. Counts are dataset encounters whose single correct ICD-10-CM diagnosis matches each local scenario (scripts/synthetic-hospital/mix.mjs RULES); unmatched encounters are reported as uncovered and are not modeled.',
    source: { repository: source.repository, commit: source.commit, db: 'benchmark_v1.3.db', sha256: source.files['benchmark_v1.3.db'], citation: source.citation },
    totals: { patients: Object.keys(data.patients).length, encounters: encounters.length, sections: data.sections.length, sectionCharsMean: Math.round(all.reduce((a, b) => a + b, 0) / all.length * 10) / 10, imagingOrders: data.imaging.length },
    encounterTypes: sortedCounts(encounters.reduce((m, e) => ({ ...m, [e.type]: (m[e.type] ?? 0) + 1 }), {})),
    settings,
    departments: Object.fromEntries(Object.entries(departments).sort(([a], [b]) => a.localeCompare(b)).map(([s, d]) => [s, sortedCounts(d)])),
    imagingPriority: { overall: sortedCounts(imaging.overall), bySetting: Object.fromEntries(Object.entries(imaging.bySetting).sort(([a], [b]) => a.localeCompare(b)).map(([s, d]) => [s, sortedCounts(d)])) },
    sectionChars: sections,
    notes,
  };
}
export const serialize = (mix) => JSON.stringify(mix, null, 2) + '\n';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verifyCache();
  const text = serialize(buildMix(await loadExport()));
  if (process.argv.includes('--check')) {
    if (await readFile(MIX_PATH, 'utf8') !== text) throw new Error(`${MIX_PATH} differs from the pinned dataset; run node scripts/synthetic-hospital/mix.mjs`);
    console.log('synthetic-hospital-mix.json matches the pinned dataset');
  } else {
    await writeFile(MIX_PATH, text);
    console.log(`wrote ${MIX_PATH}`);
  }
}
