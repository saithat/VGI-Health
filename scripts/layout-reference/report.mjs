#!/usr/bin/env node
import {readStoredGeometry} from '../../agent/src/geometry-format.mjs';
import {readGeometryJson} from '../../agent/src/geometry-json.mjs';
// Read-only recording comparison. Exports current native representative variants;
// does not rewrite or claim a strict replay of historical interpreter states.
import {existsSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pointerTravel} from '../../app/src/metrics/geometry.ts';
import {ReferenceLayouts,native,digest,limitFor,recordedLimits} from './admission.mjs';
import {eraseContent,viewports} from './generator.mjs';
import {geometryFor,targetTrace} from './geometry.mjs';
import {read,write,args} from './cli.mjs';
import {register} from '../../agent/node_modules/tsx/dist/esm/api/index.mjs';
register();
const {exportPopupGeometry}=await import('../../agent/src/geometry-popups.ts');
const opts=args(process.argv.slice(2));
const output=resolve(opts.out??join(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','reference-layouts'));
mkdirSync(output,{recursive:true});
const sourceRoot=resolve(opts['recordings-root']??'/home/saithat/Projects/VGI-Health');
const runs=(opts.runs??'core-10day,rules3-10day-invalid-simloop').split(',');
const cache=new ReferenceLayouts({cacheDir:join(output,'cache')});
const density=read('docs/audits/r5-per-screen.json');density.measurements=read('docs/methods/lean-screen-density.json').measurements;
density.recorded=runs.flatMap(name=>recordedLimits(join(sourceRoot,'runs',name)));
const densityCounts=[],limits={},samples=[],coverage=[],days=[],shapes=new Map(),geometryCache=new Map();
const fhir=resolve('fixtures/synthea/Abdul_Sauer_d0fe99e5.json');
async function exported(programPath,{world,schedule,specFile}={}) {
  const program=read(programPath),spec=specFile??resolve(`releases/${program.specVersion}/spec.json`);
  const key=digest({program,spec:read(spec),fhir,...(schedule?{schedule:read(schedule),world}:{})});
  const dir=join(output,'screens',key);
  if(!existsSync(join(dir,'complete.json'))) {
    mkdirSync(dir,{recursive:true});
    const p=spawnSync(resolve('lean/.lake/build/bin/ehr'),['render-screens','--spec',spec,'--program',programPath,
      '--fhir',fhir,'--ui','--today','2026-11-02','--out',dir,...(schedule?['--world',world,'--schedule',schedule]:[])],
      {encoding:'utf8',env:{...process.env,LEAN_NUM_THREADS:'2'},maxBuffer:4*1024*1024});
    if(p.status!==0) throw Error(p.stderr||p.stdout);
    write(join(dir,'complete.json'),{key});
  }
  if(!existsSync(join(dir,'popups-complete.json'))) {
    await exportPopupGeometry(resolve('lean/.lake/build/bin/ehr'),{program,specFile:spec,fhir,outDir:dir});
    write(join(dir,'popups-complete.json'),{key});
  }
  return {program,dir,files:readdirSync(dir).filter(f=>f.endsWith('.json')&&!f.endsWith('complete.json')).sort()};
}
function admitted(program,screen) {
  const limit=limitFor(density,program.owner,program.specVersion,screen.screen);
  limits[`${program.specVersion}/${program.owner}/${screen.screen}`]=limit;
  return cache.get(screen,{maxTargetsPerViewport:limit.limit,allowRefused:true});
}
function paintGeometry(program,screen,{state,sample}={}) {
  const r=admitted(program,screen),key=digest({key:r.key,viewport:viewports[0]});
  let geometry=geometryCache.get(key);
  if(!geometry) {
    // Admission is content-universal; empty payloads avoid repeating clinical
    // string wrapping when measuring geometry. Bind actual values for screenshots.
    geometry=cache.geometryPaints(r);
    if(!geometry.dense.boxes||!geometry.fixed.boxes)throw Error('Missing native geometry');
    geometryCache.set(key,geometry);
    if(geometryCache.size>256)geometryCache.delete(geometryCache.keys().next().value);
  }
  return {r,dense:geometryFor(screen,geometry.dense,{state,sample}),fixed:geometryFor(screen,geometry.fixed,{state,sample})};
}
function total(costs) {
  const rows=Object.values(costs),missingTargets=[...new Set(rows.flatMap(c=>c.missingTargets))];
  return {scrolls:rows.reduce((n,c)=>n+c.scrolls,0),scrollPx:rows.some(c=>c.scrollPx===null)?null:Math.round(rows.reduce((n,c)=>n+c.scrollPx,0)),
    mouseTravelPx:rows.some(c=>c.mouseTravelPx===null)?null:Math.round(rows.reduce((n,c)=>n+c.mouseTravelPx,0)),missingTargets};
}
// Every declared release screen, expanded group/tab/alert variants on a fixed
// FHIR sample. These finite probes are distinct from recorded-day coverage.
for(const release of ['v1','v2','v3']) for(const persona of ['P1','P2','P3','P4','P5']) {
  const {program,dir,files}=await exported(resolve(`releases/${release}/personas/${persona}.json`));
  let admittedCount=0,noAdmittedLayout=0;const rules={};
  for(const file of files) {
    const screen=read(join(dir,file)),r=admitted(program,screen);admittedCount+=Number(r.denseAccepted);noAdmittedLayout+=Number(!r.fallbackAccepted);
    densityCounts.push({release,persona,screen:screen.screen,state:file,limit:r.maxTargetsPerViewport,denseAccepted:r.denseAccepted,fallbackAccepted:r.fallbackAccepted,...r.density});
    for(const rule of new Set(r.findings.map(f=>f.rule))) rules[rule]=(rules[rule]??0)+1;
    const preferred={P1:['w1Hpi','w1Orders','w1Rooming'],P2:['w3Orders','w3Sign','w3Triage'],P3:['w4Admin','w4Mar','w4Handoff'],P4:['w5Note','w5Orders','w5Rooming'],P5:['w6Orders','w6PreOp','w6Sign']};
    if(release==='v1' && file===`${screen.screen}.json` && !screen.modal && preferred[persona].includes(screen.screen)) {
      const sampleDir=join(output,'visual',`${persona}-${screen.screen}`);mkdirSync(sampleDir,{recursive:true});
      write(join(sampleDir,'screen.json'),screen);write(join(sampleDir,'layout.json'),cache.paint(r,screen));samples.push({persona,screen:screen.screen,dir:sampleDir,denseAccepted:r.denseAccepted});
    }
  }
  coverage.push({release,persona,states:files.length,denseAdmitted:admittedCount,noAdmittedLayout,refused:files.length-admittedCount,rules});
  console.log(`${release}/${persona}: ${admittedCount}/${files.length} dense representative states`);
}
for(const runName of runs) {
  const run=join(sourceRoot,'runs',runName),manifest=read(join(run,'manifest.json'));
  for(let day=1;day<=10;day++) for(const persona of ['P1','P2','P3','P4','P5']) {
    const date=`day-${String(day).padStart(2,'0')}`,dayPath=join(run,'no-agent/days',date,`${persona}.json`);
    if(!existsSync(dayPath)) continue;
    const recorded=read(dayPath),programPath=join(run,'no-agent/days',date,`${persona}.program.json`);
    const schedule=join(manifest.world,'schedules',date,`${persona}.json`);
    const prog=read(programPath),certDir=join(run,'certifications',persona);
    const specFile=readdirSync(certDir).sort().map(v=>join(certDir,v,'spec.json')).find(p=>existsSync(p)&&read(p).version===prog.specVersion);
    if(!specFile) throw Error(`Missing recorded spec for ${runName}/${persona}/${prog.specVersion}`);
    const {program,dir,files}=await exported(programPath,{world:manifest.world,schedule,specFile});
    const geometryFile=join(run,'geometry',`${recorded.geometry.programHash}${recorded.geometry.componentsSha256?'.'+recorded.geometry.componentsSha256:''}.json`);
    const originalAtlas=await readStoredGeometry(geometryFile,readGeometryJson,{result:recorded});
    const selected=new Map(),missingStates=[];
    // Use the same target-sensitive representative-state choice as pointerTravel.
    for(const ev of recorded.trace) {
      const payload=Object.values(ev.event)[0],id=payload?.comp??payload?.alert;
      if(!id) continue;
      const states=originalAtlas.states.filter(s=>s.screen===ev.screen && (id.startsWith('workspace.')?s.sample===`workspace-d${String(day).padStart(2,'0')}`:!s.sample?.startsWith('workspace-d')));
      states.sort((a,b)=>Number(a.state.includes('-popup-'))*2+Number(a.state.includes('-expanded'))-Number(b.state.includes('-popup-'))*2-Number(b.state.includes('-expanded')));
      const original=states.find(s=>s.components[id])??states.find(s=>(originalAtlas.aliases?.[id]??[]).some(alias=>s.components[alias]));
      if(!original) {missingStates.push(`${ev.screen}/${id}`);continue;}
      const file=basename(original.state.split(':')[0]);
      if(!files.includes(file)) {missingStates.push(file);continue;}
      selected.set(`${file}/${original.sample??''}`,{file,original});
    }
    const denseAtlas={...originalAtlas,source:'recorded-fixture',states:[]},fixedAtlas={...denseAtlas,states:[]};
    let admittedStates=0;const distinct=new Set(),rules={};
    for(const {file,original} of selected.values()) {
      const screen=read(join(dir,file)),g=paintGeometry(program,screen,{state:original.state,sample:original.sample});
      denseAtlas.states.push(g.dense);fixedAtlas.states.push(g.fixed);admittedStates+=Number(g.r.denseAccepted);distinct.add(g.r.key);
      const personaShapes=shapes.get(`${runName}/${persona}`)??new Set();personaShapes.add(digest(g.r.shape));shapes.set(`${runName}/${persona}`,personaShapes);
      for(const rule of new Set(g.r.findings.map(f=>f.rule))) rules[rule]=(rules[rule]??0)+1;
    }
    const browser={scrolls:recorded.tasks.reduce((n,t)=>n+t.scrolls,0),scrollPx:recorded.tasks.some(t=>t.scrollPx==null)?null:Math.round(recorded.tasks.reduce((n,t)=>n+t.scrollPx,0)),
      mouseTravelPx:recorded.tasks.some(t=>t.mouseTravelPx==null)?null:Math.round(recorded.tasks.reduce((n,t)=>n+t.mouseTravelPx,0))};
    const row={run:runName,day,persona,release:program.specVersion,representativeStates:selected.size,denseAdmitted:admittedStates,rules,shapes:distinct.size,
      missingStates:[...new Set(missingStates)],fixed:total(pointerTravel(targetTrace(recorded.trace),fixedAtlas,day)),dense:total(pointerTravel(targetTrace(recorded.trace),denseAtlas,day)),browser};
    days.push(row);console.log(`${runName}/${date}/${persona}: ${selected.size} mapped states; ${row.missingStates.length} missing`);
    write(join(output,'progress.json'),{coverage,days});
  }
}
const report={schemaVersion:1,scope:'Current native representative variants, selected with recorded browser atlas target matching; not exact historical state replay',
  sourceRoot,runs,coverage,days,densityCounts,shapesPerPersona:Object.fromEntries([...shapes].map(([k,s])=>[k,s.size])),limits,samples,
  admission:{...cache.stats,layoutsPerSecond:cache.stats.misses/(cache.stats.admissionMs/1000)},
  geometryProxies:['Fields and tables are safety-text cards','Historical browser atlas and current native exports differ in content/build']};
write(join(output,'report.json'),report);
const fmt=c=>`${c.scrolls} / ${c.scrollPx??'missing'} / ${c.mouseTravelPx??'missing'}`;
writeFileSync(join(output,'days.md'),['| Recording | Persona | Day | Shapes | Dense states | Fixed: scrolls / px / travel px | Dense: scrolls / px / travel px | Stored browser: scrolls / px / travel px | Missing states |',
  '|---|---|---:|---:|---:|---|---|---|---:|',...days.map(d=>`| ${d.run} | ${d.persona} | ${d.day} | ${d.shapes} | ${d.denseAdmitted}/${d.representativeStates} | ${fmt(d.fixed)} | ${fmt(d.dense)} | ${fmt(d.browser)} | ${d.missingStates.length} |`)].join('\n')+'\n');
console.log(JSON.stringify({coverage,shapes:report.shapesPerPersona,admission:report.admission}));
