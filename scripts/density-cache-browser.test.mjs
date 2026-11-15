// Targeted browser integration: admission must reapply limits on raw-cache hits.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {acquireBrowserLock} from './browser-heavy-lock.mjs';
const root=resolve(import.meta.dirname,'..');
const read=async file=>JSON.parse(await readFile(file,'utf8'));
test('R5 reuses raw candidate counts but refuses or admits under the actual reference', {timeout:3_600_000},async()=>{
 const lock=await acquireBrowserLock();
 const out=await mkdtemp(join(tmpdir(),'r5-cache-browser-'));
 try {
  const candidate=join(root,'app/src/fixtures/ui/w1Rooming.json');
  const tree=await read(candidate);
  const sparse=join(out,'sparse.json');
  await writeFile(sparse,JSON.stringify({...tree,workspace:[]}));
  const manifests={sparse:join(out,'sparse-manifest.json'),self:join(out,'self-manifest.json')};
  await writeFile(manifests.sparse,JSON.stringify([sparse]));
  await writeFile(manifests.self,JSON.stringify([candidate]));
  for(const [trial,reference,exit] of [['cold','sparse',1],['warm-self','self',0],['warm-sparse','sparse',1]]) {
   const output=join(out,`${trial}.json`);
   const result=spawnSync(process.execPath,[join(root,'app/scripts/screen-check.mjs'),'--ui',candidate],{
    cwd:root,encoding:'utf8',maxBuffer:10*1024**2,env:{...process.env,CI:'true',EHR_SCREEN_WORKERS:'4',
     EHR_PHYSICAL_POLICY:'0',EHR_SCREEN_CACHE:'1',EHR_SCREEN_CACHE_DIR:join(out,'cache'),EHR_SCREEN_RESULT:output,
     EHR_SCREEN_REFERENCE_MANIFEST:manifests[reference],EHR_REFERENCE_PRESENTATION_BUNDLE:'',EHR_PRESENTATION_BUNDLE:''},
   });
   assert.equal(result.status,exit,`${trial}: ${result.stdout.slice(-1500)}\n${result.stderr.slice(-1500)}`);
   const report=await read(output);
   assert.equal(report.controlsStatus,'pass');
   assert.equal(report.cache.hits,trial==='cold'?0:1);
   assert.equal(report.densityFailures.length>0,exit===1);
   if(exit===1) {
    const failure=report.densityFailures[0];
    assert.equal(failure.screen,tree.screen);
    assert(failure.measured>failure.limit);
    assert.match(failure.message,/R5 .*: \d+ active targets > limit \d+/);
   }
   if(trial==='warm-sparse')assert.equal(report.densityReference.measured,0);
  }
 } finally {await rm(out,{recursive:true,force:true});lock.release();}
});
