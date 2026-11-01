import seeded from "../../../infra/seeded-world-day.json" with { type: "json" };

/** Match the source's clinical calendar day, including its recorded offset. */
export function isClinicalDay(start: string | undefined, day: string): boolean {
  return start?.slice(0, 10) === day;
}

/** Show the clinical snapshot date without a viewer-timezone date shift. */
export function formatClinicalDate(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
/** The imported world is a clinical snapshot, independent of the viewing date. */
export function clinicalDate(): string {
  const override =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("date");
  if (override !== null && !/^\d{4}-\d{2}-\d{2}$/.test(override))
    throw new Error("Use a clinical date in YYYY-MM-DD format");
  return override ?? seeded.date;
}
