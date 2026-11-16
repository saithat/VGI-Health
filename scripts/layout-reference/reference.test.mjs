import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {shapeFor,layoutFor,fixedShellFor,viewports} from './generator.mjs';
import {ReferenceLayouts,native,limitFor} from './admission.mjs';
import {familyFile} from './cli.mjs';
import {geometryFor,GeometryMeter} from './geometry.mjs';
import {screenRecords,NativeSession} from './recording.mjs';
import {digest} from './admission.mjs';
import {gzipSync} from 'node:zlib';
const screen=()=>({screen:'review',banner:[['Patient','Synthetic']],nav:[],title:'Review',workspace:[
  {columns:{children:[{section:{id:'left',title:'Orders',children:[{field:{comp:'dose',label:'Dose',kind:'text',value:null,unit:null,provenance:null,pendingConfirm:false,humanOnly:false,required:true}}]}},
    {section:{id:'right',title:'History',children:[{info:{comp:'history',label:'History',infoId:'history',display:'table',rows:[]}}]}}]}},
  {button:{comp:'sign',label:'Sign',role:'primary',enabled:false,blockedReason:'Review',hotkey:null}}],side:[],modal:null});
test('authoring shape agrees with native; three viewport dense family preserves all sources',()=>{
  const s=screen(),shape=shapeFor(s),references=[{screen:s,layouts:viewports.map(viewport=>({viewport,tree:layoutFor(shape,viewport)}))}];
  const check=native({op:'family-check',references});assert.deepEqual(check.shapes[0],shape.slots);assert.equal(check.accepted,true);
  s.workspace[0].columns.children[1].section.children[0].info.rows=[[['Long','🧬'.repeat(3000)]]];
  const out=native({op:'family-paint',references,screen:s});assert.equal(out.accepted,true);assert.ok(out.boxes.some(b=>b.original?.includes('🧬'.repeat(3000))));
});
test('multi-column geometry and row-count reservations are data-independent',()=>{
  const s=screen(),a=shapeFor(s);s.banner[0][1]='Other patient';s.title='Other title';assert.deepEqual(shapeFor(s),a);
  const tree=layoutFor(a,viewports[0]),body=tree.children.find(n=>n.id==='reference-body').children[0].children;
  const l=body.find(n=>n.source.join('.')==='3.0'),r=body.find(n=>n.source.join('.')==='3.1');assert.equal(l.position.y,r.position.y);assert.ok(r.position.x>l.position.x);
  assert.throws(()=>layoutFor(a,{w:1440,h:900}),/viewport/);
});
test('refused dense geometry records findings and independently admits fixed-shell fallback',()=>{
  const s=screen(),cache=new ReferenceLayouts({generator:(shape,v)=>{const tree=layoutFor(shape,v);tree.children[0].position.x=-64;return tree;}});
  const r=cache.get(s);assert.equal(r.denseAccepted,false);assert.ok(r.findings.some(f=>f.rule==='G1'));assert.equal(cache.paint(r,s).accepted,true);
  assert.equal(native({op:'family-check',references:[{screen:s,layouts:viewports.map(viewport=>({viewport,tree:fixedShellFor(shapeFor(s),viewport)}))}]}).accepted,true);
});
test('persistent cache binds geometry, threshold and native binary; corruption misses',()=>{
  const dir=mkdtempSync('/home/saithat/Projects/run-tmp/reference-test-');let calls=0;const runner=input=>{calls++;return native(input);};
  try {
    const cache=new ReferenceLayouts({cacheDir:dir,runner});cache.get(screen());assert.equal(calls,1);
    const s=screen();s.banner[0][1]='Changed';assert.equal(cache.get(s).cacheHit,true);assert.equal(calls,1);
    assert.equal(new ReferenceLayouts({cacheDir:dir,runner}).get(s).cacheHit,true);assert.equal(calls,1);
    cache.get(s,{maxTargetsPerViewport:16});assert.equal(calls,2);
    for(const file of readdirSync(dir)) writeFileSync(join(dir,file),readFileSync(join(dir,file),'utf8').replace('denseAccepted":true','denseAccepted":false'));
    assert.equal(new ReferenceLayouts({cacheDir:dir,runner}).get(s).cacheHit,false);assert.equal(calls,3);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('density uses exact persona/release screen measurement or unchanged Lean default',()=>{
  const report={programs:[{group:'vendor',id:'v1/P1',screens:[{screen:'review',maximum:8}]}]};
  assert.equal(limitFor(report,'P1','v1','review').limit,8);assert.equal(limitFor(report,'P2','v1','review').limit,15);
  assert.equal(limitFor(report,'P1','v1','new-id').limit,15);
  assert.throws(()=>new ReferenceLayouts().get(screen(),{maxTargetsPerViewport:-1}),/limit/);
});
test('native transport errors never produce cached admission or fallback success',()=>{
  const c=new ReferenceLayouts({runner:()=>{throw Error('transport failed');}});assert.throws(()=>c.get(screen()),/transport/);assert.equal(c.memory.size,0);
});
test('G10 refusal falls back without raising the policy; an impossible lower limit remains a refusal',()=>{
  const s=screen();s.workspace=Array.from({length:40},(_,i)=>({button:{comp:`b${i}`,label:`Button ${i}`,role:'secondary',enabled:true,blockedReason:null,hotkey:null}}));
  const c=new ReferenceLayouts(),r=c.get(s);assert.equal(r.denseAccepted,false);assert.ok(r.findings.some(f=>f.rule==='G10'));assert.equal(c.paint(r,s).accepted,true);
  assert.throws(()=>c.get(s,{maxTargetsPerViewport:1}),error=>error.findings.some(f=>f.rule==='G10')&&error.fallbackFindings.some(f=>f.rule==='G10'));
});
test('tabs retain selected body occurrences and native authoritative shape',()=>{
  const s=screen();s.workspace=[{tabs:{id:'tabs',labels:['A','B'],selected:1,body:s.workspace}}];
  assert.deepEqual(native({op:'family-check',references:[{screen:s}]}).shapes[0],shapeFor(s).slots);
  assert.ok(shapeFor(s).slots.some(s=>s.path.join('.')==='3.0.0.0'));
});
test('family manifest keeps row-count variants individually selectable under one native shape',()=>{
  const a=screen(),b=screen();b.workspace[0].columns.children[1].section.children[0].info.rows=[[['Value','Synthetic']]];
  const program={id:'canonical-P1',owner:'P1',specVersion:'v1',screens:[{id:'review'}]};
  const result=familyFile(program,[a,b,a]);assert.equal(result.file.families.length,1);assert.equal(result.file.families[0].variants.length,2);
  assert.ok(result.file.families[0].variants.every(v=>native({op:'family-check',references:v.references}).accepted));
  assert.throws(()=>familyFile(program,[{...a,screen:'absent'}]),/Program/);
});
test('geometry is derived from native clips and exposes navigation/tab proxies',()=>{
  const s=screen();s.nav=[['Activity',[['navId','Go']]]];const c=new ReferenceLayouts(),r=c.get(s),out=c.paint(r,s);
  const geometry=geometryFor(s,out);assert.ok(geometry.components.dose);assert.ok(geometry.components.sign);assert.ok(geometry.components.navId);
  assert.deepEqual(geometry.components.sign.chain,[]);assert.ok(geometry.approximations.some(p=>p.id==='navId'));assert.ok(geometry.scrollers['reference-body']);
});
test('recorded vendor density references supplement empty-workspace measurements',()=>{
  const report={programs:[{group:'vendor',id:'v1/P1',screens:[{screen:'home',maximum:6}]}],recorded:[
    {persona:'P1',release:'v1',limits:{home:24},source:'recorded-vendor.json'},
    {persona:'P2',release:'v1',limits:{home:99},source:'other-persona.json'}]};
  assert.deepEqual(limitFor(report,'P1','v1','home'),{limit:24,source:'r5-per-screen:v1/P1; recorded-vendor.json'});
});
test('visited geometry reveals a target clipped inside the page and resets scrolling on navigation',()=>{
  const meter=new GeometryMeter(),g={viewport:{width:1440,height:900},components:{target:{center:{x:50,y:300},reveal:{x:50,y:188},chain:['body'],offsets:{body:{x:0,y:112}}}},
    scrollers:{body:{maxY:300,width:100,height:100}},clipRects:{body:{x:0,y:100,w:100,h:100}},approximations:[]};
  meter.event({screen:'first',event:{click:{comp:'target'}},ops:['point','click']},g);
  assert.equal(meter.result().scrollPx,112);assert.equal(meter.result().scrolls,1);assert.equal(meter.pointer.y,188);
  meter.event({screen:'second',event:{click:{comp:'target'}},ops:['point','click']},g);
  assert.equal(meter.result().scrollPx,224);assert.equal(meter.result().missingTargets.length,0);
});
test('native snapshot cache preserves event screens and rejects tampered compressed data',async()=>{
  const dir=mkdtempSync('/home/saithat/Projects/run-tmp/reference-snapshots-');
  try {
    const inputs={test:'synthetic'},key=digest({inputs,adapter:digest(readFileSync(new URL('./recording.mjs',import.meta.url)))});
    const record={kind:'screen',screen:screen(),ev:{screen:'review',event:{click:{comp:'sign'}},ops:['click']},stateKey:'synthetic',mismatch:null};
    const bytes=gzipSync(JSON.stringify(record)+'\n');
    const {mkdirSync}=await import('node:fs');mkdirSync(join(dir,'native-screens'));
    writeFileSync(join(dir,'native-screens',`${key}.jsonl.gz`),bytes);
    writeFileSync(join(dir,'native-screens',`${key}.json`),JSON.stringify({key,records:1,sha256:digest(bytes)}));
    const rows=[];for await(const row of screenRecords({out:dir,inputs}))rows.push(row);assert.deepEqual(rows,[record]);
    writeFileSync(join(dir,'native-screens',`${key}.jsonl.gz`),gzipSync('changed\n'));
    await assert.rejects(async()=>{for await(const row of screenRecords({out:dir,inputs}))void row;},/Corrupt/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('native session isolates decoder errors and correlates the next response',async()=>{
  const session=new NativeSession('lean/.lake/build/bin/ehr');
  try {await assert.rejects(session.call('unsupported',{}),/unsupported/);assert.equal(typeof await session.call('screen-canonical',screen()),'string');}
  finally {session.close();}
});
test('admission memory is bounded while evicted cases remain independently checkable',()=>{
  const c=new ReferenceLayouts({maxMemoryEntries:1}),a=screen(),b=screen();b.workspace[0].columns.children[1].section.children[0].info.rows=[[['Value','Synthetic']]];
  c.get(a);c.get(b);assert.equal(c.memory.size,1);assert.equal(c.get(a).cacheHit,false);assert.equal(c.stats.misses,3);
});
test('runtime urgent sources remain fixed above the banner without changing semantic flags',()=>{
  const s=screen();s.urgent=[{alert:{comp:'urgent',alertId:'policy',label:'Review before signing',severity:'high'}}];
  const c=new ReferenceLayouts(),r=c.get(s);assert.equal(r.denseAccepted,true);
  for(const viewport of viewports) {
    const out=c.paint(r,s,viewport),urgent=out.boxes.find(d=>d.original?.includes('Review before signing')),banner=out.boxes.find(d=>d.box.info.banner);
    assert.equal(out.accepted,true);assert.deepEqual(urgent.box.clips,[]);assert.equal(urgent.box.info.interruptive,false);
    assert.ok(urgent.box.rect.y+urgent.box.rect.h<=banner.box.rect.y);
  }
});
test('navigation and heading scroll with the vendor body while banner and commit stay fixed',()=>{
  const s=screen(),c=new ReferenceLayouts(),r=c.get(s),out=c.paint(r,s);
  assert.equal(r.denseAccepted,true);
  for(const path of ['1','2'])assert.equal(out.boxes.find(d=>d.box.info.source?.join('.')===path).box.clips[0][0],'reference-body');
  assert.deepEqual(out.boxes.find(d=>d.box.info.banner).box.clips,[]);
  assert.deepEqual(out.boxes.find(d=>d.box.info.commit).box.clips,[]);
});
