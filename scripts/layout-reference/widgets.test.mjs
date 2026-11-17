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

test('an alert owns one occurrence, a square plot and disjoint complete text in dense and fixed boxes',async()=>{
  const {fixedShellFor}=await import('./generator.mjs');
  const screen=structuredClone(screens.alert);
  screen.urgent=Array.from({length:5},(_,i)=>({alert:{comp:`urgent:${i}`,alertId:`a${i}`,label:'W'.repeat(500),severity:'interruptive'}}));
  screen.urgent.push({button:{comp:'ack',label:'Acknowledge',role:'ack',enabled:true,blockedReason:null,hotkey:null}});
  const inventory=native({op:'inventory',screen}).inventory;
  assert.equal(inventory.filter(e=>e.part.role==='alert').length,6);
  assert.ok(inventory.filter(e=>e.part.role==='alert').every(e=>e.part.plot));
  assert.ok(!inventory.some(e=>e.part.kind==='severityIcon'));
  for(const generator of [layoutFor,fixedShellFor]) for(const viewport of viewports){
    const references=[{screen:eraseContent(screen),layouts:viewports.map(viewport=>({viewport,tree:generator(shapeFor(screen),viewport)}))}];
    const out=native({op:'family-paint',screen,references,viewport});
    assert.equal(out.accepted,true,JSON.stringify(out.findings));
    for(const [i,d] of out.boxes.entries())if(out.parts[i]?.role==='alert'){
      const {w,h}=d.box.rect,plot=d.box.info.mark.plot;
      assert.equal(d.box.info.text.inset,h);assert.ok(w>h);
      assert.deepEqual(plot.paths[0][0],{x:Math.floor(5000*h/10000),y:Math.floor(800*h/10000)});
      assert.ok([...plot.paths.flat(),...plot.dots].every(p=>p.x>=0&&p.x<=h&&p.y>=0&&p.y<=h));
      assert.ok(out.lineWidths[i].every(width=>width<=w-h));
      assert.equal(d.lines.join(''),d.original);
    }
    const bad=structuredClone(references);
    const recolor=node=>{if(node.source&&inventory.some(e=>e.part.role==='alert'&&JSON.stringify(e.path)===JSON.stringify(node.source))){node.fg={r:160,g:160,b:160};node.bg='white';}for(const child of node.children??[])recolor(child);};
    bad[0].layouts.forEach(l=>recolor(l.tree));
    const refused=native({op:'family-paint',screen,references:bad,viewport});
    assert.equal(refused.accepted,false);assert.ok(refused.findings.some(f=>f.rule==='G6'));
  }
});

test('two long track boards keep each action in its patient row and pin scoped urgency and modal controls', async () => {
  const {boardPatients} = await import('./board-fixture.mjs');
  for (const modal of [false, true]) {
    const screen = native({op: 'board-screen', panes: boardPatients({modal})});
    const shape = shapeFor(screen), parts = occurrences(screen);
    assert.deepEqual(shape.slots, native({op: 'inventory', screen}).shape);
    const references = [{screen: eraseContent(screen), layouts: viewports.map(viewport =>
      ({viewport, tree: layoutFor(shape, viewport)}))}];
    assert.equal(native({op: 'family-check', references}).accepted, true);
    for (const viewport of viewports) {
      const out = native({op: 'family-paint', screen, references, viewport});
      assert.ok(out.accepted && out.linked, JSON.stringify(out.findings));
      const byPath = new Map(out.boxes.map(({box}) => [box.info.source?.join('.'), box]));
      const boxOf = part => byPath.get(part.path.join('.'));
      const geometry = geometryFor(screen, out);
      for (const patient of ['Ada', 'Blair']) {
        const pane = boxOf(parts.find(p => p.kind === 'patientPane' && p.comp === patient)).rect;
        const owned = parts.filter(p => p.patient === patient);
        for (const p of owned.filter(p => p.target)) {
          const {rect} = boxOf(p);
          assert.ok(rect.x >= pane.x && rect.x + rect.w <= pane.x + pane.w, patient + '/' + p.comp);
        }
        for (const row of [0, 8, 19]) {
          const cell = owned.find(p => p.role === 'cellValue' && p.row === row && p.col === 0);
          const action = owned.find(p => p.comp === 'open-' + row);
          assert.equal(boxOf(cell).rect.y, boxOf(action).rect.y);
          assert.ok(geometry.components[patient + '::open-' + row]);
        }
        assert.deepEqual(geometry.components[patient + '::ack'].chain, []);
        assert.deepEqual(geometry.components[patient + '::urgent-result'].chain, []);
      }
      const urgent = out.boxes.filter(d => d.box.info.urgent);
      assert.equal(urgent.length, 6);
      assert.ok(urgent.every(d => !d.box.clips.length && d.box.rect.y+d.box.rect.h <= viewport.h));
      const modalParts = parts.filter(p => boxOf(p).info.interruptive);
      assert.equal(modalParts.length, modal ? 3 : 0);
      assert.ok(modalParts.every(p => p.patient === 'Blair'));
    }
  }
});
