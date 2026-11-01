import { expect, type Page } from "@playwright/test";
/** Patient choice stays inside the source-declared workspace, including in tests. */
export async function enterPatientChart(
  page: Page,
  query?: string,
): Promise<boolean> {
  await expect(page.locator(".clinical-app")).toBeVisible({ timeout: 30000 });
  const search = page.locator('[data-comp-id="workspace.search"]');
  if (!(await search.count())) return false;
  if (
    query ||
    !(await page.getByRole("button", { name: /^Open chart:/ }).count())
  ) {
    const lookup = page.getByRole("button", {
      name: "Patient Lookup",
      exact: true,
    });
    if (await lookup.count()) await lookup.click();
    await page
      .getByLabel("Patient search by name or MRN", { exact: true })
      .fill(query ?? "a");
  }
  await page
    .getByRole("button", { name: /^Open chart:/ })
    .first()
    .click();
  await expect(
    page.getByRole("banner", { name: "Patient banner", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  return true;
}
