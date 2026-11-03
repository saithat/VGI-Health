/* global structuredClone, document, getComputedStyle, console */
/** Full owner-policy matrix for ordinary and sandbox compositions. No certificates. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { native } from './promote-gate.mjs';
import { startLab, paint, atoms } from './exotic-gate.mjs';
import { physicalBounds } from '../e2e/physical-policy.ts';
const out=process.argv[2]??'runs/promote-merge-physical';
assert.ok(path.resolve(out).startsWith(path.resolve('runs')+path.sep));
await mkdir(out,{recursive:true});
const canonical=native({op:'canonical'});
const sessions=['physical-a','physical-b'].map(patient=>{
 const input=structuredClone(canonical.input);
 input.facts.sourcePatientId=patient;input.facts.patientId=patient;input.display.sourcePatientId=patient;
 input.display.banner.mrn=patient;input.facts.infoPayloads=[];input.facts.careGaps=['synthetic-physical-probe'];
 input.spec.alerts.push({id:'drugAllergyOrder',label:'Active urgent condition',commit:'signOrders',cond:'careGap',tier:'passive',screens:[]});
 const info=atoms(native({op:'render',render:input}).screen.workspace).find(n=>n.info?.rows.length).info;
 const source={resource:'Observation/physical',field:'issued',timestamp:'2026-11-02T08:30:00Z'};
 input.display.timelineSources=[source];input.display.timelineBackings=[{source,occurrence:0,info:info.infoId,row:info.rows[0]}];
 return{patient,input,receipts:[]};
});
const screens=sessions.map(s=>({patient:s.patient,screen:native({op:'render',render:s.input}).screen}));
const dated=native({op:'dated',render:sessions[0].input});
const views=[{mode:'board',panes:screens,ordinary:native({op:'board',sessions}).node},
 {mode:'dated',panes:[{patient:sessions[0].patient,screen:dated.screen}],ordinary:dated.node},
 ...['command','spatial'].map(mode=>({mode,panes:[screens[0]]}))];
const modal=structuredClone(sessions);modal[1].input.state.popup=['drugAllergy','unrelated'];
views.push({mode:'board',panes:modal.map(s=>({patient:s.patient,screen:native({op:'render',render:s.input}).screen})),ordinary:native({op:'board',sessions:modal}).node});
const pending=structuredClone(sessions);pending[0].input.state.popup=['drugAllergyOrder','careGap'];
views.push({mode:'board',panes:pending.map(s=>({patient:s.patient,screen:native({op:'render',render:s.input}).screen})),ordinary:native({op:'board',sessions:pending}).node});
const lab=await startLab(),measurements=[];
try{
 for(const [viewIndex,view]of views.entries())for(const [width,textPercent]of [[768,100],[1280,100],[1440,100],[1600,100],[1920,100],[640,100],[320,100],[1280,200],[768,200]]){
  const page=await lab.browser.newPage({viewport:{width,height:900}});await page.goto(lab.url);await paint(page,view);
  if(textPercent===200)await page.evaluate(()=>{
   const els=[...document.querySelectorAll('body *')].filter(el=>!el.closest('svg,script,style'));
   const sizes=els.map(el=>parseFloat(getComputedStyle(el).fontSize));
   els.forEach((el,i)=>el.style.setProperty('font-size',`${sizes[i]*2}px`,'important'));
  });
  const result=await physicalBounds(page);await page.keyboard.press('Tab');
  const focus=await physicalBounds(page);result.findings.push(...focus.findings.filter(f=>f.detail.startsWith('state/focus')));
  measurements.push({viewIndex,mode:view.mode,width,textPercent,...result});
  if(result.findings.length)await page.screenshot({path:`${out}/${viewIndex}-${width}-${textPercent}.png`,fullPage:true});
  await page.close();
 }
}finally{await lab.close();}
await writeFile(`${out}/physical.json`,JSON.stringify({measurements,findings:measurements.reduce((n,m)=>n+m.findings.length,0)},null,2));
assert.deepEqual(measurements.flatMap(m=>m.findings.map(f=>({...f,mode:m.mode,width:m.width,textPercent:m.textPercent}))),[],'Owner physical policy');
console.log(JSON.stringify({measurements:measurements.length,findings:0}));
