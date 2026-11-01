import { Driver, Failure, assert, field, commit, info, alert } from './driver.mjs';
import { refillDenialScenario } from './refill-denial.mjs';
import { entries, roles, personaCommits, personaWorkflows, reviews, linked, orderLine, facts, context, sample, prepare, fieldsFor, qty, code, text, flag, user } from './clinical.mjs';

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
      ? `A configured link uses ${linked[element]}; a manual field remains required`
      : `Attempt ${id} before entering/confirming ${element}; hard stop names ${element}`,
    t => supports(t, id) && !(t.archived && !hasElement(t, element)), f => {
      const ctx = context(id);
      if (linked[element]) {
        const d = f.prefix(ctx, element);
        const c = d.find(field(element), `element ${element}`);
        if (c.kind.field.prefill?.linked) {
          d.assertCaptured(element, sample(element, ctx, d));
          assert(d.capture(element).provenance === `linked:${linked[element]}`, `Wrong declared-link provenance for ${element}`);
          return { d, observed: `${element} confirmed from declared source ${linked[element]}` };
        }
        // V1 explicitly permits the canonical's separate dosing-weight entry.
        return { d, observed: refusal(d, id, element) };
      }
      if (element === 'drug') {
        const d = f.prefix(ctx, 'dose');
        const result = d.enter('drug', code(''), { refusal: true });
        assert(result?.blocked && d.capture('drug')?.value.code?.c === ctx.drug, 'Clearing the medication removed a required drug');
        return { d, observed: 'Existing medication line cannot be replaced with an empty drug' };
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
      if (id === 'signOrders') ctx = context(id, { drug: 'oxycodone', freq: 'q6h',
        facts: f.target.program.role === 'np' ? facts() : facts({ encounterKind: 'preop' }) });
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
  const old = f.native.call('facts', { bundle: patientBundle('heldout-A', '2026-11-01'), context: { today: '2026-11-02', now: 600, receipts: [], record: [] } });
  assert(old.facts.weightToday === undefined, 'Stale FHIR weight classified as today');
  const ctx = context('signOrders', { facts: old.facts }), d = f.driver(ctx);
  d.find(field('weight'), 'weight');
  assert(!d.capture('weight'), 'Yesterday’s weight prefilled as current');
  const fresh = f.native.call('facts', { bundle: patientBundle(), context: { today: '2026-11-02', now: 600, receipts: [], record: [] } });
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
    const ctx = context('signOrders', { drug: 'oxycodone', freq: 'q6h', duration,
      facts: facts({ encounterKind: 'preop', record: [['surgicalProcedure', 'appendectomy'], ['facilityKind', 'general-acute-care'], ['directedSupplyDays', duration === '8-days' ? '8' : '7']] }) });
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

add('v3.antibiotic-indication', 'Release v3 antibiotic indication', 'Each antibiotic requires a confirmed coded indication; legitimate antibiotic signing completes', t => supports(t, 'signOrders') && t.semanticRelease === 'v3', f => {
  const ctx = context('signOrders', { drug: 'amoxicillin' }), d = f.prefix(ctx, 'abxIndication');
  const observed = refusal(d, 'signOrders', 'abxIndication'); const good = f.prefix(ctx); good.finish('signOrders');
  return { d, observed: `${observed}; confirmed indication signed` };
});
add('v3.mar-indication-shown', 'Release v3 antibiotic MAR review', 'Antibiotic indication shown before administration, with no receipt substitution', t => supports(t, 'administerMed') && t.semanticRelease === 'v3', f => {
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
]) add(`alert.passive.${id}`, `A1/A4 passive ${id}`, 'Firing passive alert shown inline on its declared W1/W5 workflow; clicking it never opens a popup', t =>
  supports(t, cm) && (personaWorkflows[t.persona] ?? t.program.screens.map(s => s.workflow)).includes(id === 'immunizationsDueInline' ? 'W5' : 'W1'), f => {
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
    const ctx = context(element.includes('Scan') || element === 'highAlertCosign' || element === 'painScore' || element === 'painReassessment' ? 'administerMed' : 'signOrders',
      element === 'consentVerified' ? { facts: facts({ encounterKind: 'preop' }) } : {});
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

add('workflow.empty-medication-signing', 'Workflow expectation: do not sign an empty medication episode',
  'After ID and kg checks, signing with no selected medication should refuse', t => supports(t, 'signOrders'), f => {
    const ctx = context('signOrders'), d = f.prefix(ctx, 'drug');
    return { d, observed: refusal(d, 'signOrders', 'drug') };
  }, { expectationBoundary: 'Stricter workflow expectation: per-line encoded entries are vacuous when no drug line exists. A failure does not establish an unsafe MedicationRequest write.' });

function nextMedicationLine(d, ctx, omit = []) {
  const screens = d.program.screens.filter(s => s.components.some(field('drug')));
  const c = d.find(c => c.kind?.button?.action === 'newOrderLine' && screens.some(s => s.components.includes(c)), 'add medication order line');
  const before = d.state.currentSlot;
  assert(d.step({ click: { comp: c.id } }, 'add second medication line') === 'ok', 'Completed line could not advance');
  assert(d.state.currentSlot === before + 1, 'New order line did not advance');
  for (const e of orderLine) {
    if (omit.includes(e)) continue;
    const options = { slot: d.state.currentSlot, workflow: d.screen.workflow };
    if (linked[e]) {
      d.find(field(e, d.state.currentSlot), `linked element ${e}`, options);
      if (d.capture(e, d.state.currentSlot)?.confirmed) continue;
    }
    d.enter(e, sample(e, ctx, d), options);
  }
}
add('orders.incomplete-line-cannot-advance', 'Core completion from reachable states', 'Cannot advance an unfinished line; completing it leaves signing reachable', t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders'), d = f.prefix(ctx, 'dose');
  const c = d.find(c => c.kind?.button?.action === 'newOrderLine', 'add order line');
  const before = d.state.currentSlot;
  const r = d.step({ click: { comp: c.id } }, 'try stranding a line without its dose');
  assert(r?.blocked && d.state.currentSlot === before, 'Unfinished line became unreachable');
  const good = f.prefix(ctx); good.finish('signOrders'); return { d, observed: 'Incomplete line refused advancement; complete line signed' };
});
add('scheduleII.each-line-zero', 'Law: Schedule II zero refills on every line', 'A zero on line 1 cannot authorize nonzero refills on line 2', t => supports(t, 'signOrders'), f => {
  const ctx = controlled(), d = f.prefix(ctx);
  nextMedicationLine(d, ctx);
  d.enter('refills', qty(30), { slot: d.state.currentSlot });
  refusal(d, 'signOrders', 'refills');
  d.enter('refills', qty(0), { slot: d.state.currentSlot }); d.finish('signOrders');
  return { d, observed: 'Second Schedule II line with 3 refills blocked despite first-line zero; both zero completed' };
});
add('v3.antibiotic-each-line', 'Release v3 indication on every antibiotic line', 'First-line indication does not cover second antibiotic; both confirmed indications complete', t => supports(t, 'signOrders') && t.semanticRelease === 'v3', f => {
  const ctx = context('signOrders', { drug: 'amoxicillin' }), d = f.prefix(ctx);
  nextMedicationLine(d, ctx);
  refusal(d, 'signOrders', 'abxIndication');
  d.enter('abxIndication', code('skin-infection'), { slot: d.state.currentSlot }); d.finish('signOrders');
  return { d, observed: 'Second antibiotic required its own indication; two complete lines signed' };
});
add('dose.native-units-positive', 'Unit-aware dose legitimate path', 'Insulin in units completes; insulin in mg is refused', t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders', { drug: 'insulin lispro', unit: 'units', dose: 100 }), d = f.prefix(ctx, 'dose');
  const r = d.enter('dose', qty(100, 'mg'), { refusal: true });
  assert(r?.blocked, 'Insulin dose in mg accepted');
  const good = f.prefix(ctx); good.finish('signOrders'); return { d, observed: 'Insulin mg refused; 10 units signed without conversion to mg' };
});

add('epcs.receipt-never-replaces-details', 'Law: EPCS details shown at signing', 'Even a fresh receipt cannot replace controlled prescription details', t => supports(t, 'signOrders'), f => {
  const ctx = controlled(); ctx.facts.receipts = [{ info: 'orderSummary', dataVersion: 0, time: ctx.facts.now, role: f.target.program.role, user: f.target.program.owner }];
  const d = new Driver(f.native, f.target.spec, withoutPanel(f.target, 'orderSummary'), ctx.facts);
  prepare(d, ctx); return { d, observed: refusal(d, 'signOrders', 'orderSummary') };
}, { scope: 'runtime-probe', probe: 'Suppress only order summary display; supply a fresh receipt' });

for (const panel of ['allergyList', 'currentMeds']) for (const variant of ['valid', 'expired', 'wrong-version', 'wrong-role']) {
  add(`receipt.${panel}.${variant}`, `Hospital ${panel} receipt validity`, variant === 'valid'
    ? 'Fresh same-version permitted-role receipt can substitute for display' : `${variant} receipt cannot substitute for required display`, t => supports(t, 'signOrders'), f => {
    const ctx = context('signOrders');
    const receipt = { info: panel, dataVersion: panel === 'allergyList' ? 3 : 4, time: ctx.facts.now, role: f.target.program.role, user: 'prior-reviewer' };
    if (variant === 'expired') receipt.time -= 241;
    if (variant === 'wrong-version') receipt.dataVersion++;
    if (variant === 'wrong-role') receipt.role = 'rn';
    ctx.facts.receipts = [receipt];
    const d = new Driver(f.native, f.target.spec, withoutPanel(f.target, panel), ctx.facts);
    prepare(d, ctx);
    if (variant === 'valid') { d.finish('signOrders'); return { d, observed: `${panel} fresh authorized receipt permitted signing` }; }
    return { d, observed: refusal(d, 'signOrders', panel) };
  }, { scope: 'runtime-probe', probe: 'Suppress only named panel to observe the receipt guard' });
}

add('alerts.changed-data-reinterrupts', 'A3 changed data requires a fresh acknowledgement', 'Same allergy key does not repeat; a new allergy version may interrupt again', t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders', { drug: 'amoxicillin', facts: facts({ allergyClasses: ['penicillin'] }) }), d = f.prefix(ctx);
  d.finish('signOrders');
  const c = d.find(alert('drugAllergyOrder'), 'drug allergy alert');
  d.step({ click: { comp: c.id } }, 'reopen acknowledged same-version alert'); assert(!d.state.popup, 'Same-version alert repeated');
  d.input.facts.allergyVersion++;
  d.step({ click: { comp: c.id } }, 'review updated allergy version');
  assert(d.state.popup?.[0] === 'drugAllergyOrder', 'Updated allergy data did not request a new acknowledgement');
  d.step({ ack: { alert: 'drugAllergyOrder' } }, 'acknowledge changed allergy data');
  return { d, observed: 'Same data did not reinterrupt; new data version required a new acknowledgement' };
});

add('automation.commit-and-review', 'Human-only commits and reviews', 'Macro cannot sign or manufacture a review receipt', t => supports(t, 'signOrders'), f => {
  const ctx = context('signOrders'), original = f.prefix(ctx);
  original.atCommit('signOrders');
  const d = original.fork(), p = structuredClone(d.program), sc = p.screens.find(s => s.id === d.state.screen);
  const button = sc.components.find(commit('signOrders'));
  p.macros.push({ id: 'heldout-commit-probe', label: 'Probe', steps: [{ click: { comp: button.id } }] });
  sc.components.push({ id: 'heldout-commit-probe', kind: { macro: { id: 'heldout-commit-probe' } }, label: 'Probe', tab: 0, visibility: 'always', size: 'normal', tag: 'heldout-commit-probe' });
  d.input.program = p;
  const r = d.step({ click: { comp: 'heldout-commit-probe' } }, 'macro attempts signing');
  assert(r?.blocked?.reason?.includes('human only: commit') && !d.state.commits.length, 'Macro signed orders');
  const review = d.find(c => c.kind?.button?.action?.markReviewed?.info === 'allergyList', 'mark allergies reviewed');
  const reviewScreen = p.screens.find(s => s.id === d.state.screen);
  p.macros.push({ id: 'heldout-review-probe', label: 'Probe', steps: [{ click: { comp: review.id } }] });
  reviewScreen.components.push({ id: 'heldout-review-probe', kind: { macro: { id: 'heldout-review-probe' } }, label: 'Probe', tab: 0, visibility: 'always', size: 'normal', tag: 'heldout-review-probe' });
  const before = JSON.stringify(d.state.receipts);
  const rr = d.step({ click: { comp: 'heldout-review-probe' } }, 'macro attempts review receipt');
  assert(rr?.blocked?.reason?.includes('human only: review') && JSON.stringify(d.state.receipts) === before, 'Macro manufactured a review receipt');
  original.finish('signOrders'); return { d, observed: 'Macro signing and review refused; original human workflow completed' };
}, { scope: 'runtime-probe', probe: 'Inject macro buttons calling existing sign and review controls' });

add('patient-switch.chart-scoping', 'Patient isolation in FHIR projection', 'Opening B with a stale A resource must reject or exclude A clinical data', () => true, f => {
  const bundle = patientBundle('heldout-B');
  bundle.entry.push({ resource: { resourceType: 'AllergyIntolerance', id: 'A-private-allergy', patient: { reference: 'Patient/heldout-A' },
    meta: { versionId: '7' }, clinicalStatus: { coding: [{ code: 'active' }] }, code: { text: 'HELDOUT_A_PRIVATE_ALLERGY', coding: [{ code: 'penicillin' }] } } });
  const projected = f.native.call('facts', { bundle, context: { today: '2026-11-02', now: 600, receipts: [], record: [] } });
  const d = new Driver(f.native, f.target.spec, f.target.program, projected.facts);
  assert(!JSON.stringify(projected.display.allergies).includes('HELDOUT_A_PRIVATE_ALLERGY'), 'FHIR projection displayed patient A allergy in patient B chart');
  assert(!projected.facts.allergyClasses.includes('penicillin'), 'Patient A allergy altered B safety facts');
  return { d, observed: 'Patient A clinical resource excluded from B projection' };
}, { scope: 'adapter-probe', expectationBoundary: 'Defensive mixed-bundle test. Native init reset is tested separately; shell chart-loading/patient-selection integration is outside this no-browser suite.' });

for (const [id, cm, variant] of [
  ['healthMaintenancePopup', 'signNote', { facts: facts({ careGaps: ['screening-due'] }) }],
  ['highAlertOrderNotice', 'signOrders', { drug: 'oxycodone', freq: 'q6h' }],
  ['activeRxPopup', 'approveRefill', { facts: facts({ medToGive: 'metformin', currentMedClasses: ['biguanide'] }) }],
  ['refillCareGapPopup', 'approveRefill', { facts: facts({ careGaps: ['screening-due'] }) }],
  ['minorInteractionPopup', 'administerMed', { facts: facts({ medToGive: 'amoxicillin', currentMedClasses: ['vitaminKAntagonist'] }) }],
]) add(`alert.removable.${id}`, `Core optional/removable alert ${id}`, 'May be removed or inline; if configured to interrupt, fires only for its trigger and legitimate completion remains possible', t => supports(t, cm), f => {
  const ctx = context(cm, variant), d = f.driver(ctx);
  prepare(d, ctx, cm === 'administerMed' ? ['painScore', 'highAlertCosign'] : []);
  d.atCommit(cm);
  const present = d.program.screens.flatMap(s => s.components).some(alert(id));
  if (present) {
    const c = d.find(alert(id), `optional alert ${id}`);
    assert(d.view.items.some(i => i.comp.id === c.id && i.firing), `Configured ${id} did not fire for its trigger`);
  }
  d.finish(cm); return { d, observed: `${id} ${present ? 'fired when configured' : 'lawfully removed'}; legitimate ${cm} completed` };
});

add('design.banner-identifiers', 'D1 patient banner identifiers', 'Native semantic UI contains selected patient name, MRN and birth date', () => true, f => {
  const projected = f.native.call('facts', { bundle: patientBundle('heldout-B'), context: { today: '2026-11-02', now: 600, receipts: [], record: [] } });
  const d = new Driver(f.native, f.target.spec, f.target.program, projected.facts);
  const ui = f.native.call('render-ui', { ...d.input, state: d.state, display: projected.display });
  const serialized = JSON.stringify(ui);
  assert(serialized.includes('heldout-B') && serialized.includes('1984') && serialized.includes('MRN'), 'Patient name/MRN/DOB missing from semantic banner');
  return { d, observed: 'Selected patient identifiers present in native semantic UI' };
});

add('epcs.details-content', 'Law: controlled-prescription details at signing', 'Native semantic order summary shows selected drug, native dose, directions, quantity and refills', t => supports(t, 'signOrders'), f => {
  const ctx = controlled(), d = f.prefix(ctx); d.atCommit('signOrders');
  const projected = f.native.call('facts', { bundle: patientBundle(), context: { today: '2026-11-02', now: 600, receipts: [], record: [] } });
  const ui = f.native.call('render-ui', { ...d.input, state: d.state, display: projected.display });
  const serialized = JSON.stringify(ui);
  for (const marker of ['oxycodone', 'mg', 'q6h', '14', '0']) assert(serialized.includes(marker), `EPCS details missing ${marker}`);
  d.finish('signOrders'); return { d, observed: 'Controlled drug, mg dose, frequency, quantity and zero refills present in native semantic UI; signed' };
});

add('weight.linked-source-refresh', 'Hospital dosing weight / declared source linkage', 'Correcting weight to 20 kg refreshes or invalidates an earlier 70 kg link; mismatched values cannot be signed',
  t => supports(t, 'signOrders') && t.program.screens.some(s => s.components.some(c => field('dosingWeight')(c) && c.kind.field.prefill?.linked?.element === 'weight')), f => {
    const ctx = context('signOrders'), d = f.prefix(ctx, 'dosingWeight');
    // Establish and confirm the old copy first on every layout. Some layouts
    // do not visit the dependent field until after the source was entered.
    const oldCopy = d.find(c => field('dosingWeight')(c) && c.kind.field.prefill?.linked?.element === 'weight', 'linked dosing weight before correction');
    if (d.capture('dosingWeight') && !d.capture('dosingWeight').confirmed)
      d.step({ confirm: { comp: oldCopy.id } }, 'confirm the original 70 kg linked copy');
    d.assertCaptured('dosingWeight', qty(700, 'kg'));
    d.enter('weight', qty(200, 'kg'));
    const c = d.find(field('dosingWeight'), 'linked dosing weight after source correction');
    if (d.capture('dosingWeight') && !d.capture('dosingWeight').confirmed)
      d.step({ confirm: { comp: c.id } }, 'try confirming the existing dosing-weight copy');
    prepare(d, ctx, ['weight', 'dosingWeight']);
    const mismatch = JSON.stringify(d.capture('weight')?.value) !== JSON.stringify(d.capture('dosingWeight')?.value);
    if (mismatch) {
      d.clickCommit('signOrders');
      assert(!d.state.commits.includes('signOrders'), 'Signed with current weight 20 kg but confirmed linked dosing weight 70 kg');
      // A blocking implementation must still offer a consistent legitimate path.
      d.enter('dosingWeight', qty(200, 'kg'));
    }
    d.finish('signOrders'); return { d, observed: 'Superseded link refreshed or refused; consistent corrected kg path completed' };
  });

scenarioCatalog.push(refillDenialScenario);
