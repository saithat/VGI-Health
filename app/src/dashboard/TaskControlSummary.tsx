import type { TrajectoryEntry } from "./trajectories-data";
import { clickSavings, type ControlMetrics } from "./trajectory-filter";

export function TaskControlSummary({
  entry,
  control,
  title = "Same task without the agent",
}: {
  entry: TrajectoryEntry;
  control: ControlMetrics | undefined;
  title?: string;
}) {
  const savings = clickSavings(entry, control);
  return (
    <section
      className="trajectory-control-summary"
      aria-label="Same task agent versus control"
    >
      <h3>{title}</h3>
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
                    <td>
                      {metrics.mouseTravelPx === null ||
                      metrics.mouseTravelPx === undefined
                        ? "—"
                        : Math.round(metrics.mouseTravelPx).toLocaleString(
                            "en-US",
                          )}
                    </td>
                    <td>{metrics.completed ? "Completed" : "Incomplete"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p>
            {savings === null
              ? "Savings unavailable: both arms must complete and control clicks must be nonzero."
              : control.clicks === entry.metrics.clicks
                ? "Same clicks with and without the agent."
                : `${savings.toFixed(1)}% fewer clicks vs no-agent (${control.clicks - entry.metrics.clicks} clicks saved).`}{" "}
            Same persona, day and task id; simulated outcomes.
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
