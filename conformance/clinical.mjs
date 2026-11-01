/** Owner-side, hand-written clinical fixtures and workflow obligations.
 * Do not import this directory into any agent prompt, manual or backend. */
export const qty = (tenths, unit = 'none') => ({ qty: { tenths, unit } });
export const code = c => ({ code: { c } });
export const text = s => ({ text: { s } });
export const flag = b => ({ flag: { b } });
export const user = u => ({ user: { u } });
export const facts = overrides => ({ patientId: 'heldout-A', identity: { initials: 'HA', sex: 'F', ageYears: 42 },
  allergyVersion: 3, allergyClasses: [], medsVersion: 4, notesVersion: 2, historyVersion: 1,
  currentMedClasses: [], weightToday: [700, 'kg'], careGaps: [], abnormalResult: false,
  now: 20000, receipts: [], record: [['appointmentReason', 'Held-out visit'], ['preferredPharmacy', 'community']], ...overrides });

export const orderLine = ['drug', 'dose', 'doseUnit', 'route', 'freq', 'duration', 'quantity', 'refills',
  'indication', 'pharmacy', 'substitution', 'prn', 'orderDiagnosis'];
export const entries = {
  signOrders: ['patientIdReentry', 'weight', 'dosingWeight', ...orderLine],
  signNote: ['chiefComplaint', 'hpi', 'ros', 'exam', 'assessmentPlan', 'visitDiagnosis', 'claimDiagnosis',
    'levelOfService', 'followUp', 'patientInstructions', 'medRecDecision'],
  ackResult: ['resultAction', 'patientMessage'],
  approveRefill: ['refillDecision', 'refillQuantity', 'refillRefills', 'refillPharmacy', 'refillProtocolMet'],
  denyRefill: ['refillDecision', 'refillDenyReason'],
  administerMed: ['wristbandScan', 'medScan', 'adminStatus', 'adminReason', 'painScore', 'highAlertCosign'],
  chartAssessment: ['bpSystolic', 'bpDiastolic', 'heartRate', 'respRate', 'temperature', 'spo2', 'painReassessment', 'nursingAssessment'],
  recordImmunization: ['vaccine', 'vaccineLot', 'vaccineSite', 'vaccineRoute', 'visGiven', 'visEditionDate', 'vaccineManufacturer', 'vaccineProvider'],
  signOpNote: ['opPreopDiagnosis', 'opPostopDiagnosis', 'opProcedure', 'opAnesthesia', 'opFindings', 'opEbl', 'opSpecimens', 'opComplications', 'opCondition'],
  discharge: ['dischargeMedRec', 'dischargeDiagnosis', 'dischargeFollowUp', 'dischargeInstructions', 'dischargeCondition', 'dischargeDestination'],
  disposition: ['dispositionChoice', 'visitDiagnosis', 'dispositionCondition'],
};
export const roles = { signOrders: ['physician', 'np', 'surgeon'], signNote: ['physician', 'np', 'surgeon'],
  ackResult: ['physician', 'np', 'surgeon'], approveRefill: ['physician', 'np'], denyRefill: ['physician', 'np'],
  administerMed: ['rn'], chartAssessment: ['rn'], recordImmunization: ['physician', 'np', 'rn'],
  signOpNote: ['surgeon'], discharge: ['surgeon', 'physician', 'np'], disposition: ['physician', 'np'] };
// Role projections intentionally expose a subset of authorized workflows. These
// are fixed product contracts, not inferred from controls in the tested layout.
export const personaCommits = { P1: ['signOrders', 'signNote', 'ackResult', 'approveRefill', 'denyRefill'],
  P2: ['signOrders', 'signNote', 'disposition'], P3: ['administerMed', 'chartAssessment'],
  P4: ['signOrders', 'signNote', 'recordImmunization', 'ackResult', 'approveRefill', 'denyRefill'],
  P5: ['signOrders', 'signNote', 'ackResult', 'signOpNote', 'discharge'] };
export const reviews = {
  signOrders: ['allergyList', 'currentMeds', 'doseCheck', 'curesReport', 'orderSummary', 'anticoagulantList'],
  ackResult: ['resultDetail', 'resultTrend'], approveRefill: ['relevantLabs', 'lastVisit', 'adherence'],
  administerMed: ['allergyList', 'marDoseDetails', 'glucoseTrend', 'coagLabs'],
  recordImmunization: ['allergyList', 'immunizationHistory'], signOpNote: ['intraopRecord'],
  discharge: ['currentMeds', 'allergyList'], disposition: ['vitals'],
};
export const linked = { dosingWeight: 'weight', orderDiagnosis: 'visitDiagnosis', claimDiagnosis: 'visitDiagnosis' };

export function context(commit, variant = {}) {
  const f = facts(commit === 'administerMed' ? { medToGive: 'morphine' } : commit === 'ackResult' ? { abnormalResult: true } : {});
  return { ...variant, commit, facts: variant.facts ?? f, drug: variant.drug ?? 'metformin' };
}
export function sample(element, ctx, driver) {
  const values = {
    patientIdReentry: text(`${ctx.facts.identity.initials}/${ctx.facts.identity.sex}/${ctx.facts.identity.ageYears}`),
    wristbandScan: code(ctx.facts.patientId), medScan: code(ctx.facts.medToGive), highAlertCosign: user('heldout-second-nurse'),
    consentVerified: flag(true), weight: qty(700, 'kg'), dosingWeight: qty(700, 'kg'),
    visitDiagnosis: code('J18.9'), orderDiagnosis: code('J18.9'), claimDiagnosis: code('J18.9'),
    drug: code(ctx.drug), dose: qty(ctx.dose ?? (ctx.drug === 'oxycodone' ? 50 : ctx.drug === 'amoxicillin' ? 10000 : 5000), ctx.unit ?? 'mg'),
    doseUnit: code(ctx.unit ?? 'mg'), route: code('oral'), freq: code(ctx.freq ?? 'bid'), duration: code(ctx.duration ?? '7-days'),
    quantity: qty(140), refills: qty(0), substitution: code('false'), prn: code('false'), pharmacy: code('community'),
    naloxoneOffer: code('offered-declined'), naloxoneEducation: flag(true), abxIndication: code('respiratory-infection'),
    resultAction: code('reviewed'), patientMessage: text('Discussed abnormal result; follow up arranged'),
    medRecDecision: code('continue'), levelOfService: code('99213'), followUp: code('2-weeks'),
    refillDecision: code(ctx.commit === 'denyRefill' ? 'deny' : 'approve'), refillDenyReason: code('needs-visit'),
    refillQuantity: qty(300), refillRefills: qty(0), refillPharmacy: code('community'), refillProtocolMet: flag(true),
    bpSystolic: qty(1200), bpDiastolic: qty(800), heartRate: qty(720), respRate: qty(160), temperature: qty(370), spo2: qty(980),
    painScore: code('4'), painReassessment: code('2'), adminStatus: code('given'), adminReason: code('scheduled'),
    vaccine: code('140'), vaccineLot: text('HELDOUT-LOT'), vaccineSite: code('left-deltoid'), vaccineRoute: code('IM'),
    visGiven: flag(true), visEditionDate: text('2025-01-31'), vaccineManufacturer: text('Synthetic manufacturer'), vaccineProvider: text('Heldout clinician'),
    opPreopDiagnosis: code('K35.80'), opPostopDiagnosis: code('K35.80'), opProcedure: code('44970'), opAnesthesia: code('general'),
    opEbl: qty(100, 'mL'), opComplications: code('none'), opCondition: code('stable'),
    dischargeMedRec: code('reconciled'), dischargeDiagnosis: code('J18.9'), dischargeFollowUp: code('2-weeks'),
    dischargeCondition: code('stable'), dischargeDestination: code('home'), dispositionChoice: code('discharge'), dispositionCondition: code('stable'),
    orderKind: code(ctx.service ?? 'imaging'), orderCode: code('CT-CHEST'), priorAuthRequest: flag(true),
  };
  if (values[element]) return values[element];
  const kind = driver.input.spec.elements.find(e => e.id === element)?.kind;
  if (kind === 'flag') return flag(true);
  if (kind?.quantity) return qty(10, kind.quantity.unit);
  if (kind?.coded) return code('documented');
  return text('Held-out documented clinical findings');
}

export function fieldsFor(ctx, spec) {
  let fields = [...entries[ctx.commit]];
  if (ctx.commit === 'signOrders') {
    // Diagnosis is the enter-once source, not an extra signing obligation.
    fields = ['visitDiagnosis', ...fields];
    if (ctx.facts.encounterKind === 'preop') fields.push('consentVerified', 'hpUpdate', 'medsToHold');
    if (ctx.risk) fields.push('naloxoneOffer', 'naloxoneEducation');
    if (ctx.drug === 'amoxicillin' && spec.elements.some(e => e.id === 'abxIndication')) fields.push('abxIndication');
  }
  return fields;
}

export function prepare(driver, ctx, omit = []) {
  const workflow = driver.program.screens.find(s => s.components.some(c => c.kind?.button?.action?.commit?.commit === ctx.commit))?.workflow;
  for (const element of fieldsFor(ctx, driver.input.spec)) {
    if (omit.includes(element)) continue;
    if (linked[element]) {
      driver.find(c => c.kind?.field?.element === element, `linked element ${element}`, { workflow });
      const x = driver.capture(element);
      if (x?.confirmed) continue;
    }
    driver.enter(element, sample(element, ctx, driver), { workflow });
  }
  return driver;
}
