/** Build an original synthetic acute scenario on a committed Synthea chart.
 * These are review inputs, not world simulation results or clinical guidance.
 * Usage: node scripts/acute-review-fixtures.mjs /tmp/acute-review-fixtures
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = process.argv[2] ?? '/tmp/acute-review-fixtures';
const original = JSON.parse(await readFile(path.join(root, 'fixtures/synthea/Aaron_Ankunding_4966bd28.json'), 'utf8'));
const patientEntry = original.entry.find(e => e.resource.resourceType === 'Patient');
const patientRef = { reference: patientEntry.fullUrl, display: 'Aaron Bruno Ankunding' };
const ref = (resourceType, id, display) => ({ reference: `${resourceType}/${id}`, ...(display ? { display } : {}) });
const cc = (code, text, system = 'urn:vgi:acute-review') => ({ coding: [{ system, code, display: text }], text });
const stamped = resource => ({ ...resource, meta: { versionId: '1', tag: [{ system: 'urn:vgi:fixture', code: 'acute-review' }] } });
const observation = (id, encounter, code, text, value, unit, time, category = 'vital-signs', flag, low, high) => stamped({
  resourceType: 'Observation', id, status: 'final', subject: patientRef, encounter: ref('Encounter', encounter),
  code: cc(code, text, 'http://loinc.org'), category: [cc(category, category)],
  effectiveDateTime: time, issued: time,
  valueQuantity: { value, unit: unit === 'Cel' ? '°C' : unit === '{score}' ? 'score' : unit === 'mm[Hg]' ? 'mmHg' : unit, system: 'http://unitsofmeasure.org', code: unit },
  ...(flag ? { interpretation: [cc(flag, flag, 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation')] } : {}),
  ...(low !== undefined ? { referenceRange: [{ low: { value: low, unit }, high: { value: high, unit } }] } : {}),
});
const times = ['2026-11-02T06:00:00-08:00', '2026-11-02T07:30:00-08:00'];
const vitals = encounter => (encounter === 'acute-ed-encounter'
  ? ['2026-11-02T07:20:00-08:00', '2026-11-02T07:30:00-08:00']
  : times).flatMap((time, n) => [
  observation(`review-weight-${n}`, encounter, '29463-7', 'Weight', 93.4, 'kg', time),
  observation(`review-sbp-${n}`, encounter, '8480-6', 'Systolic BP', 140 - n * 4, 'mm[Hg]', time),
  observation(`review-dbp-${n}`, encounter, '8462-4', 'Diastolic BP', 84 - n * 2, 'mm[Hg]', time),
  observation(`review-hr-${n}`, encounter, '8867-4', 'Heart rate', 88 - n * 6, '/min', time),
  observation(`review-rr-${n}`, encounter, '9279-1', 'Respiratory rate', 20 - n * 2, '/min', time),
  observation(`review-temp-${n}`, encounter, '8310-5', 'Temperature', Number((37.7 - n * 0.3).toFixed(1)), 'Cel', time),
  observation(`review-spo2-${n}`, encounter, '2708-6', 'SpO2', 95 + n, '%', time),
  observation(`review-pain-${n}`, encounter, '72514-3', 'Pain score', 6 - n * 2, '{score}', time),
]);
const order = (id, encounter, medication, rxnorm, dose, unit, route, instruction, events, prn = false) => stamped({
  resourceType: 'MedicationRequest', id, status: 'active', intent: 'order', subject: patientRef,
  encounter: ref('Encounter', encounter), authoredOn: '2026-11-01T16:30:00-08:00',
  medicationCodeableConcept: cc(rxnorm, medication, 'http://www.nlm.nih.gov/research/umls/rxnorm'),
  requester: ref('Practitioner', 'review-attending', 'Morgan Patel, MD'),
  dosageInstruction: [{ text: instruction,
    ...(typeof prn === 'boolean' ? { asNeededBoolean: prn } : { asNeededCodeableConcept: prn }), route: cc(route, route),
    timing: { event: events }, doseAndRate: [{ doseQuantity: { value: dose, unit: unit === '[iU]' ? 'units' : unit, system: 'http://unitsofmeasure.org', code: unit } }] }],
});
const encounter = (id, encClass, location, reason, start) => stamped({
  resourceType: 'Encounter', id, status: 'in-progress', class: { code: encClass }, subject: patientRef,
  period: { start }, reasonCode: [cc('R06.02', reason, 'http://hl7.org/fhir/sid/icd-10-cm')],
  priority: cc('2', 'ESI 2', 'urn:vgi:esi'),
  participant: [{ type: [cc('ATND', 'Attending')], individual: ref('Practitioner', 'review-attending', 'Morgan Patel, MD') },
    { type: [cc('RN', 'Primary RN')], individual: ref('Practitioner', 'review-rn', 'Jordan Lee, RN') }],
  location: [{ location: ref('Location', 'review-room', location), status: 'active' }],
  hospitalization: { admitSource: cc('ambulance', 'Ambulance') },
});
const task = (id, encounterId, title, due, priority = 'routine') => stamped({
  resourceType: 'Task', id, status: 'requested', intent: 'order', priority,
  for: patientRef, encounter: ref('Encounter', encounterId), description: title,
  code: cc('nursing-task', title), authoredOn: '2026-11-02T07:00:00-08:00',
  restriction: { period: { end: due } }, executionPeriod: { start: due },
  owner: ref('Practitioner', 'review-rn', 'Jordan Lee, RN'),
});
const labs = encounterId => [
  observation('review-glucose', encounterId, '2339-0', 'Glucose', 186, 'mg/dL', times[1], 'laboratory', 'H', 70, 99),
  observation('review-inr', encounterId, '6301-6', 'INR', 1.1, '1', times[1], 'laboratory', undefined, 0.8, 1.2),
  observation('review-creatinine', encounterId, '2160-0', 'Creatinine', 0.9, 'mg/dL', times[1], 'laboratory', undefined, 0.6, 1.3),
];
const rnId = 'acute-rn-encounter';
const rn = [encounter(rnId, 'IMP', '5 West · 512 A', 'Pneumonia; receiving antibiotics', '2026-11-01T15:40:00-08:00'),
  ...vitals(rnId), ...labs(rnId),
  observation('acute-rn-intake-1', rnId, '9000-1', 'Oral intake', 250, 'mL', '2026-11-02T08:00:00-08:00', 'exam'),
  observation('acute-rn-intake-2', rnId, '9000-1', 'Oral intake', 350, 'mL', '2026-11-02T09:00:00-08:00', 'exam'),
  observation('acute-rn-output-1', rnId, '9187-6', 'Urine output', 300, 'mL', '2026-11-02T08:30:00-08:00', 'exam'),
  observation('acute-rn-output-2', rnId, '9187-6', 'Urine output', 450, 'mL', '2026-11-02T09:30:00-08:00', 'exam'),
  stamped({ resourceType: 'Observation', id: 'acute-rn-assessment', status: 'final', subject: patientRef,
    encounter: ref('Encounter', rnId), category: [cc('survey', 'Survey', 'http://terminology.hl7.org/CodeSystem/observation-category')],
    code: cc('nursing-assessment', 'Nursing assessment'), effectiveDateTime: '2026-11-02T08:00:00-08:00',
    valueString: 'Alert and oriented; breathing comfortably on room air.' }),
  order('acute-rn-insulin', rnId, 'insulin lispro', '86009', 4, '[iU]', 'SC', '4 units subcutaneously before meals', ['2026-11-02T08:00:00-08:00', '2026-11-02T12:00:00-08:00', '2026-11-02T17:00:00-08:00']),
  order('acute-rn-enoxaparin', rnId, 'enoxaparin', '67108', 40, 'mg', 'SC', '40 mg subcutaneously daily', ['2026-11-02T09:00:00-08:00']),
  order('acute-rn-ceftriaxone', rnId, 'ceftriaxone', '2193', 1000, 'mg', 'IV', '1 g IV daily', ['2026-11-02T09:00:00-08:00']),
  order('acute-rn-prn', rnId, 'acetaminophen', '161', 650, 'mg', 'PO', '650 mg by mouth every 6 hours as needed for pain', [], cc('pain', 'Pain')),
  stamped({ resourceType: 'MedicationAdministration', id: 'acute-rn-previous-insulin', status: 'completed', subject: patientRef,
    context: ref('Encounter', rnId), request: ref('MedicationRequest', 'acute-rn-insulin'),
    medicationCodeableConcept: cc('86009', 'insulin lispro'), effectiveDateTime: '2026-11-01T17:08:00-08:00',
    dosage: { dose: { value: 4, unit: 'units', code: '[iU]' }, route: cc('SC', 'SC'), site: cc('abdomen', 'Left abdomen') } }),
  stamped({ resourceType: 'MedicationAdministration', id: 'acute-rn-previous-prn', status: 'completed', subject: patientRef,
    context: ref('Encounter', rnId), request: ref('MedicationRequest', 'acute-rn-prn'),
    medicationCodeableConcept: cc('161', 'acetaminophen'), effectiveDateTime: '2026-11-02T07:30:00-08:00',
    dosage: { dose: { value: 650, unit: 'mg' }, route: cc('PO', 'PO') } }),
  stamped({ resourceType: 'MedicationAdministration', id: 'acute-rn-held-enoxaparin', status: 'on-hold', subject: patientRef,
    context: ref('Encounter', rnId), request: ref('MedicationRequest', 'acute-rn-enoxaparin'),
    medicationCodeableConcept: cc('67108', 'enoxaparin'), effectiveDateTime: '2026-11-02T09:05:00-08:00',
    statusReason: [cc('held', 'Held per procedure team')], dosage: { dose: { value: 40, unit: 'mg' }, route: cc('SC', 'SC') } }),
  stamped({ resourceType: 'MedicationAdministration', id: 'acute-rn-given-ceftriaxone', status: 'completed', subject: patientRef,
    context: ref('Encounter', rnId), request: ref('MedicationRequest', 'acute-rn-ceftriaxone'),
    medicationCodeableConcept: cc('2193', 'ceftriaxone'), effectiveDateTime: '2026-11-02T09:12:00-08:00',
    dosage: { dose: { value: 1000, unit: 'mg' }, route: cc('IV', 'IV') } }),
  { ...task('acute-rn-med-pass', rnId, '08:00 medication pass', '2026-11-02T08:00:00-08:00'),
    focus: ref('MedicationRequest', 'acute-rn-insulin'), businessStatus: cc('overdue', 'Overdue') },
  task('acute-rn-assessment', rnId, 'Shift assessment and vital signs', '2026-11-02T08:00:00-08:00'),
  task('acute-rn-reassessment', rnId, 'Pain reassessment after PRN medication', '2026-11-02T08:30:00-08:00'),
  stamped({ resourceType: 'DocumentReference', id: 'acute-rn-handoff', status: 'current', docStatus: 'final', subject: patientRef,
    type: cc('handoff', 'Nursing handoff / SBAR'), date: '2026-11-02T07:00:00-08:00',
    context: { encounter: [ref('Encounter', rnId)] },
    author: [ref('Practitioner', 'review-night-rn', 'Casey Brooks, RN')], description: 'Night shift report',
    content: [{ attachment: { contentType: 'text/plain', data: Buffer.from('Situation: pneumonia, on room air. Background: antibiotics started overnight. Assessment: alert, ambulates with assistance, peripheral IV patent. Recommendation: morning medications, glucose before meals, reassess pain.').toString('base64') } }] }),
];
const edId = 'acute-ed-encounter';
const ed = [{ ...encounter(edId, 'EMER', 'ED · A04', 'Shortness of breath and fever', '2026-11-02T07:15:00-08:00'),
    length: { value: 165, unit: 'min', system: 'http://unitsofmeasure.org', code: 'min' } },
  ...vitals(edId), ...labs(edId),
  task('acute-ed-labs', edId, 'CBC and metabolic panel — collection pending', '2026-11-02T08:00:00-08:00', 'urgent'),
  stamped({ resourceType: 'ServiceRequest', id: 'acute-ed-imaging', status: 'active', intent: 'order', subject: patientRef,
    encounter: ref('Encounter', edId), category: [cc('imaging', 'Imaging')], code: cc('30746-2', 'Portable chest radiograph', 'http://loinc.org'),
    authoredOn: '2026-11-02T07:25:00-08:00' }),
  stamped({ resourceType: 'ImagingStudy', id: 'acute-ed-cxr-study', status: 'available', subject: patientRef,
    encounter: ref('Encounter', edId), started: '2026-11-02T07:28:00-08:00', description: 'Portable chest radiograph',
    modality: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'DX', display: 'Digital radiography' }],
    basedOn: [ref('ServiceRequest', 'acute-ed-imaging')], interpreter: [ref('Practitioner', 'review-radiologist', 'Avery Shah, MD')],
    numberOfSeries: 1, numberOfInstances: 1 }),
  stamped({ resourceType: 'Observation', id: 'acute-ed-cxr-findings', status: 'final', subject: patientRef,
    encounter: ref('Encounter', edId), category: [cc('imaging', 'Imaging')], code: cc('18782-3', 'Radiology study findings', 'http://loinc.org'),
    effectiveDateTime: '2026-11-02T07:28:00-08:00',
    valueString: 'Patchy airspace opacities in the lower lungs. No pleural effusion or pneumothorax.' }),
  stamped({ resourceType: 'DiagnosticReport', id: 'acute-ed-cxr-report', status: 'final', subject: patientRef,
    encounter: ref('Encounter', edId), category: [cc('RAD', 'Radiology', 'http://terminology.hl7.org/CodeSystem/v2-0074')],
    code: cc('30746-2', 'Portable chest radiograph', 'http://loinc.org'),
    effectiveDateTime: '2026-11-02T07:28:00-08:00', issued: '2026-11-02T07:40:00-08:00',
    basedOn: [ref('ServiceRequest', 'acute-ed-imaging')], imagingStudy: [ref('ImagingStudy', 'acute-ed-cxr-study')],
    result: [ref('Observation', 'acute-ed-cxr-findings')],
    resultsInterpreter: [ref('Practitioner', 'review-radiologist', 'Avery Shah, MD')],
    conclusion: 'Bilateral lower-lung airspace opacities.' }),
];
await mkdir(output, { recursive: true });
for (const [persona, extra, selected, medication] of [['P2', ed, edId], ['P3', rn, rnId, 'acute-rn-insulin']]) {
  const bundle = { ...original, entry: [...original.entry, ...extra.map(resource => ({ resource }))] };
  await writeFile(path.join(output, `${persona}.json`), JSON.stringify(bundle, null, 2) + '\n');
  await writeFile(path.join(output, `${persona}-context.json`), JSON.stringify({ today: '2026-11-02', now: 600, receipts: [],
    ...(medication ? { medToGive: 'insulin lispro' } : {}),
    encounterKind: persona === 'P2' ? 'emergency' : 'inpatient',
    record: [['selectedEncounterId', selected], ...(medication ? [['selectedMedicationRequestId', medication]] : [])] }, null, 2) + '\n');
  await writeFile(path.join(output, `${persona}-user.json`), JSON.stringify({ id: `${persona}-review`, role: persona === 'P2' ? 'physician' : 'rn' }) + '\n');
}
process.stdout.write(`Acute review bundles/context: ${output}\n`);
