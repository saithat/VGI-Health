import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Event } from "../../lean/generated/ehr-types";
import { UiScreenView } from "../src/ehr/ui/Screen";
import { UiChildren, UiNodeView } from "../src/ehr/ui/nodes";
import { entryEvent } from "../src/ehr/ui/events";
import {
  formatDisplayValue,
  severityTone,
  statusTone,
} from "../src/ehr/ui/display";
import { expectedAria, observedAria } from "../src/ehr/ui/fidelity";
import { clinicalTheme } from "../src/ehr/ui/theme";
import {
  uiScreenSchema,
  type NodeOf,
  type UiNode,
  type UiScreen,
} from "../src/ehr/ui/types";
import rooming from "../src/fixtures/ui/w1Rooming.json";
import orders from "../src/fixtures/ui/w1Orders.json";
import sign from "../src/fixtures/ui/w1Sign.json";
import popup from "../src/fixtures/ui/p1-alert.json";
import bad from "../src/fixtures/ui/bad-sign.json";

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});
afterEach(cleanup);
const field: NodeOf<"field"> = {
  comp: "entry",
  label: "Clinical value",
  kind: "text",
  value: null,
  unit: null,
  provenance: null,
  pendingConfirm: false,
  humanOnly: false,
  required: false,
};
const button: NodeOf<"button"> = {
  comp: "action",
  label: "Continue",
  role: "nav",
  enabled: true,
  blockedReason: null,
  hotkey: null,
};
function paint(nodes: UiNode[], onEvent: (event: Event) => void = () => {}) {
  return render(
    <MantineProvider theme={clinicalTheme}>
      <UiChildren nodes={nodes} onEvent={onEvent} />
    </MantineProvider>,
  );
}

describe("semantic EHR painter", () => {
  it("dispatches exported nav component IDs and omits empty groups", () => {
    const emit = vi.fn();
    const model: UiScreen = {
      banner: [],
      title: "Chart",
      nav: [
        ["Navigator", [["actual.goto.component", "Open rooming"]]],
        ["Empty group", []],
      ],
      workspace: [],
      side: [],
      modal: null,
    };
    render(
      <MantineProvider>
        <UiScreenView screen={model} onEvent={emit} />
      </MantineProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open rooming", exact: true }),
    );
    expect(emit.mock.calls).toEqual([
      [{ click: { comp: "actual.goto.component" } }],
    ]);
    expect(screen.queryByText("Empty group")).toBeNull();
  });

  it("renders every UiNode constructor and all supplied records", () => {
    paint([
      {
        section: {
          id: "review",
          title: "Review",
          children: [
            {
              columns: {
                children: [
                  { field },
                  {
                    field: {
                      ...field,
                      comp: "flag",
                      kind: "flag",
                      label: "Reviewed",
                      value: "true",
                    },
                  },
                ],
              },
            },
            {
              tabs: {
                id: "tabs",
                labels: ["Chart", "History"],
                selected: 0,
                body: [{ text: { s: "Selected chart body" } }],
              },
            },
            {
              stepper: {
                steps: [
                  ["review", "Review"],
                  ["sign", "Sign"],
                ],
                current: 0,
              },
            },
            {
              info: {
                comp: "meds",
                label: "Medication records",
                infoId: "currentMeds",
                display: "table",
                rows: [
                  [
                    ["Drug", "Losartan"],
                    ["Dose", "50 mg"],
                  ],
                  [
                    ["Drug", "Metformin"],
                    ["Dose", "500 mg"],
                  ],
                ],
              },
            },
            {
              alert: {
                comp: "warning",
                alertId: "allergy",
                label: "Review allergy",
                severity: "warning",
              },
            },
            { button },
          ],
        },
      },
    ]);
    expect(screen.getByRole("region", { name: "Review" })).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Clinical value" }),
    ).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Reviewed" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Chart" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Visit progress" })).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "Medication records" }).textContent,
    ).toContain("Metformin");
    expect(screen.getByRole("alert", { name: "Review allergy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.getByText("Selected chart body")).toBeTruthy();
  });
  it("renders lists, summaries, trends, code Selects, and empty records", () => {
    paint([
      ...["list", "summary", "trend", "table"].map((display): UiNode => ({
        info: {
          comp: display,
          infoId: "labs",
          label: display,
          display,
          rows: [
            [
              ["Date", "2026-10-31"],
              ["Value", "7.1"],
            ],
            [
              ["Date", "2026-10-01"],
              ["Value", "7.5"],
            ],
          ],
        },
      })),
      {
        info: {
          comp: "empty",
          infoId: "allergyList",
          label: "Allergies",
          display: "table",
          rows: [],
        },
      },
      { field: { ...field, kind: "code", value: "I10" } },
    ]);
    expect(screen.getByRole("list", { name: "list" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "trend trend" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "trend" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Clinical value" }),
    ).toBeTruthy();
    expect(screen.getByText("No records on file")).toBeTruthy();
  });
  it("renders list records as compact inline values without record tables", () => {
    const { container } = paint([
      {
        info: {
          comp: "history",
          infoId: "history",
          label: "History",
          display: "list",
          rows: [
            [
              ["Problem", "Hypertension"],
              ["Status", "active"],
              ["Onset", "2026-10-31T09:14:00Z"],
            ],
            [
              ["Problem", "Diabetes"],
              ["Status", "resolved"],
            ],
          ],
        },
      },
    ]);
    const list = screen.getByRole("list", { name: "History" });
    expect(list.querySelectorAll("li")).toHaveLength(2);
    expect(list.querySelector(".record-primary")?.textContent).toBe(
      "Hypertension",
    );
    expect(list.querySelector(".record-secondary")?.textContent).toBe(
      "Status: active",
    );
    expect(list.textContent).toContain("Diabetes");
    expect(container.querySelector("table, dl")).toBeNull();
    expect(list.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-10-31T09:14:00Z",
    );
  });
  it("formats ISO display dates without normalizing invalid dates or touching clinical text", () => {
    expect(formatDisplayValue("1968-07-03")).toBe("03 Jul 1968");
    expect(formatDisplayValue("2024-02-29")).toBe("29 Feb 2024");
    const stamp = "2026-10-31T09:14:00-07:00";
    expect(formatDisplayValue(stamp)).toBe(
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(stamp)),
    );
    for (const value of [
      "2026-02-29",
      "2026-02-31T09:00:00Z",
      "2026-10-31T25:00:00Z",
      "2026-13-01",
      "2026-10-31T09:00:00+99:00",
      "Recorded 2026-10-31T09:00:00Z",
      "0.5 mg",
      "unknown",
      "",
    ]) {
      expect(formatDisplayValue(value)).toBe(value);
    }
  });
  it("styles only explicit medication statuses and never infers severity from interruption tier", () => {
    expect(
      [
        "Scheduled 12:00",
        "Due 09:00",
        "Overdue 09:00",
        "Given 09:12",
        "Held",
        "Refused",
        "Stopped",
        "Not charted",
      ].map(statusTone),
    ).toEqual([
      "gray",
      "blue",
      "red",
      "green",
      "yellow",
      "violet",
      "gray",
      "gray",
    ]);
    expect(statusTone("unknown")).toBeUndefined();
    expect(statusTone("active")).toBeUndefined();
    expect(["interruptive", "passive", "removable"].map(severityTone)).toEqual([
      "blue",
      "blue",
      "blue",
    ]);
    expect(severityTone("severe")).toBe("red");
    expect(severityTone("warning")).toBe("yellow");
    const { container } = paint([
      {
        info: {
          comp: "mar",
          infoId: "mar",
          label: "Medication administration",
          display: "table",
          rows: [
            [
              ["Medication", "Medicine A 250 mg"],
              ["Status", "Given 09:12"],
            ],
            [
              ["Medication", "Medicine B 10 mg"],
              ["Status", "Overdue 09:00"],
            ],
            [
              ["Medication", "Medicine C 5 mg"],
              ["Status", "unknown"],
            ],
          ],
        },
      },
    ]);
    expect(container.querySelector(".status-green")?.textContent).toBe(
      "Given 09:12",
    );
    expect(container.querySelector(".status-red")?.textContent).toBe(
      "Overdue 09:00",
    );
    expect(container.querySelectorAll(".clinical-status")).toHaveLength(2);
  });
  it.each([
    ["text", "abc", null, { text: { s: "abc" } }],
    ["code", "I10", null, { code: { c: "I10" } }],
    ["scan", "01234", null, { code: { c: "01234" } }],
    ["user", "clinician-2", null, { user: { u: "clinician-2" } }],
    ["cosign", "clinician-3", null, { user: { u: "clinician-3" } }],
    ["identity", "AA/M/58", null, { text: { s: "AA/M/58" } }],
    ["flag", true, null, { flag: { b: true } }],
    ["qty", "83.46", "kg", { qty: { tenths: 835, unit: "kg" } }],
  ] as const)(
    "maps %s values to the exact Lean constructor",
    (kind, raw, unit, expected) => {
      expect(entryEvent({ ...field, kind, unit }, raw)).toEqual({
        enter: { comp: "entry", value: expected },
      });
    },
  );
  it("refuses invalid quantities and preserves the search event", () => {
    for (const value of ["", "-1", "abc", "Infinity"])
      expect(
        entryEvent({ ...field, kind: "qty", unit: "kg" }, value),
      ).toBeUndefined();
    expect(
      entryEvent({ ...field, kind: "qty", unit: "bogus" }, "5"),
    ).toBeUndefined();
    expect(entryEvent({ ...field, kind: "search" }, "metformin")).toEqual({
      search: { query: "metformin" },
    });
  });
  it("maps DOM text, number, checkbox and confirm events once, by comp id", () => {
    const emit = vi.fn();
    paint(
      [
        { field },
        {
          field: {
            ...field,
            comp: "weight",
            label: "Weight",
            kind: "qty",
            unit: "kg",
          },
        },
        { field: { ...field, comp: "flag", label: "Reviewed", kind: "flag" } },
        {
          field: {
            ...field,
            comp: "dose",
            label: "Dose",
            value: "50",
            provenance: "Prior order",
            pendingConfirm: true,
          },
        },
      ],
      emit,
    );
    expect(emit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Clinical value" }), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Weight" }), {
      target: { value: "83.4" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Reviewed" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Dose" }));
    expect(emit.mock.calls.map(([event]) => event)).toEqual([
      { enter: { comp: "entry", value: { text: { s: "abc" } } } },
      {
        enter: { comp: "weight", value: { qty: { tenths: 834, unit: "kg" } } },
      },
      { enter: { comp: "flag", value: { flag: { b: true } } } },
      { confirm: { comp: "dose" } },
    ]);
  });
  it("maps free code entry and enumerated Select choices without render-time events", () => {
    const emit = vi.fn();
    paint(
      [
        { field: { ...field, label: "Diagnosis", kind: "code", value: "I10" } },
        {
          field: {
            ...field,
            comp: "route",
            label: "Route",
            kind: "coded:PO|IV",
            value: "PO",
          },
        },
      ],
      emit,
    );
    expect(emit).not.toHaveBeenCalled();
    fireEvent.input(screen.getByRole("combobox", { name: "Diagnosis" }), {
      target: { value: "E11.9" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Route" }));
    fireEvent.click(screen.getByRole("option", { name: "IV" }));
    expect(emit.mock.calls.map(([event]) => event)).toEqual([
      { enter: { comp: "entry", value: { code: { c: "E11.9" } } } },
      { enter: { comp: "route", value: { code: { c: "IV" } } } },
    ]);
  });
  it("uses an explicit sibling confirm node as the pending field's single affordance", () => {
    const emit = vi.fn();
    paint(
      [
        { field: { ...field, pendingConfirm: true, provenance: "Record" } },
        {
          button: {
            ...button,
            role: "confirm",
            comp: field.comp,
            label: "Confirm prefilled value",
          },
        },
      ],
      emit,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm prefilled value" }),
    );
    expect(emit.mock.calls).toEqual([[{ confirm: { comp: "entry" } }]]);
  });
  it.each(["primary", "secondary", "nav", "macro", "toggle", "confirm", "ack"])(
    "maps %s button semantics",
    (role) => {
      const emit = vi.fn();
      paint([{ button: { ...button, role } }], emit);
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      expect(emit.mock.calls).toEqual([
        [
          role === "ack"
            ? { ack: { alert: "action" } }
            : role === "confirm"
              ? { confirm: { comp: "action" } }
              : { click: { comp: "action" } },
        ],
      ]);
    },
  );
  it("does not emit on render, blocks disabled commits, and exposes their reason", () => {
    const emit = vi.fn();
    paint(
      [
        {
          button: {
            ...button,
            role: "primary",
            enabled: false,
            blockedReason: "Identity required",
            hotkey: "Ctrl + Enter",
          },
        },
      ],
      emit,
    );
    const action = screen.getByRole("button", { name: "Continue" });
    expect(action.getAttribute("disabled")).not.toBeNull();
    expect(action.getAttribute("title")).toBe("Identity required");
    const description = document.getElementById(
      action.getAttribute("aria-describedby") ?? "",
    );
    expect(description?.textContent).toBe("Identity required");
    expect(action.getAttribute("data-variant")).toBe("filled");
    fireEvent.click(action);
    expect(emit).not.toHaveBeenCalled();
  });
  it("emits tab selection by tab component and actual index", () => {
    const emit = vi.fn();
    paint(
      [
        {
          tabs: {
            id: "chart-tabs",
            labels: ["Current", "History"],
            selected: 0,
            body: [{ text: { s: "Current content" } }],
          },
        },
      ],
      emit,
    );
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(emit.mock.calls).toEqual([
      [{ selectTab: { comp: "chart-tabs", idx: 1 } }],
    ]);
  });
  it("shows human-only and identity/scan/cosign styling", () => {
    const { container } = paint(
      ["identity", "scan", "cosign"].map((kind) => ({
        field: { ...field, kind, comp: kind, label: kind, humanOnly: true },
      })),
    );
    for (const kind of ["identity", "scan", "cosign"])
      expect(container.querySelector(`.field-${kind}`)).toBeTruthy();
    expect(screen.getAllByText("Human entry only")).toHaveLength(3);
  });
  it("keeps modal acknowledgement blocking and uses its alert id", () => {
    const emit = vi.fn();
    const model: UiScreen = {
      banner: [
        ["Patient", "Alex Morgan"],
        ["MRN", "123"],
      ],
      nav: [],
      title: "Orders",
      workspace: [{ button }],
      side: [],
      modal: {
        section: {
          id: "interaction",
          title: "Interaction alert",
          children: [
            { text: { s: "Review concurrent medication" } },
            {
              button: {
                ...button,
                role: "ack",
                comp: "interaction",
                label: "Acknowledge",
              },
            },
          ],
        },
      },
    };
    render(
      <MantineProvider>
        <UiScreenView screen={model} onEvent={emit} />
      </MantineProvider>,
    );
    expect(
      screen.getByRole("dialog", { name: "Interaction alert" }),
    ).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.getByRole("dialog", { name: "Interaction alert" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(emit.mock.calls).toEqual([[{ ack: { alert: "interaction" } }]]);
  });
  it.each([rooming, orders, sign, popup, bad])(
    "accepts actual Lean fixture %# with a deterministic accessibility contract",
    (input) => {
      const model = uiScreenSchema.parse(input);
      const expected = expectedAria(model);
      expect(
        expected.some(
          (item) => item.role === (model.modal ? "dialog" : "banner"),
        ),
      ).toBe(true);
      expect(
        expectedAria(uiScreenSchema.parse(JSON.parse(JSON.stringify(model)))),
      ).toEqual(expected);
    },
  );
  it("compares exact role/name/disabled projections and detects drift", () => {
    const snapshot =
      '- banner "Patient banner"\n- main:\n  - button "Sign orders" [disabled]\n  - textbox "Weight": "83.4"';
    expect(observedAria(snapshot)).toEqual([
      { role: "banner", name: "Patient banner" },
      { role: "main", name: "" },
      {
        role: "button",
        name: "Sign orders",
        disabled: true,
        ancestors: ['main ""'],
      },
      { role: "textbox", name: "Weight", ancestors: ['main ""'] },
    ]);
    expect(observedAria(snapshot.replace("[disabled]", ""))).not.toEqual(
      observedAria(snapshot),
    );
    expect(observedAria(snapshot.replace("Weight", "Wrong label"))).not.toEqual(
      observedAria(snapshot),
    );
  });
  it("detects fields moved out of their contracted section even when role order is unchanged", () => {
    const nested = '- main:\n  - region "Vitals":\n    - textbox "Weight"';
    const moved = '- main:\n  - region "Vitals"\n  - textbox "Weight"';
    expect(observedAria(nested)).not.toEqual(observedAria(moved));
  });
  it("rejects malformed or unknown wire constructors offline", () => {
    expect(
      uiScreenSchema.safeParse({
        ...rooming,
        workspace: [{ debug: { json: "bad" } }],
      }).success,
    ).toBe(false);
  });
  it("unknown nodes cannot silently disappear", () => {
    // The exhaustive never branch is also a hard runtime failure for unvalidated data.
    const unknown: UiNode = JSON.parse('{"unknown":{}}');
    expect(() => UiNodeView({ node: unknown, onEvent: () => {} })).toThrow(
      "Unknown semantic UI node",
    );
  });
});
