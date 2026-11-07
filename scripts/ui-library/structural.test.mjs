import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
const binary=resolve('lean/.lake/build/bin/ui-layout');
const screen=n=>({banner:[['Patient','Élodie 患者 שלום']],nav:[],title:'Records',side:[],modal:null,
  workspace:Array.from({length:n},(_,i)=>i%2?{field:{comp:String(i),label:'Capture',kind:'text',value:'W'.repeat(i),unit:null,provenance:null,pendingConfirm:false,humanOnly:false,required:false}}:{info:{comp:String(i),label:'Review',infoId:'review',display:'table',rows:[[['Value','record '.repeat(i)]]]}})});
function run(screen,viewport={w:92160,h:57600}) {
  const p=spawnSync(binary,[],{input:JSON.stringify({op:'structural-paint',screen,viewport})+'\n',encoding:'utf8',maxBuffer:64*1024*1024});
  assert.equal(p.status,0,p.stderr);const result=JSON.parse(p.stdout);assert.ok(!result.error||result.uncoveredShape,result.error);return result;
}
test('one repeat-body class paints arbitrary list counts, targets and record lengths',()=>{
  for(const n of [0,1,2,50,300]) for(const viewport of [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}]) {
    const out=run(screen(n),viewport);
    assert.equal(out.accepted,true,JSON.stringify(out));
    assert.equal(out.boxes.filter(d=>d.box.info.source!==null).length,n+3);
    assert.equal(new Set(out.boxes.map(d=>d.box.info.id)).size,out.boxes.length);
    assert.equal(out.boxes.filter(d=>d.box.info.target).length,Math.floor(n/2));
    assert.ok(out.boxes.filter(d=>d.box.info.source!==null).every(d=>d.box.info.text.safety&&d.box.info.text.overflow==='scroll'));
  }
});
test('fixed commits satisfy G9 with and without a two-occurrence modal',()=>{
  const commit=screen(30);commit.workspace.push({button:{comp:'sign',label:'Sign',role:'primary',enabled:false,blockedReason:'Required review '.repeat(1000),hotkey:null}});
  for(const viewport of [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}]) {
    for(const modal of [null,{section:{id:'alert',title:'Interruptive alert '.repeat(500),children:[{button:{comp:'ack',label:'Acknowledge',role:'ack',enabled:true,blockedReason:null,hotkey:null}}]}}]) {
      const out=run({...commit,modal},viewport);assert.equal(out.accepted,true);
      const fixed=out.boxes.filter(d=>d.box.info.commit);assert.equal(fixed.length,1);
      assert.equal(fixed[0].box.info.target,true);assert.deepEqual(fixed[0].box.clips,[]);
      const rect=fixed[0].box.rect;assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.w<=viewport.w&&rect.y+rect.h<=viewport.h);
      assert.equal(fixed[0].original.includes('Required review '.repeat(1000)),true);
      const alerts=out.boxes.filter(d=>d.box.info.interruptive);assert.equal(alerts.length,modal?2:0);
      for(const alert of alerts) { assert.deepEqual(alert.box.clips,[]);assert.ok(alert.box.style.z>fixed[0].box.style.z); }
    }
  }
});
test('oversized modal grammars and unsupported viewports decline',()=>{
  const modal=screen(0);modal.modal={section:{id:'alert',title:'Alert',children:[0,1].map(i=>({button:{comp:'ack'+i,label:'Acknowledge',role:'ack',enabled:true,blockedReason:null,hotkey:null}}))}};
  assert.equal(run(modal).accepted,false);
  assert.equal(run(screen(0),{w:64000,h:48000}).accepted,false);
});
