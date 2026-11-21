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
