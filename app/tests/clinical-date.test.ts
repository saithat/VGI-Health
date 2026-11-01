// @vitest-environment node
import { expect, it } from "vitest";
import {
  clinicalDate,
  formatClinicalDate,
  isClinicalDay,
} from "../src/data/clinicalDate";
import world from "../../infra/seeded-world-day.json";
it("uses the seeded workday even when the wall clock is a different date", () =>
  expect(clinicalDate()).toBe(world.date));
it("matches offset-bearing appointment times without requiring midnight equality", () => {
  expect(isClinicalDay("2026-11-02T07:30:00-08:00", "2026-11-02")).toBe(true);
  expect(isClinicalDay("2026-11-03T07:30:00-08:00", "2026-11-02")).toBe(false);
  expect(isClinicalDay(undefined, "2026-11-02")).toBe(false);
});
it("shows the snapshot date in clinician-readable form", () =>
  expect(formatClinicalDate("2026-11-02")).toBe("Nov 2, 2026"));
