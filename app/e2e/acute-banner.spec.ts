import { enterPatientChart } from "./clinical-navigation";
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
    await enterPatientChart(page);
    await expect(page.locator(".clinical-shell")).toBeVisible({
      timeout: 30000,
    });
    const activityLink = page.locator(`button[data-comp-id$=".nav.${activity}"][data-event="click"]`);
    if (await activityLink.count()) await activityLink.click();
    await page
      .locator(
        `[data-comp-id="${activity}.${persona === "P2" ? "toSign" : "openDue"}"][data-event="click"]`,
      )
      .click();
    const banner = page.getByRole("banner", { name: "Patient banner" });
    const identity = banner.locator(".patient-name");
    const patient = await identity.textContent();
    const button = page.locator(`button[data-comp-id="${commit}"]`);
    await button.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
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
  ["P3", "w4Handoff", "w4Handoff.handoffRecommendation"],
] as const) {
  test(`${persona}: navigator cannot cover patient identity during ${activity}`, async ({
    page,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 1000,
      "Narrow views retain document flow",
    );
    if (activity === "w4Handoff")
      await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto(
      `/ehr?mode=replay&release=v1&persona=${persona}&program=releases/v1/personas/${persona}.json`,
    );
    await enterPatientChart(page);
    await expect(page.locator(".clinical-shell")).toBeVisible({
      timeout: 30000,
    });
    const activityLink = page.locator(`button[data-comp-id$=".nav.${activity}"][data-event="click"]`);
    if (await activityLink.count()) await activityLink.click();
    await page
      .locator(`[data-comp-id="${target}"]`)
      .first()
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    if (activity === "w4Handoff")
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
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
    const navigation = page.locator(".workflow-groups");
    await expect(navigation).toBeInViewport();
    expect(
      await navigation.locator("button").evaluateAll((buttons) =>
        buttons.every((button) => {
          const box = button.getBoundingClientRect();
          const top = document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          return top === button || (top !== null && button.contains(top));
        }),
      ),
    ).toBe(true);
    const links = await navigation.boundingBox();
    const header = await page
      .getByRole("banner", { name: "Patient banner" })
      .boundingBox();
    expect(links).not.toBeNull();
    expect(header).not.toBeNull();
    if (!links || !header) throw new Error("Missing retained clinical context");
    expect(links.y).toBeGreaterThanOrEqual(header.y + header.height);
    const targetActivity = persona === "P2" ? "w3Orders" : "w4Mar";
    await navigation
      .locator(`button[data-comp-id$=".nav.${targetActivity}"]`)
      .click();
    await expect(
      page.getByRole("heading", {
        name: persona === "P2" ? "Orders" : "MAR",
        exact: true,
      }),
    ).toBeVisible();
  });
}
