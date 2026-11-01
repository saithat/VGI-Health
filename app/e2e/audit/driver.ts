import type { Page, Locator } from "@playwright/test";
import type { Control } from "./report";
import type {} from "../../src/core/buttonAudit";

export const selector =
  'button, [role="button"], a[href], [role="tab"], [role="menuitem"], summary, select, input:not([type="hidden"]), textarea';
export class Audit {
  rows: Control[] = [];
  errors: string[] = [];
  writes: string[] = [];
  popups: string[] = [];
  persona = "—";
  program = "—";
  screen = "shell";
  constructor(public page: Page) {
    this.setPage(page);
  }
  setPage(page: Page) {
    this.page = page;
    page.on("pageerror", (e) => this.errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") this.errors.push(m.text());
    });
    page.on("popup", async (popup) => {
      popup.on("pageerror", (error) => this.errors.push(error.message));
      popup.on("console", (message) => {
        if (message.type() === "error") this.errors.push(message.text());
      });
      popup.on("response", (response) => {
        if (response.status() >= 400)
          this.errors.push(
            `Popup HTTP ${response.status()}: ${response.url()}`,
          );
      });
      try {
        await popup.waitForLoadState("domcontentloaded", { timeout: 10000 });
        this.popups.push(popup.url());
      } catch (error) {
        this.errors.push(`Popup failed to load: ${String(error)}`);
      } finally {
        await popup.close();
      }
    });
    page.on("response", (r) => {
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(r.request().method()) &&
        r.ok()
      )
        this.writes.push(
          `${r.request().method()} ${new URL(r.url()).pathname}`,
        );
    });
  }
  async fingerprint() {
    return this.page.evaluate(() => ({
      url: location.href,
      dom: document.body.innerText,
      markup: document.body.innerHTML.replace(/id="[^"]*"/g, ""),
      values: Array.from(document.querySelectorAll("select"))
        .map((el) => el.value)
        .join("|"),
      state: JSON.stringify(window.__buttonAuditSession?.snapshot().state),
      result: JSON.stringify(window.__buttonAuditSession?.snapshot().result),
      observedAt: window.__buttonAuditObservation?.at,
      busy: !!document.querySelector('div[aria-busy="true"]'),
    }));
  }
  async click(
    control: Locator,
    action?: () => Promise<unknown>,
    owner?: "app" | "lean",
  ) {
    const metadata = await control.evaluate((el) => ({
      label:
        el.getAttribute("aria-label") ||
        (el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
          ? el.labels?.[0]?.textContent
          : el.textContent
        )?.trim() ||
        el.getAttribute("title") ||
        el.tagName,
      href: el instanceof HTMLAnchorElement ? el.href : null,
      comp: el.getAttribute("data-comp-id"),
      kind:
        el.getAttribute("data-event") ||
        el.getAttribute("role") ||
        el.tagName.toLowerCase(),
      reason:
        el.getAttribute("title") ||
        (el.getAttribute("aria-describedby") ?? "")
          .split(" ")
          .map((id) => document.getElementById(id)?.textContent)
          .filter(Boolean)
          .join(" "),
      disabled: el.matches(":disabled, [aria-disabled='true']"),
    }));
    const row: Control = {
      route:
        new URL(this.page.url()).pathname + new URL(this.page.url()).search,
      persona: this.persona,
      program: this.program,
      screen: this.screen,
      label: metadata.label,
      comp: metadata.comp,
      kind: metadata.kind,
      owner:
        owner ??
        (metadata.comp ||
        (await control.evaluate(
          (el) => !!el.closest(".clinical-app, .clinical-modal, .ehr-shell"),
        ))
          ? "lean"
          : "app"),
      status: "dead",
      effect: "No observable effect within 2 seconds",
    };
    if (metadata.disabled) {
      row.status = metadata.reason ? "disabled-with-reason" : "dead";
      row.effect =
        metadata.reason || "Disabled without a visible reason or tooltip";
      this.rows.push(row);
      return row;
    }
    // Position the target before starting the click-response timer. Playwright's
    // click otherwise includes automatic scrolling and layout stabilization.
    // Selection travel/scroll costs are measured separately by the geometry path.
    await control.evaluate((element) =>
      element.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "instant",
      }),
    );
    const before = await this.fingerprint();
    await this.page.evaluate(
      ({ dom, state }) => {
        window.__buttonAuditObservation?.disconnect();
        const observation: { at: number | null; disconnect: () => void } = {
          at: null,
          disconnect: () => observer.disconnect(),
        };
        const observer = new MutationObserver(() => {
          if (
            observation.at === null &&
            (document.body.innerText !== dom ||
              JSON.stringify(window.__buttonAuditSession?.snapshot().state) !==
                state)
          )
            observation.at = Date.now();
        });
        window.__buttonAuditObservation = observation;
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      },
      { dom: before.dom, state: before.state },
    );
    const clickedAt = Date.now();
    let effectAt: number | null | undefined;
    const errorCount = this.errors.length,
      writeCount = this.writes.length,
      popupCount = this.popups.length;
    try {
      if (action) await action();
      else await control.click({ timeout: 15000 });
      await this.page.waitForTimeout(80);
      let after = await this.fingerprint();
      const changed = () =>
        before.url !== after.url ||
        before.dom !== after.dom ||
        before.markup !== after.markup ||
        before.values !== after.values ||
        (before.state !== after.state && after.result !== '"ignored"') ||
        this.writes.length > writeCount ||
        this.popups.length > popupCount;
      const start = Date.now();
      while (
        !changed() &&
        !(owner === "lean" && !after.busy) &&
        Date.now() - start < 1900
      ) {
        await this.page.waitForTimeout(100);
        after = await this.fingerprint();
      }
      effectAt = after.observedAt ?? (changed() ? Date.now() : undefined);
      if (this.errors.length > errorCount) {
        row.status = "error";
        row.effect = this.errors.slice(errorCount).join("; ");
      } else if (changed()) {
        row.status = "works";
        row.effect =
          before.url !== after.url
            ? `URL → ${new URL(after.url).pathname}${new URL(after.url).search}`
            : this.writes.length > writeCount
              ? this.writes.slice(writeCount).join("; ")
              : this.popups.length > popupCount
                ? `Opened tab → ${this.popups.slice(popupCount).join(", ")}`
                : before.state !== after.state && after.result !== '"ignored"'
                  ? `Lean state changed; result ${after.result}`
                  : "DOM changed";
      }
      if (metadata.href && new URL(metadata.href).pathname === "/ehr") {
        await this.page
          .locator(".clinical-app, [role=alert]")
          .first()
          .waitFor({ timeout: 30000 });
        if (await this.page.getByRole("alert").count()) {
          row.status = "error";
          row.effect = await this.page.getByRole("alert").first().innerText();
        } else row.effect += "; real EHR rendered";
      }
      if (this.errors.length > errorCount) {
        row.status = "error";
        row.effect = this.errors.slice(errorCount).join("; ");
      }
      if (row.status === "dead" && owner === "lean" && !after.busy)
        row.effect = `Synchronous interpreter/UI dispatch completed without a state or UI change; result ${after.result}`;
      if (
        row.owner === "lean" &&
        metadata.comp &&
        before.state === after.state &&
        after.result === '"ignored"'
      ) {
        row.status = "dead";
        row.effect = "Interpreter returned ignored; clinical state unchanged";
      }
    } catch (e) {
      row.status = "error";
      row.effect = String(e).slice(0, 10000);
      const context = await this.page
        .evaluate((comp) => {
          const snapshot = window.__buttonAuditSession?.snapshot();
          const element = comp
            ? [...document.querySelectorAll("[data-comp-id]")].find(
                (element) => element.getAttribute("data-comp-id") === comp,
              )
            : null;
          return {
            stateScreen: snapshot?.state.screen,
            uiScreen: snapshot?.ui?.screen,
            modal: Boolean(snapshot?.ui?.modal),
            present: Boolean(element),
            inert: Boolean(element?.closest("[inert]")),
            busy: Boolean(document.querySelector('[aria-busy="true"]')),
            elements: comp
              ? [...document.querySelectorAll("[data-comp-id]")]
                  .filter((e) => e.getAttribute("data-comp-id") === comp)
                  .map((e) => ({
                    tag: e.tagName,
                    event: e.getAttribute("data-event"),
                    rect: e.getBoundingClientRect().toJSON(),
                    display: getComputedStyle(e).display,
                    visibility: getComputedStyle(e).visibility,
                    parents: [
                      e.parentElement,
                      e.parentElement?.parentElement,
                      e.parentElement?.parentElement?.parentElement,
                    ].map((parent) =>
                      parent
                        ? {
                            tag: parent.tagName,
                            class: parent.className,
                            display: getComputedStyle(parent).display,
                          }
                        : null,
                    ),
                  }))
              : [],
          };
        }, metadata.comp)
        .catch(() => null);
      row.effect += `; observed context ${JSON.stringify(context)}`;
    }
    if (row.status === "works" && (effectAt ?? Date.now()) - clickedAt > 2400) {
      row.status = "dead";
      row.effect = `Effect took ${(effectAt ?? Date.now()) - clickedAt} ms (limit approximately 2 seconds): ${row.effect}`;
    }
    await this.page.evaluate(() =>
      window.__buttonAuditObservation?.disconnect(),
    );
    this.rows.push(row);
    console.log(
      `${row.owner} ${row.status}: ${this.persona} / ${this.screen} / ${row.label.slice(0, 75)}`,
    );
    return row;
  }
  async allShell(setup: () => Promise<void>) {
    const shell = () =>
      this.page
        .locator(
          selector
            .split(", ")
            .map(
              (s) =>
                `${s}:not(.clinical-app *):not(.clinical-modal *):not(.ehr-shell *)`,
            )
            .join(", "),
        )
        .filter({ visible: true });
    await setup();
    // Rows differing only in patient data share a renderer and event handler.
    // Sample those and timeline destinations; retain other control kinds.
    const indices = await shell().evaluateAll((elements) => {
      const counts = new Map<string, number>();
      return elements
        .flatMap((element, index) => {
          if (element.matches('.patient-card[aria-pressed="true"]')) return [];
          const group = element.matches(".patient-card")
            ? "patient-card"
            : element.matches(".timeline-node")
              ? `timeline-${element.getAttribute("data-node-key")?.split("-")[0]}`
              : "";
          const count = counts.get(group) ?? 0;
          counts.set(group, count + 1);
          return !group || count < 2 ? [index] : [];
        })
        .slice(0, 80);
    });
    console.log(
      `Shell inventory: ${await shell().count()} controls; ${indices.length} representative controls at ${this.page.url()}`,
    );
    for (const i of indices) {
      if (i) await setup();
      if (i % 20 === 0) console.log(`Shell ${i}/${indices.length}`);
      const control = shell().nth(i);
      if (
        !(await control.isVisible()) ||
        (await control.evaluate(
          (el) => !!el.closest(".clinical-app, .clinical-modal, .ehr-shell"),
        ))
      )
        continue;
      if (await control.evaluate((el) => el instanceof HTMLSelectElement)) {
        const values = await control
          .locator("option")
          .evaluateAll((nodes) =>
            nodes.map((n) => (n instanceof HTMLOptionElement ? n.value : "")),
          );
        const current = await control.inputValue();
        const value = values.find((v) => v !== current);
        if (value !== undefined)
          await this.click(control, () => control.selectOption(value), "app");
      } else if (
        await control.evaluate(
          (el) =>
            el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement,
        )
      ) {
        if ((await control.getAttribute("type")) === "checkbox")
          await this.click(control, () => control.setChecked(true), "app");
        else await this.click(control, () => control.fill("Aaron"), "app");
      } else await this.click(control, undefined, "app");
    }
  }
}
