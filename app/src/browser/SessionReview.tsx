import { useEffect, useRef, useState } from "react";
import { sessionSchema, type TailoringSession } from "./session-schema";
import type { DayResult, Program } from "../../../agent/src/schema";
import { expandProgram } from "../../../agent/src/composites";
import { eventTarget } from "../dashboard/trajectory-replay";
import { readArtifact } from "./data";
import "./session-review.css";

function CaseReplay({
  program,
  days,
  task,
}: {
  program: Program;
  days: DayResult[];
  task: string;
}) {
  const trace = days.flatMap((d) => d.trace).filter((e) => e.task === task);
  const map = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const count = Math.min(step, Math.max(0, trace.length - 1));
  const event = trace[count];
  const target = eventTarget(event?.event);
  const screen = expandProgram(program).screens.find(
    (s) => s.id === event?.screen,
  );
  useEffect(() => {
    const container = map.current;
    const node = container?.querySelector<HTMLElement>('[data-target="true"]');
    if (!container || !node) return;
    const bounds = container.getBoundingClientRect(),
      item = node.getBoundingClientRect();
    if (item.top < bounds.top || item.bottom > bounds.bottom)
      container.scrollTop += item.top - bounds.top - 60;
  }, [count, screen?.id]);
  const metric = days.flatMap((d) => d.tasks).find((t) => t.task === task);
  return (
    <section
      className="session-case"
      aria-label={`Case replay ${program.version}`}
    >
      <p>
        {metric?.clicks ?? "—"} clicks · {metric?.scrolls ?? "—"} scrolls ·{" "}
        {metric?.keystrokes ?? "—"} keys
      </p>
      <label>
        Replay event {trace.length ? count + 1 : 0} / {trace.length}
        <input
          aria-label={`Replay events version ${program.version}`}
          type="range"
          min="0"
          max={Math.max(0, trace.length - 1)}
          value={count}
          disabled={!trace.length}
          onChange={(e) => setStep(Number(e.target.value))}
        />
      </label>
      <div className="session-replay-buttons">
        <button
          disabled={count === 0}
          onClick={() => setStep(Math.max(0, count - 1))}
        >
          Previous
        </button>
        <button
          disabled={count >= trace.length - 1}
          onClick={() => setStep(count + 1)}
        >
          Next
        </button>
      </div>
      {event ? (
        <p className="session-event">
          <strong>{Object.keys(event.event)[0]}</strong> ·{" "}
          {target ?? event.screen} ·{" "}
          {typeof event.result === "string"
            ? event.result
            : event.result.blocked.reason}
        </p>
      ) : (
        <p>No interaction events recorded.</p>
      )}
      <div
        ref={map}
        className="session-layout"
        aria-label="Recorded layout map"
      >
        <h4>{screen?.title ?? "No recorded screen"}</h4>
        <p>Recorded layout map</p>
        {screen?.components.map((c) => (
          <div
            key={c.id}
            className={c.id === target ? "session-target" : ""}
            data-target={c.id === target}
          >
            <span>{c.label || c.id}</span>
            <small>
              {c.parent ? `In ${c.parent} · tab ${c.tab}` : "Screen level"}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
const location = (
  value: TailoringSession["options"][number]["evidence"]["changes"][number]["from"],
) =>
  value
    ? `${value.screen} / ${value.parent ?? "screen"} / tab ${value.tab} / position ${value.index + 1}`
    : "Absent";
export function RecordedSession({ session }: { session: TailoringSession }) {
  const tasks = session.schedules.flatMap((s) => s.tasks);
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const task = tasks.find((t) => t.id === taskId);
  return (
    <main className="session-review">
      <a href="/browse">← UI browser</a>
      <header>
        <p className="session-eyebrow">
          SIMULATOR ONLY · {session.cadence} off-shift tailoring ·{" "}
          {session.backend === "fake"
            ? "FAKE backend — certifies nothing"
            : "Native checker evidence"}
        </p>
        <h1>Tailoring session</h1>
        <p>
          {session.clinician} · through day {session.asOfDay} ·{" "}
          {session.createdAt.slice(0, 10)}
        </p>
        <p>
          Compare recent cases in the current layout and{" "}
          {session.options.length} archived options. Savings are totals across{" "}
          {session.schedules.length} recent days. Relearning is a heuristic
          estimate.
        </p>
      </header>
      <section className="session-decision" aria-label="Recorded choice">
        <h2>
          {session.choice
            ? session.choice.chosen
              ? `Chosen: ${session.options.find((o) => o.id === session.choice?.chosen)?.label}`
              : "Keep current layout"
            : "Awaiting simulated choice"}
        </h2>
        <p>{session.choice?.reason ?? "This session has not been answered."}</p>
        <p>
          Review record only. A later release gate must ship the chosen bundle
          off shift.
        </p>
      </section>
      <label className="session-case-picker">
        Recent case{" "}
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              Day {t.day} · {t.workflow} · {t.patientId} · {t.id}
            </option>
          ))}
        </select>
      </label>
      <p>
        Same recorded case: {task?.patientId} · {task?.workflow}. Scrub each
        layout’s event sequence independently. Maps show component order and
        targets; clinical values are not painted.
      </p>
      <div
        className="session-options"
        style={{
          gridTemplateColumns: `repeat(${session.options.length + 1}, minmax(0, 1fr))`,
        }}
      >
        <article aria-label="Current layout">
          <div className="session-option-summary">
            <h2>Current layout</h2>
            <p>Comparison baseline · v{session.current.program.version}</p>
          </div>
          <CaseReplay
            key={`current-${taskId}`}
            program={session.current.program}
            days={session.current.days}
            task={taskId}
          />
        </article>
        {session.options.map((option) => (
          <article
            key={option.id}
            aria-label={option.label}
            className={
              session.choice?.chosen === option.id ? "session-chosen" : ""
            }
          >
            <div className="session-option-summary">
              <h2>{option.label}</h2>
              <p>
                {session.backend === "fake"
                  ? "FAKE test evidence"
                  : "Archived certificate + current checker pass"}{" "}
                · v{option.program.version}
              </p>
              <p className="session-savings">
                {option.evidence.savings.clicks} fewer clicks ·{" "}
                {option.evidence.savings.scrolls} fewer scrolls
              </p>
              <p>
                {
                  option.evidence.changes.filter((c) => c.kind === "moved")
                    .length
                }{" "}
                things moved · ≈{option.evidence.relearning.estimatedMinutes.toFixed(2)}{" "}
                min relearning ({option.evidence.relearning.model})
                {option.evidence.relearning.bounded && <span> · bounded {option.evidence.relearning.bounded.before.seconds.toFixed(1)}→{option.evidence.relearning.bounded.after.seconds.toFixed(1)}s;
                  expert floor {option.evidence.relearning.bounded.expertBefore.seconds.toFixed(1)}→{option.evidence.relearning.bounded.expertAfter.seconds.toFixed(1)}s;
                  signed relearning {option.evidence.relearning.bounded.incremental.seconds.toFixed(1)}s / {option.evidence.relearning.bounded.incremental.actions} actions
                  · {option.evidence.relearning.bounded.k} train days, {option.evidence.relearning.bounded.warmBlocks} practice blocks</span>}
              </p>
            </div>
            <CaseReplay
              key={`${option.id}-${taskId}`}
              program={option.program}
              days={option.evidence.days}
              task={taskId}
            />
            <details>
              <summary>What changed ({option.evidence.changes.length})</summary>
              <ul>
                {option.evidence.changes.map((c) => (
                  <li key={c.component}>
                    <strong>{c.label || c.component}</strong> · {c.kind}
                    <br />
                    {location(c.from)} → {location(c.to)}
                  </li>
                ))}
              </ul>
            </details>
            <p>
              {
                session.choice?.reasons.find((r) => r.option === option.id)
                  ?.reason
              }
            </p>
          </article>
        ))}
      </div>
      <details>
        <summary>Friction flags ({session.flags.length})</summary>
        <ul>
          {session.flags.map((f) => (
            <li key={f.id}>
              {f.screen}
              {f.component ? ` / ${f.component}` : ""}:{" "}
              {f.signal.kind === "wish" ? f.signal.text : "Slow here"}
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
export function SessionReview({ path }: { path: string }) {
  const [loaded, setLoaded] = useState<{
    path: string;
    session: TailoringSession;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!/^\/runs\/(?:[\w-][\w.-]*\/runs\/)?sessions\/[\w.-]+\.json$/.test(path)) {
      setError("Invalid session artifact path");
      return;
    }
    readArtifact(path)
      .then((value) => {
        const session = sessionSchema.parse(value);
        if (active) {
          setLoaded({ path, session });
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [path]);
  if (error)
    return (
      <main className="session-review">
        <h1>Cannot open tailoring session</h1>
        <p role="alert">{error}</p>
        <a href="/browse">UI browser</a>
      </main>
    );
  return loaded?.path === path ? (
    <RecordedSession key={path} session={loaded.session} />
  ) : (
    <main className="session-review">Loading tailoring session…</main>
  );
}
