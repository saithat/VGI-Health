#!/usr/bin/env node
// Materialize a world day as real FHIR worklists. Existing resources are never overwritten.
import { fictionalize } from '../../scripts/fictional-identities.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv, PERSONA_SYSTEM, REPO_ROOT } from './lib.mjs';

export const WORLD_SYSTEM = 'https://vgi-health.example/fhir/sid/world';
export const WORKLIST_SYSTEM = 'https://vgi-health.example/fhir/CodeSystem/worklist';
const INFRA = 'https://vgi-health.example/fhir/CodeSystem/vgi-infra';
const EXT = 'https://vgi-health.example/fhir/StructureDefinition/';
const UCUM = 'http://unitsofmeasure.org';
const SHIFTS = { P1: 450, P2: 420, P3: 420, P4: 480, P5: 390 };
// RxNorm ingredient identifiers from world/src/formulary.ts (not product/strength codes).
const RXNORM = { 'insulin glargine': '274783', 'insulin lispro': '86009', heparin: '5224', enoxaparin: '67108',
  warfarin: '11289', apixaban: '1364430', lisinopril: '29046', metformin: '6809', atorvastatin: '83367',
  ceftriaxone: '2193', cefazolin: '2180', amoxicillin: '723', azithromycin: '18631', vancomycin: '11124',
  acetaminophen: '161', ibuprofen: '5640', morphine: '7052', hydromorphone: '3423', oxycodone: '7804',
  'hydrocodone-acetaminophen': '214182', tramadol: '10689', ondansetron: '26225', albuterol: '435', lorazepam: '6470', alprazolam: '596' };
const PERSONAS = {
  P1: ['doctor', '207R00000X', 'Primary care'],
  P2: ['doctor', '207P00000X', 'Emergency medicine'],
  P3: ['nurse', '163W00000X', 'Inpatient nursing'],
  RN2: ['nurse', '163W00000X', 'Second nurse'],
  P4: ['nurse', '363LP0200X', 'Pediatric NP'],
  P5: ['doctor', '208600000X', 'General surgery'],
};
// Seeded resource types only. Patients and setup's Practitioners are deliberately not owned here.
export const SEED_TYPES = ['Organization', 'Location', 'PractitionerRole', 'Appointment', 'Encounter',
  'MedicationRequest', 'Observation', 'DiagnosticReport', 'Task', 'ServiceRequest', 'Procedure',
  'AllergyIntolerance', 'Consent'];
const concept = (system, code, display) => ({ coding: [{ system, code, ...(display ? { display } : {}) }] });
const ref = (reference) => ({ reference });
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const LABS = {
  potassium: ['2823-3', 'mmol/L'], creatinine: ['2160-0', 'mg/dL'], a1c: ['4548-4', '%'], ldl: ['18262-6', 'mg/dL'],
  inr: ['6301-6', '{INR}'], hemoglobin: ['718-7', 'g/dL'], wbc: ['6690-2', '10*3/uL'], glucose: ['2345-7', 'mg/dL'],
  sodium: ['2951-2', 'mmol/L'], tsh: ['3016-3', 'm[IU]/L'], bloodCulture: ['600-7', ''], pathology: ['22637-3', ''],
};
const LAB_LABELS = Object.fromEntries(readJson(resolve(REPO_ROOT, 'infra/valuesets/loinc.json')).codes.map((r) => [r.code, r.label]));

export function options(args) {
  const out = { day: 1, world: resolve(REPO_ROOT, 'runs/world/2'), resetDay: false, verifyOnly: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--day': out.day = Number(args[++i]); break;
      case '--world': if (!args[i + 1]) throw new Error('--world needs a path'); out.world = resolve(args[++i]); break;
      case '--reset-day': out.resetDay = true; break;
      case '--verify-only': out.verifyOnly = true; break;
      case '--dry-run': out.dryRun = true; break;
      case '--help': console.log('seed-world.mjs [--day N] [--world DIR] [--reset-day] [--verify-only] [--dry-run]'); return;
      default: throw new Error(`Unknown argument: ${args[i]}`);
    }
  }
  if (!Number.isInteger(out.day) || out.day < 1) throw new Error('--day must be a positive integer');
  if (out.verifyOnly && out.resetDay) throw new Error('--verify-only cannot be combined with --reset-day');
  return out;
}

export function loadWorld({ world, day }) {
  const manifest = readJson(resolve(world, 'manifest.json'));
  const entry = manifest.perDay.find((d) => d.day === day);
  if (!entry) throw new Error(`Day ${day} is not in ${world}/manifest.json`);
  const schedules = Object.fromEntries(Object.keys(SHIFTS).map((p) => {
    const schedule = readJson(resolve(world, `schedules/day-${String(day).padStart(2, '0')}/${p}.json`));
    if (schedule.day !== day || schedule.persona !== p) throw new Error(`Mismatched schedule for ${p}`);
    return [p, schedule];
  }));
  return { day, date: entry.date, schedules, state: readJson(resolve(world, `state-day-${day}.json`)),
    previous: readJson(resolve(world, `state-day-${day - 1}.json`)) };
}

// Same work-day calendar as world/src/calendar.ts, including pre-simulation admissions.
function dateFor(data, day) {
  const idx = day - 1;
  const weeks = Math.floor(idx / 5);
  const offset = weeks * 7 + idx - weeks * 5;
  const anchor = Date.parse(`${data.date}T00:00:00Z`);
  const ownIdx = data.day - 1;
  const ownWeeks = Math.floor(ownIdx / 5);
  const ownOffset = ownWeeks * 7 + ownIdx - ownWeeks * 5;
  return new Date(anchor + (offset - ownOffset) * 86400000).toISOString().slice(0, 10);
}
function time(data, minute, day = data.day) {
  const clock = Math.max(0, Math.min(1439, Math.round(minute)));
  return `${dateFor(data, day)}T${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}:00-08:00`;
}

export function buildResources(data, patients, practitioners) {
  const { day, date, state, previous } = data;
  const schedules = Object.fromEntries(Object.entries(data.schedules).map(([p, s]) => [p, { ...s, tasks: [...s.tasks] }]));
  // Schedules contain work handled that day. The queue also needs the world's unhandled
  // backlog, including abnormal results and refills on busy/urgent-care days.
  for (const item of state.inboxBacklog) {
    const p = item.lab?.recipient ?? 'P1';
    const todayResources = [];
    const observation = (id, lab, value, interpretation, effectiveDay, text) => {
      const def = LABS[lab];
      if (!def) throw new Error(`Unknown backlog lab ${lab}`);
      return { resourceType: 'Observation', id, status: 'final', subject: { reference: `Patient/${item.patientId}` },
        category: [concept('http://terminology.hl7.org/CodeSystem/observation-category', 'laboratory')],
        code: concept('http://loinc.org', def[0], LAB_LABELS[def[0]]),
        effectiveDateTime: time(data, 435, effectiveDay), issued: time(data, 495, effectiveDay),
        interpretation: [concept('http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation', interpretation)],
        ...(def[1] ? { valueQuantity: { value, unit: def[1], system: UCUM, code: def[1] } }
          : { valueString: text ?? (interpretation === 'N' ? 'No abnormal finding' : 'Abnormal finding') }) };
    };
    if (item.kind === 'result') {
      const lab = item.lab;
      todayResources.push(observation(`${lab.id}-result`, lab.lab, lab.value, lab.interpretation, lab.resultDay, lab.text));
    } else {
      const rx = item.refill;
      const current = medication(rx.current, { reference: `Patient/${item.patientId}` }, undefined,
        { reference: practitioners[p] }, time(data, 540, rx.requestedDay), data, item.patientId);
      current.category = [concept('http://terminology.hl7.org/CodeSystem/medicationrequest-category', 'outpatient')];
      todayResources.push({ resourceType: 'Task', id: `${rx.id}-task`, status: 'requested', intent: 'order',
        contained: [{ ...current, id: 'current-rx' }], focus: { reference: '#current-rx' },
        for: { reference: `Patient/${item.patientId}` }, authoredOn: time(data, 390, rx.requestedDay),
        description: `Refill request: ${rx.current.drug}` });
      for (const [i, lab] of rx.labs.entries()) {
        // World refill lab ages are calendar days, unlike simulation-day indices.
        const effective = new Date(Date.parse(`${dateFor(data, rx.requestedDay)}T08:00:00-08:00`) - lab.daysAgo * 86400000).toISOString();
        const o = observation(`${rx.id}-lab${i}`, lab.lab, lab.value, lab.interpretation, rx.requestedDay);
        o.effectiveDateTime = effective;
        o.issued = effective;
        todayResources.push(o);
      }
    }
    // Backlog has no clinical action yet. Only materialize the request/result, never its decision.
    const ids = new Set(schedules[p].tasks.flatMap((t) => t.todayResources.map((r) => `${r.resourceType}/${r.id}`)));
    if (todayResources.some((r) => ids.has(`${r.resourceType}/${r.id}`))) continue;
    schedules[p].tasks.push({ id: `backlog-${item.id}`, persona: p, day, workflow: item.kind === 'result' ? 'W2' : 'W7',
      patientId: item.patientId, startMin: 0, choices: { noteSections: [] }, todayResources });
  }
  const entries = new Map();
  const key = (name) => `day${day}-${name}`;
  const url = (name) => {
    const h = createHash('sha256').update(`${WORLD_SYSTEM}|${key(name)}`).digest('hex');
    return `urn:uuid:${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
  const add = (name, resource, worklist) => {
    const fullUrl = url(name);
    const identifier = { system: WORLD_SYSTEM, value: key(name) };
    const r = structuredClone(resource);
    delete r.id;
    r.identifier = [...(r.identifier ?? []), identifier];
    r.meta = { ...r.meta, tag: [...(r.meta?.tag ?? []), { system: WORLD_SYSTEM, code: `day${day}` },
      ...(worklist ? [{ system: WORKLIST_SYSTEM, code: worklist }] : [])] };
    if (!SEED_TYPES.includes(r.resourceType)) throw new Error(`Unowned type ${r.resourceType}`);
    if (entries.has(fullUrl)) throw new Error(`Duplicate seed key ${name}`);
    entries.set(fullUrl, { fullUrl, resource: r, request: { method: 'POST', url: r.resourceType,
      ifNoneExist: new URLSearchParams({ identifier: `${WORLD_SYSTEM}|${key(name)}` }).toString() } });
    return ref(fullUrl);
  };
  const patient = (id) => {
    if (!patients[id]) throw new Error(`Patient ${id} not loaded; run make load`);
    return ref(patients[id]);
  };
  const practitioner = (p) => {
    if (!practitioners[p]) throw new Error(`Practitioner ${p} missing; run make setup`);
    return ref(practitioners[p]);
  };
  const org = add('hospital', { resourceType: 'Organization', active: true, name: 'VGI Health simulation hospital' });
  const location = (name, label, physical, parent) => add(name, { resourceType: 'Location', status: 'active',
    mode: 'instance', name: label, managingOrganization: org,
    physicalType: concept('http://terminology.hl7.org/CodeSystem/location-physical-type', physical),
    ...(parent ? { partOf: parent } : {}) });
  const ed = location('ed', 'Emergency department', 'wa');
  const ward = location('ward', 'Inpatient wards', 'wa');
  const or = location('or', 'Operating room 1', 'ro');
  const clinic = location('clinic', 'Adult and surgical clinic', 'wa');
  const peds = location('pediatrics', 'Pediatric clinic', 'wa');
  const roles = {};
  for (const [p, [role, taxonomy, label]] of Object.entries(PERSONAS)) {
    roles[p] = add(`role-${p}`, { resourceType: 'PractitionerRole', active: true, practitioner: practitioner(p),
      organization: org, code: [concept('http://terminology.hl7.org/CodeSystem/practitioner-role', role)],
      specialty: [concept('http://nucc.org/provider-taxonomy', taxonomy, label)],
      location: p === 'P5' ? [clinic, or, ward, ed] : [p === 'P2' ? ed : p === 'P4' ? peds : p === 'P1' ? clinic : ward] }, `${p}-role`);
  }
  const encounter = (name, p, patientId, cls, start, loc, extra = {}) => add(name, {
    resourceType: 'Encounter', status: 'in-progress', class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: cls },
    subject: patient(patientId), serviceProvider: org, period: { start },
    participant: [{ individual: practitioner(p) }, { individual: roles[p] }],
    location: [{ location: loc, status: 'active', period: { start } }], ...extra,
  }, `${p}-${cls === 'EMER' ? 'ed' : 'census'}`);
  const edEncounters = {};
  for (const [i, arrival] of state.today.ed.arrivals.entries()) {
    const room = location(`ed-room-${i + 1}`, `ED room ${i + 1}`, 'ro', ed);
    const start = time(data, arrival.arrivalClock);
    edEncounters[arrival.taskId] = encounter(`ed-${arrival.taskId}`, 'P2', arrival.patientId, 'EMER', start, room, {
      priority: { ...concept(`${INFRA}/esi`, String(arrival.esi), `ESI ${arrival.esi}`), text: `Emergency Severity Index ${arrival.esi}` },
      statusHistory: [{ status: 'arrived', period: { start, end: start } }, { status: 'triaged', period: { start, end: start } }],
      reasonCode: [{ text: arrival.scenario }],
      extension: [{ url: `${EXT}triage-time`, valueDateTime: start }],
    });
  }
  // Day snapshots are end-of-day: take the regimen from the prior snapshot for shift-start patients,
  // even when today's end snapshot has already discharged them.
  const inpatientEncounters = {};
  for (const census of state.today.ward.censusAtShiftStart) {
    const ip = previous.inpatients.find((x) => x.patientId === census.patientId);
    if (!ip) throw new Error(`Missing shift-start inpatient ${census.patientId}`);
    const room = location(`room-${ip.room}`, `Room ${ip.room}`, 'ro', ward);
    const bed = location(`bed-${ip.room}`, `Bed ${ip.room}-A`, 'bd', room);
    const start = time(data, ip.admitClock, ip.admitDay);
    const enc = encounter(`inpatient-${ip.admissionId}`, 'P3', ip.patientId, 'IMP', start, bed,
      { reasonCode: [{ text: ip.diagnosis }], serviceType: { text: ip.service } });
    inpatientEncounters[ip.patientId] = enc;
    const regimens = ip.regimens.filter((r) => r.fromDay < day || (r.fromDay === day && r.fromClock <= 420));
    const regimen = regimens.at(-1);
    if (!regimen) throw new Error(`Missing active regimen ${ip.admissionId}`);
    for (const [i, o] of regimen.orders.entries()) {
      add(`mar-${ip.admissionId}-${i}`, medication(o, patient(ip.patientId), enc,
        practitioner(ip.service === 'surgery' ? 'P5' : 'P1'), start, data, ip.patientId), 'P3-mar');
    }
  }
  const imported = new Map();
  function importToday(task, enc) {
    // Rewrite world Patient/<synthea UUID> references and same-task resource references.
    const local = new Map(task.todayResources.map((r) => [`${r.resourceType}/${r.id}`, url(`source-${r.resourceType}-${r.id}`)]));
    const rewrite = (v) => {
      if (Array.isArray(v)) return v.map(rewrite);
      if (!v || typeof v !== 'object') return v;
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k,
        k === 'reference' && typeof x === 'string' ? (x.startsWith('Patient/') ? patient(x.slice(8)).reference : local.get(x) ?? x) : rewrite(x)]));
    };
    for (const original of task.todayResources) {
      const name = `source-${original.resourceType}-${original.id}`;
      if (imported.has(name)) continue;
      const r = rewrite(original);
      if (r.resourceType === 'DiagnosticReport' && r.code?.text === 'CT abdomen and pelvis with IV contrast') {
        r.code.coding = [{ system: 'http://loinc.org', code: '36813-4', display: 'CT Abdomen and Pelvis W contrast IV' }];
      }
      if (enc && ['Observation', 'DiagnosticReport', 'Task'].includes(r.resourceType)) r.encounter = enc;
      if (r.resourceType === 'Task') {
        const current = r.contained?.find((c) => c.resourceType === 'MedicationRequest' && r.focus?.reference === `#${c.id}`);
        if (!current) throw new Error(`Refill ${task.id} has no current prescription`);
        r.focus = add(`refill-rx-${original.id}`, { ...current, requester: practitioner(task.persona) }, `${task.persona}-refill-rx`);
        delete r.contained;
        r.owner = practitioner(task.persona);
        r.code = { ...concept(INFRA, 'refill-request', 'Refill request'), text: 'Refill request' };
      }
      imported.set(name, add(name, r, `${task.persona}-${r.resourceType === 'Task' ? 'refills' : 'facts'}`));
    }
  }
  for (const [p, schedule] of Object.entries(schedules)) {
    for (const task of schedule.tasks) {
      const start = time(data, SHIFTS[p] + task.startMin);
      if (task.workflow === 'W1' || task.workflow === 'W5') {
        add(`appointment-${task.id}`, { resourceType: 'Appointment', status: 'booked', start,
          end: time(data, SHIFTS[p] + task.startMin + 20), minutesDuration: 20,
          appointmentType: { text: task.workflow === 'W5' ? 'Pediatric office visit' : 'Office visit' },
          description: task.workflow === 'W5' ? 'Pediatric office visit' : 'Office visit',
          participant: [{ actor: patient(task.patientId), status: 'accepted' },
            { actor: practitioner(p), status: 'accepted' }, { actor: roles[p], status: 'accepted' },
            { actor: p === 'P4' ? peds : clinic, status: 'accepted' }] }, `${p}-appointments`);
      }
      const enc = p === 'P2' ? edEncounters[task.id] : p === 'P3' ? inpatientEncounters[task.patientId] : undefined;
      importToday(task, enc);
      if (task.workflow === 'W2') {
        const observations = task.todayResources.filter((r) => r.resourceType === 'Observation');
        const abnormal = observations.some((o) => o.interpretation?.some((c) => c.coding?.some((v) => ['H', 'L', 'A', 'HH', 'LL'].includes(v.code))));
        const report = add(`result-report-${task.id}`, { resourceType: 'DiagnosticReport', status: 'final',
          category: [concept('http://terminology.hl7.org/CodeSystem/v2-0074', 'LAB')],
          code: observations[0]?.code ?? { text: 'Result review' }, subject: patient(task.patientId),
          issued: observations[0]?.issued ?? start, effectiveDateTime: observations[0]?.effectiveDateTime ?? start,
          result: observations.map((o) => imported.get(`source-Observation-${o.id}`)),
          conclusion: abnormal ? 'Abnormal result requires review' : 'Result requires review' }, `${p}-results`);
        add(`result-task-${task.id}`, { resourceType: 'Task', status: 'requested', intent: 'order',
          priority: abnormal ? 'urgent' : 'routine', code: concept(INFRA, 'result-review', 'Review result'),
          description: abnormal ? 'Review new abnormal result' : 'Review new result',
          for: patient(task.patientId), owner: practitioner(p), focus: report, authoredOn: start,
          input: observations.map((o) => ({ type: { text: 'Result Observation' }, valueReference: imported.get(`source-Observation-${o.id}`) })) }, `${p}-inbox`);
      }
      if (p === 'P5' && ['rounding', 'discharge'].includes(task.choices.w6Step)) {
        add(`surgery-task-${task.id}`, { resourceType: 'Task', status: 'requested', intent: 'order',
          code: concept(INFRA, task.choices.w6Step), for: patient(task.patientId), owner: practitioner(p),
          focus: inpatientEncounters[task.patientId], authoredOn: start }, 'P5-rounding');
      }
    }
  }
  // The OR worklist includes already-booked future cases. Day 1 is a clinic day with no OR cases.
  const cases = state.surgicalCases.filter((c) => c.orDay >= day);
  for (const c of cases) {
    const cpt = { 'laparoscopic appendectomy': '44970', 'laparoscopic cholecystectomy': '47562',
      'laparoscopic inguinal hernia repair': '49650' }[c.procedure];
    const order = add(`or-order-${c.id}`, { resourceType: 'ServiceRequest', status: 'active', intent: 'order',
      category: [concept('http://snomed.info/sct', '387713003', 'Surgical procedure')],
      code: { ...(cpt ? concept('http://www.ama-assn.org/go/cpt', cpt) : {}), text: c.procedure },
      subject: patient(c.patientId), requester: practitioner('P5'), performer: [practitioner('P5')],
      locationReference: [or], authoredOn: `${date}T06:30:00-08:00`, priority: c.urgency === 'urgent' ? 'urgent' : 'routine',
      reasonCode: [{ text: c.diagnosis }],
      ...(c.orStartClock === null ? { occurrenceDateTime: dateFor(data, c.orDay) } : {
        occurrencePeriod: { start: time(data, c.orStartClock, c.orDay), end: time(data, c.orEndClock, c.orDay) } }),
    }, 'P5-or');
    // R4 has no Procedure.status=planned; preparation is the valid pre-operation state.
    add(`or-procedure-${c.id}`, { resourceType: 'Procedure', status: 'preparation', basedOn: [order],
      code: { text: c.procedure }, subject: patient(c.patientId), location: or,
      performer: [{ actor: practitioner('P5') }], reasonCode: [{ text: c.diagnosis }],
      note: [{ text: `Planned for ${dateFor(data, c.orDay)}; see ServiceRequest for schedule` }] }, 'P5-procedures');
    if (c.consultDay === day) {
      const enc = edEncounters[c.edTaskId];
      if (!enc) throw new Error(`Missing ED encounter for consult ${c.id}`);
      const consultTask = schedules.P5.tasks.find((t) => t.patientId === c.patientId && t.choices.w6Step === 'consult');
      const supportingInfo = (consultTask?.todayResources ?? []).map((r) => imported.get(`source-${r.resourceType}-${r.id}`)).filter(Boolean);
      const request = add(`consult-${c.id}`, { resourceType: 'ServiceRequest', status: 'active', intent: 'order',
        priority: 'urgent', code: concept('http://snomed.info/sct', '11429006', 'Consultation'),
        subject: patient(c.patientId), encounter: enc, requester: practitioner('P2'), performer: [practitioner('P5')],
        reasonCode: [{ text: c.diagnosis }], supportingInfo,
        authoredOn: time(data, c.consultClock), locationReference: [ed] }, 'P5-consults');
      add(`consult-task-${c.id}`, { resourceType: 'Task', status: 'requested', intent: 'order', priority: 'urgent',
        code: concept(INFRA, 'surgical-consult'), for: patient(c.patientId), encounter: enc,
        owner: practitioner('P5'), requester: practitioner('P2'), focus: request, authoredOn: time(data, c.consultClock) }, 'P5-consult-tasks');
    }
  }
  return fictionalize([...entries.values()]);
}

function medication(o, subject, encounter, requester, authoredOn, data, patientId) {
  const frequencies = { daily: [1, 1, 'd'], q24h: [1, 24, 'h'], BID: [2, 1, 'd'], q12h: [1, 12, 'h'],
    TID: [3, 1, 'd'], TIDAC: [3, 1, 'd'], QID: [4, 1, 'd'], q4h: [1, 4, 'h'], q6h: [1, 6, 'h'],
    q8h: [1, 8, 'h'], q3h: [1, 3, 'h'], nightly: [1, 1, 'd'], once: [1, 1, 'd'] };
  const f = frequencies[o.freq];
  if (!f) throw new Error(`Unsupported medication frequency ${o.freq}`);
  // Same due-pass policy as world/src/flows/ward.ts. Repeat describes the complete regimen;
  // event describes only this day's due doses (including world hold/refusal decisions).
  const events = o.prn ? [] : data.schedules.P3.tasks.filter((t) => t.patientId === patientId &&
    t.choices.administer.some((a) => a.drug === o.drug && a.doseTenths === o.doseTenths && a.freq === o.freq && a.route === o.route))
    .map((t) => time(data, SHIFTS.P3 + t.startMin));
  if (!RXNORM[o.drug]) throw new Error(`Missing RxNorm ingredient ${o.drug}`);
  const unit = o.unit === 'units' ? '[iU]' : o.unit;
  return { resourceType: 'MedicationRequest', status: 'active', intent: 'order', subject, encounter, requester, authoredOn,
    category: [concept('http://terminology.hl7.org/CodeSystem/medicationrequest-category', 'inpatient')],
    medicationCodeableConcept: { ...concept('http://www.nlm.nih.gov/research/umls/rxnorm', RXNORM[o.drug], o.drug), text: o.drug },
    ...(o.indication ? { reasonCode: [{ text: o.indication }] } : {}),
    meta: { tag: /^(insulin |heparin$|enoxaparin$|warfarin$|apixaban$|morphine$|hydromorphone$|oxycodone$|hydrocodone-acetaminophen$|tramadol$)/.test(o.drug)
      ? [{ system: INFRA, code: 'high-alert', display: 'High-alert medication (world formulary)' }] : [] },
    dosageInstruction: [{ text: `${o.drug} ${o.doseTenths / 10} ${o.unit} ${o.route} ${o.freq}${o.prn ? ' PRN' : ''}`,
      route: { text: o.route }, asNeededBoolean: o.prn,
      timing: { code: { text: o.freq }, ...(events.length ? { event: events } : {}), repeat: { frequency: f[0], period: f[1], periodUnit: f[2],
        ...(o.freq === 'TIDAC' ? { when: ['AC'] } : o.freq === 'nightly' ? { when: ['HS'] } : {}) } },
      doseAndRate: [{ doseQuantity: { value: o.doseTenths / 10, unit: o.unit, system: UCUM, code: unit } }] }] };
}

/** Import the complete dated baseline; reruns never overwrite a live stream. */
export async function main(args = process.argv.slice(2)) {
  loadEnv();
  const opts = options(args);
  if (!opts) return;
  if (opts.resetDay) throw new Error('Resetting live data is forbidden; start a distinct compose project');
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['--experimental-strip-types', resolve(REPO_ROOT, 'services/commit/src/provision.ts'),
    '--world', opts.world, '--day', String(opts.day), ...(opts.dryRun ? ['--dry-run'] : []), ...(opts.verifyOnly ? ['--verify-only'] : []), ...(process.env.SYNTHETIC_HOSPITAL === '0' ? [] : ['--hospital'])], { cwd: REPO_ROOT, env: process.env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Commit-service import failed');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e); process.exitCode = 1; });
