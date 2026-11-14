import {
  compareDays,
  type DayPair,
  type BenefitComparison,
} from "./benefit-metrics.mjs";
import type { RunData } from "./data";

const percent = (n: number | null) =>
  n === null ? "Unavailable" : `${n.toFixed(1)}%`;
const minutes = (n: number) => (n / 600).toFixed(1);

export function benefitFor(run: RunData, persona: string) {
  const pairs: DayPair[] = [];
  const missing: number[] = [];
  for (const after of run.days.filter(
    (d) =>
      d.persona === persona &&
      (!run.manifest.measurementProtocol || d.day % 2 === 0),
  )) {
    const before = run.noAgentDays?.find(
      (d) => d.persona === persona && d.day === after.day,
    );
    if (before) pairs.push({ before, after });
    else missing.push(after.day);
  }
  return {
    total: compareDays(pairs),
    perDay: pairs.map((p) => ({ day: p.after.day, result: compareDays([p]) })),
    missing,
  };
}
function Row({
  label,
  result: r,
}: {
  label: string;
  result: BenefitComparison;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {r.completion.before.completed}/{r.completion.before.tasks} →{" "}
        {r.completion.after.completed}/{r.completion.after.tasks}
      </td>
      <td>
        {r.before.clicks} → {r.after.clicks}
      </td>
      <td>
        {r.before.scrolls} → {r.after.scrolls}
      </td>
      <td title={`${r.before.klmDeciSec} → ${r.after.klmDeciSec} klmDeciSec`}>
        {minutes(r.before.klmDeciSec)} → {minutes(r.after.klmDeciSec)}
      </td>
      <td>{percent(r.gapCapturedPct.actions)}</td>
      <td>{percent(r.gapCapturedPct.klmDeciSec)}</td>
      <td>
        {r.paired} / {r.floorTasks}
      </td>
    </tr>
  );
}
export function BenefitSummary({
  run,
  persona,
}: {
  run: RunData;
  persona: string;
}) {
  const benefit = benefitFor(run, persona);
  if (!benefit.perDay.length)
    return <p>Agent benefit vs vendor: no matched no-agent days available.</p>;
  return (
    <section aria-label="Agent benefit in actions and modeled time">
      <h3>Agent benefit vs vendor</h3>
      <p>
        {run.manifest.measurementProtocol ? "Blind even days. " : ""}Vendor →
        agent; costs use identical tasks both completed. Completion counts
        include failures. Modeled time is simulated effort, in minutes (600
        klmDeciSec per minute). Gap captured = (vendor − agent) / (vendor −
        floor); negative means worse. The floor is idealized, with no navigation
        or scrolling. Missing floors or nonpositive headroom are unavailable.
      </p>
      <div className="table-scroll">
        <table>
          <caption>{persona} · total and daily results</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Completed vendor → agent</th>
              <th scope="col">Clicks</th>
              <th scope="col">Scrolls</th>
              <th scope="col">Modeled min</th>
              <th scope="col">Action gap captured</th>
              <th scope="col">Time gap captured</th>
              <th scope="col">Paired / with floor</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Total" result={benefit.total} />
            {benefit.perDay.map((r) => (
              <Row key={r.day} label={`Day ${r.day}`} result={r.result} />
            ))}
          </tbody>
        </table>
      </div>
      {benefit.missing.length > 0 && (
        <p>
          Missing vendor controls: days {benefit.missing.join(", ")}; excluded
          from comparisons.
        </p>
      )}
    </section>
  );
}
