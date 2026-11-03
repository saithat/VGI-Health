/** Exhaust the emitted cohort-view corpus at both widths; never samples a subset. */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { startLab, paint } from '../app/scripts/exotic-gate.mjs';
import { gateOrdinary } from '../app/scripts/promote-gate.mjs';
import { write } from './evaluate.ts';
import { digest } from './cohort.ts';
const out=process.argv[2]??'runs/promote-round2';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const exportsOnly=process.argv.includes('--exports-only');
const incremental=process.argv.includes('--incremental');
const files=(await readdir(`${out}/views`)).filter(f=>f.endsWith('.json')&&(!exportsOnly||f.includes('-export-'))).sort();
assert.ok(files.length);
const protocol=JSON.parse(await readFile(`${out}/protocol.json`,'utf8'));
const manifest=JSON.parse(await readFile('app/public/ehr/manifest.json','utf8'));
const rendererFiles=[];
async function collect(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await collect(f);else if(/\.(tsx?|css)$/.test(f))rendererFiles.push(f);}}
await collect('app/src/ehr');
assert.equal(digest(await Promise.all(rendererFiles.sort().map(async f=>[f,digest(await readFile(f,'utf8'))]))),protocol.rendererSourceHash,'Renderer changed after the cohort protocol');
assert.deepEqual(JSON.parse(await readFile('app/dist/build.json','utf8')),protocol.build,'App binding changed');
assert.equal(manifest.assets['ehr-interp.wasm'],protocol.wasmSha256,'WASM binding changed');
const context=digest([protocol.rendererSourceHash,protocol.build,manifest.assets,await readFile('app/scripts/promote-gate.mjs','utf8')]);
let completed={};try{const old=JSON.parse(await readFile(`${out}/ordinary-view-cache.json`,'utf8'));if(old.context===context)completed=old.completed;}catch(error){if(error.code!=='ENOENT')throw error;}
const lab=await startLab(),coverage=[];
try{
 const pages=await Promise.all([1440,390].map(async width=>{const page=await lab.browser.newPage({viewport:{width,height:900}});await page.goto(lab.url);return{width,page};}));
 for(const file of files){
  const view=JSON.parse(await readFile(`${out}/views/${file}`,'utf8'));
  const hash=digest(view);
  if(!completed[hash]){for(const {width,page}of pages){await paint(page,view);await gateOrdinary(page,view);}
   completed[hash]=true;
  }
  coverage.push({file,sha256:digest(view),widths:[1440,390]});
  if(coverage.length%100===0){process.stderr.write(`[promotion coverage] ${coverage.length}/${files.length}\n`);await write(`${out}/ordinary-view-cache.json`,{context,completed});}
 }
 await write(`${out}/ordinary-view-cache.json`,{context,completed});
 if(exportsOnly||incremental){await write(`${out}/${exportsOnly?'export':'incremental'}-ordinary-coverage.json`,{context,views:files.length,checks:files.length*2,coverage,partial:incremental});console.log(JSON.stringify({views:files.length,checks:files.length*2,partial:incremental}));}else{
 const report=JSON.parse(await readFile(`${out}/round2-report.json`,'utf8'));
 assert.equal(report.phase,'complete');
 for(const row of report.rows){row.screen={...row.screen,status:'pass',views:coverage.filter(c=>c.file.startsWith(row.id)).length,widths:[1440,390],scope:'Every emitted cohort view and composed native export, complete source rows, independent accessibility projection and sampled urgency exposure'};row.certified=false;}
 for(const [key,row]of Object.entries(report.archive)){const current=report.rows.find(r=>r.id===row.id);assert.ok(current);report.archive[key]=current;}
 await write(`${out}/round2-report.json`,report);
 await write(`${out}/promotion-coverage.json`,{views:files.length,checks:files.length*2,coverage,scope:'All emitted cohort views; general geometry remains conditional on exposure evidence. No deployment certificate.'});
 console.log(JSON.stringify({views:files.length,checks:files.length*2}));
 }
}finally{await lab.close();}
