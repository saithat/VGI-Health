#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { read, write, hash } from './common.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),base=args.includes('--base')?args[args.indexOf('--base')+1]:'81691fb';
const commit=execFileSync('git',['rev-parse',base],{cwd:root,encoding:'utf8'}).trim();
const rows=[];
for(let day=1;day<=10;day++) for(const persona of ['P1','P2','P3','P4','P5']) {
  const file=`runs/world/2/day-${day}-${persona}.json`;
  const before=JSON.parse(execFileSync('git',['show',`${commit}:${file}`],{cwd:root,encoding:'utf8'}));
  const after=read(resolve(root,file));
  assert.deepEqual(after,before,`${file}: changed simulator input`);
  const alias=read(resolve(root,`runs/world/2/schedules/day-${String(day).padStart(2,'0')}/${persona}.json`));
  assert.deepEqual(alias,after,`${file}: agent schedule mismatch`);
  rows.push({day,persona,tasks:after.tasks.length,beforeSha256:hash(before),afterSha256:hash(after),identical:true});
}
const report={baselineCommit:commit,compared:'Complete DaySchedule JSON including every task id, patient, persona, day, startMin, choices, interruptions and todayResources; agent aliases also identical',schedules:rows.length,tasks:rows.reduce((n,r)=>n+r.tasks,0),changedSchedules:0,rows};
write(resolve(root,'runs/world/2/task-diff.json'),report,2);
console.log(`Task diff: ${report.schedules}/50 schedules identical; ${report.tasks}/1284 tasks identical; 0 changes (baseline ${commit}).`);
