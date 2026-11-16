import assert from 'node:assert/strict';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { loadEhrInterp } from '../../wasm/dist/interp-loader.mjs';
const wasm=await loadEhrInterp();
const json=path=>JSON.parse(readFileSync(path,'utf8'));
function native(binary,args,input) {
  const p=spawnSync(resolve('lean/.lake/build/bin',binary),args,{input:JSON.stringify(input)+'\n',encoding:'utf8',maxBuffer:64*1024*1024});
  assert.equal(p.status,0,p.stderr);return p.stdout.trimEnd();
}
const layout=input=>native('ui-layout',[],input);
const ehr=(op,input)=>JSON.parse(native('ehr',[op],input));
test('native and WASM program/family paint are byte-identical across P1/P3 screens and viewports',()=>{
  assert.ok(wasm.exports.includes('ehr_layout'));
  const spec=json('releases/v3/spec.json');
  const file=readdirSync('fixtures/synthea').filter(f=>f.endsWith('.json')&&f!=='index.json').sort()[0];
  assert.ok(file,'restored local synthetic fixtures are required');
  const projection=ehr('facts',{bundle:json('fixtures/synthea/'+file),context:{today:'2026-11-15',now:600,receipts:[],record:[]}});
  const times=[];
  for(const [persona,screens] of [['P1',['home','w1Rooming','w1Orders','w1Sign']],['P3',['home','w4Flowsheet']]]) {
    const program=json(`releases/v3/personas/${persona}.json`),user={id:program.owner,role:program.role};
    const initial=ehr('init',{spec,program,facts:projection.facts,user});
    for(const screenId of screens) {
      const state=screenId==='home'?initial:{...initial,screen:screenId,patientContext:{patient:projection.facts.sourcePatientId,bound:projection.facts.sourcePatientId,activity:'chart',target:screenId,query:''}};
      const render={spec,program,...projection,user,state};
      const screen=ehr('render-ui',render);
      for(const viewport of [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}]) {
        for(const request of [{op:'program-paint',render,viewport},{op:'family-paint',screen,references:[{screen}],viewport}]) {
          const expected=layout(request),start=performance.now(),actual=wasm.call('ehr_layout',JSON.stringify(request));
          const elapsed=performance.now()-start;
          assert.equal(actual,expected,`${persona}/${screenId}/${request.op}/${viewport.w}`);
          assert.equal(JSON.parse(actual).accepted,true);
          if(request.op==='program-paint') times.push({persona,screen:screenId,width:viewport.w/64,ms:elapsed});
        }
      }
    }
  }
  writeFileSync(process.env.TMPDIR+'/lean-painter-wasm-timing.json',JSON.stringify(times,null,2)+'\n');
  console.log(`Byte agreement: 36 paint requests; program-paint ${Math.min(...times.map(t=>t.ms)).toFixed(2)}–${Math.max(...times.map(t=>t.ms)).toFixed(2)} ms (Node WASM, includes JSON).`);
});
test('WASM uses the native proved keyboard transitions, including manual activation and dialog close',()=>{
  for(const profile of ['tabs','listbox','dialog','grid']) for(const key of ['left','right','up','down','home','end','ctrlHome','ctrlEnd','enter','space','tab','shiftTab','escape']) {
    const input={op:'keyboard',profile,key,rows:2,cols:3,state:{focus:4,selected:1,isOpen:true,invoker:'sign'}};
    assert.equal(wasm.call('ehr_layout',JSON.stringify(input)),layout(input));
  }
});
test('layout errors fail identically, including uncovered custom families and unsupported viewports',()=>{
  for(const request of [{op:'program-paint',render:{}},{op:'family-paint',references:[],screen:{banner:[],nav:[],title:'Uncovered',workspace:[],side:[],modal:null}},{op:'keyboard',profile:'tabs',state:{},key:'bad'}])
    assert.equal(wasm.call('ehr_layout',JSON.stringify(request)),layout(request));
});
