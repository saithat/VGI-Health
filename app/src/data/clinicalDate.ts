import seeded from "../../../infra/seeded-world-day.json";
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
