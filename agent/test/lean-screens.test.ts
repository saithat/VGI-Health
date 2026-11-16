import {
  layoutFor,
  shapeFor,
} from "../../scripts/layout-reference/generator.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  LeanScreenChecker,
  vendorDensityLimits,
} from "../src/lean-screencheck.js";
import { layoutRunner, viewports } from "../src/lean-layout-native.js";
import {
  paintSchema,
  placedGeometry,
  shellTree,
} from "../src/lean-layout-geometry.js";
import {
  withDesign,
  designOf,
  type LayoutDesign,
} from "../src/layout-design.js";
import { applyToProgram, stableStringify } from "../src/program.js";
import { geometryComponentsHash, attachGeometry } from "../src/geometry.js";
import { createFakeEhr } from "../src/fake/ehr-fake.js";
import { fakeCanonical } from "../src/fake/fixtures.js";
import { runDays } from "../src/run.js";
import { ReplayLlm } from "../src/backends/replay.js";
import { llmProposalSchema } from "../src/schema.js";
import type { JsonRequest } from "../src/backends/types.js";
import { fakeLeanStates } from "./lean-fixture.js";
import { ScriptedLlm } from "./scripted.js";
import { fakeWorld, tmp } from "./helpers.js";
import { RunStore } from "../src/store.js";
import type { LeanScreenState } from "../src/lean-layout-states.js";
import type { GeometryProvider } from "../src/geometry.js";
import {
  compactLeanInventory,
  leanLayoutPrompt,
} from "../src/lean-layout-prompt.js";
const canonicalV1 = fakeCanonical("v1");
function required<T>(value: T | undefined): T {
  if (value === undefined) throw Error("Missing test fixture");
  return value;
}
const ui = (screen = "s") => ({
  screen,
  banner: [["Patient", "Synthetic Gallery Patient"]],
  title: "Review",
  nav: [],
  workspace: [
    {
      button: {
        comp: "first",
        label: "Review",
        role: "secondary",
        enabled: true,
        blockedReason: null,
        hotkey: null,
      },
    },
    {
      button: {
        comp: "sign",
        label: "Sign",
        role: "primary",
        enabled: true,
        blockedReason: null,
        hotkey: null,
      },
    },
  ],
  side: [],
  modal: null,
});
export function freeLayouts(shape: unknown[]): LayoutDesign[number]["layouts"] {
  const slots = z
    .array(
      z.object({
        path: z.array(z.number()),
        target: z.boolean(),
        region: z.string(),
      }),
    )
    .parse(shape);
  return viewports.map((viewport) => {
    const node = (slot: (typeof slots)[number]) => ({
      type: slot.target ? "Button" : "Text",
      id: `source-${slot.path.join("-")}`,
      source: slot.path,
      target: slot.target,
      banner: slot.region === "banner",
      commit: slot.region === "footer",
      interruptive: slot.region === "modal",
      width: viewport.w - 2048,
      height: slot.region === "banner" ? 7040 : 3840,
      fg: "slate-900",
      bg: "white",
      text: {
        key: slot.path.join("-"),
        safety: true,
        overflow: "scroll",
        maxLines: 1,
        font: 0,
        fontSize: 896,
        lineHeight: 1408,
      },
    });
    const fixed = slots
      .filter((s) => ["banner", "footer", "modal"].includes(s.region))
      .map((s) => ({
        ...node(s),
        position: {
          x: 1024,
          y:
            s.region === "banner"
              ? 512
              : s.region === "footer"
                ? viewport.h - 4608
                : 10000,
        },
        z: s.region === "modal" ? 100 : 0,
      }));
    return {
      viewport,
      tree: {
        type: "Absolute",
        width: "fill",
        height: "fill",
        children: [
          ...fixed.filter((n) => n.banner),
          {
            type: "Scroll",
            id: "free-body",
            position: { x: 1024, y: 8704 },
            width: viewport.w - 2048,
            height: viewport.h - 14592,
            gap: 768,
            children: slots
              .filter((s) => !["banner", "footer", "modal"].includes(s.region))
              .map(node),
          },
          ...fixed.filter((n) => !n.banner),
        ],
      },
    };
  });
}
const fixtureStates = async (): Promise<LeanScreenState[]> => [
  { screen: "s", ui: ui(), state: "s" },
];
const limits = async () => ({ s: { limit: 2, source: "test vendor" } });
describe("Lean screen gate and atlas (real ui-layout, synthetic fixtures)", () => {
  it("admits dense references under tighter per-screen limits, records provenance and binds an atlas", async () => {
    const dir = await tmp("lean-gate"),
      checker = new LeanScreenChecker(createFakeEhr(), {
        states: fixtureStates,
        limits,
        artifactsDir: dir,
      });
    const program = withDesign(structuredClone(canonicalV1));
    const result = await checker.check({
      program,
      specVersion: program.specVersion,
    });
    expect(result.status, result.message).toBe("pass");
    expect(result.mode).toBe("lean");
    expect(result.message).toContain("test vendor");
    const atlas = await checker.geometry({
      program,
      specVersion: program.specVersion,
    });
    const { fileHash } = await import("../src/fingerprints.js");
    const { REPO_ROOT } = await import("../src/util.js");
    expect(atlas?.appSha256).toBe(
      "lean-layout:" +
        (await fileHash(
          path.join(REPO_ROOT, "lean/.lake/build/bin/ui-layout"),
        )),
    );
    expect(atlas?.states[0]?.components["sign"]?.center.y).toBe(872);
    const { readdir } = await import("node:fs/promises");
    const galleryFile = (await readdir(dir, { recursive: true })).find((file) =>
      file.endsWith("/0.json"),
    );
    const gallery = z
      .object({ paint: paintSchema })
      .parse(
        JSON.parse(
          await readFile(path.join(dir, required(galleryFile)), "utf8"),
        ),
      );
    expect(
      gallery.paint.boxes.some((box) =>
        box.original?.includes("Synthetic Gallery Patient"),
      ),
    ).toBe(true);
  });
  it("refuses excess density, missing sources, missing viewports and unlinked flags with Lean findings", async () => {
    const [shapeReply] = await layoutRunner([
      { op: "family-check", references: [{ screen: ui() }] },
    ]);
    const shape = required(required(shapeReply?.shapes)[0]);
    const design: LayoutDesign = [
      { screen: "s", shape, layouts: freeLayouts(shape) },
    ];
    const program = withDesign(structuredClone(canonicalV1), design);
    const admitted = new LeanScreenChecker(createFakeEhr(), {
      states: fixtureStates,
      limits,
    });
    const customResult = await admitted.check({
      program,
      specVersion: program.specVersion,
    });
    expect(customResult.status, customResult.message).toBe("pass");
    const customAtlas = await admitted.geometry({
      program,
      specVersion: program.specVersion,
    });
    expect(customAtlas?.states[0]?.components["sign"]?.center.y).toBe(858);
    const checker = new LeanScreenChecker(createFakeEhr(), {
      states: fixtureStates,
      limits: async () => ({ s: { limit: 1, source: "test" } }),
    });
    const density = await checker.check({
      program,
      specVersion: program.specVersion,
    });
    expect(density.status).toBe("fail");
    expect(density.message).toContain("G10");
    const missing = structuredClone(design);
    required(missing[0]).layouts = required(missing[0]).layouts.slice(0, 1);
    const result = await new LeanScreenChecker(createFakeEhr(), {
      states: fixtureStates,
    }).check({
      program: withDesign(structuredClone(canonicalV1), missing),
      specVersion: program.specVersion,
    });
    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/G1|G7|refused/);
    const bad = structuredClone(design);
    required(bad[0]).layouts.forEach((c) => {
      const tree = z
        .object({ children: z.array(z.record(z.string(), z.json())) })
        .passthrough()
        .parse(c.tree);
      c.tree = z.json().parse({
        ...tree,
        children: tree.children.filter((n) => !n["commit"]),
      });
    });
    const refused = await new LeanScreenChecker(createFakeEhr(), {
      states: fixtureStates,
    }).check({
      program: withDesign(structuredClone(canonicalV1), bad),
      specVersion: program.specVersion,
    });
    expect(refused.status).toBe("fail");
    expect(refused.message).toContain("G7");
    const duplicate = structuredClone(design);
    required(duplicate[0]).layouts.push(
      structuredClone(required(required(duplicate[0]).layouts[0])),
    );
    const shadowed = await new LeanScreenChecker(createFakeEhr(), {
      states: fixtureStates,
    }).check({
      program: withDesign(structuredClone(canonicalV1), duplicate),
      specVersion: program.specVersion,
    });
    expect(shadowed.status).toBe("fail");
    expect(shadowed.message).toContain("duplicate custom viewport");
  });
  it("maps scroll offsets from Lean boxes through the existing physical metrics", async () => {
    const screen = ui();
    screen.workspace = Array.from({ length: 30 }, (_, i) => ({
      button: {
        comp: `target${i}`,
        label: `Target ${i}`,
        role: i === 29 ? "primary" : "secondary",
        enabled: true,
        blockedReason: null,
        hotkey: null,
      },
    }));
    const [reply] = await layoutRunner([{ op: "structural-paint", screen }]);
    const paint = paintSchema.parse(reply);
    const state = placedGeometry(paint, screen, "s", "s");
    expect(state.components["target20"]?.offsets["0"]?.y).toBeGreaterThan(0);
    const task = {
      task: "t",
      clicks: 1,
      keystrokes: 0,
      scrolls: 0,
      popups: 0,
      overrides: 0,
      searches: 0,
      backtracks: 0,
      klmDeciSec: 10,
      completed: true,
    };
    const day = {
      day: 1,
      persona: "P1",
      programVersion: 0,
      trace: [
        {
          task: "t",
          screen: "s",
          t: 0,
          event: { click: { comp: "target20" } },
          ops: ["point" as const, "click" as const],
          result: "ok" as const,
        },
      ],
      tasks: [task],
      floor: [],
      complaints: [],
    };
    const measured = attachGeometry(day, {
      schemaVersion: 1,
      programHash: "fixture",
      appSha256: "lean-layout:fixture",
      source: "recorded-fixture",
      viewport: { width: 1440, height: 900 },
      states: [state],
    });
    expect(measured.tasks[0]?.scrolls).toBe(1);
    expect(measured.tasks[0]?.scrollPx).toBe(
      state.components["target20"]?.offsets["0"]?.y,
    );
    expect(measured.tasks[0]?.mouseTravelPx).toBeGreaterThan(0);
    expect(measured.trace).toEqual(day.trace);
    const [check] = await layoutRunner([
      {
        op: "family-check",
        references: [
          {
            screen,
            layouts: (
              await layoutRunner(
                viewports.map((viewport) => ({
                  op: "structural-paint",
                  screen,
                  viewport,
                })),
              )
            ).map((p, i) => ({
              viewport: viewports[i],
              tree: shellTree(paintSchema.parse(p)),
            })),
          },
        ],
        maxTargetsPerViewport: 15,
      },
    ]);
    expect(check?.accepted, JSON.stringify(check)).toBe(true);
  });
  it("separates custom-layout cache identity and stores layouts beside immutable Programs", async () => {
    const program = withDesign(structuredClone(canonicalV1));
    const [shapeReply] = await layoutRunner([
      { op: "family-check", references: [{ screen: ui() }] },
    ]);
    const shape = required(required(shapeReply?.shapes)[0]);
    const value: LayoutDesign = [
      { screen: "s", shape, layouts: freeLayouts(shape) },
    ];
    const changed = applyToProgram(
      program,
      [{ op: "add", path: "/layouts", value: z.json().parse(value) }],
      { version: 1 },
    ).program;
    expect(geometryComponentsHash(changed)).not.toBe(
      geometryComponentsHash({ ...changed }),
    );
    expect(stableStringify(changed)).not.toContain("layouts");
    const dir = await tmp("lean-store"),
      store = new RunStore(dir, path.join(dir, "custom"), true),
      ehr = createFakeEhr();
    const deployed = await ehr.deploy({
      program: changed,
      prev: program,
      canonical: program,
      specVersion: program.specVersion,
      outDir: path.join(dir, "native"),
    });
    expect(deployed.deployed).toBe(true);
    if (!deployed.deployed) throw Error("fixture");
    await store.deploy("P1", changed, deployed.certificate);
    expect(designOf((await store.login("P1")).program)).toEqual(value);
    expect(designOf(await store.readProgram("P1", 1))).toEqual(value);
    await expect(
      store.deploy("P1", withDesign({ ...changed }, []), deployed.certificate),
    ).rejects.toThrow("immutable");
    await writeFile(path.join(dir, "programs/P1/v1.layouts.json"), "[]");
    await expect(store.login("P1")).rejects.toThrow("binding mismatch");
    expect(() =>
      applyToProgram(
        { ...program },
        [{ op: "add", path: "/layouts", value: z.json().parse(value) }],
        { version: 1 },
      ),
    ).toThrow("--screens lean");
  });
  it("uses vendor-only limits and falls back to 15 for absent ids", async () => {
    const measured = await vendorDensityLimits("v1", "P1");
    expect(measured["w1Orders"]?.limit).toBeGreaterThan(0);
    expect(measured["unmeasured"]).toBeUndefined();
  });
  it("keeps default prompts unchanged and adds the full free-layout contract only on opt in", () => {
    const input = { system: "default", prompt: "training evidence" };
    const output = leanLayoutPrompt(input, "{}");
    expect(input).toEqual({ system: "default", prompt: "training evidence" });
    expect(output.prompt).toContain("G10");
    expect(output.system).toContain("fewer clicks and scrolls");
    expect(output.prompt).toContain("/layouts");
  });
});
/** Fake traces and semantic screen fixtures are explicitly synthetic. Native
 * ui-layout still checks and paints every fixture used by the test loop. */
const runStates = async (
  input: Parameters<GeometryProvider>[0],
): Promise<LeanScreenState[]> => {
  const all = input.program.screens.map((s) => ({
    screen: s.id,
    ui: {
      ...ui(s.id),
      workspace: s.components.map((c) => ({
        button: {
          comp: c.id,
          label: c.label,
          role: "secondary",
          enabled: true,
          blockedReason: null,
          hotkey: null,
        },
      })),
    },
    state: s.id,
  }));
  return all;
};
it("runs two days through Lean providers with scripted/replay backends and no browser", async () => {
  const worldDir = await fakeWorld(2),
    runsRoot = await tmp("lean-run");
  const common = {
    screenMode: "lean" as const,
    leanOptions: { states: runStates, limits: async () => ({}) },
    days: 2,
    worldDir,
    runsRoot,
    personas: ["P1"],
    seedPolicy: "none" as const,
    ehr: createFakeEhr(),
  };
  const recorded = await runDays({
    ...common,
    llm: new ScriptedLlm(),
    runId: "recorded",
  });
  const replay = await runDays({
    ...common,
    llm: new ReplayLlm(recorded.dir),
    runId: "replay",
  });
  expect(replay.infrastructureErrors).toEqual([]);
  expect(replay.llmErrors).toEqual([]);
  expect(replay.timelines[0]?.days).toHaveLength(2);
  const manifest = JSON.parse(
    await readFile(path.join(replay.dir, "manifest.json"), "utf8"),
  );
  expect(manifest).toMatchObject({
    screenGate: "lean",
    browserCertified: false,
    status: "completed",
    referenceGeneratorVersion: "dense-reference-v7",
  });
  expect(
    manifest.referenceUsage.some(
      (r: { day: number; dense: number; fallback: number }) =>
        r.day === 1 && r.dense + r.fallback > 0,
    ),
  ).toBe(true);
  expect(recorded.timelines[0]?.nights.map((n) => n.outcome)).toEqual(
    replay.timelines[0]?.nights.map((n) => n.outcome),
  );
  expect(
    JSON.parse(
      await readFile(path.join(replay.dir, "days/day-01/P1.json"), "utf8"),
    ).geometry.appSha256,
  ).toMatch(/^lean-layout:/);
  await expect(
    runDays({
      ...common,
      llm: new ScriptedLlm(),
      runId: "recorded",
      resume: true,
      screenMode: "browser",
    }),
  ).rejects.toThrow(/screen gate/);
}, 120000);

it("repairs Lean findings and ships a Program change with an independently stored custom family", async () => {
  const state = required(
    (await fakeLeanStates({ program: canonicalV1, specVersion: "v1" })).find(
      (s) => s.screen === "home",
    ),
  );
  const [shape] = await layoutRunner([
    { op: "family-check", references: [{ screen: state.ui }] },
  ]);
  const nativeShape = required(required(shape?.shapes)[0]);
  const paints = await layoutRunner(
    viewports.map((viewport) => ({
      op: "structural-paint",
      screen: state.ui,
      viewport,
    })),
  );
  const good: LayoutDesign = [
    {
      screen: "home",
      shape: nativeShape,
      layouts: paints.map((_paint, i) => ({
        viewport: required(viewports[i]),
        tree: z
          .json()
          .parse(layoutFor(shapeFor(state.ui), required(viewports[i]))),
      })),
    },
  ];
  const bad: LayoutDesign = [
    {
      ...required(good[0]),
      layouts: [
        { viewport: required(viewports[0]), tree: { type: "Absolute" } },
      ],
    },
  ];
  class LayoutScript extends ScriptedLlm {
    override async complete(req: JsonRequest) {
      const response = await super.complete(req);
      if (!["propose", "repair"].includes(req.purpose)) return response;
      const proposal = llmProposalSchema.parse(response.json);
      for (const candidate of proposal.candidates)
        candidate.patch.push({
          op: "add",
          path: "/layouts",
          from: "",
          valueJson: JSON.stringify(req.purpose === "repair" ? good : bad),
        });
      return { ...response, json: proposal };
    }
  }
  const backend = new LayoutScript(),
    runsRoot = await tmp("lean-repair");
  const run = await runDays({
    screenMode: "lean",
    leanOptions: { states: fakeLeanStates, limits: async () => ({}) },
    days: 2,
    worldDir: await fakeWorld(2),
    runsRoot,
    runId: "custom",
    personas: ["P1"],
    seedPolicy: "none",
    llm: backend,
    ehr: createFakeEhr(),
  });
  const record = await new RunStore(
    run.dir,
    path.join(run.dir, "custom"),
    true,
  ).readDecision(1, "P1");
  expect(
    record.candidates.some(
      (e) =>
        e.check.property === "ScreenCheck" && e.check.message?.includes("G1"),
    ),
  ).toBe(true);
  expect(backend.prompts.find((p) => p.purpose === "repair")?.prompt).toContain(
    "G1",
  );
  expect(record.outcome).toBe("deployed");
  expect(
    designOf(
      await new RunStore(
        run.dir,
        path.join(run.dir, "custom"),
        true,
      ).readProgram("P1", 1),
    ),
  ).toEqual(good);
}, 120000);

it("selects exact event-state boxes without changing the native trace or adding a miss assumption", () => {
  const row = {
    task: "t",
    screen: "s",
    t: 0,
    event: { click: { comp: "same" } },
    ops: ["point" as const, "click" as const],
    result: "ok" as const,
  };
  const day = {
    day: 1,
    persona: "P1",
    programVersion: 0,
    trace: [row, { ...row, t: 1 }],
    tasks: [
      {
        task: "t",
        clicks: 2,
        keystrokes: 0,
        scrolls: 0,
        popups: 0,
        overrides: 0,
        searches: 0,
        backtracks: 0,
        klmDeciSec: 10,
        completed: true,
      },
    ],
    floor: [],
    complaints: [],
  };
  const box = (x: number) => ({
    center: { x, y: 450 },
    reveal: { x, y: 450 },
    chain: [],
    offsets: {},
  });
  const atlas = {
    schemaVersion: 1 as const,
    programHash: "fixture",
    appSha256: "lean-layout:fixture",
    source: "recorded-fixture" as const,
    viewport: { width: 1440 as const, height: 900 as const },
    traceTargets: { "0": "exact0", "1": "exact1" },
    states: [
      {
        screen: "s",
        state: "first",
        viewport: { width: 1440, height: 900 },
        scrollers: {},
        components: { same: box(730), exact0: box(730) },
      },
      {
        screen: "s",
        state: "second",
        viewport: { width: 1440, height: 900 },
        scrollers: {},
        components: { same: box(740), exact1: box(740) },
      },
    ],
  };
  const measured = attachGeometry(day, atlas);
  expect(measured.tasks[0]?.mouseTravelPx).toBe(20);
  expect(measured.trace).toEqual(day.trace);
  expect(measured.complaints).toEqual([]);
});

it("dictionary-encodes every native case losslessly without filtering the design space", async () => {
  const screen = ui();
  const [reply] = await layoutRunner([
    { op: "family-check", references: [{ screen }] },
  ]);
  const shape = required(required(reply?.shapes)[0]);
  const { occurrences } = await import("../src/lean-layout-geometry.js");
  const inventory = {
    currentLayouts: [],
    limits: { s: { limit: 15, source: "default" } },
    screens: Array.from({ length: 20 }, () => ({
      screen: "s",
      shape,
      occurrences: occurrences(screen),
    })),
  };
  const compact = JSON.parse(compactLeanInventory(JSON.stringify(inventory)));
  const rebuilt = compact.cases.map(
    (c: { screen: string; rows: number[] }) => ({
      screen: c.screen,
      shape: c.rows.map((i: number) => {
        const [path, target, region, lines] = compact.rows[i];
        return {
          path: path.split(".").map(Number),
          target: !!target,
          region: compact.regions[region],
          lines,
        };
      }),
      occurrences: c.rows.map((i: number) => {
        const [path, , , , ids] = compact.rows[i];
        return {
          path: path.split(".").map(Number),
          ids: ids.map((n: number) => compact.ids[n]),
        };
      }),
    }),
  );
  expect(rebuilt).toEqual(inventory.screens);
  expect(compact.currentLayouts).toEqual([]);
  expect(compact.limits).toEqual(inventory.limits);
  expect(JSON.stringify(compact).length).toBeLessThan(
    JSON.stringify(inventory).length / 3,
  );
});

it("scopes admission inventories to committed odd-day training workspaces", async () => {
  const { loadWorld } = await import("../src/world.js");
  const { calibrationPartition } = await import("../src/protocol.js");
  const world = await loadWorld(await fakeWorld(2)),
    schedule = await world.schedule(1, "P1");
  if (!schedule) throw Error("Missing schedule");
  const captured: (number | undefined)[] = [];
  const checker = new LeanScreenChecker({
    ...createFakeEhr(),
    async renderScreens(input) {
      captured.push(input.workspace?.schedule.day);
      await mkdir(input.outDir, { recursive: true });
      const file = path.join(input.outDir, "s.json");
      const screen = ui();
      if (input.workspace)
        screen.workspace.unshift({
          button: {
            comp: "workspace.extra",
            label: "Patient lookup",
            role: "secondary",
            enabled: true,
            blockedReason: null,
            hotkey: null,
          },
        });
      await writeFile(file, JSON.stringify(screen));
      return [file];
    },
  });
  const program = withDesign(structuredClone(canonicalV1));
  expect((await checker.check({ program, specVersion: "v1" })).status).toBe(
    "pass",
  );
  checker.setTrainingWorkspace(
    calibrationPartition(schedule, "train"),
    world.dir,
  );
  const inventory = JSON.parse(await checker.promptDesign(program));
  expect(
    inventory.screens[0].occurrences.some((o: { ids: string[] }) =>
      o.ids.includes("workspace.extra"),
    ),
  ).toBe(true);
  expect(captured).toEqual([undefined, 1]);
  expect(() =>
    checker.setTrainingWorkspace({ ...schedule, day: 2 }, world.dir),
  ).toThrow("odd training day");
});

it("keeps admission evidence and clinical clocks in the digest while excluding timing noise and worker order", async () => {
  const { contentDigest } = await import("../src/content-digest.js");
  const directory = await tmp("lean-telemetry");
  await mkdir(path.join(directory, "reports/lean-screens"), {
    recursive: true,
  });
  const phases = [
    { persona: "P1", day: 1, night: null, elapsedMs: 10 },
    { persona: "P3", day: 1, night: null, elapsedMs: 20 },
  ];
  const admissions = [
    { programHash: "one", status: "fail", message: "G10", elapsedMs: 30 },
    { programHash: "two", status: "pass", message: "accepted", elapsedMs: 40 },
  ];
  const save = async (file: string, rows: unknown[]) =>
    writeFile(
      path.join(directory, file),
      rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    );
  await save("lean-timings.jsonl", phases);
  await save("reports/lean-screens/admissions.jsonl", admissions);
  await writeFile(path.join(directory, "clinical.json"), '{"elapsedMs":10}');
  const before = await contentDigest(directory);
  await save(
    "lean-timings.jsonl",
    [...phases].reverse().map((row) => ({ ...row, elapsedMs: 999 })),
  );
  await save(
    "reports/lean-screens/admissions.jsonl",
    [...admissions].reverse().map((row) => ({ ...row, elapsedMs: 999 })),
  );
  expect((await contentDigest(directory)).contentDigest).toBe(
    before.contentDigest,
  );
  await save(
    "reports/lean-screens/admissions.jsonl",
    admissions.map((row) => ({ ...row, status: "pass" })),
  );
  expect((await contentDigest(directory)).contentDigest).not.toBe(
    before.contentDigest,
  );
  await save("reports/lean-screens/admissions.jsonl", admissions);
  await writeFile(path.join(directory, "clinical.json"), '{"elapsedMs":11}');
  expect((await contentDigest(directory)).contentDigest).not.toBe(
    before.contentDigest,
  );
});

it("caches dense admission across a thousand value states and repeated geometry requests", async () => {
  let families = 0;
  const runner: typeof layoutRunner = async (requests) => {
    families += requests.filter(
      (r) => r && typeof r === "object" && "op" in r && r.op === "family-check",
    ).length;
    return layoutRunner(requests);
  };
  const checker = new LeanScreenChecker(createFakeEhr(), {
    runner,
    limits,
    states: async () =>
      Array.from({ length: 1000 }, (_, i) => ({
        screen: "s",
        state: `value-${i}`,
        ui: { ...ui(), title: `Synthetic ${i}` },
      })),
  });
  const program = withDesign(structuredClone(canonicalV1));
  const checked = await checker.check({ program, specVersion: "v1" });
  expect(checked.status, checked.message).toBe("pass");
  expect(
    (await checker.geometry({ program, specVersion: "v1" }))?.states,
  ).toHaveLength(1000);
  expect(families).toBe(1);
  expect(checker.referenceStats.admissions).toBe(1);
});

it("uses dense reference for a shape absent from a partially customized screen", async () => {
  const first = ui(),
    second = ui();
  second.workspace.push({
    ...required(first.workspace[0]),
    button: { ...required(first.workspace[0]).button, comp: "extra" },
  });
  const [native] = await layoutRunner([
    { op: "family-check", references: [{ screen: first }] },
  ]);
  const shape = required(required(native?.shapes)[0]);
  const program = withDesign(structuredClone(canonicalV1), [
    { screen: "s", shape, layouts: freeLayouts(shape) },
  ]);
  const checker = new LeanScreenChecker(createFakeEhr(), {
    states: async () => [
      { ui: first, screen: "s", state: "custom" },
      { ui: second, screen: "s", state: "dense" },
    ],
    limits: async () => ({}),
  });
  const result = await checker.check({ program, specVersion: "v1" });
  expect(result.status, result.message).toBe("pass");
  const atlas = await checker.geometry({ program, specVersion: "v1" });
  expect(atlas?.states.map((s) => s.components["sign"]?.center.y)).toEqual([
    858, 872,
  ]);
});
