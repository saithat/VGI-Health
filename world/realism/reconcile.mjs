import { fictionalize } from '../../scripts/fictional-identities.mjs';
import { cc, ref, text, title, tag, id, SNOMED, calendarAgo, SYSTEM } from './common.mjs';

const ALLERGENS = { '256355007':'Soy', '84489001':'Mold', '264287008':'Animal dander', '256277009':'Grass pollen', '260147004':'Dust mites', '782576004':'Tree pollen', '735029006':'Shellfish', '735971005':'Fish', '111088007':'Latex', '3718001':"Cow's milk", '288328004':'Bee venom', '442571000124108':'Tree nuts', '762952008':'Peanut', '412071004':'Wheat', '102263004':'Egg' };
const MEDS = /acetaminophen|hydrocodone|oxycodone|metoprolol|atorvastatin|simvastatin|rosuvastatin|pravastatin|lovastatin|lisinopril|amlodipine|losartan|valsartan|hydrochlorothiazide|clopidogrel|prasugrel|ticagrelor|aspirin|warfarin|apixaban|metformin|insulin glargine|insulin lispro|albuterol|ibuprofen|naproxen|amoxicillin|azithromycin|cef\w+|nitroglycerin|lorazepam|alprazolam|tramadol|morphine|hydromorphone|fentanyl|levothyroxine|omeprazole|pantoprazole|furosemide|carvedilol|atenolol|diltiazem|verapamil|spironolactone/gi;
const scheduled = /lisinopril|metoprolol|amlodipine|losartan|valsartan|hydrochlorothiazide|carvedilol|atenolol|diltiazem|verapamil|spironolactone|atorvastatin|simvastatin|rosuvastatin|pravastatin|lovastatin|metformin|clopidogrel|prasugrel|aspirin|levothyroxine|omeprazole|pantoprazole/i;
export const medName = r => text(r.medicationCodeableConcept);
export function ingredient(r) {
  const name = medName(r).toLowerCase().replace(/tylenol/g,'acetaminophen').replace(/percocet/g,'oxycodone acetaminophen').replace(/norco|vicodin/g,'hydrocodone acetaminophen');
  return [...new Set(name.match(MEDS) ?? [name.replace(/\b\d+(\.\d+)?\b.*$/,'').trim()])].sort().join('+');
}
function group(r) {
  const s = ingredient(r);
  if (/^(atorvastatin|simvastatin|rosuvastatin|pravastatin|lovastatin)$/.test(s)) return 'statin';
  if (/^(clopidogrel|prasugrel|ticagrelor)$/.test(s)) return 'p2y12';
  return s;
}
function reason(r, why) {
  r.note = [...(r.note ?? []), { text: `Synthetic chart reconciliation: ${why}.` }];
  tag(r, 'reconciled');
}
function stop(r, status, why) { r.status = status; reason(r, why); }
export function reconcileMedications(resources, date) {
  const meds = resources.filter(r => ['MedicationRequest','MedicationStatement'].includes(r.resourceType));
  const active = [];
  for (const r of meds) {
    if (!['active','on-hold'].includes(r.status)) continue;
    const end = r.effectivePeriod?.end ?? r.dispenseRequest?.validityPeriod?.end ?? r.dosageInstruction?.[0]?.timing?.repeat?.boundsPeriod?.end;
    const start = r.authoredOn ?? r.effectivePeriod?.start ?? r.dateAsserted ?? '';
    if (end && end.slice(0,10) < date) { stop(r, 'completed', `recorded course ended ${end.slice(0,10)}`); continue; }
    if (start && start.slice(0,10) < calendarAgo(date, 5*365)) { stop(r, 'stopped', 'old imported prescription without current renewal evidence'); continue; }
    if (start && start.slice(0,10) < calendarAgo(date,90) && /amoxicillin|azithromycin|ceftriaxone|cefdinir|cephalexin|ciprofloxacin|doxycycline/i.test(medName(r))) { stop(r,'completed','historical short antibiotic course'); continue; }
    if (scheduled.test(medName(r))) {
      const key = r.resourceType === 'MedicationRequest' ? 'dosageInstruction' : 'dosage';
      const doses = r[key] ?? [{}];
      for (const d of doses) {
        const fix = !d.text || /as needed|\bPRN\b/i.test(d.text) || d.asNeededBoolean;
        d.asNeededBoolean = false; delete d.asNeededCodeableConcept;
        if (fix) {
          const n = /metoprolol/i.test(medName(r)) && !/24 HR|succinate|extended release/i.test(medName(r)) ? 2 : /metformin/i.test(medName(r)) && !/24 HR|extended release/i.test(medName(r)) ? 2 : 1;
          d.text = `Take ${medName(r)} by mouth ${n === 2 ? 'twice daily' : 'daily'}.`;
          d.timing = { repeat: { frequency:n, period:1, periodUnit:'d' } };
        }
      }
      r[key] = doses;
    }
    active.push(r);
  }
  // Latest recorded prescription wins across dose changes, products and brand aliases.
  active.sort((a,b) => String(b.authoredOn ?? b.effectivePeriod?.start ?? b.dateAsserted ?? '').localeCompare(String(a.authoredOn ?? a.effectivePeriod?.start ?? a.dateAsserted ?? '')) || String(b.id).localeCompare(String(a.id)));
  const seen = new Set();
  for (const r of active) {
    const key = group(r);
    if (seen.has(key)) stop(r,'stopped','duplicate or superseded ingredient/dose'); else seen.add(key);
  }
  const combinations = active.filter(r => ['active','on-hold'].includes(r.status) && ingredient(r).includes('acetaminophen') && ingredient(r).includes('+'));
  if (combinations.length) for (const r of active) if (['active','on-hold'].includes(r.status) && ingredient(r) === 'acetaminophen') stop(r,'stopped','acetaminophen already included in combination analgesic');
  // A chart never carries two acetaminophen-containing opioid products concurrently.
  for (const r of combinations.slice(1)) stop(r,'stopped','superseded combination analgesic');
}

export function reconcileBundle(source, { date = '2026-11-02' } = {}) {
  const bundle = structuredClone(source);
  const resources = bundle.entry.map(e => { e.resource.id ??= e.fullUrl?.replace('urn:uuid:',''); return e.resource; });
  const patient = resources.find(r => r.resourceType === 'Patient');
  const pid = patient.id;
  reconcileMedications(resources, date);
  const rejected = [];
  const allergies = [];
  bundle.entry = bundle.entry.filter(e => {
    const r = e.resource;
    if (r.resourceType !== 'AllergyIntolerance') return true;
    if (r.code?.coding?.some(c => c.code === '609328004') || /allergic disposition/i.test(text(r.code))) { rejected.push(r); return false; }
    const name = text(r.code);
    if (/^(NKDA|no known|none known)/i.test(name) || r.code?.coding?.some(c => ['716186003','409137002'].includes(c.code))) { rejected.push(r); return false; }
    const coding = r.code?.coding?.[0];
    const common = ALLERGENS[coding?.code] ?? name.replace(/ \((?:substance|organism)\)/g,'').replace(/Hymenoptera venom(?: \(bees\/wasps\))?/i,'Bee and wasp venom');
    r.code = { ...r.code, text:common, ...(coding ? { coding:r.code.coding.map(c => ({ ...c, display:ALLERGENS[c.code] ?? c.display })) } : {}) };
    r.verificationStatus = cc('confirmed','Confirmed','http://terminology.hl7.org/CodeSystem/allergyintolerance-verification');
    r.clinicalStatus ??= cc('active','Active','http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical');
    r.recordedDate ??= date;
    const severe = /anaphylaxis|DRESS|hemolysis|thrombocytopenia|angioedema/i.test(name) || r.criticality === 'high';
    r.criticality = severe ? 'high' : 'low';
    if (!r.reaction?.length) {
      const environment = r.category?.includes('environment') || /pollen|mold|dust|dander/i.test(common);
      const reaction = /anaphylaxis/i.test(name) ? 'Anaphylaxis' : /angioedema/i.test(name) ? 'Angioedema' : /thrombocytopenia/i.test(name) ? 'Thrombocytopenia' : /hemolysis/i.test(name) ? 'Hemolysis' : /DRESS/i.test(name) ? 'Drug reaction with eosinophilia and systemic symptoms' : environment ? 'Sneezing and itchy eyes' : /hives|urticaria|shellfish|peanut|tree nut/i.test(name) ? 'Hives' : /lisinopril/i.test(name) ? 'Cough' : 'Rash';
      r.reaction = [{ manifestation:[{text:reaction}], severity:severe ? 'severe' : environment ? 'mild' : 'moderate' }];
      reason(r,'reaction added for synthetic scenario; not inferred clinical history');
    } else for (const reaction of r.reaction) reaction.severity ??= severe ? 'severe' : 'moderate';
    allergies.push(r);
    return true;
  });
  const add = r => { tag(r,'reconciled'); bundle.entry.push({fullUrl:`${r.resourceType}/${r.id}`,resource:r}); return r; };
  if (!allergies.some(r => r.clinicalStatus?.coding?.some(c => c.code === 'active'))) {
    add({resourceType:'AllergyIntolerance',id:id(pid,'nka'),clinicalStatus:cc('active','Active','http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'), verificationStatus:cc('confirmed','Confirmed','http://terminology.hl7.org/CodeSystem/allergyintolerance-verification'),code:cc('716186003','No Known Allergies',SNOMED),patient:ref(patient),recordedDate:date,note:[{text:'Reviewed with patient; no known allergies. Synthetic reconciliation scenario.'}]});
  }
  const age = Math.floor((Date.parse(date)-Date.parse(patient.birthDate))/31557600000);
  const slot=Number.parseInt(pid.replace(/\D/g,'').slice(-4)||'0')%(age<18?3:8)+(age<18?8:0);
  const pcpNames=['Avery Patel','Elena Ruiz','Nathan Brooks','Sophia Nguyen','Daniel Kim','Rachel Green','Amir Hassan','Lena Wilson','Grace Lin','Omar Davis','Nina Shah'];
  const pcp = add({resourceType:'Practitioner',id:id('community-pcp',slot),active:true,identifier:[{system:SYSTEM,value:`pcp-${slot}`}],name:[{text:`Dr. ${pcpNames[slot]}, ${age<18?'Pediatrics':'Internal Medicine'}`}]});
  patient.generalPractitioner = [ref(pcp,text(pcp.name?.[0]) || pcp.name[0].text)];
  if (!resources.some(r => r.resourceType === 'Coverage' && r.status === 'active')) {
    add({resourceType:'Coverage',id:id(pid,'coverage'),status:'active',type:cc(age>=65?'medicare':'commercial',age>=65?'Medicare Advantage':'Commercial PPO'),subscriberId:`VGI${pid.replace(/\W/g,'').slice(-9).toUpperCase()}`,beneficiary:ref(patient),payor:[{display:age>=65?'VGI Medicare Advantage':'VGI Community Health Plan'}],period:{start:'2026-01-01',end:'2026-12-31'}});
  }
  for (const r of resources) if (r.resourceType === 'Encounter') {
    const cls = r.class?.code;
    const originalType=(r.type??[]).map(text).join(' ');
    const prenatal=/prenatal|antenatal|postnatal|obstetric/i.test(originalType);
    const department = text(r.serviceType) || (prenatal?'Obstetrics':cls==='SS'?'General Surgery':null) || (cls === 'EMER' ? 'Emergency Medicine' : cls === 'IMP' ? 'Hospital Medicine' : age<18 ? 'Pediatrics' : 'Internal Medicine');
    r.type = [{text:`${cls==='EMER'?'Emergency Visit':cls==='IMP'?'Inpatient Stay':cls==='SS'?'Surgical Visit':prenatal?'Prenatal Visit':/well child/i.test(originalType)?'Well Child Visit':'Office Visit'} – ${department}`}];
    r.serviceType = {text:department};
    if (r.serviceProvider?.display) r.serviceProvider.display = title(r.serviceProvider.display);
    for (const l of r.location ?? []) if (l.location?.display) l.location.display = title(l.location.display);
  }
  for (const r of resources) if (['Location','Organization'].includes(r.resourceType)) r.name = title(r.name);
  // NKA assertions superseded by a new real allergy are withdrawn by the day seeder.
  return { bundle: fictionalize(bundle), rejected: fictionalize(rejected) };
}
