import { expect, it } from "vitest";
import { isCardColumns } from "../src/ehr/ui/layout";
import type { UiNode } from "../src/ehr/ui/types";
const panels = (child: UiNode): UiNode[] =>
  ["Quick View", "Medications", "Results"].map((title) => ({
    section: { id: title, title, children: [child] },
  }));
const summary: UiNode = {
  info: {
    comp: "summary",
    infoId: "patientBanner",
    display: "summary",
    label: "Summary",
    rows: [[["Patient", "Alex Morgan"]]],
  },
};
it("uses card flow for complete read-only sections, preserving the source", () => {
  const nodes = panels(summary),
    before = structuredClone(nodes);
  expect(isCardColumns(nodes)).toBe(true);
  expect(nodes).toEqual(before);
  expect(isCardColumns(nodes.slice(0, 2))).toBe(false);
});
it("keeps field-bearing groups as form grids, including nested wrappers", () => {
  const field: UiNode = {
    field: {
      comp: "dose",
      label: "Dose",
      kind: "quantity",
      value: null,
      unit: "mg",
      provenance: null,
      pendingConfirm: false,
      humanOnly: false,
      required: true,
    },
  };
  expect(
    isCardColumns(
      panels({ presentation: { kind: "table", children: [field] } }),
    ),
  ).toBe(false);
  expect(
    isCardColumns(
      panels({
        valueSet: { options: [], allowCustom: true, children: [field] },
      }),
    ),
  ).toBe(false);
});
it("does not move signing actions or interruptive alerts into a card flow", () => {
  expect(
    isCardColumns(
      panels({
        button: {
          comp: "sign",
          label: "Sign Orders",
          role: "primary",
          enabled: false,
          blockedReason: "Review required",
          hotkey: null,
        },
      }),
    ),
  ).toBe(false);
  expect(
    isCardColumns(
      panels({
        alert: {
          comp: "alert",
          alertId: "allergy",
          label: "Allergy alert",
          severity: "interruptive",
        },
      }),
    ),
  ).toBe(false);
});
