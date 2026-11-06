import { z } from "zod";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

test("performance: cold dashboard and EHR round trip", async ({
  browser,
  baseURL,
  request,
}) => {
  const run = encodeURIComponent(process.env.AUDIT_RUN ?? "core-10day");
  console.log(`Performance recording: ${decodeURIComponent(run)}`);
  if (process.env.AUDIT_PHASE !== "before") {
    console.log("Checking compressed WASM response");
    const manifest = z
      .object({ leanSourceHash: z.string() })
      .parse(await (await request.get("/ehr/manifest.json")).json());
    const wasm = await request.get(
      `/ehr/ehr-interp.wasm?v=${manifest.leanSourceHash}`,
      { headers: { "Accept-Encoding": "gzip" } },
    );
    expect(wasm.headers()["content-encoding"]).toBe("gzip");
    expect(wasm.headers()["cache-control"]).toContain("immutable");
    expect([...new Uint8Array(await wasm.body()).slice(0, 4)]).toEqual([
      0, 97, 115, 109,
    ]);
  }
  const result: {
    host: string;
    label: string;
    bytes: number;
    requests: number;
    interactiveMs: number;
    wasmRequests: number;
  }[] = [];
  for (const host of ["127.0.0.1", "vgi-audit.example.ts.net"]) {
    console.log(`Measuring ${host}`);
    const context = await browser.newContext();
    // Route to loopback while sending a real non-localhost Host header.
    const origin = (baseURL ?? "").replace("127.0.0.1", host);
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    let bytes = 0,
      requests = 0,
      wasmRequests = 0;
    client.on("Network.loadingFinished", (event) => {
      bytes += event.encodedDataLength;
    });
    client.on("Network.requestWillBeSent", (event) => {
      requests++;
      if (event.request.url.includes(".wasm")) wasmRequests++;
    });
    const measure = async (
      label: string,
      action: () => Promise<unknown>,
      ready: string,
    ) => {
      bytes = 0;
      requests = 0;
      wasmRequests = 0;
      const start = Date.now();
      console.log(`Starting ${label}`);
      await action();
      await page.locator(ready).first().waitFor({ timeout: 60000 });
      const interactiveMs = Date.now() - start;
      await page.waitForTimeout(250);
      result.push({
        host,
        label,
        bytes,
        requests,
        interactiveMs,
        wasmRequests,
      });
    };
    await measure(
      "cold dashboard",
      () => page.goto(`${origin}/dashboard?run=${run}`),
      '[aria-label="Version history"]',
    );
    await page.close();
    const chart = await context.newPage();
    await chart.goto(`${origin}/ehr?mode=replay&persona=P3`);
    console.log("Opened canonical EHR");
    await chart.locator(".clinical-app").waitFor({ timeout: 60000 });
    const timeOrigin = await chart.evaluate(() => performance.timeOrigin);
    const chartClient = await context.newCDPSession(chart);
    await chartClient.send("Network.enable");
    chartClient.on("Network.loadingFinished", (event) => {
      bytes += event.encodedDataLength;
    });
    chartClient.on("Network.requestWillBeSent", (event) => {
      requests++;
      if (event.request.url.includes(".wasm")) wasmRequests++;
    });
    // Activate a standard anchor through the document's navigation handler.
    // No layout measurement is involved in this transport/cache audit.
    const switchTo = async (path: string, ready: string) => {
      bytes = 0;
      requests = 0;
      wasmRequests = 0;
      const start = Date.now();
      console.log(`Switching to ${path}`);
      await chart.evaluate((path) => {
        const a = document.createElement("a");
        a.href = path;
        a.textContent = "Route";
        document.body.append(a);
        a.click();
        a.remove();
      }, path);
      await chart.locator(ready).first().waitFor({ timeout: 60000 });
      const interactiveMs = Date.now() - start;
      await chart.waitForTimeout(250);
      result.push({
        host,
        label: path.startsWith("/dashboard")
          ? "EHR → dashboard"
          : "dashboard → EHR",
        bytes,
        requests,
        interactiveMs,
        wasmRequests,
      });
    };
    await switchTo(`/dashboard?run=${run}`, '[aria-label="Version history"]');
    await switchTo("/ehr?mode=replay&persona=P3", ".clinical-app");
    await expect(chart.getByRole("alert")).toHaveCount(0);
    if (process.env.AUDIT_PHASE !== "before") {
      expect(await chart.evaluate(() => performance.timeOrigin)).toBe(
        timeOrigin,
      );
      const measures = result.filter((r) => r.host === host);
      expect(measures.every((r) => r.wasmRequests === 0)).toBe(true);
      expect(
        measures.find((r) => r.label === "cold dashboard")?.requests ??
          Infinity,
      ).toBeLessThan(30);
      expect(
        measures.find((r) => r.label === "cold dashboard")?.bytes ?? Infinity,
      ).toBeLessThan(1000000);
    }
    await context.close();
  }
  mkdirSync(resolve("../docs/audits"), { recursive: true });
  writeFileSync(
    resolve(
      `../docs/audits/performance-${process.env.AUDIT_PHASE ?? "after"}.json`,
    ),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(result);
});
