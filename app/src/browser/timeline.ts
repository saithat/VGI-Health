import type { DecisionRecord } from "../../../agent/src/schema";
import type { RunData } from "../dashboard/data";
import { workloadAt } from "../dashboard/workload";
import type { Catalog, ProgramEntry } from "./data";

export { clinicianRoleNames as personaNames } from "../ehr/ui/personas";
export const vendorReleases = [
  { id: "v1", day: 0, summary: "Initial vendor EHR" },
  {
    id: "v2",
    day: 4,
    summary: "Vendor update: prior authorization for imaging/procedures",
  },
  {
    id: "v3",
    day: 7,
    summary: "Hospital policy: antibiotic orders need an indication",
  },
];
export function releaseAt(day: number) {
  return (
    vendorReleases.filter((release) => release.day <= day).at(-1) ??
    vendorReleases[0] ?? { id: "v1", day: 0, summary: "Initial vendor EHR" }
  );
}
export interface TimelineNode {
  persona: string;
  day: number;
  program: ProgramEntry;
  record: DecisionRecord | undefined;
  kept: boolean;
  baseline: boolean;
  summary: string;
  rejected: { summary: string; property: string }[];
}
/** Recorded deployments only. Empty branches expose certified release baselines,
 * rather than inventing personalized revisions for clinicians without a run. */
export function timelineNodes(
  catalog: Catalog,
  run: RunData | undefined,
  persona: string,
): TimelineNode[] {
  const records =
    run?.records.filter(
      (record) =>
        record.persona === persona && record.mode !== "try-to-break-it",
    ) ?? [];
  const programs = catalog.programs.filter(
    (program) =>
      program.persona === persona && program.run === run?.manifest.runId,
  );
  return Array.from({ length: 11 }, (_, day): TimelineNode | null => {
    const record = records.filter((record) => record.night <= day).at(-1);
    const today = records.find((record) => record.night === day);
    const recorded = record
      ? programs.find((program) => program.version === record.versionAfter)
      : programs.find((program) => program.version === 0);
    const baseline = catalog.programs.find(
      (program) =>
        program.path ===
        `releases/${releaseAt(day).id}/personas/${persona}.json`,
    );
    const program = records.length ? (recorded ?? baseline) : baseline;
    if (
      !program ||
      (!records.length &&
        !vendorReleases.some((release) => release.day === day))
    )
      return null;
    return {
      persona,
      day,
      program,
      record: today ?? record,
      kept:
        day > 0 &&
        records.length > 0 &&
        (!today || today.versionAfter === today.versionBefore),
      baseline: !program.run,
      summary:
        today?.candidates.find((candidate) =>
          today.chosen?.candidateIds.includes(candidate.candidate.id),
        )?.candidate.summary ??
        today?.hypothesis ??
        (records.length
          ? day === 0
            ? "Certified baseline before personalization"
            : "Previous certified revision retained"
          : `${releaseAt(day).id} canonical with this role’s permissions and preset view. No recorded personalization yet.`),
      rejected:
        today?.candidates
          .filter((candidate) => candidate.check.status === "fail")
          .map((candidate) => ({
            summary: candidate.candidate.summary,
            property: candidate.check.property ?? "Checker rejection",
          })) ?? [],
    };
  }).filter((node): node is TimelineNode => node !== null);
}
export function workloadDelta(run: RunData | undefined, node: Pick<TimelineNode,"persona"|"baseline"> & {program:Pick<ProgramEntry,"version">}) {
  if (!run || node.baseline) return null;
  const measured=workloadAt(run,node.persona,node.program.version);
  const baseline=run.manifest.measurementProtocol?measured.canonical:workloadAt(run,node.persona,0).total;
  const current=measured.total;
  if (!baseline || !current) return null;
  return {
    clicks: current.clicks - baseline.clicks,
    keys: current.keystrokes - baseline.keystrokes,
    scrolls:current.scrolls-baseline.scrolls,
    scrollPx:current.scrollPx===null||baseline.scrollPx===null?null:current.scrollPx-baseline.scrollPx,
    mouseTravelPx: current.mouseTravelPx===null||baseline.mouseTravelPx===null?null:current.mouseTravelPx-baseline.mouseTravelPx,
  };
}
