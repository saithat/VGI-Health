#!/usr/bin/env node
// Compact measured evidence, with refused geometry kept explicitly diagnostic.
import {resolve,join} from 'node:path';
import {readFileSync} from 'node:fs';
import {args,read,write} from './cli.mjs';
import {digest} from './admission.mjs';
import {version} from './generator.mjs';
const opts=args(process.argv.slice(2)),out=resolve(opts.out??join(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','reference-layouts'));
const report=read(join(out,'report.json')),visited=read(join(out,'visited.json'));
const rules=rows=>{const result={};for(const row of rows)for(const [rule,n] of Object.entries(row.rules))result[rule]=(result[rule]??0)+n;return result;};
const sum=(rows,field)=>rows.reduce((n,row)=>n+row[field],0);
const totals=[];
for(const run of visited.days.map(d=>d.run).filter((r,i,a)=>a.indexOf(r)===i))for(const persona of ['P1','P2','P3','P4','P5']){
  const rows=visited.days.filter(d=>d.run===run&&d.persona===persona);if(!rows.length)continue;
  const costs=side=>Object.fromEntries(['scrolls','scrollPx','mouseTravelPx'].map(k=>[k,rows.some(d=>d[side][k]===null)?null:rows.reduce((n,d)=>n+d[side][k],0)]));
  totals.push({run,persona,days:rows.length,states:sum(rows,'states'),denseAdmitted:sum(rows,'denseAdmitted'),noAdmittedLayout:sum(rows,'noAdmittedLayout'),fixed:costs('fixed'),dense:costs('dense'),browser:costs('browser')});
}
const density=new Map();
for(const row of [...report.densityCounts,...visited.densityCounts]){
  const key=`${row.release}/${row.persona}/${row.screen}`,old=density.get(key);
  if(old&&old.limit!==row.limit)throw Error(`Inconsistent limits: ${key}`);
  density.set(key,{key,limit:row.limit,firstViewport:Math.max(old?.firstViewport??0,row.firstViewport),scrollWindow:Math.max(old?.scrollWindow??0,row.scrollWindow),fixed:Math.max(old?.fixed??0,row.fixed)});
}
const result={generatorVersion:version,layoutExecutableSha256:digest(readFileSync(resolve('lean/.lake/build/bin/ui-layout'))),
  programCorpus:{states:sum(report.coverage,'states'),dense:sum(report.coverage,'denseAdmitted'),noAdmittedLayout:sum(report.coverage,'noAdmittedLayout'),rules:rules(report.coverage)},
  retainedCorpus:{days:visited.days.length,states:sum(visited.days,'states'),expectedStates:sum(visited.days,'expectedStates'),dense:sum(visited.days,'denseAdmitted'),noAdmittedLayout:sum(visited.days,'noAdmittedLayout'),absentDays:visited.absentDays.length,rules:rules(visited.days),missingTargets:visited.days.reduce((n,d)=>n+d.dense.missingTargets.length,0),mismatchDays:visited.days.filter(d=>d.mismatches.length).length},
  totals,density:[...density.values()].sort((a,b)=>a.key.localeCompare(b.key)),admission:visited.admission,benchmark:read(join(out,'benchmark.json'))};
write(join(out,'summary.json'),result);
const fmt=v=>`${v.scrolls} / ${v.scrollPx??'missing'} / ${v.mouseTravelPx??'missing'}`;
write(join(out,'summary-table.json'),totals);
const {writeFileSync}=await import('node:fs');
writeFileSync(join(out,'summary.md'),['Fixed, dense/fallback and stored-browser geometry on identical retained traces. Dense/fallback costs include diagnostic geometry for explicitly refused states. Columns are scrolls / scroll px / travel px.','',
 '| Recording | Persona | Days | Dense / states | Both refused | Fixed | Dense/fallback | Stored browser |','|---|---|---:|---:|---:|---|---|---|',...totals.map(d=>`| ${d.run} | ${d.persona} | ${d.days} | ${d.denseAdmitted}/${d.states} | ${d.noAdmittedLayout} | ${fmt(d.fixed)} | ${fmt(d.dense)} | ${fmt(d.browser)} |`)].join('\n')+'\n');
writeFileSync(join(out,'density.md'),['Desktop maxima across the Program/variant and retained-state corpora. Scroll-window counts include fixed targets. Over-limit dense geometry is refused, never deployed at that limit.','',
 '| Release/persona/screen | Limit | First viewport | Fixed + scroll window | Fixed | Over limit |','|---|---:|---:|---:|---:|---|',...result.density.map(d=>`| ${d.key} | ${d.limit} | ${d.firstViewport} | ${d.scrollWindow} | ${d.fixed} | ${Math.max(d.firstViewport,d.scrollWindow)>d.limit?'yes':'no'} |`)].join('\n')+'\n');
console.log(JSON.stringify({programCorpus:result.programCorpus,retainedCorpus:result.retainedCorpus,benchmark:result.benchmark,densityScreens:result.density.length}));
