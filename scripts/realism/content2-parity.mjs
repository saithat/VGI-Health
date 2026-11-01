import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
const root=resolve(import.meta.dirname,'../..');
const wasm=await loadEhrInterp();
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const native=(command,input)=>JSON.parse(execFileSync(`${root}/lean/.lake/build/bin/ehr`,[command],{input:JSON.stringify(input),maxBuffer:48e6}));
let cases=0;
for(const file of readdirSync(`${root}/.cache/content2/after`).filter(f=>f.endsWith('-facts-input.json'))){
  const name=file.replace('-facts-input.json','');
  const factsInput=read(`${root}/.cache/content2/after/${file}`);
  const projection=native('facts',factsInput);
  assert.deepEqual(JSON.parse(wasm.facts(JSON.stringify(factsInput))),projection,`${name}: facts`);
  const input=read(`${root}/.cache/content2/after/${name}-input.json`);
  assert.deepEqual(JSON.parse(wasm.call('ehr_render_ui',JSON.stringify(input))),native('render-ui',input),`${name}: semantic UI`);
  if(name==='p4-rooming'){
    const weight=input.program.screens.find(s=>s.id===input.state.screen).components.find(c=>c.kind.field?.element==='weight');
    const confirmed=native('step',{...input,event:{confirm:{comp:weight.id}}});
    assert.equal(confirmed.result,'ok');
    assert.ok(confirmed.state.captured.some(c=>c.element==='weight'&&c.confirmed&&c.value.qty.tenths===157));
    assert.ok(!confirmed.state.captured.some(c=>c.element==='patientIdReentry'));
  }
  cases++;
}
const report={cases,nativeWasmFactComparisons:cases,nativeWasmUiComparisons:cases,weightConfirmation:'Recorded kg weight requires human confirmation; identity stays human-only',mismatches:0};
writeFileSync(`${root}/docs/measurements/content2/native-wasm.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
