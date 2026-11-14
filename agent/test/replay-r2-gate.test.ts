import { replayGateVerdict } from '../src/replay-r2-gate.js';
import { sumMetrics, saving } from '../src/observe.js';
import type { ReplayDay } from '../src/schema.js';

function replay():ReplayDay {
  const before={...sumMetrics([]),tasks:2,completed:2,clicks:20,scrolls:10,keystrokes:20,klmDeciSec:100,scrollPx:100,mouseTravelPx:100};
  const after={...before,clicks:19};
  return {day:1,load:'fixture',before,after,saving:saving(before,after),pctAboveFloor:{before:null,after:null},
    bounded:{policy:'bounded',memorySha256:'fixture',memorySource:'train-only',accepted:true,reasons:[],before:{...before},after:{...after},saving:saving(before,after)}};
}

it('distinguishes unknown frozen pixels from a measured bounded refusal',()=>{
  const r=replay();r.after.mouseTravelPx=null;
  expect(replayGateVerdict({mode:'nightly',outcome:'deployed'},r)).toMatchObject({refused:null,boundedPass:true,expertPass:null});
  if(!r.bounded)throw Error('Missing fixture');
  r.bounded.after.klmDeciSec=103;
  // Do not trust a stale cached accepted flag or a missing pixel metric to hide R2.
  expect(replayGateVerdict({mode:'nightly',outcome:'deployed'},r)).toMatchObject({refused:true,boundedPass:false,expertPass:null});
});

it('reports known expert regressions even when frozen pixels are unavailable',()=>{
  const r=replay();r.after.scrollPx=null;r.after.clicks=21;
  expect(replayGateVerdict({mode:'nightly',outcome:'deployed'},r)).toMatchObject({refused:true,boundedPass:true,expertPass:false});
});

it('keeps mandatory expert exceptions while requiring bounded evidence on every path',()=>{
  const r=replay();r.after={...r.before,mouseTravelPx:null,scrollPx:null};
  expect(replayGateVerdict({mode:'migrate',outcome:'recertified'},r)).toMatchObject({refused:false,expertPass:true});
  expect(replayGateVerdict({mode:'surface-feature',outcome:'not-surfaced'},r)).toMatchObject({refused:false,expertPass:true});
  expect(replayGateVerdict({mode:'surface-feature',outcome:'surfaced'},r).refused).toBeNull();
  delete r.bounded;
  expect(replayGateVerdict({mode:'migrate',outcome:'migration-fallback'},r)).toMatchObject({refused:true,boundedPass:false});
});

it('requires strict expert improvement for discretionary releases',()=>{
  const r=replay();r.after={...r.before};
  expect(replayGateVerdict({mode:'nightly',outcome:'deployed'},r)).toMatchObject({refused:true,boundedPass:true,expertPass:false});
});
