// Full --ui runs share $TMPDIR/vgi-browser-heavy.lock (inherited audit token;
// EHR_BROWSER_LOCK=off opts out). Default: 4 memory-bounded workers, ceiling 6,
// 64-tree batches. Timeout/crash-only retries halve
// workers, at most twice. Exact tree/context/bundle dedupe maps every state.
// Atomic physical samples use $TMPDIR/vgi-screen-check-cache/physical.
// Iterate with targeted --grep/subsets. The owner defers full audits/timings to
// the final merged check. Agent calls inherit their caller scheduling/lock.
import { Buffer } from "node:buffer";
import { performance } from "node:perf_hooks";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import {
  digest,
  contextDigest,
  cacheRoot,
  treeDigest,
  resultKey,
  readResult,
  writeResult,
  screenContext,
} from "../../scripts/screen-results.mjs";
import { acquireBrowserLock } from "../../scripts/browser-heavy-lock.mjs";
import {
  isAgentScreenCheck,
  workerCount,
  dedupeFiles,
  expandMeasurements,
  reportTests,
  failureKind,
  recoverTimeouts,
  exactGrep,
} from "./audit-execution.mjs";
const started = performance.now();
const ui = process.argv[2] === "--ui";
// Explicit 0 is the operator escape hatch; certification uses the full matrix.
const physicalEnabled = process.env.EHR_PHYSICAL_POLICY !== "0";
const physicalEnforced =
  physicalEnabled && process.env.EHR_ENFORCE_PHYSICAL !== "0";
process.env.EHR_PHYSICAL_POLICY = physicalEnabled ? "1" : "0";
process.env.EHR_ENFORCE_PHYSICAL = physicalEnforced ? "1" : "0";
const arguments_ = process.argv.slice(ui ? 3 : 2);
const files = (
  arguments_[0] === "--manifest"
    ? JSON.parse(readFileSync(arguments_[1], "utf8"))
    : arguments_
).map((file) => resolve(process.env.INIT_CWD ?? process.cwd(), file));
if (!files.length || files.some((file) => !existsSync(file))) {
  process.stderr.write(
    "Usage: pnpm --filter app screen-check [--ui] <screen.json …>\nPaths are relative to the invoking directory (or absolute). Every input must exist.\n",
  );
  process.exit(1);
}
// Nightly agent invocations deliberately retain their existing scheduling.
const browserLock =
  ui && !isAgentScreenCheck(process.env, files)
    ? await acquireBrowserLock()
    : null;
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = resolve(appDir, "../docs/design/alert-urgency.json");
const policy = JSON.parse(readFileSync(policyPath, "utf8"));
let cache;
let checkedFiles = files;
const cachedResults = new Map();
if (ui) {
  const { chromium } = await import("@playwright/test");
  const context = contextDigest(
    screenContext(appDir, chromium.executablePath()),
  );
  const directory = cacheRoot();
  const entries = files.map((file) => {
    const sha256 = treeDigest(file);
    const key = resultKey(context, sha256, /-geometry\.json$/.test(file));
    const result =
      process.env.EHR_SCREEN_CACHE !== "0" ? readResult(directory, key) : null;
    if (result) cachedResults.set(file, result);
    return { file, sha256, key, reused: !!result };
  });
  checkedFiles = entries
    .filter((entry) => !entry.reused)
    .map((entry) => entry.file);
  cache = { context, directory, entries };
  process.stdout.write(
    `Screen coverage: ${files.length} trees; ${cachedResults.size} reused, ${checkedFiles.length} checked now. Context ${context}. Known-bad controls always run.\n`,
  );
}
const port =
  process.env.APP_TEST_PORT ??
  (await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(String(port)));
    });
  }));
const output = mkdtempSync(resolve(tmpdir(), "ehr-visibility-"));
if (ui && !process.env.EHR_GEOMETRY_DIR)
  process.env.EHR_GEOMETRY_DIR = resolve(output, "geometry");
// Bounded Playwright controllers prevent failure-report accumulation from exhausting Node.
// Measurement caches bind painter, assertions, policy, browser and configuration;
// they may retain failures but can never mint a whole-version pass receipt.
let sampleDirectory = resolve(output, "physical-samples");
const measurementContext = cache?.context ?? "non-ui";
if (ui) {
  sampleDirectory = resolve(
    process.env.EHR_SCREEN_CACHE === "0" ||
      process.env.EHR_PHYSICAL_SAMPLE_CACHE === "0"
      ? resolve(output, "physical-samples")
      : (process.env.EHR_PHYSICAL_SAMPLE_CACHE ??
          resolve(cache.directory, "physical")),
    measurementContext,
  );
  mkdirSync(sampleDirectory, { recursive: true });
}
const mapping = dedupeFiles(
  checkedFiles,
  measurementContext,
  ui && process.env.EHR_SCREEN_DEDUPE !== "0",
);
const representatives = [
  ...new Set(mapping.map((entry) => entry.representative)),
];
const workers = workerCount();
process.stdout.write(
  `Screen execution: ${checkedFiles.length} states, ${representatives.length} distinct trees; ${workers} workers\n`,
);
const batchSize = ui
  ? Math.min(
      128,
      Math.max(
        1,
        Number.parseInt(process.env.EHR_SCREEN_BATCH_SIZE ?? "64", 10) || 64,
      ),
    )
  : Math.max(1, representatives.length);
const batches = representatives.length
  ? Array.from(
      { length: Math.ceil(representatives.length / batchSize) },
      (_, i) => representatives.slice(i * batchSize, (i + 1) * batchSize),
    )
  : [[]];
let gateStatus = [...cachedResults.values()].some(
  (result) => result.status === "fail",
)
  ? "fail"
  : "pass";
const treeResults = new Map(cachedResults);
let controlsStatus = "pass";
const measured = [];
const batchResults = [];
const retries = [];
for (const [index, batch] of batches.entries()) {
  const batchStarted = performance.now();
  const inputManifest = resolve(output, `inputs-${index}.json`);
  if (ui) writeFileSync(inputManifest, JSON.stringify(batch));
  process.stdout.write(
    `Screen batch ${index + 1}/${batches.length}: ${batch.length} trees\n`,
  );
  function runTests(attempt, count, targets, project) {
    const suffix = `${index}-${attempt}-${project ?? "all"}`;
    const report = resolve(output, `playwright-${suffix}.json`);
    const result = spawnSync(
      process.execPath,
      [
        resolve(appDir, "node_modules/@playwright/test/cli.js"),
        "test",
        ui ? "ui-check.spec.ts" : "screen-check.spec.ts",
        "--reporter",
        "list,json",
        "--output",
        resolve(output, `batch-${suffix}`),
        ui ? "--max-failures=0" : "--max-failures=1",
        ...(targets
          ? ["--grep", exactGrep(targets), "--project", project]
          : ui && index > 0
            ? ["--grep", "semantic UI fidelity:|physical policy:"]
            : []),
        "--workers",
        String(count),
        "--config",
        resolve(appDir, "playwright.config.ts"),
      ],
      {
        cwd: appDir,
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: report,
          APP_TEST_PORT: port,
          APP_TEST_PREVIEW: "1",
          EHR_PHYSICAL_SAMPLE_DIR:
            process.env.EHR_SCREEN_CACHE === "0" ||
            process.env.EHR_PHYSICAL_SAMPLE_CACHE === "0"
              ? ""
              : sampleDirectory,
          EHR_COLLECT_PHYSICAL: "1",
          ...(ui
            ? { EHR_UI_MANIFEST: inputManifest, EHR_UI_FILES: "[]" }
            : { EHR_SCREEN_FILES: JSON.stringify(batch) }),
        },
      },
    );
    if (result.error) process.stderr.write(`${result.error.message}\n`);
    try {
      const json = JSON.parse(readFileSync(report, "utf8"));
      return { result, tests: reportTests(json), errors: json.errors ?? [] };
    } catch {
      return {
        result,
        tests: [],
        errors: [{ message: "Missing or invalid Playwright report" }],
      };
    }
  }
  function physicalAttachments(tests) {
    return tests.flatMap((test) =>
      test.run?.status !== "passed"
        ? []
        : (test.run.attachments ?? [])
            .filter((attachment) => ui && attachment.name === "physical-policy")
            .map((attachment) => {
              const bytes = attachment.path
                ? readFileSync(attachment.path)
                : Buffer.from(attachment.body, "base64");
              return JSON.parse(bytes.toString());
            }),
    );
  }
  const first = runTests(0, workers);
  const recovered = recoverTimeouts(first, {
    // Legacy non-UI checks retain their one-shot behavior.
    workers,
    run: runTests,
    hasFindings: (tests) =>
      !ui ||
      physicalAttachments(tests).some((state) =>
        state.measurements.some((sample) => sample.findings.length),
      ),
    onRetry: (retry) => {
      process.stdout.write(
        `Retry batch ${index + 1}, attempt ${retry.attempt}: ${retry.tests.length} ${retry.tests[0].project} tests at ${retry.workers} workers\n`,
      );
    },
  });
  retries.push(
    ...recovered.retries.map((retry) => ({ batch: index, ...retry })),
  );
  const { tests, errors, exitCode } = recovered;
  if (ui) rmSync(inputManifest, { force: true });
  const failed = tests.filter((test) => failureKind(test));
  const failedControls = failed.filter(
    (test) =>
      !test.title.startsWith("semantic UI fidelity:") &&
      !test.title.startsWith("physical policy:"),
  );
  if (
    errors.length ||
    failedControls.some((test) => failureKind(test) !== "assertion")
  )
    controlsStatus = "error";
  else if (controlsStatus !== "error" && failedControls.length)
    controlsStatus = "fail";
  let status =
    errors.length ||
    !tests.length ||
    failed.some((test) => failureKind(test) !== "assertion")
      ? "error"
      : failed.length
        ? "fail"
        : exitCode === 0
          ? "pass"
          : "error";
  // Read only final successful attempts; timed-out partial attempts contribute nothing.
  const batchPhysical = physicalAttachments(tests);
  measured.push(...batchPhysical);
  const physicalStates = batchPhysical.length;
  const physicalFindings = batchPhysical.reduce(
    (n, state) =>
      n +
      state.measurements.reduce((m, sample) => m + sample.findings.length, 0),
    0,
  );
  if (
    ui &&
    physicalEnabled &&
    physicalStates !==
      batch.filter((file) => !/-geometry\.json$/.test(file)).length
  )
    status = "error";
  if (physicalFindings && physicalEnforced && status !== "error")
    status = "fail";
  if (status === "error" || (gateStatus !== "error" && status === "fail"))
    gateStatus = status;
  // A failed sibling never prevents independent completed trees being cached.
  if (ui)
    for (const file of batch) {
      const selected = tests.filter(
        (test) => test.title === `semantic UI fidelity: ${file}`,
      );
      const projects = ["desktop", "narrow"].map((project) => {
        const test = selected.find((test) => test.project === project);
        const kind = test ? failureKind(test) : "error";
        return {
          project,
          status: kind
            ? kind === "assertion"
              ? "fail"
              : "error"
            : test.run?.status === "passed"
              ? "pass"
              : "error",
          errors:
            kind === "assertion"
              ? (test.run.errors ?? []).map(
                  (error) => error.message ?? "Assertion failed",
                )
              : [],
        };
      });
      const state = batchPhysical.find((state) => state.file === file) ?? null;
      const probe = /-geometry\.json$/.test(file);
      const physicalTest = tests.find(
        (test) =>
          test.project === "desktop" &&
          test.title === `physical policy: ${file}`,
      );
      const complete =
        !errors.length &&
        projects.every((project) => project.status !== "error") &&
        (!physicalEnabled ||
          probe ||
          (state && physicalTest?.run?.status === "passed"));
      const geometry = [".json", ".background.json"].flatMap((suffix) => {
        const target = resolve(
          process.env.EHR_GEOMETRY_DIR,
          `${digest(readFileSync(file))}${suffix}`,
        );
        return existsSync(target)
          ? [JSON.parse(readFileSync(target, "utf8"))]
          : [];
      });
      const hasFindings =
        physicalEnforced &&
        state?.measurements.some((sample) => sample.findings.length);
      const result = {
        sourceFile: file,
        status: !complete
          ? "error"
          : projects.some((project) => project.status === "fail") || hasFindings
            ? "fail"
            : "pass",
        projects,
        physical: state,
        geometry,
      };
      treeResults.set(file, result);
      if (complete && process.env.EHR_SCREEN_CACHE !== "0") {
        const entry = cache.entries.find((entry) => entry.file === file);
        writeResult(cache.directory, entry.key, result);
      }
    }
  batchResults.push({
    index,
    trees: batch.length,
    status,
    physicalStates,
    physicalFindings,
    elapsedMs: Math.round(performance.now() - batchStarted),
    exitCode,
  });
}
// Expand both cached and freshly measured representatives in original input order.
for (const { file, representative } of mapping) {
  if (treeResults.has(representative))
    treeResults.set(file, treeResults.get(representative));
}
const results = files.map((file) => {
  const result = treeResults.get(file);
  const source = result?.sourceFile;
  return {
    ...result,
    file,
    sha256: ui ? treeDigest(file) : digest(readFileSync(file)),
    probe: /-geometry\.json$/.test(file),
    ...(result
      ? {
          sourceFile: file,
          physical: result.physical ? { ...result.physical, file } : null,
          geometry: result.geometry.map((geometry) => ({
            ...geometry,
            state:
              source && geometry.state.startsWith(source)
                ? file + geometry.state.slice(source.length)
                : geometry.state,
          })),
        }
      : {}),
  };
});
if (ui)
  for (const result of results) {
    if (!["pass", "fail"].includes(result.status)) gateStatus = "error";
    else if (result.status === "fail" && gateStatus !== "error")
      gateStatus = "fail";
  }
const physical = ui
  ? results.flatMap((result) =>
      result.physical ? [{ ...result.physical, file: result.file }] : [],
    )
  : expandMeasurements(mapping, measured);
if (ui) {
  const summary = {
    policyStatus: policy.status,
    elapsedMs: Math.round(performance.now() - started),
    expectedStates: files.filter((file) => !/-geometry\.json$/.test(file))
      .length,
    states: physical.length,
    measurements: physical.reduce(
      (n, state) => n + state.measurements.length,
      0,
    ),
    findings: physical.reduce(
      (n, state) =>
        n +
        state.measurements.reduce((m, sample) => m + sample.findings.length, 0),
      0,
    ),
  };
  if (process.env.EHR_PHYSICAL_REPORT)
    writeFileSync(
      resolve(process.env.EHR_PHYSICAL_REPORT),
      JSON.stringify(
        {
          ...summary,
          policy: policy.physical,
          batches: batchResults,
          retries,
          execution: { workers, distinctTrees: representatives.length },
          states: physical,
        },
        null,
        2,
      ),
    );
  process.stdout.write(
    `Physical policy coverage: ${JSON.stringify(summary)}\n`,
  );
}
if (process.env.EHR_SCREEN_RESULT)
  writeFileSync(
    process.env.EHR_SCREEN_RESULT,
    JSON.stringify({
      status: gateStatus,
      controlsStatus,
      elapsedMs: Math.round(performance.now() - started),
      physical,
      trees: results,
      cache: { hits: cachedResults.size, misses: checkedFiles.length },
      batches: batchResults,
      retries,
      workers,
      coverage: {
        states: checkedFiles.length,
        distinctTrees: representatives.length,
      },
      geometry: ui
        ? results.flatMap((result) =>
            (result.geometry ?? []).map((geometry) => ({
              ...geometry,
              sample:
                /^(workspace-d\d+)-/.exec(basename(result.file))?.[1] ??
                basename(dirname(result.file)),
            })),
          )
        : [],
    }),
  );
if (gateStatus === "pass") rmSync(output, { recursive: true, force: true });
else process.stderr.write(`Screen-check artifacts: ${output}\n`);
browserLock?.release();
process.exit(gateStatus === "pass" ? 0 : 1);
