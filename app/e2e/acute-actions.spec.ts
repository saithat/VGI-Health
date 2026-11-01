import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type {
  Event,
  FactsOutput,
  RenderInput,
  State,
  StepOutput,
  UiScreen,
} from "../../lean/generated/ehr-types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/ehr/offline";

declare global {
  interface Window {
    recordAcuteEvent: (event: Event) => Promise<void>;
  }
}

const root = resolve("..");
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const native = <T>(command: string, input: unknown): T =>
  JSON.parse(
    execFileSync(join(root, "lean/.lake/build/bin/ehr"), [command], {
      input: JSON.stringify(input),
      maxBuffer: 32e6,
      timeout: 30000,
      env: { ...process.env, LEAN_NUM_THREADS: "4" },
    }).toString(),
  );
let fixtures: string;
test.beforeAll(() => {
  fixtures = mkdtempSync(join(tmpdir(), "vgi-acute-actions-"));
  execFileSync(process.execPath, [
    join(root, "scripts/acute-review-fixtures.mjs"),
    fixtures,
  ]);
});

for (const [screen, button, elements] of [
  ["w4Flowsheet", "copyAssessment", ["nursingAssessment"]],
  [
    "w4Handoff",
    "template",
    [
      "handoffSituation",
      "handoffBackground",
      "handoffAssessment",
      "handoffRecommendation",
    ],
  ],
] as const) {
  test(`${screen}: outlines remain editable drafts without invented patient findings`, async ({
    page,
  }) => {
    const base = {
      spec: read(join(root, "releases/v1/spec.json")),
      program: read(join(root, "releases/v1/personas/P3.json")),
      user: read(join(fixtures, "P3-user.json")),
      ...native<FactsOutput>("facts", {
        bundle: read(join(fixtures, "P3.json")),
        context: read(join(fixtures, "P3-context.json")),
      }),
    };
    const input: RenderInput = { ...base, state: native<State>("init", base) };
    const events: Event[] = [];
    await page.exposeFunction("recordAcuteEvent", (event: Event) => {
      events.push(event);
    });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    const paint = async () => {
      const ui = native<UiScreen>("render-ui", input);
      await page.evaluate(
        (screen) =>
          window.renderUi(screen, null, (event) => {
            void window.recordAcuteEvent(event);
          }),
        ui,
      );
      expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
        expectedAria(ui),
      );
    };
    const advance = async (count: number) => {
      await expect.poll(() => events.length).toBe(count);
      const next = native<StepOutput>("step", {
        ...input,
        event: events[count - 1],
      });
      expect(next.result).toBe("ok");
      input.state = next.state;
      await paint();
    };
    await paint();
    await page
      .locator(`button[data-comp-id="w4Worklist.nav.${screen}"]`)
      .click();
    await advance(1);
    const original = input.state;
    await page.locator(`button[data-comp-id="${screen}.${button}"]`).click();
    await advance(2);
    expect(input.state.receipts).toEqual(original.receipts);
    expect(input.state.commits).toEqual(original.commits);
    for (const element of elements) {
      const capture = input.state.captured.find(
        (item) => item.element === element,
      );
      expect(capture).toMatchObject({ byHuman: false, confirmed: false });
      await expect(
        page.locator(`textarea[data-comp-id="${screen}.${element}"]`),
      ).toHaveValue(/\[.*\]/);
    }
    await expect(
      page.getByRole("button", {
        name: "Confirm prefilled value",
        exact: true,
      }),
    ).toHaveCount(elements.length);
    await expect(page.locator("textarea").first()).not.toHaveValue(
      /Stable overnight|Vital signs stable|alert and oriented|Copied forward/,
    );
    const first = elements[0];
    await page
      .locator(`textarea[data-comp-id="${screen}.${first}"]`)
      .fill("Clinician-entered assessment for this handoff.");
    await advance(3);
    await expect(
      page.locator(`textarea[data-comp-id="${screen}.${first}"]`),
    ).toBeFocused();
    expect(
      input.state.captured.find((item) => item.element === first),
    ).toMatchObject({ byHuman: true, confirmed: true });
    expect(input.state.commits).toEqual(original.commits);
    await expect(
      page.getByRole("button", {
        name: "Confirm prefilled value",
        exact: true,
      }),
    ).toHaveCount(elements.length - 1);
  });
}
test.afterAll(() => rmSync(fixtures, { recursive: true, force: true }));

for (const [persona, screen, element, count, choice] of [
  ["P2", "w3Triage", "triageAcuity", 5, "3"],
  ["P3", "w4Flowsheet", "painReassessment", 11, "4"],
] as const) {
  test(`${screen}: ${element} supplies its numeric choices without an automatic selection`, async ({
    page,
  }) => {
    const base = {
      spec: read(join(root, "releases/v1/spec.json")),
      program: read(join(root, `releases/v1/personas/${persona}.json`)),
      user: read(join(fixtures, `${persona}-user.json`)),
      ...native<FactsOutput>("facts", {
        bundle: read(join(fixtures, `${persona}.json`)),
        context: read(join(fixtures, `${persona}-context.json`)),
      }),
    };
    const input: RenderInput = { ...base, state: native<State>("init", base) };
    const events: Event[] = [];
    await page.exposeFunction("recordAcuteEvent", (event: Event) => {
      events.push(event);
    });
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    const paint = async () => {
      const ui = native<UiScreen>("render-ui", input);
      await page.evaluate(
        (screen) =>
          window.renderUi(screen, null, (event) => {
            void window.recordAcuteEvent(event);
          }),
        ui,
      );
      expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
        expectedAria(ui),
      );
    };
    const advance = async (count: number) => {
      await expect.poll(() => events.length).toBe(count);
      const next = native<StepOutput>("step", {
        ...input,
        event: events[count - 1],
      });
      expect(next.result).toBe("ok");
      input.state = next.state;
      await paint();
    };
    await paint();
    await page
      .locator(`button[data-comp-id="${input.state.screen}.nav.${screen}"]`)
      .click();
    await advance(1);
    expect(
      input.state.captured.find((item) => item.element === element),
    ).toBeUndefined();
    const field = page.locator(`input[data-comp-id="${screen}.${element}"]`);
    await expect(field).toHaveValue("");
    await field.click();
    await expect(page.getByRole("option")).toHaveCount(count);
    expect(events).toHaveLength(1);
    const before = input.state;
    await page.getByRole("option", { name: choice, exact: true }).click();
    await advance(2);
    expect(events[1]).toEqual({
      enter: { comp: `${screen}.${element}`, value: { code: { c: choice } } },
    });
    expect(
      input.state.captured.find((item) => item.element === element),
    ).toMatchObject({
      byHuman: true,
      confirmed: true,
      value: { code: { c: choice } },
    });
    expect(input.state.receipts).toEqual(before.receipts);
    expect(input.state.commits).toEqual(before.commits);
    await expect(field).toHaveValue(choice);
  });
}

for (const [
  persona,
  start,
  component,
  containerRole,
  containerName,
  target,
] of [
  [
    "P2",
    "w3TrackBoard",
    "w3TrackBoard.open",
    "region",
    "Selected encounter",
    "w3Triage",
  ],
  ["P3", "w4Worklist", "w4Worklist.toMar", "table", "Patient list", "w4Mar"],
  [
    "P3",
    "w4Mar",
    "w4Mar.openDue",
    "region",
    "Selected medication task",
    "w4Admin",
  ],
] as const) {
  test(`${start}: the selected context opens its declared acute activity`, async ({
    page,
  }) => {
    const source = native<FactsOutput>("facts", {
      bundle: read(join(fixtures, `${persona}.json`)),
      context: read(join(fixtures, `${persona}-context.json`)),
    });
    const base = {
      spec: read(join(root, "releases/v1/spec.json")),
      program: read(join(root, `releases/v1/personas/${persona}.json`)),
      user: read(join(fixtures, `${persona}-user.json`)),
      ...source,
    };
    const input: RenderInput = { ...base, state: native<State>("init", base) };
    if (start === "w4Mar") {
      const open = native<StepOutput>("step", {
        ...input,
        event: { click: { comp: "w4Worklist.toMar" } },
      });
      expect(open.result).toBe("ok");
      input.state = open.state;
    }
    expect(input.state.screen).toBe(start);
    await page.goto("/screen-check.html");
    await page.waitForFunction(() => typeof window.renderUi === "function");
    const events: Event[] = [];
    await page.exposeFunction("recordAcuteEvent", (event: Event) => {
      events.push(event);
    });
    const ui = native<UiScreen>("render-ui", input);
    await page.evaluate(
      (screen) =>
        window.renderUi(screen, null, (event) => {
          void window.recordAcuteEvent(event);
        }),
      ui,
    );
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(ui),
    );
    if (start === "w4Mar") {
      const grid = page.getByRole("table", {
        name: "Medication administration record",
        exact: true,
      });
      await expect(grid.locator(".tone-green")).toContainText(["Given"]);
      await expect(grid.locator(".tone-amber")).toContainText(["Held"]);
      await expect(grid.locator(".tone-red")).toContainText(["Overdue"]);
      await expect(grid.getByText("Instructions", { exact: true })).toHaveCount(
        4,
      );
      await expect(
        grid.getByText("PRN indication", { exact: true }),
      ).toHaveCount(1);
      await expect(grid.getByText("Pain", { exact: true })).toHaveCount(1);
      await expect(
        grid.getByRole("columnheader", { name: "Instructions", exact: true }),
      ).toHaveCount(0);
      const history = page.getByRole("table", {
        name: "PRN history",
        exact: true,
      });
      await expect(history).toContainText("650");
      await expect(history).toContainText("Given");
    }
    const button = page.locator(
      `button[data-comp-id="${component}"][data-event="click"]`,
    );
    await expect(button).toHaveCount(1);
    await expect(
      page
        .getByRole(containerRole, { name: containerName, exact: true })
        .locator(`button[data-comp-id="${component}"]`),
    ).toBeVisible();
    await button.click();
    await expect.poll(() => events.length).toBe(1);
    expect(events[0]).toEqual({ click: { comp: component } });
    const next = native<StepOutput>("step", { ...input, event: events[0] });
    expect(next.result).toBe("ok");
    expect(next.state.screen).toBe(target);
    // Entering triage may offer chart-prefilled weight. Navigation cannot
    // turn that offer into confirmed evidence or a human attestation.
    expect(next.state.captured.filter((c) => c.confirmed || c.byHuman)).toEqual(
      input.state.captured.filter((c) => c.confirmed || c.byHuman),
    );
    expect(next.state.commits).toEqual(input.state.commits);
    const targetUi = native<UiScreen>("render-ui", {
      ...input,
      state: next.state,
    });
    expect(targetUi.banner.find(([key]) => key === "Patient")).toEqual(
      ui.banner.find(([key]) => key === "Patient"),
    );
    await page.evaluate((screen) => window.renderUi(screen), targetUi);
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(targetUi),
    );
    if (target === "w4Admin") {
      const glucose = page.getByRole("table", {
        name: "Blood glucose — review before insulin",
        exact: true,
      });
      await expect(glucose).toContainText("186");
      await expect(glucose).toContainText("70–99");
      await expect(glucose).toContainText("H");
      await expect(
        page.getByRole("textbox", {
          name: "1. Scan patient wristband",
          exact: true,
        }),
      ).toBeVisible();
    }
  });
}

test("ED imaging retains the report, linked findings and separate image status", async ({
  page,
}) => {
  const base = {
    spec: read(join(root, "releases/v1/spec.json")),
    program: read(join(root, "releases/v1/personas/P2.json")),
    user: read(join(fixtures, "P2-user.json")),
    ...native<FactsOutput>("facts", {
      bundle: read(join(fixtures, "P2.json")),
      context: read(join(fixtures, "P2-context.json")),
    }),
  };
  const input: RenderInput = { ...base, state: native<State>("init", base) };
  const events: Event[] = [];
  await page.exposeFunction("recordAcuteEvent", (event: Event) => {
    events.push(event);
  });
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  const paint = async () => {
    const ui = native<UiScreen>("render-ui", input);
    await page.evaluate(
      (screen) =>
        window.renderUi(screen, null, (event) => {
          void window.recordAcuteEvent(event);
        }),
      ui,
    );
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(ui),
    );
  };
  await paint();
  await expect(
    page.getByRole("table", {
      name: "Emergency department patients",
      exact: true,
    }),
  ).toContainText("Report available");
  await page
    .locator('button[data-comp-id="w3TrackBoard.nav.w3Provider"]')
    .click();
  await expect.poll(() => events.length).toBe(1);
  let next = native<StepOutput>("step", { ...input, event: events[0] });
  expect(next.result).toBe("ok");
  expect(
    next.state.captured.filter(
      (capture) => capture.byHuman || capture.confirmed,
    ),
  ).toEqual(
    input.state.captured.filter(
      (capture) => capture.byHuman || capture.confirmed,
    ),
  );
  input.state = next.state;
  await paint();
  const report = page.getByRole("list", {
    name: "Imaging reports",
    exact: true,
  });
  await expect(report).toContainText(
    "Bilateral lower-lung airspace opacities.",
  );
  await expect(report).toContainText("No pleural effusion or pneumothorax.");
  await expect(report).toContainText("Avery Shah, MD");
  await expect(report).toContainText("Digital radiography");
  await expect(report).toContainText("available");
  await expect(report.locator(".tone-green")).toContainText(["final"]);
  await expect(report).not.toContainText("urn:uuid:");
  await page.getByRole("tab", { name: "Imaging", exact: true }).click();
  await expect.poll(() => events.length).toBe(2);
  expect(events[1]).toEqual({
    selectTab: { comp: "w3Provider.chart", idx: 6 },
  });
  next = native<StepOutput>("step", { ...input, event: events[1] });
  expect(next.result).toBe("ok");
  input.state = next.state;
  await paint();
  await expect(
    page.getByRole("list", { name: "Imaging", exact: true }),
  ).toContainText("Bilateral lower-lung airspace opacities.");
});
