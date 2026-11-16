#!/usr/bin/env node
/** Rebuild opt-in prompts from frozen request inputs; never writes to the source run. */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tsImport } from '../../agent/node_modules/tsx/dist/esm/api/index.mjs';
const {leanLayoutPrompt,leanTrainingLog}=await tsImport('../../agent/src/lean-layout-prompt.ts',import.meta.url);
const {denseOutline}=await tsImport('../../agent/src/layout-rules.ts',import.meta.url);
const {stableStringify}=await tsImport('../../agent/src/program.ts',import.meta.url);
const {geometryProgramHash}=await tsImport('../../agent/src/geometry.ts',import.meta.url);
const source=resolve(process.argv[2]??'/home/saithat/Projects/VGI-Health/runs/lean-10day-stopped-day3');
const out=resolve(process.argv[3]??'runs/layout-rules-prompt-measure');
if(out===source||out.startsWith(source+'/'))throw Error('Output must be outside the read-only source run');
await mkdir(out,{recursive:true});
const rows=[], requests=[],missingRequests=[];
const section=(prompt,name)=>prompt.split('## '+name+'\n')[1]?.split('\n## ')[0]?.trim();
const wanted=new Map();
for(const night of (await readdir(join(source,'llm'))).filter(n=>/^night-\d+$/.test(n)).sort()) {
 for(const persona of (await readdir(join(source,'llm',night))).filter(p=>/^P\d+$/.test(p)).sort()) {
  let request;
  try{request=JSON.parse(await readFile(join(source,'llm',night,persona,'propose-0.request.json'),'utf8'));}
  catch(error){if(error.code==='ENOENT'){missingRequests.push({night,persona});continue;}throw error;}
  const program=JSON.parse(section(request.prompt,'Current program'));
  const identity=`${persona}/v${program.version}`;
  const storedProgram=JSON.parse(await readFile(join(source,'programs',persona,`v${program.version}.json`),'utf8'));
  wanted.set(identity,geometryProgramHash(storedProgram));
  requests.push({night,persona,request,identity});
 }
}
const visitedUi=new Map(),approvedDirectories=new Set();
// Bind native witnesses to the recorded current Program, excluding candidate
// and later-version galleries. Content is used only for a structural outline.
for(const file of await readdir(join(source,'reports/lean-screens'),{recursive:true})) {
 if(!/\/gallery\/coverage.json$/.test('/'+file))continue;
 const identity=file.split('/').slice(0,2).join('/');
 if(!wanted.has(identity))continue;
 const record=JSON.parse(await readFile(join(source,'reports/lean-screens',file),'utf8'));
 if(record.programHash===wanted.get(identity))approvedDirectories.add(file.slice(0,-'coverage.json'.length));
}
for(const directory of approvedDirectories)for(const file of await readdir(join(source,'reports/lean-screens',directory))) {
 if(!/^\d+\.json$/.test(file))continue;
 const record=JSON.parse(await readFile(join(source,'reports/lean-screens',directory,file),'utf8'));
 if(!record.ui?.workspace)continue;
 const identity=directory.split('/').slice(0,2).join('/');
 const key=identity+'\0'+record.screen+'\0'+stableStringify(record.shape);
 if(!visitedUi.has(key))visitedUi.set(key,denseOutline(record.ui,{w:92160,h:57600}));
}
for(const {night,persona,request,identity} of requests) {
  const raw=JSON.parse(section(request.prompt,'Current Lean design and native semantic inventory'));
  const inventory=raw.encoding==='native-inventory-v1'?{
    currentLayouts:raw.currentLayouts,limits:raw.limits,
    screens:raw.cases.map(c=>({screen:c.screen,shape:c.rows.map(i=>{const [path,target,region,lines]=raw.rows[i];return {path:path.split('.').map(Number),target:Boolean(target),region:raw.regions[region],lines};}),
      occurrences:c.rows.map(i=>{const [path,,,,ids]=raw.rows[i];return {path:path.split('.').map(Number),ids:ids.map(j=>raw.ids[j])};})})),
  }:raw;
  for(const row of inventory.screens){
    const outline=visitedUi.get(identity+'\0'+row.screen+'\0'+stableStringify(row.shape));
    if(outline)row.denseOutline=outline;
  }
  const n=Number(night.slice(6));
  const traces=await leanTrainingLog(source,persona,n);
  const after=leanLayoutPrompt(request,JSON.stringify(inventory),traces);
  const oldTraces=section(request.prompt,'This persona’s training logs and traces')??'';
  const evidenceTitle=/^## (Evidence from this user's train days[^\n]*)/m.exec(request.prompt)?.[1];
  const summary=evidenceTitle?section(request.prompt,evidenceTitle)??'':'';
  const beforeChars=request.system.length+request.prompt.length,afterChars=after.system.length+after.prompt.length;
  rows.push({night:n,persona,beforeChars,afterChars,beforeEvidenceChars:summary.length+oldTraces.length,afterEvidenceChars:summary.length+traces.length,
    beforeEvidenceShare:(summary.length+oldTraces.length)/beforeChars,afterEvidenceShare:(summary.length+traces.length)/afterChars,
    visitedShapes:inventory.screens.filter(s=>JSON.parse(traces).perScreen.some(c=>c.screen===s.screen)).length,
    shapesWithRetainedDenseOutline:inventory.screens.filter(s=>s.denseOutline).length});
  await writeFile(join(out,`${night}-${persona}.json`),JSON.stringify({system:after.system,prompt:after.prompt}));
}
const report={source,missingRequests,scope:'Characters are JS string length of system + prompt (schema excluded). Persona evidence is the original training-summary block plus logs/trace/cost JSON; headings excluded in both. Uses committed odd days only. Every recorded propose-0 request is rebuilt; absent later nights are not invented. Retained UI witnesses are matched by their archived native shape, then outlined with the current dense generator; no outcomes are recomputed. Missing witnesses are explicit in the prompt.',rows};
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log('| Persona/night | Before chars | After chars | Evidence before | Evidence after |');
console.log('|---|---:|---:|---:|---:|');
for(const r of rows)console.log(`| ${r.persona}/${r.night} | ${r.beforeChars} | ${r.afterChars} | ${(100*r.beforeEvidenceShare).toFixed(2)}% | ${(100*r.afterEvidenceShare).toFixed(2)}% |`);
