#!/usr/bin/env python3
"""Create fictional FHIR/payload inputs; screenshots are exported by Lean.
CDC values are published reference points, never invented patient percentiles.
Run with --refresh-reference only when deliberately updating the reference input.
"""
from pathlib import Path
import base64
import csv
import io
import json
import sys
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'lean/Ehr/Render/TestData'
OUT.mkdir(parents=True, exist_ok=True)
resources = []
def add(kind, **fields):
    if kind in ['Observation', 'AllergyIntolerance', 'DocumentReference'] and 'subject' not in fields:
        fields['subject'] = dict(reference='Patient/p0' if str(fields.get('id','')).startswith('growth-') else 'Patient/p1')
    resource = dict(resourceType=kind, **fields)
    resources.append(resource)
    return resource

def cc(text): return dict(text=text)
def ref(kind, id, display=None):
    return dict(reference=f'{kind}/{id}', **(dict(display=display) if display else {}))
def qty(value, unit): return dict(value=value, unit={'Cel':'°C','{score}':'score','mm[Hg]':'mmHg'}.get(unit,unit), code=unit, system='http://unitsofmeasure.org')

people = [('Morgan', 'Alex', '2017-05-01', 'female'), ('Chen', 'David', '1974-03-22', 'male'),
          ('Patel', 'Anika', '1988-06-18', 'female'), ('Williams', 'James', '1961-12-06', 'male'),
          ('Garcia', 'Elena', '1994-10-25', 'female'), ('Anderson', 'Robert', '1958-08-13', 'male')]
for i, (family, given, dob, sex) in enumerate(people):
    add('Patient', id=f'p{i}', name=[dict(family=family, given=[given])], birthDate=dob, gender=sex,
        identifier=[dict(type=dict(coding=[dict(code='MR')]), value=f'0045{i}892')],
        generalPractitioner=[dict(display='Maya Brooks, MD')])
add('Practitioner', id='dr', name=[dict(family='Brooks', given=['Maya'])])
add('Location', id='clinic', name='Family Medicine • West Pavilion')
complaints = ['Well child visit', 'Blood pressure follow-up', 'Persistent cough', 'Diabetes follow-up', 'Annual physical', 'Knee pain']
for i, complaint in enumerate(complaints):
    add('Appointment', id=f'appt{i}', start=f'2026-11-01T{8+i//4:02}:{i%4*15:02}:00', end=f'2026-11-01T{8+i//4:02}:{i%4*15+14:02}:00',
        status=['arrived','arrived','booked','booked','booked','booked'][i], appointmentType=cc(['Well child', 'Office visit', 'Same day', 'Return visit', 'Preventive', 'Office visit'][i]),
        reasonCode=[cc(complaint)], participant=[dict(actor=ref('Patient',f'p{i}'),status='accepted'),dict(actor=ref('Practitioner','dr'),status='accepted'),dict(actor=ref('Location','clinic'),status='accepted')])
for i in range(6):
    add('Encounter', id=f'enc{i}', status='in-progress', **{'class':dict(code='EMER')}, subject=ref('Patient',f'p{i}'),
        period=dict(start=f'2026-11-01T07:{i*7:02}:00'), reasonCode=[cc(['Abdominal pain','Chest pain','Shortness of breath','Fall, left hip pain','Headache','Dizziness'][i])],
        location=[dict(location=dict(display=f'ED {i+3:02}'))], participant=[dict(type=[dict(coding=[dict(code='ATND')])],individual=dict(display='Nora Shah, MD'))])
add('Encounter',id='inpatient',status='in-progress',**{'class':dict(code='IMP')},subject=ref('Patient','p1'),period=dict(start='2026-11-01T08:00:00'),location=[dict(location=dict(display='5 West • 512B'))],participant=[dict(individual=dict(display='Daniel Park, MD'))])
add('AllergyIntolerance', id='allergy', clinicalStatus=dict(coding=[dict(code='active')]), code=cc('Amoxicillin'),
    reaction=[dict(manifestation=[cc('Hives')], severity='moderate')])
for code, name, unit, values in [('8867-4','Heart rate','/min',[82,79,76]),('9279-1','Respiratory rate','/min',[18,17,16]),
    ('8310-5','Temperature','Cel',[37.3,37.1,37.0]),('2708-6','Oxygen saturation','%',[97,98,98]),
    ('72514-3','Pain score','{score}',[6,3,2]),('9000-1','Oral intake','mL',[240,180,240]),('9187-6','Urine output','mL',[350,250,400])]:
    for i, v in enumerate(values):
        add('Observation', id=f'{code}-{i}', status='final', category=[dict(coding=[dict(code='exam' if code in ['9000-1','9187-6'] else 'vital-signs')])], code=dict(text=name,coding=[dict(code=code)]),
            valueQuantity=qty(v,unit), effectiveDateTime=f'2026-11-01T{6+i*2:02}:00:00')
for i,(systolic,diastolic) in enumerate([(128,76),(126,74),(124,72)]):
    add('Observation',id=f'bp-{i}',status='final',category=[dict(coding=[dict(code='vital-signs')])],code=dict(text='Blood pressure',coding=[dict(code='85354-9')]),
        effectiveDateTime=f'2026-11-01T{6+i*2:02}:00:00',component=[dict(code=dict(text='Systolic',coding=[dict(code='8480-6')]),valueQuantity=qty(systolic,'mm[Hg]')),dict(code=dict(text='Diastolic',coding=[dict(code='8462-4')]),valueQuantity=qty(diastolic,'mm[Hg]'))])
add('Observation',id='adult-weight',status='final',category=[dict(coding=[dict(code='vital-signs')])],code=dict(text='Body weight',coding=[dict(code='29463-7')]),valueQuantity=qty(82.4,'kg'),effectiveDateTime='2026-11-01T06:00:00')
for i, (date,w,h) in enumerate([('2024-05-01',22.2,120.4),('2024-11-01',23.1,123.2),('2025-05-01',24.7,126.4),('2025-11-01',26.2,129.5),('2026-05-01',28.1,132.7),('2026-11-01',30.4,135.6)]):
    for code, name, value, unit in [('29463-7','Body weight',w,'kg'),('8302-2','Body height',h,'cm')]:
        add('Observation',id=f'growth-{code}-{i}',status='final',category=[dict(coding=[dict(code='vital-signs')])],code=dict(text=name,coding=[dict(code=code)]),valueQuantity=qty(value,unit),effectiveDateTime=date+'T08:00:00')
for code,name,unit,lo,hi,values in [('6298-4','Potassium','mmol/L',3.5,5.1,[3.3,3.6,4.0]),('718-7','Hemoglobin','g/dL',12,17.5,[11.2,11.5,11.7]),('38483-4','Creatinine','mg/dL',.6,1.3,[1.4,1.2,1.0])]:
    for i,v in enumerate(values):
        add('Observation', id=f'lab-{code}-{i}',status='final',category=[dict(coding=[dict(code='laboratory')])], code=dict(text=name,coding=[dict(code=code)]),
            effectiveDateTime=f'2026-10-{29+i:02}T06:30:00',valueQuantity=qty(v,unit),referenceRange=[dict(low=qty(lo,unit),high=qty(hi,unit))])
add('Observation',id='lab-hgb-prior-unit',status='final',category=[dict(coding=[dict(code='laboratory')])],code=dict(text='Hemoglobin',coding=[dict(code='718-7')]),
    effectiveDateTime='2025-11-01T06:30:00',valueQuantity=qty(120,'g/L'),referenceRange=[dict(low=qty(120,'g/L'),high=qty(175,'g/L'))])
add('Observation',id='lab-culture',status='final',category=[dict(coding=[dict(code='laboratory')])],code=dict(text='Urine culture',coding=[dict(code='630-4')]),
    effectiveDateTime='2026-10-31T14:20:00',valueString='No growth',referenceRange=[dict(text='No growth')],interpretation=[dict(coding=[dict(code='N')])])
add('Observation',id='lab-protein',status='final',category=[dict(coding=[dict(code='laboratory')])],code=dict(text='Protein, urine',coding=[dict(code='2888-6')]),
    effectiveDateTime='2026-10-31T14:20:00',valueQuantity={**qty(5,'mg/dL'),'comparator':'<'},referenceRange=[dict(low=qty(0,'mg/dL'),high=qty(14,'mg/dL'))],interpretation=[dict(coding=[dict(code='N')])])
for i,(med,dose,unit,route,freq,status,hours,given_hour) in enumerate([
    ('Acetaminophen 500 mg tablet',500,'mg','Oral','Every 6 hours','active',[8,14],8),
    ('Cefazolin 1 g injection',1,'g','Intravenous','Every 8 hours','active',[6,14],6),
    ('Enoxaparin 40 mg/0.4 mL',40,'mg','Subcutaneous','Daily','on-hold',[9],9),
    ('Metoprolol tartrate 25 mg tablet',25,'mg','Oral','Twice daily','active',[9],9)]):
    add('MedicationRequest',id=f'rx{i}',status=status,intent='order',subject=ref('Patient','p1'),medicationCodeableConcept=cc(med),authoredOn='2026-10-31',requester=dict(display='Nora Shah, MD'),
        dosageInstruction=[dict(text=f'{dose} {unit}, {route.lower()}, {freq.lower()}',route=cc(route),timing=dict(event=[f'2026-11-01T{hour:02}:00:00' for hour in hours]),doseAndRate=[dict(doseQuantity=qty(dose,unit))])])
    add('MedicationAdministration',id=f'admin{i}',request=ref('MedicationRequest',f'rx{i}'),status='on-hold' if status=='on-hold' else 'completed',subject=ref('Patient','p1'),
        medicationCodeableConcept=cc(med),effectiveDateTime=f'2026-11-01T{given_hour:02}:{10+i*3:02}:00',dosage=dict(dose=qty(dose,unit),route=cc(route)),
        performer=[dict(actor=dict(display='Jordan Reed, RN'))],statusReason=[cc('Per provider order')] if status=='on-hold' else [])
body='Subjective\nPain improved this morning. Tolerating oral intake. No nausea or vomiting.\n\nObjective\nAfebrile. Abdomen soft, nondistended. Incisions clean and dry.\n\nAssessment & Plan\nPostoperative day 1 after laparoscopic appendectomy. Advance diet, ambulate, continue multimodal analgesia. Review discharge readiness this afternoon.'
add('DocumentReference',id='note',status='current',docStatus='final',date='2026-11-01T09:20:00',type=cc('Progress note'),description='General Surgery • Daily Progress',author=[dict(display='Daniel Park, MD')],context=dict(encounter=[dict(display='Inpatient • General Surgery')]),content=[dict(attachment=dict(contentType='text/plain',data=base64.b64encode(body.encode()).decode()))])
(OUT/'presentations.json').write_text(json.dumps(dict(resourceType='Bundle',type='collection',entry=[dict(resource=r) for r in resources]),indent=2)+'\n')

payloads={
 'trackBoard': [dict(Room=f'ED {i+3:02}',Patient=f'{p[0]}, {p[1]}',**{'Age/sex':a,'Chief complaint':c},Acuity=esi,Arrival=f'07:{i*7:02}',LOS=los,RN=rn,Provider=md,Labs=lab,Imaging=img,Disposition=dispo,Status=st) for i,(p,a,c,esi,los,rn,md,lab,img,dispo,st) in enumerate(zip(people,['9 / F','52 / M','38 / F','64 / M','32 / F','68 / M'],['Abdominal pain','Chest pain','Shortness of breath','Fall, left hip pain','Headache','Dizziness'],['ESI 3','ESI 2','ESI 2','ESI 3','ESI 4','ESI 3'],['2h 05m','1h 58m','1h 51m','1h 44m','1h 37m','1h 30m'],['Reed, J','Reed, J','Lopez, M','Lopez, M','Kim, S','Kim, S'],['Shah, N','Shah, N','Foster, E','Foster, E','Shah, N','Foster, E'],['Pending','Complete','Pending','Complete','Ordered','Complete'],['Ordered','Complete','Pending','Complete','—','Ordered'],['—','Admit','—','Consult','Discharge','—'],['Roomed','In progress','In progress','Needs review','Complete','Roomed']))],
 'orSchedule': [dict(Room='OR 2',Start='07:30',Procedure='Laparoscopic cholecystectomy',Patient='Patel, Anika',Surgeon='Daniel Park, MD',Status='Complete'),dict(Room='OR 2',Start='09:15',Procedure='Laparoscopic appendectomy',Patient='Chen, David',Surgeon='Daniel Park, MD',Status='In progress'),dict(Room='OR 2',Start='11:00',Procedure='Open inguinal hernia repair',Patient='Anderson, Robert',Surgeon='Daniel Park, MD',Status='Scheduled')],
 'inBasketFolders':[dict(Folder='Results',Count='14',Unread='6'),dict(Folder='Rx Request',Count='8',Unread='3'),dict(Folder='Patient Messages',Count='12',Unread='4'),dict(Folder='Staff Messages',Count='5',Unread='2')],
 'inBasketMessages':[dict(Received=f'Nov 1, 2026 {8-i//6:02}:{42-i%6*7:02}',Patient=f'{people[(i+1)%len(people)][0]}, {people[(i+1)%len(people)][1]}',Subject=subject,From='Laboratory',Priority='Routine',Status='Unread' if i<6 else 'Needs review') for i,subject in enumerate(['Basic metabolic panel','TSH with reflex free T4','Hemoglobin A1c','Complete blood count','Lipid panel','Comprehensive metabolic panel','Urinalysis','Ferritin','Urine culture','Vitamin B12','CBC with differential','Hepatic function panel','Albumin/creatinine ratio, urine','Basic metabolic panel'])],
 'worklist':[dict(Due='08:00',Patient='Chen, David',Task='Scheduled medications',Priority='Routine',Status='Due',Owner='Jordan Reed, RN'),dict(Due='08:30',Patient='Chen, David',Task='Pain reassessment',Priority='Routine',Status='Overdue',Owner='Jordan Reed, RN'),dict(Due='10:00',Patient='Chen, David',Task='Vital signs',Priority='Routine',Status='Scheduled',Owner='Jordan Reed, RN')]
}
reference=OUT/'growth-reference.json'
if '--refresh-reference' in sys.argv or not reference.exists():
    rows=[]
    for file,series,unit in [('wtage','Weight','kg'),('statage','Height','cm')]:
        url=f'https://www.cdc.gov/growthcharts/data/zscore/{file}.csv'
        data=list(csv.DictReader(io.StringIO(urlopen(url).read().decode('utf-8-sig'))))
        for row in data:
            # Female CDC 2000 2–20y references sampled every 6 months over this fictional child's chart.
            age=float(row['Agemos'])
            if row['Sex'].strip()=='2' and age in [84.5,90.5,96.5,102.5,108.5,114.5]:
                for p in ['5','50','95']:
                    rows.append({'Series':series,'Percentile':p+'th','Age (months)':str(age),'Value':row['P'+p].strip(),'Unit':unit,'Reference':'CDC 2000, girls 2–20 years'})
    reference.write_text(json.dumps(dict(sources=['https://www.cdc.gov/growthcharts/data/zscore/wtage.csv','https://www.cdc.gov/growthcharts/data/zscore/statage.csv'],rows=rows),indent=2)+'\n')
payloads['growthChart']=json.loads(reference.read_text())['rows']
(OUT/'presentation-payloads.json').write_text(json.dumps({k:[list(r.items()) for r in rows] for k,rows in payloads.items()},indent=2)+'\n')
print(f'Wrote {len(resources)} fictional FHIR resources and {len(payloads)} presentation payloads.')
