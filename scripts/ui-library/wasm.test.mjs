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
        // Navigation links and tabs are counted targets. The two-pane family
        // reference layout shows up to 20 at once on these screens, so its
        // request names a limit; at the default of 15 it may be refused, by G10 only.
        for(const request of [{op:'program-paint',render,viewport},{op:'family-paint',screen,references:[{screen}],viewport,maxTargetsPerViewport:57}]) {
          const expected=layout(request),start=performance.now(),actual=wasm.call('ehr_layout',JSON.stringify(request));
          const elapsed=performance.now()-start;
          assert.equal(actual,expected,`${persona}/${screenId}/${request.op}/${viewport.w}`);
          assert.equal(JSON.parse(actual).accepted,true);
          if(request.op==='family-paint') {
            const strict=JSON.parse(layout({...request,maxTargetsPerViewport:15}));
            assert.ok(strict.accepted||strict.findings.filter(f=>!f.warning).every(f=>f.rule==='G10'),`${persona}/${screenId}`);
          }
          if(request.op==='program-paint') times.push({persona,screen:screenId,width:viewport.w/64,ms:elapsed});
        }
      }
    }
  }
  writeFileSync(process.env.TMPDIR+'/lean-painter-wasm-timing.json',JSON.stringify(times,null,2)+'\n');
  console.log(`Byte agreement: 36 paint requests; program-paint ${Math.min(...times.map(t=>t.ms)).toFixed(2)}–${Math.max(...times.map(t=>t.ms)).toFixed(2)} ms (Node WASM, includes JSON).`);
});
test('WASM uses the native proved keyboard transitions, including manual activation and dialog close',()=>{
  for(const profile of ['tabs','listbox','dialog','alert-dialog','grid']) for(const key of ['left','right','up','down','home','end','ctrlHome','ctrlEnd','enter','space','tab','shiftTab','escape']) {
    const input={op:'keyboard',profile,key,rows:2,cols:3,state:{focus:4,selected:1,isOpen:true,invoker:'sign'}};
    assert.equal(wasm.call('ehr_layout',JSON.stringify(input)),layout(input));
  }
});
test('layout errors fail identically, including uncovered custom families and unsupported viewports',()=>{
  for(const request of [{op:'program-paint',render:{}},{op:'family-paint',references:[],screen:{banner:[],nav:[],title:'Uncovered',workspace:[],side:[],modal:null}},{op:'keyboard',profile:'tabs',state:{},key:'bad'}])
    assert.equal(wasm.call('ehr_layout',JSON.stringify(request)),layout(request));
});
test('native and WASM agree on every display formatter over a mixed corpus',()=>{
  // Wording is decided in Lean; the browser runs the same functions as WASM.
  const names=['cleanClinicalText','clinicalName','clinicalUnit','unit','observationValue','clinicalStatus','encounterClass','ageSex','clinicalDuration','clinicalTime','clinicalTimestamp','utcMinute','formatSig','allergyDisplay','formatClinicalRecord','compactVitalRecord','sectionCaption','fieldCaption','controlCaption','columnCaption','provenance','displayValue','statusTone','resultTone','sectionTone','emptyInfo'];
  const corpus=['','1','7','12/','12345678','123456789','47839287','abc','12 min','165 min','83 / F','58 / M','1.5','13.777','0.0123','<0.005','2024-01-05','2026-02-29','2026-11-02T06:00:18-08:00','2026-11-02 06:00 -08:00','Nov 2, 2026 06:00','Feb 29, 2026 06:00','lisinopril 10 MG Oral Tablet — 1, 1x per 1 d','Amoxicillin 250 MG Oral Capsule','1, 2x per 6 h','Twice a day','Body Weight 70.5 kg (Nov 2, 2026 06:00)','BP 136/82 mm[Hg] (today)','No known allergy (situation)','NKDA','Penicillin — anaphylaxis','H&P update (day of surgery)','Visit Diagnosis (ICD-10-CM)','Template: Brief op note (human entry)','Confirm prefilled value','Open chart: Ada','record:weightToday','Completed · 10:00','due-soon','HH','29385581','-5','a/b','/','Hemoglobin [Mass/volume] in Blood','Glucose [Mass/volume] in Serum or Plasma','mm[Hg]','Cel','AMB','Élodie 患者 שלום 🧬','line one\nline two','   spaced   out   '];
  const requests=names.flatMap(name=>corpus.map(text=>({op:'format',name,args:[text]})));
  for(const pair of [['Age / sex','83 / F'],['MRN','47839287'],['Allergies','No allergy records on file'],['Language',''],['Weight','93.4 kg · Apr 22, 2026 13:28']]) requests.push({op:'format',name:'bannerField',args:pair});
  for(const args of [['currentMeds','Instructions','1, 2x per 1 d'],['labs','Value','13.777'],['entryTimes','Observed','29385581'],['notes','Text','active (disorder)']]) requests.push({op:'format',name:'cellText',args});
  for(const args of [['flag','true'],['observation-time','29385581'],['code','Gingivitis (disorder)'],['text','abc']]) requests.push({op:'format',name:'fieldValue',args});
  for(const request of requests) assert.equal(wasm.call('ehr_layout',JSON.stringify(request)),layout(request),JSON.stringify(request));
  assert.equal(JSON.parse(layout({op:'format',name:'ageSex',args:['83 / F']})).text,'83 y.o. F');
  console.log(`Formatter agreement: ${requests.length} native/WASM comparisons.`);
});
test('native and WASM list the same display parts for P1/P3 screens',()=>{
  const spec=json('releases/v3/spec.json');
  const file=readdirSync('fixtures/synthea').filter(f=>f.endsWith('.json')&&f!=='index.json').sort()[0];
  const projection=ehr('facts',{bundle:json('fixtures/synthea/'+file),context:{today:'2026-11-15',now:600,receipts:[],record:[]}});
  let parts=0;
  for(const [persona,screens] of [['P1',['home','w1Rooming','w1MedRec','w1Hpi','w1Orders','w1Sign']],['P3',['home','w4Flowsheet']]]) {
    const program=json(`releases/v3/personas/${persona}.json`),user={id:program.owner,role:program.role};
    const initial=ehr('init',{spec,program,facts:projection.facts,user});
    for(const screenId of screens) {
      const state=screenId==='home'?initial:{...initial,screen:screenId,patientContext:{patient:projection.facts.sourcePatientId,bound:projection.facts.sourcePatientId,activity:'chart',target:screenId,query:''}};
      const request={op:'inventory',render:{spec,program,...projection,user,state}};
      const expected=layout(request);
      assert.equal(wasm.call('ehr_layout',JSON.stringify(request)),expected,`${persona}/${screenId}`);
      parts+=JSON.parse(expected).inventory.length;
    }
  }
  assert.ok(parts>1500,`compared ${parts} parts`);
  console.log(`Inventory agreement: ${parts} parts on 8 screens.`);
});
test('WASM runtime ends String.toList with the empty list (wrapped and ellipsis text)',()=>{
  // Engine.textLines splits String.toList into chunks. With the runtime's
  // 32-bit list terminator (a boxed 0) the borrowed nil tail was freed twice:
  // a short wrap/ellipsis text crashed the WASM. The build patches object.cpp.
  for(const overflow of ['wrap','ellipsis']) for(const s of ['','a','abc','12/','12345678','\n','a\nb','🧬','Élodie','x'.repeat(200)]) {
    const request={tree:{type:'Text',id:'t',width:9000,height:20000,text:{key:'k',maxLength:300,maxLines:10,overflow}},content:[['k',s]],viewport:{w:92160,h:57600}};
    assert.equal(wasm.call('ehr_layout',JSON.stringify(request)),layout(request),`${overflow} ${JSON.stringify(s)}`);
  }
});
test('native and WASM agree on the window of bounded lists, its pages and its inventory',()=>{
  const record=i=>[['Test',`Test ${i}`],['Value',String(i)],['Flag',i%17===3?'H':''],['Collected','Jan 1, 2026 08:00']];
  const screen=pages=>({banner:[],nav:[['Chart',[['home','Home']]]],title:'Results',side:[],modal:null,
    workspace:[{info:{comp:'results',label:'Results',infoId:'resultDetail',display:'table',rows:Array.from({length:130},(_,i)=>record(i))}}],
    ...(pages?{pages}:{})});
  let windows=0;
  for(const pages of [undefined,[['results',2]],[['results',99]]]) for(const window of [undefined,false,{size:7},{sizes:[['results',33]]}]) {
    for(const op of ['window','inventory']) {
      const request={op,screen:screen(pages),...(window===undefined?{}:{window})};
      const expected=layout(request);
      assert.equal(wasm.call('ehr_layout',JSON.stringify(request)),expected,JSON.stringify(request).slice(0,120));
      if(op==='window')windows+=(JSON.parse(expected).screen.windows??[]).length;
    }
  }
  assert.equal(windows,9);
});
