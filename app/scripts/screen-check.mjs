import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
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
const ui = process.argv[2] === "--ui";
const files = process.argv
  .slice(ui ? 3 : 2)
  .map((file) => resolve(process.env.INIT_CWD ?? process.cwd(), file));
if (!files.length || files.some((file) => !existsSync(file))) {
  process.stderr.write(
    "Usage: pnpm --filter app screen-check [--ui] <screen.json …>\nPaths are relative to the invoking directory (or absolute). Every input must exist.\n",
  );
  process.exit(1);
}
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = resolve(appDir, "../docs/design/alert-urgency.json");
const policy = JSON.parse(readFileSync(policyPath, "utf8"));
let cache;
let checkedFiles = files;
if (ui && process.env.EHR_SCREEN_CACHE !== "0") {
  const { chromium } = await import("@playwright/test");
  const sources = [
    "e2e/ui-check.spec.ts",
    "e2e/geometry-capture.ts",
    "playwright.config.ts",
    "src/ehr/ui/fidelity.ts",
    "src/ehr/ui/display.tsx",
    "src/ehr/ui/types.ts",
    "scripts/screen-check.mjs",
    "scripts/screen-cache.mjs",
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
if (ui) {
  const { chromium } = await import("@playwright/test");
  const sampleContext = {
    app: JSON.parse(readFileSync(resolve(appDir, "dist/build.json"), "utf8")),
    ui: digest(readFileSync(resolve(appDir, "e2e/ui-check.spec.ts"))),
    config: digest(readFileSync(resolve(appDir, "playwright.config.ts"))),
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
    urgentAlertIds: process.env.EHR_URGENT_ALERT_IDS ?? "[]",
  };
  const context = contextDigest(sampleContext);
  sampleDirectory = resolve(
    process.env.EHR_PHYSICAL_SAMPLE_CACHE ?? sampleDirectory,
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
const batchSize = ui
  ? Math.min(
      128,
      Math.max(
        1,
        Number.parseInt(process.env.EHR_SCREEN_BATCH_SIZE ?? "64", 10) || 64,
      ),
    )
  : Math.max(1, checkedFiles.length);
const batches = checkedFiles.length
  ? Array.from({ length: Math.ceil(checkedFiles.length / batchSize) }, (_, i) =>
      checkedFiles.slice(i * batchSize, (i + 1) * batchSize),
    )
  : [[]];
let gateStatus = "pass";
const physical = [];
const batchResults = [];
for (const [index, batch] of batches.entries()) {
  const batchOutput = resolve(output, `batch-${index}`);
  const report = resolve(output, `playwright-${index}.json`);
  const inputManifest = resolve(output, `inputs-${index}.json`);
  if (ui) writeFileSync(inputManifest, JSON.stringify(batch));
  process.stdout.write(
    `Screen batch ${index + 1}/${batches.length}: ${batch.length} trees\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      resolve(appDir, "node_modules/@playwright/test/cli.js"),
      "test",
      ui ? "ui-check.spec.ts" : "screen-check.spec.ts",
      "--reporter",
      "list,json",
      "--output",
      batchOutput,
      ui ? "--max-failures=0" : "--max-failures=1",
      "--workers",
      String(
        Math.min(
          6,
          Math.max(
            1,
            Number.parseInt(process.env.EHR_SCREEN_WORKERS ?? "1", 10) || 1,
          ),
        ),
      ),
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
        EHR_PHYSICAL_SAMPLE_DIR: sampleDirectory,
        EHR_COLLECT_PHYSICAL: "1",
        ...(ui
          ? { EHR_UI_MANIFEST: inputManifest, EHR_UI_FILES: "[]" }
          : { EHR_SCREEN_FILES: JSON.stringify(batch) }),
      },
    },
  );
  if (ui) rmSync(inputManifest, { force: true });
  let status = result.status === 0 ? "pass" : "error";
  let physicalStates = 0;
  let physicalFindings = 0;
  if (existsSync(report)) {
    const json = JSON.parse(readFileSync(report, "utf8"));
    const errors = [];
    const walk = (suite) => {
      for (const spec of suite.specs ?? [])
        for (const test of spec.tests ?? [])
          for (const run of test.results ?? []) {
            errors.push(...(run.errors ?? []));
            for (const attachment of run.attachments ?? [])
              if (ui && attachment.name === "physical-policy") {
                const bytes = attachment.path
                  ? readFileSync(attachment.path)
                  : Buffer.from(attachment.body, "base64");
                const measurement = JSON.parse(bytes.toString());
                physical.push(measurement);
                physicalStates++;
                physicalFindings += measurement.measurements.reduce(
                  (n, sample) => n + sample.findings.length,
                  0,
                );
              }
          }
      for (const child of suite.suites ?? []) walk(child);
    };
    walk(json);
    if (
      result.status !== 0 &&
      !json.errors?.length &&
      errors.length &&
      errors.every(
        (e) => e.matcherResult || /(?:expect\(|expect\.)/.test(e.message ?? ""),
      )
    )
      status = "fail";
    // A missing physical attachment cannot certify a supplied clinical state.
    if (
      ui &&
      batch.length &&
      physicalStates !==
        batch.filter((file) => !/-geometry\.json$/.test(file)).length
    )
      status = "error";
  } else status = "error";
  if (physicalFindings && status !== "error") status = "fail";
  if (status === "error" || (gateStatus !== "error" && status === "fail"))
    gateStatus = status;
  batchResults.push({
    index,
    trees: batch.length,
    status,
    physicalStates,
    physicalFindings,
    exitCode: result.status,
  });
  if (result.error) process.stderr.write(`${result.error.message}\n`);
}
if (ui) {
  const summary = {
    policyStatus: policy.status,
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
      physical,
      batches: batchResults,
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
process.exit(gateStatus === "pass" ? 0 : 1);
