import path from 'node:path';
import hashes from './fixtures/quality-prompt-hashes.json';
import { goldenContext } from './quality-golden-context.js';
import { historicalDecisions, decisionId } from '../src/quality.js';
import { nightlyPrompt, choosePrompt, repairPrompt } from '../src/prompts.js';
import { withQuality } from '../src/quality-context.js';
import { sha256 } from '../src/program.js';
import { REPO_ROOT } from '../src/util.js';
import { withData } from './data.js';

// Hashes captured with the builders from merged main 18a0b70c (compact density), independently of arm additions.
withData('runs/core-10day-live/decisions','runs/run1-P3/decisions').it('arm A matches pre-change propose, choose and repair bytes on all 35 frozen contexts',async()=>{
  const records=await historicalDecisions(path.join(REPO_ROOT,'runs/core-10day-live'));
  const actual:Record<string,string[]>={};
  for(const record of records.filter(r=>r.mode==='nightly')) {
    const c=await goldenContext(record,records);
    actual[decisionId(record)]=[nightlyPrompt(c.nightly),choosePrompt(c.choose),repairPrompt(c.repair)].map(p=>sha256(withQuality(p).system+'\0'+withQuality(p).prompt));
  }
  expect(Object.keys(actual)).toHaveLength(35);expect(actual).toEqual(hashes);
});
