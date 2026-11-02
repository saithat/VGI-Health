import { expect, test } from "@playwright/test";
import { Audit } from "./audit/driver";
import { backendAvailable } from "../src/data/medplum";
import type {} from "../src/core/buttonAudit";

for (const name of ["Aaron", "Terrance"]) {
  test(`live chart search: ${name}, first input and restored checkpoint`, async ({
    page,
  }) => {
    test.skip(!(await backendAvailable()), "Local Medplum is down");
    await page.goto("/?audit=buttons");
    await page.getByRole("button", { name: /^P1 · / }).click();
    await page.getByLabel("Patient search", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: "Search patients", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: new RegExp(
          `${name}.*${name === "Aaron" ? "Ankunding" : "Abshire"}`,
        ),
      })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Start new encounter", exact: true })
      .click();
    await page.getByRole("button", { name: "Open EHR", exact: true }).click();
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
