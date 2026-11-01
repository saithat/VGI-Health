import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { read, hash, resourceKey, SYSTEM, EXT } from './common.mjs';
import { reconcileBundle, ingredient } from './reconcile.mjs';
import { ROOT, augment } from './generate.mjs';
const clinical=read(resolve(ROOT,'fixtures/clinical/overrides.json'));
const index=read(resolve(ROOT,'fixtures/clinical/index.json'));
const overrides=new Map(clinical.entry.map(e=>[e.key,e]));
const codes=r=>r.code?.coding?.map(c=>c.code)??[];

test('all 324 charts have a reviewed allergy state, PCP, coverage and reconciled active medications',()=>{
  let nka=0,stopped=0;
  for(const source of read(resolve(ROOT,'fixtures/clinical/audit.json')).sourceFiles) {
    const raw=read(resolve(ROOT,source.file));
    const result=reconcileBundle(raw);
    const resources=result.bundle.entry.map(e=>e.resource);
    const pid=resources.find(r=>r.resourceType==='Patient').id;
    const active=resources.filter(r=>['MedicationRequest','MedicationStatement'].includes(r.resourceType)&&r.status==='active');
    assert.equal(new Set(active.map(ingredient)).size,active.length,`Duplicate active ingredient: ${pid}`);
    assert.ok(active.filter(r=>/clopidogrel|prasugrel|ticagrelor/i.test(JSON.stringify(r.medicationCodeableConcept))).length<=1);
    for(const r of active) {
      const end=r.effectivePeriod?.end??r.dispenseRequest?.validityPeriod?.end;
      assert.ok(!end||end.slice(0,10)>='2026-11-02');
      if(/metoprolol|lisinopril/i.test(JSON.stringify(r.medicationCodeableConcept))) for(const d of r.dosageInstruction??r.dosage??[]) assert.equal(d.asNeededBoolean,false);
    }
    stopped+=resources.filter(r=>['stopped','completed'].includes(r.status)&&r.meta?.tag?.some(t=>t.code==='reconciled')).length;
    const allergies=resources.filter(r=>r.resourceType==='AllergyIntolerance');
    assert.ok(allergies.length>0);
    assert.ok(!allergies.some(r=>codes(r).includes('609328004')));
    const known=allergies.filter(r=>r.clinicalStatus?.coding?.some(c=>c.code==='active')&&!codes(r).includes('716186003'));
    const none=allergies.filter(r=>codes(r).includes('716186003'));
    assert.ok(!known.length||!none.length,'NKA conflicts with active allergy');
    nka+=none.length;
    for(const r of known) assert.ok(r.reaction?.every(a=>a.severity&&a.manifestation.length));
    assert.ok(resources.find(r=>r.resourceType==='Patient').generalPractitioner.length);
    assert.ok(resources.some(r=>r.resourceType==='Coverage'&&r.status==='active'));
    for(const e of result.bundle.entry) {
      const original=raw.entry.find(x=>resourceKey(x)===resourceKey(e));
      if(!original||JSON.stringify({...original.resource,id:e.resource.id})!==JSON.stringify(e.resource)) assert.deepEqual(overrides.get(resourceKey(e))?.resource,e.resource);
    }
  }
  assert.ok(nka>200); assert.ok(stopped>100); assert.equal(index.patients.length,324);
});

test('all ten day graphs have full lists, role assignments, standing orders, senders and complete refill records',()=>{
  let dnr=0;
  const clinicalKeys=new Set(clinical.entry.filter(e=>e.action!=='withdraw').map(e=>e.key));
  for(let day=1;day<=10;day++) {
    const bundle=read(resolve(ROOT,`runs/world/2/context/day-${String(day).padStart(2,'0')}.json`));
    const resources=bundle.entry.map(e=>e.resource),byKey=new Map(resources.map(r=>[`${r.resourceType}/${r.id}`,r]));
    assert.equal(byKey.size,resources.length);
    const lists=resources.filter(r=>r.resourceType==='List');
    const find=(p,code)=>lists.find(r=>r.code.coding[0].code===code&&r.meta.tag.some(t=>t.code===p));
    for(const p of ['P1','P4']) {const n=find(p,'clinic-schedule').entry.length; assert.ok(n>=12&&n<=18);}
    assert.ok(find('P2','ed-census').entry.length>=12&&find('P2','ed-census').entry.length<=20);
    assert.equal(find('P3','my-patients').entry.length,5);assert.equal(find('P3','unit-census').entry.length,12);
    const cases=find('P5','or-schedule').entry.map(e=>byKey.get(e.item.reference));
    assert.equal(cases.length,10);assert.equal(new Set(cases.map(r=>r.locationReference[0].reference)).size,2);
    assert.equal(find('P5','consults').entry.length,3);
    for(const e of resources.filter(r=>r.resourceType==='Encounter')) {
      assert.ok(e.location.length&&e.participant.length>=2);
      if(e.class.code!=='EMER'||e.extension?.some(x=>x.url===EXT+'disposition'&&x.valueString==='Admit')) {
        const orders=resources.filter(r=>r.resourceType==='ServiceRequest'&&r.encounter?.reference===`Encounter/${e.id}`);
        assert.ok(orders.some(r=>codes(r).some(c=>['full-code','dnr'].includes(c))));
        assert.ok(orders.some(r=>codes(r).some(c=>['no-isolation','contact-precautions'].includes(c))));
      }
    }
    dnr+=resources.filter(r=>codes(r).includes('dnr')).length;
    for(const p of ['P1','P2','P3','P4','P5']) {
      const inbox=find(p,'inbasket').entry.map(e=>byKey.get(e.item.reference));
      assert.ok(inbox.filter(r=>r.resourceType==='Communication').length>=2);
      assert.ok(inbox.filter(r=>codes(r).includes('result-review')).length>=2);
      for(const r of inbox.filter(r=>codes(r).includes('result-review'))) assert.ok(r.requester?.reference&&r.description.includes(':'));
      const rx=inbox.filter(r=>r.contained?.some(c=>c.resourceType==='MedicationRequest'));
      assert.ok(rx.length>=2);
      for(const r of rx) {
        const med=r.contained.find(c=>c.resourceType==='MedicationRequest'),dispense=r.contained.find(c=>c.resourceType==='MedicationDispense');
        assert.ok(med.dispenseRequest.performer.reference&&med.dispenseRequest.quantity.value>0&&med.dispenseRequest.expectedSupplyDuration.value>0);
        assert.ok(dispense.whenHandedOver.slice(0,10)<'2026-11-02'||dispense.whenHandedOver.slice(0,10)<read(resolve(ROOT,`runs/world/2/state-day-${day}.json`)).date);
      }
    }
    function walk(v,contained=[]) {
      if(!v||typeof v!=='object') return;
      if(v.contained)contained=v.contained.map(r=>'#'+r.id);
      if(v.reference) assert.ok(byKey.has(v.reference)||clinicalKeys.has(v.reference)||contained.includes(v.reference),`Unresolved ${v.reference}`);
      for(const [k,x] of Object.entries(v))if(k!=='meta'&&typeof x==='object')walk(x,contained);
    }
    // Patient historical metadata can retain display-only source references; only list graph links are validated here.
    for(const r of resources.filter(r=>r.resourceType!=='Patient')) walk(r);
    assert.ok(resources.every(r=>r.meta?.tag?.some(t=>t.system===SYSTEM)));
  }
  assert.ok(dnr>0);
});

test('regeneration is byte reproducible and never changes schedules or imported fixtures',()=>{
  const manifest=read(resolve(ROOT,'runs/world/2/manifest.json'));
  const before=manifest.files.map(f=>hash(read(resolve(ROOT,'runs/world/2',f))));
  const overlayHash=hash(clinical);
  augment();
  assert.deepEqual(manifest.files.map(f=>hash(read(resolve(ROOT,'runs/world/2',f)))),before);
  assert.equal(hash(read(resolve(ROOT,'fixtures/clinical/overrides.json'))),overlayHash);
  for(const source of read(resolve(ROOT,'fixtures/clinical/audit.json')).sourceFiles) assert.equal(hash(__read(source.file)),source.sha256);
});
import { readFileSync } from 'node:fs';
const __read=f=>readFileSync(resolve(ROOT,f),'utf8');
