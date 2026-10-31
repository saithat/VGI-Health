import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlineChart } from "../src/mock/patient";

const calls = vi.hoisted(() => ({
  authenticated: vi.fn(),
  patient: vi.fn(),
  pages: vi.fn(),
}));
vi.mock("@medplum/core", () => ({
  MedplumClient: class {
    isAuthenticated = calls.authenticated;
    readResource = calls.patient;
    searchResourcePages = calls.pages;
  },
}));
import { loadChart } from "../src/data/medplum";

beforeEach(() => {
  calls.authenticated.mockReset().mockReturnValue(true);
  calls.patient.mockReset().mockResolvedValue(offlineChart.patient);
  calls.pages.mockReset().mockImplementation(async function* (
    type: string,
    query: Record<string, string>,
  ) {
    const resources = offlineChart.resources
      .filter((item) => item.resourceType === type)
      .filter(
        (item) =>
          item.resourceType !== "Observation" ||
          item.category?.some((category) =>
            category.coding?.some((code) => code.code === query.category),
          ),
      );
    yield resources.slice(0, 1);
    yield resources.slice(1);
  });
});

describe("single Medplum data boundary", () => {
  it("requires no network for the default unauthenticated offline demo", async () => {
    calls.authenticated.mockReturnValue(false);
    expect(await loadChart()).toEqual(offlineChart);
    expect(calls.patient).not.toHaveBeenCalled();
    expect(calls.pages).not.toHaveBeenCalled();
  });
  it("reads all pages, applies the required FHIR filters, and validates the live chart", async () => {
    const chart = await loadChart("sample-patient");
    expect(chart.source).toBe("medplum");
    expect(chart.resources).toHaveLength(offlineChart.resources.length);
    expect(calls.pages).toHaveBeenCalledWith("MedicationRequest", {
      patient: "sample-patient",
      status: "active",
      _count: "100",
    });
    expect(calls.pages).toHaveBeenCalledWith("Observation", {
      patient: "sample-patient",
      category: "vital-signs",
      _sort: "-date",
      _count: "100",
    });
    expect(calls.pages).toHaveBeenCalledWith("Observation", {
      patient: "sample-patient",
      category: "laboratory",
      _sort: "-date",
      _count: "100",
    });
  });
  it("does not silently replace malformed live FHIR with a synthetic chart", async () => {
    calls.patient.mockResolvedValue({ resourceType: "Patient", id: 42 });
    await expect(loadChart()).rejects.toThrow();
    calls.patient.mockResolvedValue(offlineChart.patient);
    calls.pages.mockImplementation(async function* () {
      yield [
        {
          resourceType: "Observation",
          id: "invalid",
          valueQuantity: { value: "not-a-number" },
        },
      ];
    });
    await expect(loadChart()).rejects.toThrow();
  });
  it("falls back to the separately identified sample patient if the backend is unavailable", async () => {
    calls.patient.mockRejectedValue(new Error("Connection refused"));
    const chart = await loadChart("different-patient");
    expect(chart.source).toBe("offline");
    expect(chart.patient.id).toBe("sample-patient");
    expect(chart.message).toContain("separate synthetic");
  });
});
