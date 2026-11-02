import { resolve, dirname,basename } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import { digest, contextDigest, cachedTree, recordBatch } from "./screen-cache.mjs";
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
let cache;
let checkedFiles = files;
if (ui && process.env.EHR_SCREEN_CACHE !== "0") {
  const { chromium } = await import("@playwright/test");
  const sources = ["e2e/ui-check.spec.ts", "e2e/geometry-capture.ts", "playwright.config.ts", "src/ehr/ui/fidelity.ts", "src/ehr/ui/display.tsx", "src/ehr/ui/types.ts", "scripts/screen-check.mjs", "scripts/screen-cache.mjs"];
  const context = contextDigest({
    app: JSON.parse(readFileSync(resolve(appDir, "dist/build.json"), "utf8")),
    sources: sources.map((file) => [file, digest(readFileSync(resolve(appDir, file)))]),
    browser: digest(readFileSync(chromium.executablePath())),
    playwright: digest(readFileSync(resolve(appDir, "node_modules/@playwright/test/package.json"))),
    presentations: process.env.EHR_PRESENTATION_BUNDLE ? digest(readFileSync(process.env.EHR_PRESENTATION_BUNDLE)) : null,
    node: process.version, platform: process.platform,
    minimumFont: process.env.EHR_MIN_FONT_PX ?? "12", projects: ["desktop", "narrow"],
  });
  const directory = resolve(process.env.EHR_SCREEN_CACHE_DIR ?? resolve(appDir, "../runs/screen-check-cache"), context);
  const entries = files.map((file) => {
    const sha256 = digest(readFileSync(file));
    return { file, sha256, reused: cachedTree(directory, context, sha256) && existsSync(resolve(directory,"geometry",`${sha256}.json`)) };
  });
  checkedFiles = entries.filter((entry) => !entry.reused).map((entry) => entry.file);
  cache = { context, directory, entries };
  process.env.EHR_GEOMETRY_DIR = resolve(directory,"geometry");
  process.stdout.write(`Whole-version screen coverage: ${entries.length} trees; ${entries.length - checkedFiles.length} identical certified trees reused, ${checkedFiles.length} checked now. Context ${context}. Known-bad controls always run.\n`);
}
const port = process.env.APP_TEST_PORT ?? await new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(() => resolve(String(port)));
  });
});
const output = mkdtempSync(resolve(tmpdir(), "ehr-visibility-"));
const report = resolve(output, "playwright.json");
if(ui&&!process.env.EHR_GEOMETRY_DIR)process.env.EHR_GEOMETRY_DIR=resolve(output,'geometry');
const result = spawnSync(
  process.execPath,
  [
    resolve(appDir, "node_modules/@playwright/test/cli.js"),
    "test",
    ui ? "ui-check.spec.ts" : "screen-check.spec.ts",
    "--reporter", "list,json", "--output", output, "--max-failures=1", "--workers", String(Math.max(1, Number.parseInt(process.env.EHR_SCREEN_WORKERS ?? "1", 10) || 1)),
    "--config",
    resolve(appDir, "playwright.config.ts"),
  ],
  {
    cwd: appDir,
    stdio: "inherit",
    env: {
      ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: report, APP_TEST_PORT: port, APP_TEST_PREVIEW: "1",
      [ui ? "EHR_UI_FILES" : "EHR_SCREEN_FILES"]: JSON.stringify(checkedFiles),
    },
  },
);
let gateStatus = result.status === 0 ? "pass" : "error";
if (result.status !== 0 && existsSync(report)) {
  const json = JSON.parse(readFileSync(report, "utf8"));
  const errors = [];
  const walk = (s) => {
    for (const spec of s.specs ?? []) for (const test of spec.tests ?? []) for (const r of test.results ?? []) errors.push(...(r.errors ?? []));
    for (const child of s.suites ?? []) walk(child);
  };
  walk(json);
  // Only structured assertion errors count as a failed safety gate. Startup,
  // navigation and rendering infrastructure exceptions remain errors.
  if (!(json.errors?.length) && errors.length && errors.every((e) => e.matcherResult || /(?:expect\(|expect\.)/.test(e.message ?? ""))) gateStatus = "fail";
}
if (process.env.EHR_SCREEN_RESULT) writeFileSync(process.env.EHR_SCREEN_RESULT, JSON.stringify({status:gateStatus, geometry:ui?files.flatMap(file=>[`${digest(readFileSync(file))}.json`,`${digest(readFileSync(file))}.background.json`].map(name=>({path:resolve(process.env.EHR_GEOMETRY_DIR,name),sample:/^(workspace-d\d+)-/.exec(basename(file))?.[1]??basename(dirname(file))}))).filter(item=>existsSync(item.path)).map(item=>({...JSON.parse(readFileSync(item.path,'utf8')),sample:item.sample})):[]}));
if (cache) {
  const receipt = recordBatch(cache.directory, cache.context, cache.entries, cache.entries.filter((entry) => !entry.reused).map((entry) => entry.sha256), result.status === 0);
  process.stdout.write(`Whole-version coverage receipt: ${receipt}\n`);
}
if (result.status === 0) rmSync(output, { recursive: true, force: true });
else process.stderr.write(`Screen-check artifacts: ${output}\n`);
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
