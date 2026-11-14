import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { compareDays } from '../app/src/dashboard/benefit-metrics.mjs';
import { reportAgentBenefit } from './report-agent-benefit.mjs';

const task = (id, clicks, klmDeciSec, completed=true) => ({task:id,clicks,scrolls:0,klmDeciSec,popups:0,completed});
const day = (tasks,floor=[]) => ({day:2,persona:'P1',tasks,floor});
test('savings exclude abandoned/missing work, retain completion and require a covered positive floor gap',()=>{
  const b=day([task('paired',10,100),task('abandoned',100,1000),task('missing',20,200)], [task('paired',2,20)]);
  const a=day([task('paired',6,80),task('abandoned',1,1,false),task('new',1,1)]);
  const r=compareDays([{before:b,after:a}]);
  assert.deepEqual(r.completion,{before:{tasks:3,completed:3},after:{tasks:3,completed:2}});
  assert.equal(r.paired,1); assert.equal(r.savedPct.actions,40);
  assert.deepEqual(r.gapCapturedPct,{actions:50,klmDeciSec:25});
  assert.deepEqual(r.missingBefore,[{day:2,task:'new'}]);assert.deepEqual(r.missingAfter,[{day:2,task:'missing'}]);
  assert.equal(compareDays([{before:{...b,floor:[]},after:a}]).gapCapturedPct.actions,null);
  assert.equal(compareDays([{before:day([task('paired',2,20)],[task('paired',2,20)]),after:day([task('paired',1,10)])}]).gapCapturedPct.actions,null);
  assert.equal(compareDays([]).gapCapturedPct.klmDeciSec,null);
  assert.throws(()=>compareDays([{before:{...b,persona:'P2'},after:a}]),/mismatch/);
});

test('reproduces all retained audit table values on the explicit days 2–10 cohort', {skip:!existsSync('runs/core-10day/decisions')}, async()=>{
  const r=await reportAgentBenefit('runs/core-10day',{days:[2,3,4,5,6,7,8,9,10]});
  assert.deepEqual(r.rows.map(row=>[
    row.persona, row.savedPct.actions.toFixed(1),Math.round(row.alertSharePct),Math.round(row.gapCapturedPct.klmDeciSec),
    row.effortVsFloor.before.toFixed(1),row.effortVsFloor.after.toFixed(1),Math.round(row.gapCapturedPct.actions),
  ]),[
    ['P1','10.7',10,8,'4.2','3.8',14],['P2','8.2',4,8,'3.8','3.5',11],['P3','5.6',0,2,'3.6','3.4',8],['P4','6.3',0,2,'3.2','3.0',9],['P5','1.9',23,2,'4.8','4.7',2],
  ]);
  assert.deepEqual(r.nights.outcomes,{deployed:18,'release-not-surfaced':5,'validation-rejected':9,'release-migrated':5,'no-change':8});
  assert.equal(r.nights.checkerFailures,0);assert.equal(r.nights.zeroActionSavingRejections,5);assert.equal(r.nights.nullValidationRejections,4);
  assert.equal(r.nights.migrationFallbacks,1);
  const p1=r.rows.find(row=>row.persona==='P1');
  const vendorFailures=new Set(p1.failures.filter(f=>f.side==='before').map(f=>f.task));
  const onlyAgent=p1.failures.filter(f=>f.side==='after'&&!vendorFailures.has(f.task));
  assert.equal(onlyAgent.length,7);assert.ok(onlyAgent.every(f=>f.day>=7&&f.task.includes('-W1-')));
  assert.equal(r.rows[3].saving.scrolls,752);assert.equal(r.rows[3].saving.clicks,12);
  const blind=await reportAgentBenefit('runs/core-10day');
  assert.deepEqual(blind.days,[2,4,6,8,10]);
});
