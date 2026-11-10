import { recomputedSavings } from '../src/quality-ledger.js';
import { trainEstimateWindow } from '../src/protocol.js';
import path from 'node:path';
import hashes from './fixtures/quality-prompt-hashes.json';
import currentHashes from './fixtures/quality-prompt-hashes-current.json';
import { goldenContext } from './quality-golden-context.js';
import { historicalDecisions, decisionId } from '../src/quality.js';
import { nightlyPrompt, choosePrompt, repairPrompt } from '../src/prompts.js';
import { withQuality } from '../src/quality-context.js';
import { sha256 } from '../src/program.js';
import { REPO_ROOT } from '../src/util.js';
import { withData } from './data.js';

async function armAHashes(specs:'archived'|'current') {
  const records=await historicalDecisions(path.join(REPO_ROOT,'runs/core-10day'));
  const actual:Record<string,string[]>={};
  for(const record of records.filter(r=>r.mode==='nightly')) {
    const c=await goldenContext(record,records,specs);
    actual[decisionId(record)]=[nightlyPrompt(c.nightly),choosePrompt(c.choose),repairPrompt(c.repair)].map(p=>sha256(withQuality(p).system+'\0'+withQuality(p).prompt));
  }
  return actual;
}
// Frozen builder hashes refreshed for neutral terms and deterministic core-recording manual examples.
// Archived nights use the specs in force when they ran (pinned fixtures), so later releases cannot move these hashes.
withData('runs/core-10day/decisions').it('arm A matches frozen propose, choose and repair bytes on all 35 frozen contexts',async()=>{
  const actual=await armAHashes('archived');
  expect(Object.keys(actual)).toHaveLength(35);expect(actual).toEqual(hashes);
});
// The same builders over today's releases/<v>/spec.json: refresh this file (only) when a release spec changes.
withData('runs/core-10day/decisions').it('arm A prompt bytes over the current release specs',async()=>{
  const actual=await armAHashes('current');
  expect(Object.keys(actual)).toHaveLength(35);expect(actual).toEqual(currentHashes);
});

withData('runs/core-10day/decisions').it('validates archived ledger coverage using the actual last-two-training-days estimator window',async()=>{
  const records=await historicalDecisions(path.join(REPO_ROOT,'runs/core-10day'));
  const map=recomputedSavings(records,records);
  expect(map.size).toBe(records.reduce((n,r)=>n+r.candidates.length,0));
  const last=records.find(r=>r.night===9&&r.persona==='P4');if(!last)throw new Error('Missing archived decision');
  expect(last.evidence.trainDays).toEqual([1,3,5,7,9]);expect(trainEstimateWindow(last.evidence.trainDays)).toEqual([7,9]);
  for(const r of records)for(const c of r.candidates)if(c.trainEstimate)expect(c.trainEstimate.days).toEqual(trainEstimateWindow(r.evidence.trainDays));
});
