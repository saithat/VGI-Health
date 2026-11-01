import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type {
  Event,
  RenderInput,
  StepOutput,
  UiScreen,
} from "../../lean/generated/ehr-types";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import type {} from "../src/ehr/offline";

declare global {
  interface Window {
    recordSemanticEvent: (event: Event) => Promise<void>;
  }
}

const inputs: [string, RenderInput][] = readFileSync(
  "src/fixtures/presentations/api-inputs.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map((line: string) => JSON.parse(line));
const input = inputs.find(([name]) => name === "rowActions")?.[1];
if (!input) throw new Error("Missing row action source fixture");
const native = <T>(command: string, value: unknown): T =>
  JSON.parse(
    execFileSync(resolve("../lean/.lake/build/bin/ehr"), [command], {
      input: JSON.stringify(value),
      maxBuffer: 32e6,
    }).toString(),
  );

test("every structured worklist action opens its real target and returns", async ({
  page,
}) => {
  await page.goto("/screen-check.html");
  await page.waitForFunction(() => typeof window.renderUi === "function");
  const events: Event[] = [];
  await page.exposeFunction("recordSemanticEvent", (event: Event) =>
    events.push(event),
  );
  const paint = async (screen: UiScreen) => {
    await page.evaluate(
      (screen) =>
        window.renderUi(screen, null, (event) => {
          void window.recordSemanticEvent(event);
        }),
      screen,
    );
    expect(observedAria(await page.locator("body").ariaSnapshot())).toEqual(
      expectedAria(screen),
    );
  };
  for (const [label, component, target] of [
    ["Open MAR", "open-mar", "mar-detail"],
    ["Open assessment", "open-pain", "pain-detail"],
    ["Open vitals", "open-vitals", "vitals-detail"],
  ] as const) {
    await paint(native<UiScreen>("render-ui", input));
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toHaveCount(1);
    await expect(
      page
        .getByRole("table", { name: "My Worklist" })
        .getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
    const count = events.length;
    await button.click();
    await expect.poll(() => events.length).toBe(count + 1);
    expect(events.at(-1)).toEqual({ click: { comp: component } });
    const next = native<StepOutput>("step", { ...input, event: events.at(-1) });
    expect(next.result).toBe("ok");
    expect(next.state.screen).toBe(target);
    await paint(native<UiScreen>("render-ui", { ...input, state: next.state }));
    await page
      .getByRole("button", { name: "Back to worklist", exact: true })
      .click();
    await expect.poll(() => events.length).toBe(count + 2);
    const back = native<StepOutput>("step", {
      ...input,
      state: next.state,
      event: events.at(-1),
    });
    expect(back.result).toBe("ok");
    expect(back.state.screen).toBe(input.state.screen);
  }
});
