#!/usr/bin/env node
// Freeze the per-screen G10 limits for Lean-painted screens with bounded lists.
// Rule (owner-approved): limit = max(measured vendor limit, most targets in view
// of the vendor release Program's dense layout on that screen over the retained
// recorded no-agent states). Computed once from the vendor baseline (releases
// v1-v3, personas P1-P5); a candidate's own layout never sets a limit.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {args,read} from './cli.mjs';
import {limitFor,digest} from './admission.mjs';
import {version} from './generator.mjs';
const opts=args(process.argv.slice(2));
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const sources=(opts.visited??'').split(',').filter(Boolean).map(f=>resolve(f));
if(!sources.length)throw Error('--visited <visited.json[,…]> is required');
const out=resolve(opts.out??'docs/methods/lean-paged-density.json');
const policy={...read('docs/audits/r5-per-screen.json'),measurements:read('docs/methods/lean-screen-density.json').measurements};
const rows=sources.flatMap(f=>read(f).densityCounts);
const days=sources.flatMap(f=>read(f).days);
const byScreen=new Map();
for(const row of rows) {
  const key=`${row.release}/${row.persona}/${row.screen}`,old=byScreen.get(key);
  const inView=Math.max(row.firstViewport,row.scrollWindow);
  byScreen.set(key,{release:row.release,persona:row.persona,screen:row.screen,vendorDense:Math.max(old?.vendorDense??0,inView),
    firstViewport:Math.max(old?.firstViewport??0,row.firstViewport),scrollWindow:Math.max(old?.scrollWindow??0,row.scrollWindow),
    shapes:(old?.shapes??0)+1});
}
const limits={};
for(const [key,v] of [...byScreen].sort(([a],[b])=>a.localeCompare(b))) {
  const measured=limitFor(policy,v.persona,v.release,v.screen);
  const limit=Math.max(measured.limit,v.vendorDense);
  limits[key]={limit,measured:measured.limit,measuredSource:measured.source,vendorDense:v.vendorDense,
    firstViewport:v.firstViewport,scrollWindow:v.scrollWindow,shapes:v.shapes,applied:limit>measured.limit?'vendor-dense':'measured'};
}
// The vendor baseline is the no-agent arm: on each retained day it ran its
// release's persona Program as exported then (with that release's vendor
// migrations). Whether that equals today's export is recorded, not required:
// later vendor fixes changed some screens, and the frozen states were rendered
// with the recorded Program.
const programs={};
for(const d of days) {
  const programFile=join(opts['recordings-root']??'/home/saithat/Projects/VGI-Health','runs',d.run,'no-agent/days',`day-${String(d.day).padStart(2,'0')}`,`${d.persona}.program.json`);
  const program=read(programFile),release=read(`releases/${program.specVersion}/personas/${d.persona}.json`);
  const normal=p=>{const {id,owner,version:_,...rest}=p;return digest(rest);};
  programs[`${d.run}/${d.persona}/day-${d.day}`]={release:program.specVersion,arm:'no-agent',programSha256:digest(program),sameAsCurrentRelease:normal(program)===normal(release)};
}
const result={schemaVersion:1,
  rule:'limit = max(measured vendor limit, most active targets in view (first viewport or fixed plus one scroll window, Lean G10) of the vendor release Program\'s dense layout with bounded lists over the retained recorded no-agent states)',
  provenance:{generator:version,layoutExecutableSha256:sha('lean/.lake/build/bin/ui-layout'),windowMirrorSha256:sha('scripts/layout-reference/window.mjs'),
    generatorSha256:sha('scripts/layout-reference/generator.mjs'),measuredSources:{'docs/audits/r5-per-screen.json':sha('docs/audits/r5-per-screen.json'),
      'docs/methods/lean-screen-density.json':sha('docs/methods/lean-screen-density.json')},visitedSha256:Object.fromEntries(sources.map(f=>[f.split('/').slice(-2).join('/'),sha(f)])),
    days:days.length,states:days.reduce((n,d)=>n+d.states,0),programs},
  limits};
writeFileSync(out,JSON.stringify(result,null,1)+'\n');
const larger=Object.entries(limits).filter(([,v])=>v.applied==='vendor-dense');
console.log(JSON.stringify({screens:Object.keys(limits).length,larger:larger.length,examples:larger.slice(0,12).map(([k,v])=>`${k}: ${v.measured}->${v.limit}`)},null,1));
