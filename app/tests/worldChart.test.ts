import { describe, expect, it, vi } from "vitest";
import { prepareWorldChart, worldWorkDate } from "../src/data/worldChart";
vi.mock("../src/browser/data", () => ({
  readArtifact: async (path: string) =>
    path.includes("manifest")
      ? { startDate: "2026-11-02" }
      : path.includes("overrides")
        ? {
            entry: [
              {
                source: "fixtures/synthea/p.json",
                sourceFullUrl: "urn:uuid:med",
                key: "MedicationRequest/med",
                action: "replace",
                resource: {
                  resourceType: "MedicationRequest",
                  id: "med",
                  status: "completed",
                },
              },
              {
                source: "fixtures/synthea/p.json",
                sourceFullUrl: null,
                key: "AllergyIntolerance/nka",
                action: "create",
                resource: { resourceType: "AllergyIntolerance", id: "nka" },
              },
              {
                source: "fixtures/synthea/other.json",
                key: "Patient/other",
                action: "create",
                resource: { resourceType: "Patient", id: "other" },
              },
            ],
          }
        : {
            resourceType: "Bundle",
            entry: [{ resource: { resourceType: "Patient", id: "other" } }],
          },
}));
describe("world transport boundary", () => {
  it("uses the declared workday independently of the historical fixture cutoff", async () => {
    expect(await worldWorkDate()).toBe("2026-11-02");
  });
  it("replaces source identities once and keeps department patients outside the chart", async () => {
    const result = await prepareWorldChart(
      {
        resourceType: "Bundle",
        entry: [
          { resource: { resourceType: "Patient", id: "p" } },
          {
            fullUrl: "urn:uuid:med",
            resource: { resourceType: "MedicationRequest", status: "active" },
          },
        ],
      },
      "fixtures/synthea/p.json",
      "2026-11-02",
    );
    expect(result.bundle.entry.map((e) => e.resource.resourceType)).toEqual([
      "Patient",
      "MedicationRequest",
      "AllergyIntolerance",
    ]);
    expect(result.bundle.entry[1]?.resource.status).toBe("completed");
    expect(result.bundle.entry.some((e) => e.resource.id === "other")).toBe(
      false,
    );
    expect(result.worldContext).toBeDefined();
  });
});
