#!/usr/bin/env node
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ReferenceLayouts,limitFor,digest,recordedLimits} from './admission.mjs';
export const read=path=>JSON.parse(readFileSync(path,'utf8'));
export function write(path,value) {mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');}
export function familyFile(program,states,{cacheDir,density=read('docs/audits/r5-per-screen.json'),cache=new ReferenceLayouts({cacheDir})}={}) {
  const groups=new Map(),results=[];
  for(const screen of states) {
    if(!screen.screen || !program.screens.some(s=>s.id===screen.screen)) throw Error('State must name a screen in the supplied Program');
    const {limit,source}=limitFor(density,program.owner,program.specVersion,screen.screen);
    const result=cache.get(screen,{maxTargetsPerViewport:limit});results.push(result);
    const group=groups.get(screen.screen)??{screen:screen.screen,maxTargetsPerViewport:limit,limitSource:source,variants:[]};
    if(!group.variants.some(r=>r.key===result.key)) {
      group.variants.push({key:result.key,shape:result.shape,references:[{screen,layouts:result.layouts}],
        denseAccepted:result.denseAccepted,findings:result.findings});
    }
    groups.set(screen.screen,group);
  }
  return {file:{schemaVersion:1,programSha256:digest(program),families:[...groups.values()]},results,stats:cache.stats};
}
export function args(argv) {
  const out={};for(let i=0;i<argv.length;i+=2) {if(!argv[i].startsWith('--') || !argv[i+1]) throw Error('Expected --name value');out[argv[i].slice(2)]=argv[i+1];}return out;
}
export function main(argv) {
  const opts=args(argv);
  if(!opts.program || !opts.states || !opts.out) throw Error('Usage: node scripts/layout-reference/cli.mjs --program Program.json --states screens.json --out family.json [--cache directory]');
  const statePath=resolve(opts.states);
  let states;
  try {states=read(statePath);} catch(e) {if(e.code!=='EISDIR') throw e;states=readdirSync(statePath).filter(f=>f.endsWith('.json')).sort().map(f=>read(join(statePath,f)));}
  if(!Array.isArray(states)) states=[states];
  const density=read('docs/audits/r5-per-screen.json');
  if(opts['density-run']) density.recorded=recordedLimits(resolve(opts['density-run']));
  const result=familyFile(read(opts.program),states,{cacheDir:opts.cache,density});write(opts.out,result.file);
  console.log(JSON.stringify({states:states.length,families:result.file.families.length,...result.stats}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
