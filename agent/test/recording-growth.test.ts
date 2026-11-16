import { readdir, readFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { BoundedMap } from '../src/bounded-map.js';
import { diskArray } from '../src/disk-array.js';
import { jsonChunks, writeJsonAtomic } from '../src/util.js';
import { geometryEhr, geometryProgramHash, geometryComponentsHash, loadGeometry } from '../src/geometry.js';
import { createFakeEhr, fakeCanonical } from '../src/fake/ehr-fake.js';
import { fakeWorld, tmp } from './helpers.js';
import { loadWorld } from '../src/world.js';
import type { GeometryAtlas } from '../../app/src/metrics/geometry.js';
import { readStoredGeometry } from '../src/geometry-format.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

it('releases captured and merged trees between fake days after forced GC',async()=>{
  const child=await promisify(execFile)(process.execPath,[
    '--expose-gc','--max-old-space-size=256','--import',
    fileURLToPath(new URL('../node_modules/tsx/dist/loader.mjs',import.meta.url)),
    fileURLToPath(new URL('./fixtures/geometry-memory-child.ts',import.meta.url)),
  ],{timeout:30_000,env:{...process.env}});
  const memory:unknown=JSON.parse(child.stdout);
  if(!memory||typeof memory!=='object'||!('retainedGrowth'in memory)||typeof memory.retainedGrowth!=='number')throw Error('Invalid memory result');
  expect(memory.retainedGrowth).toBeLessThan(4*1024*1024);
});

it('bounds evidence caches and decodes only two disk records',()=>{
  const cache=new BoundedMap<number,number>(2);
  for(let i=0;i<100;i++)cache.set(i,i);
  expect([...cache.keys()]).toEqual([98,99]);
  cache.get(98);cache.set(100,100);
  expect([...cache.keys()]).toEqual([98,100]);
  let loads=0;
  const array=diskArray([1,2,3,4],key=>{loads++;return {key};});
  expect(loads).toBe(0);
  expect(array.at(-1)).toEqual({key:4});
  expect(array.at(-1)).toEqual({key:4});
  expect(loads).toBe(1);
  expect(array.map(row=>row.key)).toEqual([1,2,3,4]);
  expect(array.slice(-2).map(row=>row.key)).toEqual([3,4]);
});

it('streams the same JSON bytes through atomic publication',async()=>{
  const value={unicode:'a\n医療🙂',array:[null,1,true,undefined,{x:'y',omit:undefined}],empty:{},omit:undefined,
    date:new Date('2026-11-01T00:00:00.000Z'),custom:{toJSON:()=>undefined}};
  const expected=JSON.stringify(value,null,2)+'\n';
  expect([...jsonChunks(value)].join('')).toBe(expected);
  const file=path.join(await tmp('stream-json'),'value.json');
  await writeJsonAtomic(file,value);
  expect(await readFile(file,'utf8')).toBe(expected);
});

it('reads a historical atlas larger than the string-buffer threshold across escaped boundaries',async()=>{
  const directory=await tmp('legacy-geometry-stream'),file=path.join(directory,'old.json');
  try{
    const label='x'.repeat(50_000)+'"\\\n{]}🙂';
    const state={screen:'home',state:label,viewport:{width:1440,height:900},scrollers:{},components:{}};
    await writeJsonAtomic(file,{schemaVersion:1,programHash:'old',appSha256:'old',source:'recorded-fixture',viewport:{width:1440,height:900},states:Array.from({length:400},()=>state),aliases:{'escaped"':['target\\']}});
    expect((await stat(file)).size).toBeGreaterThan(16*1024*1024);
    const atlas=await loadGeometry(file);
    expect(atlas.states).toHaveLength(400);
    expect(atlas.states[399]?.state).toBe(label);
    expect(atlas.aliases).toEqual({'escaped"':['target\\']});
  }finally{await rm(directory,{recursive:true,force:true});}
});

it.each([false,true])('keeps storage per call bounded and reuses geometry bodies (traceAware=%s)',async traceAware=>{
  const world=await loadWorld(await fakeWorld(6)),program=fakeCanonical('v1');
  const persona=world.personas.get('P1');if(!persona)throw Error('fixture persona');
  const dir=await tmp('growth'),directory=path.join(dir,'geometry');
  let captures=0;
  const provider:import('../src/geometry.js').GeometryProvider=async input=>{
    captures++;
    const box={center:{x:720,y:450},reveal:{x:720,y:450},chain:[],offsets:{}};
    return {schemaVersion:1,programHash:geometryProgramHash(program),appSha256:'fixture',source:'recorded-fixture',viewport:{width:1440,height:900},
      states:Array.from({length:100},(_,i)=>({screen:'home',state:`d${input.schedule?.day}-${i}`,viewport:{width:1440,height:900},scrollers:{},components:{a:box}}))};
  };
  const ehr=geometryEhr(createFakeEhr(),provider,dir,traceAware),results=[];
  for(let day=1;day<=6;day++){
    const schedule=await world.schedule(day,'P1');if(!schedule)throw Error('fixture schedule');
    const input={specVersion:'v1',program,persona,schedule,worldDir:world.dir,seed:day};
    const result=await ehr.simulate(input);results.push(result);
    expect(await ehr.simulate(input)).toEqual(result);
  }
  expect(captures).toBe(6);
  expect(await readdir(path.join(directory,'objects'))).toHaveLength(1);
  const file=path.join(directory,`${geometryProgramHash(program)}.${geometryComponentsHash(program)}.json`);
  const pointer=JSON.parse(await readFile(file,'utf8'));
  expect(pointer.schemaVersion).toBe(2);
  expect((await stat(file)).size).toBeLessThan(1024);
  for(const result of results){
    const atlas=await loadGeometry(file,result);
    expect(atlas.states).toHaveLength(100);
    expect(atlas.states.every(s=>s.state.startsWith(`d${result.day}-`))).toBe(true);
    expect(await readStoredGeometry(file,async file=>JSON.parse(await readFile(file,'utf8')),{result})).toEqual(atlas);
    expect(await readStoredGeometry(file,async file=>JSON.parse(await readFile(file,'utf8')),{day:result.day})).toEqual(atlas);
  }
  // Old recordings remain readable without migration or rewriting their bytes.
  const legacy:GeometryAtlas={schemaVersion:1,programHash:'old',appSha256:'old',source:'recorded-fixture',viewport:{width:1440,height:900},states:[]};
  const legacyFile=path.join(directory,'old.json');await writeJsonAtomic(legacyFile,legacy);
  expect(await loadGeometry(legacyFile)).toEqual(legacy);
  const body=(await readdir(path.join(directory,'objects')))[0];if(!body)throw Error('Missing geometry body');
  const bodyFile=path.join(directory,'objects',body);
  await writeJsonAtomic(bodyFile,{...JSON.parse(await readFile(bodyFile,'utf8')),screen:'tampered'});
  await expect(loadGeometry(file)).rejects.toThrow('content hash mismatch');
});
