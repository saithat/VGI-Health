// Native API fixtures from the unchanged task schedules and authored world graph.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const before = args.includes('--before');
const binary = before ? `${root}/.cache/content2/before-ehr` : `${root}/lean/.lake/build/bin/ehr`;
const releaseRoot = before ? '/tmp/content2-before-releases' : `${root}/releases`;
const out = `${root}/app/shots/realism/content2/${before ? 'before' : 'after'}`;
mkdirSync(out, { recursive: true });
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const native = (command, input) => JSON.parse(execFileSync(binary, [command], { input: JSON.stringify(input), maxBuffer: 48e6, env: { ...process.env, LEAN_NUM_THREADS: '4' } }));
const index = read('fixtures/synthea/index.json').patients.map(p => ({...p, source: `fixtures/synthea/${p.file}`}));
const hospital = read('fixtures/synthetic-hospital/index.json').patients.map(p => ({...p, source: `fixtures/synthetic-hospital/${p.file}`}));
const overlays = read('fixtures/clinical/overrides.json').entry;
const cases = [
  ['p1-schedule', 'P1', 1, 'W1', 'home'], ['p2-track-board', 'P2', 1, 'W3', 'w3TrackBoard'],
  ['p3-census', 'P3', 1, 'W4', 'w4Worklist'], ['p5-or-schedule', 'P5', 2, 'W6', 'w6Schedule'],
  ['p5-rounding', 'P5', 1, 'W6', 'w6Rounding'], ['p4-rooming', 'P4', 1, 'W5', 'w5Rooming'],
  ['problem-list', 'P1', 1, 'W1', 'w1Rooming'], ['in-basket', 'P1', 1, 'W2', 'w2Inbasket'],
  ['p5-chole-op-note', 'P5', 2, 'W6', 'w6OpNote'],
  ['refill', 'P1', 1, 'W7', 'w7Queue'], ['p5-consults', 'P5', 2, 'W6', 'w6Consults'],
];
const descend = n => [n, ...['presentation','rowAction','section','columns','valueSet','chartReferences'].flatMap(k => n[k]?.children?.flatMap(descend) ?? []), ...(n.tabs?.body?.flatMap(descend) ?? [])];
const summary = [];
for (const [name, persona, day, workflow, screen] of cases) {
  const schedule = read(`runs/world/2/day-${day}-${persona}.json`);
  let task = schedule.tasks.find(t => t.workflow === workflow && (name !== 'p5-or-schedule' || t.choices.w6Step === 'preop')) ?? schedule.tasks.find(t => t.workflow === workflow);
  if (name === 'p5-chole-op-note') {
    const graph = read(`runs/world/2/context/day-${String(day).padStart(2,'0')}.json`);
    const patients = graph.entry.map(e=>e.resource).filter(r=>r.resourceType==='ServiceRequest' && /cholecystectomy/i.test(r.code?.text??'')).map(r=>r.subject?.reference);
    task = schedule.tasks.find(t=>t.workflow==='W6' && patients.includes(`Patient/${t.patientId}`));
    assert.ok(task, 'A real cholecystectomy task supplies the operative-note review');
  }
  const patient = [...index, ...hospital].find(p => p.id === task.patientId);
  assert.ok(patient, `${name}: source chart`);
  const bundle = read(patient.source);
  if (!before) for (const change of overlays.filter(c => c.source === patient.source)) {
    bundle.entry = bundle.entry.filter(e => `${e.resource.resourceType}/${e.resource.id ?? e.fullUrl?.replace(/^urn:uuid:/,'')}` !== change.key && (!change.sourceFullUrl || e.fullUrl !== change.sourceFullUrl));
    if (change.action !== 'withdraw') bundle.entry.push({fullUrl: change.key, resource: change.resource});
  }
  for (const resource of task.todayResources) {
    bundle.entry = bundle.entry.filter(e => e.resource.id !== resource.id || e.resource.resourceType !== resource.resourceType);
    bundle.entry.push({resource});
  }
  const today = `2026-11-${String(2 + Math.floor((day - 1)/5)*7 + (day - 1)%5).padStart(2,'0')}`;
  const input = { bundle, context: { today, now: 600, receipts: [], record: [['viewerPersona',persona]], ...(before && persona === 'P5' ? {encounterKind:'preop'} : {}) },
    ...(!before ? {worldContext: read(`runs/world/2/context/day-${String(day).padStart(2,'0')}.json`)} : {}) };
  const projection = native('facts', input);
  assert.ok(!projection.error, JSON.stringify(projection));
  const spec = JSON.parse(readFileSync(`${releaseRoot}/v1/spec.json`));
  const program = JSON.parse(readFileSync(`${releaseRoot}/v1/personas/${persona}.json`));
  const user = {id: persona, role: program.role};
  const base = {spec, program, user, facts: projection.facts};
  let state = native('init', base);
  const landing = { 'p1-schedule': 'scheduleTasks', 'p2-track-board': 'edTrackBoard', 'p3-census': 'shiftWorklist',
    'p5-or-schedule': 'orSchedule', 'in-basket': 'inBasketResults', 'refill': 'inBasketRxRequests', 'p5-consults': 'consultList' }[name];
  if (program.patientSelection) {
    if (landing) {
      if (state.patientContext.activity !== landing)
        state = native('step', {...base, state, event: {click: {comp: `workspace.activity|${landing}`}}}).state;
    } else {
      state = native('step', {...base, state, event: {search: {query: projection.display.banner.mrn}}}).state;
      const list = native('render-ui', {...base, display: projection.display, state});
      const open = list.workspace.flatMap(descend).find(n => n.button?.comp.startsWith(`workspace.open|${task.patientId}|`));
      assert.ok(open, `${name}: selected patient is found through Patient Lookup`);
      state = native('step', {...base, state, event: {click: {comp: open.button.comp}}}).state;
      state = native('step', {...base, state, event: {scroll: {screen: state.screen}}}).state;
    }
  }
  // Find actual goto paths; no hidden state/screen mutation is used.
  const queue = [[state.screen, []]], seen = new Set([state.screen]);
  let path;
  for (const [at, events] of (program.patientSelection && landing ? [] : queue)) {
    if (at === screen) {path=events;break;}
    for (const c of program.screens.find(s => s.id === at).components) {
      const target = c.kind.button?.action.goto?.screen;
      if (target && !seen.has(target)) { seen.add(target); queue.push([target,[...events,{click:{comp:c.id}}]]); }
    }
  }
  if (program.patientSelection && landing) path = [];
  assert.ok(path, `${name}: reachable`);
  for (const event of path) { const step = native('step',{...base,state,event});assert.equal(step.result,'ok');state=step.state; }
  if (name === 'problem-list') {
    const chart = program.screens.find(s=>s.id===screen).components.find(c=>c.kind === "tabs");
    const problems = program.screens.find(s=>s.id===screen).components.find(c=>c.kind.table?.info==='problemList' && c.id===`${screen}.chart.problemList`);
    if (chart && problems) state=native('step',{...base,state,event:{selectTab:{comp:chart.id,idx:problems.parent===chart.id ? problems.tab : program.screens.find(s=>s.id===screen).components.find(c=>c.id===problems.parent).tab}}}).state;
  }
  const renderInput = {...base,display:projection.display,state};
  const ui = native('render-ui',renderInput);
  writeFileSync(`${out}/${name}.json`,JSON.stringify(ui));
  mkdirSync(`${root}/.cache/content2/${before ? "before" : "after"}`, {recursive:true});
  writeFileSync(`${root}/.cache/content2/${before ? "before" : "after"}/${name}-input.json`,JSON.stringify(renderInput));
  writeFileSync(`${root}/.cache/content2/${before ? "before" : "after"}/${name}-facts-input.json`,JSON.stringify(input));
  const nodes=[...ui.workspace,...ui.side].flatMap(descend);
  const rows = nodes.filter(n=>n.info).map(n=>({info:n.info.infoId,rows:n.info.rows.length}));
  summary.push({name,persona,task:task.id,patient:projection.display.banner.name,rows,banner:ui.banner});
  if (!before) {
    // Every clinical chart row must still originate in this patient's chart or selected graph resources.
    const foreignAllergies=input.worldContext.entry.filter(e=>e.resource.resourceType==='AllergyIntolerance'&&e.resource.patient?.reference!==`Patient/${task.patientId}`);
    for(const e of foreignAllergies)assert.ok(!projection.display.allergies.some(a=>a.id===e.resource.id));
    const counts={ 'p1-schedule':['scheduleTasks',16], 'p2-track-board':['edTrackBoard',16], 'p3-census':['shiftWorklist',5], 'p5-or-schedule':['orSchedule',10], 'p5-consults':['consultList',3] }[name];
    if(counts)assert.ok(rows.some(r=>r.info===counts[0]&&r.rows>=counts[1]),`${name}: full List membership; ${JSON.stringify(rows)}`);
    if(name==='p3-census')assert.equal(projection.facts.infoPayloads.find(p=>p.info==='unitCensus').rows.length,12);
    if(name==='p5-rounding')assert.ok(!ui.banner.some(([k,v])=>v==='Preoperative chart review'));
    if(name==='p5-chole-op-note'){assert.ok(nodes.some(n=>n.info?.rows.some(row=>row.some(([,value])=>/cholecystectomy/i.test(value)))));assert.ok(nodes.filter(n=>n.button).every(n=>!/appendectomy/i.test(n.button.label)));}
    if(name==='in-basket'){assert.ok(projection.facts.infoPayloads.find(p=>p.info==='inBasketFolders').rows.every(r=>Number(new Map(r.fields).get('Count'))>=2));assert.ok(rows.some(r=>r.info==='inBasketResults'&&r.rows>=3));assert.ok(rows.some(r=>r.info==='inBasketFolders'&&r.rows===3));}
  }
  console.log(`${name}: ${rows.map(r=>`${r.info}=${r.rows}`).join(', ')}`);
}
writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
