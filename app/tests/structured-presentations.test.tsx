import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { UiChildren } from "../src/ehr/ui/nodes";
import { clinicalTheme } from "../src/ehr/ui/theme";
import { uiNodeSchema, type UiNode } from "../src/ehr/ui/types";
import { suppliedTone } from "../src/ehr/ui/presentations/StructuredInfo";
import { expectedNodeAria } from "../src/ehr/ui/fidelity";

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
  it("keeps separate MAR day groups and preserves an undated column", () => {
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
                    ["Nov 1, 2026 08:00", "Given · 08:12"],
                    ["Nov 1, 2026 09:00", "Held · 09:05"],
                    ["Nov 2, 2026 08:00", "Scheduled · 08:00"],
                    ["Time not recorded", "Not given"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(
      screen
        .getByRole("columnheader", { name: "Nov 1, 2026" })
        .getAttribute("colspan"),
    ).toBe("2");
    expect(
      screen
        .getByRole("columnheader", { name: "Nov 2, 2026" })
        .getAttribute("colspan"),
    ).toBe("1");
    expect(screen.getAllByRole("columnheader", { name: "08:00" })).toHaveLength(
      2,
    );
    expect(
      screen.getByRole("columnheader", {
        name: "Time not recorded",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Not given")).toBeTruthy();
  });
  it("retains the recorded offset when grouping dated MAR hours", () => {
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
                    ["Medication", "insulin lispro"],
                    ["Category", "Scheduled"],
                    ["2026-11-02 08:00 -08:00", "Scheduled · 08:00"],
                    ["2026-11-02 09:00 -08:00", "Given · 09:03 · 4 units"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(
      screen
        .getByRole("columnheader", { name: "2026-11-02 -08:00" })
        .getAttribute("colspan"),
    ).toBe("2");
    expect(screen.getByRole("columnheader", { name: "08:00" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "09:00" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Category" })).toBeNull();
    expect(screen.getByText("Given · 09:03 · 4 units")).toBeTruthy();
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
    const ageLabels = [
      ...screen.getByRole("img").querySelectorAll('text[y="222"]'),
    ].map((tick) => tick.textContent);
    expect(ageLabels).toEqual(["114"]);
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
                    ["Value", "120"],
                    ["Unit", "g/L"],
                    ["Recorded", "Nov 1, 2026 23:30"],
                  ],
                ],
              },
            },
          ],
        },
      },
    ]);
    const plot = screen.getByRole("img");
    const clockLabels = [...plot.querySelectorAll("text")]
      .map((tick) => tick.textContent)
      .filter((label) => label?.includes("23:30"));
    expect(clockLabels).toEqual(["Nov 1, 2026 23:30"]);
    const valueLabels = [
      ...plot.querySelectorAll('text[text-anchor="end"]'),
    ].map((tick) => tick.textContent);
    expect(new Set(valueLabels).size).toBe(valueLabels.length);
    expect(valueLabels).toContain("120");
    expect(screen.queryByText("Nov 2")).toBeNull();
  });
  it("uses explicit status words and never derives a flag from a numeric value", () => {
    expect(suppliedTone("L")).toBe("blue");
    expect(suppliedTone("H")).toBe("amber");
    expect(suppliedTone("HH")).toBe("red");
    expect(suppliedTone("Held · Per order")).toBe("amber");
    expect(suppliedTone("final")).toBe("green");
    expect(suppliedTone("Report available")).toBe("green");
    expect(suppliedTone("Preliminary report")).toBe("blue");
    expect(suppliedTone("Images available")).toBeUndefined();
    expect(suppliedTone("6.5")).toBeUndefined();
    expect(suppliedTone("No high alert")).toBeUndefined();
  });
  it("draws a time series chronologically while retaining the supplied table order", () => {
    const dates = ["Nov 1, 2026", "Nov 3, 2026", "Nov 2, 2026"];
    paint([
      {
        presentation: {
          kind: "trend",
          children: [
            {
              info: {
                comp: "unordered",
                label: "Recorded history",
                infoId: "history",
                display: "trend",
                rows: dates.map((date, i) => [
                  ["Test", "Example"],
                  ["Value", String(i + 1)],
                  ["Recorded", date],
                ]),
              },
            },
          ],
        },
      },
    ]);
    const points = [...screen.getByRole("img").querySelectorAll("circle")].map(
      (point) => Number(point.getAttribute("cx")),
    );
    expect(points).toEqual([...points].sort((a, b) => a - b));
    expect(points).toHaveLength(3);
    const rows = [
      ...screen.getByRole("table").querySelectorAll("tbody tr"),
    ].map((row) => row.textContent);
    dates.forEach((date, i) => expect(rows[i]).toContain(date));
  });
  it("retains numeric text outside the plotting range without inventing a point", () => {
    const value = "9".repeat(400);
    const node: UiNode = {
      presentation: {
        kind: "trend",
        children: [
          {
            info: {
              comp: "large",
              label: "Source result",
              infoId: "resultTrend",
              display: "trend",
              rows: [
                [
                  ["Test", "Example"],
                  ["Value", value],
                  ["Recorded", "Nov 1, 2026"],
                ],
              ],
            },
          },
        ],
      },
    };
    paint([node]);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("table").textContent).toContain(value);
    expect(expectedNodeAria(node).some((entry) => entry.role === "img")).toBe(
      false,
    );
  });
  it("keeps finite geometry for a large supplied numeric result", () => {
    const values = ["174", "178"].map((prefix) => prefix + "0".repeat(306));
    paint([
      {
        presentation: {
          kind: "trend",
          children: [
            {
              info: {
                comp: "large-finite",
                label: "Finite result",
                infoId: "resultTrend",
                display: "trend",
                rows: values.map((value, i) => [
                  ["Test", "Example"],
                  ["Value", value],
                  ["Recorded", `Nov ${i + 1}, 2026`],
                ]),
              },
            },
          ],
        },
      },
    ]);
    const circles = [...screen.getByRole("img").querySelectorAll("circle")];
    expect(circles).toHaveLength(2);
    expect(
      circles.every((circle) =>
        Number.isFinite(Number(circle.getAttribute("cy"))),
      ),
    ).toBe(true);
    values.forEach((value) =>
      expect(screen.getByRole("table").textContent).toContain(value),
    );
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
