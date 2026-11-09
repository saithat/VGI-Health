/** Offline, fixed-layout wave-3 smoke. Reads owner data; all task/trace outputs
 * stay under runs/. The aggregate report contains no patient or note text.
 * Run after world gen --seed 1 --days 7 --out ../runs/world/wave3-sim-smoke --adt off.
 */
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=process.cwd();
const owner=process.env.VGI_SOURCE_ROOT??'/home/saithat/Projects/VGI-Health';
const reference=join(owner,'runs/realism-wave2-real-work');
const oldWorld=join(owner,'runs/world/realism-wave2-seed-1');
const world=resolve('runs/world/wave3-sim-smoke');
const out=resolve('runs/wave3-sim-smoke');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const personas=['P1','P2','P3','P4','P5'];
if(!process.env.TMPDIR)throw Error('Set disk-backed TMPDIR');
mkdirSync(out,{recursive:true});
function run(persona,schedule,worldDir,program,suffix,extra=[],binary=join(root,'lean/.lake/build/bin/ehr')) {
  const file=join(out,`${suffix}-${persona}-schedule.json`);
  writeFileSync(file,JSON.stringify(schedule));
  const args=['simulate','--spec',join(reference,'certifications',persona,`v${program.version}`,'spec.json'),
    '--program',join(reference,'programs',persona,`v${program.version}.json`),
    '--persona',join(worldDir,'personas',`${persona}.json`),'--schedule',file,
    '--world',worldDir,'--seed','1002','--clock-mode','continuous','--interruptions','realWork',...extra];
  const start=Date.now();
  const r=spawnSync(binary,args,{encoding:'utf8',timeout:300000,maxBuffer:256*1024*1024});
  assert.equal(r.status,0,`${suffix} ${persona}: ${r.stderr}`);
  const day=JSON.parse(r.stdout);
  writeFileSync(join(out,`${suffix}-${persona}.json`),r.stdout);
  console.log(`${suffix} ${persona}: ${day.tasks.filter(t=>t.completed).length}/${day.tasks.length}, ${Date.now()-start}ms`);
  // A real serial clock: queueing and boarding never count twice as service.
  let finish=0;
  for(const row of day.workload.timings) {
    if(row.startMs===undefined) continue;
    assert.ok(row.startMs>=finish); finish=row.finishMs;
    if(row.clocks) {
      const {queueMs,...service}=row.clocks;
      assert.equal(Object.values(service).reduce((a,b)=>a+b,0),row.finishMs-row.startMs);
      assert.equal(queueMs,row.queueDelayMs);
    }
    if(row.handover)assert.equal(row.handover.recipient,row.actor);
  }
  return day;
}
function aggregate(days) {
  const tasks=days.flatMap(d=>d.tasks), rows=days.flatMap(d=>d.workload?.timings??[]);
  const started=rows.filter(r=>r.startMs!==undefined);
  const measuredClocks=rows.some(r=>r.clocks);
  const measuredHandover=tasks.some(t=>t.interruptions?.model==='interrupting-work-v3');
  const sum=(xs,f)=>xs.reduce((n,x)=>n+f(x),0);
  return {tasks:tasks.length,completed:tasks.filter(t=>t.completed).length,started:started.length,
    meanQueueMin:sum(started,r=>r.queueDelayMs)/Math.max(1,started.length)/60000,
    overdueDoses:sum(days,d=>d.workload?.overdueScheduledDoses??0),
    activeOvertimeMin:sum(days,d=>d.workload?.overtimeMs??0)/60000,
    effortMin:sum(tasks,t=>t.klmDeciSec)/600,scrolls:sum(tasks,t=>t.rawScrolls??t.scrolls),
    communicationMin:sum(tasks,t=>t.interruptions?.workMs??0)/60000,
    reorientationMin:sum(tasks,t=>t.interruptions?.reorientationMs??0)/60000,
    readingMin:measuredClocks?sum(rows,r=>r.clocks?.readingMs??0)/60000:null,
    clinicalMin:measuredClocks?sum(rows,r=>r.clocks?.clinicalMs??0)/60000:null,
    carried:rows.filter(r=>r.disposition==='carried').length,
    acceptedHandovers:measuredHandover?rows.filter(r=>r.handover?.acceptedAtMs!==undefined).length:null,
    actors:rows.some(r=>r.actor)?[...new Set(rows.map(r=>r.actor).filter(Boolean))].length:null};
}
const original=[],replayed=[],current=[],itemCost=[],horizons=[],retainedReplayDifferences=[];
for(const persona of personas) {
  const prior=read(join(reference,'days/day-02',`${persona}.json`));
  const program=read(join(reference,'programs',persona,`v${prior.programVersion}.json`));
  original.push(prior);
  const replay=run(persona,read(join(oldWorld,`day-2-${persona}.json`)),oldWorld,program,'wave2-replay',['--sim-model','legacy']);
  // New optional measurement fields may differ; legacy behavior must not.
  const behavior=d=>({trace:d.trace,tasks:d.tasks.map(t=>({id:t.task,complete:t.completed,clicks:t.clicks,keys:t.keystrokes,scrolls:t.rawScrolls??t.scrolls,effort:t.klmDeciSec}))});
  const control=run(persona,read(join(oldWorld,`day-2-${persona}.json`)),oldWorld,program,'prewave3-control',[],
    join(process.env.TMPDIR,'w3-audit-ehr'));
  assert.deepEqual(behavior(replay),behavior(control),`lane legacy differs from pre-wave3 binary: ${persona}`);
  retainedReplayDifferences.push({persona,exact:isDeepStrictEqual(behavior(replay),behavior(prior)),
    changedTasks:replay.tasks.filter(t=>{
      const old=prior.tasks.find(p=>p.task===t.task);
      return old?.clicks!==t.clicks||old?.klmDeciSec!==t.klmDeciSec||old?.completed!==t.completed;
    }).map(t=>t.task)});
  assert.deepEqual(behavior(replay),behavior(prior),`retained frozen-spec replay differs: ${persona}`);
  replayed.push(replay);
  const schedule=read(join(world,`day-2-${persona}.json`));
  current.push(run(persona,schedule,world,program,'wave3-day2'));
  itemCost.push(run(persona,schedule,world,program,'wave3-item-cost',['--text-cost','legacy']));
  horizons.push(run(persona,read(join(world,`horizon-${persona}.json`)),world,program,'wave3-horizon'));
}
const report={protocol:'wave3-sim-smoke-v1',seed:1,source:reference,world,
  design:'Day 2 all five retained actual layouts; seven-day horizons freeze those same layouts/specs. Different source cohorts: descriptive comparison, not a treatment estimate.',
  retainedReplayDifferences,originalDay2:aggregate(original),legacyReplayDay2:aggregate(replayed),wave3Day2:aggregate(current),
  wave3SameTasksLegacyText:aggregate(itemCost),wave3SevenDayHorizon:aggregate(horizons)};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
