import {densityCounts} from './density.mjs';
import {readFileSync,writeFileSync,mkdirSync,renameSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {layoutFor,fixedShellFor,shapeFor,eraseContent,viewports,version} from './generator.mjs';
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export function native(input,binary=resolve('lean/.lake/build/bin/ui-layout')) {
  const p=spawnSync(binary,[],{input:JSON.stringify(input)+'\n',encoding:'utf8',maxBuffer:512*1024*1024,timeout:Number(process.env.REFERENCE_NATIVE_TIMEOUT_MS??60000),
    env:{...process.env,TMPDIR:process.env.TMPDIR??'/home/saithat/Projects/run-tmp',LEAN_NUM_THREADS:'2'}});
  if(p.status!==0) throw Error(`ui-layout failed: ${p.stderr || p.error || p.status}`);
  const result=JSON.parse(p.stdout);
  if(result.error) throw Error(result.error);
  return result;
}
export class ReferenceLayouts {
  constructor({cacheDir, binary=resolve('lean/.lake/build/bin/ui-layout'),runner,generator=layoutFor,maxMemoryEntries=256}={}) {
    this.cacheDir=cacheDir;this.binary=binary;this.runner=runner??(input=>native(input,binary));this.generator=generator;
    this.binding=digest(readFileSync(binary));this.memory=new Map();this.index=new Map();this.maxMemoryEntries=maxMemoryEntries;
    this.stats={hits:0,misses:0,admissionMs:0};
  }
  remember(key,receipt) {
    this.memory.delete(key);this.memory.set(key,receipt);
    while(this.memory.size>this.maxMemoryEntries)this.memory.delete(this.memory.keys().next().value);
  }
  get(screen,{maxTargetsPerViewport=15,allowRefused=false}={}) {
    if(!Number.isSafeInteger(maxTargetsPerViewport) || maxTargetsPerViewport<0) throw Error('Invalid target limit');
    const shape=shapeFor(screen),quickKey=digest({shape,maxTargetsPerViewport});
    // Only the built-in pure generator takes the fast path. Injected authoring
    // functions still bind their actual generated trees on every call.
    const known=this.generator===layoutFor?this.memory.get(this.index.get(quickKey)):undefined;
    if(known && (allowRefused || known.fallbackAccepted!==false)) {
      this.stats.hits++;return {...known,shape,screen,cacheHit:true};
    }
    const layouts=viewports.map(viewport=>({viewport,tree:this.generator(shape,viewport)}));
    // Bind actual trees as well as generator version: a changed/custom generator
    // cannot accidentally reuse an earlier admission. No clinical values in key.
    const key=digest({version,binary:this.binding,slots:shape.slots,layouts,maxTargetsPerViewport});
    this.index.delete(quickKey);this.index.set(quickKey,key);
    while(this.index.size>this.maxMemoryEntries)this.index.delete(this.index.keys().next().value);
    let receipt=this.memory.get(key);
    if(!receipt && this.cacheDir) try {
      const stored=JSON.parse(readFileSync(join(this.cacheDir,`${key}.json`),'utf8'));
      if(stored.key===key && stored.checksum===digest(stored.receipt)) receipt=stored.receipt;
    } catch { /* incomplete/corrupt records are misses */ }
    if(receipt && receipt.fallbackAccepted===false && !allowRefused)throw Error('No admitted layout at screen density limit');
    if(receipt) {this.stats.hits++;this.remember(key,receipt);return {...receipt,shape,screen,cacheHit:true};}
    this.stats.misses++;
    const started=performance.now();
    const erased=eraseContent(screen),references=[{screen:erased,layouts}];
    const checked=this.runner({op:'family-check',references,maxTargetsPerViewport});
    if(typeof checked.accepted!=='boolean') throw Error('Missing Lean admission verdict');
    const densePaint=this.runner({op:'family-paint',references,screen:erased,viewport:viewports[0],maxTargetsPerViewport});
    const density=densityCounts(densePaint);
    const findings=[];
    if(!checked.accepted) for(const viewport of viewports) {
      const painted=this.runner({op:'family-paint',references,screen:eraseContent(screen),viewport,maxTargetsPerViewport});
      findings.push(...(painted.findings??[]).filter(f=>!f.warning).map(f=>({...f,viewport})));
      if(painted.linked===false) findings.push({rule:'Linked',metric:'semantic-source-linkage',viewport});
    }
    let selected=layouts,fallbackAccepted=true,fallbackFindings=[];
    if(!checked.accepted) {
      selected=viewports.map(viewport=>({viewport,tree:fixedShellFor(shape,viewport)}));
      const fallback=this.runner({op:'family-check',references:[{screen:erased,layouts:selected}],maxTargetsPerViewport});
      // In particular, a measured limit <15 must never be silently raised.
      fallbackAccepted=fallback.accepted;
      if(!fallback.accepted) {
        const error=Error(`Fixed shell refused at limit ${maxTargetsPerViewport}; no admitted layout for ${screen.screen??screen.title}`);
        error.findings=findings;error.fallbackFindings=[];
        for(const viewport of viewports) {
          const painted=this.runner({op:'family-paint',references:[{screen:erased,layouts:selected}],screen:erased,viewport,maxTargetsPerViewport});
          error.fallbackFindings.push(...(painted.findings??[]).filter(f=>!f.warning).map(f=>({...f,viewport})));
        }
        if(this.cacheDir) {
          const dir=join(this.cacheDir,'refusals');mkdirSync(dir,{recursive:true});
          writeFileSync(join(dir,`${key}.json`),JSON.stringify({key,shape,maxTargetsPerViewport,findings,fallbackFindings:error.fallbackFindings}));
        }
        fallbackFindings=error.fallbackFindings;
        if(!allowRefused)throw error;
      }
    }
    const elapsedMs=performance.now()-started;this.stats.admissionMs+=elapsedMs;
    receipt={key,shape,maxTargetsPerViewport,denseAccepted:checked.accepted,fallbackAccepted,fallbackFindings,density,findings,layouts:selected,elapsedMs};
    if(this.cacheDir) {
      mkdirSync(this.cacheDir,{recursive:true});const path=join(this.cacheDir,`${key}.json`),temp=`${path}.${randomUUID()}.tmp`;
      writeFileSync(temp,JSON.stringify({key,checksum:digest(receipt),receipt}));renameSync(temp,path);
    }
    this.remember(key,receipt);return {...receipt,screen,cacheHit:false};
  }
  geometryPaints(result) {
    const path=this.cacheDir?join(this.cacheDir,'paints',`${result.key}.json`):null;
    if(path)try{const stored=JSON.parse(readFileSync(path,'utf8'));if(stored.key===result.key&&stored.checksum===digest(stored.paints))return stored.paints;}catch{/* missing/corrupt geometry is regenerated */}
    const screen=eraseContent(result.screen),paints={dense:this.paint(result,screen),fixed:this.runner({op:'structural-paint',screen,viewport:viewports[0]})};
    if(path){mkdirSync(join(this.cacheDir,'paints'),{recursive:true});const temp=`${path}.${randomUUID()}.tmp`;writeFileSync(temp,JSON.stringify({key:result.key,paints,checksum:digest(paints)}));renameSync(temp,path);}
    return paints;
  }
  paint(result,screen,viewport=viewports[0]) {
    return this.runner({op:'family-paint',references:[{screen:eraseContent(result.screen),layouts:result.layouts}],screen,viewport,
      maxTargetsPerViewport:result.maxTargetsPerViewport});
  }
}
export function limitFor(report,persona,release,screen) {
  const measured=report.measurements?.[`${release}/${persona}`];
  if(measured && Object.hasOwn(measured.limits,screen))return {limit:measured.limits[screen],source:measured.sources[screen].source};
  // Persona release measurements take priority over the broader canonical.
  const rows=report.programs.filter(p=>p.group==='vendor' && p.id===`${release}/${persona}`);
  const samples=rows.flatMap(p=>p.screens).filter(s=>s.screen===screen);
  const recorded=(report.recorded??[]).filter(r=>r.persona===persona && r.release===release && Object.hasOwn(r.limits,screen));
  const values=[...samples.map(s=>s.maximum),...recorded.map(r=>r.limits[screen])];
  return values.length?{limit:Math.max(...values),source:[...(samples.length?[`r5-per-screen:${release}/${persona}`]:[]),
    ...recorded.filter(r=>r.limits[screen]===Math.max(...values)).map(r=>r.source)].join('; ')}:
    {limit:15,source:'Lean default (no per-screen measurement)'};
}
export function recordedLimits(run) {
  const root=join(run,'reports/screens'),result=[];
  if(!existsSync(root)) return result;
  function visit(dir) {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isDirectory()) visit(path);
      else if(entry.name==='screen-policy.json') {
        const match=path.slice(root.length).match(/^\/(P\d+)\/(v\d+)\//);
        if(!match) continue;
        const programPath=join(run,'programs',match[1],`${match[2]}.json`);
        if(!existsSync(programPath)) continue;
        const program=JSON.parse(readFileSync(programPath,'utf8')),report=JSON.parse(readFileSync(path,'utf8'));
        const ref=report.densityReference;
        if(ref?.limits && ['no-agent+release','release','explicit'].includes(ref.source))
          result.push({persona:match[1],release:program.specVersion,limits:ref.limits,source:path,reference:ref.programSha256});
      }
    }
  }
  visit(root);return result;
}
