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
const line={...text,maxLines:1};
/** One box per occurrence: banner, title, navigation, the table caption with
 * `parts` display parts (cells), Sign and its blocked reason. */
function layouts(parts=1){return widths.map(([w,h])=>({viewport:{w:w*64,h:h*64},tree:{type:'Absolute',id:'root',width:'fill',height:'fill',children:[
  {type:'Text',id:'banner',source:[0],banner:true,position:{x:1024,y:512},width:(w-32)*64,height:5120,text},
  {type:'Text',id:'title',source:[1],position:{x:1024,y:6400},width:(w-32)*64,height:2816,text},
  {type:'Text',id:'nav',source:[2],position:{x:1024,y:9600},width:(w-32)*64,height:2816,text},
  {type:'Text',id:'review',source:[3],position:{x:1024,y:12800},width:(w-32)*64,height:2816,text},
  ...Array.from({length:parts},(_,i)=>({type:'Text',id:'part'+i,source:[3,i],position:{x:1024,y:16000+i*1664},width:(w-32)*64,height:1600,text:line})),
  {type:'Text',id:'reason',source:[4,0],position:{x:1024,y:16000+parts*1664},width:(w-32)*64,height:1600,text:line},
  {type:'Button',id:'sign',source:[4],commit:true,position:{x:1024,y:(h-80)*64},width:(w-32)*64,height:3840,text},
]}}));}
const table=(drug,dose,note)=>[[['Drug',drug],['Dose',dose],['Route','PO']],[['Allergy',note]]];

test('a data-erased admitted family rebinds unlimited safety payloads by source path',()=>{
  // The reference fixes the structure (four cells, each a caption and a value); every string is free.
  const reference=reviewScreen(table('x','y','z'));const references=[{screen:reference,layouts:layouts(8)}];
  const admitted=run({op:'family-check',references});
  assert.equal(admitted.accepted,true,JSON.stringify(admitted.findings));
  const payload='🧬 medication '+ 'W'.repeat(70000);
  const actual=reviewScreen(table(payload,'5 mg','a\nb'));
  actual.banner=[['Patient','Another synthetic patient'],['MRN','000'],['Allergies','None recorded']];
  actual.workspace[1].button.blockedReason='Review every order '.repeat(400);
  const out=run({op:'family-paint',references,screen:actual});
  assert.equal(out.accepted,true,JSON.stringify(out));assert.equal(out.linked,true);
  const at=path=>out.boxes.find(d=>d.box.info.source?.join('.')===path);
  assert.equal(at('3.1').original,payload);assert.ok(at('3.1').lines.join('').includes('[U+01F9EC]'));
  assert.deepEqual(['3.0','3.2','3.3','3.6','3.7'].map(p=>at(p).original),['Drug','Dose','5 mg','Allergy','a\nb']);
  assert.equal(at('4.0').original,'Review every order '.repeat(400));
  assert.ok(at('0').original.includes('Another synthetic patient')&&at('0').original.includes('Allergies: None recorded'));
  // A table of another size is another structure: it is reported, never painted with the wrong boxes.
  const longer=run({op:'family-paint',references,screen:reviewScreen([...table('x','y','z'),[['Allergy','second']]])});
  assert.equal(longer.accepted,false);assert.ok(longer.uncoveredShape);
});
test('semantic linkage preserves the real commit flag',()=>{
  const changed=layouts();for(const r of changed)r.tree.children.at(-1).commit=false;
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
