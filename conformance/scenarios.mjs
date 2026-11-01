import { Driver, Failure, assert, field, commit, info, alert } from './driver.mjs';
import { entries, roles, personaCommits, reviews, linked, facts, context, sample, prepare, fieldsFor, qty, code, text, flag, user } from './clinical.mjs';

const hasElement = (target, id) => target.spec.elements.some(e => e.id === id);
const supports = (target, id) => (personaCommits[target.persona] ?? Object.keys(entries).filter(c => roles[c].includes(target.program.role))).includes(id);
const refusal = (d, id, expected) => {
  const result = d.clickCommit(id);
  assert(!d.state.commits.includes(id), `${id} committed without ${expected}`);
  assert(result?.blocked?.reason?.includes(expected), `Expected refusal naming ${expected}; observed ${JSON.stringify(result)}`);
  return JSON.stringify(result);
};
export const scenarioCatalog = [];
function add(id, rule, expected, applies, run, extra = {}) {
  scenarioCatalog.push({ id, rule, expected, applies, run, ...extra });
}

/** Shared reachable prefixes keep this suite fast. Expected obligations below
 * are hand-written; neither the checker verdict nor spec.entries generates them. */
export function fixtures(native, target) {
  const cache = new Map();
  return {
    native, target,
    driver: ctx => new Driver(native, target.spec, target.program, ctx.facts),
    prefix(ctx, element) {
      const key = JSON.stringify(ctx);
      if (!cache.has(key)) {
        const d = this.driver(ctx), before = new Map();
        const workflow = target.program.screens.find(s => s.components.some(commit(ctx.commit)))?.workflow;
        let error = null;
        for (const e of fieldsFor(ctx, target.spec)) {
          before.set(e, d.fork());
          try {
            if (linked[e]) {
              d.find(field(e), `linked element ${e}`, { workflow });
              if (d.capture(e)?.confirmed) continue;
            }
            d.enter(e, sample(e, ctx, d), { workflow });
          } catch (e) { error = e; break; }
        }
        cache.set(key, { d, before, error });
      }
      const prepared = cache.get(key);
      const result = element ? prepared.before.get(element) : prepared.d;
      if (!result || (!element && prepared.error)) throw prepared.error ?? new Failure(`No fixture prefix for ${element}`);
      return result.fork();
    },
  };
}

for (const [id, fields] of Object.entries(entries)) {
  for (const element of fields) {
    add(`entry.${id}.${element}`, `Core ${id}: ${element}`, linked[element]
      ? `Enter ${linked[element]} once; ${element} carries the confirmed linked value`
      : `Attempt ${id} before entering/confirming ${element}; hard stop names ${element}`,
    t => supports(t, id) && hasElement(t, element), f => {
      const ctx = context(id);
      if (linked[element]) {
        const d = f.prefix(ctx);
        d.assertCaptured(element, sample(element, ctx, d));
        assert(d.capture(element).provenance === `linked:${linked[element]}`, `Missing enter-once provenance for ${element}`);
        d.finish(id);
        return { d, observed: `${element} linked from ${linked[element]}; legitimate ${id} completed` };
      }
      const d = f.prefix(ctx, element);
      return { d, observed: refusal(d, id, element) };
    }, { intent: { commit: id, element, action: linked[element] ? 'enter source and inspect link' : 'omit entry and attempt commit' } });
  }
  add(`positive.${id}`, `Core legitimate ${id}`, `${id} completes through reachable controls`, t => supports(t, id), f => {
    const d = f.prefix(context(id)); d.finish(id);
    return { d, observed: `${id} committed` };
  });
}

for (const element of ['consentVerified', 'hpUpdate', 'medsToHold']) {
  add(`preop.${element}`, `Hospital pre-op ${element}`, `Pre-op signing refuses missing ${element}`,
    t => supports(t, 'signOrders') && t.program.role !== 'np', f => {
      const d = f.prefix(context('signOrders', { facts: { ...facts(), encounterKind: 'preop' } }), element);
      return { d, observed: refusal(d, 'signOrders', element) };
    });
}
add('preop.np-forbidden', 'Hospital pre-op signing privilege', 'NP cannot sign pre-op orders',
  t => t.program.role === 'np' && supports(t, 'signOrders'), f => {
    const ctx = context('signOrders', { facts: { ...facts(), encounterKind: 'preop' } });
    const d = f.driver(ctx);
    const result = d.clickCommit('signOrders');
    assert(!d.state.commits.includes('signOrders') && result?.blocked?.reason?.includes('Pre-op'), `NP pre-op role restriction absent: ${JSON.stringify(result)}`);
    return { d, observed: JSON.stringify(result) };
  });
add('positive.preop', 'Hospital pre-op legitimate path', 'Physician/surgeon completes consent, H&P and anticoagulant review',
  t => supports(t, 'signOrders') && t.program.role !== 'np', f => {
    const d = f.prefix(context('signOrders', { facts: { ...facts(), encounterKind: 'preop' } }));
    d.atCommit('signOrders');
    assert(d.view.items.some(i => i.shown && info('anticoagulantList')(i.comp)), 'Pre-op anticoagulants not shown');
    d.finish('signOrders'); return { d, observed: 'Pre-op orders signed by permitted role' };
  });

for (const [id, panels] of Object.entries(reviews)) for (const panel of panels) {
  add(`review.${id}.${panel}`, `Core ${id} review: ${panel}`, `Attempt signing without a prior review receipt; ${panel} must already be shown`,
    t => supports(t, id) && (panel !== 'anticoagulantList' || t.program.role !== 'np'), f => {
      let ctx = context(id);
      if (id === 'signOrders') ctx = context(id, { drug: 'oxycodone', freq: 'q6h', facts: { ...facts(), encounterKind: 'preop' } });
      if (panel === 'glucoseTrend') ctx = context(id, { facts: { ...facts(), medToGive: 'insulin lispro' } });
      if (panel === 'coagLabs') ctx = context(id, { facts: { ...facts(), medToGive: 'heparin' } });
      // Analgesic assessment is conditional; omit it for non-analgesic drugs.
      const d = f.driver(ctx);
      const omit = id === 'administerMed' && ctx.facts.medToGive !== 'morphine' ? ['painScore'] : [];
      prepare(d, ctx, omit);
      d.atCommit(id);
      assert(d.view.items.some(i => i.shown && info(panel)(i.comp)), `${panel} not shown before ${id}`);
      d.finish(id); return { d, observed: `${panel} shown before successful ${id}` };
    });
}

add('identity.mismatch', 'Hospital patient ID re-entry', 'Wrong identity refused; matching identity succeeds', t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders'), d = f.driver(ctx);
  const r = d.enter('patientIdReentry', text('WRONG/M/99'), { refusal: true });
  assert(r?.blocked && !d.capture('patientIdReentry'), `Wrong identity accepted: ${JSON.stringify(r)}`);
  prepare(d, ctx); d.finish('signOrders'); return { d, observed: 'Wrong identity refused; matching identity signed' };
});
for (const [element, wrong] of [['wristbandScan', 'heldout-B'], ['medScan', 'amoxicillin']]) {
  add(`scan.${element}.mismatch`, 'Entrenched bedside barcode matching', 'Wrong barcode refused; both correct scans complete administration', t => supports(t, 'administerMed'), f => {
    const ctx = context('administerMed'), d = f.driver(ctx);
    const r = d.enter(element, code(wrong), { refusal: true });
    assert(r?.blocked && !d.capture(element), `Wrong ${element} accepted`);
    prepare(d, ctx); d.finish('administerMed'); return { d, observed: 'Wrong scan refused; correct wristband and medication scans completed' };
  });
}
add('cosign.same-user', 'Hospital high-alert double check', 'Same nurse refused; different nurse succeeds', t => supports(t, 'administerMed'), f => {
  const ctx = context('administerMed'), d = f.driver(ctx);
  const r = d.enter('highAlertCosign', user(d.input.user.id), { refusal: true });
  assert(r?.blocked && !d.capture('highAlertCosign'), 'Same-user double check accepted');
  prepare(d, ctx); d.finish('administerMed'); return { d, observed: 'Same-user cosign refused; second user completed' };
});

add('weight.lb', 'Hospital kg-only weight', 'Pounds never satisfy signing; re-entry in kg completes', t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders'), d = f.prefix(ctx);
  d.enter('weight', qty(1540, 'lb'));
  refusal(d, 'signOrders', 'weight');
  d.enter('weight', qty(700, 'kg')); d.finish('signOrders');
  return { d, observed: 'lb stored as invalid and refused at signing; corrected kg signed' };
});

export const patientBundle = (id = 'heldout-A', weightDate = '2026-11-02', unit = 'kg') => ({ resourceType: 'Bundle', type: 'collection', entry: [
  { resource: { resourceType: 'Patient', id, name: [{ given: ['Heldout'], family: id }], gender: 'female', birthDate: '1984-01-02', identifier: [{ type: { coding: [{ code: 'MR' }] }, value: id }] } },
  { resource: { resourceType: 'Observation', id: `${id}-weight`, status: 'final', subject: { reference: `Patient/${id}` },
    code: { coding: [{ system: 'http://loinc.org', code: '29463-7' }] }, effectiveDateTime: `${weightDate}T09:00:00Z`, valueQuantity: { value: 70, unit, code: unit } } },
] });
add('weight.stale-record', 'Hospital current kg weight / FHIR abstraction', 'Yesterday’s weight cannot prefill today; fresh kg observation can', t => supports(t, 'signOrders'), f => {
  const old = f.native.call('facts', { bundle: patientBundle('heldout-A', '2026-11-01'), context: { today: '2026-11-02', now: 600 } });
  assert(old.facts.weightToday === undefined, 'Stale FHIR weight classified as today');
  const ctx = context('signOrders', { facts: old.facts }), d = f.driver(ctx);
  d.find(field('weight'), 'weight');
  assert(!d.capture('weight'), 'Yesterday’s weight prefilled as current');
  const fresh = f.native.call('facts', { bundle: patientBundle(), context: { today: '2026-11-02', now: 600 } });
  assert(JSON.stringify(fresh.facts.weightToday) === JSON.stringify([700, 'kg']), 'Fresh kg weight unavailable');
  prepare(d, ctx); d.finish('signOrders'); return { d, observed: 'Stale weight not prefilled; current human kg entry completes' };
});

for (const unit of ['units', 'mcg', 'mL']) add(`dose.wrong-${unit}`, 'Unit-aware medication dosing', `Metformin dose in ${unit} refused; mg completes`, t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders'), d = f.prefix(ctx, 'dose');
  const r = d.enter('dose', qty(100, unit), { refusal: true });
  assert(r?.blocked && !d.capture('dose')?.confirmed, `Wrong dose unit ${unit} accepted`);
  const good = f.prefix(ctx); good.finish('signOrders'); return { d, observed: `${unit} refused; separate legitimate mg path completed` };
});

const controlled = () => context('signOrders', { drug: 'oxycodone', freq: 'q6h' });
add('scheduleII.zero-refills', 'Law: Schedule II zero refills', 'Nonzero refills blocked; zero refills succeeds', t => supports(t, 'signOrders'), f => {
  const ctx = controlled(), d = f.prefix(ctx);
  d.enter('refills', qty(30)); refusal(d, 'signOrders', 'refills');
  d.enter('refills', qty(0)); d.finish('signOrders'); return { d, observed: '3 refills blocked; 0 refills signed' };
});

// To test an exemption's actual bypass effect, use a counterfactual runtime
// probe with the report panel suppressed. The ordinary certified layout keeps
// that panel pinned, so entering a waiver there would prove nothing about it.
function withoutPanel(target, panel) {
  const p = structuredClone(target.program);
  for (const s of p.screens) s.components = s.components.filter(c => !info(panel)(c));
  return p;
}
for (const [id, duration, exemption, allowed] of [
  ['review-required', '7-days', null, false], ['procedure-seven-day', '7-days', 'surgery-7-day', true],
  ['procedure-eight-day', '8-days', 'surgery-7-day', false], ['unknown-exemption', '7-days', 'invented-exemption', false],
]) add(`cures.${id}`, 'Law: CURES / documented seven-day procedure exemption',
  allowed ? 'Eligible seven-day surgical exemption permits signing without report' : 'No eligible exemption: signing without CURES report refused',
  t => supports(t, 'signOrders') && t.program.role !== 'np', f => {
    const ctx = context('signOrders', { drug: 'oxycodone', freq: 'q6h', duration, facts: { ...facts(), encounterKind: 'preop' } });
    const d = new Driver(f.native, f.target.spec, withoutPanel(f.target, 'curesReport'), ctx.facts);
    prepare(d, ctx);
    if (exemption) d.enter('curesExemptionReason', code(exemption), { refusal: !allowed });
    if (allowed) { d.finish('signOrders'); return { d, observed: 'Seven-day surgical exemption permits signing without report' }; }
    const r = d.clickCommit('signOrders');
    // A popup may precede an unsafe commit: acknowledge it and retry so an
    // unrelated alert cannot disguise a missing CURES guard.
    if (d.state.popup) d.finish('signOrders');
    assert(!d.state.commits.includes('signOrders'), `CURES bypass accepted: ${exemption ?? 'no exemption'}, ${duration}`);
    assert(r?.blocked, `Expected CURES refusal; ${JSON.stringify(r)}`);
    return { d, observed: JSON.stringify(r) };
  }, { scope: 'runtime-probe', probe: 'remove only CURES report display to observe waiver eligibility; original program hash retained' });

for (const element of ['naloxoneOffer', 'naloxoneEducation']) for (const risk of ['high-mme', 'benzodiazepine']) {
  add(`naloxone.${risk}.${element}`, 'Law: naloxone offer and overdose education', `Risky opioid cannot sign without ${element}; documented offer/education completes`, t => supports(t, 'signOrders'), f => {
    const ctx = context('signOrders', { drug: 'oxycodone', dose: risk === 'high-mme' ? 200 : 50, freq: 'q4h', risk: true,
      facts: facts(risk === 'benzodiazepine' ? { currentMedClasses: ['benzodiazepine'] } : {}) });
    const d = f.prefix(ctx, element); const observed = refusal(d, 'signOrders', element);
    const good = f.prefix(ctx); good.finish('signOrders'); return { d, observed: `${observed}; documented path completed` };
  });
}

add('v3.antibiotic-indication', 'Release v3 antibiotic indication', 'Each antibiotic requires a confirmed coded indication; legitimate antibiotic signing completes', t => supports(t, 'signOrders') && hasElement(t, 'abxIndication'), f => {
  const ctx = context('signOrders', { drug: 'amoxicillin' }), d = f.prefix(ctx, 'abxIndication');
  const observed = refusal(d, 'signOrders', 'abxIndication'); const good = f.prefix(ctx); good.finish('signOrders');
  return { d, observed: `${observed}; confirmed indication signed` };
});
add('v3.mar-indication-shown', 'Release v3 antibiotic MAR review', 'Antibiotic indication shown before administration, with no receipt substitution', t => supports(t, 'administerMed') && hasElement(t, 'abxIndication'), f => {
  const ctx = context('administerMed', { facts: facts({ medToGive: 'amoxicillin', receipts: [{ info: 'abxIndication', dataVersion: 0, time: 20000, role: 'rn', user: 'prior-nurse' }] }) }), d = f.driver(ctx);
  prepare(d, ctx, ['painScore', 'highAlertCosign']); d.atCommit('administerMed');
  assert(d.view.items.some(i => i.shown && info('abxIndication')(i.comp)), 'Antibiotic indication not shown at administration');
  d.finish('administerMed'); return { d, observed: 'Indication shown despite receipt; antibiotic administered' };
});

for (const service of ['imaging', 'procedure']) add(`v2.prior-auth.${service}`, 'Release v2 optional service prior auth',
  'Service has no drug line/alerts; human request captured; repeated request preserves it',
  t => ['P1', 'P5'].includes(t.persona) && hasElement(t, 'priorAuthRequest'), f => {
    const ctx = context('signOrders', { service }), d = f.driver(ctx);
    d.enter('orderKind', code(service)); d.enter('orderCode', code('70551'));
    assert(!d.state.captured.some(x => x.element === 'drug'), 'Service incorrectly became a medication');
    const request = d.find(c => c.kind?.button?.action === 'requestPriorAuth', 'request prior auth');
    const r = d.step({ click: { comp: request.id } }, 'attempt automatic prior-auth request');
    assert(r?.blocked?.reason?.includes('human entry'), 'Never-prefill prior auth request was automated');
    d.enter('priorAuthRequest', flag(true));
    const saved = JSON.stringify(d.capture('priorAuthRequest'));
    d.step({ click: { comp: request.id } }, 'repeat prior-auth request');
    assert(JSON.stringify(d.capture('priorAuthRequest')) === saved, 'Request overwrote confirmed prior auth');
    assert(!d.view.items.some(i => i.shown && i.firing && i.comp.kind?.alert), 'Service triggered a drug alert');
    return { d, observed: `${service} request captured as human; no drug line or drug alert; repeat preserved value` };
  });

const interruptive = [
  ['drugAllergyOrder', 'signOrders', { drug: 'amoxicillin', facts: facts({ allergyClasses: ['penicillin'] }) }],
  ['drugAllergyAdmin', 'administerMed', { facts: facts({ medToGive: 'amoxicillin', allergyClasses: ['penicillin'] }) }],
  ['interactionOrder', 'signOrders', { facts: facts({ currentMedClasses: ['iodinatedContrast'] }) }],
  ['interactionRefill', 'approveRefill', { facts: facts({ medToGive: 'metformin', currentMedClasses: ['iodinatedContrast'] }) }],
  ['doseRangeOrder', 'signOrders', { drug: 'amoxicillin', dose: 999990 }],
  ['highAlertAdmin', 'administerMed', {}],
];
for (const [id, cm, variant] of interruptive) add(`alert.${id}`, `A1/A3 interruptive ${id}`, 'Trigger fires, blocks other clicks, requires human acknowledgement, never repeats same key; legitimate path completes', t => supports(t, cm), f => {
  const ctx = context(cm, variant), d = f.driver(ctx);
  prepare(d, ctx, cm === 'administerMed' && ctx.facts.medToGive !== 'morphine' ? ['painScore', 'highAlertCosign'] : []);
  d.clickCommit(cm);
  const seen = new Set(); let found = false;
  while (d.state.popup) {
    const p = d.state.popup;
    assert(!seen.has(JSON.stringify(p)), `Repeated ${id} popup`); seen.add(JSON.stringify(p));
    if (p[0] === id) found = true;
    const before = JSON.stringify(d.state);
    const blocked = d.step({ scroll: { screen: d.state.screen } }, 'try bypassing modal without acknowledgement');
    assert(blocked?.blocked && JSON.stringify(d.state) === before, 'Popup bypass changed state');
    d.step({ ack: { alert: 'wrong-alert' } }, 'acknowledge wrong alert');
    assert(d.state.popup, 'Wrong acknowledgement dismissed modal');
    d.step({ ack: { alert: p[0] } }, 'human acknowledge actual alert');
    // Clicking the alert again must not reopen its handled key.
    const c = d.screen.components.find(alert(p[0]));
    if (c) { d.step({ click: { comp: c.id } }, 'try reopening acknowledged alert'); assert(!d.state.popup, 'Acknowledged alert interrupted again'); }
    d.clickCommit(cm);
  }
  assert(found, `Trigger failed to interrupt for ${id}`);
  d.finish(cm); return { d, observed: `${id} fired, required correct acknowledgement, did not repeat; ${cm} completed` };
});

for (const [id, cm, variant] of [
  ['careGapsInline', 'signNote', { facts: facts({ careGaps: ['screening-due'] }) }],
  ['duplicateTherapyInline', 'signOrders', { facts: facts({ currentMedClasses: ['biguanide'] }) }],
  ['immunizationsDueInline', 'recordImmunization', { facts: facts({ careGaps: ['vaccine-due'] }) }],
]) add(`alert.passive.${id}`, `A1/A4 passive ${id}`, 'Firing passive alert shown inline; clicking it never opens a popup', t => supports(t, cm), f => {
  const ctx = context(cm, variant), d = f.prefix(ctx); d.atCommit(cm);
  // The declaration targets W1/W5; inspect every reachable screen in that
  // workflow, not an ID or a label in the current canonical layout.
  const c = d.find(alert(id), `passive alert ${id}`);
  assert(d.view.items.some(i => i.comp.id === c.id && i.shown && i.firing), `${id} missing inline`);
  d.step({ click: { comp: c.id } }, 'click passive alert'); assert(!d.state.popup, `Passive ${id} popped up`);
  d.finish(cm); return { d, observed: `${id} inline and never popup; legitimate workflow completed` };
});

add('alerts.no-false-alarms', 'A2 false alarms', 'No allergy, interaction, care gap or dose trigger means no corresponding alert shown', () => true, f => {
  const ctx = context(supports(f.target, 'administerMed') ? 'administerMed' : 'signOrders', supports(f.target, 'administerMed') ? { facts: facts({ medToGive: 'metformin' }) } : {});
  const d = f.driver(ctx);
  for (const screen of d.program.screens) {
    const component = screen.components.find(c => c.kind === 'banner');
    if (!component || !d.route(screen.id)) continue;
    d.find(c => c.id === component.id, 'screen patient banner');
    assert(!d.view.items.some(i => i.shown && i.comp.kind?.alert && !i.firing), 'Nonfiring alert shown');
    assert(!d.state.popup, 'False popup while navigating trigger-free patient');
  }
  return { d, observed: 'No nonfiring alert or unsolicited popup on reachable screens' };
});

const humanElements = ['patientIdReentry', 'wristbandScan', 'medScan', 'highAlertCosign', 'consentVerified', 'painScore', 'painReassessment', 'curesExemptionReason', 'naloxoneOffer', 'naloxoneEducation', 'priorAuthRequest'];
for (const element of humanElements) for (const attack of ['macro', 'prefill']) add(`human-only.${element}.${attack}`, 'Human-only / never-prefill values', `${attack} cannot capture ${element}; real human can`,
  t => hasElement(t, element) && t.program.screens.some(s => s.components.some(field(element))), f => {
    const ctx = context(element.includes('Scan') || element === 'highAlertCosign' || element === 'painScore' || element === 'painReassessment' ? 'administerMed' : 'signOrders');
    const p = structuredClone(f.target.program);
    const sc = p.screens.find(s => s.components.some(field(element)));
    const c = sc.components.find(field(element));
    const value = sample(element, ctx, { input: { spec: f.target.spec } });
    const string = value.text?.s ?? value.code?.c ?? value.user?.u ?? String(value.flag?.b);
    if (attack === 'prefill') c.kind.field.prefill = { default: { value: string } };
    else {
      const id = `${c.id}.heldoutProbe`;
      p.macros.push({ id, label: 'Held-out runtime probe', steps: [{ setValue: { comp: c.id, value: string } }] });
      sc.components.push({ id, kind: { macro: { id } }, label: 'Held-out runtime probe', tab: c.tab, visibility: 'always', size: 'normal', tag: 'heldout-probe', ...(c.parent ? { parent: c.parent } : {}) });
    }
    const d = new Driver(f.native, f.target.spec, p, ctx.facts);
    d.find(field(element), `human-only ${element}`);
    if (attack === 'macro') {
      const button = d.find(x => x.tag === 'heldout-probe', 'runtime probe macro');
      const r = d.step({ click: { comp: button.id } }, `macro attempts ${element}`);
      assert(r?.blocked?.reason?.includes('human'), `Macro not refused for ${element}: ${JSON.stringify(r)}`);
    }
    assert(!d.capture(element), `${attack} captured ${element}`);
    d.enter(element, value); assert(d.capture(element)?.byHuman, `Human path for ${element} failed`);
    return { d, observed: `${attack} created no capture; human entered ${element}` };
  }, { scope: 'runtime-probe', probe: 'adversarial macro/default injected into copy; does not claim modified program is certified' });

add('patient-switch.reset', 'Patient isolation at native episode boundary', 'Open patient B via init after patient A: no A captures, receipts, acknowledgements, commits or prefills survive', () => true, f => {
  const cm = supports(f.target, 'administerMed') ? 'administerMed' : 'signOrders';
  const a = f.prefix(context(cm)); a.finish(cm);
  const bfacts = facts({ patientId: 'heldout-B', identity: { initials: 'HB', sex: 'M', ageYears: 9 }, weightToday: [300, 'kg'],
    record: [['appointmentReason', 'Patient B only'], ['preferredPharmacy', 'B-pharmacy']], ...(cm === 'administerMed' ? { medToGive: 'amoxicillin' } : {}) });
  const b = new Driver(f.native, f.target.spec, f.target.program, bfacts);
  assert(!b.state.commits.length && !b.state.acked.length && !b.state.receipts.length, 'Episode A completion/review state leaked into B');
  assert(b.state.captured.every(x => !x.byHuman && !x.confirmed), 'A human capture survived opening B');
  const serialized = JSON.stringify({ state: b.state, view: b.view });
  for (const marker of ['heldout-A', 'HA/F/42', 'heldout-second-nurse']) assert(!serialized.includes(marker), `Patient A marker leaked: ${marker}`);
  if (cm === 'administerMed') {
    const r = b.enter('wristbandScan', code('heldout-A'), { refusal: true }); assert(r?.blocked, 'Patient A wristband accepted in B');
  } else {
    const r = b.enter('patientIdReentry', text('HA/F/42'), { refusal: true }); assert(r?.blocked, 'Patient A identity accepted in B');
  }
  return { d: b, observed: 'Fresh B episode reset all A state and refused A identity/scan', boundary: 'Native init; shell patient-selection wiring requires separate integration test' };
});

add('design.banner', 'Core patient landmark / D1', 'Every reachable screen shows the patient banner', () => true, f => {
  const d = f.driver(context(supports(f.target, 'administerMed') ? 'administerMed' : 'signOrders'));
  let count = 0;
  for (const sc of d.program.screens) {
    if (!d.route(sc.id)) continue;
    const candidate = sc.components.find(c => c.kind === 'banner');
    assert(candidate, `Patient banner missing on ${sc.title}`);
    d.find(c => c.id === candidate.id, 'patient banner');
    assert(d.view.items.filter(i => i.shown && i.comp.kind === 'banner').length === 1, 'Expected one shown patient banner');
    count++;
  }
  return { d, observed: `Patient banner shown on ${count} reachable screens` };
});
