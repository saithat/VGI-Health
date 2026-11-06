#!/usr/bin/env node
/* global requestAnimationFrame */
import { performance } from "node:perf_hooks";
import { log } from "node:console";
// One Chromium page, sequential actions, HTTP cache enabled, no throttling.
// Usage: node app/scripts/dashboard-benchmark.mjs [base-url] [output.json]
import { chromium, expect as baseExpect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const expect = baseExpect.configure({ timeout: 120000 });
const base = process.argv[2] ?? "http://127.0.0.1:5194";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.clearBrowserCache");
  await cdp.send("Performance.enable");
  const requests = new Map();
  let transfers = [];
  let decodedBodyBytes = 0;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  cdp.on("Network.requestWillBeSent", (e) =>
    requests.set(e.requestId, e.request.url),
  );
  cdp.on("Network.dataReceived", (e) => {
    decodedBodyBytes += e.dataLength;
  });
  cdp.on("Network.loadingFinished", (e) =>
    transfers.push({
      url: requests.get(e.requestId),
      bytes: e.encodedDataLength,
    }),
  );
  const metrics = async () =>
    Object.fromEntries(
      (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
        m.name,
        m.value,
      ]),
    );
  const rows = [];
  const action = async (name, fn) => {
    transfers = [];
    decodedBodyBytes = 0;
    const before = await metrics(),
      start = performance.now();
    await fn();
    // Readiness above includes the loaded replay; allow 500 ms for deferred painting.
    await page.waitForTimeout(500);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const after = await metrics();
    await expect(page.getByRole("alert")).toHaveCount(0);
    const row = {
      name,
      wallMs: Math.round(performance.now() - start),
      bytes: transfers.reduce((n, r) => n + r.bytes, 0),
      decodedBodyBytes,
      mainThreadMs: Math.round(
        1000 * (after.TaskDuration - before.TaskDuration),
      ),
      scriptMs: Math.round(
        1000 * (after.ScriptDuration - before.ScriptDuration),
      ),
      requests: transfers,
    };
    rows.push(row);
    log(JSON.stringify({ ...row, requests: row.requests.length }));
  };
  const nav = (name) =>
    page
      .getByRole("navigation", { name: "Dashboard areas" })
      .getByRole("button", { name, exact: true });
  const single = async () => {
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeEnabled();
    await expect(
      page
        .frameLocator('iframe[title="Recorded EHR"]')
        .locator("html[data-replay-count]"),
    ).toBeVisible();
  };
  const compare = async () => {
    await expect(
      page.locator(".trajectory-comparison .trajectory-frame"),
    ).toHaveCount(2);
    for (const frame of await page
      .locator(".trajectory-comparison .trajectory-frame")
      .all())
      await expect(
        frame.contentFrame().locator("html[data-replay-count]"),
      ).toBeVisible();
  };
  await action("first Evolution", async () => {
    await page.goto(
      `${base}/dashboard?run=core-10day&persona=P1&view=Evolution`,
    );
    await expect(
      page.getByRole("region", { name: "Version history" }),
    ).toBeVisible();
  });
  await action("Evolution → Trajectories (default task)", async () => {
    await nav("Trajectories").click();
    await single();
  });
  await action("open another trajectory", async () => {
    const option = page
      .getByRole("listbox", { name: "Recorded tasks" })
      .getByRole("option")
      .nth(1);
    const id = (await option.locator("strong").textContent())
      .split(" · ")
      .at(-1);
    await option.click();
    await expect(page.locator(".trajectory-playback > h3")).toContainText(id);
    await single();
  });
  await action("Trajectories → Compare (pair)", async () => {
    await nav("Compare").click();
    await compare();
  });
  await action("Compare → Releases", async () => {
    await nav("Releases").click();
    await expect(
      page.getByRole("heading", { name: "Releases", exact: true }),
    ).toBeVisible();
  });
  await action("Releases → Compare", async () => {
    await nav("Compare").click();
    await compare();
  });
  await action("Compare → Trajectories", async () => {
    await nav("Trajectories").click();
    await single();
  });
  await action("Trajectories → Evolution", async () => {
    await nav("Evolution").click();
    await expect(
      page.getByRole("region", { name: "Version history" }),
    ).toBeVisible();
  });
  if (errors.length) throw new Error(errors.join("\n"));
  const report = {
    base,
    run: "core-10day",
    persona: "P1",
    viewport: "1440x900",
    browser: await browser.version(),
    note: "Wall includes a fixed 500 ms settling window after UI readiness and two frames; CDP TaskDuration is renderer main-thread CPU; bytes are CDP encodedDataLength (headers + compressed payload). First action clears browser HTTP cache; later actions retain it. Server caches may be warm.",
    rows,
  };
  if (process.argv[3])
    await writeFile(process.argv[3], JSON.stringify(report, null, 2) + "\n");
} finally {
  await browser.close();
}
