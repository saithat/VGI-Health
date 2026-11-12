import { test, expect } from "@playwright/test";
import { startDraftService } from "../tests/live-drafts-support";
import { nativeCall } from "../../services/commit/test/native-interp";
import type {} from "../src/core/buttonAudit";

test("live drafts A/B/A restore entries and acknowledged alerts, then sign through the service", async ({
  page,
}) => {
  test.setTimeout(180_000);
  test.skip(
    !process.env.DATABASE_URL || process.env.APP_TEST_PREVIEW !== "0",
    "Needs Postgres and APP_TEST_PREVIEW=0; uses current native Lean without rebuilding WASM.",
  );
  const service = await startDraftService();
  try {
    await page.route("**/draft-native", async (route) => {
      const { op, input } = route.request().postDataJSON();
      await route.fulfill({ json: nativeCall(op, input) });
    });
    await page.route("**/draft-fixture", async (route) =>
      route.fulfill({
        json: {
          spec: service.spec,
          program: service.program,
          directory: service.directory,
        },
      }),
    );
    // Only authentication transport is substituted; every endpoint, native
    // replay, fingerprint comparison and write runs in the actual service.
    await page.route(/\/src\/data\/commitService\.ts(?:\?.*)?$/, (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `
      export class MarRejected extends Error {} export class MarConflict extends Error {}
      export async function marRequest(path, body) {
        const r = await fetch('/commit' + path, { method: body === undefined ? 'GET' : 'POST',
          headers: {'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
        const data = await r.json(); if (!r.ok) throw new Error(JSON.stringify(data)); return data;
      }
      export const openMar = body => marRequest('/sessions', body);
      export const marEvent = (s,event) => marRequest('/sessions/'+s.sessionId+'/events', {revision:s.revision,event});
      export const marCommit = () => {throw new Error('Unexpected MAR command')};
      export const subscribeMar = () => () => {}; export const restoreMar = async () => undefined;
      export const loginMar = () => {}; export const logoutMar = () => {};
    `,
      }),
    );
    await page.route("**/commit/**", async (route) => {
      // Test transport forwards requests to the real service.
      // eslint-disable-next-line boundary/single-data-module
      const response = await page.request.fetch(
        service.base +
          new URL(route.request().url()).pathname.replace(/^\/commit/, ""),
        {
          method: route.request().method(),
          headers: {
            Authorization: `Bearer ${service.token}`,
            "Content-Type": "application/json",
          },
          ...(route.request().postData()
            ? { data: route.request().postData() ?? "" }
            : {}),
        },
      );
      await route.fulfill({ response });
    });
    await page.goto("/e2e/live-drafts.html?audit=buttons");
    const state = () =>
      page.evaluate(() => {
        const session = window.__buttonAuditSession;
        if (!session) throw new Error("Missing live session");
        return session.snapshot().state;
      });
    async function settled() {
      await expect(page.locator("body")).not.toHaveAttribute(
        "data-busy",
        "true",
      );
      await expect(page.locator("#result")).not.toContainText("Error:");
    }
    async function select(patient: string) {
      await page
        .getByLabel("Patient search by name or MRN", { exact: true })
        .fill(patient);
      await settled();
      await page
        .getByRole("button", { name: new RegExp(`^Open chart: ${patient}`) })
        .click();
      await settled();
      await expect
        .poll(async () => (await state()).patientContext?.bound)
        .toBe(patient);
    }
    async function leave() {
      await page.getByRole("button", { name: /^Return to / }).click();
      await settled();
    }
    await select("draft-A");
    await page
      .getByRole("textbox", { name: /^HPI/ })
      .fill("Patient A unsigned note");
    await settled();
    await page.getByRole("button", { name: "Sign note", exact: true }).click();
    await settled();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /^Acknowledge/ }).click();
    await settled();
    const original = await state();
    await leave();
    await select("draft-B");
    expect((await state()).captured).toEqual([]);
    expect((await state()).acked).toEqual([]);
    await page.getByRole("textbox", { name: /^HPI/ }).fill("Patient B note");
    await settled();
    await leave();
    await select("draft-A");
    await expect(page.getByRole("textbox", { name: /^HPI/ })).toHaveValue(
      "Patient A unsigned note",
    );
    expect((await state()).acked).toEqual(original.acked);
    const saved = page.waitForResponse((r) =>
      r.url().endsWith("/commit/commands"),
    );
    await page.getByRole("button", { name: "Sign note", exact: true }).click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(201);
    await settled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#result")).toHaveText("Saved: Sign note");
    await leave();
    await select("draft-A");
    await expect(page.getByRole("textbox", { name: /^HPI/ })).toHaveValue("");
    expect((await state()).acked).toEqual(original.acked);
  } finally {
    await service.close();
  }
});
