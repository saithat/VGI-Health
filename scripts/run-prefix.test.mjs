import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rename,
  readFile,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { completedPrefix } from "./run-prefix.mjs";
import { derived, runSummary } from "./live-run-data.mjs";
import {
  writeDayDigest,
  writeNightDigest,
} from "../agent/src/content-digest.js";
import { writeJsonAtomic } from "../agent/src/util.js";
const put = async (dir, file, value) => {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await writeFile(path.join(dir, file), JSON.stringify(value));
};
async function setup(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "run-prefix-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await put(dir, "manifest.json", {
    runId: "live",
    completionProtocol: "atomic-prefix-v1",
    days: 3,
    personas: ["P1", "P2"],
    status: "running",
    ehr: { mode: "real" },
  });
  for (const p of ["P1", "P2"])
    await put(dir, `programs/${p}/v0.json`, { version: 0 });
  return dir;
}
const day = async (dir, n, p) =>
  put(dir, `days/day-0${n}/${p}.json`, {
    day: n,
    persona: p,
    programVersion: n === 1 ? 0 : 1,
    tasks: [{ task: `${p}-${n}` }],
    trace: [],
  });
const night = async (dir, p) =>
  put(dir, `decisions/night-01/${p}.json`, {
    runId: "live",
    night: 1,
    persona: p,
    versionBefore: 0,
    versionAfter: 1,
    measured: {},
    deployed: null,
  });
test("half-written day and staged revisions stay invisible until all phase fences commit", async (t) => {
  const dir = await setup(t);
  await day(dir, 1, "P1");
  await writeFile(path.join(dir, "days/day-01/P2.json"), "{");
  let prefix = await completedPrefix(dir);
  assert.equal(prefix.manifest.daysCompleted, 0);
  assert(!prefix.files.some((f) => f.startsWith("days/")));
  await day(dir, 1, "P2");
  const marker = {
    schemaVersion: 1,
    personas: { P1: "a", P2: "b" },
    contentDigest: "first",
  };
  await put(dir, "days/day-01/digest.json.tmp", marker);
  assert.equal((await completedPrefix(dir)).manifest.daysCompleted, 0);
  await rename(
    path.join(dir, "days/day-01/digest.json.tmp"),
    path.join(dir, "days/day-01/digest.json"),
  );
  prefix = await completedPrefix(dir);
  assert.equal(prefix.manifest.daysCompleted, 1);
  const firstKey = prefix.key;
  for (const p of ["P1", "P2"]) {
    await night(dir, p);
    await put(dir, `programs/${p}/v1.json`, { version: 1 });
    await day(dir, 2, p);
  }
  await writeDayDigest(dir, 2, ["P1", "P2"]);
  prefix = await completedPrefix(dir);
  assert.equal(prefix.key, firstKey);
  assert(!prefix.files.includes("programs/P1/v1.json"));
  assert.equal(prefix.manifest.nightsCompleted, 0);
  await writeNightDigest(dir, 1, ["P1", "P2"]);
  prefix = await completedPrefix(dir);
  assert.equal(prefix.manifest.daysCompleted, 2);
  assert.equal(prefix.manifest.nightsCompleted, 1);
  assert(prefix.files.includes("programs/P1/v1.json"));
  assert.notEqual(prefix.key, firstKey);
});
test("day marker is atomically replaced and readers never parse temporary marker bytes", async (t) => {
  const dir = await setup(t);
  for (const p of ["P1", "P2"]) await day(dir, 1, p);
  await writeDayDigest(dir, 1, ["P1", "P2"]);
  const file = path.join(dir, "days/day-01/digest.json");
  let reads = 0;
  await Promise.all([
    (async () => {
      for (let i = 0; i < 20; i++)
        await writeJsonAtomic(file, {
          schemaVersion: 1,
          personas: { P1: "a", P2: "b" },
          generation: i,
        });
    })(),
    (async () => {
      for (let i = 0; i < 100; i++) {
        const value = JSON.parse(await readFile(file, "utf8"));
        assert.equal(value.schemaVersion, 1);
        assert.equal((await completedPrefix(dir)).manifest.daysCompleted, 1);
        reads++;
      }
    })(),
  ]);
  assert.equal(reads, 100);
});
test("a corrupt committed marker fails closed; unmarked terminal runs do not bypass the protocol", async (t) => {
  const dir = await setup(t);
  for (const p of ["P1", "P2"]) await day(dir, 1, p);
  await put(dir, "manifest.json", {
    ...JSON.parse(await readFile(path.join(dir, "manifest.json"))),
    status: "completed",
  });
  assert.equal((await completedPrefix(dir)).manifest.daysCompleted, 0);
  await put(dir, "days/day-01/digest.json", {
    schemaVersion: 1,
    personas: { P1: "a" },
  });
  await assert.rejects(completedPrefix(dir), /Invalid day completion/);
});
test("existing derived indexes are restricted to exactly the completed prefix and summaries omit raw traces", async (t) => {
  const dir = await setup(t);
  for (const p of ["P1", "P2"]) await day(dir, 1, p);
  await writeDayDigest(dir, 1, ["P1", "P2"]);
  await put(dir, "trajectories/index.json", {
    runId: "live",
    tasks: [
      ...["P1", "P2"].map((persona) => ({
        id: `${persona}-1`,
        day: 1,
        persona,
        programVersion: 0,
      })),
      { id: "future", day: 2, persona: "P1", programVersion: 1 },
    ],
  });
  await put(dir, "complexity.json", {
    runId: "live",
    personas: ["P1", "P2"].map((persona) => ({
      persona,
      iterations: [{ version: 0 }, { version: 1 }],
      markers: [{ night: 1 }],
    })),
  });
  const prefix = await completedPrefix(dir);
  const index = await derived(prefix, "trajectories", dir);
  assert.deepEqual(
    index.tasks.map((t) => t.id),
    ["P1-1", "P2-1"],
  );
  const summary = await runSummary(prefix, dir);
  assert.equal(summary.days.length, 2);
  assert(summary.days.every((d) => d.trace.length === 0));
  assert(
    summary.complexity.personas.every(
      (p) => p.iterations.length === 1 && p.markers.length === 0,
    ),
  );
  assert.equal(await derived(prefix, "conformance", dir, false), null);
});

test("legacy marker upgrade validates task completeness before exposing the stopped prefix", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "marker-upgrade-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { runFakeCadence } = await import("../agent/src/fake/cadence.js");
  const { markCompletedRun } = await import("./mark-completed-run.mjs");
  const { summary } = await runFakeCadence(path.join(root, "runs"), {
    days: 2,
  });
  const dir = summary.dir;
  for (const n of [1, 2])
    await rm(path.join(dir, `days/day-0${n}/digest.json`));
  await rm(path.join(dir, "completion"), { recursive: true });
  const file = path.join(dir, "days/day-01/P1.json"),
    original = await readFile(file, "utf8"),
    broken = JSON.parse(original);
  const omitted = broken.tasks.pop().task;
  broken.trace = broken.trace.filter((row) => row.task !== omitted);
  broken.floor = broken.floor.filter((row) => row.task !== omitted);
  await writeFile(file, JSON.stringify(broken));
  await assert.rejects(
    markCompletedRun("cadence-fake", 2, 1, { root }),
    /Incomplete day task set/,
  );
  assert.equal((await completedPrefix(dir)).manifest.daysCompleted, 0);
  await writeFile(file, original);
  await markCompletedRun("cadence-fake", 2, 1, { root });
  const prefix = await completedPrefix(dir);
  assert.equal(prefix.manifest.daysCompleted, 2);
  assert.equal(prefix.manifest.nightsCompleted, 1);
});

test("lazy derivation coalesces by prefix, retains only derived files, and retries failures", async (t) => {
  const dir = await setup(t);
  for (const p of ["P1", "P2"]) await day(dir, 1, p);
  await writeDayDigest(dir, 1, ["P1", "P2"]);
  const prefix = await completedPrefix(dir),
    cache = path.join(dir, ".cache/completed", prefix.key);
  let calls = 0,
    release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  const execute = async (command, args) => {
    calls++;
    assert.equal(command, "flock");
    assert.equal(args.at(-2), prefix.key);
    assert.equal(args.at(-1), "conformance");
    await wait;
    const request = JSON.parse(
      await readFile(path.join(cache, "request.json")),
    );
    assert(request.files.includes("days/day-01/P1.json"));
    assert(!request.files.includes("days/day-02/P1.json"));
    await put(cache, "conformance.json", { runId: "live", fixture: "derived" });
    await put(cache, "conformance.ready.json", {
      key: prefix.key,
      kind: "conformance",
    });
  };
  const one = derived(prefix, "conformance", dir, true, execute),
    two = derived(prefix, "conformance", dir, true, execute);
  await day(dir, 2, "P1");
  release();
  assert.deepEqual(await one, await two);
  assert.equal(calls, 1);
  const { runFiles } = await import("./run-prefix.mjs");
  assert(
    !(await runFiles(cache)).some(
      (file) => file.startsWith("days/") || file.startsWith("programs/"),
    ),
  );
  let failed = 0;
  const refuse = async () => {
    failed++;
    throw new Error("native unavailable");
  };
  await assert.rejects(
    derived(prefix, "replay", dir, true, refuse),
    /native unavailable/,
  );
  await assert.rejects(
    derived(prefix, "replay", dir, true, refuse),
    /native unavailable/,
  );
  assert.equal(failed, 2);
  await assert.rejects(readFile(path.join(cache, "replay.ready.json")));
});
