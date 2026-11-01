import { expect, test } from "@playwright/test";

for (const [persona, activity, commit] of [
  ["P2", "w3Orders", "w3Sign.commit.signOrders"],
  ["P3", "w4Mar", "w4Admin.commit.administerMed"],
] as const) {
  test(`${persona}: patient identity remains visible at the end of a desktop activity`, async ({
    page,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 1000,
      "Narrow views retain document flow",
    );
    await page.goto(
      `/ehr?mode=replay&release=v1&persona=${persona}&program=releases/v1/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-shell")).toBeVisible();
    await page
      .locator(`button[data-comp-id$=".nav.${activity}"][data-event="click"]`)
      .click();
    await page
      .locator(
        `[data-comp-id="${activity}.${persona === "P2" ? "toSign" : "openDue"}"][data-event="click"]`,
      )
      .click();
    const banner = page.getByRole("banner", { name: "Patient banner" });
    const identity = banner.locator(".patient-name");
    const patient = await identity.textContent();
    const button = page.locator(`button[data-comp-id="${commit}"]`);
    await button.scrollIntoViewIfNeeded();
    await expect(identity).toBeInViewport();
    await expect(identity).toHaveText(patient ?? "");
    expect(
      await identity.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return top === element || (top !== null && element.contains(top));
      }),
    ).toBe(true);
    await expect(button).toBeInViewport();
    const header = await banner.boundingBox(),
      action = await button.boundingBox();
    expect(header).not.toBeNull();
    expect(action).not.toBeNull();
    if (!header || !action)
      throw new Error("Missing patient context or commit");
    expect(header.y).toBeGreaterThanOrEqual(0);
    expect(header.y + header.height).toBeLessThanOrEqual(action.y);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  });
}

for (const [persona, activity, target] of [
  ["P2", "w3Provider", "w3Provider.assessmentPlan"],
  ["P3", "w4Flowsheet", "w4Flowsheet.commit.chartAssessment"],
] as const) {
  test(`${persona}: navigator cannot cover patient identity during chart review`, async ({
    page,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 1000,
      "Narrow views retain document flow",
    );
    await page.goto(
      `/ehr?mode=replay&release=v1&persona=${persona}&program=releases/v1/personas/${persona}.json`,
    );
    await expect(page.locator(".clinical-shell")).toBeVisible();
    await page
      .locator(`button[data-comp-id$=".nav.${activity}"][data-event="click"]`)
      .click();
    await page
      .locator(`[data-comp-id="${target}"]`)
      .first()
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    const identity = page
      .getByRole("banner", { name: "Patient banner" })
      .locator(".patient-name");
    await expect(identity).toBeInViewport();
    expect(
      await identity.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return top === element || (top !== null && element.contains(top));
      }),
    ).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  });
}
