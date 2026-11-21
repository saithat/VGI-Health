import { describe, expect, it } from "vitest";
import {
  compactStates,
  traceStates,
  type LeanScreenState,
} from "../src/lean-layout-states.js";
import { shapeFor } from "../../scripts/layout-reference/generator.mjs";
import { occurrences } from "../src/lean-layout-geometry.js";
import { stableStringify } from "../src/program.js";

import path from "node:path";
import { symlink } from "node:fs/promises";
import { withData } from "./data.js";
import { tmp } from "./helpers.js";
import { taskSlots } from "../src/replay-pool.js";
import { RunStore } from "../src/store.js";
import { loadWorld } from "../src/world.js";
import { dayResultSchema, specSchema } from "../src/schema.js";
import { DEFAULT_EHR_BIN } from "../src/ehr.js";
import { readJson, REPO_ROOT } from "../src/util.js";

const ui = (value: string, buttons = 1) => ({
  screen: "s",
  banner: [["Patient", "Synthetic"]],
  nav: [],
  title: "T",
  side: [],
  modal: null,
  workspace: [
    { text: { s: value } },
    ...Array.from({ length: buttons }, (_, i) => ({
      button: { comp: `b${i}`, label: "Go", role: "secondary", enabled: true, blockedReason: null, hotkey: null },
    })),
  ],
});
describe("trace state compaction", () => {
  it("keeps the last screen of each shape and the first of each placement, and every key", () => {
    const sequence = [ui("a"), ui("b"), ui("c", 2), ui("d"), ui("e", 2), ui("f")];
    const plain: LeanScreenState[] = sequence.map((u, i) => ({ screen: "s", ui: u, state: `t${i}`, eventIndex: i }));
    const compact: LeanScreenState[] = [];
    const keep = compactStates(compact);
    for (const s of plain) keep({ ...s });
    const keys = (states: LeanScreenState[]) =>
      states.map((s) => [s.state, s.eventIndex, stableStringify([s.screen, shapeFor(s.ui), occurrences(s.ui)])]);
    expect(keys(compact)).toEqual(keys(plain));
    // Last of each shape keeps its own screen (painted representative).
    expect(compact[5]?.ui).toBe(sequence[5]);
    expect(compact[4]?.ui).toBe(sequence[4]);
    // Earlier states share the first screen of their placement.
    expect(compact[1]?.ui).toBe(sequence[0]);
    expect(compact[3]?.ui).toBe(sequence[0]);
    expect(compact[2]?.ui).toBe(sequence[2]);
  });
});

withData(
  "runs/lean-10day/days/day-01/P1.json",
  "runs/world/2",
  "fixtures/synthea/index.json",
).it(
  "renders the same recorded task states with parallel native workers and serial ehr serve",
  async () => {
    const store = new RunStore(path.join(REPO_ROOT, "runs/lean-10day"));
    const world = await loadWorld(path.join(REPO_ROOT, "runs/world/2"));
    const day = await readJson(store.dayPath(1, "P1"), dayResultSchema);
    const schedule = await world.schedule(1, "P1");
    if (!schedule) throw Error("Missing recorded schedule");
    const program = await store.readProgram("P1", day.programVersion);
    const spec = await readJson(
      path.join(REPO_ROOT, "releases", program.specVersion, "spec.json"),
      specSchema,
    );
    const tasks = day.tasks.slice(0, 2);
    const ids = new Set(tasks.map((t) => t.task));
    const input = {
      worldDir: world.dir,
      program,
      spec,
      schedule,
      result: {
        ...day,
        tasks,
        trace: day.trace.filter((row) => ids.has(row.task)),
      },
    };
    const alias = path.join(await tmp("trace-serve"), "ehr");
    await symlink(DEFAULT_EHR_BIN, alias);
    const serial = await taskSlots.run(1, () => traceStates(alias, input));
    const parallel = await taskSlots.run(2, () =>
      traceStates(DEFAULT_EHR_BIN, input),
    );
    expect(parallel.length).toBe(input.result.trace.length);
    expect(JSON.stringify(parallel)).toBe(JSON.stringify(serial));
  },
  60000,
);
