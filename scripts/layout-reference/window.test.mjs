import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {native,ReferenceLayouts} from './admission.mjs';
import {occurrences,shapeFor,layoutFor,viewports} from './generator.mjs';
import {windowScreen,windowOnce,askPage,flaggedRow,maxPageSize} from './window.mjs';

const binary=resolve('lean/.lake/build/bin/ui-layout');
const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
const lean=(input)=>native(input,binary);
const record=(i,flag='')=>[['Test',`Test ${i}`],['Value',String(i)],['Flag',flag],['Collected',`Jan ${1+i%28}, 2026 08:00`]];
function listScreen(rows,{extra=[],pages}={}) {
  return {banner:[['Patient','Synthetic Patient']],nav:[['Chart',[['goHome','Home']]]],title:'Results',
    workspace:[{info:{comp:'results.detail',label:'Result details',infoId:'resultDetail',display:'table',rows}},...extra],
    side:[],modal:null,...(pages?{pages}:{})};
}

test('the window mirror equals Lean: pages, clamping, flags, sizes', () => {
  const rows=Array.from({length:47},(_,i)=>record(i,i===3||i===31?'H':i===45?'LL':''));
  for(const [screen,window] of [[listScreen(rows),undefined],[listScreen(rows,{pages:[['results.detail',1]]}),undefined],
      [listScreen(rows,{pages:[['results.detail',99]]}),{size:10}],[listScreen(rows),{size:3}],[listScreen(rows),{size:500}],
      [listScreen(rows),{sizes:[['results.detail',7]]}],[listScreen(rows.slice(0,20)),undefined],[listScreen(rows),false]]) {
    const native=lean({op:'window',screen,...(window!==undefined?{window}:{})}).screen;
    assert.deepEqual(sorted(windowScreen(screen,window===false?{enabled:false}:window??{})),sorted(native));
  }
  const w=windowScreen(listScreen(rows,{pages:[['results.detail',1]]})).windows[0];
  assert.deepEqual(w,{comp:'results.detail',flagged:3,flaggedElsewhere:2,nextFlagged:2,page:1,pages:3,size:20,total:47});
  const many=Array.from({length:200},(_,i)=>record(i));
  assert.equal(windowScreen(listScreen(many),{size:500}).windows[0].size,maxPageSize);
  assert.equal(windowScreen(listScreen(rows),{size:500}).windows,undefined);
  assert.ok(flaggedRow(record(0,'H')) && !flaggedRow(record(0,'N')));
});

test('row-action lists, search results, the patient directory and duplicated lists are not paged', () => {
  const rows=Array.from({length:30},(_,i)=>record(i));
  const actions=listScreen(rows,{extra:[{rowAction:{target:'results.detail',row:2,children:[
    {button:{comp:'open',label:'Open',role:'nav',enabled:true,blockedReason:null,hotkey:null}}]}}]});
  assert.equal(windowScreen(actions).windows,undefined);
  const twice=listScreen(rows,{extra:[{info:{comp:'results.detail',label:'Again',infoId:'resultDetail',display:'table',rows}}]});
  assert.equal(windowScreen(twice).windows,undefined);
  const search={...listScreen(rows)};search.workspace=[{info:{comp:'search',label:'Search',infoId:'searchResults',display:'list',rows}}];
  assert.equal(windowScreen(search).windows,undefined);
  for(const screen of [actions,twice,search]) assert.equal(lean({op:'window',screen}).screen.windows,undefined);
});

test('the inventory mirror lists the pager parts with Lean paths, roles and targets', () => {
  const rows=Array.from({length:47},(_,i)=>record(i,i===31?'H':''));
  const screen=windowScreen(listScreen(rows,{pages:[['results.detail',1]]}));
  const inventory=lean({op:'inventory',screen}).inventory, mirror=occurrences(screen);
  assert.deepEqual(mirror.map(e=>[e.path,e.role,e.target]),inventory.map(e=>[e.path,e.part.role,e.part.target??false]));
  const pager=inventory.filter(e=>e.part.role==='pager').map(e=>e.part);
  assert.deepEqual(pager.map(p=>[p.kind,p.col,p.enabled??true]),[['previous',0,true],['next',2,true],['page',1,true],['nextFlagged',1,false]]);
  const position=inventory.find(e=>e.part.role==='position').part;
  assert.equal(position.text,'Records 21–40 of 47');
  assert.equal(inventory.find(e=>e.part.role==='flagged').part.text,'No flagged records on other pages');
  assert.equal(pager[2].options.length,3);
  // The geometry address of `selectTab results.detail p` is the target that selects p.
  const ids=Object.fromEntries(mirror.filter(e=>e.role==='pager').map(e=>[e.pager,e.ids]));
  assert.deepEqual(ids,{previous:['results.detail#tab:0'],next:['results.detail#tab:2'],page:['results.detail#tab:1'],nextFlagged:[]});
});

test('a paged list is admitted at every viewport; the pager sits above the header row', () => {
  const rows=Array.from({length:200},(_,i)=>record(i,i===150?'H':''));
  const screen=windowScreen(listScreen(rows));
  const cache=new ReferenceLayouts({binary});
  const result=cache.get(screen,{maxTargetsPerViewport:40});
  assert.equal(result.denseAccepted,true,JSON.stringify(result.findings));
  const painted=cache.paint(result,screen,viewports[0]);
  const shape=shapeFor(screen),entries=occurrences(screen);
  const boxOf=role=>painted.boxes.find(d=>{const e=entries.find(x=>x.path.join('.')===d.box.info.source?.join('.'));return e?.role===role;});
  const pagerY=painted.boxes.filter(d=>painted.parts?.[painted.boxes.indexOf(d)]?.role==='pager').map(d=>d.box.rect.y);
  assert.equal(new Set(pagerY).size,1,'pager targets share one row');
  assert.ok(boxOf('position').box.rect.y<boxOf('cellLabel').box.rect.y);
  assert.ok(shape.slots.length<200,'one page of records');
  for(const viewport of viewports) assert.ok(layoutFor(shape,viewport));
});

test('row actions sit in their record row of a uniform table', () => {
  const rows=Array.from({length:6},(_,i)=>record(i));
  const buttons=[0,3,5].map(r=>({rowAction:{target:'results.detail',row:r,children:[
    {button:{comp:`open${r}`,label:'Open',role:'nav',enabled:true,blockedReason:null,hotkey:null}}]}}));
  const screen=listScreen(rows,{extra:buttons});
  const cache=new ReferenceLayouts({binary});
  const result=cache.get(screen,{maxTargetsPerViewport:40});
  assert.equal(result.denseAccepted,true,JSON.stringify(result.findings));
  const painted=cache.paint(result,screen,viewports[0]),parts=painted.parts;
  for(const r of [0,3,5]) {
    const cell=painted.boxes.find((d,i)=>parts[i]?.row===r&&parts[i]?.role==='cellValue');
    const button=painted.boxes.find((d,i)=>parts[i]?.comp===`open${r}`&&parts[i]?.role==='button');
    assert.ok(cell&&button);
    assert.ok(Math.abs(cell.box.rect.y-button.box.rect.y)<64*4,`row ${r} action in its row`);
    assert.ok(button.box.rect.x>cell.box.rect.x);
  }
});

const big='/home/saithat/Projects/run-tmp/paging/big-screen.min.json';
test('the largest retained screen: windowed inventory and mirror agreement', {skip:!existsSync(big)}, () => {
  const screen=JSON.parse(readFileSync(big,'utf8'));
  const windowed=lean({op:'window',screen}).screen;
  assert.deepEqual(sorted(windowScreen(screen)),sorted(windowed));
  assert.deepEqual(sorted(windowOnce(windowed)),sorted(windowed));
  const before=lean({op:'inventory',screen,window:false}).inventory.length,after=lean({op:'inventory',screen}).inventory.length;
  assert.ok(before>10000 && after<1000,`${before} -> ${after}`);
  const asked=askPage(screen,'w2Result.detail',35),last=lean({op:'window',screen:asked}).screen.windows[0];
  assert.equal(last.page,35);assert.equal(last.total,705);
});
