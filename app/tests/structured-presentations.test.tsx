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
  it("places the original action in its explicit row through nested presentations", () => {
    const onEvent = paint([
      {
        presentation: {
          kind: "worklist",
          children: [
            {
              section: {
                id: "tasks",
                title: "Tasks",
                children: [
                  {
                    presentation: {
                      kind: "worklist",
                      children: [
                        {
                          info: {
                            comp: "records",
                            infoId: "worklist",
                            label: "Worklist",
                            display: "table",
                            rows: [
                              [["Task", "Medication review"]],
                              [["Task", "Pain reassessment"]],
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    rowAction: {
                      target: "records",
                      row: 1,
                      children: [
                        {
                          button: {
                            comp: "open-pain",
                            label: "Open assessment",
                            role: "nav",
                            enabled: true,
                            blockedReason: null,
                            hotkey: null,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    const button = screen.getByRole("button", { name: "Open assessment" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(button.closest("tr")?.textContent).toContain("Pain reassessment");
    fireEvent.click(button);
    expect(onEvent).toHaveBeenCalledExactlyOnceWith({
      click: { comp: "open-pain" },
    });
  });
  it("retains unmatched, out-of-range and invalid row actions inline", () => {
    const onEvent = paint([
      {
        presentation: {
          kind: "worklist",
          children: [
            {
              info: {
                comp: "records",
                infoId: "worklist",
                label: "Worklist",
                display: "table",
                rows: [[["Task", "Review"]]],
              },
            },
            ...[
              ["missing", 0],
              ["records", 5],
              ["records", -1],
            ].map(([target, row], i): UiNode => ({
              rowAction: {
                target: String(target),
                row: Number(row),
                children: [
                  {
                    button: {
                      comp: `fallback-${i}`,
                      label: `Open ${i}`,
                      role: "nav",
                      enabled: true,
                      blockedReason: null,
                      hotkey: null,
                    },
                  },
                ],
              },
            })),
          ],
        },
      },
    ]);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.closest("table")).toBeNull();
      fireEvent.click(button);
    }
    expect(onEvent).toHaveBeenCalledTimes(3);
  });
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
  it("retains complete administration documentation below compact MAR cells", () => {
    const record =
      "Given · 08:12 · 500 mg · Oral · Left side · Jordan Reed, RN";
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
                    ["08:00", record],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(screen.getByRole("table", { name: "MAR" }).textContent).toContain(
      "Given · 08:12 · 500 mg",
    );
    expect(
      screen.getByRole("list", { name: "MAR administration details" })
        .textContent,
    ).toContain(record);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
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
  it("separates patient measurements from complete published reference data", () => {
    paint([
      {
        presentation: {
          kind: "growth",
          children: [
            {
              info: {
                comp: "growth",
                label: "Growth",
                infoId: "growth",
                display: "trend",
                rows: [
                  [
                    ["Date", "Nov 1, 2026"],
                    ["Age (months)", "114"],
                    ["Weight (kg)", "30.4"],
                  ],
                  [
                    ["Series", "Weight"],
                    ["Percentile", "50th"],
                    ["Age (months)", "114.5"],
                    ["Value", "31.177548"],
                    ["Unit", "kg"],
                    ["Reference", "CDC 2000, girls 2–20 years"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    const measurements = screen.getByRole("table", { name: "Growth" });
    const references = screen.getByRole("table", {
      name: "Growth reference data",
    });
    expect(measurements.textContent).toContain("30.4");
    expect(measurements.textContent).not.toContain("31.177548");
    expect(references.textContent).toContain("31.177548");
    expect(references.textContent).toContain("CDC 2000, girls 2–20 years");
  });
  it("labels a single dated observation once without inventing a time range", () => {
    paint([
      {
        presentation: {
          kind: "trend",
          children: [
            {
              info: {
                comp: "single",
                label: "Single result",
                infoId: "single",
                display: "trend",
                rows: [
                  [
                    ["Measure", "Example"],
                    ["Value", "5"],
                    ["Unit", "mg/dL"],
                    ["Recorded", "Nov 1, 2026 23:30"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(screen.getAllByText("23:30")).toHaveLength(1);
    expect(screen.queryByText("Nov 2")).toBeNull();
  });
  it("uses explicit status words and never derives a flag from a numeric value", () => {
    expect(suppliedTone("L")).toBe("blue");
    expect(suppliedTone("H")).toBe("amber");
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
