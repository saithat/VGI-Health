import { describe, expect, it } from "vitest";
import { uiNodeSchema, type UiNode } from "../src/ehr/ui/types";
const pane = (patient: string): UiNode => ({
  patientPane: {
    patient,
    banner: [["Patient", patient]],
    metadata: {
      sourceLabels: [],
      fieldSources: [],
      entryHints: [],
      fieldChoices: [],
    },
    children: [
      {
        button: {
          comp: "sign",
          label: "Sign",
          role: "primary",
          enabled: false,
          blockedReason: "Review required",
          hotkey: null,
        },
      },
    ],
    modal: [],
  },
});
const source = {
  resource: "Observation/a",
  field: "effectiveDateTime",
  timestamp: "2026-11-02T00:00:00Z",
};
describe("ordinary composition boundary", () => {
  it("permits repeated component IDs across different patient namespaces", () => {
    expect(
      uiNodeSchema.safeParse({
        board: { urgent: [], children: [pane("A"), pane("B")] },
      }).success,
    ).toBe(true);
  });
  it("rejects duplicate patient keys and a demand assigned to an absent patient", () => {
    expect(
      uiNodeSchema.safeParse({
        board: { urgent: [], children: [pane("A"), pane("A")] },
      }).success,
    ).toBe(false);
    expect(
      uiNodeSchema.safeParse({
        board: {
          urgent: [
            {
              patient: "B",
              banner: [],
              alertId: "urgent",
              label: "Urgent",
              severity: "passive",
            },
          ],
          children: [pane("A")],
        },
      }).success,
    ).toBe(false);
  });
  it("retains equal-time duplicates but rejects reversed fractional instants", () => {
    const item = { source, utcSecond: 1793577600, nanosecond: 1 };
    const timeline = (dated: unknown[]) => ({
      datedTimeline: {
        title: "UTC source index",
        dated,
        undated: [],
        children: [],
      },
    });
    expect(uiNodeSchema.safeParse(timeline([item, item])).success).toBe(true);
    expect(
      uiNodeSchema.safeParse(timeline([{ ...item, nanosecond: 2 }, item]))
        .success,
    ).toBe(false);
  });
});
