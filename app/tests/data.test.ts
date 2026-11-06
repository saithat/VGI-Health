import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlineChart } from "../src/mock/patient";
const request = vi.hoisted(() => vi.fn());
vi.mock("../src/data/commitService", () => ({
  marRequest: request,
  restoreMar: vi.fn(async () => ({
    user: { id: "P1", role: "physician" },
    persona: "P1",
  })),
  loginMar: vi.fn(),
  logoutMar: vi.fn(),
}));
import { loadChart, restoreUser } from "../src/data/liveStore";
beforeEach(async () => {
  request.mockReset();
  await restoreUser();
});
describe("commit store chart reads", () => {
  it("uses the versioned patient snapshot and validates its read projection", async () => {
    request.mockResolvedValue({
      version: 1,
      snapshot: {
        bundle: {
          resourceType: "Bundle",
          type: "collection",
          entry: [offlineChart.patient, ...offlineChart.resources].map(
            (resource) => ({ resource }),
          ),
        },
      },
    });
    const chart = await loadChart("sample-patient");
    expect(chart.source).toBe("commit");
    expect(chart.resources).toHaveLength(offlineChart.resources.length);
    expect(request).toHaveBeenCalledWith("/patients/sample-patient/chart");
  });
  it("surfaces malformed data and unavailable storage without substituting a demo chart", async () => {
    request.mockResolvedValue({
      snapshot: {
        bundle: { entry: [{ resource: { resourceType: "Patient", id: 42 } }] },
      },
    });
    await expect(loadChart()).rejects.toThrow();
    request.mockRejectedValue(new Error("Connection refused"));
    await expect(loadChart()).rejects.toThrow("Connection refused");
  });
});
