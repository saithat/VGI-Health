/** A bad pane in a non-first worker must fail the whole parallel corpus gate. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const run=process.argv[2]??'runs/promote-review-v3';
assert.ok(path.resolve(run).startsWith(path.resolve('runs')+path.sep),'Use ignored runs/');
const files=(await readdir(`${run}/views`)).filter(f=>f.startsWith('r2-007-')).sort();
let view;
for(const file of files){
 const candidate=JSON.parse(await readFile(`${run}/views/${file}`,'utf8'));
 if(candidate.panes.every(p=>p.screen.banner.length&&!p.screen.modal)){view=candidate;break;}
}
assert.ok(view,'Bound board fixture');
const out=await mkdtemp(`${run}/parallel-negative-`);
await mkdir(`${out}/views`);await copyFile(`${run}/protocol.json`,`${out}/protocol.json`);
for(const file of ['a.json','b.json','c.json']){
 const candidate=structuredClone(view);
 if(file==='b.json'){
  const banner=candidate.ordinary.board.children[0].patientPane.banner.find(([key])=>key==='Patient');
  assert.ok(banner);banner[1]='Incorrect pane identity';
 }
 await writeFile(`${out}/views/${file}`,JSON.stringify(candidate));
}
const result=spawnSync('node',['--import','./agent/node_modules/tsx/dist/loader.mjs','explore/promote-coverage.mjs',out,'--incremental'],
 {encoding:'utf8',env:{...process.env,EHR_ORDINARY_WORKERS:'3'},timeout:120000,maxBuffer:5000000});
assert.equal(result.error,undefined);assert.notEqual(result.status,0);
assert.match(result.stderr,/Ordinary view batch/);assert.match(result.stderr,/Wrong banner/);
assert.equal(existsSync(`${out}/incremental-ordinary-coverage.json`),false,'No successful report after a failed worker');
await writeFile(`${out}/rejection.log`,result.stderr);
const evidence={status:'pass',fixture:out,workers:3,pages:6,childExit:result.status,wrongPaneInSecondWorker:'rejected',successfulReport:false};
await writeFile(`${run}/parallel-negative-check.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
