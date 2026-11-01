import type { Page, Locator } from "@playwright/test";
import type { Control } from "./report";
import type {} from "../../src/core/buttonAudit";

export const selector = 'button, a[href], [role="tab"], [role="menuitem"], summary, select, input:not([type="hidden"]), textarea';
export class Audit {
  rows: Control[] = [];
  errors: string[] = [];
  writes: string[] = [];
  persona = "—";
  program = "—";
  screen = "shell";
  constructor(public page: Page) { this.setPage(page); }
  setPage(page: Page) {
    this.page = page;
    page.on("pageerror", e => this.errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") this.errors.push(m.text()); });
    page.on("response", r => { if (["POST", "PUT", "PATCH", "DELETE"].includes(r.request().method()) && r.ok()) this.writes.push(`${r.request().method()} ${new URL(r.url()).pathname}`); });
  }
  async fingerprint() {
    return this.page.evaluate(() => ({ url: location.href, dom: document.body.innerText, markup: document.body.innerHTML.replace(/id="[^"]*"/g, ''), state: JSON.stringify(window.__buttonAuditSession?.snapshot().state), result: JSON.stringify(window.__buttonAuditSession?.snapshot().result) }));
  }
  async click(control: Locator, action?: () => Promise<unknown>, owner?: "app" | "lean") {
    const metadata = await control.evaluate(el => ({
      label: el.getAttribute("aria-label") || (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement ? el.labels?.[0]?.textContent : el.textContent)?.trim() || el.getAttribute("title") || el.tagName,
      comp: el.getAttribute("data-comp-id"), kind: el.getAttribute("data-event") || el.getAttribute("role") || el.tagName.toLowerCase(),
      reason: el.getAttribute("title") || (el.getAttribute("aria-describedby") ?? "").split(" ").map(id => document.getElementById(id)?.textContent).filter(Boolean).join(" "),
      disabled: el.matches(":disabled, [aria-disabled='true']"),
    }));
    const row: Control = { route: new URL(this.page.url()).pathname, persona: this.persona, program: this.program, screen: this.screen, label: metadata.label, comp: metadata.comp, kind: metadata.kind, owner: owner ?? (metadata.comp || await control.evaluate(el => !!el.closest('.clinical-app, .ehr-shell')) ? "lean" : "app"), status: "dead", effect: "No observable effect within 2 seconds" };
    if (metadata.disabled) {
      row.status = metadata.reason ? "disabled-with-reason" : "dead";
      row.effect = metadata.reason || "Disabled without a visible reason or tooltip";
      this.rows.push(row); return row;
    }
    const before = await this.fingerprint();
    const errorCount = this.errors.length, writeCount = this.writes.length;
    try {
      if (action) await action(); else await control.click({ timeout: 2200 });
      await this.page.waitForTimeout(80);
      let after = await this.fingerprint();
      const changed = () => before.url !== after.url || before.dom !== after.dom || before.markup !== after.markup || (before.state !== after.state && after.result !== '"ignored"') || this.writes.length > writeCount;
      const start = Date.now();
      while (!changed() && Date.now() - start < 1900) { await this.page.waitForTimeout(100); after = await this.fingerprint(); }
      if (this.errors.length > errorCount) { row.status = "error"; row.effect = this.errors.slice(errorCount).join("; "); }
      else if (changed()) {
        row.status = "works";
        row.effect = before.url !== after.url ? `URL → ${new URL(after.url).pathname}${new URL(after.url).search}` : this.writes.length > writeCount ? this.writes.slice(writeCount).join("; ") : before.state !== after.state && after.result !== '"ignored"' ? `Lean state changed; result ${after.result}` : "DOM changed";
      }
      if (row.owner === "lean" && metadata.comp && before.state === after.state && after.result === '"ignored"') { row.status = "dead"; row.effect = "Interpreter returned ignored; clinical state unchanged"; }
    } catch (e) { row.status = "error"; row.effect = String(e).split("\n").slice(0, 3).join(" "); }
    this.rows.push(row); return row;
  }
  async allShell(setup: () => Promise<void>) {
    await setup();
    const count = await this.page.locator(selector).count();
    console.log(`Shell inventory: ${count} controls at ${this.page.url()}`);
    for (let i = 0; i < count; i++) {
      if (i) await setup();
      if (i % 20 === 0) console.log(`Shell ${i}/${count}`);
      const control = this.page.locator(selector).nth(i);
      if (!(await control.isVisible()) || await control.evaluate(el => !!el.closest('.clinical-app, .ehr-shell'))) continue;
      if (await control.evaluate(el => el instanceof HTMLSelectElement)) {
        const values = await control.locator("option").evaluateAll(nodes => nodes.map(n => n instanceof HTMLOptionElement ? n.value : ""));
        const current = await control.inputValue();
        const value = values.find(v => v !== current);
        if (value !== undefined) await this.click(control, () => control.selectOption(value), "app");
      } else if (await control.evaluate(el => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        if (await control.getAttribute("type") === "checkbox") await this.click(control, () => control.setChecked(true), "app");
        else await this.click(control, () => control.fill("Aaron"), "app");
      } else await this.click(control, undefined, "app");
    }
  }
}
