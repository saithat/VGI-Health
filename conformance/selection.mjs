import { Driver, assert, info, field } from './driver.mjs';
import { directory } from './workspace.mjs';
import { text, code } from './clinical.mjs';

const patients = [{ id: 'heldout-A', name: 'Ada Quill', mrn: 'HA-701' },
  { id: 'heldout-B', name: 'Boris Rowan', mrn: 'HB-902' }];
const context = { today: '2026-11-02', now: 600, receipts: [], record: [] };
const patientResource = p => ({ resourceType: 'Patient', id: p.id,
  name: [{ text: p.name, given: [p.name.split(' ')[0]], family: p.name.split(' ')[1] }],
  gender: 'female', birthDate: '1984-01-02',
  identifier: [{ type: { coding: [{ code: 'MR' }] }, value: p.mrn }] });
const allergyResource = p => ({ resourceType: 'AllergyIntolerance', id: `${p.id}-allergy`,
  patient: { reference: `Patient/${p.id}` }, meta: { versionId: '7' },
  clinicalStatus: { coding: [{ code: 'active' }] },
  code: { text: `${p.id}_PRIVATE_ALLERGY`, coding: [{ code: p.id === 'heldout-A' ? 'penicillin' : 'latex' }] } });
function project(f, index, mixed = false) {
  const p = patients[index];
  const resources = [patientResource(p), allergyResource(p), ...(mixed ? [patientResource(patients[0]), allergyResource(patients[0])] : [])];
  const projected = f.native.call('facts', { bundle: { resourceType: 'Bundle', type: 'collection', entry: resources.map(resource => ({ resource })) }, context });
  projected.facts.patientDirectory = directory(patients);
  return projected;
}
function driver(f, projected, autoOpen = false) {
  return new Driver(f.native, f.target.spec, f.target.program, projected.facts, undefined, { autoOpen });
}
const scenario = (id, expected, run) => ({ id: `selection.${id}`, rule: 'Patient selection and cross-patient isolation', expected,
  notApplicableReason: 'Legacy program predates in-UI patient selection; original preselected start state retained',
  applies: t => t.program.patientSelection === true, run });

export const selectionScenarios = [
  scenario('landing', 'Landing exposes public list context, no chart data; clinical controls cannot activate before selection', f => {
    const a = project(f, 0), d = driver(f, a);
    const ui = d.render(a.display), rendered = JSON.stringify(ui);
    assert(!d.state.patientContext?.patient && !d.state.patientContext?.bound, 'Landing already has an open patient');
    assert(!ui.banner.length && !ui.side.length && !rendered.includes('PRIVATE_ALLERGY') && !rendered.includes('1984-01-02'), 'Landing leaked patient chart data');
    assert(d.view.items.length === 0 && d.state.captured.length === 0 && d.state.receipts.length === 0, 'Landing exposed clinical state');
    const clinical = d.program.screens.flatMap(s => s.components).find(c => c.kind?.field);
    const result = d.step({ enter: { comp: clinical.id, value: text('bypass-selection') } }, 'attempt clinical entry before selection');
    assert(result?.blocked && !d.state.captured.length, 'Clinical entry bypassed patient selection');
    return { d, observed: 'Public list identities only; no chart banner, clinical data or captures; entry blocked until selection' };
  }),
  scenario('row-open', 'Opening the actual list row binds the requested patient and makes clinical work reachable', f => {
    const a = project(f, 0), d = driver(f, a);
    assert(d.patientControl(patients[0].id), 'Landing has no row action for its scheduled patient');
    d.openPatient(patients[0].id);
    assert(d.state.patientContext.bound === patients[0].id && d.view.items.length > 0, 'Selected chart remained unreachable');
    const ui = JSON.stringify(d.render(a.display));
    assert(ui.includes('Ada') && ui.includes('Quill') && ui.includes('HA-701'), 'Opened chart has wrong patient identifiers');
    return { d, observed: 'Scheduled row selected Ada Quill; source bound and clinical controls shown' };
  }),
  ...[['name', 'Boris Rowan'], ['mrn', 'HB-902']].map(([kind, query]) => scenario(`lookup-${kind}`, `Patient Lookup finds by ${kind} and opens the matching patient`, f => {
    const b = project(f, 1), d = driver(f, b);
    d.lookup(query);
    assert(d.patientControl('heldout-B') && !d.patientControl('heldout-A'), `Lookup by ${kind} did not uniquely find B`);
    d.openPatient('heldout-B');
    assert(d.state.patientContext.bound === 'heldout-B', 'Lookup opened another patient');
    return { d, observed: `Patient Lookup query ${query} uniquely found and opened Boris Rowan` };
  })),
  scenario('switch-isolation', 'Switch A to B starts B with a fresh chart, refuses stale A binding, and excludes A resources from B facts/UI', f => {
    const a = project(f, 0), b = project(f, 1, true), d = driver(f, a, true);
    d.find(info('allergyList'), 'patient A allergy list');
    assert(JSON.stringify(d.render(a.display)).includes('heldout-A_PRIVATE_ALLERGY'), 'A private marker was not visible before switching');
    // Establish a real human capture. The selected field is semantic, not tied
    // to an activity's component identifier or layout.
    const identity = d.program.screens.flatMap(s => s.components).find(field('patientIdReentry'));
    if (identity) d.enter('patientIdReentry', text(`${a.facts.identity.initials}/${a.facts.identity.sex}/${a.facts.identity.ageYears}`));
    else d.enter('wristbandScan', code(a.facts.patientId));
    assert(d.state.captured.length > 0, 'A capture was not established before switch');
    d.openPatient('heldout-B', { bind: false });
    assert(!d.state.captured.length && !d.state.receipts.length && !d.state.acked.length && !d.state.commits.length, 'A clinical state survived selecting B');
    d.step({ scroll: { screen: d.state.screen } }, 'host attempts stale A source after selecting B', 'hydration');
    assert(!d.state.patientContext.bound && !d.view.items.length, 'Stale patient A source bound to selected B');
    const loading = JSON.stringify(d.render(a.display));
    assert(!loading.includes('PRIVATE_ALLERGY') && !loading.includes('HA-701'), 'Loading B displayed A clinical data');
    d.hydrate(b.facts);
    d.find(info('allergyList'), 'patient B allergy list');
    const rendered = JSON.stringify(d.render(b.display));
    assert(rendered.includes('heldout-B_PRIVATE_ALLERGY') && rendered.includes('HB-902'), 'B chart failed to show B data');
    assert(!rendered.includes('heldout-A_PRIVATE_ALLERGY') && !rendered.includes('HA-701') && !b.facts.allergyClasses.includes('penicillin'), 'A clinical data leaked into B chart');
    return { d, observed: 'A→B: the B chart starts without A captures/reviews/alerts/commits (A unsigned work stays in the stored A draft); stale A source refused; mixed-bundle B projection contains only B clinical data' };
  }),
];
