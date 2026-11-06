import { completeKeycloakLogin } from "./live-backend";
import { enterPatientChart } from "./clinical-navigation";
import { expect, test } from "@playwright/test";
import { Audit } from "./audit/driver";
import { backendAvailable, backendDownReason } from "./live-backend";
import type {} from "../src/core/buttonAudit";

for (const name of ["Aaron", "Terrance"]) {
  test(`live chart search: ${name}, first input and restored checkpoint`, async ({
    page,
  }) => {
    test.skip(!(await backendAvailable()), backendDownReason);
    await page.goto("/?audit=buttons");
    await page.getByRole("button", { name: /^P1 · / }).click();
    await completeKeycloakLogin(page, "P1");
    await enterPatientChart(page, name);
    await expect(
      page.getByRole("banner", { name: "Patient banner", exact: true }),
    ).toContainText(name === "Aaron" ? "Ankunding" : "Abshire");
    await expect(page.locator(".clinical-app")).toBeVisible();
    const search = page.getByRole("textbox", {
      name: "Search chart",
      exact: true,
    });
    const checkpoint = await page.evaluate(() =>
      window.__buttonAuditSession?.checkpoint(),
    );
    if (checkpoint === undefined) throw new Error("Missing audit session");
    const audit = new Audit(page);
    const result = await audit.click(search, () => search.fill("72"), "lean");
    expect(result.status).toBe("works");
    await expect(page.locator('[data-info-id="searchResults"]')).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Encounter options" }),
    ).not.toBeVisible();
    await page.evaluate(
      (id) => window.__buttonAuditSession?.restore(id),
      checkpoint,
    );
    await expect(search).toHaveValue("");
    await search.fill("lisinopril");
    await expect(page.locator('[data-info-id="searchResults"]')).toContainText(
      /lisinopril/i,
    );
  });
}
