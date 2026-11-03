/** Synthetic native fixture. Fixed coordinates exercise orchestration, not browser fidelity. */
import { cp,readFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tinySpec,sampleTask } from '../../lean/generated/ehr-samples.js';
import { ScriptedLlm } from '../test/scripted.js';
import { gotoOf } from './program.js';
import { dryFixture } from './dry-fixture.js';
import { createEhr } from './ehr.js';
import { geometryProgramHash,type GeometryProvider } from './geometry.js';
import { runDays } from './run.js';
import { programSchema,dayScheduleSchema,personaParamsSchema } from './schema.js';
import { REPO_ROOT,writeJson } from './util.js';
import { existsSync } from 'node:fs';
export async function prepareDeterminismFixture(root:string):Promise<void>{
 const world=path.join(root,'world');
 if(existsSync(path.join(world,'determinism-fixture.json')))return;
 await mkdir(root,{recursive:true});
 await cp(path.join(REPO_ROOT,'runs/world/2'),world,{recursive:true});
 await writeJson(path.join(world,'world.json'),{seed:7,days:2,personas:['P1','P2'],users:{P1:'P1',P2:'P2'}});
 for(const persona of ['P1','P2']){
  const params=personaParamsSchema.parse(JSON.parse(await readFile(path.join(world,'personas',`${persona}.json`),'utf8')));
  await writeJson(path.join(world,'personas',`${persona}.json`),{...params,keyboardShare:100,backtrackRate:0});
  for(const day of [1,2]){
   const original=dayScheduleSchema.parse(JSON.parse(await readFile(path.join(world,'schedules',`day-0${day}`,`${persona}.json`),'utf8')));
   const patient=original.tasks[0];if(!patient)throw new Error('Missing real patient fixture');
   const tasks=[0,1].map(i=>({...sampleTask,id:`d${day}-${persona}-${i}`,persona,day,patientId:patient.patientId,startMin:i*30,todayResources:[]}));
   await writeJson(path.join(world,'schedules',`day-0${day}`,`${persona}.json`),{day,persona,load:'synthetic determinism fixture',tasks});
  }
 }
 await writeJson(path.join(root,'tiny-spec.json'),{...tinySpec,version:path.join(root,'tiny-spec.json')});
 await writeJson(path.join(world,'determinism-fixture.json'),{schemaVersion:1,geometry:'Fixed synthetic coordinates, no browser or clinical performance evidence'});
}
const geometry:GeometryProvider=async({program,schedule})=>{
 const box={center:{x:100,y:100},reveal:{x:100,y:100},chain:[],offsets:{}};
 const states=program.screens.map(screen=>({screen:screen.id,state:`${screen.id}-fixture`,viewport:{width:1440,height:900},components:Object.fromEntries(screen.components.map((c,i)=>[c.id,{...box,center:{x:100+i*12,y:100},reveal:{x:100+i*12,y:100}}])),scrollers:{}}));
 const workspace={screen:program.start,state:`workspace-${schedule?.day??0}`,sample:`workspace-d${String(schedule?.day??0).padStart(2,'0')}`,viewport:{width:1440,height:900},components:Object.fromEntries([['workspace.search',box],...(schedule?.tasks??[]).flatMap(task=>['lookup','edTrackBoard'].map(source=>[`workspace.open|${task.patientId}|0|${source}`,box]))]),scrollers:{}};
 return {schemaVersion:1,programHash:geometryProgramHash(program),appSha256:'fixture',source:'recorded-fixture',viewport:{width:1440,height:900},states:[...states,workspace]};
};
export async function runDeterminismFixture(root:string,id:string,resume=false,parallel=false){
 const specVersion=path.join(root,'tiny-spec.json');
 const canonical=programSchema.parse({...dryFixture(),version:0,specVersion,id:'determinism-tiny',owner:'fixture'});
 const llm=new ScriptedLlm({hypothesis:'Synthetic hotkey fixture',decision:'change',candidates:[{id:'shortcut',moveType:'shortcut',summary:'Keyboard navigation',rationale:'Synthetic fixture',targets:[],predicted:{clicks:1,keystrokes:0,scrolls:0,klmDeciSec:0},patch:canonical.screens.flatMap(screen=>screen.components.filter(c=>gotoOf(c)!==null).map((c,i)=>({op:'add' as const,path:`/screens/[id=${screen.id}]/components/[id=${c.id}]/hotkey`,from:'',valueJson:JSON.stringify(`Alt+${i+1}`)})))}]});
 return runDays({days:2,personas:['P1','P2'],worldDir:path.join(root,'world'),runsRoot:root,runId:id,resume,parallel,llm,ehr:createEhr({fake:false}),geometry,seedPolicy:'none',releaseDays:{v2:99,v3:99},verificationRelease:{id:'fixture',specVersion,spec:{...tinySpec,version:specVersion},canonical,notes:'Synthetic native determinism fixture',leanSpecSource:null,fake:true},screens:{mode:'fake',check:async()=>({mode:'fake',status:'pass',bundles:[],pages:0,failingScreens:[],failingFiles:[],message:'Fixed test gate; browser fidelity is outside this harness'})},log:console.log});
}
