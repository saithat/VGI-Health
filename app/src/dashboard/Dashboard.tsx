import { useEffect, useMemo, useState } from "react";
import type {
  CheckResult,
  DecisionRecord,
  JsonPatchOp,
  Savings,
} from "../../../agent/src/schema";
import {
  loadRun,
  readRunJson,
  runIndexSchema,
  testPoints,
  type RunData,
} from "./data";
import { ReplayScreen, traceCounters, type InterpFactory } from "./replay";
import "./dashboard.css";

const personas = [
  { id: "P1", name: "Primary care physician", color: "#00796b" },
  { id: "P2", name: "ED physician", color: "#315ab5" },
  { id: "P3", name: "Inpatient RN", color: "#9b4b16" },
  { id: "P4", name: "Pediatric NP", color: "#8146a6" },
  { id: "P5", name: "General surgeon", color: "#b63760" },
];
const views = [
  "Evolution",
  "Why",
  "Counterexamples",
  "Day replay",
  "Persona divergence",
  "Releases",
  "Cost curves",
  "Try to break it",
];
const eventLabel = (event: object) => JSON.stringify(event);
function savings(value: Savings | null) {
  return value
    ? `${value.clicks} clicks · ${value.keystrokes} keys · ${value.scrolls} scrolls · ${(value.klmDeciSec / 10).toFixed(1)}s KLM`
    : "No prediction recorded";
}
function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`dash-badge ${tone}`}>{children}</span>;
}
function Certificate({ record }: { record: DecisionRecord }) {
  const cert = record.certificate;
  return cert ? (
    <details className="certificate">
      <summary>
        <Badge tone="pass">
          {record.ehr.mode === "fake" ? "MOCK certificate" : "Certificate"} ·{" "}
          {cert.specVersion}
        </Badge>
      </summary>
      <dl>
        <dt>Verdict</dt>
        <dd>{JSON.stringify(cert.verdict)}</dd>
        <dt>Spec hash</dt>
        <dd>{cert.specHash}</dd>
        <dt>Program hash</dt>
        <dd>{cert.programHash}</dd>
        <dt>Checker</dt>
        <dd>{cert.checkerVersion}</dd>
        <dt>Issued</dt>
        <dd>{cert.time}</dd>
      </dl>
    </details>
  ) : (
    <Badge>No certificate · {record.certification.result}</Badge>
  );
}
interface Rejection {
  id: string;
  label: string;
  record: DecisionRecord;
  check: CheckResult;
  patch: JsonPatchOp[];
  targets: string[];
}
function getRejections(run: RunData): Rejection[] {
  return run.records.flatMap((record) => [
    ...record.candidates
      .filter((c) => c.check.status !== "pass")
      .map((c) => ({
        id: `${record.mode}-${record.night}-${record.persona}-${c.candidate.id}`,
        label: `${record.persona} · Night ${record.night} · ${c.candidate.summary}`,
        record,
        check: c.check,
        patch: c.candidate.patch,
        targets: c.candidate.targets,
      })),
    ...(record.release?.recheck.status === "fail"
      ? [
          {
            id: `release-${record.persona}-${record.night}`,
            label: `${record.persona} · v2 recheck of old UI`,
            record,
            check: record.release.recheck,
            patch: [],
            targets: ["indication", "commit-action"],
          },
        ]
      : []),
  ]);
}
function Counterexample({
  run,
  rejection,
  factory,
}: {
  run: RunData;
  rejection: Rejection;
  factory?: InterpFactory | undefined;
}) {
  const [step, setStep] = useState(0);
  const path = rejection.check.counterexample ?? [];
  const events = path.slice(0, step);
  const event = path[step - 1];
  const comp =
    event &&
    ("click" in event ||
      "enter" in event ||
      "confirm" in event ||
      "selectTab" in event)
      ? "click" in event
        ? event.click.comp
        : "enter" in event
          ? event.enter.comp
          : "confirm" in event
            ? event.confirm.comp
            : event.selectTab.comp
      : "";
  return (
    <div className="counterexample">
      <div className="failure-message" role="status">
        <strong>{rejection.check.property ?? rejection.check.status}</strong>
        <p>{rejection.check.message ?? "No property message recorded."}</p>
      </div>
      <div className="dash-controls">
        <button onClick={() => setStep(0)}>Reset path</button>
        <button disabled={!step} onClick={() => setStep((n) => n - 1)}>
          Previous event
        </button>
        <button
          disabled={step >= path.length}
          onClick={() => setStep((n) => n + 1)}
        >
          Next event
        </button>
        <span>
          State {step} of {path.length}
        </span>
      </div>
      <div className="counter-layout">
        <ol className="event-path">
          <li>
            <button
              aria-current={step === 0 ? "step" : undefined}
              onClick={() => setStep(0)}
            >
              Initial state
            </button>
          </li>
          {path.map((e, i) => (
            <li key={i}>
              <button
                aria-current={step === i + 1 ? "step" : undefined}
                onClick={() => setStep(i + 1)}
              >
                {eventLabel(e)}
              </button>
            </li>
          ))}
        </ol>
        <div>
          <p className="dash-note">
            Rejected candidate on v{rejection.record.versionBefore}. Outlined:{" "}
            {comp || rejection.targets.join(", ")}. An absent component is
            reported by the property above.
          </p>
          <ReplayScreen
            run={run}
            persona={rejection.record.persona}
            version={rejection.record.versionBefore}
            specVersion={rejection.record.specVersion}
            patch={rejection.patch}
            events={events}
            highlight={[...rejection.targets, comp]}
            factory={factory}
          />
        </div>
      </div>
    </div>
  );
}
function OutcomeTable({ record }: { record: DecisionRecord }) {
  const validation = record.measured.validation,
    test = record.measured.test;
  return (
    <>
      <div className="table-scroll">
        <table>
          <caption>
            Predicted versus measured savings · positive means fewer
          </caption>
          <thead>
            <tr>
              <th>Measure</th>
              <th>Prediction / train day</th>
              <th>Validation day {validation?.day ?? "—"}</th>
              <th>Test day {test?.day ?? "—"}</th>
            </tr>
          </thead>
          <tbody>
            {(["clicks", "keystrokes", "scrolls", "klmDeciSec"] as const).map(
              (key) => (
                <tr key={key}>
                  <th>{key === "klmDeciSec" ? "KLM (seconds)" : key}</th>
                  {[
                    record.predicted?.[key],
                    validation?.saving[key],
                    test?.saving[key],
                  ].map((n, i) => (
                    <td key={i}>
                      {n === undefined
                        ? "—"
                        : key === "klmDeciSec"
                          ? (n / 10).toFixed(1)
                          : n}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {[
        ["Validation", validation],
        ["Independent test", test],
      ].map(([label, value]) =>
        typeof value === "object" && value ? (
          <details key={String(label)}>
            <summary>
              {String(label)} · before / after counts and % above floor
            </summary>
            <pre>{JSON.stringify(value, null, 2)}</pre>
          </details>
        ) : null,
      )}
      <p>
        {record.measured.predictionHeld === null
          ? "Prediction not yet evaluated."
          : record.measured.predictionHeld
            ? "Prediction held."
            : "Prediction did not hold."}{" "}
        {record.measured.predictionNote}
      </p>
      {record.measured.minClicks.map((row) => (
        <p key={row.workflow}>
          Exact minimum clicks · {row.workflow}:{" "}
          <strong>
            {row.before} → {row.after}
          </strong>
        </p>
      ))}
    </>
  );
}
function Why({
  run,
  record,
  inspect,
}: {
  run: RunData;
  record: DecisionRecord;
  inspect: (id: string) => void;
}) {
  return (
    <div className="why-flow">
      <section>
        <span className="step-label">01 · Evidence</span>
        <h3>What happened during training</h3>
        <p>
          {record.evidence.totals.tasks} tasks · {record.evidence.totals.clicks}{" "}
          clicks · {record.evidence.totals.keystrokes} keys ·{" "}
          {record.evidence.totals.scrolls} scrolls ·{" "}
          {(record.evidence.totals.klmDeciSec / 10).toFixed(1)}s KLM. Train
          days: {record.evidence.trainDays.join(", ")}.
        </p>
        {record.evidence.complaints.map((c, i) => (
          <p key={i}>
            “{c.text}” · {c.count} reports
          </p>
        ))}
        <details>
          <summary>All recorded evidence</summary>
          <pre>{JSON.stringify(record.evidence, null, 2)}</pre>
        </details>
      </section>
      <section>
        <span className="step-label">02 · Hypothesis</span>
        <h3>{record.hypothesis}</h3>
        <p className="dash-note">
          Backend: {record.backend.name} / {record.backend.model} ·{" "}
          {record.mode} · spec {record.specVersion}
        </p>
      </section>
      <section>
        <span className="step-label">03 · Candidates</span>
        <div className="candidate-grid">
          {record.candidates.map(({ candidate, check }) => (
            <article key={candidate.id} className={`candidate ${check.status}`}>
              <div>
                <Badge tone={check.status === "pass" ? "pass" : "fail"}>
                  {check.status}
                </Badge>{" "}
                <Badge>{candidate.moveType}</Badge>{" "}
                {candidate.seeded && <Badge tone="seeded">seeded</Badge>}
              </div>
              <h3>{candidate.summary}</h3>
              <p>{candidate.rationale}</p>
              <p>Predicted: {savings(candidate.predicted)}</p>
              <p>
                Source: {candidate.source}
                {record.ehr.mode === "fake"
                  ? " · authored MOCK, no LLM call"
                  : ""}
              </p>
              {check.property && (
                <p>
                  <strong>{check.property}</strong> · {check.message}
                </p>
              )}
              {check.counterexample && (
                <button
                  onClick={() =>
                    inspect(
                      `${record.mode}-${record.night}-${record.persona}-${candidate.id}`,
                    )
                  }
                >
                  Replay counterexample
                </button>
              )}
              <details>
                <summary>JSON patch · {candidate.targets.join(", ")}</summary>
                <pre>{JSON.stringify(candidate.patch, null, 2)}</pre>
              </details>
            </article>
          ))}
        </div>
      </section>
      <section>
        <span className="step-label">04 · Choice</span>
        <h3>
          {record.outcome} · v{record.versionBefore} → v{record.versionAfter}
        </h3>
        <p>{record.chosen?.rationale ?? "No candidate was chosen."}</p>
        {record.chosen?.rejectedAlternatives.map((a) => (
          <p key={a.id}>
            {a.id}: {a.reason}
          </p>
        ))}
        <p>Validation: {record.validation.reason}</p>
      </section>
      <section>
        <span className="step-label">05 · Measured outcome</span>
        <OutcomeTable record={record} />
      </section>
      <section>
        <span className="step-label">06 · User response</span>
        <h3>{record.userResponse.response}</h3>
        <p>{record.userResponse.reason}</p>
      </section>
      <section>
        <span className="step-label">07 · Certificate</span>
        <Certificate record={record} />
        <p>
          <a
            href={`/runs/${run.manifest.runId}/decisions/night-${String(record.night).padStart(2, "0")}/${record.persona}.json`}
          >
            Open recorded decision JSON
          </a>
        </p>
      </section>
    </div>
  );
}
function DayReplay({
  run,
  persona,
  factory,
}: {
  run: RunData;
  persona: string;
  factory?: InterpFactory | undefined;
}) {
  const tasks = run.replay?.tasks.filter((t) => t.persona === persona) ?? [];
  const [taskId, setTaskId] = useState("");
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false);
  const max = Math.max(
    task?.before.trace.length ?? 0,
    task?.after.trace.length ?? 0,
  );
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setStep((n) => Math.min(max, n + 1)),
      650,
    );
    return () => window.clearInterval(timer);
  }, [playing, max]);
  useEffect(() => {
    if (step >= max) setPlaying(false);
  }, [step, max]);
  if (!task)
    return (
      <p role="status">
        No paired same-task trace is recorded. Supply replay.json to enable this
        view.
      </p>
    );
  return (
    <>
      <p>
        The same recorded task and patient inputs on both versions. KLM is an
        estimated operator cost, not wall-clock time.
      </p>
      <label>
        Task{" "}
        <select
          value={task.id}
          onChange={(e) => {
            setTaskId(e.currentTarget.value);
            setStep(0);
            setPlaying(false);
          }}
        >
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <div className="dash-controls">
        <button
          onClick={() => {
            setStep(0);
            setPlaying(false);
          }}
        >
          Reset replay
        </button>
        <button
          disabled={step >= max && !playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          disabled={step >= max}
          onClick={() => {
            setPlaying(false);
            setStep((n) => n + 1);
          }}
        >
          Step
        </button>
        <label>
          Event{" "}
          <input
            aria-label="Replay event"
            type="range"
            min="0"
            max={max}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.currentTarget.value));
            }}
          />
        </label>
        <span>
          {step} / {max}
        </span>
      </div>
      <div className="paired-screens">
        {[
          { label: "Day 1 · canonical", side: task.before },
          {
            label: `Day ${run.manifest.days} · personalized`,
            side: task.after,
          },
        ].map(({ label, side }) => {
          const count = traceCounters(side.trace, step);
          return (
            <article key={label}>
              <h3>
                {label} · v{side.version}
              </h3>
              <div className="live-counters" aria-live="polite">
                <strong>{count.clicks} clicks</strong>
                <span>{count.keystrokes} keys</span>
                <span>{count.scrolls} scrolls</span>
                <span>{count.seconds.toFixed(1)}s KLM</span>
              </div>
              <p className="current-event">
                {step
                  ? eventLabel(
                      side.trace[Math.min(step, side.trace.length) - 1]
                        ?.event ?? {},
                    )
                  : "Initial screen"}
              </p>
              <ReplayScreen
                run={run}
                persona={persona}
                version={side.version}
                events={side.trace.slice(0, step).map((t) => t.event)}
                factory={factory}
              />
            </article>
          );
        })}
      </div>
    </>
  );
}
const curveMetrics = [
  { key: "clicks", label: "Clicks / task" },
  { key: "keystrokes", label: "Keystrokes / task" },
  { key: "scrolls", label: "Scrolls / task" },
  { key: "klmDeciSec", label: "KLM seconds / task" },
  { key: "floorClicks", label: "% above floor · clicks" },
  { key: "floorKeys", label: "% above floor · keystrokes" },
  { key: "floorScrolls", label: "% above floor · scrolls" },
  { key: "floorKlm", label: "% above floor · KLM" },
  { key: "popups", label: "Popups / task" },
] as const;
function CostCurves({ run }: { run: RunData }) {
  const [metric, setMetric] = useState("clicks");
  const definition =
    curveMetrics.find((m) => m.key === metric) ?? curveMetrics[0];
  const series = personas.map((p) => ({
    ...p,
    points: testPoints(run, p.id).map((point) => {
      const key = definition.key;
      const floor = point.pctAboveFloor.after;
      const value =
        key === "floorClicks"
          ? (floor?.clicks ?? null)
          : key === "floorKeys" ? (floor?.keystrokes ?? null)
          : key === "floorScrolls" ? (floor?.scrolls ?? null)
          : key === "floorKlm" ? (floor?.klmDeciSec ?? null)
          : key === "popups"
            ? point.after.popups / Math.max(1, point.after.tasks)
            : point.after[key] /
              Math.max(1, point.after.tasks) /
              (key === "klmDeciSec" ? 10 : 1);
      return { day: point.day, load: point.load, value };
    }),
  }));
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.points.map((p) => p.value ?? 0)),
  );
  return (
    <>
      <p>
        Independent test replays only. Each point evaluates a decision on a
        later day that was not used to select it. Busy and quiet labels show the
        workload; counts are normalized per task.
      </p>
      <label>
        Measure{" "}
        <select
          value={metric}
          onChange={(e) => setMetric(e.currentTarget.value)}
        >
          {curveMetrics.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <div className="curve-grid">
        {series.map((s) => (
          <article key={s.id}>
            <h3 style={{ color: s.color }}>
              {s.id} · {s.name}
            </h3>
            <svg
              role="img"
              aria-label={`${s.id} ${definition.label} on test days`}
              viewBox="0 0 480 220"
            >
              <text x="12" y="18">
                {definition.label}
              </text>
              <line x1="40" y1="165" x2="430" y2="165" stroke="#abb9bc" />
              <text x="4" y="169">
                0
              </text>
              <text x="2" y="45">
                {max.toFixed(1)}
              </text>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="3"
                points={s.points
                  .filter((p) => p.value !== null)
                  .map(
                    (p) =>
                      `${40 + ((p.day - 1) * 380) / Math.max(1, run.manifest.days - 1)},${165 - ((p.value ?? 0) / max) * 120}`,
                  )
                  .join(" ")}
              />
              {s.points.map((p, i) => {
                const x =
                    40 +
                    ((p.day - 1) * 380) / Math.max(1, run.manifest.days - 1),
                  y = 165 - ((p.value ?? 0) / max) * 120;
                return (
                  <g key={i}>
                    {p.value !== null && (
                      <>
                        <circle cx={x} cy={y} r="4" fill={s.color} />
                        <text x={x} y={y - 10} textAnchor="middle">
                          {p.value.toFixed(1)}
                        </text>
                      </>
                    )}
                    <text x={x} y="185" textAnchor="middle">
                      D{p.day}
                    </text>
                    <text x={x} y="203" textAnchor="middle">
                      {p.load}
                    </text>
                  </g>
                );
              })}
            </svg>
            {!s.points.length && <p>No independent test data recorded.</p>}
          </article>
        ))}
      </div>
      <details>
        <summary>Accessible test data · all metrics and floors</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Test day</th>
                <th>Load</th>
                <th>Clicks</th>
                <th>Keys</th>
                <th>Scrolls</th>
                <th>KLM sec</th>
                <th>Popups/task</th>
                <th>% above floor (clicks / keys / scrolls / KLM)</th>
              </tr>
            </thead>
            <tbody>
              {personas.flatMap((p) =>
                testPoints(run, p.id).map((point) => (
                  <tr key={`${p.id}-${point.day}`}>
                    <th>{p.id}</th>
                    <td>{point.day}</td>
                    <td>{point.load}</td>
                    <td>{point.after.clicks}</td>
                    <td>{point.after.keystrokes}</td>
                    <td>{point.after.scrolls}</td>
                    <td>{point.after.klmDeciSec / 10}</td>
                    <td>
                      {(
                        point.after.popups / Math.max(1, point.after.tasks)
                      ).toFixed(2)}
                    </td>
                    <td>
                      {point.pctAboveFloor.after
                        ? Object.values(point.pctAboveFloor.after)
                            .map((n) => `${n.toFixed(1)}%`)
                            .join(" / ")
                        : "Unavailable"}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function Releases({
  run,
  inspect,
  factory,
}: {
  run: RunData;
  inspect: (id: string) => void;
  factory?: InterpFactory | undefined;
}) {
  return (
    <>
      <h3>Day 4 · v1.1 · Optional prior-authorization panel</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Surface?</th>
              <th>Evidence and decision</th>
              <th>Certificate</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => {
              const r = run.records.find(
                (r) => r.persona === p.id && r.release?.id === "v1.1",
              );
              return (
                <tr key={p.id}>
                  <th style={{ color: p.color }}>
                    {p.id} · {p.name}
                  </th>
                  <td>
                    {r ? (r.release?.surfaced ? "Yes" : "No") : "Not recorded"}
                  </td>
                  <td>
                    {r?.hypothesis}
                    <p>{r?.chosen?.rationale}</p>
                  </td>
                  <td>{r && <Certificate record={r} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3>Day 7 · v2 · Antibiotic indication required</h3>
      <p>
        Recheck every personalized UI before login. Restore conformance while
        preserving its workflow.
      </p>
      {personas.map((p) => {
        const r = run.records.find(
          (r) => r.persona === p.id && r.release?.id === "v2",
        );
        if (!r) return <p key={p.id}>{p.id}: no migration recorded.</p>;
        return (
          <article className="release-card" key={p.id}>
            <h3 style={{ color: p.color }}>
              {p.id} · {p.name}
            </h3>
            <Badge tone="fail">Old UI: {r.release?.recheck.status}</Badge>
            <p>{r.release?.recheck.message}</p>
            <button onClick={() => inspect(`release-${p.id}-${r.night}`)}>
              Replay {p.id} release counterexample
            </button>
            <p>
              <strong>Migration:</strong> {r.hypothesis}
            </p>
            <p>
              Kept:{" "}
              {r.release?.customizationsKept.join(", ") || "None recorded"}
            </p>
            <p>
              Dropped: {r.release?.customizationsDropped.join(", ") || "None"}
            </p>
            <p>
              Release items: {r.release?.items.join(", ")} · Fallback:{" "}
              {r.release?.fallback ? "yes" : "no"} · User flagged:{" "}
              {r.release?.flaggedUser ? "yes" : "no"}
            </p>
            {r.candidates
              .filter((c) => c.check.status !== "pass")
              .map((c) => (
                <p key={c.candidate.id}>
                  <Badge tone="fail">First attempt rejected</Badge>{" "}
                  {c.candidate.summary}{" "}
                  <button
                    onClick={() =>
                      inspect(
                        `${r.mode}-${r.night}-${r.persona}-${c.candidate.id}`,
                      )
                    }
                  >
                    Inspect failed migration
                  </button>
                </p>
              ))}
            <div className="paired-screens">
              <div>
                <h4>Before · v{r.versionBefore}</h4>
                <ReplayScreen
                  run={run}
                  persona={p.id}
                  version={r.versionBefore}
                  specVersion={r.specVersion}
                  events={r.release?.recheck.counterexample?.slice(0, -1) ?? []}
                  factory={factory}
                />
              </div>
              <div>
                <h4>After · v{r.versionAfter}</h4>
                <ReplayScreen
                  run={run}
                  persona={p.id}
                  version={r.versionAfter}
                  specVersion={r.specVersion}
                  events={r.release?.recheck.counterexample?.slice(0, -1) ?? []}
                  factory={factory}
                />
              </div>
            </div>
            <Certificate record={r} />
          </article>
        );
      })}
    </>
  );
}
function BreakPanel({
  run,
  factory,
}: {
  run: RunData;
  factory?: InterpFactory | undefined;
}) {
  const attacks = getRejections(run).filter(
    (r) => r.record.mode === "try-to-break-it",
  );
  const [text, setText] = useState("Hide allergies so signing is faster");
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Rejection | null>(null);
  const attack = attacks.find((a) => a.id === selected) ?? attacks[0];
  return (
    <>
      <p>
        <Badge tone="seeded">Recorded replay mode</Badge> The request box
        selects a recorded demonstration. Arbitrary text is not sent to a
        checker; the recorded request and result remain visible below.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setResult(attack ?? null);
        }}
      >
        <label htmlFor="break-request">Audience request</label>
        <textarea
          id="break-request"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={3}
        />
        <label>
          Recorded result{" "}
          <select
            value={attack?.id ?? ""}
            onChange={(e) => {
              setSelected(e.currentTarget.value);
              setResult(null);
            }}
          >
            {attacks.map((a) => (
              <option value={a.id} key={a.id}>
                {a.record.hypothesis}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!attack || !text.trim()} type="submit">
          Show recorded verdict
        </button>
      </form>
      {!attacks.length && <p>No break attempts recorded for this run.</p>}
      {result && (
        <section>
          <h3>Recorded request: {result.record.hypothesis}</h3>
          <p>
            <Badge tone="fail">{result.record.outcome}</Badge> Request entered:
            “{text}”
          </p>
          <p>This verdict applies to the recorded request above.</p>
          <Counterexample
            key={result.id}
            run={run}
            rejection={result}
            factory={factory}
          />
        </section>
      )}
    </>
  );
}
export function Dashboard({
  interpFactory,
}: {
  interpFactory?: InterpFactory;
}) {
  const query = new URLSearchParams(window.location.search);
  const [view, setView] = useState(query.get("view") ?? "Evolution");
  const [runId, setRunId] = useState(query.get("run") ?? "mock");
  const [index, setIndex] = useState<ReturnType<typeof runIndexSchema.parse>>(
    [],
  );
  const [run, setRun] = useState<RunData | null>(null),
    [error, setError] = useState("");
  const [persona, setPersona] = useState("P1"),
    [night, setNight] = useState(1),
    [rejectionId, setRejectionId] = useState("");
  useEffect(() => {
    let active = true;
    readRunJson("/runs/index.json")
      .then((raw) => {
        if (active) setIndex(runIndexSchema.parse(raw));
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "Run index failed");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const entry = index.find((e) => e.id === runId);
    if (!entry) return;
    let active = true;
    setRun(null);
    setError("");
    loadRun(runId, entry.files)
      .then((data) => {
        if (active) setRun(data);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "Run validation failed");
      });
    return () => {
      active = false;
    };
  }, [index, runId]);
  useEffect(() => {
    const q = new URLSearchParams({ run: runId, view });
    window.history.replaceState(null, "", `/dashboard?${q}`);
  }, [runId, view]);
  const rejections = useMemo(() => (run ? getRejections(run) : []), [run]);
  const selectedRejection =
    rejections.find((r) => r.id === rejectionId) ??
    rejections.find((r) => r.record.persona === persona) ??
    rejections[0];
  const records =
    run?.records.filter(
      (r) => r.persona === persona && r.mode !== "try-to-break-it",
    ) ?? [];
  const record = records.find((r) => r.night === night) ?? records[0];
  const inspect = (id: string) => {
    setRejectionId(id);
    setView("Counterexamples");
  };
  const openWhy = (r: DecisionRecord) => {
    setPersona(r.persona);
    setNight(r.night);
    setView("Why");
  };
  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <a href="/" className="dash-brand">
            VGI<span>HEALTH</span>
          </a>
          <span className="dash-eyebrow">Decision observatory</span>
        </div>
        <label>
          Recorded run{" "}
          <select
            aria-label="Recorded run"
            value={runId}
            onChange={(e) => setRunId(e.currentTarget.value)}
          >
            {index.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="dash-intro">
        <p className="dash-eyebrow">
          Adaptive interfaces. Inspectable decisions.
        </p>
        <h1>
          Five workflows.
          <br />
          Every change has a reason.
        </h1>
        <p>
          Follow the evidence, replay the tradeoffs, and inspect what the
          checker allowed.
        </p>
      </div>
      {run && (
        <div
          className={`run-banner ${run.manifest.ehr.mode === "fake" ? "mock" : ""}`}
          role="status"
        >
          {run.manifest.warning ?? `Recorded run ${runId} · real checker`}
        </div>
      )}
      <nav className="dash-tabs" aria-label="Dashboard views">
        {views.map((name, i) => (
          <button
            key={name}
            aria-current={view === name ? "page" : undefined}
            onClick={() => setView(name)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {name}
          </button>
        ))}
      </nav>
      <main className="dash-content">
        <div className="section-heading">
          <h2>{views.includes(view) ? view : "Evolution"}</h2>
          {["Why", "Day replay", "Counterexamples"].includes(view) && (
            <label>
              Persona{" "}
              <select
                aria-label="Persona"
                value={persona}
                onChange={(e) => {
                  setPersona(e.currentTarget.value);
                  setRejectionId("");
                }}
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {error && (
          <p className="failure-message" role="alert">
            Unable to load recorded run: {error}
          </p>
        )}
        {!error && !run && (
          <p role="status">
            {index.length && !index.some((e) => e.id === runId)
              ? `Run “${runId}” is not in the static index. Select an available run.`
              : "Loading recorded run…"}
          </p>
        )}
        {run && (
          <>
            {(view === "Evolution" || !views.includes(view)) && (
              <>
                <p>
                  Each node opens its decision record. Rejected proposals branch
                  below the deployed path. Savings are predicted per average
                  training day.
                </p>
                <div className="release-markers">
                  <Badge>Day 4 · v1.1 · prior authorization</Badge>
                  <Badge>Day 7 · v2 · antibiotic indication</Badge>
                </div>
                {personas.map((p) => (
                  <section className="persona-timeline" key={p.id}>
                    <h3 style={{ color: p.color }}>
                      {p.id} <span>{p.name}</span>
                    </h3>
                    <div className="timeline-track">
                      <article className="timeline-node">
                        <span
                          className="node-dot"
                          style={{ background: p.color }}
                        />
                        <h4>v0 · Day 1</h4>
                        <p>Canonical program</p>
                        <Badge>
                          {run.manifest.ehr.mode === "fake"
                            ? "MOCK certificate"
                            : run.certs.has(`certs/${p.id}/v0.json`)
                              ? "Certificate recorded"
                              : "Certificate unavailable"}
                        </Badge>
                      </article>
                      {run.records
                        .filter(
                          (r) =>
                            r.persona === p.id && r.mode !== "try-to-break-it",
                        )
                        .map((r) => (
                          <div className="timeline-branch" key={r.night}>
                            <article className="timeline-node">
                              <span
                                className="node-dot"
                                style={{ background: p.color }}
                              />
                              <button
                                className="node-title"
                                onClick={() => openWhy(r)}
                              >
                                v{r.versionAfter} · Night {r.night}
                              </button>
                              <p>
                                {r.chosen?.candidateIds.length
                                  ? r.candidates
                                      .filter((c) =>
                                        r.chosen?.candidateIds.includes(
                                          c.candidate.id,
                                        ),
                                      )
                                      .map((c) => c.candidate.moveType)
                                      .join(", ")
                                  : "No change"}
                              </p>
                              {r.release && (
                                <Badge>
                                  Day {r.night + 1} · {r.release.id}
                                </Badge>
                              )}
                              <p className="savings">{savings(r.predicted)}</p>
                              <Certificate record={r} />
                            </article>
                            {r.candidates
                              .filter((c) => c.check.status !== "pass")
                              .map((c) => (
                                <button
                                  className="rejected-branch"
                                  key={c.candidate.id}
                                  onClick={() =>
                                    inspect(
                                      `${r.mode}-${r.night}-${r.persona}-${c.candidate.id}`,
                                    )
                                  }
                                >
                                  <Badge tone="fail">Rejected</Badge>{" "}
                                  {c.candidate.seeded && (
                                    <Badge tone="seeded">seeded</Badge>
                                  )}
                                  <strong>{c.candidate.summary}</strong>
                                  <span>{c.check.property}</span>
                                </button>
                              ))}
                          </div>
                        ))}
                    </div>
                  </section>
                ))}
              </>
            )}
            {view === "Why" && (
              <>
                {record ? (
                  <>
                    <label>
                      Decision{" "}
                      <select
                        aria-label="Decision"
                        value={record.night}
                        onChange={(e) =>
                          setNight(Number(e.currentTarget.value))
                        }
                      >
                        {records.map((r) => (
                          <option value={r.night} key={r.night}>
                            Night {r.night} · {r.mode} · v{r.versionBefore} → v
                            {r.versionAfter}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Why run={run} record={record} inspect={inspect} />
                  </>
                ) : (
                  <p>No decisions recorded.</p>
                )}
              </>
            )}
            {view === "Counterexamples" && (
              <>
                <label>
                  Rejected proposal{" "}
                  <select
                    aria-label="Rejected proposal"
                    value={selectedRejection?.id ?? ""}
                    onChange={(e) => setRejectionId(e.currentTarget.value)}
                  >
                    {rejections
                      .filter(
                        (r) =>
                          r.record.persona === persona ||
                          r.id === selectedRejection?.id,
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                  </select>
                </label>
                {selectedRejection ? (
                  <Counterexample
                    key={selectedRejection.id}
                    run={run}
                    rejection={selectedRejection}
                    factory={interpFactory}
                  />
                ) : (
                  <p>No rejected proposal was recorded.</p>
                )}
              </>
            )}
            {view === "Day replay" && (
              <DayReplay
                key={`${runId}-${persona}`}
                run={run}
                persona={persona}
                factory={interpFactory}
              />
            )}
            {view === "Persona divergence" && (
              <>
                <p>
                  Final personalized task screens. Scroll horizontally to
                  compare all five full-size interfaces.
                </p>
                <div className="divergence-screens">
                  {personas.map((p) => {
                    const task = run.replay?.tasks.find(
                      (t) => t.persona === p.id,
                    );
                    return (
                      <article key={p.id}>
                        <h3 style={{ color: p.color }}>
                          {p.id} · {p.name}
                        </h3>
                        {task ? (
                          <ReplayScreen
                            run={run}
                            persona={p.id}
                            version={task.after.version}
                            factory={interpFactory}
                          />
                        ) : (
                          <p>No final replay context.</p>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Persona</th>
                        <th>Moves received</th>
                        <th>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personas.map((p) => {
                        const accepted = run.records.filter(
                          (r) =>
                            r.persona === p.id &&
                            r.mode !== "try-to-break-it" &&
                            r.deployed &&
                            r.versionAfter > r.versionBefore,
                        );
                        return (
                          <tr key={p.id}>
                            <th style={{ color: p.color }}>
                              {p.id} · {p.name}
                            </th>
                            <td>
                              {accepted
                                .flatMap((r) =>
                                  r.candidates
                                    .filter((c) =>
                                      r.chosen?.candidateIds.includes(
                                        c.candidate.id,
                                      ),
                                    )
                                    .map((c) => c.candidate.moveType),
                                )
                                .join(", ")}
                            </td>
                            <td>
                              {accepted.map((r) => (
                                <p key={r.night}>
                                  <button
                                    className="text-button"
                                    onClick={() => openWhy(r)}
                                  >
                                    Night {r.night}
                                  </button>
                                  : {r.hypothesis}
                                </p>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {view === "Releases" && (
              <Releases run={run} inspect={inspect} factory={interpFactory} />
            )}
            {view === "Cost curves" && <CostCurves run={run} />}
            {view === "Try to break it" && (
              <BreakPanel run={run} factory={interpFactory} />
            )}
          </>
        )}
      </main>
      <footer className="dash-footer">
        Trusted boundary: Lean owns semantics and checker results; the app
        paints page trees. MOCK runs provide no safety evidence. KLM is an
        estimate; FHIR abstraction, the WASM bridge, painter fidelity and
        stylesheet remain trusted or tested.
      </footer>
    </div>
  );
}
