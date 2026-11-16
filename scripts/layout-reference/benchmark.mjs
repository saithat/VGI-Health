#!/usr/bin/env node
import {join,resolve} from 'node:path';
import {readdirSync,existsSync} from 'node:fs';
import {ReferenceLayouts,limitFor,digest} from './admission.mjs';
import {read,write,args} from './cli.mjs';
const opts=args(process.argv.slice(2)),out=resolve(opts.out??join(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','reference-layouts'));
const report=read(join(out,'report.json')),density=read('docs/audits/r5-per-screen.json');
// A fresh memory-only cache measures actual cold admission, independently of
// the warmed coverage run. Reuse its already recorded vendor thresholds.
const cache=new ReferenceLayouts(),target=Number(opts.count??100),started=performance.now();
let states=0,fallbacks=0;
outer:for(const release of ['v1','v2','v3'])for(const persona of ['P1','P2','P3','P4','P5']) {
  const program=read(`releases/${release}/personas/${persona}.json`),fhir=resolve('fixtures/synthea/Abdul_Sauer_d0fe99e5.json');
  const dir=join(out,'screens',digest({program,spec:read(`releases/${release}/spec.json`),fhir}));
  if(!existsSync(dir)) throw Error('Run report.mjs before benchmarking');
  for(const file of readdirSync(dir).filter(f=>f.endsWith('.json')&&!f.endsWith('complete.json')).sort()) {
    const screen=read(join(dir,file));
    const limit=report.limits[`${release}/${persona}/${screen.screen}`]?.limit??limitFor(density,persona,release,screen.screen).limit;
    const result=cache.get(screen,{maxTargetsPerViewport:limit});states++;if(!result.cacheHit&&!result.denseAccepted)fallbacks++;
    if(cache.stats.misses>=target)break outer;
  }
}
const result={...cache.stats,states,fallbacks,elapsedMs:performance.now()-started,layoutsPerSecond:cache.stats.misses/(cache.stats.admissionMs/1000),
  scope:'Fresh memory-only cache; native admission at all three supported viewports, startup/diagnostics/fallback included'};
write(join(out,'benchmark.json'),result);console.log(JSON.stringify(result));
