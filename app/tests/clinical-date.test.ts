// @vitest-environment node
import { expect, it } from "vitest";
import { clinicalDate } from "../src/data/clinicalDate";
import world from "../../runs/world/2/manifest.json";
it("uses the seeded workday even when the wall clock is a different date", () =>
  expect(clinicalDate()).toBe(world.startDate));
