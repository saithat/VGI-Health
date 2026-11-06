import { test, expect } from "@playwright/test";
import {
  backendAvailable,
  backendDownReason,
  signInBaseline,
  signInPersona,
} from "./live-backend";
import {
  enterPatientChart,
  navigateClinicalScreen,
} from "./clinical-navigation";
for (const [persona, screen] of [
  ["P1", "w1Rooming"],
  ["P2", "w3Triage"],
  ["P3", "w4Worklist"],
  ["RN2", "w4Worklist"],
  ["P4", "w5Rooming"],
  ["P5", "w1Rooming"],
] as const) {
  test(`${persona}: review is a guarded versioned command and the stored receipt survives reload`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    test.skip(!(await backendAvailable()), backendDownReason);
    await page.goto("/?audit=buttons&inspect=1");
    if (persona === "RN2") await signInPersona(page, persona);
    else await signInBaseline(page, persona);
    await enterPatientChart(page, "47466339");
    await navigateClinicalScreen(page, screen ?? "w1Rooming");
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/commit/commands") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: /^Mark allergies reviewed/ })
      .click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(201);
    const accepted = await response.json();
    expect(accepted.version).toBeGreaterThan(1);
    expect(
      accepted.links.some((link: string) => link.includes("/Provenance/")),
    ).toBe(true);
    await expect(
      page.locator(".mantine-Notification-root").last(),
    ).toContainText("review recorded");
    const patient = accepted.links[0].split("/")[3];
    const authorization = await response.request().headerValue("authorization");
    if (!authorization) throw new Error("Missing authenticated command");
    await page.reload();
    await expect(
      page.getByLabel("Patient search by name or MRN", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const snapshot = page
      .waitForResponse((r) =>
        r.url().endsWith(`/commit/patients/${patient}/chart`),
      )
      .then((r) => r.json());
    await enterPatientChart(page, "47466339");
    const stored = await snapshot;
    expect(stored.version).toBeGreaterThanOrEqual(accepted.version);
    const journal = await page.request.get(
      `/commit/patients/${patient}?after=${accepted.version - 1}`,
      { headers: { authorization } },
    );
    expect(journal.status()).toBe(200);
    expect(
      (await journal.json()).events.some(
        (e: { event: { guard?: { input: { commit: string } } } }) =>
          e.event.guard?.input.commit === "markReviewed",
      ),
    ).toBe(true);
  });
}
