import { useEffect, useState } from "react";
import { Drawer, Modal } from "@mantine/core";
import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import type { DecisionRecord } from "./agent-evidence";
import { programAt, type RunData } from "./data";
import { ReplayScreen, type InterpFactory } from "./replay";
import { workloadAt } from "./workload";
import type { Rejection, Selection } from "./rejections";
import { eventLabel, savings } from "./formatting";
import { Badge } from "./Badge";
import { Certificate } from "./Certificate";
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
                "klmDeciSec",
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
          {record.evidence.totals.completed}/{record.evidence.totals.tasks} tasks completed · {record.evidence.totals.clicks}{" "}
          clicks · {record.evidence.totals.keystrokes} keys ·{" "}
          {record.evidence.totals.scrolls} scrolls · {record.evidence.totals.klmDeciSec} klmDeciSec ·{" "}
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
          {record.mode === "hillclimb" ? "Night agent" : "Backend"}: {record.mode === "hillclimb" ? run.manifest.hillclimb?.provider ?? record.backend.name : record.backend.name} / {record.backend.model} ·{" "}
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
  const traceFor = (version: number) => {
    const context = run.replay?.contexts.find(
      (c) => c.persona === persona && c.version === version,
    );
    return context?.trace ?? [];
  };
  const beforeTrace = traceFor(before),
    afterTrace = traceFor(after);
  const max = Math.max(beforeTrace.length, afterTrace.length);
  return (
    <div className="dash-review">
      <p>
        Interpreter comparison: exported traces use the same projected patient
        and episode in both versions. Next task event advances each available trace
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
export type ScreenMode = "pair" | "counterexample" | null;

export function DecisionDrawers({
  run, runId, selection, setSelection, screenMode, setScreenMode,
  detail, detailError, selectedPersona, inspect, interpFactory,
}: {
  run: RunData | null;
  runId: string;
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
  screenMode: ScreenMode;
  setScreenMode: (mode: ScreenMode) => void;
  detail: RunData | null;
  detailError: string;
  selectedPersona: string;
  inspect: (id: string) => void;
  interpFactory: InterpFactory | undefined;
}) {
  const record = selection?.record;
  return (
    <>
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
    </>
  );
}
