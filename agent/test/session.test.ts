import { describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFakeEhr } from "../src/fake/ehr-fake.js";
import { fakeCanonical } from "../src/fake/fixtures.js";
import { fakeSchedule, FAKE_PERSONAS } from "../src/fake/world.js";
import { programHash } from "../src/program.js";
import {
  answerSession,
  chosenSessionBundle,
  flagFriction,
  layoutChanges,
  prepareSession,
  recordSession,
  sessionGeneratorInput,
  traceFriction,
  type ArchivedSessionBundle,
} from "../src/session.js";
import { seededSessionChooser } from "../src/session-simulator.js";
import {
  frictionFlagSchema,
  sessionSchema,
  type FrictionFlag,
} from "../src/session-schema.js";
import type { EhrClient } from "../src/ehr.js";

async function setup() {
  const ehr = createFakeEhr(),
    current = fakeCanonical("v1");
  const persona = FAKE_PERSONAS[0];
  if (!persona) throw new Error("Missing persona");
  const candidates: ArchivedSessionBundle[] = [];
  for (let i = 0; i < 4; i++) {
    const program = structuredClone(current);
    program.version = i + 1;
    const screen = program.screens[i];
    if (!screen) throw new Error("Missing screen");
    screen.components.reverse();
    const deployed = await ehr.deploy({
      specVersion: "v1",
      program,
      prev: current,
      canonical: current,
      outDir: "",
    });
    if (!deployed.deployed) throw new Error(JSON.stringify(deployed.verdict));
    candidates.push({
      id: `option-${i}`,
      label: `Layout ${i + 1}`,
      program,
      certificate: deployed.certificate,
    });
  }
  const input = {
    id: "weekly-1",
    createdAt: "2026-11-03T12:00:00Z",
    phase: "offShift" as const,
    cadence: "weekly" as const,
    asOfDay: 3,
    current,
    canonical: current,
    persona,
    recentDays: [
      fakeSchedule(2, persona.id, 7),
      fakeSchedule(3, persona.id, 7),
    ],
    worldDir: "",
    seed: 7,
    archive: { candidates: async () => candidates },
    ehr,
  };
  return { input, candidates, ehr, current };
}
const flagFor = (clinician: string, hash: string): FrictionFlag => ({
  kind: "friction",
  id: "flag-1",
  clinician,
  programHash: hash,
  day: 2,
  task: "case-1",
  t: 30,
  screen: "orders",
  component: "dose",
  signal: { kind: "wish", text: "Keep my familiar dose location." },
});

describe("simulator-only tailoring", () => {
  it("replays exactly the same recent days/seeds and picks diverse whole certified bundles deterministically", async () => {
    const { input } = await setup();
    const simulate = vi.spyOn(input.ehr, "simulate");
    const session = await prepareSession(input);
    expect(session.options).toHaveLength(3);
    expect(session.simulatorOnly).toBe(true);
    expect(session.choice).toBeNull();
    expect(simulate).toHaveBeenCalledTimes(8);
    for (let i = 0; i < 8; i += 2)
      expect(
        simulate.mock.calls
          .slice(i, i + 2)
          .map((c) => [c[0].schedule.day, c[0].seed]),
      ).toEqual([
        [2, 9],
        [3, 10],
      ]);
    expect(session.options.map((o) => o.id)).toEqual(
      (await prepareSession(input)).options.map((o) => o.id),
    );
    expect(
      session.options.every((o) => o.evidence.relearning.estimatedMinutes > 0),
    ).toBe(true);
    expect(input.current.version).toBe(0);
  });
  it("excludes stale certificates, wrong clinicians, duplicate layouts, failed checks and incomplete replays", async () => {
    const { input, candidates, ehr } = await setup();
    const first = candidates[0];
    if (!first) throw new Error("Missing option");
    const duplicate = structuredClone(first);
    duplicate.id = "duplicate";
    duplicate.program.version = 99;
    duplicate.certificate.programHash = programHash(duplicate.program);
    const stale = structuredClone(first);
    stale.id = "stale";
    stale.certificate.programHash = "wrong";
    const alien = structuredClone(first);
    alien.id = "alien";
    alien.program.owner = "other";
    const checker = vi.spyOn(ehr, "check");
    const simulator = ehr.simulate;
    input.ehr = {
      ...ehr,
      simulate: async (i) => {
        const d = await simulator(i);
        if (i.program.version === 4 && d.tasks[0]) d.tasks[0].completed = false;
        return d;
      },
    };
    input.archive = {
      candidates: async () => [...candidates, duplicate, stale, alien],
    };
    const s = await prepareSession(input);
    expect(s.options).toHaveLength(3);
    expect(
      s.options.some(
        (o) => o.id === "stale" || o.id === "alien" || o.program.version === 4,
      ),
    ).toBe(false);
    expect(checker).toHaveBeenCalledTimes(5);
    input.ehr.check = async () => ({
      violation: {
        property: "budget",
        message: "moved too much",
        screens: [],
        counterexample: [],
      },
    });
    await expect(prepareSession(input)).rejects.toThrow("at least two");
  });
  it("rejects future/foreign cases, invalid phase, and incomplete current baseline", async () => {
    const { input } = await setup();
    await expect(prepareSession({ ...input, asOfDay: 1 })).rejects.toThrow(
      "future",
    );
    await expect(
      prepareSession({ ...input, recentDays: [fakeSchedule(2, "P2", 1)] }),
    ).rejects.toThrow("clinician");
    Reflect.set(input, "phase", "duringShift");
    await expect(prepareSession(input)).rejects.toThrow("off shift");
    Reflect.set(input, "phase", "offShift");
    const nestedFuture = structuredClone(input.recentDays);
    const nestedTask = nestedFuture[0]?.tasks[0];
    if (nestedTask) nestedTask.day = 99;
    await expect(
      prepareSession({ ...input, recentDays: nestedFuture }),
    ).rejects.toThrow("future");
    const simulate = input.ehr.simulate;
    input.ehr.simulate = async (i) => ({ ...(await simulate(i)), tasks: [] });
    await expect(prepareSession(input)).rejects.toThrow("Incomplete");
  });
  it("records old→new order, parent and tab as well as additions/removals", async () => {
    const { current } = await setup();
    const next = structuredClone(current);
    const a = next.screens[0]?.components[1];
    if (!a) throw new Error("Missing component");
    a.tab = 2;
    expect(
      layoutChanges(current, next).find((c) => c.component === a.id),
    ).toMatchObject({ kind: "moved", from: { tab: 0 }, to: { tab: 2 } });
  });
  it("accepts a pick or none, validates IDs, exports informative comparisons, and never deploys", async () => {
    const { input } = await setup();
    const deploy = vi.spyOn(input.ehr, "deploy");
    const s = await prepareSession(input);
    const id = s.options[0]?.id;
    if (!id) throw new Error("Missing option");
    const picked = await answerSession(s, () => ({
      chosen: id,
      reason: "Try fewer scrolls",
      reasons: [],
    }));
    expect(chosenSessionBundle(picked)?.id).toBe(id);
    expect(picked.comparisons).toHaveLength(3);
    expect(
      picked.comparisons.every(
        (c) => c.preferred === id && c.preferredProgramHash,
      ),
    ).toBe(true);
    const none = await answerSession(s, () => ({
      chosen: null,
      reason: "Keep familiar controls",
      reasons: [],
    }));
    expect(chosenSessionBundle(none)).toBeNull();
    expect(none.comparisons).toHaveLength(3);
    expect(
      none.comparisons.every(
        (c) => c.preferred === "current" && c.preferredChanges.length === 0,
      ),
    ).toBe(true);
    await expect(
      answerSession(s, () => ({
        chosen: "invented",
        reason: "x",
        reasons: [],
      })),
    ).rejects.toThrow("Unknown");
    await expect(
      answerSession(picked, () => ({ chosen: null, reason: "x", reasons: [] })),
    ).rejects.toThrow("already");
    expect(deploy).not.toHaveBeenCalled();
    const base = await mkdtemp(path.join(tmpdir(), "sessions-test-"));
    const runs = path.join(base, "runs");
    const file = await recordSession(none, runs);
    expect(
      sessionSchema.parse(JSON.parse(await readFile(file, "utf8"))),
    ).toEqual(none);
    await expect(recordSession(none, runs)).rejects.toThrow();
    await expect(
      recordSession({ ...none, id: "../escape" }, runs),
    ).rejects.toThrow("ID");
  });
  it("seeded choice is reproducible, hidden, and can decline all costly options", async () => {
    const { input } = await setup();
    const s = await prepareSession(input);
    expect(
      await answerSession(s, seededSessionChooser(7, s.clinician)),
    ).toEqual(await answerSession(s, seededSessionChooser(7, s.clinician)));
    for (const o of s.options)
      o.evidence.savings = {
        clicks: -100,
        scrolls: -100,
        keystrokes: 0,
        completed: 1,
      };
    expect(
      (await answerSession(s, seededSessionChooser(7, s.clinician))).choice
        ?.chosen,
    ).toBeNull();
  });
  it("friction is optional trace metadata; wishes remain scoped untrusted generator data", async () => {
    const { input } = await setup();
    const flag = flagFor(input.current.owner, programHash(input.current));
    const trace = flagFriction([], flag);
    expect(traceFriction(trace)).toEqual([flag]);
    expect(
      frictionFlagSchema.safeParse({
        ...flag,
        signal: { kind: "wish", text: " " },
      }).success,
    ).toBe(false);
    const s = await prepareSession({ ...input, flags: [flag] });
    const answered = await answerSession(s, () => ({
      chosen: null,
      reason: "familiar",
      reasons: [],
    }));
    const data = sessionGeneratorInput(
      s.clinician,
      3,
      [flag, { ...flag, day: 99 }, { ...flag, clinician: "someone-else" }],
      [answered],
    );
    expect(data.friction).toEqual([flag]);
    expect(data.comparisons).toHaveLength(3);
    expect(data.instruction).toContain("untrusted");
    expect(
      sessionGeneratorInput(s.clinician, 1, [flag], [answered]).comparisons,
    ).toEqual([]);
  });
  it("reports measured signed savings, including regressions, instead of predictions", async () => {
    const { input } = await setup();
    const simulate = input.ehr.simulate;
    input.ehr.simulate = async (i) => {
      const d = await simulate(i);
      if (i.program.version > 0)
        for (const t of d.tasks) {
          t.clicks -= 1;
          t.scrolls += 1;
        }
      return d;
    };
    const s = await prepareSession(input);
    const count = input.recentDays.flatMap((d) => d.tasks).length;
    expect(
      s.options.every(
        (o) =>
          o.evidence.savings.clicks === count &&
          o.evidence.savings.scrolls === -count,
      ),
    ).toBe(true);
  });
  it("offline CLI records a complete fake session without model or deployment calls", async () => {
    const { input, candidates } = await setup();
    const dir = await mkdtemp(path.join(tmpdir(), "session-cli-test-"));
    const inputFile = path.join(dir, "input.json");
    await writeFile(
      inputFile,
      JSON.stringify({
        ...input,
        candidates,
        runsRoot: path.join(dir, "runs"),
      }),
    );
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        "--import",
        fileURLToPath(
          new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url),
        ),
        fileURLToPath(new URL("../src/session-cli.ts", import.meta.url)),
        inputFile,
      ],
      { env: { ...process.env, NODE_ENV: "test", EHR_FAKE: "1" } },
    );
    const recorded = sessionSchema.parse(
      JSON.parse(await readFile(stdout.trim(), "utf8")),
    );
    expect(recorded.backend).toBe("fake");
    expect(recorded.choice).not.toBeNull();
    expect(recorded.comparisons).toHaveLength(3);
  });
  it("refuses fake certificates in real mode", async () => {
    const { input } = await setup();
    const real: EhrClient = { ...input.ehr, mode: "real" };
    await expect(prepareSession({ ...input, ehr: real })).rejects.toThrow(
      "at least two",
    );
  });
});
