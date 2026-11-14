import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from '../app/node_modules/react/index.js';
import { renderToStaticMarkup } from '../app/node_modules/react-dom/server.node.js';
import { BenefitSummary, benefitFor } from '../app/src/dashboard/BenefitSummary.tsx';

const t=(clicks,time,completed=true)=>({task:'same',clicks,scrolls:1,popups:0,klmDeciSec:time,completed});
const day=(n,tasks)=>({day:n,persona:'P1',tasks,floor:[{...t(2,20),scrolls:0}]});
test('dashboard publishes paired time, completion and floor gaps, excludes calibration and flags missing controls',()=>{
  const run={manifest:{measurementProtocol:{name:'blind'}},days:[day(1,[t(999,999)]),day(2,[t(6,80)]),day(4,[t(2,2,false)]),day(6,[t(1,1)])],
    noAgentDays:[day(1,[t(9999,9999)]),day(2,[t(10,100)]),day(4,[t(10,100)])]};
  const data=benefitFor(run,'P1');
  assert.deepEqual(data.perDay.map(r=>r.day),[2,4]);assert.deepEqual(data.missing,[6]);
  assert.equal(data.total.paired,1);assert.equal(data.total.after.klmDeciSec,80);
  const html=renderToStaticMarkup(React.createElement(BenefitSummary,{run,persona:'P1'}));
  assert.match(html,/100 → 80 klmDeciSec/);assert.match(html,/44\.4%/);assert.match(html,/25\.0%/);
  assert.match(html,/2\/2 → 1\/2/);assert.match(html,/Missing vendor controls: days 6/);
  assert.doesNotMatch(html,/Day 1|9999/);
});
