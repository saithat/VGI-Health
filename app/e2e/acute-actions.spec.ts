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
test.afterAll(() => rmSync(fixtures, { recursive: true, force: true }));

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
  ["P3", "w4Worklist", "w4Worklist.toMar", "table", "Shift worklist", "w4Mar"],
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
