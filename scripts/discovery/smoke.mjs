#!/usr/bin/env node
/** Repeatable fake/replay measurement; no live model, clinical certificate or browser. */
import { resolve } from "node:path";
import { tsImport } from "../../agent/node_modules/tsx/dist/esm/api/index.mjs";
const { runDays } = await tsImport("../../agent/src/run.ts", import.meta.url);
const { writeFakeWorld } = await tsImport(
  "../../agent/src/fake/world.ts",
  import.meta.url,
);
const { createFakeEhr } = await tsImport(
  "../../agent/src/fake/ehr-fake.ts",
  import.meta.url,
);
const { ScriptedLlm } = await tsImport(
  "../../agent/test/scripted.ts",
  import.meta.url,
);
const { ReplayLlm } = await tsImport(
  "../../agent/src/backends/replay.ts",
  import.meta.url,
);
const { fakeLeanStates } = await tsImport(
  "../../agent/test/lean-fixture.ts",
  import.meta.url,
);
const root = resolve(process.argv[2] ?? "runs/lean-smoke");
const worldDir = await writeFakeWorld(resolve(root, "world"), {
  days: 2,
  seed: 7,
});
const common = {
  screenMode: "lean",
  leanOptions: { states: fakeLeanStates, limits: async () => ({}) },
  days: 2,
  worldDir,
  runsRoot: root,
  personas: ["P1", "P3", "P5"],
  seedPolicy: "none",
  ehr: createFakeEhr(),
  log: console.log,
};
const recorded = await runDays({
  ...common,
  llm: new ScriptedLlm(),
  runId: "recorded",
});
await runDays({ ...common, llm: new ReplayLlm(recorded.dir), runId: "replay" });
