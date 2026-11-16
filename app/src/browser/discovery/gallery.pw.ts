import { test, expect } from "@playwright/test";
test("read-only nightly overview compares days and paints before/after at full size", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lean nightly designs" }),
  ).toBeVisible();
  await expect(page.getByText(/primary-care prescriber/)).toBeVisible();
  await expect(
    page.getByRole("rowheader", { name: "Day 2 / v1" }),
  ).toBeVisible();
  await expect(page.getByText("10 → 8")).toHaveCount(2);
  await expect(page.getByText("2 → 1")).toHaveCount(2);
  const before = page.frameLocator('iframe[title="P1 v1 Review before"]'),
    after = page.frameLocator('iframe[title="P1 v1 Review after"]');
  await expect(before.locator('[data-source="0"]')).toHaveAttribute(
    "aria-label",
    /Ashly/,
  );
  await expect(after.locator('[data-source="0"]')).toHaveAttribute(
    "aria-label",
    /Ashly/,
  );
  await expect(
    page
      .frameLocator('iframe[title="P1 v1 Old review before"]')
      .locator('[data-source="0"]'),
  ).toHaveAttribute("aria-label", /Ashly/);
  await expect(
    page
      .frameLocator('iframe[title="P1 v1 New review after"]')
      .locator('[data-source="0"]'),
  ).toHaveAttribute("aria-label", /Ashly/);
  await expect(
    page.getByText("This screen is absent from this version."),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Open full size P1 v1 Review after" })
    .click();
  const full = page.frameLocator('iframe[title="Full size screen"]');
  await expect(full.locator("main")).toHaveCSS("width", "1440px");
  await expect(full.locator("main")).toHaveCSS("height", "900px");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /rate|keep|reject/i }),
  ).toHaveCount(0);
  expect(
    (await page.request.post("/api/judgments", { data: { id: "x" } })).status(),
  ).toBe(405);
  expect(
    (await page.request.get("/api/design?id=../../manifest.json")).status(),
  ).toBe(404);
  await page.screenshot({
    path: `${process.env.TMPDIR}/lean-gallery.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
