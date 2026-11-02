import {captureGeometry} from './geometry-capture';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import { presentationBundleSchema } from "../src/ehr/ui/presentation-types";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import { formatDisplayValue } from "../src/ehr/ui/display";
import { formatMedicationDirections } from "../src/ehr/ui/clinical-display";
import {
  displayRows,
  vitalGroups,
  observationValue,
  internalSource,
  columnCaption,
  clinicalTime,
  medicationTaskCaption,
} from "../src/ehr/ui/clinical-formatters";
import {
  uiScreenSchema,
  type UiNode,
  type UiScreen,
} from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

// Each test renders one independent screen file in its own page.
test.describe.configure({ mode: "parallel" });

const supplied = z
  .array(z.string())
  .parse(JSON.parse(process.env.EHR_UI_FILES ?? "[]"));
const fixtures = supplied.length
  ? supplied
  : ["src/fixtures/ui", "src/fixtures/punch"].flatMap((directory) =>
      readdirSync(directory)
        .filter((name) => name.endsWith(".json"))
        .map((name) => resolve(directory, name)),
    );
const presentations = process.env.EHR_PRESENTATION_BUNDLE
  ? presentationBundleSchema.parse(
      JSON.parse(readFileSync(process.env.EHR_PRESENTATION_BUNDLE, "utf8")),
    )
  : null;
// Policy input belongs to the operator, not to the proposed screen/program.
const urgentAlertIds = z.array(z.string().min(1)).parse(
  JSON.parse(process.env.EHR_URGENT_ALERT_IDS ?? "[]"),
);
const minimum = Number(process.env.EHR_MIN_FONT_PX ?? 12);
if (!Number.isFinite(minimum) || minimum < 12)
  throw new Error("Legibility minimum must be at least 12px");

async function render(page: Page, screen: UiScreen) {
  await page.evaluate(
    ({ screen, presentations }) => window.renderUi(screen, presentations),
    { screen, presentations },
  );
  await page.evaluate(() => document.fonts.ready);
  // Wait for presentation transitions before inspecting the expected regions.
  await page.waitForTimeout(220);
}
function nodes(tree: UiNode): UiNode[] {
  if ("timeline" in tree) return [tree, ...tree.timeline.children.flatMap(nodes)];
  if ("valueSet" in tree)
    return [tree, ...tree.valueSet.children.flatMap(nodes)];
  if ("chartReferences" in tree)
    return [tree, ...tree.chartReferences.children.flatMap(nodes)];
  if ("rowAction" in tree)
    return [tree, ...tree.rowAction.children.flatMap(nodes)];
  if ("presentation" in tree)
    return [tree, ...tree.presentation.children.flatMap(nodes)];
  if ("section" in tree) return [tree, ...tree.section.children.flatMap(nodes)];
  if ("columns" in tree) return [tree, ...tree.columns.children.flatMap(nodes)];
  if ("tabs" in tree) return [tree, ...tree.tabs.body.flatMap(nodes)];
  return [tree];
}
/** Check the current moment without scrolling an urgent demand into view. */
async function urgentVisibility(page: Page, screen: UiScreen, policy = urgentAlertIds) {
  const demands = [...screen.workspace, ...screen.side, ...(screen.modal ? [screen.modal] : [])]
    .flatMap(nodes).flatMap((node) => {
      if ("alert" in node && policy.includes(node.alert.alertId))
        return [{ kind: "alert", id: node.alert.alertId }];
      if ("button" in node && node.button.role === "ack" && policy.includes(node.button.comp))
        return [{ kind: "ack", id: node.button.comp }];
      return [];
    });
  const failures = await page.evaluate(({ demands, minimum }) => {
    const errors: string[] = [];
    for (const demand of demands) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        demand.kind === "alert" ? "[data-alert-id]" : "[data-comp-id][data-event='ack']",
      )).filter((element) => element.getAttribute(
        demand.kind === "alert" ? "data-alert-id" : "data-comp-id",
      ) === demand.id);
      const perceived = candidates.some((element) => {
        if (element.closest("[inert], [hidden], [aria-hidden='true']")) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.top < 0 || rect.left < 0 ||
          rect.bottom > innerHeight || rect.right > document.documentElement.clientWidth) return false;
        for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.visibility !== "visible" || style.display === "none" || Number(style.opacity) === 0) return false;
        }
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return Number.parseFloat(getComputedStyle(element).fontSize) >= minimum && !!hit && element.contains(hit);
      });
      if (!perceived) errors.push(`Urgent alert ${demand.id}: not perceived at the current moment`);
    }
    return errors;
  }, { demands, minimum });
  expect(failures).toEqual([]);
}

async function visibility(page: Page) {
  const failures = await page.evaluate((min) => {
    const errors: string[] = [];
    // Font checks overlap through regions/groups and their child controls. Inspect
    // each text node once in this synchronous, static DOM pass.
    const textChecked = new WeakSet<Node>();
    const selector =
      'header, nav, main h1, section[role="region"], [data-comp-id], [data-info-id] th, [data-info-id] td, [data-info-id] dt, [data-info-id] dd, [data-info-id] li, [role="note"], nav button, [role="tab"], [role="dialog"]';
    for (const el of document.querySelectorAll(selector)) {
      if (el.closest("[inert]")) continue;
      const id =
        el.getAttribute("data-comp-id") ||
        el.getAttribute("aria-label") ||
        el.textContent?.slice(0, 60) ||
        el.tagName;
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "instant",
      });
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0)
        errors.push(`${id}: zero bounding box`);
      if (
        rect.left < -1 ||
        rect.right > document.documentElement.clientWidth + 1
      )
        errors.push(`${id}: horizontal overflow`);
      for (
        let ancestor: Element | null = el;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        if (
          style.visibility !== "visible" ||
          Number(style.opacity) === 0 ||
          style.display === "none" ||
          ancestor.getAttribute("aria-hidden") === "true"
        )
          errors.push(`${id}: invisible ancestor`);
      }
      if (el.matches("input, button, select")) {
        const fontSize = Number.parseFloat(getComputedStyle(el).fontSize);
        if (fontSize < min)
          errors.push(`${id}: control text ${fontSize}px below ${min}px`);
      }
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let text = walk.nextNode(); text; text = walk.nextNode()) {
        if (textChecked.has(text)) continue;
        textChecked.add(text);
        const parent = text.parentElement;
        if (
          !parent ||
          !text.textContent?.trim() ||
          parent.closest('[aria-hidden="true"], svg')
        )
          continue;
        if (
          getComputedStyle(parent).display === "none" ||
          !parent.getClientRects().length
        )
          continue;
        const size = Number.parseFloat(getComputedStyle(parent).fontSize);
        if (size < min) errors.push(`${id}: text ${size}px below ${min}px`);
      }
      if (
        el.matches(
          "button, input, [data-comp-id][data-event], h1, th, td, dt, dd, li",
        )
      ) {
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        const parentHit =
          hit?.contains(el) && getComputedStyle(el).pointerEvents === "none";
        if (!hit || (!el.contains(hit) && !parentHit))
          errors.push(`${id}: covered by ${hit?.tagName ?? "nothing"}`);
      }
    }
    window.scrollTo(0, 0);
    return Array.from(new Set(errors));
  }, minimum);
  expect(failures).toEqual([]);
}
for (const file of fixtures)
  test(`semantic UI fidelity: ${file}`, async ({ page, baseURL },testInfo) => {
    const screen = uiScreenSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === baseURL
        ? route.continue()
        : route.abort(),
    );
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await render(page, screen);
    if (!/-geometry\.json$/.test(file)) await urgentVisibility(page, screen);
    if(process.env.EHR_GEOMETRY_DIR && testInfo.project.name==='desktop'){
      const sha=createHash('sha256').update(readFileSync(file)).digest('hex');
      const geometry=await captureGeometry(page,screen.screen??resolve(file).split("/").at(-1)?.replace(".json","")??file,`${file}:${sha}`);
      mkdirSync(process.env.EHR_GEOMETRY_DIR,{recursive:true});writeFileSync(resolve(process.env.EHR_GEOMETRY_DIR,`${sha}.json`),JSON.stringify(geometry));
    }
    // `*-geometry.json` files are synthetic probes (agent/src/geometry-popups.ts):
    // they force an alert popup open only to measure pointer positions, even when
    // the alert's condition is false, so they are not reachable program states.
    // They are measured above but not held to the fidelity checks below; every
    // reachable state exported by Lean's render-screens still is.
    if (/-geometry\.json$/.test(file)) return;
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(screen),
    );
    if (screen.modal) {
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await visibility(page);
      // Background must also pass fidelity once the blocking alert is acknowledged.
      await render(page, { ...screen, modal: null });
      if(process.env.EHR_GEOMETRY_DIR&&testInfo.project.name==='desktop'){
        const sha=createHash('sha256').update(readFileSync(file)).digest('hex');
        const geometry=await captureGeometry(page,screen.screen??file,`${file}:background:${sha}`);
        writeFileSync(resolve(process.env.EHR_GEOMETRY_DIR,`${sha}.background.json`),JSON.stringify(geometry));
      }
      expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
        expectedAria({ ...screen, modal: null }),
      );
    }
    await visibility(page);
    // Every source cell must remain in visible text or a visible element's
    // accessible label/native tooltip. This permits tested display aliases and
    // paired BP while requiring the original values to remain inspectable.
    // Control/landmark names, ancestry and order are checked exactly above.
    const normalize = (text: string) =>
      text
        .replace(/[\u200b\u00ad]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const readableContent = (root: Element) =>
      [
        root.textContent ?? "",
        ...[root, ...root.querySelectorAll("[aria-label], [title]")]
          .filter(
            (element) =>
              element.getClientRects().length &&
              !element.closest('[aria-hidden="true"], [hidden]'),
          )
          .flatMap((element) => [
            element.getAttribute("aria-label") ?? "",
            element.getAttribute("title") ?? "",
          ]),
      ].join(" ");
    const bannerText = normalize(
      await page.getByRole("banner").evaluate(readableContent),
    );
    if (screen.viewer) expect(bannerText).toContain(normalize(screen.viewer));
    for (const [, value] of screen.banner)
      if (value) expect(bannerText).toContain(normalize(value));
    const infos = [...screen.side, ...screen.workspace]
      .flatMap(nodes)
      .flatMap((node) => ("info" in node ? [node.info] : []));
    const panels = (
      await page
        .locator("[data-info-id]")
        .evaluateAll((roots) =>
          roots.map((root) =>
            [
              root.textContent ?? "",
              ...[root, ...root.querySelectorAll("[aria-label], [title]")]
                .filter(
                  (element) =>
                    element.getClientRects().length &&
                    !element.closest('[aria-hidden="true"], [hidden]'),
                )
                .flatMap((element) => [
                  element.getAttribute("aria-label") ?? "",
                  element.getAttribute("title") ?? "",
                ]),
            ].join(" "),
          ),
        )
    ).map(normalize);
    const visiblePanels = (
      await page.locator("[data-info-id]").allTextContents()
    ).map(normalize);
    for (const [index, info] of infos.entries()) {
      expect(panels[index], `Missing rendered info ${index}`).toBeDefined();
      for (const row of info.rows)
        for (const [, value] of row)
          if (value) expect(panels[index]).toContain(normalize(value));
      const visible = visiblePanels[index] ?? "";
      for (const group of vitalGroups(
        displayRows(info.rows, true, info.display === "list"),
      )) {
        const first = group.entries[0];
        const taskCaption = first
          ? medicationTaskCaption(first.cells)
          : undefined;
        if (info.display === "list" && taskCaption) {
          expect(visible).toContain(normalize(taskCaption));
          continue;
        }
        if (info.display === "list" && group.caption) {
          expect(visible).toContain(normalize(group.caption));
          continue;
        }
        for (const entry of group.entries)
          for (const [key, value] of entry.cells) {
            if (!value) continue;
            const expected =
              key === "Text" || key === "Title"
                ? value
                : key === "Source" && internalSource(value)
                  ? columnCaption(value) === value
                    ? "Source details"
                    : columnCaption(value)
                  : info.infoId === "currentMeds" && key === "Instructions"
                    ? formatMedicationDirections(
                        entry.cells.find(
                          ([name]) => name === "Medication",
                        )?.[1] ?? "",
                        value,
                      )
                    : formatDisplayValue(value);
            expect(
              visible.includes(normalize(expected)) ||
                (/^(Arrival|Time|Start)$/i.test(key) &&
                  visible.includes(normalize(clinicalTime(value)))) ||
                (/^(value|result)$/i.test(key) &&
                  visible.includes(normalize(observationValue(value)))),
            ).toBe(true);
          }
      }
    }
    expect(browserErrors).toEqual([]);
  });

test("fidelity gate detects label drift, wrong disabled state, illegible and covered controls", async ({
  page,
}) => {
  const screen: UiScreen = {
    banner: [
      ["Patient", "Alex Morgan"],
      ["MRN", "123456"],
    ],
    nav: [],
    title: "Review",
    workspace: [
      {
        field: {
          comp: "identity",
          label: "Patient identity",
          kind: "text",
          value: "AM/58",
          unit: null,
          provenance: null,
          pendingConfirm: false,
          humanOnly: true,
          required: true,
        },
      },
      {
        button: {
          comp: "sign",
          label: "Sign orders",
          role: "primary",
          enabled: false,
          blockedReason: "Review required",
          hotkey: null,
        },
      },
    ],
    side: [],
    modal: null,
  };
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  const baseline = expectedAria(screen);
  expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
    baseline,
  );
  await page
    .getByRole("textbox")
    .evaluate((el) => el.setAttribute("aria-label", "Wrong label"));
  expect(observedAria(await page.locator("body").ariaSnapshot())).not.toEqual(
    baseline,
  );
  await render(page, screen);
  // React only changes props that changed, so restore the intentionally mutated attribute.
  await page
    .getByRole("textbox")
    .evaluate((el) => el.setAttribute("aria-label", "Patient identity"));
  await page
    .getByRole("button", { name: "Sign orders" })
    .evaluate((el) => el.removeAttribute("disabled"));
  expect(observedAria(await page.locator("body").ariaSnapshot())).not.toEqual(
    baseline,
  );
  await page
    .getByRole("button", { name: "Sign orders" })
    .evaluate((el) => el.setAttribute("disabled", ""));
  const small = await page.addStyleTag({
    content: ".clinical-field input { font-size: 8px !important; }",
  });
  await expect(visibility(page)).rejects.toThrow();
  await small.evaluate((el) => el.parentNode?.removeChild(el));
  const cover = await page.addStyleTag({
    content:
      'body::after { content:""; position:fixed; inset:0; background:white; z-index:9999; }',
  });
  await expect(visibility(page)).rejects.toThrow();
  await cover.evaluate((el) => el.parentNode?.removeChild(el));
  await visibility(page);
});

const denseScreen: UiScreen = {
  banner: [
    ["Patient", "Alexandra Morgan – long patient name"],
    ["DOB", "1968-07-03"],
    ["MRN", "123456"],
  ],
  nav: [],
  title: "Medication review",
  workspace: [
    {
      field: {
        comp: "scan",
        label: "Scan medication",
        kind: "scan",
        value: null,
        unit: null,
        provenance: null,
        pendingConfirm: false,
        humanOnly: true,
        required: true,
      },
    },
    {
      info: {
        comp: "medications",
        infoId: "medications",
        label: "Medication records",
        display: "table",
        rows: Array.from({ length: 24 }, (_, index) => [
          ["Medication", `Medication ${index + 1} 250 mg oral tablet`],
          [
            "Instructions",
            "Take one tablet by mouth with food; complete instructions remain available for clinical review.",
          ],
          [
            "Status",
            [
              "Scheduled 12:00",
              "Due 09:00",
              "Overdue 09:00",
              "Given 09:12",
              "Held",
              "Refused",
              "Stopped",
              "unknown",
            ][index % 8] ?? "unknown",
          ],
          ["Recorded", "2026-10-31T00:30:00Z"],
        ]),
      },
    },
    {
      info: {
        comp: "history",
        infoId: "history",
        label: "History",
        display: "list",
        rows: Array.from({ length: 24 }, (_, index) => [
          ["Problem", `History record ${index + 1}`],
          ["Status", "unknown"],
        ]),
      },
    },
    {
      button: {
        comp: "record",
        label: "Record administration",
        role: "primary",
        enabled: false,
        blockedReason: "Scan medication",
        hotkey: null,
      },
    },
    ...["critical", "warning", "informational", "success"].map(
      (severity): UiNode => ({
        alert: {
          comp: severity,
          alertId: severity,
          label: `${severity} supplied status`,
          severity,
        },
      }),
    ),
  ],
  side: [],
  modal: null,
};

test.describe("clinical presentation", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  for (const width of [1440, 1280, 720])
    test(`all long records and controls survive at ${width}px${width === 720 ? " (200% desktop reflow equivalent)" : ""}`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop",
        "Additional desktop/reflow sizes",
      );
      await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
      await page.goto("/screen-check.html");
      await page.waitForFunction(() => typeof window.renderUi === "function");
      await render(page, denseScreen);
      expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
        expectedAria(denseScreen),
      );
      await visibility(page);
      await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(24);
      await expect(
        page.getByRole("list", { name: "History" }).locator("li"),
      ).toHaveCount(24);
      await expect(
        page.locator('time[datetime="2026-10-31T00:30:00Z"]').first(),
      ).toHaveText("10/31/2026 0030");
      await expect(
        page.locator('time[datetime="2026-10-31T00:30:00Z"]').first(),
      ).toHaveAttribute("title", "2026-10-31T00:30:00Z");
      await expect(page.getByRole("banner")).toContainText("03 Jul 1968");
      await expect(page.locator(".status-green").first()).toHaveText(
        "Given 09:12",
      );
      await expect(page.locator(".status-red").first()).toHaveText(
        "Overdue 09:00",
      );
      await expect(
        page.locator(".clinical-info-list table, .clinical-info-list dl"),
      ).toHaveCount(0);
    });

  test("keyboard focus is visible, scanner Enter cannot commit, and dialog focus stays contained", async ({
    page,
  }) => {
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await render(page, denseScreen);
    await page.keyboard.press("Tab");
    const scan = page.getByRole("textbox", { name: "Scan medication" });
    await expect(scan).toBeFocused();
    expect(
      await scan.evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.outlineWidth, style.outlineStyle, style.outlineColor];
      }),
    ).toEqual(["2px", "solid", "rgb(36, 90, 129)"]);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Record administration" }),
    ).toBeDisabled();
    const modal: UiNode = {
      section: {
        id: "review",
        title: "Review medication",
        children: [
          {
            text: {
              s: "Review the supplied medication evidence before acknowledging.",
            },
          },
          {
            button: {
              comp: "review",
              label: "Acknowledge",
              role: "ack",
              enabled: true,
              blockedReason: null,
              hotkey: null,
            },
          },
        ],
      },
    };
    await render(page, { ...denseScreen, modal });
    const dialog = page.getByRole("dialog", { name: "Review medication" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".clinical-modal-body")).toBeFocused();
    for (let index = 0; index < 3; index++) {
      await page.keyboard.press("Tab");
      expect(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await render(page, denseScreen);
    await expect(scan).toBeFocused();
  });

  test("rendered status, alert and disabled text meet clinical contrast", async ({
    page,
  }) => {
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await render(page, denseScreen);
    const contrast = await page
      .locator(
        ".clinical-status, .clinical-alert p, .clinical-blocked, .clinical-action button:disabled, .human-lock",
      )
      .evaluateAll((elements) => {
        function rgb(color: string): number[] {
          return (color.match(/[\d.]+/g) ?? []).map(Number);
        }
        function luminance(channels: number[]): number {
          const linear = channels.slice(0, 3).map((value) => {
            const n = value / 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          });
          return (
            (linear[0] ?? 0) * 0.2126 +
            (linear[1] ?? 0) * 0.7152 +
            (linear[2] ?? 0) * 0.0722
          );
        }
        return elements.map((el) => {
          const ink = luminance(rgb(getComputedStyle(el).color));
          let current: Element | null = el;
          let background = [255, 255, 255];
          while (current) {
            const channels = rgb(getComputedStyle(current).backgroundColor);
            if (channels.length === 3 || channels[3] === 1) {
              background = channels;
              break;
            }
            current = current.parentElement;
          }
          const surface = luminance(background);
          return {
            text: el.textContent,
            ratio:
              (Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05),
          };
        });
      });
    expect(contrast.length).toBeGreaterThan(20);
    expect(contrast.filter(({ ratio }) => ratio < 4.5)).toEqual([]);
  });
});

test("timeline gate retains ordered detail and detects hidden or reordered children", async ({ page }) => {
  const screen = uiScreenSchema.parse(JSON.parse(readFileSync(resolve("src/fixtures/ui/semantic-timeline.json"), "utf8")));
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  const baseline = expectedAria(screen);
  expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(baseline);
  const events = page.getByRole("list", { name: "Clinical timeline events" });
  await expect(events.locator(":scope > li")).toHaveCount(6);
  await expect(events).toContainText("Penicillin");
  await expect(events).toContainText("Rash");
  await expect(page.getByRole("button", { name: "Sign", exact: true })).toBeDisabled();
  await visibility(page);
  // A visual implementation that hides a full review must fail the independent gate.
  const first = events.locator(":scope > li").first();
  await first.evaluate((el) => { (el as HTMLElement).hidden = true; });
  expect(observedAria(await page.locator("body").ariaSnapshot())).not.toEqual(baseline);
  await first.evaluate((el) => { (el as HTMLElement).hidden = false; });
  await events.evaluate((el) => { if (el.firstElementChild) el.append(el.firstElementChild); });
  expect(observedAria(await page.locator("body").ariaSnapshot())).not.toEqual(baseline);
});


test("urgency gate rejects out-of-view demands without scrolling them into view", async ({ page }) => {
  const screen: UiScreen = { banner: [], nav: [], title: "Urgent demand", side: [], modal: null,
    workspace: [{ timeline: { title: "Clinical timeline", children: [
      { alert: { comp: "warning", alertId: "interaction", label: "Interaction", severity: "passive" } },
    ] } }] };
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  await urgentVisibility(page, screen, ["interaction"]);
  const style = await page.addStyleTag({ content: ".clinical-alert { margin-top: 200vh !important; }" });
  await expect(urgentVisibility(page, screen, ["interaction"])).rejects.toThrow();
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  await urgentVisibility(page, screen, ["interaction"]);
  await render(page, { ...screen, modal: { section: { id: "other", title: "Other alert", children: [
    { button: { comp: "other", label: "Acknowledge", role: "ack", enabled: true, blockedReason: null, hotkey: null } },
  ] } } });
  await expect(urgentVisibility(page, screen, ["interaction"])).rejects.toThrow();
});
