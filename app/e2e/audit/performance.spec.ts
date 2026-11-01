import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

test("performance: cold dashboard and EHR round trip", async ({ browser, baseURL }) => {
  const result: object[] = [];
  for (const host of ["127.0.0.1", "vgi-audit.example.ts.net"]) {
    const context = await browser.newContext();
    // Route to loopback while sending a real non-localhost Host header.
    const origin = (baseURL ?? "").replace("127.0.0.1", host);
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    let bytes = 0, requests = 0, wasmRequests = 0;
    client.on("Network.loadingFinished", event => { bytes += event.encodedDataLength; });
    client.on("Network.requestWillBeSent", event => { requests++; if (event.request.url.includes(".wasm")) wasmRequests++; });
    const measure = async (label: string, action: () => Promise<unknown>, ready: string) => {
      bytes = 0; requests = 0; wasmRequests = 0;
      const start = Date.now();
      await action();
      await page.locator(ready).first().waitFor({ timeout: 60000 });
      const interactiveMs = Date.now() - start;
      await page.waitForTimeout(250);
      result.push({ host, label, bytes, requests, interactiveMs, wasmRequests });
    };
    await measure("cold dashboard", () => page.goto(`${origin}/dashboard?run=run1-P3`), '[aria-label="Version history"]');
    await page.close();
    const chart = await context.newPage();
    await chart.goto(`${origin}/ehr?mode=replay&persona=P3`);
    await chart.locator('.clinical-app').waitFor({ timeout: 60000 });
    const chartClient = await context.newCDPSession(chart);
    await chartClient.send("Network.enable");
    chartClient.on("Network.loadingFinished", event => { bytes += event.encodedDataLength; });
    chartClient.on("Network.requestWillBeSent", event => { requests++; if (event.request.url.includes(".wasm")) wasmRequests++; });
    // Standard anchors exercise either document navigation (before) or the shell router (after).
    const switchTo = async (path: string, ready: string) => {
      bytes = 0; requests = 0; wasmRequests = 0;
      const start = Date.now();
      await chart.evaluate(path => { const a = document.createElement('a'); a.href = path; a.id = 'performance-route'; a.textContent = 'Route'; document.body.append(a); }, path);
      await chart.locator('#performance-route').click();
      await chart.locator(ready).first().waitFor({ timeout: 60000 });
      const interactiveMs = Date.now() - start;
      await chart.waitForTimeout(250);
      await chart.locator('#performance-route').evaluateAll(nodes => nodes.forEach(n => n.remove()));
      result.push({ host, label: path.startsWith('/dashboard') ? "EHR → dashboard" : "dashboard → EHR", bytes, requests, interactiveMs, wasmRequests });
    };
    await switchTo('/dashboard?run=run1-P3', '[aria-label="Version history"]');
    await switchTo('/ehr?mode=replay&persona=P3', '.clinical-app');
    await expect(chart.getByRole('alert')).toHaveCount(0);
    await context.close();
  }
  mkdirSync(resolve('../docs/audits'), { recursive: true });
  writeFileSync(resolve(`../docs/audits/performance-${process.env.AUDIT_PHASE ?? "after"}.json`), JSON.stringify(result, null, 2) + '\n');
  console.log(result);
});
