import { test, expect } from "@playwright/test";
import { z } from "zod";
import { Audit } from "./driver";
import { writeReport } from "./report";
import { catalogSchema, defaultPatient } from "../../src/browser/data";

const personas = ["P1", "P2", "P3", "P4", "P5", "RN2"];

test("app shell: every shell control has an effect or an explained disabled state", async ({
  page: initialPage,
}) => {
  let page = initialPage;
  page.setDefaultTimeout(15000);
  const audit = new Audit(page);
  const freshGoto = async (url: string) => {
    const context = page.context();
    await page.close();
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    audit.setPage(page);
    await page.goto(url);
  };
  try {
    // Home entries get separate clean logins, including the baseline.
    for (const persona of [...personas, "baseline"]) {
      await page.context().clearCookies();
      await freshGoto("/?audit=buttons");
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      console.log(`Auditing ${persona}`);
      audit.persona = persona;
      const login = page.getByRole("button", {
        name:
          persona === "baseline"
            ? "Original canonical EHR (baseline)"
            : new RegExp(`^${persona} ·`),
      });
      await login.waitFor();
      console.log("login", await audit.click(login, undefined, "app"));
      await page
        .getByLabel("Patient search", { exact: true })
        .waitFor({ timeout: 30000 });
      const date = page.getByLabel("Worklist date", { exact: true });
      await audit.click(date, () => date.fill("2026-11-02"), "app");
      await page
        .getByText("Loading Medplum worklist…", { exact: true })
        .waitFor({ state: "hidden" });
      await audit.click(
        page.getByRole("button", { name: "Refresh worklist", exact: true }),
        undefined,
        "app",
      );
      await page
        .getByText("Loading Medplum worklist…", { exact: true })
        .waitFor({ state: "hidden" });
      const workButtons = await page
        .locator(
          '.worklist-table button, [aria-label="Medications due"] button',
        )
        .count();
      for (let w = 0; w < workButtons; w++) {
        // Each work item starts with an unselected patient in a fresh document.
        if (w) {
          await freshGoto("/?audit=buttons");
          await page.getByLabel("Patient search", { exact: true }).waitFor();
          await page
            .getByLabel("Worklist date", { exact: true })
            .fill("2026-11-02");
          await page
            .getByText("Loading Medplum worklist…", { exact: true })
            .waitFor({ state: "hidden" });
        }
        await audit.click(
          page
            .locator(
              '.worklist-table button, [aria-label="Medications due"] button',
            )
            .nth(w),
          undefined,
          "app",
        );
      }
      await audit.click(
        page.getByRole("button", { name: "Search Medplum", exact: true }),
        undefined,
        "app",
      );
      const patient = page.locator(".patient-search + ul button").first();
      await patient.waitFor();
      await audit.click(patient, undefined, "app");
      const selects = page.locator("select");
      for (const control of await selects.all()) {
        if (!(await control.isVisible())) continue;
        const values = await control
          .locator("option")
          .evaluateAll((nodes) =>
            nodes.map((n) => (n instanceof HTMLOptionElement ? n.value : "")),
          );
        const current = await control.inputValue();
        const value = values.find((v) => v && v !== current);
        if (value)
          await audit.click(control, () => control.selectOption(value), "app");
      }
      await audit.click(
        page.getByRole("button", { name: "Start new encounter", exact: true }),
        undefined,
        "app",
      );
      await page.waitForTimeout(300);
      await audit.click(
        page.getByRole("button", { name: "Open EHR", exact: true }),
        undefined,
        "app",
      );
      await page.locator(".clinical-app").waitFor({ timeout: 30000 });
      for (const label of ["Live encounter"]) {
        const button = page.getByRole("button", { name: label, exact: true });
        if (await button.count()) {
          await audit.click(button, undefined, "app");
          await page.keyboard.press("Escape");
        }
      }
      await page
        .getByRole("button", { name: "Live encounter", exact: true })
        .click();
      const back = page
        .getByRole("button", { name: /Back to worklist/ })
        .first();
      if (await back.isVisible()) await audit.click(back, undefined, "app");
      await audit.click(
        page.getByRole("button", { name: "Sign out", exact: true }),
        undefined,
        "app",
      );
    }
    writeReport(audit.rows, "app");
    audit.persona = "—";
    await audit.allShell(async () => {
      await freshGoto("/browse");
      await page.getByLabel("Patient", { exact: true }).waitFor();
    });
    // Every catalog link, including canonical, bad programs, projections and run versions, was clicked by allShell.
    await freshGoto("/ehr?mode=replay&audit=buttons&persona=P1");
    await page.locator(".clinical-app").waitFor();
    await audit.click(
      page.getByRole("button", { name: "Inspector", exact: true }),
      undefined,
      "app",
    );
    await audit.click(
      page.getByRole("button", { name: "Reset episode", exact: true }),
      undefined,
      "app",
    );
    await page.getByRole("button", { name: "Inspector", exact: true }).click();
    await audit.click(
      page.getByRole("button", { name: "Close inspector", exact: true }),
      undefined,
      "app",
    );
    await audit.allShell(async () => {
      await freshGoto("/ehr?mode=replay&audit=buttons&persona=P1");
      await page.locator(".clinical-app").waitFor();
      await page
        .getByRole("button", { name: "Inspector", exact: true })
        .click();
    });
    // Both real and authored runs: every persona, selector, version/release row and drawer action.
    for (const run of ["run1-P3", "mock"]) {
      const setup = async () => {
        await freshGoto(`/dashboard?run=${run}`);
        await page.getByRole("region", { name: "Version history" }).waitFor();
      };
      await audit.allShell(setup);
      await setup();
      const pillLabels = await page
        .getByRole("group", { name: "Persona", exact: true })
        .getByRole("button")
        .allTextContents();
      for (const pillLabel of pillLabels) {
        await setup();
        const pill = page
          .getByRole("group", { name: "Persona", exact: true })
          .getByRole("button", { name: pillLabel, exact: true });
        audit.persona = pillLabel;
        if (
          (await pill.isDisabled()) &&
          (await pill.getAttribute("aria-pressed")) !== "true"
        )
          continue;
        if (!(await pill.isDisabled())) await pill.click();
        const versionCount = await page
          .getByRole("region", { name: "Version history" })
          .getByRole("button")
          .count();
        for (let v = 0; v < versionCount; v++) {
          await audit.click(
            page
              .getByRole("region", { name: "Version history" })
              .getByRole("button")
              .nth(v),
            undefined,
            "app",
          );
          console.log(
            `${run} ${pillLabel}: version row ${v + 1}/${versionCount}`,
          );
          const dialog = page.getByRole("dialog").first();
          await dialog
            .getByRole("button", {
              name: "Before / after on screen",
              exact: true,
            })
            .waitFor();
          for (const detail of await dialog.locator("summary").all())
            await audit.click(detail, undefined, "app");
          const replayLabels = [
            "Before / after on screen",
            ...Array(
              await dialog
                .getByRole("button", {
                  name: "Replay counterexample",
                  exact: true,
                })
                .count(),
            ).fill("Replay counterexample"),
          ];
          let rejectionIndex = 0;
          for (const label of replayLabels) {
            const button = dialog
              .getByRole("button", { name: label, exact: true })
              .nth(label === "Replay counterexample" ? rejectionIndex++ : 0);
            await audit.click(button, undefined, "app");
            const replay = page.getByRole("dialog").last();
            await expect(
              replay.locator(".ehr-shell, .clinical-app").first(),
            ).toBeVisible({ timeout: 30000 });
            // Controls in replay header and event path; isolate the clinical subtree.
            for (const name of [
              "Next task event",
              "Next event",
              "Previous event",
              "Reset screens",
              "Reset path",
            ]) {
              const c = replay.getByRole("button", { name, exact: true });
              if (await c.count()) await audit.click(c, undefined, "app");
            }
            for (const eventButton of await replay
              .locator(".event-path button")
              .all())
              await audit.click(eventButton, undefined, "app");
            await audit.click(
              replay.getByRole("button", {
                name: "Close EHR replay",
                exact: true,
              }),
              undefined,
              "app",
            );
          }
          await audit.click(
            page.getByRole("button", {
              name: "Close decision record",
              exact: true,
            }),
            undefined,
            "app",
          );
        }
      }
      writeReport(audit.rows, "app");
      await setup();
      await page
        .getByRole("navigation", { name: "Dashboard areas" })
        .getByRole("button", { name: "Releases", exact: true })
        .click();
      const releases = page.getByRole("button", {
        name: /^Inspect .* migration$/,
      });
      for (let i = 0; i < (await releases.count()); i++) {
        await audit.click(releases.nth(i), undefined, "app");
        await audit.click(
          page.getByRole("button", { name: "Close EHR replay", exact: true }),
          undefined,
          "app",
        );
        await page.keyboard.press("Escape");
      }
      await page
        .getByRole("navigation", { name: "Dashboard areas" })
        .getByRole("button", { name: "Try to break it", exact: true })
        .click();
      await audit.click(
        page.getByRole("button", {
          name: "Show recorded verdict",
          exact: true,
        }),
        undefined,
        "app",
      );
      await audit.click(
        page.getByRole("button", {
          name: "Replay counterexample",
          exact: true,
        }),
        undefined,
        "app",
      );
      await audit.click(
        page.getByRole("button", { name: "Close EHR replay", exact: true }),
        undefined,
        "app",
      );
    }
  } finally {
    writeReport(audit.rows, "app");
  }
  expect(
    audit.rows.filter((r) => r.status === "dead" || r.status === "error"),
  ).toEqual([]);
});

test("Lean EHR: breadth-first observed screens, isolated button clicks and real live personas", async ({
  page: initialPage,
  request,
}) => {
  let page = initialPage;
  page.setDefaultTimeout(15000);
  const audit = new Audit(page);
  const freshGoto = async (url: string) => {
    const context = page.context();
    await page.close();
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    audit.setPage(page);
    await page.goto(url);
  };
  const catalog = catalogSchema.parse(
    await (await request.get("/catalog.json")).json(),
  );
  try {
    for (const persona of personas) {
      console.log(`Auditing ${persona}`);
      audit.persona = persona;
      await freshGoto("/?audit=buttons");
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page
        .getByRole("button", { name: new RegExp(`^${persona} ·`) })
        .click();
      await page
        .getByLabel("Patient search", { exact: true })
        .waitFor({ timeout: 30000 });
      // Match the persona to a representative Synthea fixture.
      const patient = defaultPatient(
        catalog,
        persona === "RN2" ? "P3" : persona,
      );
      await page
        .getByLabel("Patient search", { exact: true })
        .fill(patient.name.split(" ")[0] ?? "");
      await page
        .getByRole("button", { name: "Search Medplum", exact: true })
        .click();
      await page.locator(".patient-search + ul button").first().click();
      await page
        .getByRole("button", { name: "Start new encounter", exact: true })
        .click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "Open EHR", exact: true }).click();
      await page.waitForFunction(() => !!window.__buttonAuditSession, {
        timeout: 30000,
      });
      audit.program =
        z
          .object({
            id: z.string().optional(),
            persona: z.string().optional(),
            version: z.number().optional(),
          })
          .passthrough()
          .parse(
            await page.evaluate(() => window.__buttonAuditSession?.program),
          ).id ?? `live/${persona}`;
      const programComponents = z
        .object({
          screens: z.array(
            z.object({
              id: z.string(),
              components: z.array(
                z.object({ id: z.string(), kind: z.unknown() }),
              ),
            }),
          ),
        })
        .passthrough()
        .parse(await page.evaluate(() => window.__buttonAuditSession?.program));
      const leanSelector =
        'button, [role="button"], a[href], [role="tab"], [role="menuitem"], summary, select, input[type="checkbox"], input[placeholder="Search the patient chart"], input[role="combobox"]';
      const queue = [
        await page.evaluate(
          () => window.__buttonAuditSession?.checkpoint() ?? -1,
        ),
      ];
      const seenScreens = new Set<string>();
      const tested = new Set<string>();
      while (queue.length) {
        const checkpoint = queue.shift() ?? -1;
        await page.evaluate(
          (id) => window.__buttonAuditSession?.restore(id),
          checkpoint,
        );
        await page.waitForTimeout(30);
        const snapshot = await page.evaluate(() =>
          window.__buttonAuditSession?.snapshot(),
        );
        if (!snapshot) throw new Error("Missing audit session");
        const screen = snapshot.state.screen;
        const variant = `${screen}:${JSON.stringify(snapshot.state.tabSel)}:${JSON.stringify(snapshot.state.popup)}:${JSON.stringify(snapshot.state.acked)}:${JSON.stringify(snapshot.state.receipts)}:${JSON.stringify(snapshot.state.commits)}:${JSON.stringify(snapshot.state.captured.map((c) => [c.element, c.confirmed]))}`;
        if (seenScreens.has(variant)) continue;
        seenScreens.add(variant);
        audit.screen = screen;
        // Inventory static nav and stepper destinations as well as actual controls.
        if (!seenScreens.has(`static:${screen}`)) {
          seenScreens.add(`static:${screen}`);
          const staticEntries = await page
            .locator(
              ".workflow-links li:not(:has(button)):not([inert] *), .clinical-stepper li:not(:has(button)):not([inert] *)",
            )
            .allTextContents();
          for (const label of staticEntries)
            audit.rows.push({
              route: "/",
              persona,
              program: audit.program,
              screen,
              label: label.trim(),
              comp: null,
              kind: "nav/stepper destination without click metadata",
              owner: "lean",
              status: "dead",
              effect: "Static label; no interpreter click component supplied",
            });
        }
        // Expand every workflow group before indexing controls, then checkpoint it.
        while (
          await page
            .locator(
              '.workflow-groups button[aria-expanded="false"]:not([inert] *)',
            )
            .count()
        )
          await page
            .locator(
              '.workflow-groups button[aria-expanded="false"]:not([inert] *)',
            )
            .first()
            .click();
        const targets = await page.locator(leanSelector).evaluateAll((nodes) =>
          nodes
            .filter(
              (el) => el.getClientRects().length && !el.closest("[inert]"),
            )
            .map((el, index) => ({
              index,
              disabled: el.matches(":disabled, [aria-disabled='true']"),
              clinical: !!el.closest(".clinical-app, .clinical-modal"),
              comp: el.getAttribute("data-comp-id"),
              event: el.getAttribute("data-event"),
              tab: el.getAttribute("data-tab-index") ?? (el.getAttribute("role") === "tab" ? el.textContent : ""),
              label:
                el.getAttribute("aria-label") ||
                el.textContent?.trim() ||
                el.tagName,
              tag: el.tagName,
            })),
        );
        for (const target of targets) {
          if (!target.clinical) continue;
          const key = `${screen}:${target.comp ?? target.label}:${target.event ?? target.tag}:${target.tab}:${target.disabled}`;
          if (tested.has(key)) continue;
          tested.add(key);
          await page.evaluate(
            (id) => window.__buttonAuditSession?.restore(id),
            checkpoint,
          );
          await page.waitForTimeout(20);
          while (
            await page
              .locator(
                '.workflow-groups button[aria-expanded="false"]:not([inert] *)',
              )
              .count()
          )
            await page
              .locator(
                '.workflow-groups button[aria-expanded="false"]:not([inert] *)',
              )
              .first()
              .click();
          const controls = page
            .locator(
              leanSelector
                .split(", ")
                .map((s) => `${s}:not([inert] *)`)
                .join(", "),
            )
            .filter({ visible: true });
          const control = controls.nth(target.index);
          if (!(await control.count()) || !(await control.isVisible()))
            continue;
          let action: (() => Promise<unknown>) | undefined;
          if (target.tag === "INPUT" || target.tag === "TEXTAREA") {
            const type = await control.getAttribute("type");
            if ((await control.getAttribute("role")) === "combobox") {
              action = async () => {
                await control.click();
                const option = page.getByRole("option").first();
                if (await option.count()) await option.click();
                else await control.fill("72");
                await page.keyboard.press("Escape");
              };
            } else if (type === "checkbox") {
              const checked = await control.isChecked();
              action = () => control.setChecked(!checked);
            } else
              action = () =>
                control.fill(
                  type === "date"
                    ? "2026-10-31"
                    : type === "datetime-local"
                      ? "2026-10-31T09:00"
                      : "72",
                );
          } else if (target.tag === "SELECT") {
            const current = await control.inputValue();
            const value = await control
              .locator("option")
              .evaluateAll(
                (nodes, current) =>
                  nodes
                    .filter(
                      (n): n is HTMLOptionElement =>
                        n instanceof HTMLOptionElement,
                    )
                    .find((n) => n.value !== current)?.value,
                current,
              );
            if (value !== undefined) action = () => control.selectOption(value);
          }
          const row = await audit.click(control, action, "lean");
          const component = programComponents.screens
            .find((s) => s.id === screen)
            ?.components.find((c) => c.id === target.comp);
          if (component)
            row.kind = `${target.event ?? target.tag}${target.tab ? ` index ${target.tab}` : ""} / ${JSON.stringify(component.kind)}`;
          const after = await page.evaluate(() =>
            window.__buttonAuditSession?.snapshot(),
          );
          if (
            after &&
            JSON.stringify(after.state) !== JSON.stringify(snapshot.state)
          )
            queue.push(
              await page.evaluate(
                () => window.__buttonAuditSession?.checkpoint() ?? -1,
              ),
            );
        }
        await page.evaluate(
          (id) => window.__buttonAuditSession?.restore(id),
          checkpoint,
        );
        const pending = page
          .locator('[data-event="confirm"]:not([inert] *)')
          .filter({ visible: true });
        if (await pending.count()) {
          let confirmed = 0;
          while ((await pending.count()) && confirmed++ < 40)
            await pending.first().click();
          queue.push(
            await page.evaluate(
              () => window.__buttonAuditSession?.checkpoint() ?? -1,
            ),
          );
        }
        console.log(
          `${persona} ${screen}: ${tested.size} controls, ${queue.length} queued`,
        );
        writeReport(audit.rows, "ehr");
      }
    }
  } finally {
    writeReport(audit.rows, "ehr");
  }
});
