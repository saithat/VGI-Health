import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { geometryEhr, geometryProgramHash } from '../../src/geometry.js';
import { createFakeEhr, fakeCanonical } from '../../src/fake/ehr-fake.js';
import { writeFakeWorld } from '../../src/fake/world.js';
import { loadWorld } from '../../src/world.js';
if(!global.gc)throw Error('Expose GC for this regression');
const directory=await mkdtemp(path.join(tmpdir(),'recording-memory-'));
try{
  const world=await loadWorld(await writeFakeWorld(path.join(directory,'world'),{days:7,seed:7,personas:['P1']}));
  const program=fakeCanonical('v1'),persona=world.personas.get('P1');if(!persona)throw Error('fixture persona');
  let calls=0;
  const ehr=geometryEhr(createFakeEhr(),async()=>({
    schemaVersion:1,programHash:geometryProgramHash(program),appSha256:'fixture',source:'recorded-fixture',viewport:{width:1440,height:900},
    states:Array.from({length:120},(_,i)=>({screen:'home',state:`call-${++calls}-${i}`,viewport:{width:1440,height:900},scrollers:{},
      components:Object.fromEntries(Array.from({length:40},(_,j)=>[`c${j}`,{
        center:{x:j,y:i},reveal:{x:j,y:i},chain:['root'],offsets:{root:{x:0,y:i}},
      }]))})),
  }),directory,true);
  let initial=0,final=0;
  for(let day=1;day<=7;day++){
    const schedule=await world.schedule(day,'P1');if(!schedule)throw Error('fixture schedule');
    for(const tasks of [schedule.tasks,schedule.tasks.slice(0,2)])await ehr.simulate({specVersion:'v1',program,persona,schedule:{...schedule,tasks},worldDir:world.dir,seed:day});
    global.gc();global.gc();
    if(day===2)initial=process.memoryUsage().heapUsed;
    final=process.memoryUsage().heapUsed;
  }
  process.stdout.write(JSON.stringify({retainedGrowth:final-initial}));
}finally{await rm(directory,{recursive:true,force:true});}
