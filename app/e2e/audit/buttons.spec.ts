import { test, expect } from "@playwright/test";
import { z } from "zod";
import { Audit, selector } from "./driver";
import { writeReport } from "./report";
import { catalogSchema, defaultPatient } from "../../src/browser/data";

const personas = ["P1", "P2", "P3", "P4", "P5", "RN2"];

test("app shell: every shell control has an effect or an explained disabled state", async ({ page: initialPage }) => {
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
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.reload();
      console.log(`Auditing ${persona}`);
      audit.persona = persona;
      const login = page.getByRole("button", { name: persona === "baseline" ? "Original canonical EHR (baseline)" : new RegExp(`^${persona} ·`) });
      await login.waitFor();
      console.log('login', await audit.click(login, undefined, "app"));
      await page.getByLabel("Patient search", { exact: true }).waitFor({ timeout: 30000 });
      await audit.click(page.getByRole("button", { name: "Search Medplum", exact: true }), undefined, "app");
      const patient = page.locator('.patient-search + ul button').first();
      await patient.waitFor();
      await audit.click(patient, undefined, "app");
      const selects = page.locator('select');
      for (const control of await selects.all()) {
        if (!await control.isVisible()) continue;
        const values = await control.locator('option').evaluateAll(nodes => nodes.map(n => n instanceof HTMLOptionElement ? n.value : ""));
        const value = values.find(v => v && v !== "");
        if (value) await audit.click(control, () => control.selectOption(value), "app");
      }
      await audit.click(page.getByRole('button', { name: 'Start new encounter', exact: true }), undefined, "app");
      await page.waitForTimeout(300);
      await audit.click(page.getByRole('button', { name: 'Open EHR', exact: true }), undefined, "app");
      await page.locator('.clinical-app').waitFor({ timeout: 30000 });
      for (const label of ['Live encounter']) {
        const button = page.getByRole('button', { name: label, exact: true });
        if (await button.count()) { await audit.click(button, undefined, "app"); await page.keyboard.press('Escape'); }
      }
      await page.getByRole('button', { name: 'Live encounter', exact: true }).click();
      const back = page.getByRole('button', { name: /Back to worklist/ }).first();
      if (await back.isVisible()) await audit.click(back, undefined, "app");
    }
    writeReport(audit.rows, "app");
    audit.persona = "—";
    await audit.allShell(async () => { await freshGoto('/browse'); await page.getByLabel('Patient', { exact: true }).waitFor(); });
    // Every catalog link, including canonical, bad programs, projections and run versions, was clicked by allShell.
    await freshGoto('/ehr?mode=replay&audit=buttons&persona=P1');
    await page.locator('.clinical-app').waitFor();
    await audit.click(page.getByRole('button', { name: 'Inspector', exact: true }), undefined, "app");
    await audit.click(page.getByRole('button', { name: 'Reset episode', exact: true }), undefined, "app");
    await page.getByRole('button', { name: 'Inspector', exact: true }).click();
    await audit.click(page.getByRole('button', { name: 'Close inspector', exact: true }), undefined, "app");
    // Both real and authored runs: every persona, selector, version/release row and drawer action.
    for (const run of ['run1-P3', 'mock']) {
      const setup = async () => { await freshGoto(`/dashboard?run=${run}`); await page.getByRole('region', { name: 'Version history' }).waitFor(); };
      await audit.allShell(setup);
      await setup();
      const pills = page.getByRole('group', { name: 'Persona', exact: true }).getByRole('button');
      for (let p = 0; p < await pills.count(); p++) {
        await setup();
        const pill = pills.nth(p);
        if (await pill.isDisabled()) continue;
        audit.persona = await pill.innerText();
        await pill.click();
        const versionCount = await page.getByRole('region', { name: 'Version history' }).getByRole('button').count();
        for (let v = 0; v < versionCount; v++) {
          await page.getByRole('region', { name: 'Version history' }).getByRole('button').nth(v).click();
          const drawer = page.getByRole('dialog', { name: 'Decision record', exact: true });
          const dialog = page.getByRole('dialog').first();
          for (const label of ['Before / after on screen', 'Replay counterexample']) {
            const button = dialog.getByRole('button', { name: label, exact: true }).first();
            if (!await button.count()) continue;
            await audit.click(button, undefined, "app");
            const replay = page.getByRole('dialog').last();
            await expect(replay.locator('.ehr-shell, .clinical-app').first()).toBeVisible({ timeout: 30000 });
            // Controls in replay header and event path; isolate the clinical subtree.
            for (const name of ['Next task event', 'Next event', 'Previous event', 'Reset screens', 'Reset path']) {
              const c = replay.getByRole('button', { name, exact: true });
              if (await c.count()) await audit.click(c, undefined, "app");
            }
            await audit.click(replay.getByRole('button', { name: 'Close EHR replay', exact: true }), undefined, "app");
          }
          void drawer;
          await audit.click(page.getByRole('button', { name: 'Close decision record', exact: true }), undefined, "app");
        }
      }
      await setup();
      await page.getByRole('navigation', { name: 'Dashboard areas' }).getByRole('button', { name: 'Releases', exact: true }).click();
      const releases = page.getByRole('button', { name: /^Inspect .* migration$/ });
      for (let i = 0; i < await releases.count(); i++) {
        await audit.click(releases.nth(i), undefined, "app");
        await audit.click(page.getByRole('button', { name: 'Close EHR replay', exact: true }), undefined, "app");
        await page.keyboard.press('Escape');
      }
      await page.getByRole('navigation', { name: 'Dashboard areas' }).getByRole('button', { name: 'Try to break it', exact: true }).click();
      await audit.click(page.getByRole('button', { name: 'Show recorded verdict', exact: true }), undefined, "app");
      await audit.click(page.getByRole('button', { name: 'Replay counterexample', exact: true }), undefined, "app");
      await audit.click(page.getByRole('button', { name: 'Close EHR replay', exact: true }), undefined, "app");
    }
  } finally { writeReport(audit.rows, 'app'); }
  expect(audit.rows.filter(r => r.status === 'dead' || r.status === 'error')).toEqual([]);
});

test("Lean EHR: breadth-first observed screens, isolated button clicks and real live personas", async ({ page: initialPage, request }) => {
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
  const catalog = catalogSchema.parse(await (await request.get('/catalog.json')).json());
  try {
    for (const persona of personas) {
      console.log(`Auditing ${persona}`);
      audit.persona = persona;
      await freshGoto('/?audit=buttons');
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.reload();
      await page.getByRole('button', { name: new RegExp(`^${persona} ·`) }).click();
      await page.getByLabel('Patient search', { exact: true }).waitFor({ timeout: 30000 });
      // Match the persona to a representative Synthea fixture.
      const patient = defaultPatient(catalog, persona === 'RN2' ? 'P3' : persona);
      await page.getByLabel('Patient search', { exact: true }).fill(patient.name.split(' ')[0] ?? '');
      await page.getByRole('button', { name: 'Search Medplum', exact: true }).click();
      await page.locator('.patient-search + ul button').first().click();
      await page.getByRole('button', { name: 'Start new encounter', exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Open EHR', exact: true }).click();
      await page.waitForFunction(() => !!window.__buttonAuditSession, { timeout: 30000 });
      audit.program = z.object({ id: z.string().optional(), persona: z.string().optional(), version: z.number().optional() }).passthrough().parse(await page.evaluate(() => window.__buttonAuditSession?.program)).id ?? `live/${persona}`;
      const queue = [await page.evaluate(() => window.__buttonAuditSession?.checkpoint() ?? -1)];
      const seenScreens = new Set<string>();
      const tested = new Set<string>();
      while (queue.length) {
        const checkpoint = queue.shift() ?? -1;
        await page.evaluate(id => window.__buttonAuditSession?.restore(id), checkpoint);
        await page.waitForTimeout(30);
        const snapshot = await page.evaluate(() => window.__buttonAuditSession?.snapshot());
        if (!snapshot) throw new Error('Missing audit session');
        const screen = snapshot.state.screen;
        const variant = `${screen}:${JSON.stringify(snapshot.state.tabSel)}:${JSON.stringify(snapshot.state.popup)}:${JSON.stringify(snapshot.state.captured.filter(c => !c.confirmed).map(c => c.element))}`;
        if (seenScreens.has(variant)) continue;
        seenScreens.add(variant);
        audit.screen = screen;
        // Inventory static nav and stepper destinations as well as actual controls.
        if (!seenScreens.has(`static:${screen}`)) {
          seenScreens.add(`static:${screen}`);
          const staticEntries = await page.locator('.workflow-links li:not(:has(button)), .clinical-stepper li:not(:has(button))').allTextContents();
          for (const label of staticEntries) audit.rows.push({ route: '/', persona, program: audit.program, screen, label: label.trim(), comp: null, kind: 'nav/stepper destination without click metadata', owner: 'lean', status: 'dead', effect: 'Static label; no interpreter click component supplied' });
        }
        // Expand every workflow group before indexing controls, then checkpoint it.
        for (const group of await page.locator('.workflow-groups button[aria-expanded="false"]').all()) await group.click();
        const targets = await page.locator(selector).evaluateAll(nodes => nodes.filter(el => el.getClientRects().length && !el.closest('[inert]')).map((el, index) => ({ index, comp: el.getAttribute('data-comp-id'), event: el.getAttribute('data-event'), label: el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName, tag: el.tagName })));
        for (const target of targets) {
          await page.evaluate(id => window.__buttonAuditSession?.restore(id), checkpoint);
          await page.waitForTimeout(20);
          for (const group of await page.locator('.workflow-groups button[aria-expanded="false"]').all()) await group.click();
          const controls = page.locator(selector.split(', ').map(s => `${s}:not([inert] *)`).join(', ')).filter({ visible: true });
          const control = controls.nth(target.index);
          if (!await control.count() || !await control.isVisible()) continue;
          const key = `${screen}:${target.comp ?? target.label}:${target.event ?? target.tag}:${await control.isDisabled()}`;
          if (tested.has(key)) continue;
          tested.add(key);
          if (await control.evaluate(el => !el.closest('.clinical-app'))) continue;
          let action: (() => Promise<unknown>) | undefined;
          if (target.tag === 'INPUT' || target.tag === 'TEXTAREA') {
            action = await control.getAttribute('type') === 'checkbox' ? () => control.setChecked(true) : () => control.fill('72');
          }
          await audit.click(control, action, 'lean');
          const after = await page.evaluate(() => window.__buttonAuditSession?.snapshot());
          if (after && JSON.stringify(after.state) !== JSON.stringify(snapshot.state)) queue.push(await page.evaluate(() => window.__buttonAuditSession?.checkpoint() ?? -1));
        }
        console.log(`${persona} ${screen}: ${tested.size} controls, ${queue.length} queued`);
        writeReport(audit.rows, "ehr");
      }
    }
  } finally { writeReport(audit.rows, 'ehr'); }
});
