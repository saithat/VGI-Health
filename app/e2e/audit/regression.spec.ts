import { enterPatientChart } from "../clinical-navigation";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Audit, dismissNotifications } from "./driver";
import { z } from "zod";

test("response clock separates target readiness from input response", async ({
  page,
}) => {
  await page.setContent(
    '<button id="change">Change</button><div id="cover" style="position:fixed;inset:0;background:white">Preparing</div>',
  );
  await page.evaluate(() => {
    document.getElementById("change")?.addEventListener("click", (event) => {
      if (event.currentTarget instanceof HTMLElement)
        event.currentTarget.textContent = "Changed";
    });
    setTimeout(() => document.getElementById("cover")?.remove(), 2800);
  });
  const row = await new Audit(page).click(
    page.getByRole("button", { name: "Change", exact: true }),
  );
  expect(row.status).toBe("works");
  expect(row.effect).toContain("target readiness took");
});

test("response clock still rejects a slow handler and an inert control", async ({
  page,
}) => {
  await page.setContent(
    '<button id="slow">Slow</button><button>Inert</button>',
  );
  await page.evaluate(() => {
    document.getElementById("slow")?.addEventListener("click", (event) => {
      const end = performance.now() + 2800;
      while (performance.now() < end) {
        /* Simulate a blocked handler. */
      }
      if (event.currentTarget instanceof HTMLElement)
        event.currentTarget.textContent = "Changed";
    });
  });
  const audit = new Audit(page);
  const slow = await audit.click(
    page.getByRole("button", { name: "Slow", exact: true }),
  );
  expect(slow.status).toBe("dead");
  expect(slow.effect).toContain("Effect took");
  const inert = await audit.click(
    page.getByRole("button", { name: "Inert", exact: true }),
  );
  expect(inert.status).toBe("dead");
});

test("resolved-problem controls respond within the unchanged deadline", async ({
  page,
}) => {
  for (const [persona, target] of [
    ["P1", "w7Review"],
    ["P4", "w2Inbox"],
  ]) {
    await page.goto(
      `/ehr?mode=replay&audit=buttons&release=v3&persona=${persona}&program=releases/v3/personas/${persona}.json`,
    );
    await enterPatientChart(page);
    const activity = page.locator(`[data-comp-id="workspace.activity|${target === "w7Review" ? "inboxRxRequests" : "inboxResults"}"]`);
    if (await activity.count()) { await activity.click(); await enterPatientChart(page); }
    const program = z
      .object({
        start: z.string(),
        screens: z.array(
          z.object({
            id: z.string(),
            components: z.array(
              z.object({ id: z.string(), kind: z.unknown() }),
            ),
          }),
        ),
      })
      .parse(await page.evaluate(() => window.__buttonAuditSession?.program));
    const goto = z.object({
      button: z.object({
        action: z.object({ goto: z.object({ screen: z.string() }) }),
      }),
    });
    const currentScreen = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.screen ?? "",
    );
    const route = (() => {
      const queue: [string, string[]][] = [[currentScreen, []]];
      const seen = new Set([program.start]);
      for (const [screen, path] of queue) {
        if (screen === target) return path;
        for (const component of program.screens.find((s) => s.id === screen)
          ?.components ?? []) {
          const parsed = goto.safeParse(component.kind);
          if (
            !parsed.success ||
            seen.has(parsed.data.button.action.goto.screen)
          )
            continue;
          const destination = parsed.data.button.action.goto.screen;
          seen.add(destination);
          queue.push([destination, [...path, component.id]]);
        }
      }
      throw new Error(`No navigation to ${target}`);
    })();
    for (const comp of route)
      await page
        .locator(`button[data-comp-id="${comp}"][data-event="click"]`)
        .click();
    await page.getByRole("tab", { name: "Problems", exact: true }).click();
    const audit = new Audit(page);
    audit.persona = persona ?? "";
    audit.screen = target ?? "";
    const row = await audit.click(
      page.locator(
        `button[data-comp-id="${target}.chart.includeResolved"][data-event="click"]`,
      ),
      undefined,
      "lean",
    );
    expect(row.status).toBe("works");
    expect(row.effect).toContain("Lean state changed");
    console.log(JSON.stringify(row));
  }
});

test("fast app regression: report gate and dashboard control effects", async ({
  page,
}) => {
  const report: {
    controls: {
      owner: string;
      status: string;
      label: string;
      persona: string;
    }[];
  } = JSON.parse(
    readFileSync(
      resolve(
        process.env.EHR_AUDIT_DIR ??
          process.env.AUDIT_REPORT_DIR ??
          "../docs/audits",
        "buttons.json",
      ),
      "utf8",
    ),
  );
  expect(
    report.controls.filter((r) => ["dead", "error"].includes(r.status)),
  ).toEqual([]);
  expect(
    new Set(
      report.controls.filter((r) => r.owner === "lean").map((r) => r.persona),
    ),
  ).toEqual(new Set(["P1", "P2", "P3", "P4", "P5", "RN2"]));
  const audit = new Audit(page);
  await page.goto("/dashboard?run=run1-P3");
  await page.getByRole("region", { name: "Version history" }).waitFor();
  await audit.click(
    page.getByRole("button", { name: "Evolution", exact: true }),
  );
  await audit.click(page.getByRole("button", { name: "P3", exact: true }));
  await audit.click(
    page.getByRole("button", { name: "Releases", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Try to break it", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Show recorded verdict", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Replay counterexample", exact: true }),
  );
  await page
    .locator(".replay-screen .ehr-shell, .replay-screen .clinical-app")
    .first()
    .waitFor();
  await audit.click(
    page.getByRole("button", { name: "Reset path", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Previous event", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Next event", exact: true }),
  );
  expect(
    audit.rows.filter((r) => ["dead", "error"].includes(r.status)),
  ).toEqual([]);
});

test("checkpoint cleanup accepts an expiring notification without hiding a blocker", async ({
  page,
}) => {
  await page.setContent(
    '<style>@keyframes move{from{transform:translateX(0)}to{transform:translateX(100px)}}.mantine-Notification-closeButton{animation:move .1s infinite alternate}</style><button class="mantine-Notification-closeButton">Dismiss</button>',
  );
  await page.evaluate(() =>
    setTimeout(() => document.querySelector("button")?.remove(), 250),
  );
  await dismissNotifications(page);
  await expect(page.locator("button")).toHaveCount(0);
});
