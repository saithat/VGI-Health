import { freemem } from "node:os";
import { readFileSync } from "node:fs";
import { dirname, basename, resolve, sep } from "node:path";
import { treeDigest } from "../../scripts/screen-results.mjs";

// MemFree excludes reclaimable page cache on Linux; MemAvailable is the budget
// a new browser job can actually use without swapping.
export function availableMemory() {
  try {
    const match = /^MemAvailable:\s+(\d+) kB$/m.exec(
      readFileSync("/proc/meminfo", "utf8"),
    );
    if (match) return Number(match[1]) * 1024;
  } catch {
    /* non-Linux fallback */
  }
  return freemem();
}

// The fixed 256-state sweep measured 37.36/48.32/68.21 states/min at 3/4/6
// workers without cache or dedupe (zero timeouts/retries). Reserve 2 GiB for
// controllers/Vite and budget 500 MiB per worker (browser + Node + headroom).
export function workerCount(env = process.env, available = availableMemory()) {
  const positive = (value, fallback) =>
    Math.max(1, Number.parseInt(value, 10) || fallback);
  // Owner ceiling remains six until explicitly revised.
  const maximum = Math.min(6, positive(env.EHR_SCREEN_MAX_WORKERS, 6));
  const memory = Math.max(
    1,
    Math.floor(
      (Math.min(available, 8 * 1024 ** 3) - 2 * 1024 ** 3) / (500 * 1024 ** 2),
    ),
  );
  return Math.min(maximum, memory, positive(env.EHR_SCREEN_WORKERS, 4));
}

/** Probe files bypass clinical assertions and must never substitute for states. */
export function dedupeFiles(files, context, enabled = true) {
  const groups = new Map();
  return files.map((file) => {
    const key = JSON.stringify([
      treeDigest(file),
      context,
      /-geometry\.json$/.test(file),
    ]);
    if (!enabled || !groups.has(key)) groups.set(key, file);
    return { file, representative: groups.get(key), key };
  });
}
export function expandMeasurements(entries, measurements) {
  const byFile = new Map(measurements.map((state) => [state.file, state]));
  return entries.flatMap(({ file, representative }) => {
    const state = byFile.get(representative);
    return state ? [{ ...state, file }] : [];
  });
}
export const testKey = (test) => JSON.stringify([test.project, test.title]);
export function reportTests(report) {
  const tests = [];
  function walk(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        const run = test.results?.at(-1);
        tests.push({
          title: spec.title,
          project: test.projectName,
          expectedStatus: test.expectedStatus ?? "passed",
          run,
        });
      }
    for (const child of suite.suites ?? []) walk(child);
  }
  walk(report);
  return tests;
}
export function failureKind(test) {
  const run = test.run;
  if (run?.status === test.expectedStatus || run?.status === "skipped")
    return null;
  const errors = run?.errors ?? (run?.error ? [run.error] : []);
  // Assertion messages can mention a timeout; matcher evidence wins.
  if (
    errors.some(
      (e) => e.matcherResult || /(?:expect\(|expect\.)/.test(e.message ?? ""),
    )
  )
    return "assertion";
  if (
    run?.status === "timedOut" ||
    (errors.length &&
      errors.every((e) =>
        /(?:TimeoutError|\btimeout\b|\btimed out\b|worker process exited unexpectedly|worker.*crash|browser.*(?:crash|closed unexpectedly))/i.test(
          e.message ?? "",
        ),
      ))
  )
    return "timeout";
  return "error";
}
export function retryableTests(tests, errors = [], physicalFindings = false) {
  if (physicalFindings) return [];
  const failed = tests.filter((test) => failureKind(test));
  if (!failed.length || failed.some((test) => failureKind(test) !== "timeout"))
    return [];
  if (
    errors.some(
      (e) =>
        !/worker process exited unexpectedly|worker.*crash/i.test(
          e.message ?? "",
        ),
    )
  )
    return [];
  return failed;
}
export const exactGrep = (tests) =>
  `(?:${tests.map((test) => test.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`;

/** Existing agent protocol: a private screens-* directory and gate-result.json.
 * Recognize it here so agent/src/screencheck.ts needs no scheduling change. */
export function isAgentScreenCheck(env, files) {
  if (!env.EHR_SCREEN_RESULT) return false;
  const result = resolve(env.EHR_SCREEN_RESULT);
  const directory = dirname(result);
  return (
    basename(result) === "gate-result.json" &&
    /^screens-/.test(basename(directory)) &&
    files.every((file) => resolve(file).startsWith(directory + sep))
  );
}

/** Replace only selected failed project/title results; retain successful tests. */
export function recoverTimeouts(
  first,
  { workers, run, hasFindings = () => false, onRetry = () => {} },
) {
  let exitCode = first.result.status;
  let errors = first.errors;
  const latest = new Map(first.tests.map((test) => [testKey(test), test]));
  let pending =
    exitCode !== 0
      ? retryableTests(
          [...latest.values()],
          errors,
          hasFindings([...latest.values()]),
        )
      : [];
  const retries = [];
  for (let attempt = 1; pending.length && attempt <= 2; attempt++) {
    const count = Math.max(1, Math.floor(workers / 2 ** attempt));
    errors = [];
    exitCode = 0;
    for (const project of [...new Set(pending.map((test) => test.project))]) {
      const targets = pending.filter((test) => test.project === project);
      const retry = {
        tests: targets.map(({ title, project }) => ({ title, project })),
        attempt,
        workers: count,
      };
      retries.push(retry);
      onRetry(retry);
      const next = run(attempt, count, targets, project);
      if (next.result.status !== 0) exitCode = next.result.status ?? 1;
      errors.push(...next.errors);
      const returned = new Set(next.tests.map(testKey));
      if (targets.some((test) => !returned.has(testKey(test))))
        errors.push({ message: "Retry report omitted selected tests" });
      for (const test of next.tests) latest.set(testKey(test), test);
    }
    pending = retryableTests(
      [...latest.values()],
      errors,
      hasFindings([...latest.values()]),
    );
  }
  return { tests: [...latest.values()], errors, exitCode, retries };
}
