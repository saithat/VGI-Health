import { describe, expect, it } from "vitest";
import {
  ageSex,
  clinicalDuration,
  clinicalName,
  clinicalStatus,
  clinicalTime,
  clinicalUnit,
  controlCaption,
  displayRows,
  encounterClass,
  internalSource,
  observationValue,
  resultTone,
  vitalCaption,
} from "../src/ehr/ui/clinical-formatters";
import { fieldCaption } from "../src/ehr/ui/clinical-display";
import type { Pair } from "../src/ehr/ui/types";

describe("read-only clinical display projections", () => {
  it("shortens known terms without truncating unknown tests or narratives", () => {
    expect(clinicalName("Hemoglobin [Mass/volume] in Blood")).toBe(
      "Hemoglobin",
    );
    expect(
      clinicalName(
        "Natriuretic peptide.B prohormone N-Terminal [Mass/volume] in Serum or Plasma",
      ),
    ).toBe("NT-proBNP");
    expect(
      clinicalName(
        "Pain severity - 0-10 verbal numeric rating [Score] - Reported",
      ),
    ).toBe("Pain score");
    expect(clinicalName("Hemoglobin A1c/Hemoglobin.total in Blood")).toBe(
      "Hemoglobin A1c/Hemoglobin.total in Blood",
    );
    expect(
      clinicalName("Hemoglobin [Mass/volume] in Blood was discussed"),
    ).toBe("Hemoglobin [Mass/volume] in Blood was discussed");
    expect(fieldCaption("Diagnosis (ICD-10-CM)")).toBe("Diagnosis");
    expect(fieldCaption("Test (LOINC)")).toBe("Test");
  });
  it("maps only supplied states, classes and age/sex", () => {
    expect(clinicalStatus("booked")).toBe("Scheduled");
    expect(clinicalStatus("active")).toBe("Active");
    expect(clinicalStatus("requested")).toBe("Pending");
    expect(clinicalStatus("preliminary")).toBe("Prelim");
    expect(clinicalStatus("Not yet final")).toBe("Not yet final");
    expect(encounterClass("AMB")).toBe("Office Visit");
    expect(encounterClass("EMER")).toBe("Emergency");
    expect(encounterClass("IMP")).toBe("Inpatient");
    expect(encounterClass("OBSENC")).toBe("OBSENC");
    expect(ageSex("83 / F")).toBe("83 y.o. F");
    expect(ageSex("Unknown / F")).toBe("Unknown / F");
  });
  it("preserves wall time and leaves invalid or narrative dates untouched", () => {
    expect(clinicalTime("2026-11-02T06:00:18-08:00")).toBe("11/02 0600");
    expect(clinicalTime("2026-11-02 -08:00")).toBe("11/02");
    expect(clinicalTime("2026-11-02 06:00 -08:00")).toBe("11/02 0600");
    expect(clinicalTime("2026-11-01T01:30:00-07:00")).toBe("11/01 0130");
    expect(clinicalTime("2026-11-01T01:30:00-08:00")).toBe("11/01 0130");
    for (const raw of [
      "2026-02-29",
      "2026-11-02T25:00:00Z",
      "2026-11-02T06:00:00+99:00",
      "Seen 2026-11-02",
      "02:18",
    ])
      expect(clinicalTime(raw)).toBe(raw);
    expect(clinicalDuration("165 min")).toBe("2h 45m");
    expect(clinicalDuration("120 min")).toBe("2h");
    expect(clinicalDuration("15 min")).toBe("15m");
    expect(clinicalDuration("every 165 min")).toBe("every 165 min");
  });
  it("normalizes read-only units/precision without inventing thresholds", () => {
    expect(clinicalUnit("mm[Hg]")).toBe("mmHg");
    expect(clinicalUnit("{score}")).toBe("score");
    expect(observationValue("13.777")).toBe("13.78");
    expect(observationValue("1.005")).toBe("1.01");
    expect(observationValue("0.0123")).toBe("0.0123");
    for (const raw of ["<0.005", "0.00012", "13.777 mg", "136/82", "—"])
      expect(observationValue(raw)).toBe(raw);
    expect(resultTone("H")).toBe("high");
    expect(resultTone("L")).toBe("low");
    expect(resultTone("HH")).toBe("critical");
    expect(resultTone("13.777")).toBeUndefined();
  });
  const row = (
    name: string,
    value: string,
    time = "2026-11-02T06:00:00-08:00",
    unit = "mm[Hg]",
  ): Pair[] => [
    ["Measure", name],
    ["Value", value],
    ["Unit", unit],
    ["Recorded", time],
  ];
  it("pairs BP in either source order while retaining every original row and value", () => {
    const sys = row("Systolic BP", "136"),
      dia = row("Diastolic BP", "82");
    for (const rows of [
      [sys, dia],
      [dia, sys],
    ]) {
      const frozen = JSON.stringify(rows);
      const result = displayRows(rows);
      expect(result).toHaveLength(1);
      expect(result[0]?.cells).toEqual(row("BP", "136/82"));
      expect(result[0]?.source).toEqual([sys, dia]);
      const first = result[0];
      if (!first) throw new Error("Missing paired BP");
      expect(vitalCaption(first.cells)).toBe(
        "BP 136/82 mmHg · 11/02/2026 0600",
      );
      expect(JSON.stringify(rows)).toBe(frozen);
    }
  });
  it("does not pair ambiguous, differently timed, differently unitized or action-bound BP rows", () => {
    const sys = row("Systolic BP", "136");
    const dia = row("Diastolic BP", "82");
    for (const rows of [
      [sys, dia, dia],
      [sys, dia, sys],
      [sys, row("Diastolic BP", "82", "2026-11-02T07:00:00-08:00")],
      [sys, row("Diastolic BP", "82", undefined, "kPa")],
      [sys, row("Diastolic BP", "<82")],
    ])
      expect(displayRows(rows)).toHaveLength(rows.length);
    expect(displayRows([sys, dia], false)).toHaveLength(2);
    expect(
      vitalCaption([...sys, ["Comment", "repeat after rest"]]),
    ).toBeUndefined();
  });
  it("pairs explicitly aligned flowsheet columns without rewriting their source keys", () => {
    const time = "2026-11-02 06:00 -08:00";
    const rows: Pair[][] = [
      [
        ["Measure", "Systolic BP"],
        ["Unit", "mmHg"],
        [time, "136"],
      ],
      [
        ["Measure", "Diastolic BP"],
        ["Unit", "mmHg"],
        [time, "82"],
      ],
    ];
    expect(displayRows(rows)[0]?.cells).toEqual([
      ["Measure", "BP"],
      ["Unit", "mmHg"],
      [time, "136/82"],
    ]);
  });
  it("compacts internal captions while keeping public source text unchanged", () => {
    expect(controlCaption("Request authorization (human entry)")).toBe(
      "Request authorization",
    );
    expect(controlCaption("Confirm prefilled value")).toBe("Confirm");
    expect(controlCaption("Template: Brief op note")).toBe("Brief op note");
    expect(internalSource("Referenced prescription")).toBe(true);
    expect(internalSource("Patient-reported medication history")).toBe(false);
  });
});

it("retains empty and partially recorded BP time cells without supplying a reading", () => {
  const time = "2026-11-02 06:00 -08:00",
    later = "2026-11-02 07:00 -08:00";
  const rows: Pair[][] = [
    [
      ["Measure", "Systolic BP"],
      ["Unit", "mmHg"],
      [time, "136"],
      [later, ""],
    ],
    [
      ["Measure", "Diastolic BP"],
      ["Unit", "mmHg"],
      [time, ""],
      [later, ""],
    ],
  ];
  expect(displayRows(rows)[0]?.cells).toEqual([
    ["Measure", "BP"],
    ["Unit", "mmHg"],
    [time, "136/—"],
    [later, ""],
  ]);
  expect(displayRows(rows)[0]?.source).toEqual(rows);
});

it("preserves invalid human dates and seconds while compacting valid wall-clock labels", () => {
  expect(clinicalTime("Nov 2, 2026 06:00")).toBe("11/02 0600");
  expect(clinicalTime("Feb 29, 2026 06:00")).toBe("Feb 29, 2026 06:00");
  expect(clinicalTime("2026-11-02T06:00:99-08:00")).toBe(
    "2026-11-02T06:00:99-08:00",
  );
});

it("groups only consecutive, same-time vitals and retains their original metadata", async () => {
  const { vitalGroups } = await import("../src/ehr/ui/clinical-formatters");
  const raw: Pair[][] = [
    [["Record", "Systolic BP 136 mmHg (today)"]],
    [["Record", "Diastolic BP 82 mmHg (today)"]],
    [["Record", "Heart rate 82 /min (today)"]],
    [["Record", "Respiratory rate 18 /min (yesterday)"]],
  ];
  const groups = vitalGroups(displayRows(raw, true, true));
  expect(groups.map((group) => group.caption)).toEqual([
    "BP 136/82 mmHg | P 82 /min · today",
    "RR 18 /min · yesterday",
  ]);
  expect(
    groups.flatMap((group) => group.entries.flatMap((entry) => entry.source)),
  ).toEqual(raw);
});

it("compacts MAR documentation while preserving explicit dose units, route, site and reason", async () => {
  const { medicationTaskCaption } =
    await import("../src/ehr/ui/clinical-formatters");
  const row: Pair[] = [
    ["Medication", "insulin lispro"],
    ["Recorded dose", "4"],
    ["Unit", "units"],
    ["Route", "SC"],
    ["Site", "Left abdomen"],
    ["Recorded time", "2026-11-02T08:00:00-08:00"],
    ["Status", "given"],
    ["Reason", "With breakfast"],
  ];
  expect(medicationTaskCaption(row)).toBe(
    "insulin lispro · Recorded: 4 units SC · Site: Left abdomen · 11/02/2026 0800 · Given · Reason: With breakfast",
  );
  expect(
    medicationTaskCaption([...row, ["Comment", "Do not omit"]]),
  ).toBeUndefined();
  expect(
    medicationTaskCaption([
      ["Medication", "Example oral tablet"],
      ["Ordered dose", "1"],
    ]),
  ).toBe("Example oral tablet · Ordered: 1");
});
