#!/usr/bin/env node
import {frozenIndex,frozenRecords} from './frozen.mjs';
// Existing native context extraction + native render/step. No clinical rules in JS.
import {existsSync,readdirSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {read,write,args,densityPolicy} from './cli.mjs';
import {ReferenceLayouts,native,digest,limitFor,measuredLimitFor,recordedLimits} from './admission.mjs';
import {eraseContent,viewports} from './generator.mjs';
import {geometryFor,GeometryMeter} from './geometry.mjs';
import {screenRecords} from './recording.mjs';
const root=resolve('.'),opts=args(process.argv.slice(2));
const sourceRoot=resolve(opts['recordings-root']??'/home/saithat/Projects/VGI-Health');
const out=resolve(opts.out??join(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','reference-layouts'));
const runNames=(opts.runs??'core-10day,rules3-10day-invalid-simloop').split(',');
const binary=join(root,'lean/.lake/build/bin/ehr'),cache=new ReferenceLayouts({cacheDir:join(out,'cache')}),paintCache=new Map();
const contextBinding={binary:digest(readFileSync(binary)),extractor:digest(readFileSync('scripts/trajectories/Contexts.lean'))};
const analysisBinding=digest(['visited','recording','generator','widgets','geometry','admission','density','frozen','window'].map(name=>readFileSync(new URL(`./${name}.mjs`,import.meta.url),'utf8')));
// `--probe-limit N` admits at N to measure the vendor dense layout's own target
// counts (for lean-paged-density.json); the measured vendor limit is kept for
// each state as well. Otherwise each screen takes its frozen policy limit.
const probe=opts['probe-limit']===undefined?null:Number(opts['probe-limit']);
const density=densityPolicy({paged:probe===null});density.recorded=runNames.flatMap(r=>recordedLimits(join(sourceRoot,'runs',r)));
const densityCounts={},days=[],absentDays=[],limits={},personaShapes=new Map(),personaNativeShapes=new Map();
const frozen=opts['frozen-snapshots']?await frozenIndex(resolve(opts['frozen-snapshots']),out):null;
mkdirSync(join(out,'contexts'),{recursive:true});
mkdirSync(join(out,'visited-cases'),{recursive:true});
// Count a retained event only once. Some landing screens embed the ED track
// board. A chart's ordinary "Back to Track Board" link is not a board.
function showsTrackBoard(node) {
  const [kind, value]=Object.entries(node)[0];
  if(kind==='presentation' && value.kind==='trackBoard')return true;
  const children=kind==='tabs'?value.body:value.children??[];
  return children.some(showsTrackBoard) || (kind==='patientPane' && value.modal.some(showsTrackBoard));
}
function geometry(screen,limit) {
  const r=cache.get(screen,{maxTargetsPerViewport:limit,allowRefused:true});let paints=paintCache.get(r.key);
  if(!paints) {
    paints=cache.geometryPaints(r);
    if(!paints.dense.boxes||!paints.fixed.boxes)throw Error('Missing native geometry');paintCache.set(r.key,paints);
    if(paintCache.size>256)paintCache.delete(paintCache.keys().next().value);
  }
  return {r,dense:geometryFor(screen,paints.dense),fixed:geometryFor(screen,paints.fixed)};
}
{
  for(const runName of runNames) {
    const run=join(sourceRoot,'runs',runName),manifest=read(join(run,'manifest.json'));
    const world=opts.world?resolve(opts.world):manifest.world;
    for(let day=1;day<=Number(opts.days??10);day++) for(const persona of (opts.personas??'P1,P2,P3,P4,P5').split(',')) {
      const folder=`day-${String(day).padStart(2,'0')}`,dayFile=join(run,'no-agent/days',folder,`${persona}.json`),programFile=join(run,'no-agent/days',folder,`${persona}.program.json`);
      if(!existsSync(dayFile)) {absentDays.push({run:runName,day,persona,path:dayFile});continue;}
      const recorded=read(dayFile),program=read(programFile),certDir=join(run,'certifications',persona);
      const specFile=readdirSync(certDir).sort().map(v=>join(certDir,v,'spec.json')).find(f=>existsSync(f)&&read(f).version===program.specVersion),spec=read(specFile);
      const scheduleFile=join(world,'schedules',folder,`${persona}.json`),schedule=read(scheduleFile);
      const inputs={day:digest(recorded),program:digest(program),spec:digest(spec),schedule:digest(schedule),...contextBinding,world:manifest.fingerprints?.world,fixtures:manifest.fingerprints?.fixtures};
      const policy=Object.fromEntries(program.screens.map(s=>[s.id,probe??limitFor(density,persona,program.specVersion,s.id).limit]));
      const caseKey=digest({inputs,analysisBinding,policy,layoutBinary:cache.binding,frozen:frozen?.get(digest(recorded.trace))?.receipt}),caseFile=join(out,'visited-cases',`${caseKey}.json`);
      if(existsSync(caseFile)) {
        const saved=read(caseFile),group=`${runName}/${persona}`;
        if(saved.key!==caseKey || saved.checksum!==digest(saved.payload)) throw Error('Corrupt visited-day checkpoint');
        days.push(saved.payload.row);
        personaShapes.set(group,new Set([...(personaShapes.get(group)??[]),...saved.payload.shapes]));
        personaNativeShapes.set(group,new Set([...(personaNativeShapes.get(group)??[]),...saved.payload.nativeShapes]));
        Object.assign(limits,saved.payload.limits);
        Object.assign(densityCounts,saved.payload.densityCounts);
        console.log(`${runName}/${folder}/${persona}: reused verified checkpoint`);continue;
      }
      const fixedMeter=new GeometryMeter(),denseMeter=new GeometryMeter();
      const board={events:[],states:0,dense:0,fallback:0,refused:0,boardNodes:0,patientPanes:0,
        fixed:{scrolls:0,scrollPx:0,mouseTravelPx:0},denseCost:{scrolls:0,scrollPx:0,mouseTravelPx:0}};
      const caseDensity={},shapeKeys=new Set(),nativeKeys=new Set(),rules={},mismatches=[],renderStates=new Set();let states=0,denseStates=0,noAdmittedLayout=0,withinMeasured=0,pagedStates=0;
      const group=`${runName}/${persona}`,all=personaShapes.get(group)??new Set(),allNative=personaNativeShapes.get(group)??new Set();
      for await(const record of (frozen?frozenRecords(frozen,recorded):screenRecords({root,out,runName,folder,persona,recorded,program,spec,schedule,inputs,world,scheduleFile,specFile,programFile,dayFile,binary,verbose:opts.verbose}))) {
        if(record.mismatch&&mismatches.length<20)mismatches.push(record.mismatch);
        if(record.kind!=='screen')continue;
        const {ev,screen}=record,measured=measuredLimitFor(density,persona,program.specVersion,screen.screen);
        const limit=probe===null?limitFor(density,persona,program.specVersion,screen.screen):{limit:probe,source:'probe',measured:measured.limit};
        limits[`${program.specVersion}/${persona}/${screen.screen}`]=limit;
        const g=geometry(screen,limit.limit);
        withinMeasured+=Number(g.r.denseAccepted&&Math.max(g.r.density.firstViewport,g.r.density.scrollWindow)<=measured.limit);
        pagedStates+=Number(Boolean(g.r.screen.windows));const densityKey=`${program.specVersion}/${persona}/${screen.screen}/${g.r.key}`;caseDensity[densityKey]=densityCounts[densityKey]={release:program.specVersion,persona,screen:screen.screen,limit:limit.limit,denseAccepted:g.r.denseAccepted,fallbackAccepted:g.r.fallbackAccepted,...g.r.density};states++;denseStates+=Number(g.r.denseAccepted);noAdmittedLayout+=Number(!g.r.fallbackAccepted);renderStates.add(record.stateKey);
        shapeKeys.add(digest(g.r.shape));nativeKeys.add(digest(g.r.shape.slots));all.add(digest(g.r.shape));allNative.add(digest(g.r.shape.slots));
        for(const rule of new Set(g.r.findings.map(f=>f.rule)))rules[rule]=(rules[rule]??0)+1;
        const kinds=Object.values(g.r.shape.hints);
        const hasBoard=kinds.some(s=>s.kind==='board'),hasPane=kinds.some(s=>s.kind==='patientPane');
        const isBoard=hasBoard || hasPane || [...screen.workspace,...screen.side].some(showsTrackBoard) || ['w3TrackBoard','workspace:edTrackBoard'].includes(screen.screen);
        board.boardNodes+=Number(hasBoard);board.patientPanes+=Number(hasPane);
        if(isBoard) {
          board.events.push(states-1);board.states++;board.dense+=Number(g.r.denseAccepted);
          board.fallback+=Number(!g.r.denseAccepted && g.r.fallbackAccepted);
          board.refused+=Number(!g.r.fallbackAccepted);
        }
        for(const [meter,geometry,subtotal] of [[fixedMeter,g.fixed,board.fixed],[denseMeter,g.dense,board.denseCost]]) {
          const before=[meter.scrolls,meter.scrollPx,meter.mouseTravelPx];
          meter.event(ev,geometry);
          if(isBoard) for(const [i,metric] of ['scrolls','scrollPx','mouseTravelPx'].entries())
            subtotal[metric]+=meter[metric]-before[i];
        }
      }
      personaShapes.set(group,all);personaNativeShapes.set(group,allNative);
      const row={run:runName,persona,day,release:program.specVersion,states,expectedStates:recorded.trace.length,unrenderedStates:recorded.trace.length-states,denseAdmitted:denseStates,noAdmittedLayout,withinMeasured,pagedStates,board,distinctStates:renderStates.size,shapes:shapeKeys.size,nativeShapes:nativeKeys.size,rules,mismatches,
        fixed:fixedMeter.result(),dense:denseMeter.result(),browser:{scrolls:recorded.tasks.reduce((n,t)=>n+t.scrolls,0),scrollPx:Math.round(recorded.tasks.reduce((n,t)=>n+(t.scrollPx??0),0)),mouseTravelPx:Math.round(recorded.tasks.reduce((n,t)=>n+(t.mouseTravelPx??0),0)),missing:recorded.geometry.missingTargets}};
      days.push(row);write(join(out,'visited-progress.json'),{days});
      const caseLimits=Object.fromEntries(Object.entries(limits).filter(([key])=>key.startsWith(`${program.specVersion}/${persona}/`)));
      const payload={row,shapes:[...shapeKeys],nativeShapes:[...nativeKeys],limits:caseLimits,densityCounts:caseDensity};write(caseFile,{key:caseKey,checksum:digest(payload),payload});
      console.log(`${runName}/${folder}/${persona}: ${denseStates}/${states} dense, ${shapeKeys.size} shapes, ${mismatches.length} mismatches, ${row.dense.missingTargets.length} missing targets`);
    }
  }
  const result={schemaVersion:1,scope:frozen?'Retained native no-agent event-prestate UiScreens, checksummed and matched to every recorded event; current layout admission, no fresh clinical replay':'Actual no-agent day event pre-states reconstructed and rendered with native Lean, including repeated states',retainedSnapshots:opts['frozen-snapshots']??null,days,absentDays,limits,densityCounts:Object.values(densityCounts),
    shapesPerPersona:Object.fromEntries([...personaShapes].map(([key,set])=>[key,set.size])),nativeShapesPerPersona:Object.fromEntries([...personaNativeShapes].map(([key,set])=>[key,set.size])),
    admission:{...cache.stats,layoutsPerSecond:cache.stats.misses/(cache.stats.admissionMs/1000)}};
  write(join(out,'visited.json'),result);
  const fmt=v=>`${v.scrolls} / ${v.scrollPx??'missing'} / ${v.mouseTravelPx??'missing'}`;
  writeFileSync(join(out,'visited-days.md'),['| Recording | Persona | Day | Shapes | Dense states | Fixed: scrolls / px / travel px | Dense: scrolls / px / travel px | Stored browser: scrolls / px / travel px |',
    '|---|---|---:|---:|---:|---|---|---|',...days.map(d=>`| ${d.run} | ${d.persona} | ${d.day} | ${d.shapes} | ${d.denseAdmitted}/${d.expectedStates} | ${fmt(d.fixed)} | ${fmt(d.dense)} | ${fmt(d.browser)} |`)].join('\n')+'\n');
}
