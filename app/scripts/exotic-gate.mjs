/* global window, document, Element, getComputedStyle, requestAnimationFrame, structuredClone, console */
/** Independent, additive sandbox gate. No certificate or deployment side effects. */
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { chromium } from "../node_modules/@playwright/test/index.mjs";
import { pathToFileURL } from "node:url";
import { captureSettings, captureCss, waitForCaptureFonts } from "../e2e/capture-environment.ts";
export function atoms(nodes) {
  return nodes.flatMap((n) => {
    const [kind, v] = Object.entries(n)[0];
    return v.children
      ? atoms(v.children)
      : kind === "tabs"
        ? atoms(v.body)
        : [n];
  });
}
export async function startLab() {
  process.env.TAILSCALE_SERVE = "0";
  const server = await createServer({
    root: path.resolve("app"),
    configFile: path.resolve("app/vite.config.ts"),
    server: { host: "127.0.0.1", port: 0, hmr: false },
    logLevel: "error",
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const newPage=browser.newPage.bind(browser);
  browser.newPage=async options=>{
    const page=await newPage({...captureSettings,...options});
    // tsx keeps function names in imported TS browser callbacks.
    await page.addInitScript("globalThis.__name = value => value");
    await page.addInitScript(css=>{const add=()=>{const style=document.createElement("style");style.textContent=css;document.head.append(style);};if(document.head)add();else document.addEventListener("DOMContentLoaded",add,{once:true});},captureCss);
    return page;
  };
  const address = server.httpServer.address();
  return {
    browser,
    url: `http://127.0.0.1:${address.port}/exotic-check.html?harness=1`,
    stockUrl: `http://127.0.0.1:${address.port}/screen-check.html`,
    close: async () => {
      await browser.close();
      await server.close();
    },
  };
}
export async function paint(page, view) {
  await page.evaluate((v) => window.renderResearch(v), view);
  await waitForCaptureFonts(page);
}
/** Expected content comes only from the supplied tree, independently of React. */
export async function gateView(page, view) {
  const expected = view.panes.map((p) => ({
    patient: p.patient,
    banner: p.screen.banner,
    nodes: atoms(
      p.screen.modal
        ? [p.screen.modal]
        : [...p.screen.workspace, ...p.screen.side],
    ),
  }));
  const failures = [];
  for (const p of expected) {
    const observed = await page.evaluate((p) => {
      const pane = [...document.querySelectorAll("[data-patient]")].find(
        (el) => el.dataset.patient === p.patient,
      );
      if (!pane) return { missing: true };
      const banner = pane.querySelector('[aria-label="Patient banner"]');
      return {
        banner: banner?.textContent,
        nodes: p.nodes.map((n) => {
          const [kind, v] = Object.entries(n)[0];
          const el = [...pane.querySelectorAll("[data-comp-id]")].find(
            (e) => e.dataset.compId === v.comp,
          );
          const field = el?.matches("input,textarea,select,button")
            ? el
            : el?.querySelector("input,textarea,select,button");
          const r = el?.getBoundingClientRect(),
            style = el ? getComputedStyle(el) : null;
          return {
            kind,
            id: v.comp,
            exists: !!el,
            disabled: field?.disabled,
            text: el?.textContent,
            hidden:
              !r ||
              r.width <= 0 ||
              r.height <= 0 ||
              style?.visibility === "hidden" ||
              style?.display === "none",
            font: style ? parseFloat(style.fontSize) : 0,
          };
        }),
      };
    }, p);
    if (observed.missing) {
      failures.push(`missing pane ${p.patient}`);
      continue;
    }
    for (const [, value] of p.banner)
      if (!observed.banner.includes(value))
        failures.push(`banner ${p.patient}: ${value}`);
    for (const [i, n] of p.nodes.entries()) {
      const [kind, v] = Object.entries(n)[0],
        actual = observed.nodes[i];
      if (!["button", "field", "info", "alert"].includes(kind) || !v.comp)
        continue;
      if (!actual.exists || actual.hidden || actual.font < 12)
        failures.push(`invisible/illegible ${p.patient}/${v.comp}`);
      if (kind === "button" && actual.disabled === v.enabled)
        failures.push(`dishonest ${v.comp}`);
      if (kind === "button" && !v.enabled && !v.blockedReason)
        failures.push(`no disabled reason ${v.comp}`);
      // Require every complete row in the browser's accessible source detail.
      if (kind === "info") {
        const text = await page.evaluate(
          ({ patient, id }) => {
            const pane = [...document.querySelectorAll("[data-patient]")].find(
              (e) => e.dataset.patient === patient,
            );
            const e = [...pane.querySelectorAll("[data-comp-id]")].find(
              (e) => e.dataset.compId === id,
            );
            return [
              e?.textContent ?? "",
              ...[e, ...(e?.querySelectorAll("[aria-label],[title]") ?? [])]
                .filter((x) => x?.getClientRects().length)
                .flatMap((x) => [
                  x.getAttribute("aria-label") ?? "",
                  x.getAttribute("title") ?? "",
                ]),
            ].join(" ");
          },
          { patient: p.patient, id: v.comp },
        );
        for (const row of v.rows)
          for (const [, value] of row)
            if (value && !text.includes(value))
              failures.push(`source cell ${v.comp}: ${value.slice(0, 70)}`);
      }
    }
  }
  if (view.axis) {
    const observed = await page
      .locator(".time-axis [data-minute]")
      .evaluateAll((es) =>
        es.map((e) => ({ minute: Number(e.dataset.minute), x: e.getCTM().e })),
      );
    assert.deepEqual(
      observed.map((e) => e.minute),
      view.axis.dated.map((e) => e.minute),
      "dated axis order",
    );
    const first = view.axis.dated[0]?.minute ?? 0,
      span = Math.max(1, (view.axis.dated.at(-1)?.minute ?? first) - first);
    if (observed.length > 1)
      for (let i = 1; i < observed.length; i++)
        assert.ok(
          Math.abs(
            (observed[i].x - observed[0].x) /
              (observed.at(-1).x - observed[0].x) -
              (observed[i].minute - first) / span,
          ) < 0.001,
          "proportional dates",
        );
  }
  assert.deepEqual(
    failures,
    [],
    `Sandbox projection failed: ${failures.slice(0, 8).join("; ")}`,
  );
  return {
    status: "pass",
    panes: expected.length,
    atoms: expected.reduce((n, p) => n + p.nodes.length, 0),
    scope:
      "Supplied states only; full urgency and transition refinement remain open",
  };
}
/** Actual Chromium scrollIntoView and final element rectangles; no native coordinates. */
export async function measureEvent(
  page,
  { patient, event, keyboard = false, previous = [0, 0] },
) {
  const payload = Object.values(event)[0],
    id = payload?.comp ?? payload?.alert;
  if (!id)
    return {
      mouseTravelPx: 0,
      scrollPx: 0,
      position: previous,
      missing: false,
    };
  return page.evaluate(
    async ({ patient, id, keyboard, previous }) => {
      const pane =
        [...document.querySelectorAll("[data-patient]")].find(
          (el) => el.dataset.patient === patient,
        ) ?? document;
      const strip=[...document.querySelectorAll("[data-urgent-strip-patient]")].find(el=>el.dataset.urgentStripPatient===patient);
      const candidates = [...pane.querySelectorAll("[data-comp-id]"),...(strip?.querySelectorAll("[data-comp-id]")??[])].filter(
        (el) => el.dataset.compId === id,
      );
      const target = candidates.find(
        (el) => el.getBoundingClientRect().width > 0,
      );
      if (!target)
        return {
          mouseTravelPx: 0,
          scrollPx: 0,
          position: previous,
          missing: true,
          id,
        };
      const scrollers = [...new Set([
        document.scrollingElement,
        pane,
        ...pane.querySelectorAll("*"),
      ])].filter((e) => e instanceof Element && e.scrollHeight > e.clientHeight + 1);
      const before = scrollers.map((e) => e.scrollTop);
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "instant",
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const r = target.getBoundingClientRect();
      const position = [r.x + r.width / 2, r.y + r.height / 2];
      return {
        mouseTravelPx: keyboard
          ? 0
          : Math.hypot(position[0] - previous[0], position[1] - previous[1]),
        scrollPx: scrollers.reduce(
          (sum, e, i) => sum + Math.abs(e.scrollTop - before[i]),
          0,
        ),
        documentScrollPx: Math.abs((document.scrollingElement?.scrollTop ?? 0) - (before[scrollers.indexOf(document.scrollingElement)] ?? 0)),
        scrollContainerCount: scrollers.length,
        position: keyboard ? previous : position,
        missing: false,
      };
    },
    { patient, id, keyboard, previous },
  );
}
async function main() {
  const run = path.resolve(process.argv[2] ?? "runs/explore-round2");
  if (!run.startsWith(path.resolve("runs") + path.sep))
    throw Error("Outputs must be under runs/");
  const canonical = JSON.parse(
    await readFile(path.join(run, "canonical.json"), "utf8"),
  );
  const lab = await startLab();
  const results = [],
    shots = [];
  try {
    for (const mode of ["command", "spatial", "board", "dated"])
      for (const width of [1440, 390]) {
        const page = await lab.browser.newPage({
          viewport: { width, height: 900 },
        });
        await page.goto(lab.url);
        const panes = Array.from(
          { length: mode === "board" ? 3 : 1 },
          (_, i) => ({
            patient: `example-${i + 1}`,
            screen: {
              ...canonical.screen,
              banner: [
                ["Patient", `Example ${i + 1}`],
                ["MRN", `example-${i + 1}`],
              ],
            },
          }),
        );
        const view = {
          mode,
          panes,
          ...(mode === "dated" ? { axis: canonical.axis } : {}),
        };
        await paint(page, view);
        results.push({ mode, width, ...(await gateView(page, view)) });
        // Keyboard executes an offered command and retains the bound patient.
        if (mode === "command") {
          const enabled = canonical.commands.find((c) => c.enabled);
          await page
            .getByRole("textbox", { name: "Type a command" })
            .fill(enabled.id);
          await page
            .getByRole("textbox", { name: "Type a command" })
            .press("Enter");
          assert.deepEqual(
            await page.evaluate(() => window.researchEvents.at(-1)),
            { patient: "example-1", event: { click: { comp: enabled.id } } },
          );
          await page.getByRole("textbox", { name: "Type a command" }).fill("");
        }
        if (mode === "board")
          for (const p of panes) {
            const enabled = canonical.commands.find((c) => c.enabled);
            await page
              .locator(
                `[data-patient="${p.patient}"] [data-comp-id="${enabled.id}"]`,
              )
              .click();
            assert.equal(
              await page.evaluate(() => window.researchEvents.at(-1).patient),
              p.patient,
            );
          }
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          document
            .querySelectorAll("[data-patient]")
            .forEach((e) => (e.scrollTop = 0));
        });
        const shot = path.join(run, "screenshots", `${mode}-${width}.png`);
        await mkdir(path.dirname(shot), { recursive: true });
        await page.screenshot({ path: shot, fullPage: true });
        shots.push(shot);
        const disabled = canonical.commands.find((c) => !c.enabled);
        const disabledButton = page.locator(
          `[data-patient="example-1"] [data-comp-id="${disabled.id}"]`,
        );
        await disabledButton.evaluate((e) => {
          e.disabled = false;
        });
        await assert.rejects(() => gateView(page, view));
        await disabledButton.evaluate((e) => {
          e.disabled = true;
        });
        results.push({ mode, width, adversarialEnabled: "rejected" });
        if (mode === "dated") {
          await page
            .locator(".time-axis")
            .evaluate((e) => e.appendChild(e.querySelector("[data-minute]")));
          await assert.rejects(() => gateView(page, view));
          await page.locator(".time-axis").evaluate((e) => {
            const points = e.querySelectorAll("[data-minute]");
            e.insertBefore(points[1], points[0]);
          });
          results.push({ mode, width, adversarialChronology: "rejected" });
        }
        // Hiding an otherwise valid child must fail independently.
        const button = canonical.commands[0];
        await page
          .locator(`[data-patient="example-1"] [data-comp-id="${button.id}"]`)
          .evaluate((e) => (e.style.display = "none"));
        await assert.rejects(() => gateView(page, view));
        results.push({ mode, width, adversarialHidden: "rejected" });
        await page.close();
      }
    // Real WASM sessions: changing pane 3 leaves panes 1 and 2 byte-identical.
    const live = await lab.browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await live.goto(lab.url);
    const inputs = Array.from({ length: 3 }, (_, i) => {
      const patient = `bound-${i + 1}`,
        input = structuredClone(canonical.input);
      input.facts.patientId = patient;
      input.facts.sourcePatientId = patient;
      input.display.sourcePatientId = patient;
      input.display.banner.name = `Bound patient ${i + 1}`;
      input.display.banner.mrn = patient;
      return { patient, input };
    });
    await live.evaluate(
      (inputs) => window.startResearch("board", inputs),
      inputs,
    );
    const before = await live.evaluate(() => window.researchStates);
    const enabled = canonical.commands.find((c) => c.enabled);
    await live
      .locator(`[data-patient="bound-3"] [data-comp-id="${enabled.id}"]`)
      .click();
    const after = await live.evaluate(() => window.researchStates);
    assert.deepEqual(after["bound-1"], before["bound-1"]);
    assert.deepEqual(after["bound-2"], before["bound-2"]);
    assert.notDeepEqual(after["bound-3"].state, before["bound-3"].state);
    await assert.rejects(() =>
      live.evaluate(
        (inputs) => window.startResearch("board", inputs),
        [inputs[0], inputs[0]],
      ),
    );
    await assert.rejects(() =>
      live.evaluate(
        (inputs) => window.startResearch("board", inputs),
        [{ ...inputs[0], patient: "wrong-patient" }],
      ),
    );
    results.push({
      interactiveBoard: "pass",
      duplicatePatient: "rejected",
      wrongBinding: "rejected",
    });
    await live.close();
    const demo = await lab.browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await demo.goto(lab.url.replace("?harness=1", "?mode=dated"));
    await demo.waitForFunction(
      () =>
        window.researchStates && Object.keys(window.researchStates).length > 0,
    );
    assert.equal(
      await demo.locator(".time-axis [data-minute]").count(),
      canonical.axis.dated.length,
    );
    results.push({
      interactiveDatedDemo: "pass",
      points: canonical.axis.dated.length,
    });
    await demo.close();
    await writeFile(
      path.join(run, "exotic-gate.json"),
      JSON.stringify({ results, shots }, null, 2),
    );
    console.log(
      JSON.stringify({ checks: results.length, shots: shots.length }),
    );
  } finally {
    await lab.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
