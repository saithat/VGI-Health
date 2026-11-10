import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createEhr, DEFAULT_EHR_BIN } from '../src/ehr.js';
import { dayScheduleSchema, personaParamsSchema, programSchema } from '../src/schema.js';
import { REPO_ROOT } from '../src/util.js';

const worldDir=path.join(REPO_ROOT,'runs/world/2');
const available=existsSync(DEFAULT_EHR_BIN)&&existsSync(path.join(worldDir,'world.json'));
const read=(p:string):unknown=>JSON.parse(readFileSync(p,'utf8'));

describe.skipIf(!available)('native section authoring',()=>{
  it.each(['expert','bounded'] as const)('%s preserves full committed values, reading and scrolls while charging template selections and copy edits',async policy=>{
    const source=dayScheduleSchema.parse(read(path.join(worldDir,'schedules/day-07/P1.json')));
    const candidate=source.tasks.find(t=>t.workflow==='W1');
    if(!candidate)throw new Error('missing source task');
    const text='x'.repeat(2000);
    const program=programSchema.parse(read(path.join(REPO_ROOT,'releases/v3/canonical.json')));
    const persona=personaParamsSchema.parse(read(path.join(worldDir,'personas/P1.json')));
    const ehr=createEhr({fake:false});
    const results=[];
    for(const mode of ['full','template','copied'] as const){
      const noteTexts=['hpi','assessmentPlan'].map(id=>({id,text,...(mode==='full'?{}:{authoring:{origin:mode,
        typedCharacters:mode==='copied'?100:0,selections:mode==='copied'?1:2}})}));
      const task={...candidate,id:'authoring',interruptions:0,workflow:'W1' as const,
        choices:{...candidate.choices,orders:[],noteSections:['hpi','assessmentPlan'],noteTexts}};
      const schedule=dayScheduleSchema.parse({...source,tasks:[task],clockMode:'legacy'});
      const result=await ehr.simulate({specVersion:'v3',program,persona:{...persona,policy},schedule,worldDir,seed:17,
        interruptions:'fixedCost',simModel:'wave3',textCost:'length'});
      expect(result.tasks[0]?.completed).toBe(true);
      expect(result.trace.filter(t=>'enter' in t.event&&'text' in t.event.enter.value&&t.event.enter.value.text.s===text)).toHaveLength(2);
      results.push(result.tasks[0]);
    }
    const [full,template,copied]=results;
    if(!full||!template||!copied)throw new Error('missing results');
    expect(full.keystrokes-template.keystrokes).toBe(4000);
    expect(copied.keystrokes-template.keystrokes).toBe(200);
    expect(template.clicks-full.clicks).toBe(4);
    expect(copied.clicks-full.clicks).toBe(2);
    expect(template.scrolls).toBe(full.scrolls);
    expect(copied.scrolls).toBe(full.scrolls);
    expect(template.klmDeciSec).toBeLessThan(copied.klmDeciSec);
    expect(copied.klmDeciSec).toBeLessThan(full.klmDeciSec);
  },60000);
  it.each(['v2','v3'] as const)('%s signs inpatient imaging with its declared priority',async version=>{
    const source=dayScheduleSchema.parse(read(path.join(worldDir,'schedules/day-05/P5.json')));
    const candidate=source.tasks.find(t=>t.choices.w6Step==='rounding');
    if(!candidate)throw new Error('missing inpatient rounds');
    const program=programSchema.parse(read(path.join(REPO_ROOT,`releases/${version}/canonical.json`)));
    const persona=personaParamsSchema.parse(read(path.join(worldDir,'personas/P5.json')));
    for(const code of ['chest-xray','ct-abdomen-pelvis']){
      const task={...candidate,id:'inpatient-imaging',interruptions:0,choices:{...candidate.choices,
        orders:[{kind:'imaging' as const,code,drug:'',doseTenths:0,unit:'none' as const,route:'',freq:'',prn:false,
          priority:'stat',indication:'scenario-postoperative-concern'}]}};
      const schedule=dayScheduleSchema.parse({...source,tasks:[task],clockMode:'legacy'});
      const result=await createEhr({fake:false}).simulate({specVersion:version,program,persona,schedule,worldDir,
        seed:17,interruptions:'fixedCost'});
      expect(result.tasks[0]?.completed).toBe(true);
      expect(result.trace.some(t=>'enter' in t.event&&'code' in t.event.enter.value&&t.event.enter.value.code.c==='stat')).toBe(true);
      expect(result.trace.some(t=>t.result==='ok'&&JSON.stringify(t.event).includes('commit.signOrders'))).toBe(true);
    }
  },60000);

});
