import { test, expect, type Page } from "@playwright/test";
import { uiScreenSchema, type UiScreen } from "../ehr/ui/types";
import type { Output } from "./layout";

/** Cut-over regressions for the Lean clinical page that need no live
 * service: tables as grids with in-row actions and page keys, confirmation
 * and acknowledgment as separate events, tab/panel relationships across
 * patches and board modal ownership with a pinned urgent rail. The fixture
 * host paints with the same reference family, painter and WASM keyboard as
 * `/lean.html`, and records the events the painter sends (it applies none). */
declare global {
  interface Window {
    __leanPaint?: Output;
  }
}
/** Fixtures pass the same wire-format validation as recorded screens. */
const asScreen = (value: unknown): UiScreen => uiScreenSchema.parse(value);
const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];
const banner: [string, string][] = [
  ["Patient", "Alex Painter"],
  ["MRN", "PAINTER-001"],
  ["DOB", "1968-01-01"],
];
const button = (comp: string, label: string, role = "nav") => ({
  button: {
    comp,
    label,
    role,
    enabled: true,
    blockedReason: null,
    hotkey: null,
  },
});
const record = (i: number, flag = ""): [string, string][] => [
  ["Test", `Test ${i}`],
  ["Value", String(i)],
  ["Flag", flag],
  ["Collected", `Jan ${1 + (i % 28)}, 2026 08:00`],
];
const orders = ["Amoxicillin 500 mg", "Lisinopril 10 mg", "Metformin 500 mg"];
function tablesScreen(page = 0): UiScreen {
  return asScreen({
    screen: "cutover-tables",
    banner,
    viewer: "Clinician P1",
    nav: [],
    title: "Lists",
    workspace: [
      {
        info: {
          comp: "orders.list",
          label: "Active orders",
          infoId: "orders",
          display: "table",
          rows: orders.map((o) => [
            ["Order", o],
            ["Status", "active"],
          ]),
        },
      },
      ...orders.map((o, row) => ({
        rowAction: {
          target: "orders.list",
          row,
          children: [button(`orders.open|${row}`, `Open ${o}`)],
        },
      })),
      {
        info: {
          comp: "results.detail",
          label: "Result details",
          infoId: "resultDetail",
          display: "table",
          rows: Array.from({ length: 47 }, (_, i) =>
            record(i, i === 3 || i === 31 ? "H" : ""),
          ),
        },
      },
    ],
    side: [],
    modal: null,
    ...(page ? { pages: [["results.detail", page]] } : {}),
  });
}
async function preview(page: Page) {
  await page.goto("/tests/lean-widget-preview.html");
  await page.waitForFunction(
    () => typeof window.paintLeanWidget === "function",
  );
}
async function paint(page: Page, screen: UiScreen) {
  const accepted = await page.evaluate(
    (screen) => window.paintLeanWidget?.(screen).accepted,
    screen,
  );
  expect(accepted, screen.screen).toBe(true);
}
const events = (page: Page) =>
  page.evaluate(() => structuredClone(window.leanEvents ?? []));
const clearEvents = (page: Page) =>
  page.evaluate(() => window.leanEvents?.splice(0));
const focused = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement;
    return e instanceof HTMLElement
      ? {
          source: e.dataset.source ?? "",
          row: e.dataset.row,
          col: e.dataset.col,
          text: e.getAttribute("aria-label") ?? "",
          id: e.id,
        }
      : undefined;
  });
/** The source path of a table by its component (Lean's heading part). */
const tableSource = (page: Page, comp: string) =>
  page.locator(`[data-role="heading"]`).evaluateAll(
    (els, comp) =>
      els
        .filter((e) => e instanceof HTMLElement)
        .find((e) => {
          const paint = window.__leanPaint;
          const i = paint?.boxes.findIndex(
            (d) => d.box.info.id === e.dataset.box,
          );
          return i !== undefined && paint?.parts?.[i]?.comp === comp;
        })?.dataset.source,
    comp,
  );
const cell = (page: Page, table: string, row: number, col: number) =>
  page.locator(
    `[role="gridcell"][data-row="${row}"][data-col="${col}"][data-source^="${table}."]`,
  );

for (const viewport of viewports)
  test(`tables at ${viewport.width}×${viewport.height}: row actions in their rows, whole-row navigation, grid and page keys`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await preview(page);
    await paint(page, tablesScreen());
    await expect(page.locator("#root")).toHaveAttribute(
      "data-reference-layout",
      "dense",
    );
    const ordersTable = await tableSource(page, "orders.list");
    const results = await tableSource(page, "results.detail");
    expect(ordersTable).toBeTruthy();
    expect(results).toBeTruthy();
    if (!ordersTable || !results) return;
    // Each record's single action button sits inside its own row's band.
    for (const [row] of orders.entries()) {
      const action = page.locator(
        `[data-comp-id="orders.open|${row}"][data-event="click"]`,
      );
      await expect(action).toBeVisible();
      const a = await action.boundingBox();
      const cells = await page
        .locator(
          `[role="gridcell"][data-row="${row}"][data-source^="${ordersTable}."]`,
        )
        .evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, right: r.right };
          }),
        );
      expect(cells.length).toBe(2);
      if (!a) throw Error("No action box");
      const top = Math.min(...cells.map((c) => c.top)),
        bottom = Math.max(...cells.map((c) => c.bottom));
      expect(a.y + a.height / 2).toBeGreaterThanOrEqual(top);
      expect(a.y + a.height / 2).toBeLessThanOrEqual(bottom);
      expect(a.x).toBeGreaterThanOrEqual(
        Math.max(...cells.map((c) => c.right)),
      );
    }
    // Whole-row navigation: a click or Enter on any cell of a record sends
    // that record's action click, and nothing else.
    await clearEvents(page);
    await cell(page, ordersTable, 1, 0).click();
    expect(await events(page)).toEqual([
      { event: { click: { comp: "orders.open|1" } } },
    ]);
    await clearEvents(page);
    await cell(page, ordersTable, 2, 1).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press(" ");
    expect(await events(page)).toEqual([
      { event: { click: { comp: "orders.open|2" } } },
      { event: { click: { comp: "orders.open|2" } } },
    ]);
    // A row without an action: clicks send nothing.
    await clearEvents(page);
    await cell(page, results, 0, 0).click();
    expect(await events(page)).toEqual([]);
    // Grid keys through Keyboard.grid on the paged results list (page 1 of 3,
    // 20 records shown, four columns). Focus moves; no event is sent.
    const grid = page.locator(`[data-source="${results}"]`);
    await expect(grid).toHaveAttribute("aria-rowcount", "20");
    await expect(grid).toHaveAttribute("aria-colcount", "4");
    await cell(page, results, 0, 0).focus();
    const at = async (row: number, col: number) =>
      expect(await focused(page)).toMatchObject({
        row: String(row),
        col: String(col),
      });
    await page.keyboard.press("ArrowLeft");
    await at(0, 0);
    await page.keyboard.press("ArrowUp");
    await at(0, 0);
    await page.keyboard.press("ArrowRight");
    await at(0, 1);
    await page.keyboard.press("ArrowDown");
    await at(1, 1);
    await page.keyboard.press("End");
    await at(1, 3);
    await page.keyboard.press("ArrowRight");
    await at(1, 3);
    await page.keyboard.press("Home");
    await at(1, 0);
    await page.keyboard.press("Control+End");
    await at(19, 3);
    await page.keyboard.press("ArrowDown");
    await at(19, 3);
    await page.keyboard.press("Control+Home");
    await at(0, 0);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("PageDown");
    await at(19, 1);
    await page.keyboard.press("PageUp");
    await at(0, 1);
    expect(await events(page)).toEqual([]);
    // At the first row of page 1, Page Up cannot turn back: no event.
    await page.keyboard.press("PageUp");
    await at(0, 1);
    expect(await events(page)).toEqual([]);
    // At the last row shown, Page Down turns to the next page through the
    // list's own pager event (the same event as the "Next page" button).
    await page.keyboard.press("PageDown");
    await page.keyboard.press("PageDown");
    expect(await events(page)).toEqual([
      { event: { selectTab: { comp: "results.detail", idx: 1 } } },
    ]);
    await clearEvents(page);
    // The interpreter selects page 2; the patch keeps the focused cell.
    await paint(page, tablesScreen(1));
    await at(19, 1);
    expect((await focused(page))?.text).toContain("39");
    await expect(
      page.locator('[data-role="position"]').first(),
    ).toHaveAttribute("aria-label", "Records 21–40 of 47");
    await page.keyboard.press("PageUp");
    await at(0, 1);
    await page.keyboard.press("PageUp");
    expect(await events(page)).toEqual([
      { event: { selectTab: { comp: "results.detail", idx: 0 } } },
    ]);
  });

test("confirmation and acknowledgment stay separate events; a modal blocks confirmation", async ({
  page,
}) => {
  await preview(page);
  const field = (comp: string, label: string) => ({
    field: {
      comp,
      label,
      kind: "text",
      value: "500 mg",
      unit: null,
      provenance: "Order favorite",
      pendingConfirm: true,
      humanOnly: false,
      required: true,
    },
  });
  const base = {
    screen: "cutover-confirm",
    banner,
    viewer: "Clinician P1",
    nav: [],
    title: "Order",
    workspace: [
      field("order.dose", "Dose"),
      button("order.dose", "Confirm dose", "confirm"),
      field("order.route", "Route"),
      button("order.sign", "Sign order", "primary"),
    ],
    side: [],
  };
  await paint(page, asScreen({ ...base, modal: null }));
  await clearEvents(page);
  // The explicit confirmation button and the pending part of a field without
  // one each send `confirm` for their own component.
  await page
    .locator('[data-comp-id="order.dose"][data-event="confirm"]')
    .click();
  await page
    .locator('[data-comp-id="order.route"][data-event="confirm"]')
    .click();
  expect(await events(page)).toEqual([
    { event: { confirm: { comp: "order.dose" } } },
    { event: { confirm: { comp: "order.route" } } },
  ]);
  // An interruptive alert: acknowledgment sends `ack` for its alert; the
  // confirmation controls are blocked behind it; Escape sends nothing.
  await clearEvents(page);
  await paint(
    page,
    asScreen({
      ...base,
      modal: {
        section: {
          id: "modal",
          title: "Drug–allergy alert",
          children: [
            {
              alert: {
                comp: "allergyAlert",
                alertId: "allergyAlert",
                label: "Penicillin allergy recorded for amoxicillin.",
                severity: "interruptive",
              },
            },
            button("allergyAlert", "Acknowledge", "ack"),
          ],
        },
      },
    }),
  );
  const confirm = page.locator(
    '[data-comp-id="order.dose"][data-event="confirm"]',
  );
  await expect(confirm.first()).toBeDisabled();
  await page.keyboard.press("Escape");
  await confirm.first().dispatchEvent("click");
  expect(await events(page)).toEqual([]);
  const ack = page.locator('[data-comp-id="allergyAlert"][data-event="ack"]');
  await expect(ack).toBeFocused();
  await ack.click();
  expect(await events(page)).toEqual([
    { event: { ack: { alert: "allergyAlert" } } },
  ]);
});

const tabsScreen = (selected: number): UiScreen =>
  asScreen({
    screen: "cutover-tabs",
    banner,
    viewer: "Clinician P1",
    nav: [],
    title: "Chart review",
    workspace: [
      {
        tabs: {
          id: "chart",
          labels: ["Summary", "Results", "Notes"],
          selected,
          body: [
            {
              info: {
                comp: `chart.body${selected}`,
                label: ["Summary", "Results", "Notes"][selected] ?? "",
                infoId: "summary",
                display: "table",
                rows: [record(selected), record(selected + 1)],
              },
            },
            button(`chart.more${selected}`, "Review", "review"),
          ],
        },
      },
      button("after", "Continue", "secondary"),
    ],
    side: [],
    modal: null,
  });

test("tabs: tablist and panel relationships, roving focus, arrows and activation across patches", async ({
  page,
}) => {
  await preview(page);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await paint(page, tabsScreen(0));
    const relations = () =>
      page.evaluate(() => {
        const list = document.querySelector('[role="tablist"]');
        const panel = document.querySelector('[role="tabpanel"]');
        const tabs = [
          ...document.querySelectorAll<HTMLElement>('[role="tab"]'),
        ];
        const owned = (panel?.getAttribute("aria-owns") ?? "")
          .split(" ")
          .filter(Boolean);
        return {
          listOwns: (list?.getAttribute("aria-owns") ?? "").split(" "),
          tabs: tabs.map((t) => ({
            id: t.id,
            text: t.getAttribute("aria-label"),
            selected: t.getAttribute("aria-selected"),
            controls: t.getAttribute("aria-controls"),
            tabIndex: t.tabIndex,
          })),
          panel: panel?.id,
          labelledBy: panel?.getAttribute("aria-labelledby"),
          ownedText: owned.map((id) =>
            document.getElementById(id)?.getAttribute("aria-label"),
          ),
          ownedPanelOnly: owned.every(
            (id) => !document.getElementById(id)?.querySelector('[role="tab"]'),
          ),
          outside: document
            .querySelector('[data-comp-id="after"]')
            ?.closest("[data-box]")?.id,
          owned,
        };
      });
    const check = async (selected: number) => {
      const r = await relations();
      expect(r.tabs.map((t) => t.text)).toEqual([
        "Summary",
        "Results",
        "Notes",
      ]);
      expect(r.listOwns).toEqual(r.tabs.map((t) => t.id));
      r.tabs.forEach((t, i) => {
        expect(t.selected).toBe(String(i === selected));
        expect(t.controls).toBe(i === selected ? r.panel : null);
        expect(t.tabIndex).toBe(i === selected ? 0 : -1);
      });
      expect(r.labelledBy).toBe(r.tabs[selected]?.id);
      // The panel owns the visible body (heading, cells, button) and not the
      // tabs or the control after the tabs node.
      expect(r.ownedText).toContain(["Summary", "Results", "Notes"][selected]);
      expect(r.ownedText).toContain(`Test ${selected}`);
      expect(r.ownedText).toContain("Review");
      expect(r.ownedPanelOnly).toBe(true);
      expect(r.owned).not.toContain(r.outside);
    };
    await check(0);
    await clearEvents(page);
    // Tab enters the tablist at the selected tab (the only tab in the Tab order).
    // A click on the banner (before the tabs) moves the sequential focus
    // starting point there; Tab then enters the tablist.
    const enterFromStart = () =>
      page
        .locator('[role="banner"]')
        .first()
        .click({ position: { x: 2, y: 2 } });
    await enterFromStart();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tab", { name: "Summary" })).toBeFocused();
    // Manual activation: arrows move focus only; Enter activates.
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Results" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Notes" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Summary" })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Notes" })).toBeFocused();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    expect(await events(page)).toEqual([]);
    await page.keyboard.press("Enter");
    expect(await events(page)).toEqual([
      { event: { selectTab: { comp: "chart", idx: 1 } } },
    ]);
    // The interpreter selects it: the patch keeps focus on that tab and moves
    // the panel relationship with the selection.
    await paint(page, tabsScreen(1));
    await expect(page.getByRole("tab", { name: "Results" })).toBeFocused();
    await check(1);
    await enterFromStart();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tab", { name: "Results" })).toBeFocused();
    await clearEvents(page);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press(" ");
    expect(await events(page)).toEqual([
      { event: { selectTab: { comp: "chart", idx: 2 } } },
    ]);
    await paint(page, tabsScreen(2));
    await expect(page.getByRole("tab", { name: "Notes" })).toBeFocused();
    await check(2);
    await clearEvents(page);
  }
});

const pane = (
  patient: string,
  name: string,
  modal: unknown[],
  urgent: unknown[] = [],
) => ({
  patientPane: {
    patient,
    banner: [
      ["Patient", name],
      ["MRN", patient],
    ],
    metadata: {
      fieldChoices: [],
      fieldSources: [],
      sourceLabels: [],
      entryHints: [],
      ...(urgent.length ? { urgent } : {}),
    },
    children: [
      button("review", "Review chart", "review"),
      {
        field: {
          comp: "note",
          label: "Progress note",
          kind: "text",
          value: null,
          unit: null,
          provenance: null,
          pendingConfirm: false,
          humanOnly: true,
          required: false,
        },
      },
    ],
    modal,
  },
});
function boardScreen(modalOn?: string): UiScreen {
  const alert = (patient: string) => ({
    alert: {
      comp: `urgent:sepsis`,
      alertId: "sepsis",
      label: `Sepsis screen positive for ${patient}`,
      severity: "interruptive",
    },
  });
  const modal = (patient: string) =>
    modalOn === patient
      ? [
          {
            alert: {
              comp: "allergyAlert",
              alertId: "allergyAlert",
              label: "Penicillin allergy recorded.",
              severity: "interruptive",
            },
          },
          button("allergyAlert", "Acknowledge", "ack"),
        ]
      : [];
  return asScreen({
    screen: "patient-board",
    banner: [
      ["Patient", "Alex Painter · MRN A"],
      ["Patient", "Blair Painter · MRN B"],
    ],
    viewer: "Clinician P2",
    nav: [],
    title: "Patient board",
    workspace: [
      {
        board: {
          urgent: [
            {
              patient: "B",
              banner: [["Patient", "Blair Painter"]],
              alertId: "sepsis",
              label: "Sepsis screen positive for B",
              severity: "interruptive",
            },
          ],
          children: [
            pane("A", "Alex Painter", modal("A")),
            pane("B", "Blair Painter", modal("B"), [alert("B")]),
          ],
        },
      },
    ],
    side: [],
    modal: null,
  });
}

test("board fixture at every desktop size: repeated IDs, pane-scoped events, cross-patient modal ownership and the urgent rail", async ({
  page,
}) => {
  await preview(page);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await paint(page, boardScreen());
    const review = (patient: string) =>
      page.locator(
        `[data-patient="${patient}"] [data-comp-id="review"][data-event="click"]`,
      );
    // The same component ID in two panes: two controls, each patient-bound.
    await expect(
      page.locator('[data-comp-id="review"][data-event="click"]'),
    ).toHaveCount(2);
    await clearEvents(page);
    await review("A").click();
    await review("B").click();
    await page
      .locator('[data-patient="B"] [data-comp-id="note"][data-event="enter"]')
      .fill("Stable");
    expect(await events(page)).toEqual([
      { patient: "A", event: { click: { comp: "review" } } },
      { patient: "B", event: { click: { comp: "review" } } },
      {
        patient: "B",
        event: { enter: { comp: "note", value: { text: { s: "Stable" } } } },
      },
    ]);
    // The urgent rail is pinned and visible, inside the viewport.
    const urgent = page
      .locator('[data-role="alert"]')
      .filter({ has: page.locator("svg") })
      .first();
    await expect(urgent).toBeVisible();
    const u = await urgent.boundingBox();
    expect(u && u.y >= 0 && u.y + u.height <= viewport.height).toBe(true);
    // A modal in pane A owns the whole board: pane B's controls are blocked,
    // and the alert's acknowledgment is the only enabled action.
    await clearEvents(page);
    await paint(page, boardScreen("A"));
    await expect(review("B")).toBeDisabled();
    await expect(review("A")).toBeDisabled();
    await review("B").dispatchEvent("click");
    const ack = page.locator(
      '[data-patient="A"] [data-comp-id="allergyAlert"][data-event="ack"]',
    );
    await expect(ack).toBeFocused();
    // Tab stays inside the alert dialog.
    await page.keyboard.press("Tab");
    await expect(ack).toBeFocused();
    await expect(urgent).toBeVisible();
    await ack.click();
    expect(await events(page)).toEqual([
      { patient: "A", event: { ack: { alert: "allergyAlert" } } },
    ]);
    // The same alert in pane B is owned by B alone.
    await clearEvents(page);
    await paint(page, boardScreen("B"));
    await expect(review("A")).toBeDisabled();
    await page
      .locator(
        '[data-patient="B"] [data-comp-id="allergyAlert"][data-event="ack"]',
      )
      .click();
    expect(await events(page)).toEqual([
      { patient: "B", event: { ack: { alert: "allergyAlert" } } },
    ]);
    await paint(page, boardScreen());
    await expect(review("B")).toBeEnabled();
  }
});
