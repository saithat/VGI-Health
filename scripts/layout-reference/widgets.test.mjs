import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {native} from './admission.mjs';
import {shapeFor,occurrences,eraseContent,viewports,layoutFor} from './generator.mjs';
import {geometryFor,GeometryMeter} from './geometry.mjs';
const screens=JSON.parse(readFileSync('app/tests/data/lean-widgets.json','utf8'));
for(const [kind,screen] of Object.entries(screens))test(`${kind}: semantic mirror, three admitted viewports, checked marks and geometry`,()=>{
  const inventory=native({op:'inventory',screen}),shape=shapeFor(screen);
  assert.deepEqual(inventory.shape,shape.slots);
  assert.deepEqual(inventory.inventory.map(e=>[e.path,e.part.role,e.part.target===true]),occurrences(screen).map(e=>[e.path,e.role,e.target]));
  const references=[{screen:eraseContent(screen),layouts:viewports.map(viewport=>({viewport,tree:layoutFor(shape,viewport)}))}];
  assert.equal(native({op:'family-check',references}).accepted,true);
  for(const viewport of viewports){
    const out=native({op:'family-paint',screen,references,viewport});
    assert.equal(out.accepted,true,JSON.stringify(out.findings));
    assert.equal(out.linked,true);
    assert.equal(out.layoutOk,true);
    if(['trend','growth','timeline','datedTimeline','alert'].includes(kind))assert.ok(out.boxes.some(d=>typeof d.box.info.mark==='object'&&d.box.info.mark.plot));
    if(kind==='board'){const geometry=geometryFor(screen,out);assert.deepEqual(Object.keys(geometry.components).sort(),['A::review','B::review']);const meter=new GeometryMeter();meter.event({screen:'board',patient:'B',event:{click:{comp:'review'}},ops:['point','click']},geometry);assert.deepEqual(meter.result().missingTargets,[]);}
    if(kind==='timeGrid'){
      const cells=out.boxes.filter((_,i)=>out.parts[i]?.kind==='gridCell');assert.equal(cells.length,4);
      assert.equal(cells[0].box.rect.y,cells[1].box.rect.y);
      assert.notEqual(cells[0].box.rect.x,cells[1].box.rect.x);
    }
  }
});
test('board modal and urgent atoms are authoritative nested regions',()=>{
  const screen=structuredClone(screens.board),pane=screen.workspace[0].board.children[0].patientPane;
  pane.modal=[{alert:{comp:'alert',alertId:'alert',label:'Acknowledge',severity:'interruptive'}},{button:{comp:'ack',label:'Acknowledge',role:'ack',enabled:true,blockedReason:null,hotkey:null}}];
  pane.metadata.urgent=[{alert:{comp:'urgent',alertId:'urgent',label:'Urgent',severity:'interruptive'}}];
  assert.deepEqual(shapeFor(screen).slots,native({op:'inventory',screen}).shape);
  const references=[{screen,layouts:viewports.map(viewport=>({viewport,tree:layoutFor(shapeFor(screen),viewport)}))}];
  assert.equal(native({op:'family-check',references}).accepted,true);
  const out=native({op:'family-paint',references,screen});assert.equal(out.accepted,true,JSON.stringify(out.findings));
});
test('plot validity and erased structural shape agree for difficult numeric/time strings',()=>{
  for(const [value,date] of [[' -1.25 ','2024-02-29T00:00:00.123456789+14:00'],['<5','2026-11-15T00:00:00Z'],['2','2026-02-30T00:00:00Z'],['2','2026-11-15T00:00:00-00:00'],['1.2345678','2026-11-15T00:00:00Z']]){
    const screen=structuredClone(screens.trend);screen.workspace[0].presentation.children[0].info.rows=[[['Test','Sample'],['Value',value],['Unit','u'],['Recorded',date]]];
    assert.deepEqual(native({op:'inventory',screen}).shape,shapeFor(screen).slots);
    assert.deepEqual(native({op:'inventory',screen:eraseContent(screen)}).shape,shapeFor(screen).slots);
  }
});
test('explicit confirmation metadata cannot suppress another patient confirmation',()=>{
  const screen=structuredClone(screens.board),panes=screen.workspace[0].board.children;
  const field={field:{comp:'same',label:'Dose',kind:'text',value:'5',unit:null,provenance:'record',pendingConfirm:true,humanOnly:false,required:true}};
  panes[0].patientPane.children=[field,{button:{comp:'same',label:'Confirm',role:'confirm',enabled:true,blockedReason:null,hotkey:null}}];
  panes[1].patientPane.children=[structuredClone(field)];
  const actual=native({op:'inventory',screen}),mirror=occurrences(screen);
  assert.deepEqual(actual.shape,shapeFor(screen).slots);
  const pending=actual.inventory.filter(e=>e.part.role==='pending');
  assert.equal(pending.length,2);assert.equal(pending[0].part.target,undefined);assert.equal(pending[1].part.target,true);
  assert.deepEqual(actual.inventory.map(e=>[e.path,e.part.target===true]),mirror.map(e=>[e.path,e.target]));
});
