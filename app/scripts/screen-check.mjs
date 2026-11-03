// Full --ui runs share $TMPDIR/vgi-browser-heavy.lock (inherited audit token;
// EHR_BROWSER_LOCK=off opts out). Worker defaults are memory bounded; see README
// for calibration. Only timeout/crash batches retry failed tests, twice at half
// workers. Exact tree/context/bundle dedupe expands all per-state measurements;
// atomic physical samples are shared under $TMPDIR/vgi-screen-check-cache.
// Iterate with targeted --grep/subsets; run the full audit pair once before
// reporting; the merge session runs it once on main. Agent calls do not lock.
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { performance } from "node:perf_hooks";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  mkdirSync,
  renameSync,
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
  cachedTree,
  recordBatch,
} from "./screen-cache.mjs";
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
const files = process.argv
  .slice(ui ? 3 : 2)
  .map((file) => resolve(process.env.INIT_CWD ?? process.cwd(), file));
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
if (ui && process.env.EHR_SCREEN_CACHE !== "0") {
  const { chromium } = await import("@playwright/test");
  const sources = [
    "e2e/ui-check.spec.ts",
    "e2e/physical-policy.ts",
    "e2e/geometry-capture.ts",
    "e2e/capture-environment.ts",
    "src/ehr/ui/fonts/manifest.json",
    "playwright.config.ts",
    "src/ehr/ui/fidelity.ts",
    "src/ehr/ui/display.tsx",
    "src/ehr/ui/types.ts",
    "scripts/screen-check.mjs",
    "scripts/screen-cache.mjs",
    "scripts/audit-execution.mjs",
  ];
  const context = contextDigest({
    app: JSON.parse(readFileSync(resolve(appDir, "dist/build.json"), "utf8")),
    sources: sources.map((file) => [
      file,
      digest(readFileSync(resolve(appDir, file))),
    ]),
    browser: digest(readFileSync(chromium.executablePath())),
    playwright: digest(
      readFileSync(
        resolve(appDir, "node_modules/@playwright/test/package.json"),
      ),
    ),
    presentations: process.env.EHR_PRESENTATION_BUNDLE
      ? digest(readFileSync(process.env.EHR_PRESENTATION_BUNDLE))
      : null,
    node: process.version,
    platform: process.platform,
    policy: digest(readFileSync(policyPath)),
    minimumFont: process.env.EHR_MIN_FONT_PX ?? "12",
    physicalEnabled,
    physicalEnforced,
    urgentAlertIds: process.env.EHR_URGENT_ALERT_IDS ?? "[]",
    projects: ["desktop", "narrow"],
  });
  const directory = resolve(
    process.env.EHR_SCREEN_CACHE_DIR ??
      resolve(appDir, "../runs/screen-check-cache"),
    context,
  );
  const entries = files.map((file) => {
    const sha256 = digest(readFileSync(file));
    return {
      file,
      sha256,
      reused:
        cachedTree(directory, context, sha256) &&
        existsSync(resolve(directory, "geometry", `${sha256}.json`)),
    };
  });
  checkedFiles = entries
    .filter((entry) => !entry.reused)
    .map((entry) => entry.file);
  cache = { context, directory, entries };
  process.env.EHR_GEOMETRY_DIR = resolve(directory, "geometry");
  process.stdout.write(
    `Whole-version screen coverage: ${entries.length} trees; ${entries.length - checkedFiles.length} identical certified trees reused, ${checkedFiles.length} checked now. Context ${context}. Known-bad controls always run.\n`,
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
let measurementContext = "non-ui";
if (ui) {
  const { chromium } = await import("@playwright/test");
  const sampleContext = {
    app: JSON.parse(readFileSync(resolve(appDir, "dist/build.json"), "utf8")),
    ui: digest(readFileSync(resolve(appDir, "e2e/ui-check.spec.ts"))),
    config: digest(readFileSync(resolve(appDir, "playwright.config.ts"))),
    environment: digest(
      readFileSync(resolve(appDir, "e2e/capture-environment.ts")),
    ),
    browser: digest(readFileSync(chromium.executablePath())),
    playwright: digest(
      readFileSync(
        resolve(appDir, "node_modules/@playwright/test/package.json"),
      ),
    ),
    policy: digest(readFileSync(policyPath)),
    presentations: process.env.EHR_PRESENTATION_BUNDLE
      ? digest(readFileSync(process.env.EHR_PRESENTATION_BUNDLE))
      : null,
    node: process.version,
    platform: process.platform,
    minimumFont: process.env.EHR_MIN_FONT_PX ?? "12",
    physicalEnabled,
    physicalEnforced,
    urgentAlertIds: process.env.EHR_URGENT_ALERT_IDS ?? "[]",
  };
  const context = contextDigest(sampleContext);
  measurementContext = context;
  sampleDirectory = resolve(
    process.env.EHR_PHYSICAL_SAMPLE_CACHE === "0"
      ? resolve(output, "physical-samples")
      : (process.env.EHR_PHYSICAL_SAMPLE_CACHE ??
          resolve(tmpdir(), "vgi-screen-check-cache/physical")),
    context,
  );
  mkdirSync(sampleDirectory, { recursive: true });
  const receipt = resolve(sampleDirectory, "context.json");
  if (
    existsSync(receipt) &&
    JSON.stringify(JSON.parse(readFileSync(receipt, "utf8"))) !==
      JSON.stringify(sampleContext)
  )
    throw new Error("Physical sample context mismatch");
  const temporary = `${receipt}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(sampleContext));
  renameSync(temporary, receipt);
  process.stdout.write(
    `Physical measurement context: ${context}; samples ${sampleDirectory}\n`,
  );
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
let gateStatus = "pass";
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
const physical = expandMeasurements(mapping, measured);
if (ui) {
  const summary = {
    policyStatus: policy.status,
    elapsedMs: Math.round(performance.now() - started),
    expectedStates: checkedFiles.filter(
      (file) => !/-geometry\.json$/.test(file),
    ).length,
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
      elapsedMs: Math.round(performance.now() - started),
      physical,
      batches: batchResults,
      retries,
      workers,
      coverage: {
        states: checkedFiles.length,
        distinctTrees: representatives.length,
      },
      geometry: ui
        ? files
            .flatMap((file) =>
              [
                `${digest(readFileSync(file))}.json`,
                `${digest(readFileSync(file))}.background.json`,
              ].map((name) => ({
                path: resolve(process.env.EHR_GEOMETRY_DIR, name),
                sample:
                  /^(workspace-d\d+)-/.exec(basename(file))?.[1] ??
                  basename(dirname(file)),
              })),
            )
            .filter((item) => existsSync(item.path))
            .map((item) => ({
              ...JSON.parse(readFileSync(item.path, "utf8")),
              sample: item.sample,
            }))
        : [],
    }),
  );
if (cache) {
  const receipt = recordBatch(
    cache.directory,
    cache.context,
    cache.entries,
    cache.entries.filter((entry) => !entry.reused).map((entry) => entry.sha256),
    gateStatus === "pass",
  );
  process.stdout.write(`Whole-version coverage receipt: ${receipt}\n`);
}
if (gateStatus === "pass") rmSync(output, { recursive: true, force: true });
else process.stderr.write(`Screen-check artifacts: ${output}\n`);
browserLock?.release();
process.exit(gateStatus === "pass" ? 0 : 1);
