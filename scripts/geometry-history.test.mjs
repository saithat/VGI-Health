import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {archiveStaleGeometry} from './geometry-history.mjs';
const program='1'.repeat(64),components='2'.repeat(64),current='3'.repeat(64),previous='4'.repeat(64);
async function workspace(run) {
  const dir=await mkdtemp(join(tmpdir(),'geometry-history-'));
  try{await mkdir(join(dir,'geometry'));await run(dir);}finally{await rm(dir,{recursive:true,force:true});}
}
test('current atlas bindings remain in place without creating history',()=>workspace(async dir=>{
  const file=join(dir,'geometry',`${program}.${components}.json`);
  const bytes=JSON.stringify({programHash:program,componentsSha256:components,appSha256:current});
  await writeFile(file,bytes);
  assert.equal(await archiveStaleGeometry(dir,current),null);
  assert.equal(await readFile(file,'utf8'),bytes);
}));
test('a renderer change preserves the complete old generation and starts an empty namespace',()=>workspace(async dir=>{
  const filename=`${program}.${components}.json`,bytes=JSON.stringify({programHash:program,componentsSha256:components,appSha256:previous});
  await writeFile(join(dir,'geometry',filename),bytes);
  await mkdir(join(dir,'geometry','slices'));await writeFile(join(dir,'geometry','slices','task.json'),'retained task slice');
  const receipt=await archiveStaleGeometry(dir,current);assert.ok(receipt);
  assert.deepEqual(await readdir(join(dir,'geometry')),[]);
  assert.equal(await readFile(join(dir,receipt.archivedDirectory,filename),'utf8'),bytes);
  assert.equal(await readFile(join(dir,receipt.archivedDirectory,'slices','task.json'),'utf8'),'retained task slice');
  assert.deepEqual(receipt.incompatible,[filename]);assert.equal(receipt.files.length,1);
  assert.equal(await archiveStaleGeometry(dir,current),null);
}));
test('legacy or mismatched component bindings are preserved instead of merged',()=>workspace(async dir=>{
  const filename=`${program}.${components}.json`;
  await writeFile(join(dir,'geometry',filename),JSON.stringify({programHash:program,appSha256:current}));
  const receipt=await archiveStaleGeometry(dir,current);assert.ok(receipt);
  assert.deepEqual(receipt.incompatible,[filename]);
  assert.equal(JSON.parse(await readFile(join(dir,receipt.archivedDirectory,filename),'utf8')).appSha256,current);
}));
