/** Server-side completed-prefix view over the one run directory. */
import { mkdir, writeFile, rename, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { completedPrefix, readJson } from "./run-prefix.mjs";
const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
const jobs = new Map();
// Serialize native derivation across requests/runs within this server. It never
// changes certification inputs, programs or build bindings; the complexity
// adapter may invoke lake env, under the shared derivation lock.
let queue = Promise.resolve();
export async function savePrefix(prefix) {
  const directory = path.join(prefix.dir, ".cache/completed", prefix.key);
  if (await exists(path.join(directory, "request.json"))) return;
  await mkdir(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `request.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  await writeFile(
    temporary,
    JSON.stringify({
      key: prefix.key,
      files: prefix.files,
      manifest: prefix.manifest,
      versions: [...prefix.versions].map(([p, v]) => [p, [...v]]),
    }),
  );
  await rename(temporary, path.join(directory, "request.json"));
}
export async function savedPrefix(current, key) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid completed prefix");
  const saved = await readJson(
    path.join(current.dir, ".cache/completed", key, "request.json"),
  );
  if (
    saved.key !== key ||
    saved.manifest.runId !== current.manifest.runId ||
    saved.files.some((file) => !current.files.includes(file))
  )
    throw new Error("Unavailable completed prefix");
  return {
    ...current,
    ...saved,
    versions: new Map(saved.versions.map(([p, v]) => [p, new Set(v)])),
  };
}
export async function derived(
  prefix,
  kind,
  root,
  generate = true,
  execute = promisify(execFile),
) {
  const { dir, key, files, versions, manifest } = prefix;
  const cache = path.join(dir, ".cache", "completed", key);
  const get = (file) => readJson(path.join(dir, file));
  const destination =
    kind === "trajectories" ? "trajectories/index.json" : kind + ".json";
  if (await exists(path.join(cache, kind + ".ready.json")))
    return readJson(path.join(cache, destination));
  const expected = [...versions].flatMap(([p, vs]) =>
    [...vs].map((v) => `programs/${p}/v${v}.json`),
  );
  const isVersion = (p, v) => versions.get(p)?.has(v);
  // Existing derived evidence is reusable only when it covers the committed
  // inputs. Filtering is in memory and cannot introduce an unfinished phase.
  if (kind === "trajectories" && files.includes("trajectories/index.json")) {
    const index = await get("trajectories/index.json");
    const tasks = index.tasks.filter(
      (t) =>
        t.day <= manifest.daysCompleted &&
        isVersion(t.persona, t.programVersion),
    );
    const days = files.filter((f) => /^days\/day-\d+\/P[1-5]\.json$/.test(f));
    const ids = (await Promise.all(days.map(get))).flatMap((d) =>
      d.tasks.map((t) => t.task),
    );
    if (
      index.runId === manifest.runId &&
      ids.every((id) => tasks.some((t) => t.id === id)) &&
      tasks.length === ids.length
    )
      return { ...index, tasks };
  }
  if (kind === "complexity" && files.includes("complexity.json")) {
    const report = await get("complexity.json");
    const personas = report.personas.map((p) => ({
      ...p,
      iterations: p.iterations.filter((i) => isVersion(p.persona, i.version)),
      markers: p.markers.filter((m) => m.night <= manifest.nightsCompleted),
    }));
    if (
      report.runId === manifest.runId &&
      expected.every((file) => {
        const [, p, v] = /^programs\/(P[1-5])\/v(\d+)\.json$/.exec(file);
        return personas.some(
          (person) =>
            person.persona === p &&
            person.iterations.some((i) => i.version === +v),
        );
      })
    )
      return { ...report, personas };
  }
  if (kind === "conformance" && files.includes("conformance.json")) {
    const report = await get("conformance.json");
    const targets = report.targets.filter((t) =>
      expected.some(
        (file) => t.programPath === `runs/${manifest.runId}/${file}`,
      ),
    );
    if (report.runId === manifest.runId && targets.length === expected.length) {
      const results = report.results.filter((r) =>
        targets.some((t) => t.id === r.target),
      );
      const summary = {
        ...report.summary,
        passed: results.filter((r) => r.status === "pass").length,
        failed: results.filter((r) => r.status === "fail").length,
        notApplicable: results.filter((r) => r.status === "not-applicable")
          .length,
      };
      return { ...report, targets, results, summary };
    }
  }
  if (kind === "replay" && files.includes("replay.json")) {
    const replay = await get("replay.json");
    const contexts = replay.contexts.filter(
      (c) => c.version === undefined || isVersion(c.persona, c.version),
    );
    if (
      expected.every((file) => {
        const [, p, v] = /^programs\/(P[1-5])\/v(\d+)\.json$/.exec(file);
        return contexts.some(
          (c) =>
            c.persona === p &&
            (c.version === +v || manifest.ehr.mode === "fake"),
        );
      }) &&
      replay.tasks.every(
        (t) =>
          isVersion(t.persona, t.before.version) &&
          isVersion(t.persona, t.after.version),
      )
    )
      return { ...replay, contexts, tasks: replay.tasks };
  }
  if (!generate || manifest.ehr.mode === "fake" || !manifest.daysCompleted)
    return null;
  if (!(await exists(path.join(cache, kind + ".ready.json")))) {
    const jobKey = `${dir}/${key}/${kind}`;
    let job = jobs.get(jobKey);
    if (!job) {
      job = queue
        .catch(() => {})
        .then(async () => {
          await mkdir(cache, { recursive: true });
          await savePrefix(prefix);
          await execute(
            "flock",
            [
              path.join(
                process.env.TMPDIR ?? "/home/saithat/Projects/run-tmp",
                "vgi-derived.lock",
              ),
              process.execPath,
              "--import",
              path.join(root, "agent/node_modules/tsx/dist/loader.mjs"),
              path.join(root, "scripts/derive-run.mjs"),
              root,
              manifest.runId,
              key,
              kind,
            ],
            {
              cwd: root,
              env: process.env,
              maxBuffer: 16e6,
              timeout: 30 * 60 * 1000,
            },
          );
        });
      queue = job;
      jobs.set(jobKey, job);
      void job.finally(() => jobs.delete(jobKey)).catch(() => {});
    }
    await job;
  }
  return readJson(path.join(cache, destination));
}
export async function readDecision(prefix, file) {
  const record = await readJson(path.join(prefix.dir, file));
  for (const field of ["test", "testNoAgent"])
    if (record.measured?.[field]?.day > prefix.manifest.daysCompleted)
      record.measured[field] = null;
  const testDay = record.night % 2 ? record.night + 1 : record.night + 2;
  if (testDay > prefix.manifest.daysCompleted && Array.isArray(record.flags))
    record.flags = record.flags.filter(
      (flag) => !flag.startsWith("test-unmeasured:"),
    );
  return record;
}
export async function runSummary(prefix, root) {
  await savePrefix(prefix);
  const { manifest, files } = prefix,
    get = (f) => readJson(path.join(prefix.dir, f));
  const records = [],
    days = [],
    baselines = [],
    noAgentDays = [],
    certificates = {};
  for (const file of files) {
    if (
      /^decisions\/night-\d+\/P[1-5]\.json$/.test(file) ||
      /^break\/P[1-5]-[\w-]+\.json$/.test(file)
    )
      records.push(await readDecision(prefix, file));
    else if (
      /^(days|baselines|no-agent\/days)\/day-\d+\/P[1-5]\.json$/.test(file)
    ) {
      const row = { ...(await get(file)), trace: [] };
      (file.startsWith("days/")
        ? days
        : file.startsWith("baselines/")
          ? baselines
          : noAgentDays
      ).push(row);
    } else if (/^certs\/P[1-5]\/v\d+\.json$/.test(file))
      certificates[file] = await get(file);
  }
  // Derive blind observations from completed days even before the run's final
  // summary pass; do not mutate the saved decision or leak a future measurement.
  for (const record of records) {
    const testDay = record.night % 2 ? record.night + 1 : record.night + 2;
    if (record.measured.test?.day > manifest.daysCompleted)
      record.measured.test = null;
    if (record.measured.testNoAgent?.day > manifest.daysCompleted)
      record.measured.testNoAgent = null;
    const actual = days.find(
      (d) =>
        d.day === testDay &&
        d.persona === record.persona &&
        d.programVersion === record.versionAfter,
    );
    if (actual && record.deployed) {
      const observed = (control) => ({
        day: testDay,
        partition:
          control === "baselines"
            ? "blind-measurement"
            : "blind-measurement-no-agent",
        before: (control === "baselines" ? baselines : noAgentDays).find(
          (d) => d.day === testDay && d.persona === record.persona,
        ),
        after: actual,
      });
      // The recorded metric shape is built in the agent; use it rather than
      // maintaining a second definition in this HTTP layer.
      const { pairedMetrics, pctAboveFloor, saving } =
        await import("../agent/src/observe.js");
      const replayDay = (day, load, before, after) => {
        const pair = pairedMetrics(before, after);
        return {
          day,
          load,
          ...pair,
          saving: saving(pair.before, pair.after),
          pctAboveFloor: {
            before: pctAboveFloor(before),
            after: pctAboveFloor(after),
          },
        };
      };
      for (const [field, control] of [
        ["test", "baselines"],
        ["testNoAgent", "noAgentDays"],
      ]) {
        const o = observed(control);
        if (o.before)
          record.measured[field] = replayDay(
            testDay,
            o.partition,
            o.before,
            actual,
          );
      }
    }
  }
  const viewFiles = [...files];
  if (manifest.ehr.mode === "real" && manifest.daysCompleted)
    for (const file of [
      "replay.json",
      "trajectories/index.json",
      "complexity.json",
      "conformance.json",
    ])
      if (!viewFiles.includes(file)) viewFiles.push(file);
  const complexity = await derived(prefix, "complexity", root, false);
  const ruleConformance = await derived(prefix, "conformance", root, false);
  return {
    manifest,
    records,
    days,
    baselines,
    noAgentDays,
    certificates,
    complexity,
    ruleConformance,
    files: viewFiles,
  };
}
export { completedPrefix };
