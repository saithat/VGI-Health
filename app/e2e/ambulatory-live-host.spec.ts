import { test, expect } from "@playwright/test";
import {
  backendAvailable,
  backendDownReason,
  signInBaseline,
} from "./live-backend";
import {
  enterPatientChart,
  navigateClinicalScreen,
} from "./clinical-navigation";

for (const [persona, screen] of [
  ["P1", "w1Rooming"],
  ["P4", "w5Rooming"],
] as const)
  for (const inspecting of [false, true])
    test(`${persona}: live save feedback and encounter options${inspecting ? " with stored resource inspection" : ""}`, async ({
      page,
    }) => {
      test.setTimeout(90000);
      test.skip(!(await backendAvailable()), backendDownReason);
      await page.goto(`/?audit=buttons${inspecting ? "&inspect=1" : ""}`);
      await signInBaseline(page, persona);
      await enterPatientChart(page, inspecting ? "Terrance" : "Aaron");
      await navigateClinicalScreen(
        page,
        persona === "P1" ? "w1MedRec" : screen,
      );
      await expect(
        page.getByRole("button", { name: /^Mark medications reviewed/ }),
      ).toBeVisible();
      const saved = page.waitForResponse(
        (r) =>
          r.url().endsWith("/commit/commands") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: /^Mark medications reviewed/ })
        .click();
      const response = await saved;
      expect(response.status(), await response.text()).toBe(201);
      const feedback = page.locator(".mantine-Notification-root").last();
      await expect(feedback).toContainText("review recorded");
      if (inspecting) {
        await feedback.locator("button[data-resource-link]").first().click();
        const resource = page.getByRole("dialog", {
          name: "Saved commit service resource",
          exact: true,
        });
        await expect(
          resource.getByLabel("Saved resource JSON", { exact: true }),
        ).toContainText('"resourceType": "Provenance"');
        await resource
          .getByRole("button", { name: "Close saved resource", exact: true })
          .click();
      } else {
        await expect(feedback).toContainText("Your changes have been saved.");
        await expect(feedback).not.toContainText(/commit service|Provenance\//);
      }
      await page
        .getByRole("button", {
          name: inspecting ? "Live encounter" : "Encounter options",
          exact: true,
        })
        .click();
      const options = page.getByRole("dialog");
      await expect(options).toBeVisible();
      await expect(options).not.toContainText(
        /Encounter\/|Provenance\/|[0-9a-f]{8}-[0-9a-f]{4}-/i,
      );
      await options
        .getByRole("button", { name: "Return to worklist", exact: true })
        .click();
      await expect(
        page.getByLabel("Patient search by name or MRN", { exact: true }),
      ).toBeVisible();
      // A second patient's command must open a new server session and replay only that chart's journal.
      await enterPatientChart(page, inspecting ? "Aaron" : "Terrance");
      await navigateClinicalScreen(page, screen);
      await expect(
        page.getByRole("button", { name: /^Mark allergies reviewed/ }),
      ).toBeVisible();
      const second = page.waitForResponse(
        (r) =>
          r.url().endsWith("/commit/commands") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: /^Mark allergies reviewed/ })
        .click();
      const next = await second;
      expect(next.status(), await next.text()).toBe(201);
    });
