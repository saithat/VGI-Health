import type { Pair } from "./types";
import { cleanClinicalText } from "./clinical-display";

/** Read-only aliases. Unknown terminology and narrative retain their wording. */
export function clinicalName(raw: string): string {
  const aliases: [RegExp, string][] = [
    [/^Hemoglobin \[Mass\/volume\] in Blood$/i, "Hemoglobin"],
    [
      /^Natriuretic peptide\.B prohormone N-Terminal(?: \[.*\] in (?:Serum|Serum or Plasma|Blood))?$/i,
      "NT-proBNP",
    ],
    [
      /^Pain severity(?: - 0-10 verbal numeric rating)? \[Score\](?: - Reported)?$/i,
      "Pain score",
    ],
    [/^Leukocytes \[#\/volume\] in Blood by Automated count$/i, "WBC"],
    [/^Erythrocytes \[#\/volume\] in Blood by Automated count$/i, "RBC"],
    [
      /^Hematocrit \[Volume Fraction\] of Blood by Automated count$/i,
      "Hematocrit",
    ],
    [/^MCV \[Entitic volume\] in Red Blood Cells by Automated count$/i, "MCV"],
    [/^MCH \[Entitic mass\] by Automated count$/i, "MCH"],
    [/^MCHC \[Mass\/volume\] in Red Blood Cells by Automated count$/i, "MCHC"],
    [/^Erythrocyte \[DistWidth\] in Blood by Automated count$/i, "RDW"],
    [/^Platelets \[#\/volume\] in Blood by Automated count$/i, "Platelets"],
    [/^Body Height$/i, "Height"],
    [/^Body Weight$/i, "Weight"],
    [/^Body mass index \(BMI\) \[Ratio\]$/i, "BMI"],
    [/^Blood pressure panel with all children optional$/i, "BP"],
  ];
  const text = cleanClinicalText(raw);
  const chemistry =
    /^(Glucose|Urea nitrogen|Creatinine|Calcium|Sodium|Potassium|Chloride|Carbon dioxide, total) \[(?:Mass|Moles)\/volume\] in (?:Blood|Serum or Plasma|Serum|Plasma)$/i.exec(
      text,
    );
  if (chemistry?.[1]) return chemistry[1];
  return aliases.find(([pattern]) => pattern.test(text))?.[1] ?? text;
}
export function clinicalUnit(raw: string): string {
  const units: Record<string, string> = {
    "mm[Hg]": "mmHg",
    "{score}": "score",
    Cel: "°C",
    "[degF]": "°F",
    "kg/m2": "kg/m²",
  };
  return units[raw] ?? raw;
}
/** Round read-only observations, never doses, inputs or censored results. */
const observationNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  useGrouping: false,
});
export function observationValue(raw: string): string {
  if (!/^-?\d+\.\d{3,}$/.test(raw)) return raw;
  const value = Number(raw);
  if (
    !Number.isFinite(value) ||
    Math.abs(value) < 1 ||
    !Number.isSafeInteger(Math.trunc(value))
  )
    return raw;
  return observationNumber.format(value);
}
export function clinicalStatus(raw: string): string {
  const map: Record<string, string> = {
    booked: "Scheduled",
    scheduled: "Scheduled",
    arrived: "Arrived",
    roomed: "Roomed",
    active: "Active",
    requested: "Pending",
    "in-progress": "In progress",
    "in progress": "In progress",
    final: "Final",
    preliminary: "Prelim",
    pending: "Pending",
    overdue: "Overdue",
    given: "Given",
    held: "Held",
    completed: "Completed",
    cancelled: "Cancelled",
    unread: "Unread",
  };
  return map[raw.toLowerCase()] ?? raw;
}
export function encounterClass(raw: string): string {
  const classes: Record<string, string> = {
    AMB: "Office Visit",
    EMER: "Emergency",
    IMP: "Inpatient",
  };
  return classes[raw] ?? raw;
}
export function ageSex(raw: string): string {
  return raw.replace(/^(\d+)\s*\/\s*([MF])$/i, "$1 y.o. $2");
}
/** Keep supplied wall time. The full source offset remains accessible. */
export function clinicalTime(raw: string): string {
  const human = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) (\d{2}):(\d{2})$/.exec(
    raw,
  );
  if (human) {
    const month =
      [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ].indexOf(human[1] ?? "") + 1;
    if (month) {
      const iso = `${human[3]}-${String(month).padStart(2, "0")}-${human[2]?.padStart(2, "0")}T${human[4]}:${human[5]}`;
      const formatted = clinicalTime(iso);
      return formatted === iso ? raw : formatted;
    }
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:\s*(?:Z|[+-]\d{2}:\d{2}))?$/.exec(
      raw,
    );
  if (!match) return raw;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  const offset = /([+-])(\d{2}):(\d{2})$/.exec(raw);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== `${year}-${month}-${day}` ||
    Number(hour ?? 0) > 23 ||
    Number(minute ?? 0) > 59 ||
    Number(second ?? 0) > 59 ||
    (offset && (Number(offset[2]) > 23 || Number(offset[3]) > 59))
  )
    return raw;
  return `${month}/${day}${hour ? ` ${hour}${minute}` : ""}`;
}
export function clinicalDuration(raw: string): string {
  const match = /^(\d+) min$/.exec(raw);
  if (!match) return raw;
  const minutes = Number(match[1]);
  return minutes < 60
    ? `${minutes}m`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}
/** Ordinary chart history retains the year; shift grids use clinicalTime explicitly. */
export function clinicalTimestamp(raw: string): string {
  const short = clinicalTime(raw);
  if (short === raw) return raw;
  const year =
    /^(\d{4})-/.exec(raw)?.[1] ??
    /^[A-Z][a-z]{2} \d{1,2}, (\d{4})/.exec(raw)?.[1];
  return year ? short.replace(/^(\d{2}\/\d{2})/, `$1/${year}`) : short;
}
export function controlCaption(raw: string): string {
  return raw
    .replace(/\s*\((?:human entry|human entry only)\)$/i, "")
    .replace(/^Confirm prefilled value$/i, "Confirm")
    .replace(/^Template:\s*/i, "");
}
export function columnCaption(raw: string): string {
  return raw === "Entered response"
    ? "Response"
    : raw === "Referenced prescription"
      ? "Prescription"
      : raw;
}
export function internalSource(raw: string): boolean {
  return /^(?:(?:record|capture|macro|context):.*|Human entry only|Clinician entry required|Referenced prescription|Entered response|Template:.*)$/i.test(
    raw,
  );
}
export function resultTone(
  flag: string,
): "high" | "low" | "critical" | undefined {
  const word = flag.trim().toLowerCase();
  if (/^(hh|ll|critical)$/.test(word)) return "critical";
  if (/^(h|high)$/.test(word)) return "high";
  if (/^(l|low)$/.test(word)) return "low";
  return undefined;
}
const get = (row: Pair[], key: string) =>
  row.find(([name]) => name === key)?.[1] ?? "";
const measureKey = (row: Pair[]) =>
  ["Measure", "Vital sign", "Vital", "Test", "Name"].find((key) =>
    get(row, key),
  );
const bpPart = (name: string) =>
  /^(?:Systolic (?:BP|blood pressure)|BP systolic)$/i.test(name)
    ? "systolic"
    : /^(?:Diastolic (?:BP|blood pressure)|BP diastolic)$/i.test(name)
      ? "diastolic"
      : undefined;
export type DisplayRow = { cells: Pair[]; source: Pair[][]; index: number };
/** Pair only an unambiguous systolic/diastolic pair with identical metadata. */
export function displayRows(
  rows: Pair[][],
  pairBloodPressure = true,
  legacyVitals = false,
): DisplayRow[] {
  const original = rows;
  if (legacyVitals)
    rows = rows.map((row) =>
      row.length === 1 && row[0]?.[0] === "Record"
        ? (legacyVitalRow(row[0][1]) ?? row)
        : row,
    );
  const pairs = new Map<number, DisplayRow>();
  const consumed = new Set<number>();
  rows.forEach((row, index) => {
    const key = measureKey(row);
    if (
      !pairBloodPressure ||
      !key ||
      !get(row, "Unit") ||
      new Set(row.map(([name]) => name)).size !== row.length ||
      bpPart(get(row, key)) !== "systolic"
    )
      return;
    const valueKeys = row
      .filter(
        ([k]) =>
          k === "Value" || clinicalTime(k) !== k || /^\d{2}:\d{2}$/.test(k),
      )
      .map(([k]) => k);
    if (!valueKeys.length) return;
    const metadata = (r: Pair[]) =>
      JSON.stringify(r.filter(([k]) => k !== key && !valueKeys.includes(k)));
    const matches = rows.flatMap((other, i) =>
      bpPart(get(other, key)) === "diastolic" &&
      metadata(other) === metadata(row) &&
      other.map(([k]) => k).join("\0") === row.map(([k]) => k).join("\0")
        ? [i]
        : [],
    );
    const systolics = rows.filter(
      (other) =>
        bpPart(get(other, key)) === "systolic" &&
        metadata(other) === metadata(row),
    );
    const otherIndex = matches[0];
    const other = otherIndex === undefined ? undefined : rows[otherIndex];
    if (
      matches.length !== 1 ||
      systolics.length !== 1 ||
      !other ||
      otherIndex === undefined ||
      valueKeys.some(
        (k) =>
          !/^(?:\d+(?:\.\d+)?)?$/.test(get(row, k)) ||
          !/^(?:\d+(?:\.\d+)?)?$/.test(get(other, k)),
      )
    )
      return;
    consumed.add(index);
    consumed.add(otherIndex);
    pairs.set(Math.min(index, otherIndex), {
      cells: row.map(([k, v]): Pair => [
        k,
        k === key
          ? "BP"
          : valueKeys.includes(k)
            ? v || get(other, k)
              ? `${v || "—"}/${get(other, k) || "—"}`
              : ""
            : v,
      ]),
      source: [original[index] ?? row, original[otherIndex] ?? other],
      index: Math.min(index, otherIndex),
    });
  });
  return rows.flatMap((row, index) => {
    const pair = pairs.get(index);
    return pair
      ? [pair]
      : consumed.has(index)
        ? []
        : [{ cells: row, source: [original[index] ?? row], index }];
  });
}
/** A compact line is allowed only when every supplied cell has a display role. */
export function vitalCaption(
  row: Pair[],
  includeRecorded = true,
): string | undefined {
  const key = measureKey(row);
  if (!key || !get(row, "Value")) return undefined;
  if (new Set(row.map(([name]) => name)).size !== row.length) return undefined;
  const aliases: Record<string, string> = {
    "Heart rate": "P",
    "Respiratory rate": "RR",
    "Body temperature": "T",
    Temperature: "T",
    SpO2: "SpO2",
    "Oxygen saturation in Arterial blood": "SpO2",
    "Oxygen saturation in Arterial blood by Pulse oximetry": "SpO2",
    "Body Weight": "Wt",
    "Body Height": "Ht",
    Weight: "Wt",
    Height: "Ht",
    BP: "BP",
  };
  if (
    row.some(([k]) => ![key, "Value", "Unit", "Recorded", "Date"].includes(k))
  )
    return undefined;
  const recorded = get(row, "Recorded") || get(row, "Date");
  const name = aliases[get(row, key)] ?? clinicalName(get(row, key));
  if (
    !aliases[get(row, key)] &&
    !/^(BP|Systolic BP|Diastolic BP|Pain score|BMI)$/i.test(name)
  )
    return undefined;
  const unit = clinicalUnit(get(row, "Unit"));
  const suffix =
    unit === "score" && /score$/i.test(name)
      ? ""
      : unit === "%"
        ? "%"
        : unit
          ? ` ${unit}`
          : "";
  return `${name} ${observationValue(get(row, "Value"))}${suffix}${recorded && includeRecorded ? ` · ${clinicalTimestamp(recorded)}` : ""}`;
}

/** Known MAR detail cells retain every clinical value in a compact read-only line. */
export function medicationTaskCaption(row: Pair[]): string | undefined {
  const drug = get(row, "Medication");
  const ordered = get(row, "Ordered dose"),
    recorded = get(row, "Recorded dose");
  if (!drug || (!ordered && !recorded) || (ordered && recorded))
    return undefined;
  if (
    new Set(row.map(([key]) => key)).size !== row.length ||
    (get(row, "Order status") && get(row, "Status"))
  )
    return undefined;
  const known = [
    "Medication",
    "Ordered dose",
    "Recorded dose",
    "Unit",
    "Route",
    "Instructions",
    "Scheduled times (recorded local time)",
    "Order status",
    "Site",
    "Recorded time",
    "Status",
    "Reason",
  ];
  if (row.some(([key]) => !known.includes(key))) return undefined;
  const details = [
    `${cleanClinicalText(drug)} · ${ordered ? "Ordered" : "Recorded"}: ${ordered || recorded}${get(row, "Unit") ? ` ${clinicalUnit(get(row, "Unit"))}` : ""}${get(row, "Route") ? ` ${get(row, "Route")}` : ""}`,
    get(row, "Instructions"),
    get(row, "Scheduled times (recorded local time)")
      ? `Scheduled: ${get(row, "Scheduled times (recorded local time)").split("; ").map(clinicalTimestamp).join(", ")}`
      : "",
    get(row, "Site") ? `Site: ${get(row, "Site")}` : "",
    get(row, "Recorded time")
      ? clinicalTimestamp(get(row, "Recorded time"))
      : "",
    clinicalStatus(get(row, "Order status") || get(row, "Status")),
    get(row, "Reason") ? `Reason: ${get(row, "Reason")}` : "",
  ];
  return details.filter(Boolean).join(" · ");
}

/** Legacy summary grammar is recognized only for known vital names. */
function legacyVitalRow(raw: string): Pair[] | undefined {
  const match =
    /^(Body Height|Body Weight|Weight|Height|Systolic BP|Diastolic BP|BP|Temperature|SpO2|Pain score|Body mass index \(BMI\) \[Ratio\]|Pain severity - 0-10 verbal numeric rating \[Score\] - Reported|Blood pressure panel with all children optional|Heart rate|Respiratory rate|Body temperature|Oxygen saturation in Arterial blood(?: by Pulse oximetry)?) (-?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?) (\S+) \(([^()]+)\)$/.exec(
      raw,
    );
  if (!match) return undefined;
  const [, name, value, unit, recorded] = match;
  if (!name || !value || !unit || !recorded) return undefined;
  return [
    ["Vital sign", name],
    ["Value", value],
    ["Unit", unit],
    ["Recorded", recorded],
  ];
}
export function compactVitalRecord(raw: string): string | undefined {
  const row = legacyVitalRow(raw);
  return row ? vitalCaption(row) : undefined;
}
/** Consecutive, same-time vital readouts share one line; all source rows remain named. */
export function vitalGroups(
  rows: DisplayRow[],
): { entries: DisplayRow[]; caption?: string | undefined }[] {
  const groups: {
    entries: DisplayRow[];
    caption?: string | undefined;
    recorded: string;
  }[] = [];
  rows.forEach((row) => {
    const caption = vitalCaption(row.cells, false);
    const recorded = get(row.cells, "Recorded") || get(row.cells, "Date");
    const previous = groups.at(-1);
    if (
      caption &&
      recorded &&
      previous?.caption &&
      previous.recorded === recorded
    ) {
      previous.entries.push(row);
      previous.caption += ` | ${caption}`;
    } else groups.push({ entries: [row], caption, recorded });
  });
  return groups.map(({ entries, caption, recorded }) => ({
    entries,
    caption: caption
      ? `${caption}${recorded ? ` · ${clinicalTimestamp(recorded)}` : ""}`
      : undefined,
  }));
}
