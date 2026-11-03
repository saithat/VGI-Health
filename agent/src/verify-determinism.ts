import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { parseArgs } from 'node:util';
import { contentDigest,firstDifference } from './content-digest.js';
import { prepareDeterminismFixture,runDeterminismFixture } from './determinism-fixture.js';
const {values}=parseArgs({options:{out:{type:'string'}}});
const root=values.out?path.resolve(values.out):await mkdtemp(path.join(tmpdir(),'vgi-determinism-'));
await prepareDeterminismFixture(root);
let reference:Awaited<ReturnType<typeof contentDigest>>|undefined;
for(const [id,parallel]of [['serial-a',false],['serial-b',false],['parallel',true]] as const){
 const run=await runDeterminismFixture(root,id,false,parallel),digest=await contentDigest(run.dir,undefined,true);
 if(reference){const difference=firstDifference(reference,digest);if(difference)throw new Error(`${id}: ${difference}`);}else reference=digest;
 console.log(`${id}: ${digest.contentDigest}`);
}
console.log(`PASS: serial = serial = parallel; native ehr, 2 days x 2 personas, zero model calls, fixed fixture geometry. Artifacts: ${root}`);
