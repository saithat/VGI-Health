import { WorkloadClock } from "./WorkloadClock";
import { InterruptionWork } from "./InterruptionWork";
import { watchRun, isRunning } from "./run-refresh";
import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import { RuleConformanceBadge } from "./RuleConformance";
import {
  EvolutionSummary,
  InfoTip,
  delta,
  deltaTone,
  round,
} from "./EvolutionSummary";
import { AppHeader } from "../ehr/ui/AppHeader";
import { loadWasmInterp } from "../core/wasmInterp";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type {
  CheckResult,
  DecisionRecord,
  JsonPatchOp,
  Savings,
} from "./agent-evidence";
import {
  loadRunDetails,
  breakCapability,
  submitBreakAttempt,
  defaultRunSchema,
  readRunJson,
  runIndexSchema,
  type RunData,
} from "./data";
import { ReplayScreen, type InterpFactory } from "./replay";
import "./dashboard.css";
import "./evolution.css";
const Trajectories = lazy(() =>
  import("./Trajectories").then((m) => ({ default: m.Trajectories })),
);
const CompareTrajectories = lazy(() =>
  import("./CompareTrajectories").then((m) => ({
    default: m.CompareTrajectories,
  })),
);
import { WorkflowComplexity, personas } from "./WorkflowComplexity";
import { Drawer, Modal } from "@mantine/core";
import { programAt } from "./data";
import { workloadAt, versionsFor } from "./workload";

const views = [
  "Evolution",
  "Trajectories",
  "Compare",
  "Releases",
  "Try to break it",
];
const eventLabel = (event: object) => JSON.stringify(event);
function savings(value: Savings | null) {
  return value
    ? `${value.clicks} clicks · ${value.scrolls} scrolls · ${value.scrollPx == null || value.mouseTravelPx == null ? "pixel metrics not measured for archived runs" : `${value.scrollPx}px scroll · ${value.mouseTravelPx}px mouse`} · ${value.keystrokes} keys (secondary)`
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
          {releaseLabel(cert.specVersion, record.runId)}
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
  summary: string;
  record: DecisionRecord;
  check: CheckResult;
  patch: JsonPatchOp[];
  targets: string[];
}
function getRejections(run: RunData): Rejection[] {
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
  const [manualEvents, setManualEvents] = useState<
    import("../../../lean/generated/ehr-types").Event[]
  >([]);
  const path = rejection.check.counterexample ?? [];
  const events = [...path.slice(0, step), ...manualEvents];
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
        <button
          disabled={!step && !manualEvents.length}
          title={
            !step && !manualEvents.length
              ? "Already at the initial state"
              : undefined
          }
          onClick={() => {
            setStep(0);
            setManualEvents([]);
          }}
        >
          Reset path
        </button>
        <button
          disabled={!step}
          title={!step ? "Already at the first event" : undefined}
          onClick={() => {
            setStep((n) => n - 1);
            setManualEvents([]);
          }}
        >
          Previous event
        </button>
        <button
          disabled={step >= path.length}
          title={step >= path.length ? "No more recorded events" : undefined}
          onClick={() => {
            setStep((n) => n + 1);
            setManualEvents([]);
          }}
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
              disabled={step === 0 && !manualEvents.length}
              title={
                step === 0 && !manualEvents.length ? "Current state" : undefined
              }
              onClick={() => {
                setStep(0);
                setManualEvents([]);
              }}
            >
              Initial state
            </button>
          </li>
          {path.map((e, i) => (
            <li key={i}>
              <button
                aria-current={step === i + 1 ? "step" : undefined}
                disabled={step === i + 1 && !manualEvents.length}
                title={
                  step === i + 1 && !manualEvents.length
                    ? "Current event"
                    : undefined
                }
                onClick={() => {
                  setStep(i + 1);
                  setManualEvents([]);
                }}
              >
                {eventLabel(e)}
              </button>
            </li>
          ))}
        </ol>
        <div>
          <p className="dash-note">
            Rejected candidate on rev {rejection.record.versionBefore}.
            Outlined: {comp || rejection.targets.join(", ")}. An absent
            component is reported by the property above.
          </p>
          <ReplayScreen
            run={run}
            persona={rejection.record.persona}
            version={rejection.record.versionBefore}
            specVersion={rejection.record.specVersion}
            patch={rejection.patch}
            events={events}
            onEvent={(event) =>
              setManualEvents((current) => [...current, event])
            }
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
            {(
              [
                "clicks",
                "scrolls",
                "scrollPx",
                "mouseTravelPx",
                "keystrokes",
              ] as const
            ).map((key) => (
              <tr key={key}>
                <th>{key}</th>
                {[
                  record.predicted?.[key],
                  validation?.saving[key],
                  test?.saving[key],
                ].map((n, i) => (
                  <td key={i}>{n === undefined || n === null ? "—" : n}</td>
                ))}
              </tr>
            ))}
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
  const decisionPath = `decisions/night-${String(record.night).padStart(2, "0")}/${record.persona}.json`;
  return (
    <div className="why-flow">
      <section>
        <span className="step-label">01 · Evidence</span>
        <h3>What happened during training</h3>
        <p>
          {record.evidence.totals.tasks} tasks · {record.evidence.totals.clicks}{" "}
          clicks · {record.evidence.totals.keystrokes} keys ·{" "}
          {record.evidence.totals.scrolls} scrolls ·{" "}
          {record.evidence.totals.mouseTravelPx == null ||
          record.evidence.totals.scrollPx == null
            ? "Pixel metrics not measured for archived runs."
            : `${record.evidence.totals.mouseTravelPx}px mouse travel · ${record.evidence.totals.scrollPx}px scroll.`}{" "}
          Train days: {record.evidence.trainDays.join(", ")}.
        </p>
        {record.exploration && <p>
          Checker rejection rate: {record.exploration.checker.rate === null ? 'no proposals' : `${(record.exploration.checker.rate * 100).toFixed(1)}%`}
          {' '}({record.exploration.checker.checkerRejected} native rejections, {record.exploration.checker.invalid} invalid proposals / {record.exploration.checker.proposed}).
          {' '}Net effect floor: {record.exploration.minimumEffect}/day.
          {' '}Selected structural distance: {record.exploration.selectedDistance?.toFixed(3) ?? 'none'}.
        </p>}
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
          {record.mode} · spec{" "}
          {releaseLabel(record.specVersion, run.manifest.runId)}
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
          {record.outcome} · rev {record.versionBefore} → rev{" "}
          {record.versionAfter}
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
        {(!run.files || run.files.includes(decisionPath)) && (
          <p>
            <a href={`/runs/${run.manifest.runId}/${decisionPath}`}>
              Open recorded decision JSON
            </a>
          </p>
        )}
      </section>
    </div>
  );
}

/** Paint the modal's loading state before doing synchronous Lean rendering. */
function DeferredReplay({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setReady(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  return ready ? children : <p role="status">Rendering recorded EHR…</p>;
}

function BeforeAfter({
  run,
  persona,
  record,
  rejection,
  factory,
}: {
  run: RunData;
  persona: string;
  record: DecisionRecord | null;
  rejection?: Rejection | undefined;
  factory?: InterpFactory | undefined;
}) {
  const before = record?.versionBefore ?? 0;
  const after = rejection ? before : (record?.versionAfter ?? 0);
  const prefix = record?.release?.recheck.counterexample?.slice(0, -1) ?? [];
  const [beforeEvents, setBeforeEvents] = useState(prefix);
  const [afterEvents, setAfterEvents] = useState(prefix);
  const [step, setStep] = useState(0);
  // Exported traces are simulated against the exact projected patient context.
  // Older authored mock data retains the per-version day-trace fallback.
  const traceFor = (version: number) => {
    const context = run.replay?.contexts.find(
      (c) => c.persona === persona && c.version === version,
    );
    if (context?.trace) return context.trace;
    const day = run.days.find(
      (d) => d.persona === persona && d.programVersion === version,
    );
    const id = day?.tasks[0]?.task;
    return day?.trace.filter((t) => t.task === id).map((t) => t.event) ?? [];
  };
  const beforeTrace = traceFor(before),
    afterTrace = traceFor(after);
  const max = Math.max(beforeTrace.length, afterTrace.length);
  return (
    <div className="dash-review">
      <p>
        Interpreter comparison: exported traces use the same projected patient
        and episode in both versions. Older authored examples can use different
        recorded tasks. Next task event advances each available trace
        independently; a pane with no further recorded events stays still. Event
        positions do not align clinical milestones.
      </p>
      <div className="dash-controls">
        <button
          disabled={
            !step &&
            JSON.stringify(beforeEvents) === JSON.stringify(prefix) &&
            JSON.stringify(afterEvents) === JSON.stringify(prefix)
          }
          title={
            !step &&
            JSON.stringify(beforeEvents) === JSON.stringify(prefix) &&
            JSON.stringify(afterEvents) === JSON.stringify(prefix)
              ? "Screens are already reset"
              : undefined
          }
          onClick={() => {
            setStep(0);
            setBeforeEvents(prefix);
            setAfterEvents(prefix);
          }}
        >
          Reset screens
        </button>
        <button
          disabled={step >= max || !!rejection}
          title={
            rejection
              ? "Use the counterexample path for a rejected proposal"
              : step >= max
                ? "No more task events recorded for these versions"
                : undefined
          }
          onClick={() => {
            const next = step + 1;
            setStep(next);
            setBeforeEvents(beforeTrace.slice(0, next));
            setAfterEvents(afterTrace.slice(0, next));
          }}
        >
          Next task event
        </button>
        <span>
          Event {step} / {max}
        </span>
      </div>
      <div className="paired-screens">
        <section aria-label="Before EHR">
          <h3>Before · rev {before}</h3>
          <ReplayScreen
            run={run}
            persona={persona}
            version={before}
            specVersion={
              record?.specVersion ?? programAt(run, persona, before).specVersion
            }
            events={beforeEvents}
            factory={factory}
            onEvent={(e) => setBeforeEvents((events) => [...events, e])}
          />
        </section>
        <section aria-label="After EHR">
          <h3>
            {rejection ? "Rejected proposal" : "After"} · rev {after}
          </h3>
          <ReplayScreen
            run={run}
            persona={persona}
            version={after}
            specVersion={
              record?.specVersion ?? programAt(run, persona, before).specVersion
            }
            patch={rejection?.patch ?? []}
            events={afterEvents}
            factory={factory}
            onEvent={(e) => setAfterEvents((events) => [...events, e])}
          />
        </section>
      </div>
    </div>
  );
}
const releaseNames: Record<string, string> = {
  v2: "Prior authorization",
  v3: "Antibiotic indication policy",
};
/** Recorded kept customizations read "night N: a.; b."; show one item per change. */
function customizationItems(entries: string[]) {
  return entries.map((entry) => {
    const match = /^(night \d+):\s*(.*)$/i.exec(entry);
    return {
      night: match?.[1] ?? "",
      items: (match?.[2] ?? entry)
        .split(/;\s+/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
  });
}
function Releases({
  run,
  open,
}: {
  run: RunData;
  open: (record: DecisionRecord) => void;
}) {
  const releaseIds = ["v2", "v3"];
  const find = (persona: string, release: string) =>
    run.records.find(
      (r) =>
        r.persona === persona &&
        r.release &&
        releaseLabel(r.release.id, run.manifest.runId) === release,
    );
  const cells = personas.flatMap((p) =>
    releaseIds.flatMap((release) => {
      const record = find(p.id, release);
      return record ? [{ persona: p, release, record }] : [];
    }),
  );
  const [selected, setSelected] = useState(
    () =>
      (
        cells.find((c) => c.record.release?.recheck.status === "fail") ??
        cells[0]
      )?.record ?? null,
  );
  const detail = cells.find((c) => c.record === selected);
  return (
    <div className="releases">
      <div className="release-summary">
        {releaseIds.map((release) => {
          const here = cells.filter((c) => c.release === release);
          const failed = here.filter(
            (c) => c.record.release?.recheck.status === "fail",
          ).length;
          const certified = here.filter((c) => c.record.certificate).length;
          return (
            <div key={release} className="summary-tile">
              <span className="summary-label">
                {release} · {releaseNames[release] ?? "Vendor release"}
              </span>
              <strong className="summary-value">
                {here.length
                  ? `${certified} of ${here.length} re-certified`
                  : "Not reached"}
              </strong>
              <span className="summary-detail">
                {here.length
                  ? failed
                    ? `Old UI failed the new rules for ${failed} of ${here.length} personas, so each was migrated`
                    : `Old UI already met the new rules for all ${here.length} personas`
                  : "No persona reached this release in this run"}
              </span>
            </div>
          );
        })}
      </div>
      <table className="release-grid">
        <caption>
          Did each persona’s existing UI pass the new release, and is the result
          certified? Select a cell for details.
        </caption>
        <thead>
          <tr>
            <th scope="col">Persona</th>
            {releaseIds.map((release) => (
              <th key={release} scope="col">
                {release} · {releaseNames[release] ?? "Vendor release"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                {p.name} <span className="page-heading-id">{p.id}</span>
              </th>
              {releaseIds.map((release) => {
                const r = find(p.id, release);
                if (!r)
                  return (
                    <td key={release} className="release-cell-empty">
                      No migration recorded
                    </td>
                  );
                const passed = r.release?.recheck.status === "pass";
                const kept = customizationItems(
                  r.release?.customizationsKept ?? [],
                ).reduce((n, k) => n + k.items.length, 0);
                const dropped = r.release?.customizationsDropped.length ?? 0;
                return (
                  <td key={release}>
                    <div
                      className={`release-cell ${selected === r ? "selected" : ""}`}
                    >
                      <button
                        className="release-cell-select"
                        aria-pressed={selected === r}
                        onClick={() => setSelected(r)}
                      >
                        <span className={passed ? "flat" : "migrated"}>
                          {passed ? "Old UI passed" : "Old UI failed"}
                        </span>
                        <span className={r.certificate ? "status-ok" : ""}>
                          {r.certificate
                            ? `✓ Certified ${releaseLabel(r.certificate.specVersion, run.manifest.runId)}`
                            : r.certification.result}
                        </span>
                        <span className="effect-caption">
                          {kept
                            ? `${kept} customization${kept === 1 ? "" : "s"} kept`
                            : "No customizations to carry"}
                          {dropped ? ` · ${dropped} dropped` : ""}
                        </span>
                      </button>
                      <button
                        className="release-replay"
                        aria-label={`Inspect ${p.id} ${release} migration`}
                        title="Replay before / after on screen"
                        onClick={() => open(r)}
                      >
                        Replay
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {detail && (
        <section className="release-detail" aria-label="Migration details">
          <h3>
            {detail.persona.name} · {detail.release}{" "}
            {releaseNames[detail.release] ?? "release"}
          </h3>
          <div className="release-detail-grid">
            <div>
              <h4>
                {detail.record.release?.recheck.status === "pass"
                  ? "Why no migration was needed"
                  : "What the migration changed"}
              </h4>
              <p>
                {detail.record.chosen?.rationale ?? detail.record.hypothesis}
              </p>
              {detail.record.release?.recheck.status === "fail" &&
                detail.record.release.recheck.property && (
                  <p className="effect-caption">
                    Old UI broke rule{" "}
                    <strong>{detail.record.release.recheck.property}</strong>
                  </p>
                )}
              <button onClick={() => open(detail.record)}>
                Replay before / after
              </button>
            </div>
            <div>
              <h4>Customizations kept</h4>
              {detail.record.release?.customizationsKept.length ? (
                customizationItems(
                  detail.record.release.customizationsKept,
                ).map((k, i) => (
                  <div key={i} className="kept-group">
                    {k.night && (
                      <span className="effect-caption">{k.night}</span>
                    )}
                    <ul>
                      {k.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="effect-caption">
                  None — this persona had no customizations yet.
                </p>
              )}
              <h4>Dropped</h4>
              {detail.record.release?.customizationsDropped.length ? (
                <ul>
                  {detail.record.release.customizationsDropped.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="effect-caption">Nothing dropped.</p>
              )}
              <Certificate record={detail.record} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
function BreakPanel({
  run,
  replay,
  persona,
}: {
  run: RunData;
  persona: string;
  replay: (rejection: Rejection) => void;
}) {
  const attacks = getRejections(run).filter(
    (r) => !r.id.startsWith("release-"),
  );
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Rejection | null>(null);
  const attack = attacks.find((a) => a.id === selected) ?? attacks[0];
  const [capability, setCapability] = useState({
    available: false,
    reason: "Checking local agent…",
  });
  const [request, setRequest] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void breakCapability()
      .then((c) =>
        setCapability({ available: c.available, reason: c.reason ?? "" }),
      )
      .catch((e) => setCapability({ available: false, reason: String(e) }));
  }, []);
  async function attempt() {
    setPending(true);
    setMessage("Running agent and checker…");
    try {
      const response = await submitBreakAttempt(
        persona,
        request,
        run.manifest.runId,
      );
      setMessage(
        `${response.verdict}: ${response.property ?? ""} ${response.message ?? response.agentSays}`,
      );
      const record = [...run.records]
        .reverse()
        .find((r) => r.persona === persona);
      if (record && response.candidate)
        setResult({
          id: "live-attempt",
          label: response.request,
          summary: response.candidate.summary,
          record: { ...record, versionBefore: record.versionAfter },
          check: {
            status: response.verdict,
            property: response.property,
            message: response.message,
            counterexample: response.counterexample,
            screens: null,
            verdict: null,
          },
          patch: response.candidate.patch,
          targets: [],
        });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  const rules = [
    ...attacks
      .reduce((counts, a) => {
        const rule = a.check.property ?? a.check.status;
        return counts.set(rule, (counts.get(rule) ?? 0) + 1);
      }, new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1]);
  return (
    <div className="break-panel">
      <p className="break-intro">
        Every proposal here was blocked by the checker before it reached a
        clinician. Pick one to see which safety rule it broke, then replay the
        counterexample on the EHR.
      </p>
      {rules.length > 0 && (
        <div className="break-rules" aria-label="Rules broken in this run">
          <span className="summary-label">
            {attacks.length} rejected proposal{attacks.length === 1 ? "" : "s"}{" "}
            in this run
          </span>
          {rules.map(([rule, count]) => (
            <span key={rule} className="break-rule">
              {rule} <strong>×{count}</strong>
            </span>
          ))}
        </div>
      )}
      <form
        className="break-form"
        onSubmit={(e) => {
          e.preventDefault();
          setResult(attack ?? null);
        }}
      >
        <label>
          Recorded proposal{" "}
          <select
            value={attack?.id ?? ""}
            disabled={!attacks.length}
            title={
              !attacks.length ? "No recorded proposals in this run" : undefined
            }
            onChange={(e) => {
              setSelected(e.currentTarget.value);
              setResult(null);
            }}
          >
            {attacks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!attack || result?.id === attack.id}
          title={
            !attack
              ? "No recorded proposal available"
              : result?.id === attack.id
                ? "Already showing this recorded verdict"
                : undefined
          }
        >
          Show recorded verdict
        </button>
      </form>
      {!attacks.length && <p>No rejected proposals recorded in this run.</p>}
      {result && (
        <section className="break-result">
          <span className="summary-label">
            {result.check.status === "pass"
              ? "Accepted"
              : result.check.status === "invalid-patch"
                ? "Invalid patch"
                : "Rejected"}
          </span>
          <h3>{result.summary || result.label}</h3>
          <div className="failure-message">
            <strong>{result.check.property ?? result.check.status}</strong>
            <p>{result.check.message}</p>
          </div>
          {result.check.status === "fail" &&
          result.check.counterexample !== null ? (
            <p className="break-replay">
              <button onClick={() => replay(result)}>
                Replay counterexample
              </button>
              <span className="effect-caption">
                {result.check.counterexample?.length ?? 0} recorded events that
                reach the unsafe state
              </span>
            </p>
          ) : (
            <p className="effect-caption">
              No counterexample was returned for this verdict.
            </p>
          )}
        </section>
      )}
      <section className="break-live">
        <h3>Try your own</h3>
        {capability.available && run.manifest.ehr.mode === "real" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void attempt();
            }}
          >
            <label>
              Live request{" "}
              <textarea
                value={request}
                rows={3}
                maxLength={2000}
                placeholder={`Ask the ${persona} agent for a UI change, e.g. “hide the allergy panel to save a click”`}
                onChange={(e) => setRequest(e.currentTarget.value)}
              />
            </label>
            <button
              type="submit"
              disabled={pending || !request.trim()}
              title={
                pending
                  ? "An attempt is running"
                  : !request.trim()
                    ? "Enter a request first"
                    : undefined
              }
            >
              Run live attempt
            </button>
          </form>
        ) : (
          <p className="effect-caption">
            Live attempts are unavailable:{" "}
            {capability.reason || "this run uses mock data"}. Recorded examples
            above always work.
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
    </div>
  );
}
type Selection = { record: DecisionRecord | null; rejection?: Rejection };
type Effect = { value: number | null; caption: string };
function VersionList({
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
                ✓ {r.ehr.mode === "fake" ? "MOCK" : "Certified"}{" "}
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
          {blindProtocol && (
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
            {blindProtocol
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
          {run.manifest.ehr.mode === "fake" ? (
            <Badge>MOCK certificate</Badge>
          ) : baseCert ? (
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
export function Dashboard({
  interpFactory: suppliedFactory,
}: {
  interpFactory?: InterpFactory;
}) {
  const query = new URLSearchParams(window.location.search);
  const [requestedVersion] = useState(
    query.get("view")?.toLowerCase() === "compare"
      ? null
      : query.get("version"),
  );
  const [requestedDay] = useState(Number(query.get("day") ?? "1"));
  const [view, setView] = useState(
    query.get("view")?.toLowerCase() === "compare"
      ? "Compare"
      : views.includes(query.get("view") ?? "")
        ? (query.get("view") ?? "Evolution")
        : "Evolution",
  );
  const [runId, setRunId] = useState(query.get("run") ?? "");
  const [index, setIndex] = useState<ReturnType<typeof runIndexSchema.parse>>(
    [],
  );
  const [run, setRun] = useState<RunData | null>(null);
  const [error, setError] = useState("");
  const [persona, setPersona] = useState(query.get("persona") ?? "P3");
  const [visited, setVisited] = useState<{ scope: string; views: string[] }>({
    scope: "",
    views: [],
  });
  const scope = `${runId}/${persona}`;
  const retained = (name: string) =>
    view === name || (visited.scope === scope && visited.views.includes(name));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [screenMode, setScreenMode] = useState<
    "pair" | "counterexample" | null
  >(null);
  const [loadedFactory, setLoadedFactory] = useState<InterpFactory>();
  const interpFactory =
    run?.manifest.ehr.mode === "fake"
      ? undefined
      : (suppliedFactory ?? loadedFactory);
  useEffect(() => {
    let active = true;
    Promise.all([
      readRunJson("/runs/index.json"),
      readRunJson("/runs/default.json"),
    ])
      .then(([raw, selected]) => {
        if (active) {
          setIndex(runIndexSchema.parse(raw));
          setRunId(
            (current) => current || defaultRunSchema.parse(selected).runId,
          );
        }
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
    setSelection(null);
    setScreenMode(null);
    let first = true;
    const stop = watchRun(
      runId,
      (data) => {
        if (active) {
          setRun(data);
          if (
            first &&
            requestedVersion !== null &&
            /^\d+$/.test(requestedVersion)
          ) {
            const record = data.records.find(
              (record) =>
                record.persona === persona &&
                record.versionAfter === Number(requestedVersion),
            );
            if (record || requestedVersion === "0") {
              setSelection({ record: record ?? null });
              setScreenMode("pair");
            }
          }
          first = false;
          setPersona((current) =>
            data.manifest.personas.includes(current)
              ? current
              : (data.manifest.personas[0] ?? current),
          );
        }
      },
      (e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "Run validation failed");
      },
    );
    return () => {
      active = false;
      stop();
    };
  }, [index, runId]);
  useEffect(() => {
    if (!runId) return;
    const params = new URLSearchParams(window.location.search);
    params.set("run", runId);
    params.set("view", view === "Compare" ? "compare" : view);
    params.set("persona", persona);
    if (view === "Compare") params.delete("version");
    window.history.replaceState(null, "", `/dashboard?${params}`);
  }, [runId, view, persona]);
  const rejections = useMemo(() => (run ? getRejections(run) : []), [run]);
  const open = (next: Selection) => {
    setScreenMode(null);
    setSelection(next);
  };
  const inspect = (id: string) => {
    const rejection = rejections.find((r) => r.id === id);
    if (rejection) {
      setSelection({ record: rejection.record, rejection });
      setScreenMode("counterexample");
    }
  };
  const selectedPersona = selection?.record?.persona ?? persona;
  const [detail, setDetail] = useState<RunData | null>(null);
  const [detailError, setDetailError] = useState("");
  useEffect(() => {
    let active = true;
    setDetail(null);
    setDetailError("");
    if (run && selection) {
      Promise.all([
        loadRunDetails(run, selectedPersona),
        run.manifest.ehr.mode === "fake" || suppliedFactory
          ? Promise.resolve(null)
          : loadWasmInterp(),
      ])
        .then(([data, interp]) => {
          if (active) {
            setDetail(data);
            if (interp) setLoadedFactory(() => () => interp);
          }
        })
        .catch((error: unknown) => {
          if (active)
            setDetailError(
              error instanceof Error ? error.message : String(error),
            );
        });
    }
    return () => {
      active = false;
    };
  }, [run, selection, selectedPersona, suppliedFactory]);
  const record = selection?.record;
  return (
    <div className="dashboard">
      {run?.manifest.status === "blocked" && (
        <div role="alert">
          Run blocked before deployment: {run.manifest.blockers?.join("; ")}
        </div>
      )}
      <AppHeader active="dashboard" title="UI evolution">
        <label>
          Run{" "}
          <select
            aria-label="Recorded run"
            value={runId}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              for (const key of [
                "left",
                "right",
                "workflow",
                "comparison",
                "day",
                "revision",
                "version",
              ])
                params.delete(key);
              window.history.replaceState(null, "", `/dashboard?${params}`);
              setRunId(e.currentTarget.value);
            }}
          >
            {index.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id === "mock" ? "mock (illustrative)" : e.id}
              </option>
            ))}
          </select>
        </label>
        <a href={`/ehr?mode=replay&persona=${persona}&run=${runId}`}>
          Open EHR
        </a>
      </AppHeader>
      {run && <InterruptionWork days={run.days} persona={persona} />}
      <nav className="dash-tabs" aria-label="Dashboard areas">
        {views.map((name) => (
          <button
            key={name}
            aria-current={view === name ? "page" : undefined}
            disabled={
              view === name ||
              ((name === "Trajectories" || name === "Compare") &&
                !run?.files?.includes("trajectories/index.json"))
            }
            title={
              (name === "Trajectories" || name === "Compare") &&
              !run?.files?.includes("trajectories/index.json")
                ? "No trajectories recorded for this run"
                : view === name
                  ? "Current dashboard area"
                  : undefined
            }
            onClick={() => {
              setVisited((current) => ({
                scope,
                views: [
                  ...new Set([
                    ...(current.scope === scope ? current.views : []),
                    view,
                    name,
                  ]),
                ],
              }));
              setView(name);
              setSelection(null);
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <main className="dash-content">
        <div className="page-heading">
          {view === "Releases" ? (
            <h2>Releases</h2>
          ) : (
            <h2>
              {personas.find((p) => p.id === persona)?.name ?? persona}
              <span className="page-heading-id">{persona}</span>
            </h2>
          )}
          <InfoTip label="About this dashboard">
            <p>
              One canonical EHR, with role permissions and a preset view. The
              overnight agent evolves each persona’s fork; vendor releases merge
              into every fork and are re-certified.
            </p>
          </InfoTip>
          {run && (
            <span className="run-banner" role="status">
              {run.manifest.warning ??
                `${runId} · Real checker · ${run.manifest.daysCompleted ?? run.manifest.days} completed days${isRunning(run.manifest.status) ? ` of ${run.manifest.days} · refreshing every 30 s` : ""}`}
            </span>
          )}
          <div
            className="persona-selector"
            role="group"
            aria-label="Persona"
            hidden={view === "Releases"}
          >
            {personas.map((p) => (
              <button
                key={p.id}
                disabled={
                  !run?.manifest.personas.includes(p.id) ||
                  !versionsFor(run, p.id).length ||
                  persona === p.id
                }
                aria-pressed={persona === p.id}
                title={
                  !run?.manifest.personas.includes(p.id) ||
                  !versionsFor(run, p.id).length
                    ? "No recorded versions for this persona"
                    : persona === p.id
                      ? "Current persona"
                      : p.name
                }
                onClick={() => {
                  setPersona(p.id);
                  setSelection(null);
                }}
              >
                {p.id}
              </button>
            ))}
          </div>
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
            {view === "Evolution" && (
              <div className="evolution">
                <EvolutionSummary
                  run={run}
                  persona={persona}
                  rejected={
                    rejections.filter(
                      (r) =>
                        r.record.persona === persona &&
                        r.record.mode !== "try-to-break-it",
                    ).length
                  }
                />
                <WorkflowComplexity
                  key={`${runId}-${persona}`}
                  run={run}
                  persona={persona}
                />
                <WorkloadClock run={run} persona={persona} />
                <VersionList run={run} persona={persona} open={open} />
                {run.files?.includes("trajectories/index.json") && (
                  <p className="trajectory-compare-entry">
                    <a
                      href={`/dashboard?${new URLSearchParams({ run: runId, persona, view: "compare" })}`}
                    >
                      Compare recorded trajectories across revisions →
                    </a>
                  </p>
                )}
              </div>
            )}
            {retained("Trajectories") &&
              (run.files?.includes("trajectories/index.json") ? (
                <div hidden={view !== "Trajectories"}>
                  <Suspense
                    fallback={<p role="status">Loading trajectories…</p>}
                  >
                    <Trajectories
                      active={view === "Trajectories"}
                      noAgentDays={run.noAgentDays}
                      initialDay={requestedDay}
                      key={runId}
                      prefixKey={run.manifest.prefixKey}
                      runId={runId}
                      persona={persona}
                      factory={interpFactory}
                    />
                  </Suspense>
                </div>
              ) : (
                <p role="status">
                  No trajectories recorded for this run. Select Evolution or
                  another run.
                </p>
              ))}
            {retained("Compare") &&
              (run.files?.includes("trajectories/index.json") ? (
                <div hidden={view !== "Compare"}>
                  <Suspense fallback={<p role="status">Loading comparison…</p>}>
                    <CompareTrajectories
                      key={`${runId}-${persona}`}
                      active={view === "Compare"}
                      run={run}
                      persona={persona}
                      factory={interpFactory}
                    />
                  </Suspense>
                </div>
              ) : (
                <p role="status">
                  No completed trajectories recorded for this run yet.
                </p>
              ))}
            {view === "Releases" && (
              <Releases
                run={run}
                open={(r) => {
                  open({ record: r });
                  setScreenMode("pair");
                }}
              />
            )}
            {view === "Try to break it" && (
              <BreakPanel
                key={runId}
                run={run}
                persona={persona}
                replay={(rejection) => {
                  open({ record: rejection.record, rejection });
                  setScreenMode("counterexample");
                }}
              />
            )}
          </>
        )}
      </main>
      <Drawer
        transitionProps={{ duration: 0 }}
        opened={!!selection}
        onClose={() => {
          setSelection(null);
          setScreenMode(null);
        }}
        position="right"
        size="760px"
        title={
          selection?.rejection
            ? `Rejected proposal · Night ${record?.night}`
            : record
              ? `rev ${record.versionAfter} · Night ${record.night} · ${record.persona}`
              : `v0 · ${selectedPersona} · Baseline`
        }
        classNames={{
          content: "dash-drawer",
          body: "dash-review",
          title: "dash-drawer-title",
        }}
        closeButtonProps={{ "aria-label": "Close decision record" }}
      >
        {detailError && <p role="alert">{detailError}</p>}
        {selection && !detail && !detailError && (
          <p role="status">Loading decision replay…</p>
        )}
        {run && detail && selection && (
          <>
            <div className="dash-controls">
              <button onClick={() => setScreenMode("pair")}>
                Before / after on screen
              </button>
              {selection.rejection && (
                <button onClick={() => setScreenMode("counterexample")}>
                  Replay counterexample
                </button>
              )}
            </div>
            {selection.rejection && (
              <div className="failure-message">
                <strong>
                  {selection.rejection.check.property ??
                    selection.rejection.check.status}
                </strong>
                <p>{selection.rejection.check.message}</p>
              </div>
            )}
            {record ? (
              <Why run={run} record={record} inspect={inspect} />
            ) : (
              <>
                <h3>Canonical baseline</h3>
                <p>The recorded starting program, before nightly adaptation.</p>
                <p>{programAt(detail, selectedPersona, 0).id}</p>
                <details>
                  <summary>Baseline certificate</summary>
                  <pre>
                    {JSON.stringify(
                      detail.certs.get(`certs/${selectedPersona}/v0.json`) ??
                        "Unavailable",
                      null,
                      2,
                    )}
                  </pre>
                </details>
                <p>
                  Observed workload: {workloadAt(run, selectedPersona, 0).tasks}{" "}
                  classified tasks.
                </p>
              </>
            )}
          </>
        )}
      </Drawer>
      <Modal
        transitionProps={{ duration: 0 }}
        zIndex={300}
        opened={!!screenMode && !!selection}
        onClose={() => setScreenMode(null)}
        size="96vw"
        title={
          screenMode === "counterexample"
            ? "Replay counterexample"
            : "Before / after on screen"
        }
        classNames={{ body: "dash-review", title: "dash-drawer-title" }}
        closeButtonProps={{ "aria-label": "Close EHR replay" }}
      >
        {detailError && <p role="alert">{detailError}</p>}
        {selection && !detail && !detailError && (
          <p role="status">Loading EHR replay…</p>
        )}
        <DeferredReplay
          key={`${screenMode}-${selectedPersona}-${record?.night ?? 0}`}
        >
          {detail &&
            selection &&
            (screenMode === "pair" ? (
              <BeforeAfter
                key={`${runId}-${selectedPersona}-${record?.night ?? 0}-${selection.rejection?.id ?? "accepted"}`}
                run={detail}
                persona={selectedPersona}
                record={record ?? null}
                rejection={selection.rejection}
                factory={interpFactory}
              />
            ) : (
              selection.rejection && (
                <div className="dash-review">
                  <Counterexample
                    key={selection.rejection.id}
                    run={detail}
                    rejection={selection.rejection}
                    factory={interpFactory}
                  />
                </div>
              )
            ))}
        </DeferredReplay>
      </Modal>
    </div>
  );
}
