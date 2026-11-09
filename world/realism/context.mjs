import { fictionalize } from '../../scripts/fictional-identities.mjs';
import { readFileSync } from 'node:fs';
import { cc, ref, id, tag, text, title, stamp, calendarAgo, hash, SYSTEM, EXT, SNOMED } from './common.mjs';

const MIX = JSON.parse(readFileSync(new URL('../src/synthetic-hospital-mix.json', import.meta.url), 'utf8'));
/** Synthetic-benchmark imaging priority (Synthetic Hospital v1.3, per setting); a
 * deterministic categorical draw keyed by the order identity. */
export function imagingPriority(setting, key) {
  const split = MIX.imagingPriority.bySetting[setting];
  const total = Object.values(split).reduce((a, b) => a + b, 0);
  let u = parseInt(hash(`imaging-priority|${key}`).slice(0, 8), 16) / 2 ** 32 * total;
  for (const p of ['stat', 'urgent', 'routine']) { u -= split[p] ?? 0; if (u < 0) return p; }
  return 'routine';
}

const ACT = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const PARTICIPATION = 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType';
const WORKLIST = 'https://vgi-health.example/fhir/CodeSystem/worklist';
const LABELS = {P1:'Internal Medicine',P2:'Emergency Medicine',P3:'Hospital Medicine',P4:'Pediatrics',P5:'General Surgery'};
function workDate(day) { const idx=day-1,weeks=Math.floor(idx/5); return new Date(Date.UTC(2026,10,2)+(weeks*7+idx-weeks*5)*86400000).toISOString().slice(0,10); }
const SHIFTS = {P1:450,P2:420,P3:420,P4:480,P5:390};
const SHORT = {'718-7':'Hemoglobin','6690-2':'WBC','2823-3':'Potassium','2160-0':'Creatinine','4548-4':'Hemoglobin A1c','18262-6':'LDL','6301-6':'INR','2345-7':'Glucose','2951-2':'Sodium','3016-3':'TSH','600-7':'Blood culture','22637-3':'Pathology'};
const COMPLAINTS = {'pulmonary-embolism':'Pleuritic chest pain and shortness of breath','syncope':'Fainting','chronic-pain-flare':'Flare of chronic back pain','migraine':'Severe headache','influenza-like-illness':'Fever and cough – influenza-like illness','renal-colic':'Flank pain','peds-gastroenteritis':'Vomiting and diarrhea','copd-asthma-exacerbation':'Wheezing and shortness of breath','peds-fever-otitis':'Fever and ear pain','panic-attack':'Anxiety and palpitations','acute-low-back-pain':'Low back pain','laceration':'Hand laceration','peds-asthma':'Wheezing','fracture':'Forearm pain after fall','acute-cholecystitis':'Right upper abdominal pain',pneumonia:'Cough and shortness of breath','musculoskeletal-injury':'Ankle pain after fall','chest-pain':'Chest pain', 'abdominal-pain':'Abdominal pain', 'appendicitis':'Right lower quadrant pain', 'cholecystitis':'Right upper quadrant pain', 'asthma':'Wheezing and shortness of breath', 'pyelonephritis':'Fever and flank pain', 'hyperglycemia':'High blood glucose', 'copd':'Shortness of breath', 'cellulitis':'Redness and swelling of leg'};
function pendingWork(scenario,index) {
  const labs=/pneumonia|embolism|cellulitis|abdominal|appendicitis|syncope|chest-pain|renal-colic|pyelonephritis|hyperglycemia|cholecystitis/.test(scenario);
  const labText=/chest-pain|embolism/.test(scenario)?'CBC, BMP, troponin':/pyelonephritis|renal-colic/.test(scenario)?'CBC, BMP, urinalysis':/hyperglycemia/.test(scenario)?'BMP, venous blood gas, ketones':'CBC, BMP';
  const image=/pneumonia|copd|chest-pain/.test(scenario)?'Chest X-ray':/pulmonary-embolism/.test(scenario)?'CT pulmonary angiography':/cholecystitis/.test(scenario)?'Right upper quadrant ultrasound':/abdominal|appendicitis/.test(scenario)?'CT abdomen and pelvis with IV contrast':/renal-colic/.test(scenario)?'CT renal stone protocol':/fracture/.test(scenario)?'Forearm X-ray':/musculoskeletal-injury/.test(scenario)?'Ankle X-ray':null;
  return {labs:labs&&index%3!==2?labText:null,image:image&&index%4!==3?image:null};
}
function businessGap(before,after) {
  let n=0;
  for(let t=Date.parse(before+'T12:00:00Z');t<Date.parse(after+'T12:00:00Z');t+=86400000) { const d=new Date(t).getUTCDay();if(d!==0&&d!==6)n++; }
  return n;
}
export function resultSummary(observations) {
  return observations.map(o => {
    const code = o.code?.coding?.[0]?.code;
    const name = SHORT[code] ?? text(o.code);
    const value = o.valueQuantity ? `${o.valueQuantity.value}${o.valueQuantity.unit ? ' '+o.valueQuantity.unit : ''}` : o.valueString ?? '';
    const flag = o.interpretation?.flatMap(c=>c.coding??[]).map(c=>c.code).find(c=>['H','L','A','HH','LL'].includes(c));
    return `${['718-7','6690-2'].includes(code) ? 'CBC: ' : ''}${name}: ${value}${flag ? ' ('+flag+')' : ''}`;
  }).join('; ');
}
export function enrichRefill(original, {date,pharmacy,owner}) {
  const task = structuredClone(original);
  const rx = task.contained?.find(r => r.resourceType==='MedicationRequest' && '#'+r.id===task.focus?.reference);
  if (!rx) return task;
  const name = text(rx.medicationCodeableConcept);
  const freq = rx.dosageInstruction?.[0]?.timing?.code?.text;
  const days = rx.dispenseRequest?.expectedSupplyDuration?.value ?? 30;
  const daily = {daily:1,BID:2,TID:3,TIDAC:3,QID:4,q12h:2,q8h:3,q6h:4,q4h:6,nightly:1}[freq] ?? 1;
  const liquid = /insulin|albuterol|inhal/i.test(name);
  const dose=rx.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value??1;
  const quantity = liquid ? /insulin/i.test(name) ? Math.max(15,Math.ceil(dose*daily*days/100/15)*15) : 1 : days*daily;
  const unit = liquid ? /insulin/i.test(name) ? 'mL' : 'inhaler' : 'tablet';
  rx.dispenseRequest = {...rx.dispenseRequest,performer:ref(pharmacy),quantity:{value:quantity,unit},expectedSupplyDuration:{value:days,unit:'days',system:'http://unitsofmeasure.org',code:'d'}};
  // Original authoredOn uses simulation-day arithmetic. A fill is a calendar event.
  const authored = rx.authoredOn?.slice(0,10);
  const requested=task.authoredOn?.slice(0,10)??date;
  const worldFill=task.meta?.tag?.some(t=>t.system==='urn:vgi:world'&&t.code==='synthetic-today');
  const filled = authored && authored < date ? worldFill?calendarAgo(requested,businessGap(authored,requested)):authored : calendarAgo(date,days-3);
  const dispense = {resourceType:'MedicationDispense',id:'last-fill',status:'completed',medicationCodeableConcept:rx.medicationCodeableConcept,subject:task.for,authorizingPrescription:[ref('#'+rx.id)],performer:[{actor:ref(pharmacy)}],quantity:{value:quantity,unit},daysSupply:{value:days,unit:'days',system:'http://unitsofmeasure.org',code:'d'},whenHandedOver:filled+'T09:00:00-08:00'};
  task.contained = task.contained.filter(r=>r.id!=='last-fill').concat(dispense);
  task.owner = owner;
  task.requester = ref(pharmacy);
  task.input = [...(task.input??[]).filter(i=>i.type?.text!=='Last fill'),{type:{text:'Last fill'},valueReference:ref('#last-fill')}];
  task.description = `${task.description}; ${pharmacy.name}; quantity ${quantity} ${unit}; ${days} days; last fill ${filled}`;
  return task;
}

/** One shared, dated FHIR graph; List resources define the exact visible collections. */
export function dayContext({seed,day,date,schedules,state,previous,population,charts,operationHistory=new Map(),caseMix='legacy'}) {
  const entries = new Map();
  const add = (r, persona, kind='list-context') => {
    tag(r,kind,`day-${day}`,...(persona?[persona]:[]));
    if(persona) r.meta.tag.push({system:WORKLIST,code:`${persona}-${r.resourceType==='Appointment'?'appointments':r.resourceType==='Encounter'?'census':'context'}`});
    entries.set(`${r.resourceType}/${r.id}`,r); return r;
  };
  const make = (type,key,data,p,kind) => add({resourceType:type,id:id(seed,day,key),...data},p,kind);
  const allTasks = Object.values(schedules).flatMap(s=>s.tasks);
  const busy = new Set(allTasks.map(t=>t.patientId));
  const roster = [...population].sort((a,b)=>id(seed,day,a.id).localeCompare(id(seed,day,b.id)));
  const choose = (p,eligible=()=>true) => {
    const q = roster.find(q=>!busy.has(q.id) && (p==='P4'?q.age<18:q.age>=18) && (!q.personaFits || q.personaFits[p]) && eligible(q.id));
    if(!q) throw new Error(`Insufficient day context population for ${p}`);
    busy.add(q.id); return q.id;
  };
  const pmap = new Map(population.map(p=>[p.id,p]));
  const patient = pid => ref(`Patient/${pid}`,pmap.get(pid)?.name);
  const hospital = make('Organization','hospital',{active:true,name:'VGI Community Hospital'});
  const pharmacy = make('Organization','pharmacy',{active:true,name:'VGI Community Pharmacy',type:[cc('prov','Healthcare Provider','http://terminology.hl7.org/CodeSystem/organization-type')],telecom:[{system:'phone',value:'555-010-2040'}]});
  const lab = make('Organization','lab',{active:true,name:'VGI Central Laboratory'});
  const providers = {};
  for(const p of ['P1','P2','P3','P4','P5','RN2','SURG2','SURG3']) providers[p] = make('Practitioner',`provider-${p}`,{active:true,identifier:[{system:p.startsWith('SURG')?SYSTEM:'https://vgi-health.example/fhir/sid/persona',value:p}],name:[{text:{P1:'Dr. Maya Chen, MD',P2:'Dr. Marcus Okafor, MD',P3:'Rosa Delgado, RN',P4:'Priya Raman, MSN, CPNP',P5:'Dr. James Whitaker, MD, FACS',RN2:'Ethan Park, RN',SURG2:'Dr. Taylor Morgan',SURG3:'Dr. Dana Ruiz'}[p]}]});
  const units = {};
  for(const p of Object.keys(LABELS)) units[p] = make('Location',`unit-${p}`,{status:'active',mode:'instance',name:p==='P3'?'4 West Medical-Surgical Unit':LABELS[p],managingOrganization:ref(hospital),physicalType:cc('wa','Ward','http://terminology.hl7.org/CodeSystem/location-physical-type')},p);
  const list = (p,key,name,rows) => make('List',`${p}-${key}`,{status:'current',mode:'snapshot',title:name,code:cc(key,name),date:stamp(date,420),source:ref(providers[p]),entry:rows.map(r=>({item:ref(r)}))},p);
  function orders(enc,pid,p,clinical={},includeCode=true) {
    const older = (pmap.get(pid)?.age??0)>=80;
    const dnr = older && (Number.parseInt(id(pid,'goals').slice(-4),16)%5===0) && p!=='P5';
    if(includeCode) make('ServiceRequest',`${enc.id}-code`,{status:'active',intent:'order',code:cc(dnr?'dnr':'full-code',dnr?'Do Not Resuscitate (DNR)':'Full Code'),subject:patient(pid),encounter:ref(enc),requester:ref(providers[p==='P3'?'P1':p]),authoredOn:enc.period.start,note:[{text:dnr?'Goals of care reviewed with patient and family; DNR documented for this synthetic admission.':'Full resuscitation confirmed at admission.'}]},p,'patient-context');
    const isolation = /c[.]? difficile/i.test(clinical.diagnosis??'') ? 'Contact precautions' : /influenza|flu-like/i.test(clinical.diagnosis??'') ? 'Droplet precautions' : 'No isolation';
    make('ServiceRequest',`${enc.id}-isolation`,{status:'active',intent:'order',code:cc(isolation==='No isolation'?'no-isolation':isolation==='Droplet precautions'?'droplet-precautions':'contact-precautions',isolation),subject:patient(pid),encounter:ref(enc),requester:ref(providers[p==='P3'?'P1':p]),authoredOn:enc.period.start},p,'patient-context');
  }
  function antiplateletPlan(pid,enc,key,urgent=false) {
    if([...entries.values()].some(r=>r.resourceType==='CarePlan'&&r.encounter?.reference===ref(enc).reference))return;
    const antiplatelets=charts.get(pid)?.bundle.entry.map(x=>x.resource).filter(r=>['MedicationRequest','MedicationStatement'].includes(r.resourceType)&&['active','on-hold'].includes(r.status)&&/aspirin|clopidogrel|prasugrel|ticagrelor/i.test(text(r.medicationCodeableConcept)))??[];
      if(antiplatelets.length) make('CarePlan',`antiplatelet-plan-${key}`,{status:'active',intent:'plan',title:'Perioperative antiplatelet plan',subject:patient(pid),encounter:ref(enc),description:'Synthetic elective general-surgery plan: aspirin continued when prescribed for secondary prevention; P2Y12 therapy requires surgical/anesthesia review before proceeding. No automatic medication administration.',activity:antiplatelets.map(r=>({detail:{status:'scheduled',code:{text:`Review ${text(r.medicationCodeableConcept)}`},description:urgent?'Urgent surgery: review last dose and bleeding/thrombosis risks with surgical and anesthesia teams; elective washout cannot be assumed.':/prasugrel/i.test(text(r.medicationCodeableConcept))?'Hold prasugrel 7 days pre-op after prescriber review; resume when hemostasis secure.':/clopidogrel/i.test(text(r.medicationCodeableConcept))?'Hold clopidogrel 5 days pre-op after prescriber review; resume when hemostasis secure.':/ticagrelor/i.test(text(r.medicationCodeableConcept))?'Hold ticagrelor 3 days pre-op after prescriber review; resume when hemostasis secure.':'Continue low-dose aspirin for secondary prevention if approved by surgeon/anesthesia.'}}))},'P5','patient-context');
  }
  function encounter(pid,p,key,cls,start,diagnosis,bed,extra={}) {
    const e = make('Encounter',key,{status:'in-progress',class:{system:ACT,code:cls,display:cls==='EMER'?'Emergency':cls==='IMP'?'Inpatient':'Surgical'},type:[{text:`${cls==='EMER'?'Emergency Visit':cls==='IMP'?'Inpatient Stay':'Surgical Visit'} – ${LABELS[p]}`}],serviceType:{text:LABELS[p]},subject:patient(pid),period:{start},serviceProvider:ref(hospital),participant:[{type:[cc('ATND','Attending',PARTICIPATION)],individual:ref(providers[p==='P3'?'P1':p])},{type:[cc('PPRF','Registered nurse',PARTICIPATION)],individual:ref(providers[p==='P3'?'P3':'RN2'])}],reasonCode:[{text:diagnosis}],location:[{location:ref(bed??units[p]),status:'active'}],...extra},p);
    orders(e,pid,p,{diagnosis},cls!=='EMER'||extra.extension?.some(x=>x.url===EXT+'disposition'&&x.valueString==='Admit'));
    return e;
  }
  for(const p of ['P1','P4']) {
    const tasks = schedules[p].tasks.filter(t=>['W1','W5'].includes(t.workflow));
    const patients = [...new Set(tasks.map(t=>t.patientId))].slice(0,18);
    while(patients.length<16) patients.push(choose(p));
    const appointments = patients.map((pid,i)=> {
      const start = SHIFTS[p]+i*25+(i>=8?45:0);
      const visit = p==='P4'?['Well Child Visit','Acute Visit','Asthma Follow-up'][i%3]:['Established Patient','Annual Wellness Visit','New Patient','Hospital Follow-up'][i%4];
      const status = !tasks.some(t=>t.patientId===pid)&&i===patients.length-1?'noshow':i<4?'fulfilled':i===4?'arrived':i===5?'checked-in':'booked';
      return make('Appointment',`${p}-slot-${i}`,{status,start:stamp(date,start),end:stamp(date,start+25),minutesDuration:25,appointmentType:cc(visit.toLowerCase().replaceAll(' ','-'),visit),serviceType:[{text:LABELS[p]}],description:`${visit} – ${LABELS[p]}`,participant:[{actor:patient(pid),status:'accepted'},{actor:ref(providers[p]),status:'accepted'},{actor:ref(units[p]),status:'accepted'}]},p);
    });
    list(p,'clinic-schedule',`${LABELS[p]} – Full Day`,appointments);
  }
  const edRows=[];
  for(const [i,a] of state.today.ed.arrivals.entries()) {
    const bed = make('Location',`ed-bed-${i}`,{status:'active',name:`ED ${String(i+1).padStart(2,'0')}`,physicalType:cc('bd','Bed','http://terminology.hl7.org/CodeSystem/location-physical-type'),partOf:ref(units.P2)},'P2');
    const work=pendingWork(a.scenario,i);
    const imaging=work.image&&caseMix==='synthetic-hospital'?imagingPriority('ed',`${seed}|${day}|${a.taskId}`):null;
    const e = encounter(a.patientId,'P2',`ed-${a.taskId}`,'EMER',stamp(date,a.arrivalClock),COMPLAINTS[a.scenario]??title(a.scenario.replaceAll('-',' ')),bed,{priority:cc(String(a.esi),`ESI ${a.esi}`,SYSTEM+'/esi'),extension:[{url:EXT+'disposition',valueString:{admit:'Admit',discharge:'Discharge after reassessment',consult:'Surgical consultation'}[a.disposition]??'Evaluation in progress'},{url:EXT+'pending-labs',valueString:work.labs?work.labs+' pending':'No pending labs'},{url:EXT+'pending-imaging',valueString:work.image?work.image+' pending'+(imaging?` (${imaging.toUpperCase()})`:''):'No pending imaging'}]});
    // A census is a simultaneous board snapshot, capped at 20 of the day's arrivals.
    if(edRows.length<20) edRows.push(e);
    for(const kind of ['labs','imaging']) {
      const label=kind==='labs'?work.labs:work.image;
      if(label) make('ServiceRequest',`${e.id}-${kind}`,{status:'active',intent:'order',...(kind==='imaging'&&imaging?{priority:imaging}:{}),code:cc(label.toLowerCase().replaceAll(/[^a-z0-9]+/g,'-'),label),subject:patient(a.patientId),encounter:ref(e),requester:ref(providers.P2),authoredOn:stamp(date,a.arrivalClock+10)},'P2');
    }
  }
  while(edRows.length<16) {
    const i=edRows.length,pid=choose('P2');
    const bed=make('Location',`ed-extra-bed-${i}`,{status:'active',name:`ED ${i+1}`,partOf:ref(units.P2)},'P2');
    edRows.push(encounter(pid,'P2',`ed-extra-${i}`,'EMER',stamp(date,420+i*15),'Dizziness and weakness',bed,{priority:cc('3','ESI 3',SYSTEM+'/esi'),extension:[{url:EXT+'disposition',valueString:'Evaluation in progress'},{url:EXT+'pending-labs',valueString:'CBC, BMP pending'},{url:EXT+'pending-imaging',valueString:'No pending imaging'}]}));
  }
  list('P2','ed-census','Emergency Department Census',edRows);
  const wardRows=[];
  const shift=state.today.ward.censusAtShiftStart;
  const occupiedRooms=new Set(shift.map(ip=>ip.room));
  const freeRooms=Array.from({length:24},(_,i)=>'4W-'+String(i+1).padStart(2,'0')).filter(room=>!occupiedRooms.has(room));
  for(let i=0;i<12;i++) {
    const ip=shift[i],pid=ip?.patientId??choose('P3');
    const roomName=ip?.room??freeRooms.shift();
    const bed=make('Location',`ward-bed-${i}`,{status:'active',name:`${roomName}-A`,partOf:ref(units.P3),physicalType:cc('bd','Bed','http://terminology.hl7.org/CodeSystem/location-physical-type')},'P3');
    const admitted=ip?previous.inpatients.find(x=>x.patientId===pid):null;
    const admitDate=admitted?workDate(admitted.admitDay):calendarAgo(date,2);
    const e=encounter(pid,'P3',`ward-${i}`,'IMP',stamp(admitDate,admitted?.admitClock??900),ip?.diagnosis??['Acute kidney injury','Pneumonia improving','Heart failure exacerbation'][i%3],bed,{extension:[{url:EXT+'nursing-assignment',valueString:i<5?'Assigned to Rosa Delgado, RN':'Unit patient – other RN'}]});
    if(ip?.service==='surgery') { e.serviceType={text:'General Surgery'};e.type=[{text:'Inpatient Stay – General Surgery'}];e.participant[0].individual=ref(providers.P5); }
    if(i>=5) e.participant=e.participant.filter(x=>x.individual.reference!==ref(providers.P3).reference).concat({type:[cc('PPRF','Registered nurse',PARTICIPATION)],individual:ref(providers.RN2)});
    wardRows.push(e);
  }
  for(const pid of new Set(schedules.P3.tasks.map(t=>t.patientId)))if(!wardRows.some(e=>e.subject.reference===patient(pid).reference)) {
    const ip=state.inpatients.find(x=>x.patientId===pid);
    const bed=make('Location',`ward-admission-bed-${pid}`,{status:'active',name:ip?.room?ip.room+'-A':'4 West admission bed',partOf:ref(units.P3)},'P3');
    encounter(pid,'P3',`ward-admission-${pid}`,'IMP',stamp(ip?workDate(ip.admitDay):date,ip?.admitClock??720),ip?.diagnosis??'Inpatient admission',bed);
  }
  list('P3','my-patients','My Patients – 4 West',wardRows.slice(0,5));
  list('P3','unit-census','4 West Unit Census',wardRows);
  const cases=[];
  const actual=state.surgicalCases.filter(c=>c.orDay===day).sort((a,b)=>(a.orStartClock??450)-(b.orStartClock??450));
  for(let room=0;room<2;room++) {
    const location=make('Location',`or-room-${room}`,{status:'active',name:`Operating Room ${room+1}`,partOf:ref(units.P5)},'P5');
    for(let slot=0;slot<5;slot++) {
      const index=room*5+slot,source=actual[index];
      const procedure=source?.procedure??['laparoscopic cholecystectomy','laparoscopic inguinal hernia repair','excision of soft tissue mass','laparoscopic ventral hernia repair','umbilical hernia repair'][slot];
      const removal=/cholecystectomy/i.test(procedure)?'cholecystectomy':/appendectomy/i.test(procedure)?'appendectomy':null;
      const pid=source?.patientId??choose('P5',pid=>{
        // Background OR cases use the imported cohort, separate from future task episodes.
        if(!pid.startsWith('sh-'))return false;
        return !removal||(!operationHistory.get(pid)?.has(removal)&&!charts.get(pid).bundle.entry.some(e=>e.resource.resourceType==='Procedure'&&JSON.stringify(e.resource.code).toLowerCase().includes(removal)));
      });
      if(removal) {if(!operationHistory.has(pid))operationHistory.set(pid,new Set());operationHistory.get(pid).add(removal);}
      const start=source?.orStartClock??450+slot*105;
      const end=source?.orEndClock??start+75;
      const e=encounter(pid,'P5',`or-enc-${index}`,'SS',stamp(date,start-60),source?.diagnosis??procedure,location);
      const operatingProvider=source?providers.P5:state.context.p5DayType==='or'&&room===0?providers.P5:room===0?providers.SURG2:providers.SURG3;
      e.participant[0].individual=ref(operatingProvider);
      const request=make('ServiceRequest',`or-case-${index}`,{status:slot===0?'completed':'active',intent:'order',category:[cc('387713003','Surgical procedure',SNOMED)],code:{text:title(procedure)},subject:patient(pid),encounter:ref(e),requester:ref(providers.P5),performer:[ref(operatingProvider)],locationReference:[ref(location)],occurrencePeriod:{start:stamp(date,start),end:stamp(date,end)},authoredOn:stamp(calendarAgo(date,7),600),note:[{text:slot===0?'Complete – PACU':slot===1?'In room':slot===2?'Pre-op ready':'Scheduled'}]},'P5');
      make('Procedure',`or-procedure-${index}`,{status:slot===0?'completed':slot===1?'in-progress':'preparation',basedOn:[ref(request)],subject:patient(pid),encounter:ref(e),code:{text:title(procedure)},location:ref(location),performer:[{actor:ref(operatingProvider)}],...(slot<2?{performedPeriod:{start:stamp(date,start),...(slot===0?{end:stamp(date,end)}:{})}}:{})},'P5');
      antiplateletPlan(pid,e,index,source?.urgency==='urgent');
      cases.push(request);
    }
  }
  // Give each surgical task its actual setting, separately from the department's OR context.
  for(const pid of new Set(schedules.P5.tasks.filter(t=>t.workflow==='W6').map(t=>t.patientId))) {
    const tasks=schedules.P5.tasks.filter(t=>t.workflow==='W6'&&t.patientId===pid);
    const c=state.surgicalCases.find(c=>c.patientId===pid);
    const preop=tasks.some(t=>t.choices.w6Step==='preop');
    let enc=[...entries.values()].find(r=>r.resourceType==='Encounter'&&r.subject?.reference===patient(pid).reference&&r.class.code!=='EMER');
    if(!enc) enc=encounter(pid,'P5',`surgical-target-${pid}`,preop?'SS':'IMP',stamp(date,390),c?(preop?'Preoperative assessment for ':'s/p ')+c.procedure:'General surgery inpatient care',preop?units.P5:units.P3);
    if(preop) enc.type=[{text:'Preoperative Visit – General Surgery'}];
    if(c?.orDay<day&&!preop) {
      const pod=Math.round((Date.parse(date)-Date.parse(workDate(c.orDay)))/86400000);
      enc.extension=[...(enc.extension??[]),{url:EXT+'postoperative-day',valueInteger:pod}];
      enc.reasonCode=[{text:`s/p ${c.procedure} – POD ${pod}`}];
    }
    antiplateletPlan(pid,enc,'task-'+pid,c?.urgency==='urgent');
  }
  list('P5','or-schedule','Operating Rooms – Full Day',cases);
  const consults=[];
  for(let i=0;i<3;i++) {
    const t=schedules.P5.tasks.filter(t=>t.choices.w6Step==='consult')[i];
    const pid=t?.patientId??choose('P5');
    consults.push(make('ServiceRequest',`consult-${i}`,{status:'active',intent:'order',priority:i===0?'urgent':'routine',code:cc('11429006','Surgical consultation',SNOMED),subject:patient(pid),requester:ref(providers.P2),performer:[ref(providers.P5)],authoredOn:stamp(date,540+i*95),reasonCode:[{text:['Acute appendicitis','Symptomatic gallstones','Inguinal hernia'][i]}],locationReference:[ref(units.P2)]},'P5'));
  }
  list('P5','consults','Surgical Consults',consults);
  for(const p of Object.keys(LABELS)) {
    const inbox=[];
    for(const t of schedules[p].tasks) {
      for(const original of t.todayResources.filter(r=>r.resourceType==='AllergyIntolerance')) {
        const allergy=structuredClone(original);
        for(const reaction of allergy.reaction??[])reaction.severity??=allergy.criticality==='high'?'severe':'moderate';
        add(allergy,p,'patient-context');
      }
      if(t.workflow==='W2') {
        const observations=t.todayResources.filter(r=>r.resourceType==='Observation');
        const summary=resultSummary(observations);
        for(const o of observations) add(structuredClone(o),p,'patient-context');
        const report=make('DiagnosticReport',`${t.id}-report`,{status:'final',code:{text:'Laboratory results'},subject:patient(t.patientId),performer:[ref(lab)],resultsInterpreter:[ref(providers[p])],result:observations.map(o=>ref(o)),conclusion:summary,issued:stamp(date,SHIFTS[p]+t.startMin)},p,'patient-context');
        inbox.push(make('Task',`${t.id}-result-message`,{status:'requested',intent:'order',code:cc('result-review','Review result'),description:summary,for:patient(t.patientId),requester:ref(lab),owner:ref(providers[p]),focus:ref(report),authoredOn:stamp(date,SHIFTS[p]+t.startMin)},p,'patient-context'));
      }
      for(const r of t.todayResources.filter(r=>r.resourceType==='Task'&&r.contained?.some(c=>c.resourceType==='MedicationRequest'))) inbox.push(add(enrichRefill(r,{date,pharmacy,owner:ref(providers[p])}),p,'patient-context'));
    }
    // Supplementary portal/result/Rx items are list context, never simulator tasks.
    for(let i=0;i<6;i++) {
      const pid=choose(p);
      if(i<2) {
        const low=i===0,value=low?8.4:13.6;
        const observation=make('Observation',`${p}-inbox-obs-${i}`,{status:'final',category:[cc('laboratory','Laboratory','http://terminology.hl7.org/CodeSystem/observation-category')],code:cc('718-7','Hemoglobin','http://loinc.org'),subject:patient(pid),valueQuantity:{value,unit:'g/dL',system:'http://unitsofmeasure.org',code:'g/dL'},interpretation:[cc(low?'L':'N',low?'Low':'Normal','http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation')],effectiveDateTime:stamp(date,480+i*20)},p);
        inbox.push(make('Task',`${p}-inbox-result-${i}`,{status:'requested',intent:'order',code:cc('result-review','Review result'),description:resultSummary([observation]),for:patient(pid),owner:ref(providers[p]),requester:ref(lab),focus:ref(observation),authoredOn:stamp(date,540+i*20)},p));
      } else if(i<4) {
        const med=p==='P4'?'Cetirizine 5 MG Oral Tablet':'Lisinopril 10 MG Oral Tablet';
        const base={resourceType:'Task',id:id(seed,day,p,'rx-context',i),status:'requested',intent:'order',code:cc('refill-request','Refill request'),description:`Refill request: ${med}`,for:patient(pid),focus:ref('#current-rx'),authoredOn:stamp(date,600+i*15),contained:[{resourceType:'MedicationRequest',id:'current-rx',status:'active',intent:'order',subject:patient(pid),medicationCodeableConcept:{text:med},authoredOn:calendarAgo(date,27)+'T09:00:00-08:00',dosageInstruction:[{text:'One tablet daily',asNeededBoolean:false,timing:{code:{text:'daily'}}}]}]};
        inbox.push(add(enrichRefill(base,{date,pharmacy,owner:ref(providers[p])}),p));
      } else inbox.push(make('Communication',`${p}-portal-${i}`,{status:'completed',category:[cc('patient-message','Patient message')],subject:patient(pid),sender:patient(pid),recipient:[ref(providers[p])],sent:stamp(date,650+i*12),payload:[{contentString:i===4?'Please clarify when my next follow-up visit should be scheduled.':'Requesting a return call about home blood pressure readings.'}]},p));
    }
    list(p,'inbox',`${LABELS[p]} Inbox`,inbox);
  }
  // Include demographics for every listed patient. Full chart overlays stay in fixtures/clinical.
  const used = new Set();
  const scan=v=>{if(!v||typeof v!=='object')return;if(typeof v.reference==='string'&&v.reference.startsWith('Patient/'))used.add(v.reference.slice(8));for(const x of Object.values(v))if(typeof x==='object')scan(x);};
  [...entries.values()].forEach(scan);
  for(const pid of used) {
    const source=charts.get(pid)?.bundle.entry.find(e=>e.resource.resourceType==='Patient')?.resource;
    if(source) add(structuredClone(source),undefined,'patient-context');
  }
  return fictionalize({resourceType:'Bundle',id:id(seed,day,'context'),type:'collection',entry:[...entries.values()].map(resource=>({fullUrl:`${resource.resourceType}/${resource.id}`,resource}))});
}
