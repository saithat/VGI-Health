import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
const binary=resolve('lean/.lake/build/bin/ui-layout');
function run(input){
  const p=spawnSync(binary,[],{input:JSON.stringify(input)+'\n',encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(p.status,0,p.stderr);const out=JSON.parse(p.stdout);if(out.error&&!out.uncoveredShape)assert.fail(out.error);return out;
}
export function reviewScreen(rows=[]){return {banner:[['Patient','Synthetic patient']],nav:[],title:'Review orders',workspace:[
  {info:{comp:'review',label:'Required review',infoId:'orders',display:'table',rows}},
  {button:{comp:'sign',label:'Sign',role:'primary',enabled:false,blockedReason:'Complete review',hotkey:null}},
],side:[],modal:null};}
const widths=[[1440,900],[1280,800],[1920,1080]];
const text={key:'deliberately-wrong-key',maxLength:0,maxLines:2,overflow:'scroll',safety:true,font:0,fontSize:896,lineHeight:1408};
function layouts(){return widths.map(([w,h])=>({viewport:{w:w*64,h:h*64},tree:{type:'Absolute',id:'root',width:'fill',height:'fill',children:[
  {type:'Text',id:'banner',source:[0],banner:true,position:{x:1024,y:512},width:(w-32)*64,height:5120,text},
  {type:'Text',id:'title',source:[1],position:{x:1024,y:6400},width:(w-32)*64,height:2816,text},
  {type:'Text',id:'nav',source:[2],position:{x:1024,y:9600},width:(w-32)*64,height:2816,text},
  {type:'Text',id:'review',source:[3],position:{x:1024,y:12800},width:(w-32)*64,height:6400,text},
  {type:'Button',id:'sign',source:[4],commit:true,position:{x:1024,y:(h-80)*64},width:(w-32)*64,height:3840,text},
]}}));}

test('a data-erased admitted family rebinds unlimited safety payloads by source path',()=>{
  const reference=reviewScreen();const references=[{screen:reference,layouts:layouts()}];
  assert.equal(run({op:'family-check',references}).accepted,true);
  const payload='🧬 medication '+ 'W'.repeat(70000);
  const actual=reviewScreen([[['Drug',payload],['Dose','5 mg'],['Route','PO']],[['Allergy','a\nb']]]);
  const out=run({op:'family-paint',references,screen:actual});
  assert.equal(out.accepted,true,JSON.stringify(out));assert.equal(out.linked,true);
  const review=out.boxes.find(d=>d.box.info.source?.join('.')==='3');
  assert.ok(review.original.includes(payload));assert.ok(review.original.includes('Dose: 5 mg'));
  assert.ok(review.lines.join('').includes('[U+01F9EC]'));
  assert.notEqual(review.original,out.boxes.find(d=>d.box.info.source?.join('.')==='0').original);
});
test('semantic linkage prevents hiding the real commit to claim G9 exemption',()=>{
  const changed=layouts();for(const r of changed)r.tree.children[4].commit=false;
  assert.equal(run({op:'family-check',references:[{screen:reviewScreen(),layouts:changed}]}).accepted,false);
});
test('family admission covers each desktop viewport and does not silently accept new structures',()=>{
  assert.equal(run({op:'family-check',references:[{screen:reviewScreen(),layouts:layouts().slice(0,2)}]}).accepted,false);
  const references=[{screen:reviewScreen()}];
  assert.equal(run({op:'family-check',references}).accepted,true);
  const changed=reviewScreen();changed.workspace.push({text:{s:'new semantic element'}});
  const out=run({op:'family-paint',references,screen:changed});
  assert.equal(out.accepted,false);assert.ok(out.uncoveredShape);assert.match(out.error,/semantic shape/);
});
