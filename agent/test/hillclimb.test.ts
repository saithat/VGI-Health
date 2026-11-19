import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { it, expect, vi } from "vitest";
import { climbWorkspace, ClimbHost } from "../src/hillclimb.js";
import { runClimbingSession } from "../src/harness/climb-session.js";
import * as sandbox from "../src/harness/sandbox.js";
import * as agents from "../src/harness/agents.js";
import { finalEval } from "../src/final-eval.js";
import { fakeSchedule, FAKE_PERSONAS } from "../src/fake/world.js";
import { createFakeEhr } from "../src/fake/ehr-fake.js";
import * as releases from "../src/releases.js";
import { loadRelease } from "../src/releases.js";
import { runDays } from "../src/run.js";
import { ReplayLlm } from "../src/backends/replay.js";
import { ScriptedLlm } from "./scripted.js";
import { fakeLeanStates } from "./lean-fixture.js";
import { fakeWorld, tmp } from "./helpers.js";
import { HILLCLIMB } from "../src/protocol.js";
import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "../src/util.js";

const patch = [
  { op: "replace", path: "/screens/0/title", value: "Fixture improvement" },
];
const request = (command: string, ops: unknown, summary?: string) => ({
  command,
  argv: ["p.json", ...(summary ? [summary] : [])],
  file: { name: "p.json", text: JSON.stringify(ops) },
});
const retain = {
  command: "done",
  argv: ["--no-change", "Keep the current layout"],
  file: null,
};
const leanOptions = { states: fakeLeanStates, limits: async () => ({}) };
const read = async (file: string) => JSON.parse(await readFile(file, "utf8"));

it("exports only own observed days on their actual versions", async () => {
  const ehr = createFakeEhr(),
    release = await loadRelease("v1", ehr),
    params = FAKE_PERSONAS[0];
  if (!params) throw Error("Missing fixture clinician");
  const persona = { id: params.id, userId: "actor", params };
  const versions = new Map(
    [0, 1, 2].map((v) => [
      v,
      { ...release.canonical, owner: "actor", version: v },
    ]),
  );
  const current = versions.get(1);
  if (!current) throw Error("No current version");
  const input = {
    night: 2,
    current,
    release: {
      ...release,
      notes: "SECRET-REPO",
      leanSpecSource: "/SECRET-PATH",
    },
    persona,
    declaredWorkload: [...fakeSchedule(3, "P2", 7).tasks],
    other: "SECRET-OTHER",
    noAgent: "SECRET-CONTROL",
    worldDir: "/SECRET-WORLD",
  };
  const days = [];
  for (const day of [1, 2]) {
    const schedule = fakeSchedule(day, "P1", 7),
      program = versions.get(day - 1);
    if (!program) throw Error("Missing historical program");
    const result = await ehr.simulate({
      program,
      specVersion: "v1",
      worldDir: "/SECRET-WORLD",
      persona: params,
      schedule,
      seed: 7000 + day,
    });
    days.push({ result, schedule });
  }
  const files = climbWorkspace(input, days, versions);
  expect(JSON.stringify(files)).not.toMatch(/SECRET|d03-P2/);
  expect(Object.keys(files).filter((k) => k.startsWith("days/"))).toEqual([
    "days/1.json",
    "days/2.json",
  ]);
  expect(files["versions/2.json"]).toBeUndefined();
  expect(Buffer.byteLength(files["README.md"] ?? "")).toBeLessThan(3000);
  for (const { result } of days)
    expect(JSON.parse(files[`days/${result.day}.json`] ?? "")).toMatchObject({
      trace: result.trace,
      version: result.programVersion,
    });
  const first = days[0];
  if (!first) throw Error("Missing day one");
  expect(() =>
    climbWorkspace(
      input,
      [first, { ...first, schedule: fakeSchedule(2, "P2", 7) }],
      versions,
    ),
  ).toThrow(/Foreign/);
  expect(() => climbWorkspace(input, [first], versions)).toThrow(
    /Missing observed day/,
  );
});

// Only the fixture simulator assigns a known six-click saving to this edit.
// The production measurement, completion, deployment, recording and report paths run unchanged.
it("measures all nine past days, refuses and accepts done, carries memory, and evaluates every version", async () => {
  const inner = createFakeEhr();
  const ehr = {
    ...inner,
    simulate: async (input: Parameters<typeof inner.simulate>[0]) => {
      const day = await inner.simulate(input);
      const improvement =
        input.program.screens[0]?.title === "Fixture improvement";
      const boundedRegression =
        input.program.screens[0]?.title === "Slow learner";
      const memory =
        input.policy === "bounded" && input.memory
          ? {
              actor: input.memory.actor,
              entries: [
                ...input.memory.entries,
                {
                  key: "observed-" + input.schedule.day,
                  intent: "visit",
                  control: "home",
                  place: { screen: "home", parent: "", position: 0, tab: 0 },
                  route: [],
                  exposures: 1,
                  lastDay: input.schedule.day,
                },
              ],
            }
          : undefined;
      if (
        night === 9 &&
        input.policy === "bounded" &&
        input.program.version === 2
      ) {
        expect(input.memory?.entries.map((e) => e.lastDay)).toEqual([
          1, 2, 3, 4, 5, 6, 7, 8, 9,
        ]);
      }
      return {
        ...day,
        ...(memory ? { memory } : {}),
        tasks: day.tasks.map((t, i) => ({
          ...t,
          completed: true,
          clicks:
            20 +
            (i !== 0
              ? 0
              : improvement
                ? -6
                : boundedRegression
                  ? input.policy === "bounded"
                    ? 1
                    : -6
                  : 0),
        })),
      };
    },
  };
  let night = 0;
  const fixture = async (host: ClimbHost) => {
    night++;
    if (night === 1) {
      const m = await host.execute(request("measure", []));
      const refused = await host.execute(request("done", [], "Identity patch"));
      expect(refused.exit).toBe(1);
      expect(refused.output).toEqual(m.output);
      expect(host.final).toBeNull();
      const boundedRefusal = await host.execute(
        request(
          "done",
          [{ op: "replace", path: "/screens/0/title", value: "Slow learner" }],
          "Expert improves",
        ),
      );
      expect(boundedRefusal).toMatchObject({
        exit: 1,
        output: {
          ships: false,
          net: 6,
          reason: expect.stringContaining("bounded clicks"),
        },
      });
      const measured = await host.execute(request("measure", patch));
      const accepted = await host.execute(
        request("done", patch, "Reduced effort for this clinician."),
      );
      expect(accepted.exit).toBe(0);
      expect(accepted.output).toEqual(measured.output);
      expect(accepted.output).toMatchObject({
        ships: true,
        net: 6,
        replay: { days: [1], bounded: { memorySource: "all-past" } },
      });
      return;
    }
    if (night === 9) {
      const m = await host.execute(request("measure", []));
      expect(m.output).toMatchObject({
        ships: false,
        replay: { days: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      });
    }
    expect(await host.execute(retain)).toMatchObject({ exit: 0 });
  };
  const result = await runDays({
    days: 10,
    worldDir: await fakeWorld(10),
    runsRoot: await tmp("climb"),
    runId: "fixture",
    nightMode: "hillclimb",
    screenMode: "lean",
    leanOptions,
    hillclimb: { fixture },
    releaseDays: { v2: 20, v3: 30 },
    personas: ["P1"],
    llm: new ScriptedLlm(),
    ehr,
  });
  expect(
    (await read(path.join(result.dir, "manifest.json"))).measurementProtocol
      .name,
  ).toBe(HILLCLIMB);
  expect(result.timelines[0]?.nights.map((n) => n.outcome)).toEqual([
    "deployed",
    ...Array(8).fill("no-change"),
  ]);
  const command = (n: number, index: number) =>
    read(
      path.join(
        result.dir,
        "hillclimb",
        `night-${String(n).padStart(2, "0")}`,
        "P1/commands",
        index + ".json",
      ),
    );
  console.log(
    `Fixture first measure elapsed ms: day 1 ${(await command(1, 1)).elapsedMs}, day 9 ${(await command(9, 1)).elapsedMs}`,
  );
  await finalEval(result.dir, { ehr, lean: leanOptions });
  const replay = await runDays({
    days: 2,
    worldDir: (await read(path.join(result.dir, "manifest.json"))).world,
    runsRoot: await tmp("climb-replay"),
    runId: "replay",
    nightMode: "hillclimb",
    screenMode: "lean",
    leanOptions,
    releaseDays: { v2: 20, v3: 30 },
    personas: ["P1"],
    llm: new ReplayLlm(result.dir),
    ehr,
  });
  expect(replay.timelines[0]?.nights[0]?.outcome).toBe("deployed");
  const report = await read(path.join(result.dir, "final-eval/P1.json"));
  expect(report.versions.map((r: { version: number }) => r.version)).toEqual([
    0, 1,
  ]);
  expect(report.versions[0].seen.days).toEqual([]);
  expect(report.versions[1].seen.days).toEqual([1]);
  expect(report.versions[1].subsequent.days).toEqual([
    2, 3, 4, 5, 6, 7, 8, 9, 10,
  ]);
  expect(report.versions[1].all.delta.clicks).toBe(-60);
  expect(report.versions[1].all.delta.completed).toBe(0);
  expect(
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(REPO_ROOT, "scripts/report-agent-benefit.mjs"),
          result.dir,
          "--json",
        ],
        { encoding: "utf8" },
      ),
    ).days,
  ).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
}, 180000);

it("keeps v0 and records backstop when the wall clock expires", async () => {
  const result = await runDays({
    days: 2,
    worldDir: await fakeWorld(2),
    runsRoot: await tmp("climb-guard"),
    runId: "guard",
    nightMode: "hillclimb",
    screenMode: "lean",
    leanOptions,
    hillclimb: {
      wallMs: 5,
      fixture: async (host) => {
        await new Promise((r) => setTimeout(r, 10));
        expect((await host.execute(retain)).exit).toBe(1);
      },
    },
    personas: ["P1"],
    llm: new ScriptedLlm(),
    ehr: createFakeEhr(),
  });
  expect(result.timelines[0]?.nights[0]).toMatchObject({
    outcome: "backstop",
    versionAfter: 0,
  });
  expect(
    await read(path.join(result.dir, "hillclimb/night-01/P1/session.json")),
  ).toMatchObject({ outcome: "backstop", measures: 0 });
});

it("uses the vendor at the evaluated version's release on past and subsequent days", async () => {
  const inner = createFakeEhr();
  const ehr = {
    ...inner,
    simulate: async (input: Parameters<typeof inner.simulate>[0]) => {
      const result = await inner.simulate(input);
      return {
        ...result,
        tasks: result.tasks.map((t) => ({
          ...t,
          completed: true,
          clicks: input.program.specVersion === "v1" ? 10 : 20,
        })),
      };
    },
  };
  // This reporting fixture needs two spec versions with native-layout-compatible widgets.
  const original = releases.loadRelease;
  const releaseFixture = vi
    .spyOn(releases, "loadRelease")
    .mockImplementation(async (...args) => {
      const release = await original(...args);
      if (release.id === "v2")
        for (const screen of release.canonical.screens)
          screen.components = screen.components.filter(
            (c) => c.id !== "w1-priorauth",
          );
      return release;
    });
  try {
    const result = await runDays({
      days: 3,
      worldDir: await fakeWorld(3),
      runsRoot: await tmp("climb-spec"),
      runId: "release",
      nightMode: "hillclimb",
      screenMode: "lean",
      leanOptions,
      hillclimb: {
        fixture: async (host) => {
          await host.execute(retain);
        },
      },
      releaseDays: { v2: 3, v3: 9 },
      personas: ["P1"],
      llm: new ScriptedLlm(),
      ehr,
    });
    await finalEval(result.dir, { ehr, lean: leanOptions });
    const report = await read(path.join(result.dir, "final-eval/P1.json"));
    expect(report.versions).toHaveLength(2);
    const [initial, release] = report.versions;
    expect(initial.all.vendor.clicks).toBe(initial.all.vendor.tasks * 10);
    expect(release.all.vendor.clicks).toBe(release.all.vendor.tasks * 20);
    expect(release.all.delta.clicks).toBe(0);
    expect(release.seen.days).toEqual([1, 2]);
    expect(release.subsequent.days).toEqual([3]);
  } finally {
    releaseFixture.mockRestore();
  }
}, 60000);

it("seals done while letting Codex emit its final turn usage", async () => {
  const dir = await tmp("climb-usage");
  const host = new ClimbHost(
    async () => {
      throw Error("Unexpected measure");
    },
    Date.now() + 20000,
    async () => {},
  );
  const launch = vi.spyOn(agents, "prepareLaunch").mockResolvedValue({
    command: "/bin/true",
    args: [],
    env: {},
    readOnly: [],
    hosts: [],
  });
  const process = vi
    .spyOn(sandbox, "runSandboxed")
    .mockImplementation(async (args, _input, _wall, _limit, stop) => {
      const spool = args[args.indexOf("/spool") - 1];
      if (!spool) throw Error("Missing private spool");
      await writeFile(
        path.join(spool, "usage.req.json"),
        JSON.stringify(retain),
      );
      await vi.waitFor(() => expect(host.final).toBeTruthy());
      expect((await host.execute(retain)).exit).toBe(1);
      // Codex reports usage only after the final model response.
      await new Promise((resolve) => setTimeout(resolve, 3200));
      expect(stop?.aborted).toBe(false);
      return {
        stdout: JSON.stringify({
          type: "turn.completed",
          usage: {
            input_tokens: 101,
            output_tokens: 11,
            cached_input_tokens: 50,
          },
        }),
        stderr: "",
        code: 0,
        signal: null,
        timedOut: false,
        stdoutTruncated: false,
      };
    });
  try {
    const usage = await runClimbingSession(
      host,
      { "program.json": "{}" },
      dir,
      {
        wallMs: 20000,
        model: "fixture",
        reasoningEffort: "high",
        serviceTier: "default",
      },
    );
    expect(usage).toMatchObject([{ input: 101, output: 11, cachedInput: 50 }]);
  } finally {
    process.mockRestore();
    launch.mockRestore();
  }
}, 20000);
