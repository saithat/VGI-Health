#!/usr/bin/env node
// Real interpreter/world/day plumbing, scripted proposals; no model/API calls.
import {resolve} from 'node:path';
import {tsImport} from '../../agent/node_modules/tsx/dist/esm/api/index.mjs';
const {runDays}=await tsImport('../../agent/src/run.ts',import.meta.url);
const {ScriptedLlm}=await tsImport('../../agent/test/scripted.ts',import.meta.url);
const out=resolve(process.argv[2]??'runs/dense-nightly-benchmark');
await runDays({
  days: 1, worldDir: resolve('runs/world/2'), runsRoot: out, runId: 'P3', personas: ['P3'],
  llm: new ScriptedLlm(),
  hillclimb: { fixture: async () => { throw Error('No night is scheduled in this one-day benchmark'); } },
  log: console.log,
});
