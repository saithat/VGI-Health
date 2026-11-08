/** Native CLI/trajectory-context smoke using local, gitignored source data.
 * Writes only disk-backed scratch. Run after building lean/. */
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(), world=path.join(root,'runs/world/2');
const scratch=await mkdtemp(path.join(process.env.TMPDIR ?? '/home/saithat/Projects/run-tmp','vgi-workload-smoke-'));
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const binary=path.join(root,'lean/.lake/build/bin/ehr');
const program=path.join(root,'runs/core-10day/programs/P1/v0.json');
const spec=path.join(root,'releases/v1/spec.json');
try {
  const original=await read(path.join(world,'schedules/day-01/P1.json'));
  const source=original.tasks.find(t=>t.workflow==='W1'&&t.choices.orders.every(o=>!o.kind||o.kind==='medication'));
  assert.ok(source,'local world needs one medication W1 task');
  const tasks=[2,0].map((priority,i)=>({...source,id:`workload-${i}`,startMin:0,interruptions:0,
    timing:{arrivalMs:0,readyMs:0,priority,resultAgeMs:0,doseWindows:[]}}));
  const schedule={day:1,persona:'P1',load:'normal',tasks};
  const scheduleFile=path.join(scratch,'schedule.json'), personaFile=path.join(world,'personas/P1.json');
  const execute=async (input,policy='expert',extra=[])=>{
    await writeFile(scheduleFile,JSON.stringify(input));
    const result=spawnSync(binary,['simulate','--spec',spec,'--program',program,'--persona',personaFile,
      '--schedule',scheduleFile,'--world',world,'--seed','123','--policy',policy,...extra],
      {encoding:'utf8',timeout:60000,maxBuffer:16e6});
    assert.equal(result.status,0,result.stderr);
    return JSON.parse(result.stdout);
  };
  for(const policy of ['expert','bounded']) {
    const day=await execute(schedule,policy);
    assert.deepEqual(day.tasks.map(t=>t.task),['workload-1','workload-0']);
    assert.equal(day.workload.timings.length,2);
    assert.ok(day.tasks.every(t=>t.completed),`${policy}: ${JSON.stringify(day.complaints)}`);
    const [a,b]=day.workload.timings;
    assert.ok(b.startMs>=a.finishMs);
    assert.ok(b.startMs>0);
    assert.ok(day.trace.every((e,i)=>i===0||e.t>=day.trace[i-1].t));
    const legacy=await execute(schedule,policy,['--clock-mode','legacy']);
    assert.equal(legacy.workload,undefined);
    assert.deepEqual(legacy.tasks.map(t=>t.task),['workload-0','workload-1']);
    const carryFile=path.join(scratch,`${policy}-carry.json`);
    const finite=await execute({...schedule,shifts:[{id:'short',startMs:0,endMs:1}]},policy,['--carry-out',carryFile]);
    assert.deepEqual(finite.workload.pending,['workload-0']);
    assert.equal(finite.tasks.length,2);
    assert.ok(finite.workload.overtimeMs>0);
    assert.deepEqual((await read(carryFile)).tasks,[tasks[0]]);
    // A recipient receives full source work with a fresh explicit coverage window.
    const received=await read(carryFile);
    received.shifts=[{id:'recipient',startMs:60000,endMs:3600000}];
    const resumed=await execute(received,policy);
    assert.equal(resumed.workload.pending.length,0);
    assert.equal(resumed.workload.timings[0].startMs,60000);
  }
  const actual=await execute(schedule);
  const dayPath=path.join(scratch,'day.json'),contextPath=path.join(scratch,'contexts.json');
  await writeFile(dayPath,JSON.stringify(actual));
  const result=spawnSync('lean',['-j6',`--root=${root}`,'--run','scripts/trajectories/Contexts.lean',root,world,scheduleFile,spec,program,dayPath,contextPath],
    {encoding:'utf8',timeout:60000,maxBuffer:4e6,env:{...process.env,LEAN_NUM_THREADS:'6',LEAN_PATH:path.join(root,'lean/.lake/build/lib/lean')}});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const contexts=await read(contextPath);
  assert.deepEqual(contexts.map(c=>c.id),actual.tasks.map(t=>t.task));
  assert.ok(contexts.every(c=>c.nativeMismatch===null));
  console.log('Native workload smoke passed: expert/bounded ordering, monotone traces, legacy mode, full-task carry export/recipient replay, native trajectory contexts.');
} finally {await rm(scratch,{recursive:true,force:true});}
