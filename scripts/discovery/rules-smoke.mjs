#!/usr/bin/env node
/** Scripted mixed rules/Program candidates, fake clinician, real native G1–G11. */
import { resolve } from 'node:path';
import { tsImport } from '../../agent/node_modules/tsx/dist/esm/api/index.mjs';
const {runDays}=await tsImport('../../agent/src/run.ts',import.meta.url);
const {writeFakeWorld}=await tsImport('../../agent/src/fake/world.ts',import.meta.url);
const {createFakeEhr}=await tsImport('../../agent/src/fake/ehr-fake.ts',import.meta.url);
const {RulesScript,ruleFixtureStates}=await tsImport('../../agent/test/layout-rule-fixture.ts',import.meta.url);
const {ReplayLlm}=await tsImport('../../agent/src/backends/replay.ts',import.meta.url);
const root=resolve(process.argv[2]??'runs/layout-rules-smoke');
const worldDir=await writeFakeWorld(resolve(root,'world'),{days:2,seed:7});
const common={screenMode:'lean',leanOptions:{states:ruleFixtureStates,limits:async()=>({})},days:2,worldDir,runsRoot:root,personas:['P1','P3','P5'],seedPolicy:'none',ehr:createFakeEhr(),log:console.log};
const result=await runDays({...common,llm:new RulesScript(),runId:'recorded'});
await runDays({...common,llm:new ReplayLlm(result.dir),runId:'replay'});
console.log(JSON.stringify({dir:result.dir,infrastructureErrors:result.infrastructureErrors,llmErrors:result.llmErrors}));
