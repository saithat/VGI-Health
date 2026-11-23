import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { it, expect, vi } from "vitest";
import type { TrainDay } from "../src/observe.js";
import { RunStore } from "../src/store.js";
import { CLIMB_PROMPT, climbReadme, climbWorkspace, climbingGate, ClimbHost } from "../src/hillclimb.js";
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
  const days: TrainDay[] = [];
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
  expect(climbWorkspace(input, days, versions, "first")).toEqual(files);
  const climb = climbWorkspace(input, days, versions, "climb");
  expect(climb["README.md"]).toBe(climbReadme(params.id, current.role, "climb"));
  expect(climb["README.md"]).toContain("A passing measure is a step, not the finish.");
  expect({...climb, "README.md":files["README.md"]}).toEqual(files);
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

it.each([4, 5])("scores %i actions without charging or limiting rearrangements", async saved => {
  const inner = createFakeEhr(), release = await loadRelease("v1", inner);
  const params = FAKE_PERSONAS[0];
  if (!params) throw Error("Missing P1");
  const current = {...release.canonical, id:params.id, owner:params.id};
  release.spec.design.stabilityBudget = 0;
  const simulate = async (input:Parameters<typeof inner.simulate>[0]) => {
    const day = await inner.simulate(input);
    return {...day,tasks:day.tasks.map((t,i)=>({...t,completed:true,
      clicks:20-(input.program.version===1 && i===0?saved:0)}))};
  };
  const schedule = fakeSchedule(1,params.id,7);
  const days = [{schedule,result:await simulate({program:current,specVersion:"v1",worldDir:"",persona:params,schedule,seed:1})}];
  const ops = current.screens.flatMap((screen,i)=>screen.components.flatMap((c,j)=>c.parent?[]:[{
    op:"replace" as const,path:`/screens/${i}/components/${j}/tab`,value:c.tab+1,
  }]));
  const result = await climbingGate({ehr:{...inner,simulate},store:new RunStore(await tmp("gross-saving")),
    worldDir:"",worldSeed:7,screens:{mode:"lean",check:async()=>({mode:"lean",status:"pass",pages:1,
      bundles:[],failingFiles:[],failingScreens:[],message:""})}},
    {night:1,current,release,persona:{id:params.id,userId:params.id,params}},days,
    {actor:params.id,entries:[]},Infinity).measure(ops);
  expect(result, JSON.stringify(result)).toMatchObject({ships:saved===5,net:saved});
  expect(result).not.toHaveProperty("movement");
});

it("keeps serial verdict bytes, reuses partial measurements, and stops at either failed gate", async () => {
  const inner = createFakeEhr(),
    release = await loadRelease("v1", inner);
  const params = FAKE_PERSONAS[0];
  if (!params) throw Error("Missing P1");
  const current = { ...release.canonical, id: params.id, owner: params.id };
  const input = {
    night: 3,
    current,
    release,
    persona: { id: params.id, userId: params.id, params },
  };
  const days: TrainDay[] = [];
  for (const day of [1, 2, 3]) {
    const schedule = fakeSchedule(day, params.id, 7);
    days.push({
      schedule,
      result: await inner.simulate({
        program: current,
        specVersion: "v1",
        worldDir: "",
        persona: params,
        schedule,
        seed: day,
      }),
    });
  }
  let active = 0,
    peak = 0;
  const simulate = vi.fn(async (i: Parameters<typeof inner.simulate>[0]) => {
    peak = Math.max(peak, ++active);
    try {
      await new Promise((resolve) =>
        setTimeout(resolve, i.policy === "bounded" ? 1 : 4),
      );
      return await inner.simulate(i);
    } finally {
      active--;
    }
  });
  const check = vi.fn(inner.check);
  const screen = {
    mode: "lean",
    status: "pass",
    pages: 1,
    bundles: [],
    failingFiles: [],
    failingScreens: [],
    message: "",
  } as const;
  const checkScreen = vi.fn(async () => ({
    ...screen,
    bundles: [],
    failingFiles: [],
    failingScreens: [],
  }));
  const deps = {
    ehr: { ...inner, simulate, check },
    store: new RunStore(await tmp("measure")),
    worldDir: "",
    worldSeed: 7,
    screens: { mode: "lean" as const, check: checkScreen },
  };
  const gate = (workers: number) =>
    climbingGate(
      deps,
      input,
      days,
      { actor: params.id, entries: [] },
      Infinity,
      workers,
    );
  const serial = await gate(1).measure([]);
  expect(serial.replay?.days).toEqual([1, 2, 3]);
  expect(peak).toBe(1);
  const parallel = gate(4);
  const host = new ClimbHost(parallel.measure, Infinity, async () => {});
  const partial = {
    ...request("measure", []),
    argv: ["--days", "3,1", "p.json"],
  };
  const estimate = await host.execute(partial);
  expect(estimate.output).toMatchObject({
    estimate: true,
    days: [1, 3],
    replay: { days: [1, 3] },
  });
  expect(estimate.output).not.toHaveProperty("ships");
  expect((await host.execute({ ...partial, command: "done" })).exit).toBe(1);
  expect(
    (await host.execute({ ...partial, argv: ["--days", "4", "p.json"] })).exit,
  ).toBe(1);
  const measured = await parallel.measure([]);
  expect(JSON.stringify(measured)).toBe(JSON.stringify(serial));
  expect(peak).toBe(2);
  const calls = simulate.mock.calls.length,
    checks = check.mock.calls.length;
  // Different patch encoding, same resulting candidate.
  expect(
    await parallel.measure([
      { op: "replace", path: "/start", value: current.start },
    ]),
  ).toEqual(measured);
  expect(simulate).toHaveBeenCalledTimes(calls);
  expect(check).toHaveBeenCalledTimes(checks);
  const screenCalls = checkScreen.mock.calls.length;
  const refused = gate(4);
  check.mockResolvedValueOnce({
    violation: {
      property: "test",
      message: "refused",
      counterexample: [],
      screens: [],
    },
  });
  expect((await refused.measure([])).ships).toBe(false);
  expect(checkScreen).toHaveBeenCalledTimes(screenCalls);
  const failScreen = {
    ...deps,
    screens: {
      mode: "lean" as const,
      check: async () => ({
        ...screen,
        status: "fail" as const,
        bundles: [],
        failingFiles: [],
        failingScreens: [],
      }),
    },
  };
  const rejected = await climbingGate(
    failScreen,
    input,
    days,
    { actor: params.id, entries: [] },
    Infinity,
  ).measure([]);
  expect(rejected.check.property).toBe("ScreenCheck");
  expect(simulate).toHaveBeenCalledTimes(calls);
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
      expect(measured.output).toMatchObject({best:{isBest:true,net:6,patch:"best.json"}});
      expect(accepted.output).toEqual(expect.objectContaining({ships:true,net:6}));
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
  const legacyDir = path.join(result.dir,"hillclimb/night-01/P1");
  const legacySession = await read(path.join(legacyDir,"session.json"));
  delete legacySession.replyVersion;
  delete legacySession.search;
  delete legacySession.completion;
  await writeFile(path.join(legacyDir,"session.json"),JSON.stringify(legacySession));
  for (let index=1; index<=legacySession.commands; index++) {
    const file = path.join(legacyDir,"commands",index+".json"), entry = await read(file);
    delete entry.reply.output.best;
    await writeFile(file,JSON.stringify(entry));
  }
  const legacyManifest = await read(path.join(result.dir,"manifest.json"));
  delete legacyManifest.hillclimb.search;
  await writeFile(path.join(result.dir,"manifest.json"),JSON.stringify(legacyManifest));
  const legacyReplay = await runDays({days:2,worldDir:(await read(path.join(result.dir,"manifest.json"))).world,
    runsRoot:await tmp("climb-legacy"),runId:"legacy",screenMode:"lean",leanOptions,
    releaseDays:{v2:20,v3:30},personas:["P1"],llm:new ReplayLlm(result.dir),ehr});
  expect(legacyReplay.timelines[0]?.nights[0]?.outcome).toBe("deployed");
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
      const work = args[args.indexOf("/work") - 1];
      if (!work) throw Error("Missing workspace");
      expect(await readFile(path.join(work,"README.md"),"utf8")).toBe(climbReadme("P1","physician","climb"));
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
      { "program.json": "{}", "README.md":climbReadme("P1","physician","climb") },
      dir,
      {
        search: "climb",
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


it("documents gross savings for both searches and preserves the launch prompt", () => {
  const first = climbReadme("P1", "physician");
  expect(climbReadme("P1", "physician", "first")).toBe(first);
  expect(first).toContain("Savings must reach five actions per day.");
  expect(first).not.toContain("movement");
  expect(climbReadme("P1", "physician", "climb")).not.toContain("movement");
  expect(Buffer.byteLength(CLIMB_PROMPT)).toBe(60);
});

// The fake clinician saves six actions for each of two independent edits.
function stackingEhr() {
  const inner = createFakeEhr();
  return {...inner, simulate:async (input:Parameters<typeof inner.simulate>[0]) => {
    const day = await inner.simulate(input);
    const steps = Number(input.program.screens[0]?.title === "Fixture improvement") +
      Number(input.program.screens[1]?.title === "Second improvement");
    return {...day, tasks:day.tasks.map((t,i)=>({...t,completed:true,clicks:20-(i===0?steps*6:0)}))};
  }};
}
const combined = [...patch, {op:"replace",path:"/screens/1/title",value:"Second improvement"}];

it.each(["done-best", "done-first", "done-keep", "backstop-best", "backstop-first", "backstop-empty", "backstop-estimate", "backstop-interrupted"] as const)(
  "stacks passing patches and handles %s without changing the gate", async ending => {
    let expireOnReplay = false, deadline = 0;
    const inner = stackingEhr();
    const ehr = {...inner, simulate:async (input:Parameters<typeof inner.simulate>[0]) => {
      if (expireOnReplay && input.program.screens[0]?.title === "Late improvement")
        vi.spyOn(Date,"now").mockReturnValue(deadline+1);
      return inner.simulate(input);
    }};
    const fixture = async (host:ClimbHost) => {
      const estimated = ending === "backstop-estimate";
      if (ending !== "backstop-empty") {
        const first = request("measure", patch);
        if (estimated) first.argv = ["--days", "1", "p.json"];
        expect(await host.execute(first)).toMatchObject(estimated
          ? {output:{estimate:true,net:6}} : {output:{ships:true,net:6,best:{isBest:true,net:6,patch:"best.json"}}});
        if (!estimated) {
          expect(await host.execute(request("measure", combined))).toMatchObject({
            output:{ships:true,net:12,best:{isBest:true,net:12,patch:"best.json"}}});
          expect(await host.execute(request("measure", patch))).toMatchObject({
            output:{ships:true,net:6,best:{isBest:false,net:12,patch:"best.json"}}});
          expect(await host.execute(request("measure", []))).toMatchObject({output:{ships:false,best:{isBest:false,net:12}}});
          expect(host.best?.patch).toEqual(combined);
        }
      }
      if (ending.startsWith("done-")) {
        if (ending === "done-keep") expect(await host.execute(retain)).toMatchObject({exit:0,output:{done:true}});
        else {
          const shipping = ending === "done-best" ? combined : patch;
          expect(await host.execute(request("done",shipping,"Chosen combined patch"))).toMatchObject({exit:0,output:{ships:true}});
        }
      } else if (ending === "backstop-interrupted") {
        expireOnReplay = true;
        deadline = host.deadline;
        expect(await host.execute(request("measure",[{op:"replace",path:"/screens/0/title",value:"Late improvement"}]))).
          toMatchObject({exit:1,output:{reason:"Wall-clock backstop"}});
      } else {
        // Simulate the guard without waiting for a two-hour session.
        vi.spyOn(Date,"now").mockReturnValue(host.deadline+1);
        expect(await host.execute(retain)).toMatchObject({exit:1});
      }
    };
    const worldDir = await fakeWorld(2), runsRoot = await tmp("climb-stack");
    const common = {days:2,worldDir,runsRoot,runId:"stack",nightMode:"hillclimb" as const,
      screenMode:"lean" as const,leanOptions,personas:["P1"],llm:new ScriptedLlm(),ehr};
    let result;
    try {
      result = await runDays({...common,hillclimb:{fixture,search:ending==="backstop-first"?"first":"climb"}});
    } finally { vi.spyOn(Date,"now").mockRestore(); }
    const best = !["backstop-empty","backstop-estimate"].includes(ending);
    const shipped = !["done-keep","backstop-first","backstop-empty","backstop-estimate"].includes(ending);
    const session = await read(path.join(result.dir,"hillclimb/night-01/P1/session.json"));
    expect(session).toMatchObject({search:ending==="backstop-first"?"first":"climb",passingMeasures:best?3:0,
      bestNet:best?12:null,outcome:shipped?"deployed":ending==="done-keep"?"no-change":"backstop",
      completion:ending.startsWith("done-")?"done":shipped?"backstop-best":"backstop-current"});
    const report = JSON.parse(execFileSync(process.execPath,[path.join(REPO_ROOT,"scripts/report-agent-benefit.mjs"),result.dir,"--json"],{encoding:"utf8"}));
    expect(report.nights.climbs).toMatchObject([{persona:"P1",night:1,passingMeasures:best?3:0,bestNet:best?12:null}]);
    const decision = result.timelines[0]?.nights[0];
    expect(decision).toMatchObject({versionAfter:shipped?1:0,hillclimb:{passingMeasures:best?3:0,bestNet:best?12:null}});
    expect(result.hillclimb).toMatchObject({backstops:ending.startsWith("backstop-")?1:0,passingMeasures:best?3:0,
      results:[{persona:"P1",night:1,passingMeasures:best?3:0,bestNet:best?12:null}]});
    const store = new RunStore(result.dir);
    const program = await store.readProgram("P1",shipped?1:0);
    expect(program.screens[1]?.title === "Second improvement").toBe(shipped && ending!=="done-first");
    if (best) expect(await read(path.join(result.dir,"hillclimb/night-01/P1/best.json"))).toEqual(combined);
    // Replaying an expired session uses its measured commands, not the new wall clock.
    const replay = await runDays({...common,runId:"copy",hillclimb:{},llm:new ReplayLlm(result.dir)});
    expect(replay.timelines[0]?.nights[0]).toEqual(decision);
    await expect(runDays({...common,runId:"mismatch",hillclimb:{search:ending==="backstop-first"?"climb":"first"},
      llm:new ReplayLlm(result.dir)})).rejects.toThrow("Replay hillclimb configuration must match");
  },60000);
