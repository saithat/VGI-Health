import { trajectoryReleaseLabels } from "../../../scripts/historical-releases.mjs";
import type { PresentationBundle } from "../ehr/ui/presentation-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MantineProvider } from "@mantine/core";
import { programSchema, type Program } from "../../../agent/src/schema";
import type { UiScreen } from "../ehr/ui/types";
import { UiScreenView } from "../ehr/ui/Screen";
import type { InterpFactory } from "./replay";
import { readRunJson } from "./data";
import { readArtifact, verifyRecordedBuild } from "../browser/data";
import {
  trajectoryIndexSchema,
  trajectorySchema,
  trajectoryBundleSchema,
  type TrajectoryEntry,
  type TrajectoryIndex,
} from "./trajectories-data";
import { replayTrajectory, type Trajectory } from "./trajectory-replay";
import "./trajectories.css";

type Loaded = {
  presentations: PresentationBundle | null;
  task: Trajectory;
  program: Program;
  spec: unknown;
  display: unknown;
};
function SemanticFrame({
  presentations,
  screen,
  highlight,
  title,
}: {
  presentations: PresentationBundle | null;
  screen: UiScreen;
  highlight?: string | undefined;
  title: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  useEffect(() => {
    // The painter normally uses its window. Inside a portal the replay frame
    // owns scrolling, so screen transitions must reset that window explicitly.
    doc?.defaultView?.scrollTo(0, 0);
  }, [doc, screen.title]);
  useEffect(() => {
    if (!doc) return;
    const nodes = doc.querySelectorAll<HTMLElement>("[data-comp-id]");
    nodes.forEach((node) => {
      node.dataset.trajectoryHighlight = String(
        node.dataset.compId === highlight,
      );
      if (node.dataset.compId === highlight)
        node.scrollIntoView({ block: "nearest" });
    });
  }, [doc, screen, highlight]);
  return (
    <iframe
      ref={frame}
      title={title}
      className="trajectory-frame"
      srcDoc="<!doctype html><html><head></head><body></body></html>"
      onLoad={() => {
        const document = frame.current?.contentDocument;
        if (!document) return;
        document.head.replaceChildren(
          ...Array.from(
            window.document.head.querySelectorAll(
              'style,link[rel="stylesheet"]',
            ),
          ).map((node) => node.cloneNode(true)),
        );
        const style = document.createElement("style");
        style.textContent =
          '[data-trajectory-highlight="true"]{outline:3px solid #e1a324!important;outline-offset:3px;box-shadow:0 0 0 5px #e1a32433!important}body{margin:0}';
        document.head.append(style);
        setDoc(document);
      }}
    >
      {doc &&
        createPortal(
          <MantineProvider
            getRootElement={() => doc.documentElement}
            theme={{
              components: {
                ModalRoot: {
                  defaultProps: { portalProps: { target: doc.body } },
                },
              },
            }}
          >
            <UiScreenView screen={screen} onEvent={() => {}} presentations={presentations} />
          </MantineProvider>,
          doc.body,
        )}
    </iframe>
  );
}
function Playback({
  loaded,
  count,
  factory,
  label,
}: {
  loaded: Loaded;
  count: number;
  factory: InterpFactory;
  label: string;
}) {
  const result = useMemo(() => {
    const interp = factory(loaded.program);
    const result = replayTrajectory(
      interp,
      loaded.task,
      loaded.spec,
      loaded.program,
      count,
      loaded.display,
    );
    if (!interp.renderUi) throw new Error("Semantic WASM renderer is required");
    const screen: UiScreen = JSON.parse(
      interp.renderUi(...result.args, JSON.stringify(result.state)),
    );
    return { ...result, screen };
  }, [loaded, count, factory]);
  const next = loaded.task.trace[count];
  const event = next?.event;
  const touched =
    event &&
    Object.values(event).find((v) => v && typeof v === "object" && "comp" in v);
  const highlight =
    touched && typeof touched === "object" && "comp" in touched
      ? String(touched.comp)
      : event && "ack" in event
        ? event.ack.alert
        : undefined;
  const prefix = loaded.task.trace.slice(0, count);
  const ops = prefix.flatMap((e) => e.ops);
  const seconds = prefix.length
    ? ((prefix.at(-1)?.t ?? 0) - loaded.task.context.startMin * 600) / 10
    : 0;
  return (
    <article className="trajectory-side" aria-label={label}>
      <h3>
        {label} · {count}/{loaded.task.trace.length} events
      </h3>
      <p className="trajectory-counters" aria-live="polite">
        {ops.filter((o) => o === "click").length} clicks ·{" "}
        {ops.filter((o) => o === "key").length} keys ·{" "}
        {ops.filter((o) => o === "scroll").length} scrolls ·{" "}
        {seconds.toFixed(1)}s KLM
      </p>
      <p className="trajectory-event">
        {next ? `Next: ${JSON.stringify(next.event)}` : "Trajectory finished"}
      </p>
      {Boolean(result.firstMismatch || loaded.task.nativeMismatch) && (
        <p role="alert">
          Replay divergence:{" "}
          {JSON.stringify(result.firstMismatch ?? loaded.task.nativeMismatch)}
        </p>
      )}
      <SemanticFrame
        presentations={loaded.presentations}
        title={`${label} EHR`}
        screen={result.screen}
        highlight={highlight}
      />
    </article>
  );
}
function TaskPlayback({
  runId,
  entry,
  factory,
}: {
  runId: string;
  entry: TrajectoryEntry;
  factory?: InterpFactory | undefined;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [baseline, setBaseline] = useState<Loaded | null>(null);
  const [compare, setCompare] = useState(false);
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    async function load(file: string) {
      if (!factory) throw new Error("Loading the real WASM interpreter…");
      const task = trajectorySchema.parse(
        await readRunJson(`/runs/${runId}/trajectories/${file}`),
      );
      const [program, spec, fixture] = await Promise.all([
        readArtifact(`/${task.context.programPath}`),
        readArtifact(`/${task.context.specPath}`),
        readArtifact(`/${task.context.fixtureFile}`),
      ]);
      const presentations = await verifyRecordedBuild(task.context.programPath, program);
      const bundle = trajectoryBundleSchema.parse(fixture);
      const parsedProgram = programSchema.parse(program);
      let resources: { resourceType: string; id?: string | undefined }[] =
        bundle.entry.map((e) => ({
          ...e.resource,
          id: e.resource.id ?? e.fullUrl?.replace(/^urn:uuid:/, ""),
        }));
      for (const r of task.context.resources)
        resources = [
          ...resources.filter(
            (x) => !r.id || x.resourceType !== r.resourceType || x.id !== r.id,
          ),
          r,
        ];
      const interp = factory(parsedProgram);
      const projection = JSON.parse(
        interp.facts(
          JSON.stringify({
            bundle: {
              resourceType: "Bundle",
              entry: resources.map((resource) => ({ resource })),
            },
            context: {
              today: task.context.today,
              now: task.context.startMin,
              receipts: [],
              record: [],
            },
          }),
        ),
      );
      if (projection.error) throw new Error(String(projection.error));
      return {
        task,
        program: parsedProgram,
        presentations,
        spec,
        display: projection.display,
      };
    }
    void load(entry.file)
      .then((value) => {
        if (active) setLoaded(value);
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    if (compare && entry.baseline)
      void load(entry.baseline.file)
        .then((value) => {
          if (active) setBaseline(value);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
    return () => {
      active = false;
    };
  }, [runId, entry, factory, compare]);
  const max = Math.max(
    entry.eventCount,
    compare ? (entry.baseline?.eventCount ?? 0) : 0,
  );
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () =>
        setCount((n) => {
          if (n >= max) {
            setPlaying(false);
            return n;
          }
          return n + 1;
        }),
      500,
    );
    return () => window.clearInterval(timer);
  }, [playing, max]);
  return (
    <div className="trajectory-playback">
      <h3>
        {entry.id} · {entry.workflow} · v{entry.programVersion} /{" "}
        {entry.release}
      </h3>
      <p>
        Patient {entry.patient.syntheaId} ·{" "}
        {entry.completed ? "Completed" : "Incomplete"}
      </p>
      <div className="trajectory-controls">
        <button
          onClick={() => {
            setPlaying(false);
            setCount(0);
          }}
        >
          Reset
        </button>
        <button
          disabled={!loaded || !factory}
          onClick={() => {
            if (count >= max) setCount(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          disabled={!loaded || count >= max}
          onClick={() => {
            setPlaying(false);
            setCount((n) => Math.min(max, n + 1));
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
            value={count}
            onChange={(e) => {
              setPlaying(false);
              setCount(Number(e.target.value));
            }}
          />
        </label>
        <output aria-label="Replay position">
          {count} / {max}
        </output>
        {entry.baseline && (
          <label>
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => {
                setCompare(e.target.checked);
                setPlaying(false);
              }}
            />
            Compare baseline v0
          </label>
        )}
      </div>
      <p className="trajectory-caption">
        Gold outlines mark the next recorded component. Replay controls drive
        the real interpreter. Clinical episode resets and receipt carry are
        preserved.
      </p>
      {compare && (
        <p>
          Baseline uses its original v0 release and the same day/patient
          schedule and simulation seed. Each panel advances one recorded event
          per step.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!loaded && !error && <p role="status">Loading selected trajectory…</p>}
      <div className={`trajectory-panels${compare ? " compare" : ""}`}>
        {loaded && factory && (
          <Playback
            loaded={loaded}
            factory={factory}
            count={Math.min(count, entry.eventCount)}
            label="Recorded"
          />
        )}
        {compare && baseline && factory && (
          <Playback
            loaded={baseline}
            factory={factory}
            count={Math.min(count, baseline.task.trace.length)}
            label="Baseline v0"
          />
        )}
      </div>
    </div>
  );
}
export function Trajectories({
  runId,
  persona,
  factory,
}: {
  runId: string;
  persona: string;
  factory?: InterpFactory | undefined;
}) {
  const [index, setIndex] = useState<TrajectoryIndex | null>(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  useEffect(() => {
    let active = true;
    void readRunJson(`/runs/${runId}/trajectories/index.json`)
      .then((raw) => {
        const data = trajectoryReleaseLabels(trajectoryIndexSchema.parse(raw));
        if (data.runId !== runId)
          throw new Error("Trajectory index belongs to another run");
        if (active) setIndex(data);
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [runId]);
  const tasks = index?.tasks.filter((t) => t.persona === persona) ?? [];
  const days = [...new Set(tasks.map((t) => t.day))];
  const visible = tasks.filter(
    (t) =>
      t.day === day &&
      `${t.id} ${t.workflow} ${t.patient.syntheaId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const entry = visible.find((t) => t.id === selected) ?? visible[0];
  return (
    <section className="trajectories" aria-label="All task trajectories">
      <p>
        {tasks.length} logged tasks for {persona}. Select a day and task to load
        its exact replay context.
      </p>
      <div className="trajectory-controls">
        <label>
          Day{" "}
          <select
            aria-label="Trajectory day"
            value={day}
            onChange={(e) => {
              setDay(Number(e.target.value));
              setSelected("");
            }}
          >
            {days.map((d) => (
              <option key={d} value={d}>
                Day {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search tasks{" "}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Task, workflow or patient"
          />
        </label>
      </div>
      {index && <p className="trajectory-caption">{index.minimumDefinition}</p>}
      {error && (
        <p role="alert">
          {error}. Generate this run with pnpm trajectories --run {runId}.
        </p>
      )}
      <div
        className="trajectory-picker"
        role="listbox"
        aria-label="Recorded tasks"
      >
        {visible.map((t) => (
          <button
            role="option"
            aria-selected={entry?.id === t.id}
            key={t.id}
            onClick={() => setSelected(t.id)}
          >
            <strong>
              {t.workflow} · {t.id}
            </strong>
            <span>
              {t.metrics.clicks}/{t.theoreticalMinimum.clicks} clicks ·{" "}
              {t.metrics.keystrokes}/{t.theoreticalMinimum.keystrokes} keys ·{" "}
              {(t.metrics.klmDeciSec / 10).toFixed(1)}/
              {(t.theoreticalMinimum.klmDeciSec / 10).toFixed(1)}s KLM ·{" "}
              {t.completed ? "Completed" : "Incomplete"}
            </span>
          </button>
        ))}
      </div>
      {!visible.length && index && <p>No matching trajectories.</p>}
      {entry && (
        <TaskPlayback
          key={`${runId}-${persona}-${entry.id}`}
          runId={runId}
          entry={entry}
          factory={factory}
        />
      )}
    </section>
  );
}
