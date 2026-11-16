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

const strip=(alerts,buttons=1)=>[...Array.from({length:alerts},(_,i)=>({alert:{comp:'urgent:'+i,alertId:'a'+i,label:'Allergy '+i+' '+'W'.repeat(400),severity:'interruptive'}})),
  ...Array.from({length:buttons},(_,i)=>({button:{comp:'a'+i,label:'Acknowledge',role:'ack',enabled:true,blockedReason:null,hotkey:null}}))];
const notice={section:{id:'notice',title:'Notice',children:[{button:{comp:'notice',label:'Acknowledge',role:'ack',enabled:true,blockedReason:null,hotkey:null}}]}};
const inside=(v,r)=>r.x>=0&&r.y>=0&&r.x+r.w<=v.w&&r.y+r.h<=v.h;
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
test('urgent alerts are pinned by the fixed shell: fixed, in view and clear of every other box, also beside a modal',()=>{
  for(const viewport of [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}]) for(const modal of [null,notice]) {
    const out=run({...screen(40),modal,urgent:strip(3)},viewport);
    assert.equal(out.accepted,true,JSON.stringify(out.findings));assert.equal(out.urgentPinned,true);
    const pinned=out.boxes.filter(d=>d.box.info.urgent);assert.equal(pinned.length,4);
    assert.equal(pinned.filter(d=>d.box.info.target).length,1);
    for(const d of pinned) {
      assert.deepEqual(d.box.clips,[]);assert.ok(inside(viewport,d.box.rect));
      assert.ok(d.box.info.text.fontSize>=768&&d.box.info.text.safety);
      for(const other of out.boxes) if(other!==d&&other.box.info.paint) {
        // A scrolling box can reach any position of its scroll viewport.
        const reach=other.box.clips.length?other.box.clips.at(-1)[1]:other.box.rect;
        assert.equal(overlap(d.box.rect,reach),false,d.box.info.id+' / '+other.box.info.id);
      }
    }
    assert.ok(pinned[0].original.includes('W'.repeat(400)));
    assert.equal(out.boxes.filter(d=>d.box.info.interruptive).length,modal?2:0);
  }
});
test('an urgent strip beyond the pinned capacity is refused with counts, never painted as accepted',()=>{
  assert.equal(run({...screen(4),urgent:strip(5)}).accepted,true);
  const many=run({...screen(4),urgent:strip(6)});
  assert.equal(many.accepted,false);assert.equal(many.urgentPinned,false);
  assert.deepEqual(many.findings.filter(f=>f.rule==='G11').map(f=>[f.metric,f.actual,f.required]),[['urgent-strip-capacity',7,6]]);
  assert.equal(many.boxes.filter(d=>d.box.info.urgent).length,0);
  const buttons=run({...screen(4),urgent:strip(1,3)});
  assert.equal(buttons.accepted,false);
  assert.deepEqual(buttons.findings.filter(f=>f.rule==='G11').map(f=>[f.metric,f.actual,f.required]),[['urgent-strip-targets',3,2]]);
});
test('fixed-shell density counts the commit and pinned strip targets with every body window',()=>{
  const dense=screen(60);dense.workspace=dense.workspace.map((n,i)=>({field:{comp:String(i),label:'Capture',kind:'text',value:'',unit:null,provenance:null,pendingConfirm:false,humanOnly:false,required:false}}));
  dense.workspace.push({button:{comp:'sign',label:'Sign',role:'primary',enabled:true,blockedReason:null,hotkey:null}});
  const out=run({...dense,urgent:strip(2,2)});assert.equal(out.accepted,true);
  const rows=out.boxes.filter(d=>d.box.info.target&&d.box.clips.length),fixed=out.boxes.filter(d=>d.box.info.target&&!d.box.clips.length);
  assert.equal(fixed.length,3);
  const clip=rows[0].box.clips[0][1];let worst=0;
  for(const r of rows) { const o=r.box.rect.y+r.box.rect.h-1-clip.y; worst=Math.max(worst,rows.filter(q=>q.box.rect.y<clip.y+clip.h+o&&q.box.rect.y+q.box.rect.h>clip.y+o).length); }
  assert.equal(worst,12);assert.ok(worst+fixed.length<=15);
});
test('navigation links and tabs are separate target boxes; the signed-in clinician is in the banner',()=>{
  const chrome={...screen(2),viewer:'Registered nurse',nav:[['Chart',[['goOrders','Orders'],['goNotes','Notes']]],['Tools',[['goSearch','Search']]]]};
  chrome.workspace.unshift({tabs:{id:'panel',labels:['Vitals','Labs','Notes'],selected:1,body:[{text:{s:'Labs body'}}]}});
  const out=run(chrome);assert.equal(out.accepted,true,JSON.stringify(out.findings));
  const at=path=>out.boxes.find(d=>d.box.info.source?.join('.')===path);
  assert.ok(at('0').original.endsWith('Signed in: Registered nurse'));
  assert.deepEqual(['2','2.0','2.1'].map(p=>[at(p).box.info.target,at(p).original]),[[false,'Navigation'],[false,'Chart'],[false,'Tools']]);
  for(const [path,label] of [['2.0.0','Orders'],['2.0.1','Notes'],['2.1.0','Search'],['3.0','Vitals'],['3.1','Labs'],['3.2','Notes']]) {
    const d=at(path);assert.equal(d.box.info.target,true,path);assert.equal(d.original,label);
    assert.ok(d.box.rect.w>=1536&&d.box.rect.h>=1536);
  }
  assert.equal(at('3').box.info.target,false);assert.equal(at('3.3').original,'Labs body');
  // Targets do not overlap, and the navigation follows the workspace in the body.
  const targets=out.boxes.filter(d=>d.box.info.target);
  for(const a of targets) for(const b of targets) if(a!==b) assert.equal(overlap(a.box.rect,b.box.rect),false);
  assert.ok(at('2').box.rect.y>at('5').box.rect.y);
  assert.ok(at('2.0.0').box.rect.y>at('2').box.rect.y);
});
