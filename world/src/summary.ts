/** Human-readable summaries of generated days. */
import type { DayOutput } from "./world";
import { PERSONAS, WORKFLOWS } from "./schema";

/** Table of tasks per persona and workflow for one day. */
export function dayTable(out: DayOutput): string {
  const header = ["persona", "load", ...WORKFLOWS, "total"];
  const rows: string[][] = [header];
  const totals = WORKFLOWS.map(() => 0);
  for (const p of PERSONAS) {
    const s = out.schedules[p];
    const counts = WORKFLOWS.map((w) => s.tasks.filter((t) => t.workflow === w).length);
    counts.forEach((c, i) => (totals[i] = (totals[i] ?? 0) + c));
    rows.push([p, s.load, ...counts.map((c) => (c === 0 ? "." : String(c))), String(s.tasks.length)]);
  }
  rows.push(["all", "", ...totals.map(String), String(totals.reduce((a, c) => a + c, 0))]);
  const widths = header.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length)));
  return rows.map((r) => r.map((c, i) => c.padStart(widths[i] ?? 0)).join("  ")).join("\n");
}

/** A few world facts for one day. */
export function dayFacts(out: DayOutput): string {
  const st = out.state;
  const t = st.today;
  const lb = t.ed.arrivals.filter((a) => a.weightUnit === "lb").length;
  return [
    `day ${st.day} ${st.date} (${st.context.weekday}) volume ${st.context.volume} [${st.context.scriptedEvents.join(", ") || "-"}]`,
    `  ED: ${t.ed.arrivals.length} arrivals (${lb} weights in lb), peak census ${t.ed.peakCensus}; dispositions admit ${t.ed.arrivals.filter((a) => a.disposition === "admit").length}, consult ${t.ed.arrivals.filter((a) => a.disposition === "consult").length}`,
    `  ward: census ${t.ward.censusAtShiftStart.length} at shift start, ${t.ward.admissions.length} admitted, ${t.ward.discharges.length} discharged`,
    `  P1: ${t.clinics.P1.seen} seen (${t.clinics.P1.noShows.length} no-shows, ${t.clinics.P1.addOns.length} add-ons, ${t.clinics.P1.newPatients} new); inbox ${t.inbox.P1.arrived} arrived, ${t.inbox.P1.handled} handled, ${t.inbox.P1.backlogAfter} carried over`,
    `  P4: ${t.clinics.P4.seen} seen; P5 (${st.context.p5DayType}): ${t.surgery.casesOperated.length} cases, ${t.surgery.consults.length} new consults, ${t.clinics.P5.seen} clinic visits`,
  ].join("\n");
}
