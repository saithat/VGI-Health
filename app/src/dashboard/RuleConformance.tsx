import type { RuleConformance } from "./conformance-data";

export function RuleConformanceBadge({
  data,
  persona,
  revision,
}: {
  data: RuleConformance | null | undefined;
  persona: string;
  revision: number;
}) {
  const target = data?.targets.find(
    (t) =>
      t.kind === "deployed" && t.persona === persona && t.revision === revision,
  );
  if (!target)
    return <span className="dash-badge">Rule conformance: unavailable</span>;
  const failures =
    data?.results.filter(
      (r) => r.target === target.id && r.status === "fail",
    ) ?? [];
  return (
    <details className="rule-conformance">
      <summary>
        <span className={`dash-badge ${target.failed ? "fail" : "pass"}`}>
          Rule conformance:{" "}
          {target.failed ? `${target.failed} failure${target.failed === 1 ? "" : "s"}` : "all pass"}
        </span>
      </summary>
      <p>
        {target.passed} passed · {target.notApplicable} not applicable.
        Read-only evidence; does not gate deployment.
      </p>
      {failures.length > 0 && (
        <ul>
          {failures.map((r) => (
            <li key={r.scenario}>
              <strong>{r.scenario}</strong>: {r.observed}
              {r.scope === "runtime-probe"
                ? " (adversarial runtime probe)"
                : ""}
            </li>
          ))}
        </ul>
      )}
      <a href={`/runs/${data?.runId}/conformance.json`}>
        Full rule conformance results
      </a>
    </details>
  );
}
