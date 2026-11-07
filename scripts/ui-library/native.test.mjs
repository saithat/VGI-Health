import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { requests, template, adversarial } from './cases.mjs';
const binary = resolve('lean/.lake/build/bin/ui-layout');
export function native(input) {
  const p=spawnSync(binary, [], {input:JSON.stringify(input)+'\n', encoding:'utf8', maxBuffer:32*1024*1024});
  assert.equal(p.status,0,p.stderr);
  const result=JSON.parse(p.stdout);
  assert.equal(result.error,undefined,result.error);
  return result;
}
test('all supported desktop sizes accept a complete bounded template',()=>{
  for(const r of requests) { const out=native(r); assert.equal(out.accepted,true,JSON.stringify(out.findings)); }
});
test('free geometry and colors parse, then fail the independent gate',()=>{
  const out=native(adversarial()); assert.equal(out.accepted,false);
  for(const rule of ['G1','G3','G5','G6','G7']) assert.ok(out.findings.some(x=>x.rule===rule),rule);
});
test('unbounded safety content never moves geometry or fails length/glyph validation',()=>{
  const r=template(); const first=native(r);
  r.content[0][1]='W'.repeat(128);
  assert.deepEqual(native(r).boxes.map(x=>x.box),first.boxes.map(x=>x.box));
  r.content[0][1]='W'.repeat(70000); const long=native(r);
  assert.equal(long.accepted,true); assert.equal(long.boxes.find(d=>d.box.info.id==='patient-banner').original,r.content[0][1]);
  assert.equal(long.boxes.find(d=>d.box.info.id==='patient-banner').lines.join(''),r.content[0][1]);
  r.content[0][1]='unsupported 🧬'; const escaped=native(r);
  assert.equal(escaped.accepted,true);assert.ok(escaped.findings.some(x=>x.metric==='codepoint-escape'&&x.warning));
  assert.ok(escaped.boxes.find(d=>d.box.info.id==='patient-banner').lines.join('').includes('[U+01F9EC]'));
  r.tree.children[0].text.safety=false;
  assert.ok(native(r).findings.some(x=>x.metric==='unsupported-font-glyph'));
  r.content[0][1]='W'.repeat(129); assert.equal(native(r).accepted,false);
});
test('safety critical ellipsis rejected; ordinary ellipsis accepted',()=>{
  const r=template(); r.tree.children[0].text.overflow='ellipsis'; assert.equal(native(r).accepted,false);
  r.tree.children[0].text.safety=false; assert.equal(native(r).accepted,true);
});
test('components, variants and slots expand and cycles fail closed',()=>{
  const r=template(); const original=r.tree.children[2];
  r.components={Action:{variants:{primary:{type:'Slot',name:'control'}}}};
  r.tree.children[2]={type:'Component',name:'Action',variant:'primary',slots:{control:original}};
  assert.equal(native(r).accepted,true);
  r.components.Action={type:'Component',name:'Action'};
  const p=spawnSync(binary,[],{input:JSON.stringify(r)+'\n',encoding:'utf8'});
  assert.match(JSON.parse(p.stdout).error,/cycle/);
});
test('APG transitions use native Lean semantics',()=>{
  const state={focus:0,selected:0,isOpen:true,invoker:'open-dialog'};
  const run=(profile,key,focus=0)=>native({op:'keyboard',profile,key,state:{...state,focus},rows:2,cols:3});
  assert.equal(run('tabs','left').focus,5);
  assert.equal(run('tabs','right').selected,0);
  assert.equal(run('tabs','enter',4).selected,4);
  assert.equal(run('dialog','shiftTab').focus,5);
  assert.equal(run('dialog','escape').isOpen,false);
  assert.equal(run('listbox','down').selected,1);
  assert.equal(run('grid','right',2).focus,2);
  assert.equal(run('grid','down',2).focus,5);
});
test('modal z, text occlusion, reading order and current commit failures are explicit',()=>{
  const r=template();
  r.tree.children.push({type:'Text',id:'interruptive',interruptive:true,position:{x:2048,y:12800},width:19200,height:6144,z:0,text:{key:'alert',maxLength:48,maxLines:3,overflow:'scroll',safety:true,font:0,fontSize:896,lineHeight:1408}});
  r.content.push(['alert','Critical allergy review']);
  assert.ok(native(r).findings.some(f=>f.rule==='G2'));
  r.tree.children.at(-1).z=100;
  assert.equal(native(r).accepted,true);
  const covered=template();
  covered.tree.children.push({type:'Rect',id:'occluder',position:{x:1024,y:7168},width:12800,height:6400,z:100});
  assert.ok(native(covered).findings.some(f=>f.rule==='G4'));
  const reordered=template();
  reordered.tree.children.push({type:'Text',id:'out-of-order',z:10,position:{x:1024,y:6400},width:6400,height:1280,text:{key:'short',maxLength:4,maxLines:1,overflow:'wrap',safety:false,font:0,fontSize:896,lineHeight:1408}});
  assert.ok(native(reordered).findings.some(f=>f.rule==='G8'));
  const missing=template();missing.tree.children[2].commit=false;
  assert.equal(native(missing).accepted,true);
  const offscreen=template();offscreen.tree.children[2].position.y=900*64;
  assert.ok(native(offscreen).findings.some(f=>f.rule==='G9'&&!f.warning));
});
test('familiar spacing, palette, radius and type-scale tokens resolve in Lean',()=>{
  const r=template();r.tree.children[0].bg='slate-100';r.tree.children[2].bg='blue-700';r.tree.children[2].fg='white';r.tree.children[2].radius='rounded';
  r.tree.children[2].text={key:'sign',maxLength:8,maxLines:1,overflow:'wrap',safety:false,font:'sans-400',typeScale:'text-sm'};
  assert.equal(native(r).accepted,true);
  r.tree.children[2].fg='unknown-palette-value';
  const p=spawnSync(binary,[],{input:JSON.stringify(r)+'\n',encoding:'utf8'});
  assert.match(JSON.parse(p.stdout).error,/unknown palette token/);
});

test('safety text requires its own unbounded vertical wrap viewport',()=>{
  const r=template();r.tree.children[0].text.overflow='wrap';
  assert.ok(native(r).findings.some(f=>f.metric==='unbounded-safety-requires-vertical-wrap'));
});
test('mixed fixed and weighted grid tracks are placed by Lean',()=>{
  const r=template();
  r.tree.children[1].children.push({type:'Grid',id:'mixed',width:61440,tracks:[6400,'1fr',{fr:2}],gap:640,children:[0,1,2].map(i=>({type:'Rect',id:`mixed-${i}`,width:'fill',height:1536}))});
  const out=native(r);assert.equal(out.accepted,true,JSON.stringify(out.findings));
  assert.deepEqual([0,1,2].map(i=>out.boxes.find(d=>d.box.info.id===`mixed-${i}`).box.rect.w),[6400,17920,35840]);
  const bad=template();bad.tree.children[1].children.push({type:'Grid',id:'overflow-grid',width:12800,tracks:[128000,'1fr'],children:[{type:'Rect',id:'overflow-track',width:'fill',height:1536}]});
  assert.ok(native(bad).findings.some(f=>f.rule==='G5'));
});
