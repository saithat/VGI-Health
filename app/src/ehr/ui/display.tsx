import type { ClinicalTone } from "./theme";

const iso =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
/** Presentation fallback only: never changes captured field values or ordering. */
export function formatDisplayValue(value: string): string {
  const match = iso.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute, second] = match;
  const calendar = new Date(`${year}-${month}-${day}T12:00:00Z`);
  // Reject impossible calendar dates instead of silently normalizing them.
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== `${year}-${month}-${day}` ||
    Number(hour ?? 0) > 23 ||
    Number(minute ?? 0) > 59 ||
    Number(second ?? 0) > 59
  )
    return value;
  const date = hour === undefined ? calendar : new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // A date-only DOB must not move to the previous day in a western timezone.
    ...(hour === undefined ? { timeZone: "UTC" } : {}),
  }).format(date);
}
export function DisplayValue({ value }: { value: string }) {
  const formatted = formatDisplayValue(value);
  return formatted === value ? (
    value
  ) : (
    <time dateTime={value} title={value}>
      {formatted}
    </time>
  );
}

/** Readable source markers; the semantic field retains its exact provenance. */
export function formatProvenance(source: string): string {
  if (source.startsWith("record:")) return "From chart";
  if (source.startsWith("linked:")) return "Linked value";
  if (source === "default") return "Default value";
  if (source === "macro") return "Template draft";
  return source;
}

/** Only explicit supplied status text receives a tone; no timing or workflow inference. */
export function statusTone(value: string): ClinicalTone | undefined {
  const status = value.trim().toLowerCase();
  if (/^overdue(?:$|\s)/.test(status)) return "red";
  if (/^due(?:$|\s)/.test(status)) return "blue";
  if (/^given(?:$|\s)/.test(status)) return "green";
  if (/^held(?:$|\s)/.test(status)) return "yellow";
  if (/^refused(?:$|\s)/.test(status)) return "violet";
  if (
    /^(future|scheduled|stopped|not due|not charted|not documented)(?:$|\s)/.test(
      status,
    )
  )
    return "gray";
  return undefined;
}
export function severityTone(severity: string): ClinicalTone {
  // The legacy wire supplies tiers here. Color is a presentation cue; it never
  // changes clinical severity text, modality, acknowledgment or enabled state.
  if (severity === "interruptive") return "red";
  if (severity === "removable") return "yellow";
  if (/^(severe|critical|error|high|danger)$/.test(severity.toLowerCase()))
    return "red";
  if (/^(warning|caution|moderate)$/.test(severity.toLowerCase()))
    return "yellow";
  if (/^(success|successful)$/.test(severity.toLowerCase())) return "green";
  return "blue";
}
