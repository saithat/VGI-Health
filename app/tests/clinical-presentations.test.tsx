import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { UiChildren } from "../src/ehr/ui/nodes";
import { clinicalTheme } from "../src/ehr/ui/theme";
import { uiNodeSchema, type UiNode } from "../src/ehr/ui/types";
import { suppliedTone } from "../src/ehr/ui/presentations/StructuredInfo";

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);
function paint(nodes: UiNode[]) {
  const onEvent = vi.fn();
  render(
    <MantineProvider theme={clinicalTheme}>
      <UiChildren nodes={nodes} onEvent={onEvent} />
    </MantineProvider>,
  );
  return onEvent;
}
describe("structured clinical data boundary", () => {
  it("preserves repeated cells and unknown clinical columns without adding controls", () => {
    paint([
      {
        presentation: {
          kind: "timeGrid",
          children: [
            {
              info: {
                comp: "mar",
                label: "MAR",
                infoId: "mar",
                display: "table",
                rows: [
                  [
                    ["Medication", "Example medication"],
                    ["Dose", "10 mg"],
                    ["08:00", "Given · 08:12"],
                    ["08:00", "Held · 08:40"],
                    ["Safety note", "Independent double check recorded"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(screen.getByRole("table", { name: "MAR" })).toBeTruthy();
    for (const value of [
      "10 mg",
      "Given · 08:12",
      "Held · 08:40",
      "Independent double check recorded",
    ])
      expect(screen.getByText(value)).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("forwards a real nested semantic control using its unchanged component ID", () => {
    const events = paint([
      {
        presentation: {
          kind: "worklist",
          children: [
            {
              button: {
                comp: "open-selected-encounter",
                label: "Open encounter",
                role: "nav",
                enabled: true,
                blockedReason: null,
                hotkey: null,
              },
            },
          ],
        },
      },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Open encounter" }));
    expect(events).toHaveBeenCalledExactlyOnceWith({
      click: { comp: "open-selected-encounter" },
    });
  });
  it("keeps unlike units in separate trend images and preserves nonnumeric results", () => {
    paint([
      {
        presentation: {
          kind: "trend",
          children: [
            {
              info: {
                comp: "labs",
                label: "Results",
                infoId: "labs",
                display: "trend",
                rows: [
                  [
                    ["Test", "Glucose"],
                    ["Value", "90"],
                    ["Unit", "mg/dL"],
                    ["Recorded", "Nov 1, 2026"],
                  ],
                  [
                    ["Test", "Glucose"],
                    ["Value", "5"],
                    ["Unit", "mmol/L"],
                    ["Recorded", "Nov 1, 2026"],
                  ],
                  [
                    ["Test", "Other"],
                    ["Value", "<5"],
                    ["Unit", "mg/dL"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText("<5")).toBeTruthy();
  });
  it("does not invent an epoch date for an undated observation", () => {
    paint([
      {
        presentation: {
          kind: "trend",
          children: [
            {
              info: {
                comp: "series",
                label: "Undated result",
                infoId: "series",
                display: "trend",
                rows: [
                  [
                    ["Measure", "Example"],
                    ["Value", "5"],
                    ["Unit", "mg/dL"],
                    ["Recorded", "Not recorded"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(screen.queryByText(/1970/)).toBeNull();
    expect(screen.getByText("Observation sequence")).toBeTruthy();
  });
  it("uses explicit status words and never derives a flag from a numeric value", () => {
    expect(suppliedTone("L")).toBe("blue");
    expect(suppliedTone("H")).toBe("red");
    expect(suppliedTone("HH")).toBe("red");
    expect(suppliedTone("Held · Per order")).toBe("amber");
    expect(suppliedTone("6.5")).toBeUndefined();
    expect(suppliedTone("No high alert")).toBeUndefined();
  });
  it("validates the new semantic wrapper and rejects an unknown wire kind", () => {
    expect(
      uiNodeSchema.safeParse({
        presentation: { kind: "flowsheet", children: [] },
      }).success,
    ).toBe(true);
    expect(
      uiNodeSchema.safeParse({
        presentation: { kind: "unverified", children: [] },
      }).success,
    ).toBe(false);
  });
});
