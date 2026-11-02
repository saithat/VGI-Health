import { withData } from "./data";
// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decisionRecordSchema,
  programSchema,
  type Program,
} from "../../agent/src/schema";
import {
  revisionChanges,
  propertyReason,
  recordedPatch,
} from "../src/browser/revision-diff";
import { ehrUrl } from "../src/browser/data";
import { chartDateForTimelineDay } from "../src/data/worldChart";
const source = () =>
  programSchema.parse({
    id: "P3",
    owner: "P3",
    role: "rn",
    version: 0,
    specVersion: "v3",
    start: "ward",
    screens: [
      {
        id: "ward",
        title: "Medication Administration",
        workflow: "W4",
        components: [
          {
            id: "allergies",
            label: "Allergies",
            kind: { panel: { info: "allergyList" } },
          },
          {
            id: "weight",
            label: "Weight (kg)",
            kind: {
              field: { element: "weight", slot: "current", prefill: "none" },
            },
          },
          {
            id: "review",
            label: "Review medications",
            kind: { group: { collapsible: true, startCollapsed: false } },
          },
        ],
      },
    ],
    macros: [],
  });
describe("read-only clinician revision comparison", () => {
  it("reports actual ordering, record-prefill and macro changes without mutating either program", () => {
    const before = source();
    const after: Program = structuredClone(before);
    const screen = after.screens[0];
    if (!screen) throw new Error("Missing source screen");
    screen.components.reverse();
    const weight = screen.components.find((c) => c.id === "weight");
    if (!weight) throw new Error("Missing source weight");
    weight.kind = {
      field: {
        element: "weight",
        slot: "current",
        prefill: { fromRecord: { fact: "latestWeightKg" } },
      },
    };
    after.macros.push({
      id: "prepare",
      label: "Prepare medication review",
      steps: [{ goto: { screen: "ward" } }, { click: { comp: "review" } }],
    });
    const original = JSON.stringify({ before, after });
    const changes = revisionChanges(before, after);
    expect(changes).toContainEqual(
      expect.objectContaining({
        label: "Medication Administration · Review medications: position",
        before: "Position 3, after Weight (kg)",
        after: "Position 1, first in this section",
      }),
    );
    expect(changes).toContainEqual(
      expect.objectContaining({
        before: "Entered by the clinician",
        after: "From the record: latest Weight Kg",
      }),
    );
    expect(changes).toContainEqual(
      expect.objectContaining({
        label: "Quick action: Prepare medication review",
        before: "No quick action",
        after: "Open Medication Administration; Choose Review medications",
      }),
    );
    expect(JSON.stringify({ before, after })).toBe(original);
    expect(revisionChanges(before, before)).toEqual([]);
  });
  it("describes removals and permissions failures explicitly", () => {
    const before = source(),
      after = source();
    after.screens = [];
    expect(revisionChanges(before, after)).toEqual([
      {
        label: "Screen removed",
        before: "Medication Administration",
        after: "Not available",
      },
    ]);
    expect(propertyReason("humanOnlyKept")).toContain(
      "must be made by a person",
    );
  });
  withData("runs/run1-P3").it("shows the final certified patch and never labels an undeployed proposal as applied", () => {
    const record = decisionRecordSchema.parse(
      JSON.parse(
        readFileSync(
          new URL(
            "../../runs/run1-P3/decisions/night-05/P3.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    expect(recordedPatch(record)).toHaveLength(20);
    record.versionAfter = record.versionBefore;
    expect(recordedPatch(record)).toEqual([]);
  });
  withData("runs/run1-P3").it("reports the real recorded night-eight alert change rather than claiming no change", () => {
    const load = (version: number) =>
      programSchema.parse(
        JSON.parse(
          readFileSync(`../runs/run1-P3/programs/P3/v${version}.json`, "utf8"),
        ),
      );
    const changes = revisionChanges(load(6), load(7));
    expect(changes).toContainEqual(
      expect.objectContaining({
        label: expect.stringContaining("alert display request"),
        before: "Requests a pop-up dialog",
        after: "Requests inline display; alert policy still applies",
      }),
    );
  });
  it("opens a persona and chart day without selecting a patient in the URL", () => {
    const program = {
      path: "runs/run1-P3/programs/P3/v4.json",
      release: "v2",
      persona: "P3",
      role: "rn",
      group: "Recorded",
      label: "Revision",
      run: "run1-P3",
      deployed: true,
      mock: false,
      version: 4,
      recordedCertificate: "certified" as const,
    };
    const url = new URL(ehrUrl(program, "P3", 5), "http://localhost");
    expect(url.searchParams.get("persona")).toBe("P3");
    expect(url.searchParams.get("day")).toBe("5");
    expect(url.searchParams.has("patient")).toBe(false);
    expect(chartDateForTimelineDay(5, "fallback")).toBe("2026-11-06");
  });
});
