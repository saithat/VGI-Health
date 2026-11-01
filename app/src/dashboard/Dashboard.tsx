import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import { useEffect, useMemo, useState } from "react";
import type {
  CheckResult,
  DecisionRecord,
  JsonPatchOp,
  Savings,
} from "../../../agent/src/schema";
import {
  loadRun,
  defaultRunSchema,
  readRunJson,
  runIndexSchema,
  type RunData,
} from "./data";
import { ReplayScreen, type InterpFactory } from "./replay";
import "./dashboard.css";
import { Trajectories } from "./Trajectories";
import { WorkflowComplexity, personas } from "./WorkflowComplexity";
import { Drawer, Modal } from "@mantine/core";
import { programAt } from "./data";
import { workloadAt, versionsFor } from "./workload";
import { formatComplexity as fmt } from "./complexity-data";

const views = ["Evolution", "Trajectories", "Releases", "Try to break it"];
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
  summary: string;
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
          {record.mode} · spec {releaseLabel(record.specVersion, run.manifest.runId)}
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
  // Replay day traces belonging to these exact versions; never reuse the final-version trace for an intermediate version.
  const traceFor = (version: number) => {
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
        Recorded patient context · real EHR interpreter. Use the controls in
        either screen, or step through a recorded task for each version. The
        day’s patient mix may differ.
      </p>
      <div className="dash-controls">
        <button
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
          <h3>Before · v{before}</h3>
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
            {rejection ? "Rejected proposal" : "After"} · v{after}
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
function Releases({
  run,
  open,
}: {
  run: RunData;
  open: (record: DecisionRecord) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="release-table">
        <caption>
          Personas × releases · recheck of old UI → certified result
        </caption>
        <thead>
          <tr>
            <th scope="col">Persona</th>
            <th scope="col">Release</th>
            <th scope="col">Check result</th>
            <th scope="col">Migration summary</th>
            <th scope="col">Kept / dropped customizations</th>
            <th scope="col">Certificate</th>
          </tr>
        </thead>
        <tbody>
          {personas.flatMap((p) =>
            ["v2", "v3"].map((release) => {
              const r = run.records.find(
                (r) => r.persona === p.id && r.release && releaseLabel(r.release.id, run.manifest.runId) === release,
              );
              return (
                <tr
                  key={`${p.id}-${release}`}
                  className={r ? "migration-row" : undefined}
                  onClick={(e) => {
                    if (
                      r &&
                      e.target instanceof Element &&
                      !e.target.closest("button, summary, a")
                    )
                      open(r);
                  }}
                >
                  <th scope="row">
                    {p.id} · {p.name}
                  </th>
                  <td>{release}</td>
                  <td>
                    {r ? (
                      <>
                        <Badge
                          tone={
                            r.release?.recheck.status === "pass"
                              ? "pass"
                              : "fail"
                          }
                        >
                          Old UI: {r.release?.recheck.status}
                        </Badge>
                        <p>Result: {r.certification.result}</p>
                      </>
                    ) : (
                      "No data"
                    )}
                  </td>
                  <td>
                    {r ? (
                      <>
                        <button className="text-button" onClick={() => open(r)}>
                          Inspect {p.id} {release} migration
                        </button>
                        <p>{r.chosen?.rationale ?? r.hypothesis}</p>
                      </>
                    ) : (
                      "No migration recorded"
                    )}
                  </td>
                  <td>
                    {r ? (
                      <>
                        <p>
                          Kept:{" "}
                          {r.release?.customizationsKept.join("; ") ||
                            "None recorded"}
                        </p>
                        <p>
                          Dropped:{" "}
                          {r.release?.customizationsDropped.join("; ") ||
                            "None recorded"}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{r ? <Certificate record={r} /> : "Unavailable"}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
function BreakPanel({
  run,
  replay,
}: {
  run: RunData;
  replay: (rejection: Rejection) => void;
}) {
  const attacks = getRejections(run).filter(
    (r) => !r.id.startsWith("release-"),
  );
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Rejection | null>(null);
  const attack = attacks.find((a) => a.id === selected) ?? attacks[0];
  return (
    <>
      <p>
        Inspect a recorded unsafe proposal, its violated property, and the
        counterexample on the EHR.
      </p>
      <p className="dash-note">
        Recorded checks only. No new agent or checker request is submitted.
      </p>
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
        <button type="submit" disabled={!attack}>
          Show recorded verdict
        </button>
      </form>
      {!attacks.length && <p>No rejected proposals recorded in this run.</p>}
      {result && (
        <section>
          <h3>{result.label}</h3>
          <p>
            <Badge tone="fail">
              Rejected · {result.check.property ?? result.check.status}
            </Badge>
          </p>
          <div className="failure-message">
            <strong>{result.check.property ?? result.check.status}</strong>
            <p>{result.check.message}</p>
          </div>
          <p>
            {result.check.counterexample?.length ?? 0} recorded counterexample
            events.
          </p>
          <button onClick={() => replay(result)}>Replay counterexample</button>
        </section>
      )}
    </>
  );
}
type Selection = { record: DecisionRecord | null; rejection?: Rejection };
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
  const baseline = run.complexity?.personas.find((p) => p.persona === persona)
    ?.iterations[0];
  const exactAt = (version: number) =>
    run.complexity?.personas
      .find((p) => p.persona === persona)
      ?.iterations.find((i) => i.version === version);
  const change = (
    after: ReturnType<typeof exactAt>,
    before: ReturnType<typeof exactAt>,
  ) =>
    after && before
      ? `${fmt(before.total.clicks - after.total.clicks)} clicks / ${fmt(before.total.klmSeconds - after.total.klmSeconds)}s KLM`
      : "Unavailable";
  return (
    <section className="version-history" aria-label="Version history">
      <div className="section-heading">
        <h3>Versions and decisions</h3>
        <span>Saving: positive = less effort · exact fixed workflow union</span>
      </div>
      <div className="version-column-head" aria-hidden="true">
        <span>Version / night / change</span>
        <span>vs previous</span>
        <span>vs baseline</span>
        <span>Certificate</span>
      </div>
      <button
        className="version-row baseline-row"
        onClick={() => open({ record: null })}
      >
        <span className="version-open">
          <strong>v0 · Baseline</strong>
          <span>Canonical program</span>
        </span>
        <span>—</span>
        <span>0 clicks / 0s KLM</span>
        <Badge tone={run.certs.has(`certs/${persona}/v0.json`) ? "pass" : ""}>
          {run.manifest.ehr.mode === "fake"
            ? "MOCK certificate"
            : run.certs.has(`certs/${persona}/v0.json`)
              ? "Certificate recorded"
              : "Certificate unavailable"}
        </Badge>
      </button>
      {records.map((r) => {
        const deployed = r.versionAfter !== r.versionBefore;
        const after = exactAt(r.versionAfter),
          before = exactAt(r.versionBefore);
        const chosen = r.candidates
          .filter((c) => r.chosen?.candidateIds.includes(c.candidate.id))
          .map((c) => c.candidate.summary)
          .join("; ");
        const rejected = getRejections({ ...run, records: [r] });
        return (
          <div key={`${r.mode}-${r.night}`}>
            <button
              className={`version-row ${deployed ? "" : "unchanged-row"}`}
              onClick={() => open({ record: r })}
            >
              <span className="version-open">
                <strong>
                  {deployed ? `v${r.versionAfter}` : `Kept v${r.versionAfter}`}{" "}
                  · Night {r.night}
                  {r.release ? ` · ${releaseLabel(r.release.id, run.manifest.runId)}` : ""}
                </strong>
                <span>
                  {chosen ||
                    (r.release
                      ? r.release.surfaced === false
                        ? "Optional feature left out of nursing workflow"
                        : "Release migration"
                      : "No change deployed")}
                </span>
              </span>
              <span>
                <span className="mobile-label">vs previous: </span>
                {deployed ? change(after, before) : "0 clicks / 0s KLM"}
              </span>
              <span>
                <span className="mobile-label">vs baseline: </span>
                {change(after, baseline)}
              </span>
              {r.certificate ? (
                <Badge tone="pass">
                  {r.ehr.mode === "fake" ? "MOCK" : "Certified"} ·{" "}
                  {releaseLabel(r.certificate.specVersion, run.manifest.runId)}
                </Badge>
              ) : (
                <Badge>{r.certification.result}</Badge>
              )}
            </button>
            {rejected.map((rejection) => (
              <button
                key={rejection.id}
                className="rejected-row"
                onClick={() => open({ record: r, rejection })}
              >
                <span>↳ Rejected · Night {r.night}</span>
                <span>{rejection.summary}</span>
                <strong>
                  {rejection.check.property ?? rejection.check.status}
                </strong>
              </button>
            ))}
          </div>
        );
      })}
      <p className="dash-note">
        Exact savings compare fixed benchmark values. For realistic effort,
        choose “Simulated realistic workload” above; its samples and day
        coverage are listed in chart data. A flat expert minimum can coexist
        with lower scrolling or KLM in simulation.
      </p>
    </section>
  );
}
export function Dashboard({
  interpFactory: suppliedFactory,
}: {
  interpFactory?: InterpFactory;
}) {
  const query = new URLSearchParams(window.location.search);
  const [view, setView] = useState(
    views.includes(query.get("view") ?? "")
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
  const [selection, setSelection] = useState<Selection | null>(null);
  const [screenMode, setScreenMode] = useState<
    "pair" | "counterexample" | null
  >(null);
  const interpFactory =
    run?.manifest.ehr.mode === "fake" ? undefined : suppliedFactory;
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
    loadRun(runId, entry.files)
      .then((data) => {
        if (active) {
          setRun(data);
          setPersona((current) =>
            data.manifest.personas.includes(current)
              ? current
              : (data.manifest.personas[0] ?? current),
          );
        }
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
    if (runId)
      window.history.replaceState(
        null,
        "",
        `/dashboard?${new URLSearchParams({ run: runId, view, persona })}`,
      );
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
  const record = selection?.record;
  return (
    <div className="dashboard">
      <header className="dash-header">
        <a href="/" className="dash-brand">
          VGI Health
        </a>
        <h1>UI evolution</h1>
        <label>
          Run{" "}
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
        <a href={`/?persona=${persona}&run=${runId}`}>Open EHR</a>
      </header>
      <nav className="dash-tabs" aria-label="Dashboard areas">
        {views.map((name) => (
          <button
            key={name}
            aria-current={view === name ? "page" : undefined}
            onClick={() => {
              setView(name);
              setSelection(null);
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <main className="dash-content">
        <div className="section-heading">
          <h2>{view}</h2>
          <div className="persona-selector" role="group" aria-label="Persona">
            {personas.map((p) => (
              <button
                key={p.id}
                disabled={
                  !run?.manifest.personas.includes(p.id) ||
                  !versionsFor(run, p.id).length
                }
                aria-pressed={persona === p.id}
                title={p.name}
                onClick={() => {
                  setPersona(p.id);
                  setSelection(null);
                }}
              >
                {p.id}
              </button>
            ))}
            <span>{personas.find((p) => p.id === persona)?.name}</span>
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
            <p className="run-banner" role="status">
              {run.manifest.warning ??
                `${runId} · Real checker · ${run.manifest.days} recorded days`}
            </p>
            {view === "Evolution" && (
              <>
                <WorkflowComplexity key={runId} run={run} persona={persona} />
                <VersionList run={run} persona={persona} open={open} />
              </>
            )}
            {view === "Trajectories" && <Trajectories key={runId} runId={runId} persona={persona} factory={interpFactory} />}
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
              ? `v${record.versionAfter} · Night ${record.night} · ${record.persona}`
              : `v0 · ${selectedPersona} · Baseline`
        }
        classNames={{
          content: "dash-drawer",
          body: "dash-review",
          title: "dash-drawer-title",
        }}
        closeButtonProps={{ "aria-label": "Close decision record" }}
      >
        {run && selection && (
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
                <p>{programAt(run, selectedPersona, 0).id}</p>
                <details>
                  <summary>Baseline certificate</summary>
                  <pre>
                    {JSON.stringify(
                      run.certs.get(`certs/${selectedPersona}/v0.json`) ??
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
        {run &&
          selection &&
          (screenMode === "pair" ? (
            <BeforeAfter
              key={`${runId}-${selectedPersona}-${record?.night ?? 0}-${selection.rejection?.id ?? "accepted"}`}
              run={run}
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
                  run={run}
                  rejection={selection.rejection}
                  factory={interpFactory}
                />
              </div>
            )
          ))}
      </Modal>
    </div>
  );
}
