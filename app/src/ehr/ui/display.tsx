import type { ClinicalTone } from "./theme";
import { formatClinicalRecord } from "./clinical-display";
import {
  clinicalName,
  clinicalUnit,
  clinicalStatus,
  clinicalDuration,
  clinicalTimestamp,
  compactVitalRecord,
  ageSex,
  encounterClass,
} from "./clinical-formatters";

const iso =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
/** Presentation fallback only: never changes captured field values or ordering. */
export function formatDisplayValue(value: string): string {
  const vital = compactVitalRecord(value);
  if (vital) return vital;
  const match = iso.exec(value);
  if (!match)
    return clinicalTimestamp(
      clinicalDuration(
        ageSex(
          encounterClass(
            clinicalStatus(
              clinicalUnit(clinicalName(formatClinicalRecord(value))),
            ),
          ),
        ),
      ),
    );
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
  if (hour !== undefined) return clinicalTimestamp(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // A date-only DOB must not move to the previous day in a western timezone.
    timeZone: "UTC",
  }).format(calendar);
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
  const status = (value.split(/[·\n]/)[0] ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ");
  if (/^(l|low)$/.test(status)) return "blue";
  if (/^(h|high)$/.test(status)) return "red";
  if (/^(hh|ll|a|abnormal)$/.test(status)) return "red";
  if (/^(critical|urgent|stat|overdue|rejected)(?:$|\s)/.test(status))
    return "red";
  if (
    /^(signed|final|certified|reviewed|complete|completed|given|done|results? available|report available)(?:$|\s)/.test(
      status,
    )
  )
    return "green";
  if (
    /^(due|due-soon|due soon|unsigned|pending|needs review|needs confirmation|needs action|missing details|awaiting confirmation|held|on hold|roomed|arrived)(?:$|\s)/.test(
      status,
    )
  )
    return "yellow";
  if (
    /^(in progress|in-progress|preliminary|partial|booked|ordered|requested)(?:$|\s)/.test(status)
  )
    return "blue";
  if (
    /^(in basket|in-basket|cosign|cosign required|awaiting cosign|unread|refused|declined)(?:$|\s)/.test(
      status,
    )
  )
    return "violet";
  if (
    /^(draft|future|scheduled|stopped|discontinued|cancelled|canceled|not given|not done|not due|not charted|not documented)(?:$|\s)/.test(
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
  if (/^(removable|passive|fyi|notice|information|info|bpa)$/i.test(severity))
    return "yellow";
  if (/^(severe|critical|error|high|danger)$/.test(severity.toLowerCase()))
    return "red";
  if (/^(warning|caution|moderate)$/.test(severity.toLowerCase()))
    return "orange";
  if (/^(success|successful)$/.test(severity.toLowerCase())) return "green";
  return "blue";
}

/** Header accents describe the supplied section type, never a clinical finding. */
export function sectionTone(label: string): ClinicalTone {
  if (/allerg|precaution|critical|alert/i.test(label)) return "red";
  if (
    /in basket|message|cosign|note|history|instruction|education/i.test(label)
  )
    return "violet";
  if (
    /medication|\bmar\b|pharmacy|immuniz|census|worklist|flowsheet|ward/i.test(
      label,
    )
  )
    return "green";
  if (/result|lab|imaging|triage|acuity|track board|emergency/i.test(label))
    return "orange";
  if (
    /order|assessment|plan|disposition|procedure|surg|operative|or schedule/i.test(
      label,
    )
  )
    return "yellow";
  return "blue";
}
