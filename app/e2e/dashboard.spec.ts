import { test, expect } from "@playwright/test";

test("mock run: every dashboard view, counterexample and task replay works offline", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard?run=mock");
  await expect(
    page.getByText(/MOCK RUN · Authored example data/),
  ).toBeVisible();
  for (const view of [
    "Evolution",
    "Why",
    "Counterexamples",
    "Day replay",
    "Persona divergence",
    "Releases",
    "Cost curves",
    "Try to break it",
  ]) {
    await page
      .getByRole("navigation", { name: "Dashboard views" })
      .getByRole("button", { name: view, exact: false })
      .click();
    await expect(
      page.getByRole("heading", { name: view, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    if (view === "Counterexamples") {
      await page
        .getByRole("button", { name: "Next event", exact: true })
        .click();
      await expect(page.getByText("State 1 of 2")).toBeVisible();
      await expect(page.locator(".counterexample .ehr-shell")).toHaveCount(1);
    }
    if (view === "Day replay") {
      await page.getByRole("button", { name: "Step", exact: true }).click();
      await expect(page.locator(".live-counters").first()).toContainText(
        "1 clicks",
      );
      await expect(page.locator(".paired-screens .ehr-shell")).toHaveCount(2);
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Pause", exact: true }).click();
    }
    if (view === "Persona divergence")
      await expect(page.locator(".divergence-screens .ehr-shell")).toHaveCount(
        5,
      );
    if (view === "Releases") {
      await expect(page.getByText("Old UI: fail")).toHaveCount(5);
      await expect(page.locator(".release-card .ehr-shell")).toHaveCount(10);
      await expect(
        page.getByText("First attempt rejected", { exact: true }),
      ).toHaveCount(1);
    }
    if (view === "Cost curves")
      await expect(page.getByRole("img")).toHaveCount(5);
    if (view === "Try to break it") {
      await page
        .getByRole("button", { name: "Show recorded verdict", exact: true })
        .click();
      await expect(
        page.getByText("break-attempt-rejected", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".counterexample .ehr-shell")).toHaveCount(1);
    }
  }
  expect(errors).toEqual([]);
});
