import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Audit } from "./driver";

test("fast app regression: report gate and dashboard control effects", async ({
  page,
}) => {
  const report: {
    controls: {
      owner: string;
      status: string;
      label: string;
      persona: string;
    }[];
  } = JSON.parse(
    readFileSync(
      resolve(
        process.env.EHR_AUDIT_DIR ??
          process.env.AUDIT_REPORT_DIR ??
          "../docs/audits",
        "buttons.json",
      ),
      "utf8",
    ),
  );
  expect(
    report.controls.filter((r) => ["dead", "error"].includes(r.status)),
  ).toEqual([]);
  expect(
    new Set(
      report.controls.filter((r) => r.owner === "lean").map((r) => r.persona),
    ),
  ).toEqual(new Set(["P1", "P2", "P3", "P4", "P5", "RN2"]));
  const audit = new Audit(page);
  await page.goto("/dashboard?run=run1-P3");
  await page.getByRole("region", { name: "Version history" }).waitFor();
  await audit.click(
    page.getByRole("button", { name: "Evolution", exact: true }),
  );
  await audit.click(page.getByRole("button", { name: "P3", exact: true }));
  await audit.click(
    page.getByRole("button", { name: "Releases", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Try to break it", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Show recorded verdict", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Replay counterexample", exact: true }),
  );
  await page
    .locator(".replay-screen .ehr-shell, .replay-screen .clinical-app")
    .first()
    .waitFor();
  await audit.click(
    page.getByRole("button", { name: "Reset path", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Previous event", exact: true }),
  );
  await audit.click(
    page.getByRole("button", { name: "Next event", exact: true }),
  );
  expect(
    audit.rows.filter((r) => ["dead", "error"].includes(r.status)),
  ).toEqual([]);
});
