import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { startPainterService } from "../../tests/lean-painter-support";
import type { Output } from "./layout";
import type {} from "../core/buttonAudit";
import { z } from "zod";
const routeSchema = z.object({
  screens: z.array(
    z.object({
      id: z.string(),
      components: z.array(z.object({ id: z.string(), kind: z.unknown() })),
    }),
  ),
});
const gotoSchema = z.object({
  button: z.object({
    action: z.object({ goto: z.object({ screen: z.string() }) }),
  }),
});
declare global {
  interface Window {
    __leanPaint?: Output;
  }
}
const control = (page: Page, id: string, event?: string) =>
  page.locator(
    `[data-comp-id=${JSON.stringify(id)}]${event ? `[data-event=${JSON.stringify(event)}]` : "[data-event]"}`,
  );
async function idle(page: Page) {
  await expect(page.locator("#root")).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#status")).not.toContainText(
    /Error:|differs|rejected|missing|required|does not belong/i,
  );
}
async function reveal(page: Page, control: Locator) {
  const scroll = await control.evaluate((element) => {
    const parent = element.closest<HTMLElement>("[data-box]");
    const output = window.__leanPaint;
    const drawn = output?.boxes.find(
      (d) => d.box.info.id === parent?.dataset.box,
    );
    const clip = drawn?.box.clips[0]?.[1];
    if (!clip || !drawn) return null;
    const rect = element.getBoundingClientRect();
    const delta =
      rect.y < clip.y / 64
        ? rect.y - clip.y / 64
        : rect.bottom > (clip.y + clip.h) / 64
          ? rect.bottom - (clip.y + clip.h) / 64
          : 0;
    const scrollId = drawn.box.clips[0]?.[0];
    const offset = output?.boxes.find((d) => d.box.info.id === scrollId);
    const scrollElement = offset
      ? document.querySelector<HTMLElement>(
          `[data-box="${CSS.escape(offset.box.info.id)}"]`,
        )
      : null;
    const amount = scrollElement?.scrollTop ?? 0;
    const intervals = (output?.boxes ?? [])
      .filter((d) => d.box.clips[0]?.[0] === scrollId)
      .map((d) => ({
        top: d.box.rect.y / 64 - amount,
        bottom: (d.box.rect.y + d.box.rect.h) / 64 - amount,
      }));
    const gap = intervals
      .map((r) => r.bottom + 2)
      .find(
        (y) =>
          y > clip.y / 64 &&
          y < (clip.y + clip.h) / 64 &&
          !intervals.some((r) => y >= r.top && y < r.bottom),
      );
    return {
      x: (clip.x + clip.w / 2) / 64,
      y: gap ?? (clip.y + clip.h / 2) / 64,
      delta,
    };
  });
  if (scroll?.delta) {
    await page.mouse.move(scroll.x, scroll.y);
    await page.mouse.wheel(0, scroll.delta);
    await page.waitForTimeout(150);
  }
}
async function enter(page: Page, id: string, value: string) {
  const input = control(page, id, "enter");
  await reveal(page, input);
  const tag = await input.evaluate((e) => e.tagName);
  if (tag === "SELECT") {
    await input.click();
    await input.selectOption(value);
  } else if ((await input.getAttribute("type")) === "checkbox")
    await input.setChecked(value === "true");
  else {
    await input.click();
    await input.fill(value);
    await input.press("Tab");
  }
  await idle(page);
}
async function click(page: Page, id: string, event = "click") {
  const button = control(page, id, event);
  await reveal(page, button);
  await button.click();
  await idle(page);
}
async function navigate(page: Page, screen: string) {
  if ((await page.locator("#root").getAttribute("data-screen")) === screen)
    return;
  const observed = await page.evaluate(() => ({
    program: window.__buttonAuditSession?.program,
    screen: window.__buttonAuditSession?.snapshot().state.screen,
  }));
  const program = routeSchema.parse(observed.program);
  const pending: { screen: string; path: string[] }[] = [
    { screen: observed.screen ?? "", path: [] },
  ];
  const visited = new Set<string>();
  let path: string[] | undefined;
  while (pending.length) {
    const next = pending.shift();
    if (!next || visited.has(next.screen)) continue;
    if (next.screen === screen) {
      path = next.path;
      break;
    }
    visited.add(next.screen);
    for (const c of program.screens.find((s) => s.id === next.screen)
      ?.components ?? []) {
      const parsed = gotoSchema.safeParse(c.kind);
      if (parsed.success)
        pending.push({
          screen: parsed.data.button.action.goto.screen,
          path: [...next.path, c.id],
        });
    }
  }
  if (!path?.length) throw new Error(`No navigation path to ${screen}`);
  // Navigation links are separate Lean target boxes with their own buttons.
  for (const comp of path) await click(page, comp);
  await expect(page.locator("#root")).toHaveAttribute("data-screen", screen);
}
async function values(
  page: Page,
  screen: string,
  fields: Record<string, string>,
) {
  await navigate(page, screen);
  for (const [id, value] of Object.entries(fields))
    await enter(page, `${screen}.${id}`, value);
}
async function sign(page: Page, screen: string, commit: string) {
  await navigate(page, screen);
  const button = control(page, `${screen}.commit.${commit}`);
  await expect(
    button,
    (await button.getAttribute("title")) ?? "Lean guard",
  ).toBeEnabled();
  for (let attempt = 0; attempt < 10; attempt++) {
    const saved = page
      .waitForResponse(
        (r) =>
          r.url().endsWith("/commit/commands") &&
          r.request().method() === "POST",
        { timeout: 10000 },
      )
      .catch(() => null);
    await button.click();
    await idle(page);
    const ack = page.locator('[data-event="ack"]');
    if (await ack.count()) {
      await differential(page, `alert/${attempt}`);
      await expect(
        page.locator('[data-role="alert"] > svg').first(),
      ).toBeVisible();
      await page.screenshot({
        path: process.env.TMPDIR + `/lean-alert-${attempt}.png`,
      });
      await ack.first().click();
      await idle(page);
      continue;
    }
    const response = await saved;
    expect(response, "No service command").not.toBeNull();
    if (!response) throw new Error("No service response");
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  }
  throw new Error("Interruptive alerts did not settle");
}
const metrics: unknown[] = [];
async function differential(page: Page, label: string) {
  // Blur an editor so the complete Lean semantic text is visible again.
  await page.locator("#root").evaluate((e) => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    e.scrollTop = 0;
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const result = await page.evaluate(() => {
    const output = window.__leanPaint;
    if (!output) throw new Error("No painted Lean output");
    let boxWorst = 0,
      lineWorst = 0,
      glyphWorst = 0,
      vectorWorst = 0,
      boxes = 0,
      lines = 0,
      glyphs = 0;
    const scrolls = new Map(
      output.boxes.map((d) => [
        d.box.info.id,
        document.querySelector<HTMLElement>(
          `[data-box="${CSS.escape(d.box.info.id)}"]`,
        )?.scrollTop ?? 0,
      ]),
    );
    for (const [i, d] of output.boxes.entries()) {
      const element = document.querySelector<HTMLElement>(
        `[data-box="${CSS.escape(d.box.info.id)}"]`,
      );
      if (!element) throw new Error(`Missing ${d.box.info.id}`);
      const rect = element.getBoundingClientRect(),
        expected = d.box.rect;
      const dy = d.box.clips.reduce((s, [id]) => s + (scrolls.get(id) ?? 0), 0);
      boxWorst = Math.max(
        boxWorst,
        Math.abs(rect.x - expected.x / 64),
        Math.abs(rect.y - (expected.y / 64 - dy)),
        Math.abs(rect.width - expected.w / 64),
        Math.abs(rect.height - expected.h / 64),
      );
      boxes++;
      const svg = element.querySelector("svg");
      const text = element.querySelector<HTMLElement>(":scope > .lean-lines");
      if (text) {
        const inset = d.box.info.text?.inset ?? 0;
        lineWorst = Math.max(
          lineWorst,
          Math.abs(text.getBoundingClientRect().x - rect.x - inset / 64),
          Math.abs(
            text.getBoundingClientRect().width - (expected.w - inset) / 64,
          ),
        );
      }
      const mark = d.box.info.mark;
      if (svg && typeof mark === "object" && "plot" in mark) {
        const matrix = svg.getScreenCTM();
        for (const line of svg.querySelectorAll("polyline")) {
          vectorWorst = Math.max(
            vectorWorst,
            Math.abs(
              Number(line.getAttribute("stroke-width")) - mark.plot.stroke,
            ) / 64,
            Math.abs(
              (matrix?.a ?? 0) * Number(line.getAttribute("stroke-width")) -
                mark.plot.stroke / 64,
            ),
          );
        }
      }
      element
        .querySelectorAll<HTMLElement>(":scope > .lean-lines > [data-line]")
        .forEach((line, j) => {
          lineWorst = Math.max(
            lineWorst,
            Math.abs(
              line.getBoundingClientRect().width -
                (output.lineWidths[i]?.[j] ?? 0) / 64,
            ),
          );
          lines++;
          const cells = [...line.querySelectorAll<HTMLElement>("[data-glyph]")];
          // Scalar order can differ in isolated Hebrew runs; use each assigned cell.
          for (const cell of cells) {
            const range = document.createRange();
            range.selectNodeContents(cell);
            glyphWorst = Math.max(
              glyphWorst,
              Math.abs(
                range.getBoundingClientRect().width -
                  parseFloat(cell.style.width),
              ),
            );
            glyphs++;
          }
        });
    }
    return {
      boxes,
      lines,
      glyphs,
      boxWorst,
      lineWorst,
      glyphWorst,
      vectorWorst,
      layoutMs: Number(document.getElementById("root")?.dataset.layoutMs),
    };
  });
  expect(result.boxWorst, label).toBe(0);
  expect(result.lineWorst, label).toBeLessThanOrEqual(1 / 64);
  expect(result.glyphWorst, label).toBeLessThanOrEqual(1 / 64);
  expect(result.vectorWorst, label).toBeLessThanOrEqual(1 / 64);
  metrics.push({ label, ...result });
  const evidence = process.env.TMPDIR + "/painter-parity/measurements";
  mkdirSync(evidence, { recursive: true });
  writeFileSync(
    `${evidence}/${label.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`,
    JSON.stringify({ label, ...result }, null, 2),
  );
  const shots = process.env.DENSE_LAYOUT_SHOTS;
  if (
    shots &&
    [
      "P1/landing",
      "P1/document",
      "P1/orders",
      "P1/sign",
      "P3/assessment",
    ].includes(label)
  ) {
    const ui = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().ui,
    );
    if (!ui) throw Error("Missing screenshot state");
    const dir = `${shots}/${label.replace("/", "-")}`;
    mkdirSync(dir, { recursive: true });
    await page.locator("[data-box]").evaluateAll((elements) =>
      elements.forEach((e) => {
        e.scrollTop = 0;
      }),
    );
    await page.screenshot({ path: `${dir}/dense.png` });
    writeFileSync(`${dir}/screen.json`, JSON.stringify(ui));
    const vendor = await page.context().newPage();
    try {
      await vendor.goto("/screen-check.html");
      await vendor.waitForFunction(() => typeof window.renderUi === "function");
      await vendor.evaluate((screen) => window.renderUi?.(screen), ui);
      await vendor.evaluate(() => document.fonts.ready);
      await vendor.screenshot({ path: `${dir}/vendor.png` });
    } finally {
      await vendor.close();
    }
    writeFileSync(
      `${dir}/evidence.json`,
      JSON.stringify(
        {
          label,
          viewport: page.viewportSize(),
          referenceLayout: await page
            .locator("#root")
            .getAttribute("data-reference-layout"),
          ...result,
        },
        null,
        2,
      ),
    );
  }
}

for (const persona of ["P1", "P3"])
  test(`${persona}: complete clinical task through WASM layout and the real commit service`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    test.skip(
      !process.env.DATABASE_URL,
      "Needs an isolated Postgres DATABASE_URL",
    );
    const service = await startPainterService(persona);
    try {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() =>
        document.addEventListener(
          "lean-paint",
          (event) => {
            if (event instanceof CustomEvent) window.__leanPaint = event.detail;
          },
          true,
        ),
      );
      await page.route(/\/src\/data\/commitService\.ts(?:\?.*)?$/, (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body: `
      export class MarRejected extends Error {} export class MarConflict extends Error {}
      export async function marRequest(path,body) {
        const r=await fetch('/commit'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
        const data=await r.json();if(!r.ok)throw new Error(JSON.stringify(data));return data;
      }
      export const openMar=body=>marRequest('/sessions',body);
      export const marEvent=(s,event)=>marRequest('/sessions/'+s.sessionId+'/events',{revision:s.revision,event});
      export const restoreMar=()=>marRequest('/me'); export const loginMar=()=>{}; export const logoutMar=()=>{};
      export const marCommit=()=>{throw new Error('Unexpected MAR command')};export const subscribeMar=()=>()=>{};
    `,
        }),
      );
      await page.route("**/commit/**", async (route) => {
        // Test-only authenticated transport to a real isolated service.
        // eslint-disable-next-line boundary/single-data-module
        const response = await page.request.fetch(
          service.base +
            new URL(route.request().url()).pathname.replace(/^\/commit/, "") +
            new URL(route.request().url()).search,
          {
            method: route.request().method(),
            headers: {
              Authorization: `Bearer ${service.tokens[persona]}`,
              "Content-Type": "application/json",
            },
            ...(route.request().postData()
              ? { data: route.request().postData() ?? "" }
              : {}),
          },
        );
        await route.fulfill({ response });
      });
      await page.goto(
        `/lean.html?persona=${persona}&audit=buttons&date=2026-11-15`,
      );
      await expect(page.locator("#root")).toHaveAttribute(
        "data-accepted",
        "true",
      );
      await idle(page);
      await differential(page, `${persona}/landing`);
      await click(page, "workspace.lookup");
      await enter(page, "workspace.search", "Painter");
      const open = page
        .locator('[data-comp-id^="workspace.open|"][data-event="click"]')
        .first();
      await reveal(page, open);
      await open.click();
      await idle(page);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.__buttonAuditSession?.snapshot().state.patientContext
                ?.bound,
          ),
        )
        .toBe("painter-patient");
      if (persona === "P1") {
        await values(page, "w1Rooming", {
          weight: "93.4",
          chiefComplaint: "Hypertension follow-up",
        });
        // Reviews are actual guarded, persisted interactions.
        for (const id of ["w1Rooming.review.allergyList"])
          if (await control(page, id).count()) await click(page, id);
        await values(page, "w1MedRec", { decision0: "continue" });
        await values(page, "w1Hpi", {
          hpi: "Blood pressure stable. No adverse medication effects.",
          ros: "No chest pain or dyspnea.",
        });
        const note = control(page, "w1Hpi.hpi", "enter");
        await reveal(page, note);
        await note.click();
        await note.press("End");
        await note.press("ArrowLeft");
        const caret = await note.evaluate((e) =>
          e instanceof HTMLTextAreaElement ? e.selectionStart : -1,
        );
        await note.pressSequentially(" stable", { delay: 5 });
        await idle(page);
        expect(await note.evaluate((e) => e === document.activeElement)).toBe(
          true,
        );
        expect(
          await note.evaluate((e) =>
            e instanceof HTMLTextAreaElement ? e.selectionStart : -1,
          ),
        ).toBe(caret + 7);
        await note.press("Tab");
        await values(page, "w1Exam", {
          exam: "Comfortable, normal heart and lungs.",
          assessmentPlan: "Continue treatment and monitor blood pressure.",
          visitDiagnosis: "I10",
        });
        await differential(page, "P1/document");
        await values(page, "w1Close", {
          claimDiagnosis: "I10",
          levelOfService: "99213",
          followUp: "4 weeks",
          patientInstructions: "Check blood pressure daily.",
        });
        await sign(page, "w1Close", "signNote");
        await navigate(page, "w1Orders");
        await click(
          page,
          process.env.LEAN_PAINTER_TEST_ALERT === "1"
            ? "w1Orders.prefAmoxicillin"
            : "w1Orders.prefLisinopril",
        );
        for (let n = 0; n < 30; n++) {
          const confirm = page.locator('[data-event="confirm"]');
          if (!(await confirm.count())) break;
          await reveal(page, confirm.first());
          await confirm.first().click();
          await idle(page);
        }
        await values(page, "w1Orders", {
          dosingWeight: "93.4",
          indication: "Hypertension",
          pharmacy: "Community pharmacy",
          substitution: "true",
          prn: "false",
          orderDiagnosis: "I10",
        });
        await differential(page, "P1/orders");
        await navigate(page, "w1Sign");
        await enter(page, "w1Sign.patientIdReentry", "AP/M/58");
        await differential(page, "P1/sign");
        const saved = await sign(page, "w1Sign", "signOrders");
        expect(
          saved.links.some((s: string) => s.includes("MedicationRequest/")),
        ).toBe(true);
      } else {
        await values(page, "w4Flowsheet", {
          bpSystolic: "120",
          bpDiastolic: "80",
          heartRate: "72",
          respRate: "16",
          temperature: "37",
          spo2: "98",
          painReassessment: "0",
          nursingAssessment: "Comfortable, vital signs stable.",
        });
        await differential(page, "P3/assessment");
        const saved = await sign(page, "w4Flowsheet", "chartAssessment");
        expect(
          saved.links.some((s: string) => s.includes("Observation/")),
        ).toBe(true);
      }
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 1920, height: 1080 },
      ]) {
        await page.setViewportSize(viewport);
        await expect(page.locator("#root")).toHaveCSS(
          "width",
          `${viewport.width}px`,
        );
        await differential(page, `${persona}/${viewport.width}`);
      }
      await page.setViewportSize({ width: 1000, height: 800 });
      await expect(page.locator("#root")).toHaveAttribute("inert", "");
      await expect(page.locator("#root")).not.toHaveAttribute(
        "data-accepted",
        "true",
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(page.locator("#root")).toHaveAttribute(
        "data-accepted",
        "true",
      );
      expect(errors).toEqual([]);
      await page.screenshot({
        path: process.env.TMPDIR + `/lean-painter-${persona}.png`,
      });
    } finally {
      await service.close();
      writeFileSync(
        process.env.TMPDIR + "/lean-painter-browser-metrics.json",
        JSON.stringify(metrics, null, 2) + "\n",
      );
    }
  });

test("rich widgets: WASM geometry and text agree with DOM at every desktop viewport", async ({
  page,
}) => {
  const fixtures = z
    .record(z.string(), z.unknown())
    .parse(
      JSON.parse(
        readFileSync(
          new URL("../../tests/data/lean-widgets.json", import.meta.url),
          "utf8",
        ),
      ),
    );
  // New specification for owner review: five alerts plus an acknowledgment
  // occupy six strip occurrences, including their Lean-bound severity plots.
  const strip = z
    .object({})
    .passthrough()
    .parse(structuredClone(fixtures.alert));
  const urgent: unknown[] = Array.from({ length: 5 }, (_, i) => ({
    alert: {
      comp: `urgent:${i}`,
      alertId: `a${i}`,
      label: "Review recorded allergy ".repeat(30),
      severity: "interruptive",
    },
  }));
  urgent.push({
    button: {
      comp: "ack",
      label: "Acknowledge",
      role: "ack",
      enabled: true,
      blockedReason: null,
      hotkey: null,
    },
  });
  strip.urgent = urgent;
  fixtures["alert-strip"] = strip;
  const { uiScreenSchema } = await import("../ehr/ui/types");
  const directory = process.env.TMPDIR + "/painter-parity";
  mkdirSync(directory, { recursive: true });
  await page.goto("/tests/lean-widget-preview.html");
  await page.waitForFunction(
    () => typeof window.paintLeanWidget === "function",
  );
  for (const [kind, raw] of Object.entries(fixtures)) {
    const screen = uiScreenSchema.parse(raw);
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      const accepted = await page.evaluate(
        (screen) => window.paintLeanWidget?.(screen).accepted,
        screen,
      );
      expect(accepted, kind).toBe(true);
      await expect(page.locator("#root")).toHaveAttribute(
        "data-reference-layout",
        "dense",
      );
      await differential(page, `${kind}/${viewport.width}`);
      if (viewport.width === 1440)
        await page.screenshot({ path: `${directory}/${kind}.png` });
    }
  }
  writeFileSync(
    `${directory}/layout-metrics.json`,
    JSON.stringify(metrics, null, 2),
  );
});

async function connectService(
  page: Page,
  persona: string,
  base: string,
  token: string,
) {
  await page.addInitScript(() => {
    const target = new URL(location.href);
    target.searchParams.delete("code");
    target.searchParams.delete("state");
    sessionStorage.setItem(
      "vgi.mar.login",
      JSON.stringify({
        verifier: "synthetic-painter",
        state: "painter",
        returnTo: target.pathname + target.search,
      }),
    );
    document.addEventListener(
      "lean-paint",
      (event) => {
        if (event instanceof CustomEvent) window.__leanPaint = event.detail;
      },
      true,
    );
  });
  await page.route("**/protocol/openid-connect/token", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        access_token: token,
        refresh_token: `synthetic-${persona}`,
        expires_in: 1800,
      }),
    }),
  );
  await page.route("**/commit/**", async (route) => {
    const url = new URL(route.request().url());
    // SSE is independent notification transport; the MAR session also refreshes
    // immediately after its accepted command. Do not buffer an endless stream.
    if (url.pathname.endsWith("/events") && route.request().method() === "GET")
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": test connection\n\n",
      });
    // eslint-disable-next-line boundary/single-data-module
    const response = await page.request.fetch(
      base + url.pathname.replace(/^\/commit/, "") + url.search,
      {
        method: route.request().method(),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(route.request().postData()
          ? { data: route.request().postData() ?? "" }
          : {}),
      },
    );
    await route.fulfill({ response });
  });
}

test("P2 board: complete a note in one patient pane and preserve the other patient", async ({
  page,
}) => {
  const service = await startPainterService("P2");
  try {
    await connectService(page, "P2", service.base, service.tokens.P2 ?? "");
    await page.goto(
      "/lean.html?persona=P2&audit=buttons&date=2026-11-15&patients=painter-patient,painter-second&code=painter&state=painter",
    );
    await expect(page.locator("#root")).toHaveAttribute(
      "data-accepted",
      "true",
    );
    const boardReady = async () => {
      await idle(page);
      await expect(page.locator("#root")).toHaveAttribute("data-reference-layout", "dense");
    };
    await boardReady();
    const scoped = (comp: string, event = "click") =>
      page.locator(
        `[data-patient="painter-patient"] [data-comp-id="${comp}"][data-event="${event}"]`,
      );
    const act = async (comp: string) => {
      const target = scoped(comp);
      await reveal(page, target);
      await target.click();
      await boardReady();
    };
    const fill = async (comp: string, value: string) => {
      const target = scoped(comp, "enter");
      await reveal(page, target);
      const tag = await target.evaluate((e) => e.tagName);
      if (tag === "SELECT") await target.selectOption(value);
      else {
        await target.fill(value);
        await target.press("Tab");
      }
      await boardReady();
    };
    await act("workspace.lookup");
    await fill("workspace.search", "Alex");
    const open = page
      .locator(
        '[data-patient="painter-patient"] [data-comp-id^="workspace.open|painter-patient|"]',
      )
      .first();
    await reveal(page, open);
    await open.click();
    await boardReady();
    const other = (comp: string, event = "click") =>
      page.locator(
        `[data-patient="painter-second"] [data-comp-id="${comp}"][data-event="${event}"]`,
      );
    await reveal(page, other("workspace.lookup"));
    await other("workspace.lookup").click();
    await boardReady();
    await reveal(page, other("workspace.search", "enter"));
    await other("workspace.search", "enter").fill("Blair");
    await other("workspace.search", "enter").press("Tab");
    await boardReady();
    const openOther = page
      .locator(
        '[data-patient="painter-second"] [data-comp-id^="workspace.open|painter-second|"]',
      )
      .first();
    await reveal(page, openOther);
    await openOther.click();
    await boardReady();
    if (await scoped("chartSummary.patientCare.w3Triage").count())
      await act("chartSummary.patientCare.w3Triage");
    else {
      if (await scoped("home.work.w3TrackBoard").count())
        await act("home.work.w3TrackBoard");
      await act("w3TrackBoard.nav.w3Triage");
    }
    for (const [id, value] of Object.entries({
      chiefComplaint: "Headache",
      triageAcuity: "3",
      arrivalMode: "walk-in",
      weight: "80",
      bpSystolic: "120",
      bpDiastolic: "80",
      heartRate: "72",
      respRate: "16",
      temperature: "37",
      spo2: "98",
      painScore: "2",
      isolationScreen: "false",
    }))
      await fill(`w3Triage.${id}`, value);
    if (await scoped("w3Triage.review.allergyList").count())
      await act("w3Triage.review.allergyList");
    await act("w3Triage.next");
    for (const [id, value] of Object.entries({
      hpi: "Mild headache, no red flags.",
      ros: "Otherwise negative.",
      exam: "Alert with normal neurologic examination.",
      assessmentPlan: "Supportive care and return precautions.",
      medRecDecision: "continue",
      claimDiagnosis: "R51.9",
      levelOfService: "99213",
    }))
      await fill(`w3Provider.${id}`, value);
    await act("w3Provider.nav.w3Disposition");
    await act("w3Disposition.dischargeGroup");
    for (const [id, value] of Object.entries({
      visitDiagnosis: "R51.9",
      patientInstructions: "Return for worsening headache or new symptoms.",
      followUp: "Primary care in one week",
    }))
      await fill(`w3Disposition.${id}`, value);
    await act("w3Disposition.nav.w3Provider");
    for (const [width, height] of [[1280, 800], [1920, 1080], [1440, 900]] as const) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => page.evaluate(() => window.__leanPaint?.viewport.w)).toBe(width * 64);
      await boardReady();
      await differential(page, `P2/board-note-${width}`);
    }
    await expect(scoped("w3Provider.commit.signNote")).toBeEnabled();
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/commit/commands") && r.request().method() === "POST",
    );
    await act("w3Provider.commit.signNote");
    const response = await saved;
    expect(response.status(), await response.text()).toBe(201);
    expect(await response.text()).toContain("DocumentReference/");
    await expect(other("chartSummary.patientCare.w3Triage")).toBeEnabled();
    const untouched = await page.request.get(
      service.base + "/patients/painter-second",
      { headers: { Authorization: `Bearer ${service.tokens.P2}` } },
    );
    expect(untouched.status()).toBe(200);
    expect((await untouched.json()).version).toBe(1);
    const unchanged = await page.request.get(
      service.base + "/patients/painter-second",
      { headers: { Authorization: `Bearer ${service.tokens.P2}` } },
    );
    expect(unchanged.status()).toBe(200);
    expect((await unchanged.json()).version).toBe(1);
    const directory = process.env.TMPDIR + "/painter-parity";
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: directory + "/board-live.png" });
  } finally {
    await service.close();
  }
});

test("P3: administer one scheduled medication through the time-grid action and shared dose service", async ({
  page,
}) => {
  const service = await startPainterService("P3");
  try {
    await connectService(page, "P3", service.base, service.tokens.P3 ?? "");
    await page.goto(
      "/lean.html?persona=P3&audit=buttons&marPatient=painter-patient&marRelease=mar&marWorkflow=dose&code=painter&state=painter",
    );
    await expect(page.locator("#root")).toHaveAttribute(
      "data-accepted",
      "true",
    );
    await navigate(page, "w4Worklist");
    await click(page, "w4Worklist.review.allergyList");
    await click(page, "w4Worklist.toMar");
    await expect(page.locator('[data-kind="gridCell"]').first()).toBeAttached();
    await differential(page, "P3/time-grid");
    const directory = process.env.TMPDIR + "/painter-parity";
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: directory + "/timeGrid-live.png" });
    await click(page, "w4Mar.openDue");
    await enter(page, "w4Admin.wristbandScan", "painter-patient");
    await enter(page, "w4Admin.medScan", "amoxicillin");
    await enter(page, "w4Admin.adminStatus", "given");
    await enter(
      page,
      "w4Admin.adminReason",
      "Scheduled medication administered",
    );
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/commit/commands") && r.request().method() === "POST",
    );
    await click(page, "w4Admin.commit.administerMed");
    const response = await saved;
    expect(response.status(), await response.text()).toBe(201);
    const persisted = z
      .object({
        outcome: z.literal("persisted"),
        mar: z.array(z.record(z.string(), z.unknown())),
      })
      .parse(await response.json());
    expect(persisted.mar.some((event) => "administered" in event)).toBe(true);
    const refreshed = await page.request.get(
      service.base + "/patients/painter-patient",
      { headers: { Authorization: `Bearer ${service.tokens.P3}` } },
    );
    expect(refreshed.status()).toBe(200);
    const chart = z
      .object({
        snapshot: z.object({
          bundle: z.object({
            entry: z.array(
              z.object({
                resource: z
                  .object({
                    resourceType: z.string(),
                    status: z.string().optional(),
                  })
                  .passthrough(),
              }),
            ),
          }),
        }),
      })
      .parse(await refreshed.json());
    expect(
      chart.snapshot.bundle.entry.filter(
        (e) => e.resource.resourceType === "MedicationAdministration",
      ),
    ).toHaveLength(1);
  } finally {
    await service.close();
  }
});
