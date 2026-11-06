import { withData } from "./data.js";
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {runDays} from '../src/run.js';
import {ReplayLlm} from '../src/backends/replay.js';
import {InfrastructureError} from '../src/errors.js';
import {markingEhr,fakeWorld,tmp} from './helpers.js';
import {ScriptedLlm} from './scripted.js';

withData("runs/core-10day-live/decisions").describe("archive-backed agent prompts", () => {
  it('runs five personas concurrently in one layout and replays/resumes deterministically',async()=>{
   const worldDir=await fakeWorld(3),runsRoot=await tmp('parallel');let active=0,peak=0;
   const ehr=markingEhr(),simulate=ehr.simulate.bind(ehr);ehr.simulate=async i=>{active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,10));return await simulate(i);}finally{active--;}};
   const opts={days:3,worldDir,runsRoot,parallel:true,ehr,releaseDays:{v2:2,v3:3}};
   const first=await runDays({...opts,llm:new ScriptedLlm(),runId:'FAKE-parallel'});
   expect(peak).toBe(5);expect(first.timelines.map(t=>t.persona)).toEqual(['P1','P2','P3','P4','P5']);
   expect(first.timelines.every(t=>t.days.length===3&&t.nights.length===2)).toBe(true);
   const replay=await runDays({...opts,llm:new ReplayLlm(first.dir),runId:'REPLAY-parallel'});
   expect(replay.timelines).toEqual(first.timelines);expect(replay.rejections).toEqual(first.rejections);
   const before=await readFile(path.join(first.dir,'days/day-02/P4.json'),'utf8');
   const backend=new ScriptedLlm();vi.spyOn(backend,'complete').mockRejectedValue(new Error('Resume must not repeat a completed model call'));
   const resumed=await runDays({...opts,llm:backend,runId:'FAKE-parallel',resume:true});
   expect(resumed.timelines).toEqual(first.timelines);expect(await readFile(path.join(first.dir,'days/day-02/P4.json'),'utf8')).toBe(before);
   expect(backend.complete).not.toHaveBeenCalled();
   const manifest=JSON.parse(await readFile(path.join(first.dir,'manifest.json'),'utf8'));
   expect(manifest).toMatchObject({mode:'FAKE',parallel:true,personaWorkers:5,screenWorkersPerPersona:Math.max(1,Number.parseInt(process.env['EHR_SCREEN_WORKERS']??'1',10)||1),status:'completed'});
   await expect(runDays({...opts,llm:new ScriptedLlm(),runId:'FAKE-parallel',resume:true,parallel:false})).rejects.toThrow('parallel mode');
  });
  it('joins other workers before recording failure and resumes only the unfinished persona',async()=>{
   const worldDir=await fakeWorld(3),runsRoot=await tmp('parallel-error'),ehr=markingEhr(),simulate=ehr.simulate.bind(ehr);let failed=0;
   ehr.simulate=async i=>{if(i.persona.id==='P4'&&i.schedule.day===2&&failed<3){failed++;throw new InfrastructureError('FAKE native timeout');}return simulate(i);};
   const opts={days:3,worldDir,runsRoot,parallel:true,ehr,runId:'FAKE-resume'};
   await expect(runDays({...opts,llm:new ScriptedLlm()})).rejects.toThrow('FAKE native timeout');
   const file=path.join(runsRoot,'FAKE-resume/days/day-02/P5.json'),before=await readFile(file,'utf8');
   const manifest=JSON.parse(await readFile(path.join(runsRoot,'FAKE-resume/manifest.json'),'utf8'));expect(manifest.status).toBe('infrastructure-error');
   const result=await runDays({...opts,llm:new ScriptedLlm(),resume:true});
   expect(result.timelines.every(t=>t.days.length===3)).toBe(true);expect(await readFile(file,'utf8')).toBe(before);
  });

  it.each([{v2:4,v3:7},{v2:2,v3:3}])('never calls theoretical searches in any overnight mode (%j)',async releaseDays=>{
   const ehr=markingEhr();const search=vi.spyOn(ehr,'minClicks').mockRejectedValue(new InfrastructureError('FAKE min-clicks bound / timeout'));
   const opts={days:3,parallel:true,worldDir:await fakeWorld(3),runsRoot:await tmp('no-nightly-floor'),ehr,releaseDays};
   const result=await runDays({...opts,runId:'FAKE-no-floor',llm:new ScriptedLlm()});
   expect(result.timelines).toHaveLength(5);expect(result.timelines.every(t=>t.days.length===3)).toBe(true);expect(search).not.toHaveBeenCalled();
   const replay=await runDays({...opts,runId:'REPLAY-no-floor',llm:new ReplayLlm(result.dir)});expect(replay.timelines).toEqual(result.timelines);expect(search).not.toHaveBeenCalled();
  });

});
