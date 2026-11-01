import type { ClinicalTone } from "./theme";
import { formatClinicalRecord } from "./clinical-display";

const iso =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
/** Presentation fallback only: never changes captured field values or ordering. */
export function formatDisplayValue(value: string): string {
  const match = iso.exec(value);
  if (!match) return formatClinicalRecord(value);
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
  const label = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // A date-only DOB must not move to the previous day in a western timezone.
    timeZone: "UTC",
  }).format(calendar);
  // Keep the supplied clock, precision and offset rather than converting zones
  // or discarding the recorded time when a payload contains an ISO timestamp.
  return hour === undefined ? label : `${label} ${value.slice(11)}`;
}
export function DisplayValue({ value }: { value: string }) {
  const formatted = formatDisplayValue(value);
  return formatted === value ? (
    value
  ) : iso.test(value) ? (
    <time dateTime={value} title={value}>
      {formatted}
    </time>
  ) : (
    <span title={value} aria-label={value}>
      {formatted}
    </span>
  );
}

/** Only explicit supplied status text receives a tone; no timing or workflow inference. */
export function statusTone(value: string): ClinicalTone | undefined {
  const status = (value.split(/[·\n]/)[0] ?? "").trim().toLowerCase();
  if (/^(l|low)$/.test(status)) return "blue";
  if (/^(h|high)$/.test(status)) return "yellow";
  if (/^(hh|ll|a|abnormal)$/.test(status)) return "red";
  if (/^(critical|urgent|stat|overdue)(?:$|\s)/.test(status)) return "red";
  if (/^(signed|reviewed|complete|completed|given|done)(?:$|\s)/.test(status))
    return "green";
  if (
    /^(unsigned|pending|needs review|needs confirmation|needs action|missing details|awaiting confirmation|held|on-hold|roomed|arrived)(?:$|\s)/.test(
      status,
    )
  )
    return "yellow";
  if (
    /^(in progress|in-progress|due|booked|ordered|requested|unread)(?:$|\s)/.test(
      status,
    )
  )
    return "blue";
  if (/^(refused|declined)(?:$|\s)/.test(status)) return "violet";
  if (
    /^(future|scheduled|stopped|discontinued|cancelled|canceled|not given|not-done|not due|not charted|not documented)(?:$|\s)/.test(
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
