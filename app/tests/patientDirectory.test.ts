import { expect, it } from "vitest";
import {
  keepFocusedTask,
  selectedRowSource,
} from "../src/data/patientDirectory";
const directory = {
  patients: [],
  activities: [
    {
      info: "unitCensus",
      title: "Unit Census",
      rows: [{ patient: "A", fields: [], source: "Encounter/enc-A" }],
    },
  ],
};
const context = { activity: "unitCensus", query: "" };
it("retains the exact selected row's source encounter", () => {
  expect(
    selectedRowSource(
      directory,
      context,
      { click: { comp: "workspace.open|A|0" } },
      "A",
    ),
  ).toBe("Encounter/enc-A");
});
it("cannot attach another patient's work item or a lookup result to a chart", () => {
  expect(
    selectedRowSource(
      directory,
      context,
      { click: { comp: "workspace.open|B|0" } },
      "B",
    ),
  ).toBeUndefined();
  expect(
    selectedRowSource(
      directory,
      { ...context, query: "A" },
      { click: { comp: "workspace.open|A|0" } },
      "A",
    ),
  ).toBeUndefined();
  expect(
    selectedRowSource(
      directory,
      context,
      { click: { comp: "workspace.open|A|99" } },
      "A",
    ),
  ).toBeUndefined();
});

it("keeps the selected request and other patients' day context without reinterpreting clinical values", () => {
  expect(
    keepFocusedTask(
      { resourceType: "Task", id: "1", for: { reference: "Patient/A" } },
      "Task/1",
      "A",
    ),
  ).toBe(true);
  expect(
    keepFocusedTask(
      { resourceType: "Task", id: "2", for: { reference: "Patient/A" } },
      "Task/1",
      "A",
    ),
  ).toBe(false);
  expect(
    keepFocusedTask(
      { resourceType: "Task", id: "2", for: { reference: "Patient/B" } },
      "Task/1",
      "A",
    ),
  ).toBe(true);
});
