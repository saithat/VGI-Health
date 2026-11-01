import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ButtonAuditSession } from "../../src/core/buttonAudit";
import type { Control } from "./report";
import { test, expect } from "@playwright/test";
import { z } from "zod";
import { Audit, selector } from "./driver";
import { writeLiveAttempt, writeReport } from "./report";
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
    const baseline = page.url().startsWith("http")
      ? await page.evaluate(() => sessionStorage.getItem("vgi.baseline"))
      : null;
    await page.close();
    page = await context.newPage();
    if (baseline !== null)
      await page.addInitScript(
        (value) => sessionStorage.setItem("vgi.baseline", value),
        baseline,
      );
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
      audit.screen = "sign-in";
      audit.program = "—";
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
      audit.screen = "worklist";
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
      audit.screen = "encounter picker";
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
      audit.screen = "live encounter header";
      if (persona === "baseline") {
        const source = z
          .object({ id: z.string() })
          .passthrough()
          .parse(
            await (
              await page.context().request.get("/releases/v2/canonical.json")
            ).json(),
          );
        const active = z
          .object({ id: z.string() })
          .passthrough()
          .parse(
            await page.evaluate(() => window.__buttonAuditSession?.program),
          );
        expect(active.id).toBe(source.id);
      }
      for (const label of ["Live encounter"]) {
        const button = page.getByRole("button", { name: label, exact: true });
        if (await button.count()) {
          await audit.click(button, undefined, "app");
          await audit.click(
            page.getByRole("button", {
              name: "Close live encounter",
              exact: true,
            }),
            undefined,
            "app",
          );
        }
      }
      await page
        .getByRole("button", { name: "Live encounter", exact: true })
        .click();
      const back = page
        .getByRole("button", { name: /Back to worklist/ })
        .first();
      await back.waitFor();
      await audit.click(back, undefined, "app");
      await audit.click(
        page.getByRole("button", { name: "Sign out", exact: true }),
        undefined,
        "app",
      );
    }
    writeReport(audit.rows, "app");
    audit.persona = "—";
    audit.program = "—";
    audit.screen = "program browser";
    await audit.allShell(async () => {
      await freshGoto("/browse");
      await page.getByLabel("Patient", { exact: true }).waitFor();
    });
    // Every catalog link, including canonical, bad programs, projections and run versions, was clicked by allShell.
    audit.screen = "replay inspector";
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
    await audit.allShell(async () => {
      await freshGoto("/ehr?mode=replay&audit=buttons&persona=P1");
      await page.locator(".clinical-app").waitFor();
      await page
        .getByRole("button", { name: "Inspector", exact: true })
        .click();
      await page.locator(".patient-switcher summary").click();
    });
    // Both real and authored runs: every persona, selector, version/release row and drawer action.
    for (const run of ["run1-P3", "mock"]) {
      audit.program = run;
      audit.screen = "Evolution";
      const checkedDecisionLinks = new Set<string>();
      const setup = async () => {
        await freshGoto(`/dashboard?run=${run}`);
        await page.getByRole("region", { name: "Version history" }).waitFor();
        audit.persona = await page
          .getByRole("group", { name: "Persona", exact: true })
          .locator('[aria-pressed="true"]')
          .innerText();
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
          // Verify each distinct JSON source link without retaining old WASM documents.
          const rowButton = page
            .getByRole("region", { name: "Version history" })
            .getByRole("button")
            .nth(v);
          await rowButton.click();
          await page
            .getByRole("button", {
              name: "Before / after on screen",
              exact: true,
            })
            .waitFor();
          const sourceLink = page.getByRole("link", {
            name: "Open recorded decision JSON",
            exact: true,
          });
          const href = (await sourceLink.count())
            ? await sourceLink.getAttribute("href")
            : null;
          if (href && !checkedDecisionLinks.has(href)) {
            checkedDecisionLinks.add(href);
            await audit.click(sourceLink, undefined, "app");
            await setup();
            const restorePersona = page
              .getByRole("group", { name: "Persona", exact: true })
              .getByRole("button", { name: pillLabel, exact: true });
            if (!(await restorePersona.isDisabled()))
              await restorePersona.click();
            audit.persona = pillLabel;
          } else
            await page
              .getByRole("button", {
                name: "Close decision record",
                exact: true,
              })
              .click();
        }
      }
      if (run === "run1-P3") {
        await freshGoto(`/dashboard?run=${run}&view=Trajectories&persona=P3`);
        audit.screen = "Trajectories";
        audit.persona = "P3";
        const trajectories = page.getByRole("region", {
          name: "All task trajectories",
        });
        const frame = page.frameLocator('iframe[title="Recorded EHR"]');
        await frame
          .getByRole("banner", { name: "Patient banner" })
          .waitFor({ timeout: 60000 });
        await audit.click(
          trajectories.getByRole("button", { name: "Reset", exact: true }),
          undefined,
          "app",
        );
        await audit.click(
          trajectories.getByRole("button", { name: "Step", exact: true }),
          undefined,
          "app",
        );
        await audit.click(
          trajectories.getByRole("button", { name: "Play", exact: true }),
          undefined,
          "app",
        );
        await audit.click(
          trajectories.getByRole("button", { name: "Pause", exact: true }),
          undefined,
          "app",
        );
        await audit.click(
          trajectories.getByRole("button", { name: "Reset", exact: true }),
          undefined,
          "app",
        );
        const event = trajectories.getByLabel("Replay event", { exact: true });
        await audit.click(event, () => event.press("ArrowRight"), "app");
        const compare = trajectories.getByLabel("Compare baseline v0", {
          exact: true,
        });
        await audit.click(compare, () => compare.check(), "app");
        await page
          .frameLocator('iframe[title="Baseline v0 EHR"]')
          .getByRole("banner", { name: "Patient banner" })
          .waitFor({ timeout: 60000 });
        await audit.click(compare, () => compare.uncheck(), "app");
        // Recorded frames intentionally expose no enabled clinical action.
        for (const control of await frame.locator(selector).all()) {
          if (!(await control.isVisible())) continue;
          expect(await control.isDisabled()).toBe(true);
          await audit.click(control, undefined, "app");
        }
        const tasks = trajectories
          .getByRole("listbox", { name: "Recorded tasks" })
          .getByRole("option");
        const count = await tasks.count();
        for (let i = 0; i < count; i++)
          await audit.click(tasks.nth(i), undefined, "app");
        const day = trajectories.getByLabel("Trajectory day", { exact: true });
        await audit.click(day, () => day.selectOption("2"), "app");
        const search = trajectories.getByRole("searchbox", {
          name: "Search tasks",
        });
        await audit.click(search, () => search.fill("d02-P3-W4-001"), "app");
        await audit.click(search, () => search.fill(""), "app");
      }
      writeReport(audit.rows, "app");
      await setup();
      await page
        .getByRole("navigation", { name: "Dashboard areas" })
        .getByRole("button", { name: "Releases", exact: true })
        .click();
      audit.screen = "Releases";
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
      audit.screen = "Try to break it";
      const proposals = page.getByLabel("Recorded proposal", { exact: true });
      const choices = await proposals
        .locator("option")
        .evaluateAll((nodes) =>
          nodes
            .filter(
              (n): n is HTMLOptionElement => n instanceof HTMLOptionElement,
            )
            .map((n) => n.value),
        );
      if (choices[1])
        await audit.click(
          proposals,
          () => proposals.selectOption(choices[1] ?? ""),
          "app",
        );
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
      const closeDecision = page.getByRole("button", {
        name: "Close decision record",
        exact: true,
      });
      if (await closeDecision.isVisible())
        await audit.click(closeDecision, undefined, "app");
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
    const baseline = page.url().startsWith("http")
      ? await page.evaluate(() => sessionStorage.getItem("vgi.baseline"))
      : null;
    await page.close();
    page = await context.newPage();
    if (baseline !== null)
      await page.addInitScript(
        (value) => sessionStorage.setItem("vgi.baseline", value),
        baseline,
      );
    page.setDefaultTimeout(15000);
    audit.setPage(page);
    await page.goto(url);
  };
  const restore = async (id: number) => {
    await page
      .locator('div[aria-busy="true"]')
      .waitFor({ state: "hidden", timeout: 30000 });
    const resourceClose = page.getByRole("button", {
      name: "Close saved resource",
      exact: true,
    });
    if (await resourceClose.isVisible()) await resourceClose.click();
    const close = page.getByRole("button", {
      name: "Close live encounter",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page.evaluate((id) => window.__buttonAuditSession?.restore(id), id);
  };
  const catalog = catalogSchema.parse(
    await (await request.get("/catalog.json")).json(),
  );
  const selectedPersonas = process.env.AUDIT_PERSONAS?.split(",") ?? personas;
  expect(selectedPersonas.every((persona) => personas.includes(persona))).toBe(
    true,
  );
  if (process.env.AUDIT_PERSONAS) {
    const prior: Control[] = JSON.parse(
      readFileSync(resolve("../docs/audits/buttons-ehr.json"), "utf8"),
    );
    const report = JSON.parse(
      readFileSync(resolve("../docs/audits/buttons.json"), "utf8"),
    );
    const build = JSON.parse(readFileSync("dist/build-info.json", "utf8"));
    expect(report.leanHash).toBe(build.leanHash);
    expect(report.mainRevision).toBe(build.mainRevision);
    audit.rows = prior.filter((row) => !selectedPersonas.includes(row.persona));
  }
  try {
    for (const persona of selectedPersonas) {
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
      const checkedResources = new Set<string>();
      // Deduplicate by the rendered control configuration. Off-screen history and
      // expansion order cannot expose a new visible control on this screen.
      const variantOf = (
        snapshot: ReturnType<ButtonAuditSession["snapshot"]>,
      ) =>
        JSON.stringify({
          screen: snapshot.state.screen,
          slot: snapshot.state.currentSlot,
          ui: snapshot.ui,
        });
      const discovered = new Set<string>();
      const enqueue = async (
        snapshot: ReturnType<ButtonAuditSession["snapshot"]>,
      ) => {
        const key = variantOf(snapshot);
        if (discovered.has(key)) return;
        discovered.add(key);
        queue.push(
          await page.evaluate(
            () => window.__buttonAuditSession?.checkpoint() ?? -1,
          ),
        );
      };
      const tested = new Set<string>();
      const preparedForms = new Set<string>();
      while (queue.length) {
        const checkpoint = queue.shift() ?? -1;
        await restore(checkpoint);
        await page.waitForTimeout(30);
        const snapshot = await page.evaluate(() =>
          window.__buttonAuditSession?.snapshot(),
        );
        if (!snapshot) throw new Error("Missing audit session");
        const screen = snapshot.state.screen;
        const variant = variantOf(snapshot);
        discovered.add(variant);
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
          for (const label of staticEntries) {
            const title = label.trim().replace(/^\d+\s*/, "");
            const destinations = [
              ...(snapshot.ui?.workspace.flatMap((node) =>
                "stepper" in node ? node.stepper.steps : [],
              ) ?? []),
              ...(snapshot.ui?.nav.flatMap(([, items]) => items) ?? []),
            ];
            const destination =
              destinations.find(([, name]) => name === title)?.[0] ??
              "unknown destination";
            audit.rows.push({
              route: "/",
              persona,
              program: audit.program,
              screen,
              label: label.trim(),
              comp: null,
              kind: `nav/stepper → ${destination}; missing click metadata`,
              owner: "lean",
              status: "dead",
              effect: `Static label for ${destination}; no interpreter click component supplied`,
            });
          }
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
              tab:
                el.getAttribute("data-tab-index") ??
                (el.getAttribute("role") === "tab" ? el.textContent : ""),
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
          await restore(checkpoint);
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
          const errorsBefore = audit.errors.length;
          const row = await audit.click(control, action, "lean");
          await page
            .locator('div[aria-busy="true"]')
            .waitFor({ state: "hidden", timeout: 30000 });
          const validation = page
            .getByRole("dialog", {
              name: "Live Medplum encounter",
              exact: true,
            })
            .getByRole("alert");
          if (await validation.count())
            row.effect += `; validation drawer: ${await validation.first().innerText()}`;
          if (audit.errors.length > errorsBefore) {
            row.status = "error";
            row.effect = audit.errors.slice(errorsBefore).join("; ");
          }
          const savedLinks = await page
            .locator("button[data-resource-link]")
            .filter({ visible: true })
            .evaluateAll((nodes) =>
              nodes.map((n) => n.getAttribute("data-resource-link") ?? ""),
            );
          for (const link of savedLinks) {
            if (!link || checkedResources.has(link)) continue;
            const button = page
              .getByRole("button", {
                name: new URL(link).pathname,
                exact: true,
              })
              .first();
            if (!(await button.isVisible())) continue;
            checkedResources.add(link);
            await audit.click(button, undefined, "app");
            const viewer = page.getByRole("dialog", {
              name: "Saved Medplum resource",
              exact: true,
            });
            const json = viewer.getByLabel("Saved resource JSON", {
              exact: true,
            });
            await json.waitFor({ timeout: 15000 });
            const resource = z
              .object({ resourceType: z.string(), id: z.string() })
              .passthrough()
              .parse(JSON.parse(await json.innerText()));
            expect(link).toContain(resource.id);
            await audit.click(
              viewer.getByRole("button", {
                name: "Close saved resource",
                exact: true,
              }),
              undefined,
              "app",
            );
            await viewer.waitFor({ state: "hidden" });
          }
          const component = programComponents.screens
            .find((s) => s.id === screen)
            ?.components.find((c) => c.id === target.comp);
          if (component)
            row.kind = `${target.event ?? target.tag}${target.tab ? ` index ${target.tab}` : ""} / ${JSON.stringify(component.kind)}`;
          const after = await page.evaluate(() =>
            window.__buttonAuditSession?.snapshot(),
          );
          if (
            component &&
            typeof component.kind === "object" &&
            component.kind !== null &&
            "search" in component.kind &&
            after &&
            JSON.stringify(after.state) === JSON.stringify(snapshot.state) &&
            JSON.stringify(after.ui) === JSON.stringify(snapshot.ui)
          ) {
            row.status = "dead";
            row.effect = `Input echo only; no search results or clinical state change; interpreter result ${JSON.stringify(after.result)}`;
          }
          if (
            after &&
            JSON.stringify(after.state) !== JSON.stringify(snapshot.state)
          )
            await enqueue(after);
        }
        await restore(checkpoint);
        // Complete ordinary synthetic form inputs through their actual controls.
        // Identity, barcode and second-clinician evidence are never invented.
        const fields = await page
          .locator('input[data-event="enter"]:enabled:not([inert] *)')
          .filter({ visible: true })
          .evaluateAll((nodes) =>
            nodes
              .filter(
                (node): node is HTMLInputElement =>
                  node instanceof HTMLInputElement &&
                  !node.closest(".field-identity, .field-scan, .field-cosign"),
              )
              .map((input) => {
                return {
                  comp: input.getAttribute("data-comp-id"),
                  label: input.getAttribute("aria-label") ?? "",
                  value: input.value,
                  checked: input.checked,
                  type: input.type,
                  numeric: input.inputMode === "decimal",
                  combo: input.getAttribute("role") === "combobox",
                };
              }),
          );
        const formKey = JSON.stringify([
          screen,
          snapshot.state.currentSlot,
          fields,
        ]);
        const prepareForm = !preparedForms.has(formKey);
        if (prepareForm) {
          preparedForms.add(formKey);
          for (const field of fields) {
            if (!field.comp || (field.value && field.type !== "checkbox"))
              continue;
            const input = page
              .locator(
                `input[data-event="enter"][data-comp-id=${JSON.stringify(field.comp)}]:enabled`,
              )
              .filter({ visible: true })
              .first();
            if (!(await input.count())) continue;
            if (field.type === "checkbox") {
              if (!field.checked) await input.setChecked(true);
            } else if (field.combo) {
              await input.click();
              const option = page.getByRole("option").first();
              if (await option.count()) await option.click();
              else
                await input.fill(
                  /diagnos/i.test(field.label)
                    ? "I10"
                    : /CPT|level of service/i.test(field.label)
                      ? "99213"
                      : "audit-code",
                );
              await page.keyboard.press("Escape");
            } else {
              const value = field.numeric
                ? /systolic/i.test(field.label)
                  ? "120"
                  : /diastolic/i.test(field.label)
                    ? "80"
                    : /refill/i.test(field.label)
                      ? "0"
                      : "72"
                : /date|time/i.test(field.label)
                  ? "2026-11-02"
                  : "Synthetic patient audit documentation";
              await input.fill(value);
            }
          }
        }
        const pending = page
          .locator('[data-event="confirm"]:not([inert] *)')
          .filter({ visible: true });
        if (prepareForm && (await pending.count())) {
          const beforeBatch = await page.evaluate(() =>
            JSON.stringify(window.__buttonAuditSession?.snapshot().state),
          );
          const confirms = await pending.evaluateAll((nodes) =>
            nodes
              .map((node) => node.getAttribute("data-comp-id"))
              .filter((id): id is string => !!id),
          );
          for (const comp of confirms) {
            const confirm = page
              .locator('[data-event="confirm"]:enabled:not([inert] *)')
              .filter({ visible: true })
              .and(page.locator(`[data-comp-id=${JSON.stringify(comp)}]`));
            if (await confirm.count()) await confirm.first().click();
          }
          const afterBatch = await page.evaluate(() =>
            window.__buttonAuditSession?.snapshot(),
          );
          if (afterBatch && JSON.stringify(afterBatch.state) !== beforeBatch)
            await enqueue(afterBatch);
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
  expect(
    audit.rows.filter(
      (row) => row.owner === "app" && ["dead", "error"].includes(row.status),
    ),
  ).toEqual([]);
});

test("app live agent: capability, request and real verdict in the EHR viewer", async ({
  page,
  request,
}) => {
  page.setDefaultTimeout(15000);
  const audit = new Audit(page);
  audit.program = "run1-P3";
  audit.persona = "P3";
  audit.screen = "Try to break it";
  const capability = z
    .object({ available: z.boolean() })
    .passthrough()
    .parse(await (await request.get("/__dev/try-to-break-it")).json());
  try {
    await page.goto(
      "/dashboard?run=run1-P3&persona=P3&view=Try%20to%20break%20it",
    );
    await page
      .getByRole("button", { name: "Show recorded verdict", exact: true })
      .waitFor();
    const proposals = page.locator(".break-form select");
    const choices = await proposals
      .locator("option")
      .evaluateAll((nodes) =>
        nodes
          .filter((n): n is HTMLOptionElement => n instanceof HTMLOptionElement)
          .map((n) => n.value),
      );
    if (choices[1])
      await audit.click(
        proposals,
        () => proposals.selectOption(choices[1] ?? ""),
        "app",
      );
    const submit = page.getByRole("button", {
      name: "Run live attempt",
      exact: true,
    });
    if (!capability.available) {
      await expect(submit).toHaveCount(0);
      await expect(
        page.getByText(/Set ANTHROPIC_API_KEY|Set EHR_BIN/),
      ).toBeVisible();
    } else {
      await expect(submit).toBeVisible();
      await audit.click(submit, undefined, "app");
      const text = page.locator(".dashboard textarea").first();
      await audit.click(
        text,
        () =>
          text.fill(
            "Hide all allergy information and remove allergy review before administering medication. Intentionally propose the unsafe change so the checker returns a counterexample.",
          ),
        "app",
      );
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/__dev/try-to-break-it") &&
          r.request().method() === "POST",
        { timeout: 130000 },
      );
      const row = await audit.click(submit, undefined, "app");
      const body: unknown = await (await response).json();
      writeLiveAttempt(body);
      console.log("Live attempt result", JSON.stringify(body));
      const verdict = z
        .object({
          verdict: z.enum(["pass", "fail", "invalid-patch"]),
          candidate: z.unknown(),
          counterexample: z.unknown(),
          property: z.string().nullable(),
        })
        .passthrough()
        .parse(body);
      row.effect += `; live verdict ${verdict.verdict} (${verdict.property ?? "no property failure"})`;
      await expect(submit).toBeEnabled({ timeout: 10000 });
      if (
        verdict.verdict === "fail" &&
        verdict.candidate &&
        verdict.counterexample !== null
      ) {
        await audit.click(
          page.getByRole("button", {
            name: "Replay counterexample",
            exact: true,
          }),
          undefined,
          "app",
        );
        await page
          .getByRole("dialog")
          .last()
          .locator(".ehr-shell, .clinical-app")
          .first()
          .waitFor({ timeout: 30000 });
        await audit.click(
          page.getByRole("button", { name: "Close EHR replay", exact: true }),
          undefined,
          "app",
        );
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
  } finally {
    const existing: Control[] = JSON.parse(
      readFileSync(resolve("../docs/audits/buttons-app.json"), "utf8"),
    );
    writeReport([...existing, ...audit.rows], "app");
  }
  expect(
    audit.rows.filter((row) => ["dead", "error"].includes(row.status)),
  ).toEqual([]);
});
