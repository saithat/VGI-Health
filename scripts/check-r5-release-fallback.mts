// Archive-backed regression: the certified release fallback (vendor persona
// layout, with release features surfaced) must pass R5 even when the no-agent
// arm kept the previous layout without the optional feature (rules2-10day P1
// night 3: no-agent w1Labs 24, release v2 w1Labs 25–28).
// Read-only: outputs go only to --out. Usage: --run runs/<id> --persona P1 --release v2 --day 4
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {createEhr} from '../agent/src/ehr.ts';
import {createScreenChecker} from '../agent/src/screencheck.ts';
import {noAgentReference} from '../agent/src/vendor-reference.ts';
import {programSchema} from '../agent/src/schema.ts';
import {personalize} from '../agent/src/program.ts';
import {acquireBrowserLock} from './browser-heavy-lock.mjs';
const {values}=parseArgs({options:{out:{type:'string'},run:{type:'string'},persona:{type:'string',default:'P1'},release:{type:'string',default:'v2'},day:{type:'string',default:'4'}}});
if(!values.out || !values.run || !process.env.TMPDIR)throw Error('Set disk-backed TMPDIR; use --run runs/<id> --out <scratch>');
const root=resolve(import.meta.dirname,'..'),out=resolve(values.out),run=resolve(values.run),persona=values.persona!,release=values.release!;
await mkdir(out,{recursive:true});
const read=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
const vendor=programSchema.parse(await read(join(root,'releases',release,'personas',`${persona}.json`)));
const noAgent=programSchema.parse(await read(join(run,'no-agent/days',`day-${values.day!.padStart(2,'0')}`,`${persona}.program.json`)));
assert.equal(noAgent.specVersion,release);
const fallback={...personalize(vendor,{id:persona,role:noAgent.role} as never,noAgent.owner),id:noAgent.id,version:noAgent.version+2,specVersion:release};
const lock=await acquireBrowserLock();
try {
 const checker=createScreenChecker(createEhr({fake:false}),{artifactsDir:out,workers:4,referenceProgram:noAgentReference(run,Number(values.day))});
 for(const [name,program] of [['release fallback',fallback],['no-agent layout',{...noAgent,version:noAgent.version+3}]] as const){
  const result=await checker.check({specVersion:release,program});
  console.log(JSON.stringify({name,status:result.status,message:result.message.slice(0,300)}));
  assert.equal(result.status,'pass',`${name}: ${result.message}`);
 }
} finally {lock.release();}
