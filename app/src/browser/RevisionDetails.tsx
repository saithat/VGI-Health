import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { programSchema, type Program } from "../../../agent/src/schema";
import { readRunJson, type RunData } from "../dashboard/data";
import { recheckRecordedRevision } from "./data";
import {
  propertyReason,
  recordedPatch,
  revisionChanges,
  type RevisionChange,
} from "./revision-diff";
import type { TimelineNode } from "./timeline";

export function RevisionDetails({
  node,
  run,
}: {
  node: TimelineNode;
  run: RunData | undefined;
}) {
  const [changes, setChanges] = useState<RevisionChange[] | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<
    "pass" | "fail" | "error" | null
  >(null);
  const [result, setResult] = useState("");
  const record = node.record;
  useEffect(() => {
    let active = true;
    setChanges(null);
    setPrograms([]);
    setError("");
    setResult("");
    setCheckStatus(null);
    if (
      !record ||
      !run ||
      node.baseline ||
      record.versionBefore === record.versionAfter
    ) {
      setChanges([]);
      return;
    }
    const paths = [record.versionBefore, record.versionAfter].map(
      (version) =>
        `/runs/${run.manifest.runId}/programs/${node.persona}/v${version}.json`,
    );
    void Promise.all(
      paths.map((path) =>
        readRunJson(path).then((p) => programSchema.parse(p)),
      ),
    )
      .then(([before, after]) => {
        if (active && before && after) {
          setChanges(revisionChanges(before, after));
          setPrograms([before, after]);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [record, run, node.baseline, node.persona]);
  const check = async () => {
    setChecking(true);
    setResult("");
    try {
      const checked = await recheckRecordedRevision(node.program, node.persona);
      const verdict = checked.verdict;
      setCheckStatus(verdict === "ok" ? "pass" : "fail");
      setResult(
        verdict === "ok"
          ? `Still certified · ${checked.release}`
          : `Would be rejected: ${verdict.violation.property} — ${checked.reason ?? propertyReason(verdict.violation.property, verdict.violation.message)}`,
      );
    } catch (e) {
      setCheckStatus("error");
      setResult(
        `Check unavailable: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setChecking(false);
    }
  };
  const rejected =
    record?.night === node.day
      ? record.candidates.filter((c) => c.check.status !== "pass")
      : [];
  return (
    <div className="revision-inspection">
      <section
        className="revision-recheck"
        aria-label="Check revision against current release"
      >
        <h4>Current release check</h4>
        <p>Check only: nothing is changed</p>
        <Button
          size="xs"
          fullWidth
          variant="outline"
          loading={checking}
          disabled={checking || node.program.mock}
          title={
            node.program.mock
              ? "Authored mock revisions cannot be certified by this action"
              : undefined
          }
          onClick={() => void check()}
        >
          Re-check against current release
        </Button>
        {result && (
          <p
            role="status"
            className="revision-check-result"
            data-check-status={checkStatus}
          >
            {result}
          </p>
        )}
      </section>
      <section aria-label="Recorded changes">
        <h4>What changed</h4>
        {node.kept && (
          <p>No change this night. The previous revision was kept.</p>
        )}
        {record && record.night !== node.day && !node.baseline && (
          <p className="browser-muted">Last changed on night {record.night}.</p>
        )}
        {error ? (
          <p role="alert">Change comparison unavailable: {error}</p>
        ) : changes === null ? (
          <p role="status">Loading recorded program comparison…</p>
        ) : changes.length ? (
          <div
            className="revision-diff-list"
            tabIndex={0}
            aria-label="Before and after changes"
          >
            {changes.map((change, i) => (
              <article key={i}>
                <strong>{change.label}</strong>
                <dl>
                  <div>
                    <dt>Before</dt>
                    <dd>{change.before}</dd>
                  </div>
                  <div>
                    <dt>After</dt>
                    <dd>{change.after}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="browser-muted">
            {node.baseline
              ? "Certified role baseline, before personalization."
              : "No structural change between the recorded versions."}
          </p>
        )}
        {record && !node.baseline && (
          <details>
            <summary>Raw JSON patch</summary>
            <pre>{JSON.stringify(recordedPatch(record), null, 2)}</pre>
          </details>
        )}
      </section>
      <section aria-label="Rejected candidates">
        <h4>Rejected candidates</h4>
        {rejected.length ? (
          <ul className="revision-rejected">
            {rejected.map((c) => (
              <li key={c.candidate.id}>
                <strong>{c.candidate.summary}</strong>
                <p>
                  <b>{c.check.property ?? c.check.status}</b> —{" "}
                  {propertyReason(
                    c.check.property ?? "",
                    c.check.message,
                    programs,
                  )}
                </p>
                <details>
                  <summary>Checker detail and proposed patch</summary>
                  <pre>
                    {JSON.stringify(
                      {
                        property: c.check.property,
                        reason: c.check.message,
                        patch: c.candidate.patch,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="browser-muted">
            No rejected candidates recorded for this night.
          </p>
        )}
      </section>
    </div>
  );
}
