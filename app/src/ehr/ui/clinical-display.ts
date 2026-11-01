/** Display-only cleanup. Source strings, codes and captured values stay untouched. */
export function cleanClinicalText(raw: string): string {
  return raw
    .replace(
      /\s*\((?:finding|disorder|situation|procedure|qualifier value|observable entity|organism|substance)\)(?=\s*(?:$|[;:,·|—]|\())/gi,
      "",
    )
    .replace(
      /(\d)\s*(MG|MCG|ML|KG|CM)\b/g,
      (_, number: string, unit: string) =>
        `${number} ${unit === "ML" ? "mL" : unit.toLowerCase()}`,
    )
    .replace(
      /\bOral (Tablet|Capsule|Solution|Suspension)\b/g,
      (_, form: string) => `oral ${form.toLowerCase()}`,
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Only explicit negative-allergy wording is normalized; absence never means NKA. */
export function allergyDisplay(raw: string): string {
  const text = cleanClinicalText(raw);
  const negative =
    /^(no known (?:drug )?allerg(?:y|ies)|NKA|NKDA)(\s+\((?:active|inactive|resolved|unconfirmed|confirmed|refuted|entered-in-error)\))?$/i.exec(
      text,
    );
  if (negative)
    return `${/drug|NKDA/i.test(negative[1] ?? "") ? "No Known Drug Allergies" : "No Known Allergies"}${negative[2] ?? ""}`;
  if (
    /^(?:no allergy records on file|not recorded|not documented|unknown|allergies not on file)$/i.test(
      text,
    ) ||
    !text
  )
    return "Allergies not on file";
  return text;
}

const intervals: Record<string, string> = {
  "every four to six hours": "every 4–6 h",
  "every four hours": "every 4 h",
  "every six hours": "every 6 h",
  "every eight hours": "every 8 h",
  "every twelve hours": "every 12 h",
  "once a day": "daily",
  "once daily": "daily",
  "twice a day": "BID",
  "three times a day": "TID",
  "four times a day": "QID",
};
const structuredSig =
  /^(\d+(?:\.\d+)?)(?:\s+([A-Za-z]+))?,\s*(\d+)x per (\d+(?:\.\d+)?)\s*(d|h|wk|mo)$/i;

/** Recognized Synthea quantity/frequency grammar is rephrased, never rescheduled. */
export function formatSig(raw: string): string {
  const text = cleanClinicalText(raw);
  const structured = structuredSig.exec(text);
  if (structured) {
    const [, amount, suppliedUnit, frequency, period, unit] = structured;
    const daily: Record<string, string> = {
      "1": "daily",
      "2": "BID",
      "3": "TID",
      "4": "QID",
    };
    const timing =
      period === "1" && unit?.toLowerCase() === "d"
        ? (daily[frequency ?? ""] ?? `${frequency} times daily`)
        : `${frequency} ${frequency === "1" ? "time" : "times"} every ${period} ${unit}`;
    return [amount, suppliedUnit, timing].filter(Boolean).join(" ");
  }
  return intervals[text.toLowerCase()] ?? text;
}

/** Product form never supplies an absent dose unit or administration route. */
function medicationParts(
  name: string,
  sig: string,
): { caption: string; directions: string } {
  return { caption: cleanClinicalText(name), directions: formatSig(sig) };
}
export function formatMedicationLine(name: string, sig: string): string {
  const { caption, directions } = medicationParts(name, sig);
  return directions ? `${caption}: ${directions}` : caption;
}
export function formatMedicationDirections(name: string, sig: string): string {
  return medicationParts(name, sig).directions;
}

/** Compact summary lines are identified by explicit dosage-form text. */
export function formatClinicalRecord(raw: string): string {
  if (
    /^(?:no known (?:drug )?allerg(?:y|ies)|NKA|NKDA)(?:\s+\((?:active|inactive|resolved|unconfirmed|confirmed|refuted|entered-in-error)\))?$/i.test(
      cleanClinicalText(raw),
    )
  )
    return allergyDisplay(raw);
  const split = raw.indexOf(" — ");
  if (split > 0 && /\boral (?:tablet|capsule)\b/i.test(raw.slice(0, split)))
    return formatMedicationLine(raw.slice(0, split), raw.slice(split + 3));
  return formatSig(raw);
}

/** Casing is restricted to UI captions, never narrative or clinical values. */
export function fieldCaption(raw: string): string {
  const label = raw.replace(/^Enter Medication$/i, "Medication");
  return label.replace(/\b[A-Z][a-z]+\b/g, (word, offset: number) =>
    offset === 0 ? word : word.toLowerCase(),
  );
}
export function sectionCaption(raw: string): string {
  return raw.replace(/\b[a-z][a-z]+\b/gi, (word, offset: number) =>
    /^(?:kg|mg|mcg|mL|cm|mmHg)$/.test(word) ||
    /^[A-Z]{2,}$/.test(word) ||
    /[A-Z].*[A-Z]/.test(word)
      ? word
      : offset > 0 && /^(?:and|or|of|to|for|in|with|the|a|an)$/i.test(word)
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
  );
}
export function fieldPlaceholder(label: string, kind: string): string {
  if (/^(?:enter )?medication$|^drug$/i.test(label))
    return "Search medications";
  if (/route/i.test(label)) return "Select route";
  if (/frequency|^freq$/i.test(label)) return "Select frequency";
  if (/dose unit/i.test(label)) return "Select dose unit";
  if (/diagnos|ICD/i.test(label)) return "Search diagnoses";
  if (/antibiotic indication/i.test(label)) return "Select indication";
  if (/^as needed/i.test(label)) return "Select PRN status";
  if (/substitution/i.test(label)) return "Select substitution";
  const subject = fieldCaption(label)
    .replace(/\s*\([^)]*\)/g, "")
    .toLowerCase();
  if (subject.length > 32)
    return kind === "search" ? "Search" : "Select an option";
  return `${kind === "search" ? "Search" : "Select"} ${subject}`;
}
export function emptyInfoText(infoId: string): string {
  if (infoId === "orderCatalog") return "Search to add orders";
  if (infoId === "allergyList") return "Allergies not on file";
  return "No records on file";
}
