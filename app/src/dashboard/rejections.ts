import type { CheckResult, DecisionRecord, JsonPatchOp } from "./agent-evidence";
import type { RunData } from "./data";
export interface Rejection {
  id: string;
  label: string;
  summary: string;
  record: DecisionRecord;
  check: CheckResult;
  patch: JsonPatchOp[];
  targets: string[];
}
export function getRejections(run: RunData): Rejection[] {
  return run.records.flatMap((record) => [
    ...record.candidates
      .filter((c) => c.check.status === "fail")
      .map((c) => ({
        id: `${record.mode}-${record.night}-${record.persona}-${c.candidate.id}`,
        label: `${record.persona} · Night ${record.night} · ${c.candidate.summary}`,
        summary: c.candidate.summary,
        record,
        check: c.check,
        patch: c.candidate.patch,
        targets: c.candidate.targets,
      })),
    ...(record.release?.recheck.status === "fail"
      ? [
          {
            id: `release-${record.persona}-${record.night}`,
            label: `${record.persona} · ${record.release.id} recheck of old UI`,
            summary: `${record.release.id}: recheck of the previous program`,
            record,
            check: record.release.recheck,
            patch: [],
            targets: ["indication", "commit-action"],
          },
        ]
      : []),
  ]);
}
export type Selection = { record: DecisionRecord | null; rejection?: Rejection };
