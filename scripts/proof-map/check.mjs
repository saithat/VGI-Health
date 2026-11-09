#!/usr/bin/env node
// Artifact integrity and an offline Chromium navigation check, under the shared lock.
import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "../../app/node_modules/@playwright/test/index.mjs";
import { acquireBrowserLock } from "../browser-heavy-lock.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = resolve(
  process.argv.find((arg) => arg.startsWith("--out="))?.slice(6) ??
    resolve(root, "lean/.lake/proof-map"),
);
const data = JSON.parse(await readFile(resolve(out, "data.json"), "utf8"));
assert.match(data.commit, /^[a-f0-9]{40}$/);
assert.ok(data.decls.length > 1000);
assert.ok(
  data.decls.some((row) => row[9]),
  "Private declarations must remain navigable",
);
const sourceLines = new Map();
const allowed = new Set(["propext", "Classical.choice", "Quot.sound"]);
const dot = await readFile(resolve(out, "imports.dot"), "utf8");
for (const [mod, imports] of data.modules) {
  const file = resolve(root, "lean", mod.replaceAll(".", "/") + ".lean");
  sourceLines.set(mod, (await readFile(file, "utf8")).split("\n"));
  for (const j of imports)
    assert.ok(
      dot.includes(`"${data.modules[j][0]}" -> "${mod}";`),
      `Missing upstream import edge: ${mod}`,
    );
}
for (const row of data.decls) {
  assert.ok(row[3] > 0 && row[4], `Missing source/type: ${row[0]}`);
  assert.ok(
    row[3] <= sourceLines.get(data.modules[row[2]][0]).length,
    `Source line outside file: ${row[0]}`,
  );
  assert.ok(!row[4].endsWith(" …"), `Truncated signature: ${row[0]}`);
  row[10].forEach((ax) => assert.ok(allowed.has(ax), `${row[0]}: ${ax}`));
  for (const j of [...row[6], ...row[7]])
    assert.ok(data.decls[j], `Invalid dependency: ${row[0]}`);
}
for (const page of ["index.html", "imports.html"]) {
  const html = await readFile(resolve(out, page), "utf8");
  const payload =
    /<script[^>]*id="proof-data"[^>]*>([\s\S]*?)<\/script>/.exec(html) ??
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  assert.ok(payload, `Missing embedded data: ${page}`);
  assert.deepEqual(JSON.parse(payload[1]), data);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/);
}
console.log(
  `Artifact integrity passed: ${data.decls.length} declarations, ${data.modules.length} modules; every project import matches upstream DOT.`,
);
if (process.argv.includes("--data-only")) process.exit(0);
assert.ok(process.env.TMPDIR, "Set disk-backed TMPDIR");
const lock = await acquireBrowserLock();
let browser;
try {
  const shots = await mkdtemp(resolve(process.env.TMPDIR, "proof-map-check-"));
  await mkdir(shots, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    offline: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const external = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  await page.goto(pathToFileURL(resolve(out, "index.html")).href);
  await page
    .locator("#title")
    .filter({ hasText: "Ehr.Commit.Mar.reoffers_doses_unique" })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Desktop overflow",
  );
  const headline = data.decls.findIndex(
    (r) => r[0] === "Ehr.Commit.Mar.reoffers_doses_unique",
  );
  const reduce = data.decls.findIndex(
    (r) => r[0] === "Ehr.Commit.Mar.reduce_invariant",
  );
  assert.ok(
    (await page.locator("#source").getAttribute("href")).includes(
      `/${data.commit}/lean/Ehr/Commit/Mar.lean#L60`,
    ),
  );
  assert.match(await page.locator("#axioms").innerText(), /propext/);
  assert.match(await page.locator("#axioms").innerText(), /Quot.sound/);
  assert.doesNotMatch(
    await page.locator("#axioms").innerText(),
    /Classical.choice/,
  );
  assert.match(await page.locator("#assumptions").innerText(), /Invariant s/);
  // A preview near the viewport edge must leave its trigger clickable.
  const edgeResult = page.locator("#results .result").last();
  await edgeResult.hover();
  const triggerBox = await edgeResult.boundingBox();
  const previewBox = await page.locator("#preview").boundingBox();
  assert.ok(triggerBox && previewBox);
  assert.ok(
    previewBox.y + previewBox.height <= triggerBox.y ||
      previewBox.y >= triggerBox.y + triggerBox.height,
    "Preview obscures its trigger",
  );
  await page.keyboard.press("Escape");
  await page.mouse.move(1400, 20);
  const branch = page
    .locator(`#dependencies .branch`)
    .filter({ has: page.locator(`:scope > .node [data-read="${reduce}"]`) })
    .first();
  const toggle = branch.locator(":scope > .node button");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.hover();
  await toggle.locator("span").first().hover();
  await toggle.locator("code").hover();
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator("#preview").isVisible(),
    true,
    "Preview closed while moving inside its trigger",
  );
  assert.equal(
    await page.locator("#preview pre").innerText(),
    data.decls[reduce][4],
  );
  assert.equal(
    await page.locator("#preview .doc").innerText(),
    data.decls[reduce][5] || "No docstring recorded.",
  );
  await page.keyboard.press("Escape");
  await page.mouse.move(1400, 20);
  await branch.locator(`:scope > .node [data-read="${reduce}"]`).click();
  await page.waitForFunction(
    () =>
      document.querySelector("#title").textContent ===
      "Ehr.Commit.Mar.reduce_invariant",
  );
  assert.deepEqual(
    await page
      .locator("#breadcrumb [data-read]")
      .evaluateAll((xs) => xs.map((x) => +x.dataset.read)),
    [headline, reduce],
  );
  await page.keyboard.press("/");
  await page.locator("#search").fill("DosesUnique");
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page
      .locator("#results button")
      .first()
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.locator("#search").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () =>
      document.querySelector("#title").textContent === "Ehr.Multi.DosesUnique",
  );
  const crumb = await page
    .locator("#breadcrumb [data-read]")
    .evaluateAll((xs) => xs.map((x) => +x.dataset.read));
  assert.equal(data.decls[crumb[0]][1], "t");
  assert.ok(data.decls[crumb[0]][8]);
  for (let i = 1; i < crumb.length; i++)
    assert.ok(
      [...data.decls[crumb[i - 1]][6], ...data.decls[crumb[i - 1]][7]].includes(
        crumb[i],
      ),
      "Invalid breadcrumb edge",
    );
  const userToggle = page.locator("#users .toggle:not([disabled])").first();
  assert.ok(
    await userToggle.count(),
    "Expected an expandable reverse dependency",
  );
  await userToggle.click();
  assert.equal(await userToggle.getAttribute("aria-expanded"), "true");
  await userToggle.click();
  assert.equal(await userToggle.getAttribute("aria-expanded"), "false");
  // A definition must expand body dependencies as well as reverse uses.
  const defToggle = page
    .locator("#dependencies .toggle:not([disabled])")
    .first();
  assert.ok(
    await defToggle.count(),
    "Expected an expandable definition dependency",
  );
  await defToggle.click();
  assert.equal(await defToggle.getAttribute("aria-expanded"), "true");
  await page.goto(pathToFileURL(resolve(out, "index.html")).href);
  await page.mouse.move(1400, 20);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: resolve(shots, "proof-map-1440x900.png") });
  await page.locator('a[href="imports.html"]').click();
  await page.locator("#title").filter({ hasText: "Ehr.Commit.Mar" }).waitFor();
  assert.ok(await page.locator("svg path[marker-end]").count());
  await page.locator("#search").fill("Ehr.Multi.Model");
  await page.locator("#search").press("Enter");
  assert.equal(await page.locator("#title").innerText(), "Ehr.Multi.Model");
  await page.screenshot({ path: resolve(shots, "imports-1440x900.png") });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    `Offline Chromium 1440×900 passed: source, both expansion directions, previews, breadcrumbs, keyboard jump and module navigation. Screenshots: ${shots}`,
  );
} finally {
  await browser?.close();
  lock.release();
}
