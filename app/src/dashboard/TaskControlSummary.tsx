import type { TrajectoryEntry } from "./trajectories-data";
import { clickSavings, type ControlMetrics } from "./trajectory-filter";

export function TaskControlSummary({
  entry,
  control,
}: {
  entry: TrajectoryEntry;
  control: ControlMetrics | undefined;
}) {
  const savings = clickSavings(entry, control);
  return (
    <section
      className="trajectory-control-summary"
      aria-label="Same task agent versus control"
    >
      <h3>Same task · recorded agent arm vs no-agent control</h3>
      {control ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Arm</th>
                <th>Clicks</th>
                <th>Scrolls</th>
                <th>Mouse travel · px</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Recorded", metrics: entry.metrics },
                { label: "No-agent", metrics: control },
              ].map(({ label, metrics }) => {
                return (
                  <tr key={String(label)}>
                    <th>{String(label)}</th>
                    <td>{metrics.clicks}</td>
                    <td>{metrics.scrolls}</td>
                    <td>{metrics.mouseTravelPx ?? "—"}</td>
                    <td>{metrics.completed ? "Completed" : "Incomplete"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>
            {savings === null
              ? "Savings unavailable: both arms must complete and control clicks must be nonzero."
              : `${savings.toFixed(1)}% fewer clicks vs no-agent (${control.clicks - entry.metrics.clicks} clicks saved).`}{" "}
            Same persona, day and task id. These are simulated outcomes.
          </p>
        </>
      ) : (
        <p>No same-task no-agent result recorded.</p>
      )}
      {!entry.completed && (
        <p className="trajectory-incomplete-note">
          Incomplete trajectory · the recorded task did not meet its goals.
        </p>
      )}
    </section>
  );
}
