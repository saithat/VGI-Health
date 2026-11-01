import { render, screen, cleanup } from "@testing-library/react";
import { it, expect, afterEach } from "vitest";
import { RuleConformanceBadge } from "../src/dashboard/RuleConformance";
import { ruleConformanceSchema } from "../src/dashboard/conformance-data";
import { loadRunSummary } from "../src/dashboard/data";
afterEach(cleanup);

const evidence = {
  schemaVersion: 1,
  runId: "run1-P3",
  generatedAt: "2026-11-01T16:00:00Z",
  deploymentGate: false,
  targets: [
    {
      id: "run1-P3/P3/v2",
      kind: "deployed",
      persona: "P3",
      revision: 2,
      release: "v1.1",
      passed: 38,
      failed: 1,
      notApplicable: 130,
    },
  ],
  results: [
    {
      target: "run1-P3/P3/v2",
      scenario: "patient-switch.chart-scoping",
      status: "fail",
      observed: "Patient A allergy appeared in B",
    },
  ],
};
it("shows a per-revision failure badge and the observed outcome", () => {
  render(
    <RuleConformanceBadge
      data={ruleConformanceSchema.parse(evidence)}
      persona="P3"
      revision={2}
    />,
  );
  expect(screen.getByText("Rule conformance: 1 failures")).toBeTruthy();
  expect(screen.getByText(/Patient A allergy appeared in B/)).toBeTruthy();
  expect(screen.getByRole("link").getAttribute("href")).toBe(
    "/runs/run1-P3/conformance.json",
  );
});
it("shows all pass only for a measured matching revision", () => {
  const measured = ruleConformanceSchema.parse({
    ...evidence,
    targets: [{ ...evidence.targets[0], failed: 0 }],
    results: [],
  });
  const view = render(
    <RuleConformanceBadge data={measured} persona="P3" revision={2} />,
  );
  expect(screen.getByText("Rule conformance: all pass")).toBeTruthy();
  view.rerender(
    <RuleConformanceBadge data={measured} persona="P3" revision={3} />,
  );
  expect(screen.getByText("Rule conformance: unavailable")).toBeTruthy();
});
it("loads optional evidence separately from the recorded summary and rejects another run", async () => {
  const summary = {
    manifest: {
      runId: "run1-P3",
      days: 1,
      personas: ["P3"],
      ehr: { mode: "real" },
    },
    records: [],
    days: [],
    complexity: null,
    files: ["conformance.json"],
  };
  const read = async (url: string) =>
    url.endsWith("summary.json") ? summary : evidence;
  expect(
    (await loadRunSummary("run1-P3", read)).ruleConformance?.targets[0]?.failed,
  ).toBe(1);
  await expect(
    loadRunSummary("run1-P3", async (url) =>
      url.endsWith("summary.json")
        ? summary
        : { ...evidence, runId: "another-run" },
    ),
  ).rejects.toThrow("another run");
});
