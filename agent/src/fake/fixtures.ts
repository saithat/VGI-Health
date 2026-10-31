/**
 * FAKE fixtures for EHR_FAKE=1 (tests and offline smoke runs only).
 *
 * A small stand-in for the real spec modules (lean/Ehr/Specs/*.lean) and the
 * canonical program (lane B). It has the shape of the real formats and the
 * same kinds of friction (buried info, repeated prompts, removable popups),
 * but it is NOT the hospital spec and nothing here is certified.
 */
import type { Component, Program, Screen, Spec } from '../schema.js';

const PRESCRIBERS = ['physician', 'np', 'surgeon'] as const;

function baseSpec(): Spec {
  return {
    version: 'v1',
    elements: [
      { id: 'patientIdReentry', label: 'Patient ID re-entry', kind: 'identity', enteredBy: ['physician', 'np', 'surgeon', 'rn'], prefill: 'never', friction: 'safety', humanOnly: true, fhirTarget: 'Provenance' },
      { id: 'weight', label: 'Weight (kg)', kind: { quantity: { unit: 'kg' } }, enteredBy: ['physician', 'np', 'surgeon', 'rn'], prefill: 'recordConfirm', friction: 'compliance', humanOnly: false, fhirTarget: 'Observation.valueQuantity' },
      { id: 'drug', label: 'Drug', kind: { coded: { valueSet: 'rxnorm' } }, enteredBy: [...PRESCRIBERS], prefill: 'defaultConfirm', friction: 'compliance', humanOnly: false, fhirTarget: 'MedicationRequest.medication' },
      { id: 'dose', label: 'Dose', kind: { quantity: { unit: 'mg' } }, enteredBy: [...PRESCRIBERS], prefill: 'defaultConfirm', friction: 'compliance', humanOnly: false, fhirTarget: 'MedicationRequest.dosageInstruction' },
      { id: 'frequency', label: 'Frequency', kind: { coded: { valueSet: 'freq' } }, enteredBy: [...PRESCRIBERS], prefill: 'defaultConfirm', friction: 'compliance', humanOnly: false, fhirTarget: 'MedicationRequest.dosageInstruction.timing' },
      { id: 'diagnosis', label: 'Diagnosis', kind: { coded: { valueSet: 'icd10' } }, enteredBy: [...PRESCRIBERS], prefill: 'autoLinked', friction: 'compliance', humanOnly: false, linkedFrom: 'visitDiagnosis', fhirTarget: 'MedicationRequest.reasonReference' },
      { id: 'note', label: 'Note text', kind: 'text', enteredBy: [...PRESCRIBERS], prefill: 'defaultConfirm', friction: 'accidental', humanOnly: false, fhirTarget: 'DocumentReference' },
      { id: 'wristbandScan', label: 'Wristband scan', kind: { scan: { target: 'wristband' } }, enteredBy: ['rn'], prefill: 'never', friction: 'safety', humanOnly: true, fhirTarget: 'MedicationAdministration' },
      { id: 'medScan', label: 'Medication scan', kind: { scan: { target: 'medication' } }, enteredBy: ['rn'], prefill: 'never', friction: 'safety', humanOnly: true, fhirTarget: 'MedicationAdministration' },
      { id: 'cosign', label: 'Second nurse', kind: 'cosign', enteredBy: ['rn'], prefill: 'never', friction: 'safety', humanOnly: true, fhirTarget: 'MedicationAdministration.performer' },
      { id: 'painScore', label: 'Pain score', kind: { coded: { valueSet: 'pain0-10' } }, enteredBy: ['rn'], prefill: 'never', friction: 'compliance', humanOnly: false, fhirTarget: 'Observation' },
      { id: 'consentVerified', label: 'Consent verified', kind: 'flag', enteredBy: ['surgeon'], prefill: 'never', friction: 'safety', humanOnly: true, fhirTarget: 'Consent' },
      { id: 'refillDecision', label: 'Refill decision', kind: { coded: { valueSet: 'refill' } }, enteredBy: ['physician', 'np'], prefill: 'never', friction: 'compliance', humanOnly: false, fhirTarget: 'Task.output' },
      { id: 'vaccineLot', label: 'Vaccine lot', kind: 'text', enteredBy: ['np'], prefill: 'never', friction: 'compliance', humanOnly: false, fhirTarget: 'Immunization.lotNumber' },
    ],
    infos: [
      { id: 'patientBanner', label: 'Patient banner', version: '' },
      { id: 'allergyList', label: 'Allergies', version: 'allergyVersion' },
      { id: 'currentMeds', label: 'Current medications', version: 'medsVersion' },
      { id: 'doseCheck', label: 'Weight-based dose check', version: '' },
      { id: 'resultTrend', label: 'Result trend', version: '' },
      { id: 'relevantLabs', label: 'Relevant labs', version: '' },
      { id: 'anticoagulants', label: 'Anticoagulants to hold', version: 'medsVersion' },
      { id: 'doseDetails', label: 'Dose details', version: '' },
      { id: 'orderSummary', label: 'Order summary', version: '' },
    ],
    commits: [
      { id: 'signOrders', label: 'Sign orders', roles: [...PRESCRIBERS] },
      { id: 'signNote', label: 'Sign note', roles: [...PRESCRIBERS] },
      { id: 'ackResult', label: 'Acknowledge result', roles: ['physician', 'np'] },
      { id: 'approveRefill', label: 'Approve refill', roles: ['physician', 'np'] },
      { id: 'administerMed', label: 'Administer medication', roles: ['rn'] },
      { id: 'recordImmunization', label: 'Record immunization', roles: ['np'] },
      { id: 'discharge', label: 'Discharge', roles: ['physician', 'surgeon'] },
    ],
    entries: [
      { commit: 'signOrders', element: 'patientIdReentry', when: 'always', perOrderLine: false },
      { commit: 'signOrders', element: 'drug', when: 'always', perOrderLine: true },
      { commit: 'signOrders', element: 'dose', when: 'always', perOrderLine: true },
      { commit: 'administerMed', element: 'wristbandScan', when: 'always', perOrderLine: false },
      { commit: 'administerMed', element: 'medScan', when: 'always', perOrderLine: false },
      { commit: 'administerMed', element: 'cosign', when: 'highAlertMed', perOrderLine: false },
      { commit: 'approveRefill', element: 'refillDecision', when: 'always', perOrderLine: false },
      { commit: 'recordImmunization', element: 'vaccineLot', when: 'always', perOrderLine: false },
    ],
    reviews: [
      { commit: 'signOrders', info: 'allergyList', mode: { shownOrReceipt: { windowMin: 60, roles: [...PRESCRIBERS] } }, when: 'always' },
      { commit: 'signOrders', info: 'currentMeds', mode: { shownOrReceipt: { windowMin: 60, roles: [...PRESCRIBERS] } }, when: 'always' },
      { commit: 'administerMed', info: 'allergyList', mode: { shownOrReceipt: { windowMin: 720, roles: ['rn'] } }, when: 'always' },
      { commit: 'administerMed', info: 'doseDetails', mode: 'shownOnCommit', when: 'always' },
      { commit: 'ackResult', info: 'resultTrend', mode: 'shownOnCommit', when: 'abnormalResult' },
      { commit: 'approveRefill', info: 'currentMeds', mode: { shownOrReceipt: { windowMin: 60, roles: ['physician', 'np'] } }, when: 'always' },
    ],
    alerts: [
      { id: 'drugAllergy', label: 'Drug-allergy interaction', cond: 'drugAllergy', tier: 'interruptive', commit: 'signOrders', screens: [] },
      { id: 'interaction', label: 'Drug-drug interaction', cond: 'interaction', tier: 'interruptive', commit: 'signOrders', screens: [] },
      { id: 'careGap', label: 'Care gap', cond: 'careGap', tier: 'passive', commit: 'signNote', screens: ['W1'] },
      { id: 'duplicateTherapy', label: 'Possible duplicate therapy', cond: 'duplicateTherapy', tier: 'removable', commit: 'signOrders', screens: [] },
      { id: 'weightInLb', label: 'Weight entered in lb', cond: 'weightInLb', tier: 'interruptive', commit: 'signOrders', screens: [] },
    ],
    design: {
      maxDepth: 4,
      minTextSize: 1,
      stabilityBudget: 6,
      landmarks: ['patientBanner'],
      catalog: ['banner', 'field', 'panel', 'table', 'trend', 'alert', 'button', 'group', 'tabs', 'macro', 'search'],
    },
  };
}

export function fakeSpec(version: string): Spec {
  const spec = baseSpec();
  if (version === 'v1') return spec;
  // v1.1: optional prior-auth feature, new component kind, no new requirements.
  spec.version = 'v1.1';
  spec.infos.push({ id: 'priorAuth', label: 'Prior-authorization status', version: '' });
  spec.design.catalog.push('priorAuthStatus');
  if (version === 'v1.1') return spec;
  if (version !== 'v2') throw new Error(`fake spec: unknown version ${version}`);
  // v2: antibiotic indication required and shown to nurses.
  spec.version = 'v2';
  spec.elements.push({ id: 'abxIndication', label: 'Antibiotic indication', kind: { coded: { valueSet: 'abx-indications' } }, enteredBy: [...PRESCRIBERS], prefill: 'defaultConfirm', friction: 'compliance', humanOnly: false, fhirTarget: 'MedicationRequest.reasonCode' });
  spec.infos.push({ id: 'abxIndication', label: 'Antibiotic indication', version: '' });
  spec.entries.push({ commit: 'signOrders', element: 'abxIndication', when: { orderClass: { cls: 'antibiotic' } }, perOrderLine: true });
  spec.reviews.push({ commit: 'administerMed', info: 'abxIndication', mode: 'shownOnCommit', when: { medClass: { cls: 'antibiotic' } } });
  return spec;
}

// ---------------------------------------------------------------- canonical program
type K = Component['kind'];
const c = (id: string, kind: K, extra: Partial<Component> = {}): Component => ({
  id, kind, label: extra.label ?? id, tab: 0, visibility: 'always', size: 'normal', tag: extra.tag ?? id, ...extra,
});
const banner = (s: string) => c(`${s}-banner`, 'banner', { tag: 'patientBanner', label: 'Patient banner' });
const field = (id: string, element: string, extra: Partial<Component> = {}) => c(id, { field: { element, slot: 'current', prefill: 'none' } }, { tag: element, ...extra });
const panel = (id: string, info: string, extra: Partial<Component> = {}) => c(id, { panel: { info } }, { tag: info, ...extra });
const goto = (id: string, screen: string, label: string) => c(id, { button: { action: { goto: { screen } } } }, { label, tag: `goto-${screen}` });
const commit = (id: string, commitId: string, label: string) => c(id, { button: { action: { commit: { commit: commitId } } } }, { label, tag: `commit-${commitId}` });
const alert = (id: string, alertId: string, popup: boolean) => c(id, { alert: { alert: alertId, popup } }, { tag: `alert-${alertId}` });
const screen = (id: string, title: string, workflow: string, components: Component[]): Screen => ({ id, title, workflow, components: [banner(id), ...components] });

function canonicalV1(): Program {
  const screens: Screen[] = [
    screen('home', 'Worklist', 'W0', [
      goto('home-go-w1', 'w1-rooming', 'Clinic visit'),
      goto('home-go-w2', 'w2-inbox', 'In-basket result'),
      goto('home-go-w7', 'w7-refill', 'Refill request'),
      goto('home-go-w3', 'w3-triage', 'ED patient'),
      goto('home-go-w4', 'w4-worklist', 'Med pass'),
      goto('home-go-w5', 'w5-growth', 'Pediatric visit'),
      goto('home-go-w6', 'w6-preop', 'Surgical day'),
    ]),
    // W1 adult visit
    screen('w1-rooming', 'Rooming', 'W1', [
      field('w1-weight', 'weight', { kind: { field: { element: 'weight', slot: 'current', prefill: { fromRecord: { fact: 'weightToday' } } } } }),
      panel('w1-allergies', 'allergyList'),
      c('w1-allergies-reviewed', { button: { action: { markReviewed: { info: 'allergyList' } } } }, { label: 'Mark allergies reviewed', tag: 'review-allergyList' }),
      panel('w1-meds', 'currentMeds'),
      c('w1-meds-reviewed', { button: { action: { markReviewed: { info: 'currentMeds' } } } }, { label: 'Mark meds reviewed', tag: 'review-currentMeds' }),
      goto('w1-go-notes', 'w1-notes', 'Documentation'),
    ]),
    screen('w1-notes', 'Documentation', 'W1', [
      field('w1-note', 'note'),
      alert('w1-caregap', 'careGap', false),
      commit('w1-sign-note', 'signNote', 'Sign note'),
      goto('w1-go-orders', 'w1-orders', 'Orders'),
    ]),
    screen('w1-orders', 'Order composer', 'W1', [
      c('w1-orders-tabs', 'tabs', { label: 'Order | History', tag: 'orderTabs' }),
      field('w1-drug', 'drug', { parent: 'w1-orders-tabs' }),
      field('w1-dose', 'dose', { parent: 'w1-orders-tabs' }),
      field('w1-freq', 'frequency', { parent: 'w1-orders-tabs' }),
      panel('w1-order-history', 'orderSummary', { parent: 'w1-orders-tabs', tab: 1 }),
      alert('w1-dup', 'duplicateTherapy', true),
      alert('w1-drug-allergy', 'drugAllergy', true),
      goto('w1-go-sign', 'w1-sign', 'Review and sign'),
    ]),
    screen('w1-sign', 'Sign orders', 'W1', [
      panel('w1-sign-summary', 'orderSummary'),
      panel('w1-sign-allergies', 'allergyList'),
      panel('w1-sign-meds', 'currentMeds'),
      field('w1-diagnosis', 'diagnosis', { kind: { field: { element: 'diagnosis', slot: 'current', prefill: { linked: { element: 'visitDiagnosis' } } } } }),
      field('w1-idreentry', 'patientIdReentry'),
      commit('w1-sign-orders', 'signOrders', 'Sign orders'),
    ]),
    // W2 results in-basket
    screen('w2-inbox', 'Result', 'W2', [
      panel('w2-result', 'orderSummary', { tag: 'resultDetail' }),
      c('w2-trend', { trend: { info: 'resultTrend' } }, { tag: 'resultTrend' }),
      commit('w2-ack', 'ackResult', 'Acknowledge'),
    ]),
    // W7 refills
    screen('w7-refill', 'Refill request', 'W7', [
      c('w7-tabs', 'tabs', { label: 'Request | Labs | Visits', tag: 'refillTabs' }),
      panel('w7-request', 'currentMeds', { parent: 'w7-tabs', tag: 'refillRequest' }),
      panel('w7-labs', 'relevantLabs', { parent: 'w7-tabs', tab: 1 }),
      c('w7-visits-group', { group: { collapsible: true, startCollapsed: true } }, { label: 'Last visit', tag: 'lastVisitGroup' }),
      panel('w7-last-visit', 'orderSummary', { parent: 'w7-visits-group', tag: 'lastVisit' }),
      field('w7-decision', 'refillDecision'),
      commit('w7-approve', 'approveRefill', 'Approve refill'),
    ]),
    // W3 ED
    screen('w3-triage', 'ED triage', 'W3', [
      field('w3-weight', 'weight'),
      panel('w3-allergies', 'allergyList'),
      alert('w3-lb', 'weightInLb', true),
      goto('w3-go-orders', 'w3-orders', 'ED orders'),
    ]),
    screen('w3-orders', 'ED orders', 'W3', [
      field('w3-drug', 'drug'),
      field('w3-dose', 'dose'),
      panel('w3-dosecheck', 'doseCheck'),
      panel('w3-allergies-sign', 'allergyList'),
      panel('w3-meds', 'currentMeds'),
      alert('w3-interaction', 'interaction', true),
      alert('w3-dup', 'duplicateTherapy', true),
      field('w3-idreentry', 'patientIdReentry'),
      commit('w3-sign', 'signOrders', 'Sign orders'),
      commit('w3-dispo', 'discharge', 'Disposition'),
    ]),
    // W4 inpatient med administration
    screen('w4-worklist', 'Shift worklist', 'W4', [
      c('w4-due', { table: { info: 'doseDetails' } }, { tag: 'dueMeds' }),
      goto('w4-go-mar', 'w4-mar', 'MAR'),
    ]),
    screen('w4-mar', 'MAR administration', 'W4', [
      field('w4-wristband', 'wristbandScan'),
      field('w4-medscan', 'medScan'),
      panel('w4-allergies', 'allergyList'),
      panel('w4-dose', 'doseDetails'),
      c('w4-hi-group', { group: { collapsible: true, startCollapsed: false } }, { label: 'High-alert double check', tag: 'doubleCheckGroup' }),
      field('w4-cosign', 'cosign', { parent: 'w4-hi-group' }),
      field('w4-pain', 'painScore'),
      commit('w4-administer', 'administerMed', 'Administer'),
    ]),
    // W5 pediatrics
    screen('w5-growth', 'Growth chart', 'W5', [
      c('w5-growth-trend', { trend: { info: 'doseCheck' } }, { tag: 'growthChart' }),
      field('w5-weight', 'weight', { kind: { field: { element: 'weight', slot: 'current', prefill: { fromRecord: { fact: 'weightToday' } } } } }),
      goto('w5-go-dosing', 'w5-dosing', 'Dosing'),
      goto('w5-go-imm', 'w5-imm', 'Immunizations'),
    ]),
    screen('w5-dosing', 'Weight-based dosing', 'W5', [
      field('w5-drug', 'drug'),
      field('w5-dose', 'dose'),
      panel('w5-dosecheck', 'doseCheck'),
      panel('w5-allergies', 'allergyList'),
      panel('w5-meds', 'currentMeds'),
      field('w5-idreentry', 'patientIdReentry'),
      commit('w5-sign', 'signOrders', 'Sign orders'),
    ]),
    screen('w5-imm', 'Immunizations', 'W5', [
      field('w5-lot', 'vaccineLot'),
      commit('w5-record', 'recordImmunization', 'Record immunization'),
    ]),
    // W6 surgery
    screen('w6-preop', 'Pre-op', 'W6', [
      field('w6-consent', 'consentVerified'),
      panel('w6-anticoag', 'anticoagulants'),
      panel('w6-allergies', 'allergyList'),
      panel('w6-meds', 'currentMeds'),
      field('w6-drug', 'drug'),
      field('w6-dose', 'dose'),
      field('w6-idreentry', 'patientIdReentry'),
      commit('w6-sign', 'signOrders', 'Sign pre-op orders'),
      goto('w6-go-discharge', 'w6-discharge', 'Discharge'),
    ]),
    screen('w6-discharge', 'Discharge', 'W6', [
      panel('w6-dc-meds', 'currentMeds'),
      field('w6-dc-note', 'note'),
      commit('w6-dc', 'discharge', 'Discharge'),
    ]),
  ];
  return { id: 'canonical', version: 0, owner: 'canonical', role: 'physician', specVersion: 'v1', start: 'home', screens, macros: [] };
}

function addTo(program: Program, screenId: string, comps: Component[], before?: string): void {
  const s = program.screens.find((x) => x.id === screenId);
  if (!s) throw new Error(`fake canonical: no screen ${screenId}`);
  const idx = before ? s.components.findIndex((x) => x.id === before) : -1;
  if (idx < 0) s.components.push(...comps);
  else s.components.splice(idx, 0, ...comps);
}

export function fakeCanonical(version: string): Program {
  const p = canonicalV1();
  if (version === 'v1') return p;
  p.specVersion = 'v1.1';
  p.version = 1;
  addTo(p, 'w1-orders', [c('w1-priorauth', { priorAuthStatus: { scope: 'imaging,specialtyMed' } }, { label: 'Prior authorization', tag: 'priorAuthPanel' })], 'w1-go-sign');
  if (version === 'v1.1') return p;
  p.specVersion = 'v2';
  p.version = 2;
  const ind = (id: string) => field(id, 'abxIndication', { kind: { field: { element: 'abxIndication', slot: 'current', prefill: 'none' } } });
  addTo(p, 'w1-orders', [ind('w1-indication')], 'w1-dup');
  addTo(p, 'w3-orders', [ind('w3-indication')], 'w3-dosecheck');
  addTo(p, 'w5-dosing', [ind('w5-indication')], 'w5-dosecheck');
  addTo(p, 'w6-preop', [ind('w6-indication')], 'w6-idreentry');
  addTo(p, 'w4-mar', [panel('w4-indication', 'abxIndication')], 'w4-hi-group');
  return p;
}

export const FAKE_RELEASE_NOTES: Record<string, string> = {
  'v1.1': [
    '# Release v1.1: Prior-authorization status (FAKE fixture)',
    'R1.1-1: New component kind `priorAuthStatus` shows payer prior-auth status for imaging and specialty meds.',
    'R1.1-2: A "request prior auth" action writes only a ServiceRequest/Task.',
    'R1.1-3: Optional in the spec; no new entry or review requirements.',
  ].join('\n'),
  v2: [
    '# Release v2: Antibiotic indication required (FAKE fixture)',
    'R2-1: Order composer: a required Indication picker for antibiotic orders (hard stop "Indication required").',
    'R2-2: Sign-orders screen: an Indication column in the order summary.',
    'R2-3: MAR administration panel: an Indication row next to the dose for antibiotics (shown on commit; no receipt).',
    'R2-4: Order sets containing antibiotics inherit R2-1.',
  ].join('\n'),
};
