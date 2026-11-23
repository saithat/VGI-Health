import { hillclimbPolicy } from "./benefit-metrics.mjs";
import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import { RuleConformanceBadge } from "./RuleConformance";
import { InfoTip, delta, deltaTone, round } from "./EvolutionSummary";
import type { DecisionRecord } from "./agent-evidence";
import type { RunData } from "./data";
import { getRejections, type Selection } from "./rejections";
import { Badge } from "./Badge";
type Effect = { value: number | null; caption: string };
export function VersionList({
  run,
  persona,
  open,
}: {
  run: RunData;
  persona: string;
  open: (selection: Selection) => void;
}) {
  const records = run.records.filter(
    (r) => r.persona === persona && r.mode !== "try-to-break-it",
  );
  const climbing = run.manifest.measurementProtocol?.name===hillclimbPolicy;
  const blindProtocol = !!run.manifest.measurementProtocol;
  const exactAt = (version: number) => {
    const i = run.complexity?.personas
      .find((p) => p.persona === persona)
      ?.iterations.find((i) => i.version === version);
    return i && !i.coverage?.notComputed && typeof i.total.clicks === "number"
      ? i.total.clicks
      : null;
  };
  const baseline = exactAt(0);
  const conformance = (revision: number) =>
    run.ruleConformance?.targets.find(
      (t) =>
        t.kind === "deployed" &&
        t.persona === persona &&
        t.revision === revision,
    );
  const effectOf = (r: DecisionRecord): Effect => {
    const deployed = r.versionAfter !== r.versionBefore;
    if (blindProtocol) {
      const test = r.measured.test;
      if (test) {
        const noAgent = r.measured.testNoAgent;
        return {
          value: -test.saving.clicks,
          caption: `vs certified canonical${noAgent ? ` · agent-only ${delta(-noAgent.saving.clicks)}` : ""} · ${test.after.completed}/${test.after.tasks} tasks`,
        };
      }
      return {
        value: null,
        caption: r.release
          ? "Vendor release · cost tracked separately"
          : r.outcome === "llm-error"
            ? "LLM error"
            : deployed
              ? "Not independently measured"
              : "",
      };
    }
    const [after, before] = [exactAt(r.versionAfter), exactAt(r.versionBefore)];
    if (!deployed) return { value: null, caption: "" };
    return after !== null && before !== null
      ? {
          value: after - before,
          caption: `expert minimum${baseline !== null ? ` · ${delta(after - baseline)} vs baseline` : ""}`,
        }
      : { value: null, caption: "Not measured" };
  };
  const describe = (r: DecisionRecord) => {
    const chosen = r.candidates
      .filter((c) => r.chosen?.candidateIds.includes(c.candidate.id))
      .map((c) => c.candidate.summary);
    return chosen.length
      ? chosen
      : [
          r.release
            ? r.release.surfaced === false
              ? "Optional feature left out of nursing workflow"
              : "Release migration"
            : r.outcome === "llm-error"
              ? "LLM error — no design decision"
              : "No change deployed",
        ];
  };
  const quiet = (r: DecisionRecord) =>
    r.versionAfter === r.versionBefore &&
    !r.release &&
    !r.measured.test &&
    r.outcome !== "llm-error" &&
    !getRejections({ ...run, records: [r] }).length;
  // Collapse runs of quiet nights so the list shows only nights where something happened.
  const groups: DecisionRecord[][] = [];
  for (const r of records) {
    const last = groups[groups.length - 1];
    if (quiet(r) && last?.[0] && quiet(last[0])) last.push(r);
    else groups.push([r]);
  }
  const row = (r: DecisionRecord) => {
    const deployed = r.versionAfter !== r.versionBefore;
    const effect = effectOf(r);
    const target = conformance(r.versionAfter);
    const rejected = getRejections({ ...run, records: [r] });
    const lines = describe(r);
    return (
      <div key={`${r.mode}-${r.night}`} className="night">
        <button
          className={`version-row ${deployed ? "" : "unchanged-row"}`}
          onClick={() => open({ record: r })}
        >
          <span className="night-when">
            <strong>
              {deployed
                ? `rev ${r.versionAfter}`
                : `Kept rev ${r.versionAfter}`}{" "}
              · Night {r.night}
            </strong>
            {r.release && (
              <span className="release-tag">
                {releaseLabel(r.release.id, run.manifest.runId)} release
              </span>
            )}
          </span>
          <span className="night-what">
            {lines.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </span>
          <span className="night-effect">
            <span className="mobile-label">Effect: </span>
            {effect.value === null ? (
              <span className="effect-none">—</span>
            ) : (
              <span className={`effect-value ${deltaTone(effect.value)}`}>
                {delta(effect.value)} clicks
              </span>
            )}
            {effect.caption && (
              <span className="effect-caption">{effect.caption}</span>
            )}
          </span>
          <span className="night-status">
            <span className="mobile-label">Status: </span>
            {r.certificate ? (
              <span className="status-ok">
                ✓ Certified{" "}
                {releaseLabel(r.certificate.specVersion, run.manifest.runId)}
              </span>
            ) : deployed || r.release ? (
              <Badge>{r.certification.result}</Badge>
            ) : null}
          </span>
        </button>
        {target?.failed ? (
          <RuleConformanceBadge
            data={run.ruleConformance}
            persona={persona}
            revision={r.versionAfter}
          />
        ) : null}
        {rejected.map((rejection) => (
          <button
            key={rejection.id}
            className="rejected-row"
            onClick={() => open({ record: r, rejection })}
          >
            <span>✕ Rejected · Night {r.night}</span>
            <span>{rejection.summary}</span>
            <strong>
              {rejection.check.property ?? rejection.check.status}
            </strong>
          </button>
        ))}
      </div>
    );
  };
  const baseCert =
    run.certs.has(`certs/${persona}/v0.json`) ||
    run.files?.includes(`certs/${persona}/v0.json`);
  return (
    <section className="version-history" aria-label="Version history">
      <div className="history-heading">
        <h3>Night by night</h3>
        <InfoTip label="How nights are measured" align="right">
          {blindProtocol && !climbing && (
            <p>
              One canonical EHR, with role permissions and preset views. The
              agent evolves each persona’s fork. Odd days calibrate; even days
              are blind measurements and never select changes. Savings compare
              the certified canonical for that day’s release on identical
              schedules and seeds; canonical differences include vendor/fork
              drift. Agent-only savings use the no-agent fork carried through
              recertification and canonical fallback without LLM changes. Even
              nights reuse past data; superseded changes have no independent
              test. Blind per-day task counts are shown, including the smaller
              P5 samples.
            </p>
          )}
          <p>
            Effect is the change in clicks; negative means less work.{" "}
            {climbing ? "Each next-day measurement uses the deployed version and its same-release canonical." : blindProtocol
              ? "Blind tests compare after − before against the certified canonical."
              : "Exact savings compare fixed benchmark values on the workflow union."}{" "}
            For realistic effort, choose “Realistic workload” on the chart; a
            flat expert minimum can coexist with less scrolling or mouse travel
            in simulation.
          </p>
          <p>
            Rule conformance is read-only evidence and does not gate deployment;
            only revisions with failures are flagged here.
          </p>
        </InfoTip>
        <span className="history-legend">
          <span className="better">−</span> less work ·{" "}
          <span className="worse">+</span> more work
        </span>
      </div>
      <button
        className="version-row baseline-row"
        onClick={() => open({ record: null })}
      >
        <span className="night-when">
          <strong>rev 0 · Baseline</strong>
        </span>
        <span className="night-what">
          <span>Canonical program</span>
        </span>
        <span className="night-effect">
          {baseline !== null && (
            <span className="effect-caption">
              {round(baseline)} clicks expert minimum
            </span>
          )}
        </span>
        <span className="night-status">
          {baseCert ? (
            <span className="status-ok">✓ Certificate recorded</span>
          ) : (
            <Badge>Certificate unavailable</Badge>
          )}
        </span>
      </button>
      {conformance(0)?.failed ? (
        <RuleConformanceBadge
          data={run.ruleConformance}
          persona={persona}
          revision={0}
        />
      ) : null}
      {groups.map(([first, ...rest]) => {
        if (!first) return null;
        const last = rest[rest.length - 1];
        return last ? (
          <details key={`quiet-${first.night}`} className="quiet-nights">
            <summary>
              Nights {first.night}–{last.night} · no change, rev{" "}
              {first.versionAfter} kept
            </summary>
            {[first, ...rest].map(row)}
          </details>
        ) : (
          row(first)
        );
      })}
    </section>
  );
}
