import { expect, it } from "vitest";
import { run } from "./helpers";

it("each simulated day delivers an explicitly critical result with a covering route", () => {
  for (const day of run(19).days) {
    const critical = day.schedules.P1.tasks.flatMap((task) => task.todayResources)
      .filter((r) => JSON.stringify(r).includes("critical-result-route"));
    expect(critical).toHaveLength(1);
    expect(critical[0]).toMatchObject({
      resourceType: "Observation",
      valueQuantity: { value: 6.8, unit: "mmol/L" },
      interpretation: [{ coding: [{ code: "HH" }] }],
      extension: [{ extension: [
        { url: "responsible", valueString: "P1" },
        { url: "covering", valueString: "P2" },
        { url: "availableAt", valueInteger: expect.any(Number) },
        { url: "limit", valueInteger: 30 },
      ] }],
    });
  }
});
