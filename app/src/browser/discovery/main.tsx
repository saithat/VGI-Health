import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadDiscoveryRun } from "../data";
import type { Run } from "./types";
import "./style.css";
const frame = (id: string) => `./frame.html?id=${encodeURIComponent(id)}`;
function App() {
  const [run, setRun] = useState<Run>(),
    [error, setError] = useState(""),
    [full, setFull] = useState<string | null>(null);
  useEffect(() => {
    void loadDiscoveryRun()
      .then(setRun)
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const preview = (id: string, label: string) => (
    <div className="preview">
      <div className="canvas">
        <iframe title={label} src={frame(id)} loading="lazy" />
      </div>
      <button onClick={() => setFull(id)}>Open full size {label}</button>
    </div>
  );
  return (
    <main className="overview">
      <header>
        <p className="eyebrow">VGI HEALTH · INTERFACE RESEARCH</p>
        <h1>Lean nightly designs</h1>
        <p>Each simulated clinician gets a design shaped by their own work.</p>
        <p className="notice">
          Lean geometry only · No browser screen certification · The deployed
          app still paints with React. These synthetic experiments do not
          establish clinical benefit.
        </p>
        {run && (
          <p>
            {run.runId} · {run.mode} · {run.status}
          </p>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {run?.personas.map((p) => (
        <section key={p.id}>
          <h2>{p.id}</h2>
          <p>{p.description}</p>
          <table>
            <caption>Daily effort against the no-agent version</caption>
            <thead>
              <tr>
                <th>Day / version</th>
                <th>Clicks: no agent → agent</th>
                <th>Scrolls: no agent → agent</th>
                <th>Completed: no agent → agent</th>
              </tr>
            </thead>
            <tbody>
              {p.days.map((d) => (
                <tr key={d.day}>
                  <th scope="row">
                    Day {d.day} / v{d.version}
                  </th>
                  <td>
                    {d.noAgent.clicks} → {d.agent.clicks}
                  </td>
                  <td>
                    {d.noAgent.scrolls} → {d.agent.scrolls}
                  </td>
                  <td>
                    {d.noAgent.completed}/{d.noAgent.tasks} →{" "}
                    {d.agent.completed}/{d.agent.tasks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!p.versions.length && (
            <p>No changed version shipped in the recorded nights.</p>
          )}
          {p.versions.map((v) => (
            <article key={v.version}>
              <h3>
                Version {v.version} · after night {v.night}
              </h3>
              <p className="reason">{v.reason}</p>
              {v.screens.map((s) => (
                <div key={s.screen}>
                  <h4>
                    {s.title} <span>{s.screen}</span>
                  </h4>
                  <div className="comparison">
                    <div>
                      <p>Before</p>
                      {s.before ? (
                        preview(
                          s.before,
                          `${p.id} v${v.version} ${s.title} before`,
                        )
                      ) : (
                        <p>{s.unavailable}</p>
                      )}
                    </div>
                    <div>
                      <p>After</p>
                      {s.after ? (
                        preview(
                          s.after,
                          `${p.id} v${v.version} ${s.title} after`,
                        )
                      ) : (
                        <p>{s.unavailable}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </article>
          ))}
        </section>
      ))}
      {full && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full size Lean screen"
          className="full"
        >
          <button autoFocus onClick={() => setFull(null)}>
            Close full size
          </button>
          <iframe title="Full size screen" src={frame(full)} />
        </div>
      )}
    </main>
  );
}
const element = document.getElementById("root");
if (!element) throw Error("Missing root");
createRoot(element).render(<App />);
