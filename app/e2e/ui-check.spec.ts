import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import { formatDisplayValue } from "../src/ehr/ui/display";
import {
  uiScreenSchema,
  type UiNode,
  type UiScreen,
} from "../src/ehr/ui/types";
import type {} from "../src/ehr/offline";

const supplied = z
  .array(z.string())
  .parse(JSON.parse(process.env.EHR_UI_FILES ?? "[]"));
const fixtures = supplied.length
  ? supplied
  : readdirSync("src/fixtures/ui")
      .filter((name) => name.endsWith(".json"))
      .map((name) => resolve("src/fixtures/ui", name));
const minimum = Number(process.env.EHR_MIN_FONT_PX ?? 12);
if (!Number.isFinite(minimum) || minimum < 12)
  throw new Error("Legibility minimum must be at least 12px");

async function render(page: Page, screen: UiScreen) {
  await page.evaluate((screen) => window.renderUi(screen), screen);
  await page.evaluate(() => document.fonts.ready);
  // Accordion uses transitions. Wait for every expected region to settle.
  await page.waitForTimeout(220);
}
function nodes(tree: UiNode): UiNode[] {
  if ("section" in tree) return [tree, ...tree.section.children.flatMap(nodes)];
  if ("columns" in tree) return [tree, ...tree.columns.children.flatMap(nodes)];
  if ("tabs" in tree) return [tree, ...tree.tabs.body.flatMap(nodes)];
  return [tree];
}
async function visibility(page: Page) {
  const failures = await page.evaluate((min) => {
    const errors: string[] = [];
    // Font checks overlap through regions/groups and their child controls. Inspect
    // each text node once in this synchronous, static DOM pass.
    const textChecked = new WeakSet<Node>();
    const selector =
      'header, nav, main h1, section[role="region"], [data-comp-id], [data-info-id] th, [data-info-id] td, [data-info-id] dt, [data-info-id] dd, [data-info-id] li, nav button, [role="tab"], [role="dialog"]';
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
  test(`semantic UI fidelity: ${file}`, async ({ page, baseURL }) => {
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
      expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
        expectedAria({ ...screen, modal: null }),
      );
    }
    await visibility(page);
    // Every record cell and banner value must survive painting, including rows after
    // the first one. Values are data, not FHIR/clinical interpretation in React.
    // The assertions are identical to toContainText's normalized text checks,
    // collected in two browser round trips rather than one per patient value.
    const normalize = (text: string) => text.replace(/[\u200b\u00ad]/g, "").replace(/\s+/g, " ").trim();
    const bannerText = normalize(await page.getByRole("banner").textContent() ?? "");
    for (const [, value] of screen.banner)
      if (value) expect(bannerText).toContain(normalize(formatDisplayValue(value)));
    const infos = [...screen.side, ...screen.workspace]
      .flatMap(nodes)
      .flatMap((node) => ("info" in node ? [node.info] : []));
    const panels = (await page.locator("[data-info-id]").allTextContents()).map(normalize);
    for (const [index, info] of infos.entries()) {
      expect(panels[index], `Missing rendered info ${index}`).toBeDefined();
      for (const row of info.rows)
        for (const [, value] of row)
          if (value) expect(panels[index]).toContain(normalize(formatDisplayValue(value)));
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
      ).toHaveText("30 Oct 2026");
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
