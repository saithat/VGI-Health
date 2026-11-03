import { physicalBounds as measurePhysicalBounds, type PhysicalFinding } from "./physical-policy";
import { waitForCaptureFonts, captureCss } from "./capture-environment";
import { captureGeometry } from "./geometry-capture";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
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
test.beforeEach(async ({ page }) => {
  await page.addInitScript((css) => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);
    });
  }, captureCss);
});

const supplied = z
  .array(z.string())
  .parse(
    JSON.parse(
      process.env.EHR_UI_MANIFEST
        ? readFileSync(process.env.EHR_UI_MANIFEST, "utf8")
        : (process.env.EHR_UI_FILES ?? "[]"),
    ),
  );
// An explicitly empty manifest means every candidate was cached: run controls
// only, rather than silently loading the app's unrelated default fixtures.
const fixtures =
  process.env.EHR_UI_MANIFEST || process.env.EHR_UI_FILES
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
const additionalUrgentAlertIds = z
  .array(z.string().min(1))
  .parse(JSON.parse(process.env.EHR_URGENT_ALERT_IDS ?? "[]"));
const minimum = Number(process.env.EHR_MIN_FONT_PX ?? 12);
if (!Number.isFinite(minimum) || minimum < 12)
  throw new Error("Legibility minimum must be at least 12px");

async function render(page: Page, screen: UiScreen, settleMs = 220) {
  await page.evaluate(
    ({ screen, presentations }) => window.renderUi(screen, presentations),
    { screen, presentations },
  );
  await waitForCaptureFonts(page);
  // Wait for presentation transitions before inspecting the expected regions.
  if (settleMs) await page.waitForTimeout(settleMs);
  else
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
}
function nodes(tree: UiNode): UiNode[] {
  if ("board" in tree) return [tree, ...tree.board.children.flatMap(nodes)];
  if ("patientPane" in tree) return [tree, ...tree.patientPane.children.flatMap(nodes), ...tree.patientPane.modal.flatMap(nodes)];
  if ("datedTimeline" in tree) return [tree, ...tree.datedTimeline.children.flatMap(nodes)];
  if ("timeline" in tree)
    return [tree, ...tree.timeline.children.flatMap(nodes)];
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
async function urgentFindings(
  page: Page,
  screen: UiScreen,
  policy = urgentAlertIds,
) {
  // UrgentDemand permits the alert's own labeled modal plus enabled acknowledgment.
  // A background copy of that same alert is inert while its modal owns interaction.
  const modal = screen.modal && "section" in screen.modal ? screen.modal.section : null;
  const modalNodes = screen.modal ? nodes(screen.modal) : [];
  const ownModalAck = modal && modalNodes.some(node =>
    "button" in node && node.button.comp === modal.id && node.button.role === "ack" &&
      node.button.label === "Acknowledge" && node.button.enabled);
  const demands = [
    ...screen.workspace,
    ...screen.side,
    ...(screen.urgent ?? []),
    ...(screen.modal ? [screen.modal] : []),
  ]
    .flatMap(nodes)
    .flatMap((node) => {
      if ("alert" in node && policy.includes(node.alert.alertId))
        return ownModalAck && modal?.id === node.alert.alertId ? [] : [{ kind: "alert", id: node.alert.alertId }];
      if ("section" in node && policy.includes(node.section.id))
        return [{ kind: "attention", id: node.section.id }];
      if (
        "button" in node &&
        node.button.role === "ack" &&
        policy.includes(node.button.comp)
      )
        return [{ kind: "ack", id: node.button.comp }];
      return [];
    });
  const failures = await page.evaluate(
    ({ demands, minimum }) => {
      const errors: string[] = [];
      for (const demand of demands) {
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>(
            demand.kind === "alert"
              ? "[data-alert-id]"
              : demand.kind === "attention"
                ? "[role='dialog'] .clinical-modal-title"
                : "[data-comp-id][data-event='ack']",
          ),
        ).filter(
          (element) =>
            demand.kind === "attention" ||
            element.getAttribute(
              demand.kind === "alert" ? "data-alert-id" : "data-comp-id",
            ) === demand.id,
        );
        const perceived = candidates.some((element) => {
          if (demand.kind === "ack" && (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true"))
            return false;
          if (element.closest("[inert], [hidden], [aria-hidden='true']"))
            return false;
          const rect = element.getBoundingClientRect();
          if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.top < 0 ||
            rect.left < 0 ||
            rect.bottom > innerHeight ||
            rect.right > document.documentElement.clientWidth
          )
            return false;
          for (
            let parent: HTMLElement | null = element;
            parent;
            parent = parent.parentElement
          ) {
            const style = getComputedStyle(parent);
            if (
              style.visibility !== "visible" ||
              style.display === "none" ||
              Number(style.opacity) === 0
            )
              return false;
          }
          const points = [
            [0.1, 0.1],
            [0.9, 0.1],
            [0.5, 0.5],
            [0.1, 0.9],
            [0.9, 0.9],
          ];
          return (
            Number.parseFloat(getComputedStyle(element).fontSize) >= minimum &&
            points.every(([x, y]) => {
              const hit = document.elementFromPoint(
                rect.left + rect.width * (x ?? 0.5),
                rect.top + rect.height * (y ?? 0.5),
              );
              return !!hit && element.contains(hit);
            })
          );
        });
        if (!perceived)
          errors.push(
            `Urgent alert ${demand.id}: not perceived at the current moment`,
          );
      }
      return errors;
    },
    { demands, minimum },
  );
  return failures;
}
async function urgentVisibility(
  page: Page,
  screen: UiScreen,
  policy = urgentAlertIds,
) {
  expect(await urgentFindings(page, screen, policy)).toEqual([]);
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
const physicalBounds = (page: Page) => measurePhysicalBounds(page, policyData.physical);

/** Fixed owner policy, exported from Lean; no candidate-controlled thresholds. */
const policyData = z
  .object({
    status: z.literal("APPROVED by the owner on 2026-11-02"),
    policyStatus: z.literal("APPROVED by the owner on 2026-11-02"),
    assignments: z.array(
      z.object({
        id: z.string(),
        urgency: z.enum(["urgent", "workflow", "advisory"]),
      }),
    ),
    physical: z.object({
      targetCssPx: z.literal(24),
      textContrast: z.literal(4.5),
      nontextContrast: z.literal(3),
      textResizePercent: z.literal(200),
      reflowCssPx: z.literal(320),
      viewportWidths: z.tuple([
        z.literal(768),
        z.literal(1280),
        z.literal(1440),
        z.literal(1600),
        z.literal(1920),
      ]),
    }),
  })
  .parse(
    JSON.parse(
      readFileSync(resolve("../docs/design/alert-urgency.json"), "utf8"),
    ),
  );

const urgentAlertIds = [
  ...new Set([
    ...policyData.assignments
      .filter((p) => p.urgency === "urgent")
      .map((p) => p.id),
    ...additionalUrgentAlertIds,
  ]),
];

/** Solid CSS surfaces, alpha compositing, all rendered text/values/placeholders,
 * pointer targets, authored input boundaries, state markers and meaningful SVGs.
 * Unsupported paint effects fail for review instead of silently passing. */

for (const file of fixtures)
  test(`semantic UI fidelity: ${file}`, async ({ page, baseURL }, testInfo) => {
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
    if (process.env.EHR_GEOMETRY_DIR && testInfo.project.name === "desktop") {
      const sha = createHash("sha256").update(readFileSync(file)).digest("hex");
      const geometry = await captureGeometry(
        page,
        screen.screen ??
          resolve(file).split("/").at(-1)?.replace(".json", "") ??
          file,
        `${file}:${sha}`,
      );
      mkdirSync(process.env.EHR_GEOMETRY_DIR, { recursive: true });
      writeFileSync(
        resolve(process.env.EHR_GEOMETRY_DIR, `${sha}.json`),
        JSON.stringify(geometry),
      );
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
      if (process.env.EHR_GEOMETRY_DIR && testInfo.project.name === "desktop") {
        const sha = createHash("sha256")
          .update(readFileSync(file))
          .digest("hex");
        const geometry = await captureGeometry(
          page,
          screen.screen ?? file,
          `${file}:background:${sha}`,
        );
        writeFileSync(
          resolve(process.env.EHR_GEOMETRY_DIR, `${sha}.background.json`),
          JSON.stringify(geometry),
        );
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
    content: ".clinical-field :is(input, textarea) { font-size: 8px !important; }",
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

test("timeline gate retains ordered detail and detects hidden or reordered children", async ({
  page,
}) => {
  const screen = uiScreenSchema.parse(
    JSON.parse(
      readFileSync(resolve("src/fixtures/ui/semantic-timeline.json"), "utf8"),
    ),
  );
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  const baseline = expectedAria(screen);
  expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
    baseline,
  );
  const events = page.getByRole("list", { name: "Clinical timeline events" });
  await expect(events.locator(":scope > li")).toHaveCount(6);
  await expect(events).toContainText("Penicillin");
  await expect(events).toContainText("Rash");
  await expect(
    page.getByRole("button", { name: "Sign", exact: true }),
  ).toBeDisabled();
  await visibility(page);
  // A visual implementation that hides a full review must fail the independent gate.
  const first = events.locator(":scope > li").first();
  await first.evaluate((el) => {
    el.setAttribute("hidden", "");
  });
  expect(observedAria(await page.locator("body").ariaSnapshot())).not.toEqual(
    baseline,
  );
  await first.evaluate((el) => {
    el.removeAttribute("hidden");
  });
  await events.evaluate((el) => {
    if (el.firstElementChild) el.append(el.firstElementChild);
  });
  expect(observedAria(await page.locator("body").ariaSnapshot())).not.toEqual(
    baseline,
  );
});

test("urgency gate rejects out-of-view demands without scrolling them into view", async ({
  page,
}) => {
  const screen: UiScreen = {
    banner: [],
    nav: [],
    title: "Urgent demand",
    side: [],
    modal: null,
    workspace: [
      {
        timeline: {
          title: "Clinical timeline",
          children: [
            {
              alert: {
                comp: "warning",
                alertId: "interaction",
                label: "Interaction",
                severity: "passive",
              },
            },
          ],
        },
      },
    ],
  };
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  await urgentVisibility(page, screen, ["interaction"]);
  const style = await page.addStyleTag({
    content: ".clinical-alert { margin-top: 200vh !important; }",
  });
  await expect(
    urgentVisibility(page, screen, ["interaction"]),
  ).rejects.toThrow();
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  await urgentVisibility(page, screen, ["interaction"]);
  await render(page, {
    ...screen,
    modal: {
      section: {
        id: "other",
        title: "Other alert",
        children: [
          {
            button: {
              comp: "other",
              label: "Acknowledge",
              role: "ack",
              enabled: true,
              blockedReason: null,
              hotkey: null,
            },
          },
        ],
      },
    },
  });
  await expect(
    urgentVisibility(page, screen, ["interaction"]),
  ).rejects.toThrow();
});

test("urgency gate accepts its own modal alternative and rejects hidden or disabled acknowledgments", async ({page}) => {
  const screen:UiScreen={banner:[],nav:[],title:"Same urgent condition",side:[],workspace:[{alert:{comp:"warning",alertId:"interaction",label:"Interaction",severity:"interruptive"}}],
    modal:{section:{id:"interaction",title:"Interaction",children:[{button:{comp:"interaction",label:"Acknowledge",role:"ack",enabled:true,blockedReason:null,hotkey:null}}]}}};
  await page.goto("/screen-check.html");
  await page.waitForFunction(()=>typeof window.renderUi === "function");
  await render(page,screen);
  await urgentVisibility(page,screen,["interaction"]);
  const ack=page.locator("[data-event='ack']");
  await ack.evaluate(el=>el.setAttribute("hidden",""));
  await expect(urgentVisibility(page,screen,["interaction"])).rejects.toThrow();
  await ack.evaluate(el=>{el.removeAttribute("hidden");el.setAttribute("disabled","");});
  await expect(urgentVisibility(page,screen,["interaction"])).rejects.toThrow();
});

/** Finite scroll/focus samples catch regression; they are not a universal view proof. */
async function urgencySamples(
  page: Page,
  screen: UiScreen,
): Promise<PhysicalFinding[]> {
  const hasDemand = [
    ...screen.workspace,
    ...screen.side,
    ...(screen.urgent ?? []),
    ...(screen.modal ? [screen.modal] : []),
  ]
    .flatMap(nodes)
    .some(
      (node) =>
        ("alert" in node && urgentAlertIds.includes(node.alert.alertId)) ||
        ("button" in node &&
          node.button.role === "ack" &&
          urgentAlertIds.includes(node.button.comp)),
    );
  if (!hasDemand) return [];
  const findings: PhysicalFinding[] = [];
  const sample = async (moment: string) => {
    for (const detail of await urgentFindings(page, screen))
      findings.push({
        sc: "urgency",
        id: detail.split(":")[0] ?? detail,
        detail: `${moment}: ${detail}`,
      });
  };
  await sample("initial");
  const scrollers = await page.locator("body *").evaluateAll((elements) =>
    elements.flatMap((el, index) => {
      const s = getComputedStyle(el);
      return !el.closest("[inert]") &&
        el.getClientRects().length &&
        [s.overflowY, s.overflowX].some((v) => /auto|scroll/.test(v)) &&
        (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
        ? [index]
        : [];
    }),
  );
  for (const index of scrollers)
    for (const fraction of [0, 0.5, 1]) {
      await page
        .locator("body *")
        .nth(index)
        .evaluate((el, f) => {
          el.scrollTo({
            top: (el.scrollHeight - el.clientHeight) * f,
            left: (el.scrollWidth - el.clientWidth) * f,
            behavior: "instant",
          });
        }, fraction);
      await sample(`scroll ${index} ${fraction}`);
    }
  for (const fraction of [0.5, 1, 0]) {
    await page.evaluate(
      (f) =>
        window.scrollTo({
          top: document.documentElement.scrollHeight * f,
          behavior: "instant",
        }),
      fraction,
    );
    await sample(`document scroll ${fraction}`);
  }
  // Visit every currently enabled target without dispatching a clinical event.
  const focusables = page.locator(
    "button:enabled, input:enabled, textarea:enabled, select:enabled, a[href], [tabindex='0']",
  );
  for (let i = 0; i < (await focusables.count()); i++) {
    const el = focusables.nth(i);
    if (await el.evaluate((e) => !!e.closest("[inert], [hidden]"))) continue;
    await el.focus();
    await sample(`focus ${i}`);
  }
  return findings;
}

for (const file of fixtures)
  test(`physical policy: ${file}`, async ({ page }, testInfo) => {
    test.skip(
      process.env.EHR_PHYSICAL_POLICY === "0",
      "Physical matrix explicitly disabled (EHR_PHYSICAL_POLICY=0)",
    );
    test.skip(
      testInfo.project.name !== "desktop",
      "Physical matrix is independent of the fidelity projects",
    );
    test.skip(
      /-geometry\.json$/.test(file),
      "Synthetic geometry probes are not exported clinical states",
    );
    testInfo.setTimeout(180_000);
    const screen = uiScreenSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    const measurements: {
      width: number;
      textPercent: number;
      phase: string;
      findings: PhysicalFinding[];
      counts: Record<string, number>;
    }[] = [];
    // Stable endpoint measurements exclude animation/transient colors.
    await page.addStyleTag({
      content:
        "*, *::before, *::after { transition:none!important; animation:none!important }",
    });
    const cases = [
      ...policyData.physical.viewportWidths.map((width) => ({
        width,
        textPercent: 100,
      })),
      { width: 640, textPercent: 100 },
      { width: 320, textPercent: 100 },
      { width: 1280, textPercent: 200 },
      { width: 768, textPercent: 200 },
    ];
    for (const { width, textPercent } of cases)
      for (const phase of screen.modal
        ? ["active", "background-probe"]
        : ["active"]) {
        const current =
          phase === "active" ? screen : { ...screen, modal: null };
        const cacheKey = createHash("sha256")
          .update(
            JSON.stringify({
              current,
              width,
              textPercent,
              phase,
              policyData,
              urgentAlertIds,
              presentations,
              source: createHash("sha256")
                .update(readFileSync(resolve("e2e/ui-check.spec.ts")))
                .update(readFileSync(resolve("e2e/physical-policy.ts")))
                .digest("hex"),
            }),
          )
          .digest("hex");
        const samplePath = process.env.EHR_PHYSICAL_SAMPLE_DIR
          ? resolve(process.env.EHR_PHYSICAL_SAMPLE_DIR, `${cacheKey}.json`)
          : null;
        if (samplePath && existsSync(samplePath)) {
          const cached = z
            .object({
              findings: z.array(
                z.object({
                  sc: z.string(),
                  id: z.string(),
                  detail: z.string(),
                }),
              ),
              counts: z.record(z.string(), z.number()),
            })
            .parse(JSON.parse(readFileSync(samplePath, "utf8")));
          measurements.push({ width, textPercent, phase, ...cached });
          continue;
        }
        await page.setViewportSize({ width, height: 900 });
        // Restore the prior probe even when React reuses the shell's DOM nodes.
        await page.evaluate(() => {
          for (const el of document.querySelectorAll<HTMLElement>(
            "[data-policy-font]",
          )) {
            el.style.setProperty(
              "font-size",
              el.dataset.policyFont ?? "",
              el.dataset.policyFontPriority ?? "",
            );
            delete el.dataset.policyFont;
            delete el.dataset.policyFontPriority;
          }
        });
        await render(
          page,
          {
            banner: [],
            nav: [],
            title: "",
            workspace: [],
            side: [],
            modal: null,
          },
          0,
        );
        await render(page, current, 0);
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          for (const el of document.querySelectorAll("body *"))
            el.scrollTo({ top: 0, left: 0, behavior: "instant" });
        });
        if (textPercent === 200)
          await page.evaluate(() => {
            const elements = Array.from(
              document.querySelectorAll<HTMLElement>("body *"),
            ).filter((el) => !el.closest("svg, script, style"));
            const sizes = elements.map((el) =>
              parseFloat(getComputedStyle(el).fontSize),
            );
            elements.forEach((el, index) => {
              el.dataset.policyFont = el.style.getPropertyValue("font-size");
              el.dataset.policyFontPriority =
                el.style.getPropertyPriority("font-size");
              el.style.setProperty(
                "font-size",
                `${(sizes[index] ?? 0) * 2}px`,
                "important",
              );
            });
          });
        const measurement = await physicalBounds(page);
        // Preserve clinical urgency only in actual active states, not a forced modal-free probe.
        if (phase === "active")
          measurement.findings.push(...(await urgencySamples(page, current)));
        await page.keyboard.press("Tab");
        const focused = await physicalBounds(page);
        measurement.findings.push(
          ...focused.findings.filter((f) => f.detail.startsWith("state/focus")),
        );
        if (samplePath && process.env.EHR_PHYSICAL_SAMPLE_DIR) {
          mkdirSync(process.env.EHR_PHYSICAL_SAMPLE_DIR, { recursive: true });
          const temporary = `${samplePath}.${randomUUID()}.tmp`;
          writeFileSync(temporary, JSON.stringify(measurement));
          renameSync(temporary, samplePath);
        }
        measurements.push({ width, textPercent, phase, ...measurement });
      }
    await testInfo.attach("physical-policy", {
      body: JSON.stringify({
        file,
        policyStatus: policyData.status,
        measurements,
      }),
      contentType: "application/json",
    });
    const failures = measurements.flatMap((m) =>
      m.findings.map(
        (f) =>
          `${m.width}px text ${m.textPercent}% ${m.phase} SC ${f.sc} ${f.id}: ${f.detail}`,
      ),
    );
    // The CLI aggregates these attachments and fails on any finding. Direct
    // Playwright runs retain the per-state assertion; CLI collection avoids a
    // worker restart and duplicated error payload for every known-bad screen.
    // Enforcement defaults on; explicit 0 retains measurements for diagnostics.
    if (
      !process.env.EHR_COLLECT_PHYSICAL &&
      process.env.EHR_ENFORCE_PHYSICAL !== "0"
    )
      expect(
        failures,
        `Physical policy violations in ${file} (full measurements attached)`,
      ).toEqual([]);
  });

test("physical gate detects undersized targets, text and essential boundary contrast", async ({
  page,
}) => {
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, {
    banner: [],
    nav: [],
    title: "Contrast probe",
    side: [],
    modal: null,
    workspace: [
      {
        field: {
          comp: "probe-input",
          label: "Probe input",
          kind: "text",
          value: "Visible value",
          unit: null,
          provenance: null,
          pendingConfirm: false,
          humanOnly: true,
          required: true,
        },
      },
      {
        button: {
          comp: "probe-button",
          label: "Continue",
          role: "secondary",
          enabled: true,
          blockedReason: null,
          hotkey: null,
        },
      },
    ],
  });
  await page.locator("main").evaluate((main) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "180");
    svg.setAttribute("height", "40");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Chart axis");
    svg.setAttribute("data-info-id", "probe-svg");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "0");
    text.setAttribute("y", "24");
    text.setAttribute("fill", "#000");
    text.textContent = "Chart axis label";
    const line = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    line.setAttribute("points", "0,32 100,32");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "#000");
    line.setAttribute("stroke-width", "2");
    svg.append(line);
    svg.append(text);
    main.append(svg);
  });
  const before = await physicalBounds(page);
  expect(before.counts.targets).toBeGreaterThan(0);
  expect(before.counts.svgText).toBeGreaterThan(0);
  expect(
    before.findings.filter(
      (f) => f.id.startsWith("probe-svg/") && f.sc === "1.4.3",
    ),
  ).toEqual([]);
  expect(
    before.findings.filter(
      (f) =>
        f.id.startsWith("probe-input/") &&
        ["1.4.3", "1.4.11", "2.5.8"].includes(f.sc),
    ),
  ).toEqual([]);
  await page.addStyleTag({
    content:
      "[data-comp-id='probe-button'] button, button[data-comp-id='probe-button'] { min-width:0!important; min-height:0!important; width:20px!important; height:20px!important; padding:0!important } [data-comp-id='probe-input'] :is(input, textarea), :is(input, textarea)[data-comp-id='probe-input'] { background:white!important; border:1px solid #eee!important; color:#eee!important }",
  });
  await page
    .locator("[data-info-id='probe-svg'] polyline")
    .evaluate((el) => el.setAttribute("stroke", "#eee"));
  await page
    .locator("[data-info-id='probe-svg'] text")
    .evaluate((el) => el.setAttribute("fill", "#eee"));
  await page.waitForTimeout(250);
  const after = await physicalBounds(page);
  expect(
    after.findings.some(
      (f) => f.id.startsWith("probe-svg/") && f.sc === "1.4.11",
    ),
  ).toBe(true);
  expect(
    after.findings.some(
      (f) => f.id.startsWith("probe-svg/") && f.sc === "1.4.3",
    ),
  ).toBe(true);
  expect(
    after.findings.some(
      (f) => f.sc === "2.5.8" && f.id.startsWith("probe-button/"),
    ),
  ).toBe(true);
  expect(
    after.findings.some(
      (f) => f.sc === "1.4.3" && f.id.startsWith("probe-input/"),
    ),
  ).toBe(true);
  expect(
    after.findings.some(
      (f) => f.sc === "1.4.11" && f.id.startsWith("probe-input/"),
    ),
  ).toBe(true);
});

test("concurrent urgent strip survives scroll, focus, acknowledgment and another dialog", async ({
  page,
}) => {
  const alerts: UiNode[] = [
    "drugAllergyOrder",
    "interactionOrder",
    "criticalResult",
  ].map((id) => ({
    alert: {
      comp: `urgent:${id}`,
      alertId: id,
      label: `Active ${id}`,
      severity: "interruptive",
    },
  }));
  const screen: UiScreen = {
    banner: [],
    nav: [],
    title: "Concurrent alerts",
    side: [],
    workspace: [],
    urgent: alerts,
    modal: {
      section: {
        id: "unrelated",
        title: "Another workflow",
        children: [
          {
            button: {
              comp: "other",
              label: "Acknowledge",
              role: "ack",
              enabled: true,
              blockedReason: null,
              hotkey: null,
            },
          },
        ],
      },
    },
  };
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  await render(page, screen);
  await urgentVisibility(page, screen);
  expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
    expectedAria(screen),
  );
  await page.getByRole("button", { name: "Acknowledge" }).focus();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await urgentVisibility(page, screen);
  // A UI acknowledgment closes the boundary; all three clinical conditions persist.
  await render(page, { ...screen, modal: null });
  await urgentVisibility(page, screen);
  await page.locator('[data-alert-id="interactionOrder"]').evaluate((el) => {
    if (el instanceof HTMLElement) el.hidden = true;
  });
  expect(await urgentFindings(page, screen)).toContain(
    "Urgent alert interactionOrder: not perceived at the current moment",
  );
});

test("card navigation retains the physical target floor", async ({ page }) => {
  const screen: UiScreen = {
    banner: [],
    nav: [],
    title: "Navigation cards",
    side: [],
    modal: null,
    workspace: [
      {
        columns: {
          children: Array.from({ length: 3 }, (_, index) => ({
            section: {
              id: `card-${index}`,
              title: `Workflow ${index}`,
              children: [
                {
                  button: {
                    comp: `next-${index}`,
                    label: "Next",
                    role: "nav",
                    enabled: true,
                    blockedReason: null,
                    hotkey: null,
                  },
                },
              ],
            },
          })),
        },
      },
    ],
  };
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await render(page, screen);
    await expect(page.locator(".clinical-card-grid")).toHaveCount(1);
    expect((await physicalBounds(page)).findings).toEqual([]);
  }
});

test("plain text fields expose complete long values at reflow and text resize", async ({
  page,
}) => {
  const values = [
    "Called patient; arranged emergency evaluation",
    "Review the complete clinical history and arrange a documented follow-up plan. ".repeat(
      4,
    ),
    "reference-" + "0123456789abcdef".repeat(8),
  ];
  const screen: UiScreen = {
    banner: [],
    nav: [],
    title: "Text entry",
    side: [],
    modal: null,
    workspace: [
      {
        section: {
          id: "text-values",
          title: "Clinical text",
          children: values.map((value, index) => ({
            field: {
              comp: `text-${index}`,
              label: `Clinical text ${index}`,
              kind: "text",
              value,
              unit: null,
              provenance: null,
              pendingConfirm: false,
              humanOnly: true,
              required: true,
            },
          })),
        },
      },
    ],
  };
  expect(
    await page.evaluate(() => CSS.supports("field-sizing", "content")),
  ).toBe(true);
  for (const [width, textPercent] of [
    [1280, 100],
    [1280, 200],
    [768, 200],
    [320, 100],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    await render(page, screen, 0);
    if (textPercent === 200)
      await page.evaluate(() => {
        const elements = Array.from(
          document.querySelectorAll<HTMLElement>("body *"),
        ).filter((el) => !el.closest("svg, script, style"));
        const sizes = elements.map((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        );
        elements.forEach((el, index) =>
          el.style.setProperty(
            "font-size",
            `${(sizes[index] ?? 0) * 2}px`,
            "important",
          ),
        );
      });
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(screen),
    );
    expect((await physicalBounds(page)).findings).toEqual([]);
    for (const [index, value] of values.entries()) {
      const editor = page.getByRole("textbox", {
        name: `Clinical text ${index}`,
        exact: true,
      });
      await expect(editor).toHaveValue(value);
      const size = await editor.evaluate((el) => ({
        tag: el.tagName,
        width: el.clientWidth,
        contentWidth: el.scrollWidth,
        height: el.clientHeight,
        contentHeight: el.scrollHeight,
      }));
      expect(size.tag).toBe("TEXTAREA");
      expect(size.contentWidth).toBeLessThanOrEqual(size.width + 1);
      expect(size.contentHeight).toBeLessThanOrEqual(size.height + 1);
    }
  }
});
