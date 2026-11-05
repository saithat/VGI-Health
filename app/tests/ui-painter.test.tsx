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

it("dispatches the exact Lean component ID from a clinical workflow link", () => {
  const onEvent = vi.fn();
  const value: UiScreen = {
    banner: [
      ["Patient", "Alex Morgan"],
      ["MRN", "123456"],
    ],
    title: "Rooming",
    nav: [["Visit workflow", [["rooming.nav.note", "Visit Note"]]]],
    workspace: [],
    side: [],
    modal: null,
  };
  render(
    <MantineProvider>
      <UiScreenView screen={value} onEvent={onEvent} />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Visit Note" }));
  expect(onEvent).toHaveBeenCalledWith({ click: { comp: "rooming.nav.note" } });
});

it("uses semantic screen identity for scroll lifecycle and omits empty navigation", () => {
  const emit = vi.fn();
  const base: UiScreen = {
    screen: "first-screen",
    banner: [],
    title: "Results",
    nav: [],
    workspace: [],
    side: [],
    modal: null,
  };
  const paint = (model: UiScreen) => (
    <MantineProvider>
      <UiScreenView screen={model} onEvent={emit} />
    </MantineProvider>
  );
  const { rerender, container } = render(paint(base));
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(expectedAria(base).some((item) => item.role === "navigation")).toBe(
    false,
  );
  const scroll = vi.mocked(window.scrollTo);
  scroll.mockClear();
  rerender(paint({ ...base, workspace: [{ text: { s: "Updated result" } }] }));
  expect(scroll).not.toHaveBeenCalled();
  rerender(paint({ ...base, screen: "second-screen" }));
  expect(scroll).toHaveBeenCalledWith(0, 0);
  expect(container.textContent).not.toContain("second-screen");
});

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

it("shows Lean's public prefill source while retaining the raw field and confirm action", () => {
  const emit = vi.fn();
  const source = "Source: Linked entry — Custom entry (finding)";
  const model: UiScreen = {
    banner: [["Patient", "Alex Morgan"]],
    nav: [],
    title: "Rooming",
    side: [],
    modal: null,
    fieldSources: [[field.comp, source]],
    workspace: [
      {
        field: {
          ...field,
          value: "72.0",
          provenance: "linked:customEntry",
          pendingConfirm: true,
        },
      },
      {
        button: {
          comp: field.comp,
          label: "Confirm prefilled value",
          role: "confirm",
          enabled: true,
          blockedReason: null,
          hotkey: null,
        },
      },
    ],
  };
  const original = JSON.stringify(model);
  expect(uiScreenSchema.parse(model).fieldSources).toEqual(model.fieldSources);
  render(
    <MantineProvider>
      <UiScreenView screen={model} onEvent={emit} />
    </MantineProvider>,
  );
  expect(screen.getByText(source)).not.toBeNull();
  expect(
    screen.getByRole("textbox", { name: field.label, description: source }),
  ).not.toBeNull();
  expect(screen.queryByText("linked:customEntry")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Confirm prefilled value",
    }),
  );
  expect(emit.mock.calls).toEqual([[{ confirm: { comp: field.comp } }]]);
  expect(JSON.stringify(model)).toBe(original);
});

it("paints a semantic narrative editor and dispatches its complete multiline text", () => {
  const onEvent = vi.fn();
  render(
    <MantineProvider>
      <UiNodeView
        node={{ field: { ...field, kind: "textarea", label: "HPI" } }}
        onEvent={onEvent}
      />
    </MantineProvider>,
  );
  const editor = screen.getByRole("textbox", { name: "HPI" });
  expect(editor.tagName).toBe("TEXTAREA");
  fireEvent.change(editor, {
    target: { value: "First paragraph.\nSecond paragraph." },
  });
  expect(onEvent).toHaveBeenCalledWith({
    enter: {
      comp: field.comp,
      value: { text: { s: "First paragraph.\nSecond paragraph." } },
    },
  });
});
it("keeps plain text values and confirmation events in a wrapping textbox", () => {
  const onEvent = vi.fn();
  const value = "Called patient; arranged emergency evaluation";
  const model = { ...field, value, pendingConfirm: true };
  const paint = (value: string) => (
    <MantineProvider>
      <UiNodeView node={{ field: { ...model, value } }} onEvent={onEvent} />
    </MantineProvider>
  );
  const { rerender } = render(paint(value));
  const editor = screen.getByRole("textbox", { name: field.label });
  if (!(editor instanceof HTMLTextAreaElement)) throw new Error("Expected a wrapping textbox");
  expect(editor.value).toBe(value);
  expect(editor.rows).toBe(1);
  expect(editor.wrap).toBe("soft");
  const edited = `${value}; reviewed follow-up plan`;
  fireEvent.change(editor, { target: { value: edited } });
  expect(onEvent).toHaveBeenLastCalledWith({
    enter: { comp: field.comp, value: { text: { s: edited } } },
  });
  rerender(paint(edited));
  expect(screen.getByRole("textbox", { name: field.label })).toBe(editor);
  expect(editor.value).toBe(edited);
  fireEvent.click(screen.getByRole("button", { name: `Confirm ${field.label}` }));
  expect(onEvent).toHaveBeenLastCalledWith({ confirm: { comp: field.comp } });
});

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
  it("searches Lean procedure descriptions and emits the selected raw code", () => {
    const onEvent = vi.fn();
    const view = uiScreenSchema.parse({
      ...rooming,
      nav: [],
      side: [],
      workspace: [
        {
          field: {
            ...field,
            comp: "procedure",
            label: "Procedure (CPT)",
            kind: "code",
          },
        },
      ],
      fieldChoices: [
        [
          "procedure",
          {
            options: [
              ["44970", "Laparoscopic appendectomy"],
              ["47562", "Laparoscopic cholecystectomy"],
            ],
            showCode: true,
            allowOther: true,
          },
        ],
      ],
    });
    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView screen={view} onEvent={onEvent} />
      </MantineProvider>,
    );
    const input = screen.getByRole("combobox", { name: "Procedure (CPT)" });
    fireEvent.input(input, { target: { value: "cholecystectomy" } });
    expect(onEvent).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("option", {
        name: "Laparoscopic cholecystectomy (47562)",
      }),
    );
    expect(onEvent).toHaveBeenCalledWith({
      enter: { comp: "procedure", value: { code: { c: "47562" } } },
    });
  });
  it("retains manual code entry beyond the department quick picks", () => {
    const onEvent = vi.fn();
    const view = uiScreenSchema.parse({
      ...rooming,
      nav: [],
      side: [],
      workspace: [
        {
          field: {
            ...field,
            comp: "diagnosis",
            label: "Diagnosis",
            kind: "code",
          },
        },
      ],
      fieldChoices: [
        [
          "diagnosis",
          {
            options: [["K35.80", "Acute appendicitis, unspecified"]],
            showCode: true,
            allowOther: true,
          },
        ],
      ],
    });
    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView screen={view} onEvent={onEvent} />
      </MantineProvider>,
    );
    fireEvent.input(screen.getByRole("combobox", { name: "Diagnosis" }), {
      target: { value: "R10.84" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Use code: R10.84" }));
    expect(onEvent).toHaveBeenCalledWith({
      enter: { comp: "diagnosis", value: { code: { c: "R10.84" } } },
    });
  });
  it("displays local labels without turning a supplied macro value into human entry", () => {
    const onEvent = vi.fn();
    const view = uiScreenSchema.parse({
      ...rooming,
      nav: [],
      side: [],
      workspace: [
        {
          field: {
            ...field,
            comp: "prn",
            label: "As needed",
            kind: "code",
            value: "true",
            provenance: "macro",

            pendingConfirm: true,
          },
        },
      ],
      fieldChoices: [
        [
          "prn",
          {
            options: [
              ["true", "Yes"],
              ["false", "No"],
            ],
            showCode: false,
            allowOther: true,
          },
        ],
      ],
    });
    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView screen={view} onEvent={onEvent} />
      </MantineProvider>,
    );
    const input = screen.getByRole("combobox", { name: "As needed" });
    if (!(input instanceof HTMLInputElement))
      throw new Error("Expected code input");
    expect(input.value).toBe("Yes");
    expect(onEvent).not.toHaveBeenCalled();
    fireEvent.click(input);
    fireEvent.click(screen.getByRole("option", { name: /^No$/ }));
    expect(onEvent).toHaveBeenCalledWith({
      enter: { comp: "prn", value: { code: { c: "false" } } },
    });
  });
  it("shows the clinical role supplied by Lean in the banner", () => {
    const view = uiScreenSchema.parse({
      ...rooming,
      viewer: "General surgeon",
    });
    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView screen={view} onEvent={vi.fn()} />
      </MantineProvider>,
    );
    expect(screen.getByRole("banner").textContent).toContain("General surgeon");
  });
  it("keeps a recorded pounds hint separate from the blank kg entry and submits kg", () => {
    const view = uiScreenSchema.parse(rooming);
    const onEvent = vi.fn();

    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView
          screen={{
            ...view,
            entryHints: [
              ["weight", "Recorded value: 160 lb. Enter the weight in kg."],
            ],
            workspace: [
              {
                field: {
                  ...field,
                  comp: "weight",
                  label: "Weight",
                  kind: "qty",
                  unit: "kg",
                  value: null,
                },
              },
            ],
          }}
          onEvent={onEvent}
        />
      </MantineProvider>,
    );
    expect(onEvent).not.toHaveBeenCalled();
    expect(
      screen.getByText("Recorded value: 160 lb. Enter the weight in kg."),
    ).toBeTruthy();
    const input = screen.getByRole("textbox", { name: "Weight" });
    if (!(input instanceof HTMLInputElement))
      throw new Error("Expected a weight input");
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "80" } });
    expect(onEvent).toHaveBeenCalledWith({
      enter: { comp: "weight", value: { qty: { tenths: 800, unit: "kg" } } },
    });
  });
  it("paints Lean's source label while retaining the original field and confirm action", () => {
    const view = uiScreenSchema.parse(rooming);
    const onEvent = vi.fn();
    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView
          screen={{
            ...view,
            sourceLabels: [
              ["record:internalSource", "From chart — Recorded weight"],
            ],
            workspace: [
              {
                field: {
                  ...field,
                  provenance: "record:internalSource",
                  pendingConfirm: true,
                },
              },
            ],
          }}
          onEvent={onEvent}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("From chart — Recorded weight")).toBeTruthy();
    expect(screen.queryByText("record:internalSource")).toBeNull();
    expect(screen.queryByText("Active encounter")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Clinical value" }),
    );
    expect(onEvent).toHaveBeenCalledWith({ confirm: { comp: field.comp } });
  });
  it("dispatches the component IDs declared by Lean navigation", () => {
    const onEvent = vi.fn();
    const view = uiScreenSchema.parse(rooming);
    render(
      <MantineProvider theme={clinicalTheme}>
        <UiScreenView
          screen={{
            ...view,
            nav: [["Surgical workflow", [["case.open", "Open case"]]]],
            activeNav: "case.open",
          }}
          onEvent={onEvent}
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Open case$/ }));
    expect(onEvent).toHaveBeenCalledWith({ click: { comp: "case.open" } });
    expect(
      screen
        .getByRole("button", { name: /^Open case$/ })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("list", { name: "Surgical workflow screens" }),
    ).toBeTruthy();
  });
  it("preserves multiline narrative as an ordinary human text entry", () => {
    const onEvent = vi.fn();
    paint(
      [{ field: { ...field, kind: "textarea", humanOnly: true } }],
      onEvent,
    );
    const input = screen.getByRole("textbox", { name: "Clinical value" });
    expect(input.tagName).toBe("TEXTAREA");
    fireEvent.change(input, {
      target: { value: "Findings:\nInflamed appendix." },
    });
    expect(onEvent).toHaveBeenCalledWith({
      enter: {
        comp: "entry",
        value: { text: { s: "Findings:\nInflamed appendix." } },
      },
    });
    expect(screen.getByLabelText("Clinician entry required")).toBeTruthy();
  });
  it("keeps imported chart provenance accessible while presenting medication and note cards", () => {
    paint([
      {
        info: {
          comp: "",
          infoId: "importedHistory",
          label: "Home medications (reported)",
          display: "list",
          rows: [
            [
              ["Kind", "Home medications (reported)"],
              ["Item", "Propylthiouracil"],
              [
                "Detail",
                "Reported home medication; 100 mg PO TID; date: Unknown",
              ],
              ["Status", "active"],
              ["Source", "MedicationStatement (reported history); Unknown"],
            ],
          ],
        },
      },
      {
        info: {
          comp: "notes",
          infoId: "priorNotes",
          label: "Prior notes",
          display: "list",
          rows: [
            [
              ["Date", "2026-10-31"],
              ["Type", "Progress note"],
              ["Author", "Dr. Smith"],
              ["Title", "Clinic follow-up"],
              ["Text", "Symptoms improved.\nContinue the documented plan."],
              ["Status", "final"],
              ["Source date", "2026-10-01"],
              ["Shift days", "30"],
            ],
          ],
        },
      },
    ]);
    const medications = screen.getByRole("list", {
      name: "Home medications (reported)",
    });
    expect(medications.textContent).toContain(
      "Propylthiouracil: 100 mg PO TIDreportedactive",
    );
    expect(medications.textContent).not.toContain("Unknown");
    expect(
      medications.querySelector("li")?.getAttribute("aria-label"),
    ).toContain("MedicationStatement (reported history); Unknown");
    const notes = screen.getByRole("list", { name: "Prior notes" });
    expect(notes.textContent).toContain("Symptoms improved.");
    expect(notes.querySelector("li")?.getAttribute("aria-label")).toContain(
      "Source date: 2026-10-01",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("dispatches exported nav component IDs and omits empty groups", () => {
    const emit = vi.fn();
    const model: UiScreen = {
      banner: [],
      title: "Chart",
      nav: [
        ["Workflow", [["actual.goto.component", "Open rooming"]]],
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
    fireEvent.click(screen.getByRole("button", { name: "Open rooming" }));
    expect(emit.mock.calls).toEqual([
      [{ click: { comp: "actual.goto.component" } }],
    ]);
    expect(screen.queryByText("Empty group")).toBeNull();
    expect(screen.getByRole("heading", { name: "Workflow" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Workflow" })).toBeNull();
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
    expect(screen.getByRole("img", { name: "trend: trend" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "trend" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Clinical value" }),
    ).toBeTruthy();
    expect(screen.getByRole("note", { name: "Allergies" })).toBeTruthy();
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
      "Status: Active",
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
    expect(formatDisplayValue(stamp)).toBe("10/31/2026 0914");
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
  it("styles supplied medication statuses and alert tiers without changing their text", () => {
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
      "yellow",
      "red",
      "green",
      "yellow",
      "violet",
      "gray",
      "gray",
    ]);
    expect(statusTone("unknown")).toBeUndefined();
    expect(statusTone("active")).toBeUndefined();
    expect(statusTone("Signed 09:32")).toBe("green");
    expect(statusTone("Reviewed 09:14")).toBe("green");
    expect(statusTone("Needs confirmation")).toBe("yellow");
    expect(statusTone("Unsigned")).toBe("yellow");
    expect(statusTone("In progress")).toBe("blue");
    expect(["interruptive", "passive", "removable"].map(severityTone)).toEqual([
      "red",
      "yellow",
      "yellow",
    ]);
    expect(severityTone("severe")).toBe("red");
    expect(severityTone("warning")).toBe("orange");
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
    ["qty", "180", "mcg", { qty: { tenths: 1800, unit: "mcg" } }],
    ["qty", "5000", "units", { qty: { tenths: 50000, unit: "units" } }],
  ] as const)(
    "maps %s values to the exact Lean constructor",
    (kind, raw, unit, expected) => {
      expect(entryEvent({ ...field, kind, unit }, raw)).toEqual({
        enter: { comp: "entry", value: expected },
      });
    },
  );
  it("refuses invalid quantities and addresses search entry by component", () => {
    for (const value of ["", "-1", "abc", "Infinity"])
      expect(
        entryEvent({ ...field, kind: "qty", unit: "kg" }, value),
      ).toBeUndefined();
    expect(
      entryEvent({ ...field, kind: "qty", unit: "bogus" }, "5"),
    ).toBeUndefined();
    expect(entryEvent({ ...field, kind: "search" }, "metformin")).toEqual({
      enter: { comp: "entry", value: { text: { s: "metformin" } } },
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
  it("keeps raw medication choices in events while showing cleaned clinical captions", () => {
    const emit = vi.fn();
    const raw = "Amoxicillin 250 MG Oral Capsule";
    const model: UiNode = {
      field: {
        ...field,
        comp: "drug",
        label: "Enter Medication",
        kind: `code:${raw}`,
        value: null,
      },
    };
    const original = JSON.stringify(model);
    paint([model], emit);
    const medication = screen.getByRole("combobox", {
      name: "Enter Medication",
    });
    expect(medication.getAttribute("placeholder")).toBe("Search medications");
    expect(screen.getByText("Medication")).toBeTruthy();
    fireEvent.click(medication);
    fireEvent.click(
      screen.getByRole("option", { name: "Amoxicillin 250 mg oral capsule" }),
    );
    expect(emit.mock.calls).toEqual([
      [{ enter: { comp: "drug", value: { code: { c: raw } } } }],
    ]);
    expect(JSON.stringify(model)).toBe(original);
  });
  it("groups adjacent navigation controls without changing their order, identity or events", () => {
    const emit = vi.fn();
    const controls = ["Back", "Patient workspace", "Review and sign"].map(
      (label, index) => ({
        button: { ...button, comp: `nav-${index}`, role: "nav", label },
      }),
    );
    const { container } = paint(controls, emit);
    expect(container.querySelectorAll(".clinical-navigation-bar")).toHaveLength(
      1,
    );
    expect(
      Array.from(container.querySelectorAll("[data-comp-id]")).map((node) =>
        node.getAttribute("data-comp-id"),
      ),
    ).toEqual(["nav-0", "nav-1", "nav-2"]);
    controls.forEach(({ button }) =>
      fireEvent.click(screen.getByRole("button", { name: button.label })),
    );
    expect(emit.mock.calls.map(([event]) => event)).toEqual(
      controls.map(({ button }) => ({ click: { comp: button.comp } })),
    );
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
  it("shows the encounter-role refusal on the disabled signing action", () => {
    const reason = "Pre-op orders are signed by a physician or surgeon";
    const onEvent = vi.fn();
    paint(
      [
        {
          button: {
            ...button,
            comp: "signOrders",
            label: "Sign orders",
            role: "primary",
            enabled: false,
            blockedReason: reason,
          },
        },
      ],
      onEvent,
    );
    const action = screen.getByRole("button", { name: "Sign orders" });
    expect(action.getAttribute("disabled")).not.toBeNull();
    expect(action.getAttribute("title")).toBe(reason);
    expect(screen.getByText(reason)).toBeTruthy();
    fireEvent.click(action);
    expect(onEvent).not.toHaveBeenCalled();
  });

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
    expect(screen.getAllByLabelText("Clinician entry required")).toHaveLength(
      3,
    );
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

it("shows Lean's code labels and sends only the selected source code", () => {
  const emit = vi.fn();
  paint(
    [
      {
        valueSet: {
          options: [
            { code: "PO", label: "Oral (PO)" },
            { code: "IV", label: "Intravenous (IV)" },
          ],
          allowCustom: true,
          children: [
            { field: { ...field, kind: "code", label: "Route", value: "PO" } },
          ],
        },
      },
    ],
    emit,
  );
  expect(emit).not.toHaveBeenCalled();
  const input = screen.getByRole("combobox", { name: "Route" });
  if (!(input instanceof HTMLInputElement))
    throw new Error("Expected a code input");
  expect(input.value).toBe("Oral (PO)");
  fireEvent.click(input);
  fireEvent.click(screen.getByRole("option", { name: "Intravenous (IV)" }));
  expect(emit).toHaveBeenCalledExactlyOnceWith({
    enter: { comp: "entry", value: { code: { c: "IV" } } },
  });
});

it("requires explicit selection of an unlisted code and preserves a sibling confirmation", () => {
  const emit = vi.fn();
  const model: UiNode[] = [
    {
      valueSet: {
        options: [{ code: "I10", label: "I10 — Essential hypertension" }],
        allowCustom: true,
        children: [
          {
            field: {
              ...field,
              kind: "code",
              label: "Diagnosis",
              value: "I10",
              pendingConfirm: true,
              humanOnly: true,
            },
          },
        ],
      },
    },
    {
      button: {
        comp: "entry",
        label: "Confirm prefilled value",
        role: "confirm",
        enabled: true,
        blockedReason: null,
        hotkey: null,
      },
    },
  ];
  paint(model, emit);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  const input = screen.getByRole("combobox", { name: "Diagnosis" });
  fireEvent.click(input);
  fireEvent.input(input, { target: { value: "Z99.89" } });
  expect(emit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("option", { name: "Use code: Z99.89" }));
  expect(emit).toHaveBeenCalledExactlyOnceWith({
    enter: { comp: "entry", value: { code: { c: "Z99.89" } } },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm prefilled value" }),
  );
  expect(emit).toHaveBeenLastCalledWith({ confirm: { comp: "entry" } });
});

it("keeps reference populations separate and retains every patient measurement", () => {
  const references = ["WHO infant reference", "CDC child reference"].flatMap(
    (source, n) =>
      ["5th", "50th", "95th"].map((percentile, p) => {
        const points: [number, number][] = [
          [n * 240, 300 + p * 100],
          [n * 240 + 120, 500 + p * 100],
        ];
        return {
          measure: "Weight",
          unit: "kg",
          percentile,
          source,
          population: "Boys",
          points,
        };
      }),
  );
  const { container } = paint([
    {
      chartReferences: {
        references,
        children: [
          {
            presentation: {
              kind: "growth",
              children: [
                {
                  info: {
                    comp: "growth",
                    label: "Growth measurements",
                    infoId: "growthChart",
                    display: "trend",
                    rows: [
                      [
                        ["Date", "Jan 1, 2026"],
                        ["Age (months)", "0"],
                        ["Weight (kg)", "3.6"],
                      ],
                      [
                        ["Date", "Jan 1, 2027"],
                        ["Age (months)", "12"],
                        ["Weight (kg)", "6.0"],
                      ],
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
  expect(container.querySelectorAll(".chart-reference")).toHaveLength(6);
  expect(container.querySelectorAll(".chart-reference-band")).toHaveLength(2);
  expect(container.querySelectorAll(".chart-patient-point")).toHaveLength(2);
  expect(
    screen.getByRole("table", { name: "Growth measurements" }).textContent,
  ).toContain("3.6");
  expect(
    screen.getByRole("table", { name: "Growth measurements" }).textContent,
  ).toContain("6.0");
  expect(
    container.querySelector(".presentation-chart-source")?.textContent,
  ).toContain("WHO infant reference · Boys");
  expect(
    container.querySelector(".presentation-chart-source")?.textContent,
  ).toContain("CDC child reference · Boys");
});

it("paints Lean review feedback as read-only status and retains supplied detail", () => {
  const event = vi.fn();
  const { container } = paint(
    [
      {
        info: {
          comp: "",
          label: "Review recorded: Allergies",
          infoId: "reviewReceiptStatus",
          display: "status",
          rows: [[["Reviewed", "Current record"]]],
        },
      },
    ],
    event,
  );
  expect(
    screen.getByRole("status", { name: "Review recorded: Allergies" })
      .textContent,
  ).toContain("Current record");
  expect(container.querySelector("button,input")).toBeNull();
  expect(event).not.toHaveBeenCalled();
  expect(
    expectedAria({
      ...uiScreenSchema.parse(rooming),
      workspace: [
        {
          info: {
            comp: "",
            label: "Review recorded: Allergies",
            infoId: "reviewReceiptStatus",
            display: "status",
            rows: [],
          },
        },
      ],
      side: [],
      nav: [],
    }),
  ).toContainEqual({
    role: "status",
    name: "Review recorded: Allergies",
    ancestors: ['main ""'],
  });
});

it("retains clinical note bodies verbatim in ordinary and structured notes", () => {
  const body =
    "Narrative retains the phrase (disorder), (organism) and (substance).\nDirections quoted: 1, 1x per 1 d.\nLine three.";
  const { container } = paint([
    {
      info: {
        comp: "plain-note",
        label: "Draft review",
        infoId: "noteSummary",
        display: "list",
        rows: [
          [
            ["Title", "Visit note"],
            ["Text", body],
          ],
        ],
      },
    },
    {
      presentation: {
        kind: "notes",
        children: [
          {
            info: {
              comp: "typed-note",
              label: "Chart notes",
              infoId: "encounterNotes",
              display: "list",
              rows: [
                [
                  ["Title", "Clinical note"],
                  ["Text", body],
                ],
              ],
            },
          },
        ],
      },
    },
  ]);
  for (const id of ["noteSummary", "encounterNotes"])
    expect(
      container.querySelector(`[data-info-id="${id}"]`)?.textContent,
    ).toContain(body);
});

it("draws supplied documentation verbatim in a read-only keyboard-scrollable region", () => {
  const event = vi.fn();
  const body =
    "Current visit narrative (disorder).\nQuoted direction: 1, 1x per 1 d.\nKeep the line breaks.";
  const { container } = paint(
    [
      {
        info: {
          comp: "visit-note",
          label: "Visit note review",
          infoId: "noteSummary",
          display: "document",
          rows: [
            [
              ["Section", "History of present illness"],
              ["Text", body],
              ["Entry status", "Needs confirmation"],
            ],
          ],
        },
      },
    ],
    event,
  );
  const document = screen.getByRole("region", { name: "Visit note review" });
  expect(document.textContent).toContain(body);
  expect(document.textContent).toContain("Needs confirmation");
  expect(document.tabIndex).toBe(0);
  expect(container.querySelector("button,input,textarea")).toBeNull();
  expect(event).not.toHaveBeenCalled();
});
it("retains source row actions inline when their target is a read-only document", () => {
  const event = vi.fn();
  paint(
    [
      {
        presentation: {
          kind: "table",
          children: [
            {
              info: {
                comp: "document-target",
                label: "Visit documentation",
                infoId: "noteSummary",
                display: "document",
                rows: [
                  [
                    ["Section", "History"],
                    ["Text", "Entered documentation"],
                  ],
                ],
              },
            },
            {
              rowAction: {
                target: "document-target",
                row: 0,
                children: [
                  {
                    button: {
                      comp: "continue-review",
                      label: "Continue chart review",
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
    event,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Continue chart review" }),
  );
  expect(event).toHaveBeenCalledWith({ click: { comp: "continue-review" } });
  expect(
    screen.getByRole("region", { name: "Visit documentation" }).textContent,
  ).toContain("Entered documentation");
});

it("combines surgical favorites with shared value-set, source and confirmation metadata", () => {
  const emit = vi.fn();
  const model: UiScreen = {
    banner: [["Patient", "Alex Morgan"]],
    viewer: "Dr. Morgan Rivera · General surgeon",
    title: "Assessment & Plan",
    nav: [],
    side: [],
    modal: null,
    sourceLabels: [["record:diagnosis", "Older source caption"]],
    fieldSources: [[field.comp, "Source: Chart diagnosis"]],
    fieldChoices: [
      [
        field.comp,
        {
          options: [
            ["K80.20", "Gallbladder stones"],
            ["K40.90", "Inguinal hernia"],
          ],
          showCode: true,
          allowOther: true,
        },
      ],
    ],
    workspace: [
      {
        valueSet: {
          options: [{ code: "I10", label: "Primary hypertension" }],
          allowCustom: true,
          children: [
            {
              field: {
                ...field,
                label: "Diagnosis",
                kind: "code",
                value: "K80.20",
                provenance: "record:diagnosis",
                pendingConfirm: true,
                humanOnly: true,
              },
            },
          ],
        },
      },
      {
        button: {
          comp: field.comp,
          label: "Confirm chart diagnosis",
          role: "confirm",
          enabled: true,
          blockedReason: null,
          hotkey: null,
        },
      },
    ],
  };
  expect(uiScreenSchema.parse(model)).toEqual(model);
  render(
    <MantineProvider>
      <UiScreenView screen={model} onEvent={emit} />
    </MantineProvider>,
  );
  expect(screen.getByText("Source: Chart diagnosis")).not.toBeNull();
  expect(screen.queryByText("Older source caption")).toBeNull();
  expect(screen.getAllByRole("button")).toHaveLength(1);
  const input = screen.getByRole("combobox", { name: "Diagnosis" });
  fireEvent.click(input);
  expect(
    screen.queryByRole("option", { name: "Primary hypertension" }),
  ).toBeNull();
  fireEvent.input(input, { target: { value: "hernia" } });
  expect(emit).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("option", { name: "Inguinal hernia (K40.90)" }),
  );
  expect(emit).toHaveBeenCalledExactlyOnceWith({
    enter: { comp: field.comp, value: { code: { c: "K40.90" } } },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm chart diagnosis" }),
  );
  expect(emit).toHaveBeenLastCalledWith({ confirm: { comp: field.comp } });
});

it("keeps multiline narrative entry and prefill confirmation as separate human events", () => {
  const emit = vi.fn();
  paint(
    [
      {
        field: {
          ...field,
          kind: "textarea",
          provenance: "record:noteSource",
          pendingConfirm: true,
        },
      },
    ],
    emit,
  );
  const input = screen.getByRole("textbox", { name: "Clinical value" });
  expect(input.tagName).toBe("TEXTAREA");
  fireEvent.change(input, {
    target: { value: "History line one\nHistory line two" },
  });
  expect(emit).toHaveBeenLastCalledWith({
    enter: {
      comp: "entry",
      value: { text: { s: "History line one\nHistory line two" } },
    },
  });
  expect(screen.getByText("From chart")).toBeTruthy();
  expect(screen.queryByText("record:noteSource")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm Clinical value" }),
  );
  expect(emit).toHaveBeenLastCalledWith({ confirm: { comp: "entry" } });
});
it("draws each semantic workflow destination as its exact declared click", () => {
  const emit = vi.fn();
  render(
    <MantineProvider theme={clinicalTheme}>
      <UiScreenView
        screen={{
          ...uiScreenSchema.parse(rooming),
          nav: [["ED workflow", [["visit.to.orders", "Orders"]]]],
          workspace: [],
          side: [],
          modal: null,
        }}
        onEvent={emit}
      />
    </MantineProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Orders" }));
  expect(emit).toHaveBeenLastCalledWith({
    click: { comp: "visit.to.orders" },
  });
  expect(screen.queryByRole("button", { name: "ED workflow" })).toBeNull();
});

it("timeline forwards exact child events and retains complete source cells", async () => {
  const model = uiScreenSchema.parse((await import("../src/fixtures/ui/semantic-timeline.json")).default);
  const emit = vi.fn();
  render(<MantineProvider><UiScreenView screen={model} onEvent={emit} /></MantineProvider>);
  expect(screen.getByRole("list", { name: "Clinical timeline events" }).textContent).toContain("Rash");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(emit).toHaveBeenCalledExactlyOnceWith({ click: { comp: "next" } });
  const sign = screen.getByRole("button", { name: "Sign" });
  if (!(sign instanceof HTMLButtonElement)) throw new Error("Sign must be a native button");

  expect(sign.disabled).toBe(true);
});

it("timeline retains sibling confirmation identity without synthesizing a second control", () => {
  const emit = vi.fn();
  const node: UiNode = { timeline: { title: "Confirm review", children: [
    { field: { ...field, comp: "weight", label: "Weight", pendingConfirm: true } },
    { button: { comp: "weight", label: "Confirm prefilled value", role: "confirm", enabled: true, blockedReason: null, hotkey: null } },
  ] } };
  render(<MantineProvider><UiNodeView node={node} onEvent={emit} /></MantineProvider>);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Confirm prefilled value" }));
  expect(emit).toHaveBeenCalledExactlyOnceWith({ confirm: { comp: "weight" } });
});

it("scopes compact IDs to their patient pane and preserves strict wire validation", () => {
  const base = uiScreenSchema.parse(rooming);
  const pane = (patient: string, compact?: string[]): UiNode => ({
    patientPane: {
      patient,
      banner: [["Patient", patient]],
      metadata: {
        sourceLabels: [],
        fieldSources: [],
        entryHints: [],
        fieldChoices: [],
        ...(compact ? { compact } : {}),
      },
      children: [
        {
          field: {
            comp: "shared-dose",
            label: "Dose",
            kind: "text",
            value: null,
            unit: null,
            provenance: null,
            pendingConfirm: false,
            humanOnly: false,
            required: false,
          },
        },
      ],
      modal: [],
    },
  });
  const model = uiScreenSchema.parse({
    ...base,
    side: [],
    nav: [],
    workspace: [
      {
        board: {
          urgent: [],
          children: [pane("A", ["shared-dose"]), pane("B")],
        },
      },
    ],
  });
  const { container } = render(
    <MantineProvider>
      <UiScreenView screen={model} onEvent={() => {}} />
    </MantineProvider>,
  );
  expect(
    container
      .querySelector('[data-patient="A"] .clinical-field')
      ?.getAttribute("data-density"),
  ).toBe("compact");
  expect(
    container
      .querySelector('[data-patient="B"] .clinical-field')
      ?.hasAttribute("data-density"),
  ).toBe(false);
  expect(uiScreenSchema.safeParse({ ...base, compact: [17] }).success).toBe(
    false,
  );
  expect(
    uiScreenSchema.safeParse({ ...base, compact: ["x"], unknownDensity: true })
      .success,
  ).toBe(false);
});
