import { dataReason } from '../test-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { trajectoryIndexSchema, trajectorySchema } from '../../app/src/dashboard/trajectories-data.ts';
import { loadInterpreter, verifyTask } from './index.mjs';

const read = async p => JSON.parse(await readFile(new URL(`../../${p}`, import.meta.url), 'utf8'));
const directory = 'runs/run1-P3/trajectories';

test('index schema covers all 424 tasks and exact event slices with complete context coverage', { skip: dataReason('runs/run1-P3/trajectories') }, async () => {
  const index = trajectoryIndexSchema.parse(await read(`${directory}/index.json`));
  assert.equal(index.tasks.length, 424);
  assert.deepEqual([...new Set(index.tasks.map(t => t.day))], [1,2,3,4,5,6,7,8,9,10]);
  let events = 0;
  for (const row of index.tasks) {
    const task = trajectorySchema.parse(await read(`${directory}/${row.file}`));
    assert.equal(task.id, row.id);
    assert.equal(task.trace.length, row.eventCount);
    assert.equal(task.context.programPath, row.programPath);
    assert.equal(task.context.specPath, row.specPath);
    assert.equal(task.context.fixtureFile, row.patient.fixtureFile);
    assert.deepEqual(task.context.user, row.user);
    assert.equal(task.nativeMismatch, null);
    const day = await read(`runs/run1-P3/days/day-${String(row.day).padStart(2, '0')}/${row.persona}.json`);
    assert.deepEqual(task.trace, day.trace.filter(e => e.task === row.id));
    assert.equal(task.context.segments.at(-1).goalsMet, row.completed);
    events += row.eventCount;
  }
  assert.equal(events, 14658);
  const verification = await read(`${directory}/verification.json`);
  assert.equal(verification.status, 'passed');
  assert.equal(verification.nativeEventsVerified, events);
  assert.equal(verification.wasmEventsVerified, events);
  assert.deepEqual(verification.mismatches, []);
  assert.equal(verification.baselineTasks, 3);
  if (verification.baselineWasmEventsVerified !== undefined)
    assert.equal(verification.baselineWasmEventsVerified, index.tasks.reduce((n, t) => n + (t.baseline?.eventCount ?? 0), 0));
  const invalid = structuredClone(index);
  invalid.tasks[0].programPath = '../escape.json';
  assert.equal(trajectoryIndexSchema.safeParse(invalid).success, false);
  invalid.tasks[0] = structuredClone(index.tasks[0]);
  invalid.tasks[0].metrics.clicks = -1;
  assert.equal(trajectoryIndexSchema.safeParse(invalid).success, false);
});

test('real WASM determinism across three releases, episode resets and baseline trajectories', { skip: dataReason('runs/run1-P3/trajectories') }, async () => {
  const index = trajectoryIndexSchema.parse(await read(`${directory}/index.json`));
  const interp = await loadInterpreter();
  for (const day of [1, 4, 7]) {
    const row = index.tasks.find(t => t.day === day && t.id.endsWith('-001'));
    for (const side of [row, row.baseline].filter(Boolean)) {
      const task = await read(`${directory}/${side.file}`);
      const result = await verifyTask(interp, task, await read(side.specPath), await read(side.programPath));
      assert.equal(result.firstMismatch, null, `${side.id} v${side.programVersion}`);
      assert.equal(result.eventsVerified, side.eventCount);
    }
  }
  const row = index.tasks[0];
  const task = await read(`${directory}/${row.file}`);
  task.trace[5].screen = 'deliberately-corrupted';
  const result = await verifyTask(interp, task, await read(row.specPath), await read(row.programPath));
  assert.equal(result.firstMismatch.eventIndex, 5);
  assert.equal(result.firstMismatch.expectedScreen, 'deliberately-corrupted');
  const broken = await read(`${directory}/${row.file}`);
  broken.trace[2].result = 'deliberately-corrupted';
  assert.equal((await verifyTask(interp, broken, await read(row.specPath), await read(row.programPath))).firstMismatch.eventIndex, 2);
});

test('replays workspace data arrival and preserves the selected patient across clinical episode resets',async()=>{
 const {tinySpec,tinyProgram,tinyFacts}=await import('../../lean/generated/ehr-samples.ts');
 const interp=await loadInterpreter(),program={...tinyProgram,patientSelection:true,start:'home',screens:[...tinyProgram.screens,{...tinyProgram.screens[0],id:'home',components:[]}]};
 const facts={...tinyFacts,sourcePatientId:'fixture-patient',patientDirectory:{patients:[{id:'fixture-patient',name:'Fixture',mrn:'TEST'}],activities:[{info:'scheduleTasks',title:'Fixture list',rows:[{patient:'fixture-patient',fields:[],source:'fixture'}]}]}};
 const user={id:program.owner,role:program.role},args=[JSON.stringify(tinySpec),JSON.stringify(program),JSON.stringify(facts),JSON.stringify(user)];
 let state=JSON.parse(interp.init(...args));const trace=[];
 const record=event=>{const screen=state.screen,output=JSON.parse(interp.step(...args,JSON.stringify(state),JSON.stringify(event)));trace.push({task:'fixture',t:0,screen,event,ops:[],result:output.result});state=output.state;};
 record({click:{comp:'workspace.open|fixture-patient|0|scheduleTasks'}});
 state=JSON.parse(interp.step(...args,JSON.stringify(state),JSON.stringify({scroll:{screen:state.screen}}))).state;
 assert.notEqual(state.screen,'home');record({scroll:{screen:state.screen}});
 const selected=state.patientContext;
 state={...JSON.parse(interp.init(args[0],JSON.stringify({...program,patientSelection:false}),args[2],args[3])),patientContext:selected};
 record({scroll:{screen:state.screen}});
 const task={schemaVersion:1,id:'fixture',context:{user,startMin:0,segments:[{start:0,end:2,facts,seed:{kind:'init',clock:0},goalsMet:true},{start:2,end:3,facts,seed:{kind:'init',clock:0,clinical:true},goalsMet:true}]},trace};
 const {replayTrajectory}=await import('../../app/src/dashboard/trajectory-replay.ts');const replay=replayTrajectory(interp,task,tinySpec,program);
 assert.equal(replay.firstMismatch,null);assert.equal(replay.eventsVerified,3);assert.equal(replay.state.patientContext.patient,'fixture-patient');
});
