import { trajectoryReleaseLabels } from "../../../scripts/historical-releases.mjs";
import type { PresentationBundle } from "../ehr/ui/presentation-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { programSchema, type Program } from "../../../agent/src/schema";
import type { UiScreen } from "../ehr/ui/types";
import type { InterpFactory } from "./replay";
import { loadWasmInterp } from "../core/wasmInterp";
import { readRunJson } from "./data";
import { readArtifact, verifyRecordedBuild } from "../browser/data";
import {
  replayGeometrySchema,
  trajectoryIndexSchema,
  trajectorySchema,
  trajectoryBundleSchema,
  type TrajectoryEntry,
  type TrajectoryIndex,
} from "./trajectories-data";
import { replayTrajectory, type Trajectory } from "./trajectory-replay";
import { contentHash } from "../core/buildBinding";
import { pointerTravel, type GeometryAtlas } from "../metrics/geometry";
import { TrajectoryFrame } from "./TrajectoryFrame";
import "./trajectories.css";

type Loaded = {
  presentations: PresentationBundle | null;
  geometry: GeometryAtlas | null;
  task: Trajectory;
  program: Program;
  spec: unknown;
  display: unknown;
};
function Playback({
  loaded,
  count,
  factory,
  label,
  speed,
  metrics,
}: {
  loaded: Loaded;
  count: number;
  factory: InterpFactory;
  label: string;
  speed: number;
  metrics: TrajectoryEntry["metrics"];
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
  const prefix = loaded.task.trace.slice(0, count);
  const ops = prefix.flatMap((e) => e.ops);
  const travel = loaded.geometry
    ? count === 0
      ? 0
      : pointerTravel(prefix, loaded.geometry)[loaded.task.id]?.mouseTravelPx
    : count === loaded.task.trace.length
      ? metrics.mouseTravelPx
      : null;
  return (
    <article className="trajectory-side" aria-label={label}>
      <h3>
        {label} · {count}/{loaded.task.trace.length} events
      </h3>
      <p className="trajectory-counters" aria-live="polite">
        {ops.filter((o) => o === "click").length} clicks ·{" "}
        {ops.filter((o) => o === "key").length} keys ·{" "}
        {ops.filter((o) => o === "scroll").length} scrolls · {prefix.length}{" "}
        events ·{" "}
        {typeof travel === "number"
          ? `${travel} px mouse travel`
          : "mouse travel —"}
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
      <TrajectoryFrame
        presentations={loaded.presentations}
        title={`${label} EHR`}
        screen={result.screen}
        trace={loaded.task.trace}
        count={count}
        speed={speed}
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
  const [speed, setSpeed] = useState(1);
  const player = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    if (!factory)
      return () => {
        active = false;
      };
    async function load(file: string, metrics: TrajectoryEntry["metrics"]) {
      if (!factory) throw new Error("Loading the real WASM interpreter…");
      const task = trajectorySchema.parse(
        await readRunJson(`/runs/${runId}/trajectories/${file}`),
      );
      const [program, spec, fixture] = await Promise.all([
        readArtifact(`/${task.context.programPath}`),
        readArtifact(`/${task.context.specPath}`),
        readArtifact(`/${task.context.fixtureFile}`),
      ]);
      const presentations = await verifyRecordedBuild(
        task.context.programPath,
        program,
      );
      let geometry: GeometryAtlas | null = null;
      if (typeof metrics.mouseTravelPx === "number") {
        const hash = await contentHash(program);
        const componentsHash = await contentHash(presentations ?? []);
        // Geometry is optional evidence. Never substitute made-up pixel totals.
        for (const suffix of [`.${componentsHash}`, ""]) {
          try {
            const atlas = replayGeometrySchema.parse(
              await readRunJson(
                `/runs/${runId}/geometry/${hash}${suffix}.json`,
              ),
            );
            if (
              atlas.programHash === hash &&
              (!atlas.componentsSha256 ||
                atlas.componentsSha256 === componentsHash)
            ) {
              geometry = atlas;
              break;
            }
          } catch {
            /* Historical run may have totals but no geometry atlas. */
          }
        }
      }
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
        geometry,
        program: parsedProgram,
        presentations,
        spec,
        display: projection.display,
      };
    }
    void load(entry.file, entry.metrics)
      .then((value) => {
        if (active) setLoaded(value);
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    if (compare && entry.baseline)
      void load(entry.baseline.file, entry.baseline.metrics)
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
      1000 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, max, speed]);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === player.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        document.fullscreenElement === player.current
      ) {
        void document.exitFullscreen();
        return;
      }
      if (
        !loaded ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, select, textarea, [contenteditable=true]",
          ))
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        if (count >= max) setCount(0);
        setPlaying((value) => !value);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setPlaying(false);
        setCount((value) =>
          Math.max(
            0,
            Math.min(max, value + (event.key === "ArrowRight" ? 1 : -1)),
          ),
        );
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [loaded, count, max]);
  return (
    <div ref={player} className="trajectory-playback" tabIndex={-1}>
      <h3>
        {entry.id} · {entry.workflow} · rev {entry.programVersion} /{" "}
        {entry.release}
      </h3>
      <p>
        Patient {entry.patient.syntheaId} ·{" "}
        {entry.completed ? "Completed" : "Incomplete"}
      </p>
      <div
        className="trajectory-controls trajectory-transport"
        role="group"
        aria-label="Playback controls"
      >
        <button
          disabled={!count && !playing}
          title={!count && !playing ? "Already at the first event" : undefined}
          onClick={() => {
            setPlaying(false);
            setCount(0);
          }}
        >
          Reset
        </button>
        <button
          disabled={!loaded || !factory || !max}
          title={
            !loaded || !factory
              ? "Loading the selected trajectory"
              : !max
                ? "No recorded events"
                : undefined
          }
          onClick={() => {
            if (count >= max) setCount(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          disabled={!loaded || count >= max}
          title={
            !loaded
              ? "Loading the selected trajectory"
              : count >= max
                ? "No more recorded events"
                : undefined
          }
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
        <label>
          Speed{" "}
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            {[0.5, 1, 2, 4].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!loaded}
          onClick={() => {
            setFullscreenError("");
            if (document.fullscreenElement === player.current)
              void document.exitFullscreen();
            else if (player.current?.requestFullscreen)
              void player.current
                .requestFullscreen()
                .catch(() =>
                  setFullscreenError(
                    "Fullscreen is unavailable in this browser. The fixed 1440×900 viewport remains active.",
                  ),
                );
            else
              setFullscreenError(
                "Fullscreen is unavailable in this browser. The fixed 1440×900 viewport remains active.",
              );
          }}
        >
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
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
            Compare baseline rev 0
          </label>
        )}
      </div>
      {fullscreenError && <p role="status">{fullscreenError}</p>}
      <p className="trajectory-caption">
        Space: play/pause · ←/→: step · Esc: exit fullscreen. Fixed 1440×900
        viewport. Gold outlines mark the next recorded component. Replay
        controls drive the real interpreter. Clinical episode resets and receipt
        carry are preserved. Mouse travel uses recorded geometry when available,
        starting this replay at viewport center; a dash means unavailable.
      </p>
      {compare && (
        <p>
          Baseline uses its original release for revision 0 and the same
          day/patient schedule and simulation seed. Each panel advances one
          recorded event per step.
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
            speed={speed}
            metrics={entry.metrics}
          />
        )}
        {compare && baseline && factory && entry.baseline && (
          <Playback
            loaded={baseline}
            factory={factory}
            count={Math.min(count, baseline.task.trace.length)}
            label="Baseline rev 0"
            speed={speed}
            metrics={entry.baseline.metrics}
          />
        )}
      </div>
    </div>
  );
}
export function Trajectories({
  initialDay = 1,
  runId,
  persona,
  factory,
}: {
  runId: string;
  persona: string;
  initialDay?: number;
  factory?: InterpFactory | undefined;
}) {
  const [ownFactory, setOwnFactory] = useState<InterpFactory>();
  useEffect(() => {
    let active = true;
    if (!factory)
      void loadWasmInterp()
        .then((interp) => {
          if (active) setOwnFactory(() => () => interp);
        })
        .catch((error: unknown) => {
          if (active) setError(String(error));
        });
    return () => {
      active = false;
    };
  }, [factory]);
  const [index, setIndex] = useState<TrajectoryIndex | null>(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState(
    Number.isInteger(initialDay) && initialDay >= 1 && initialDay <= 10
      ? initialDay
      : 1,
  );
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
            disabled={days.length < 2}
            title={days.length < 2 ? "No other recorded days" : undefined}
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
            disabled={!index || !tasks.length}
            title={
              !index
                ? "Loading trajectory index"
                : !tasks.length
                  ? "No trajectories recorded for this persona"
                  : undefined
            }
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
            disabled={entry?.id === t.id}
            title={entry?.id === t.id ? "Current trajectory" : undefined}
            key={t.id}
            onClick={() => setSelected(t.id)}
          >
            <strong>
              {t.workflow} · {t.id}
            </strong>
            <span>
              {t.metrics.clicks}/{t.theoreticalMinimum.clicks} clicks ·{" "}
              {t.metrics.keystrokes}/{t.theoreticalMinimum.keystrokes} keys ·{" "}
              {t.metrics.mouseTravelPx ?? "—"}px mouse · {t.metrics.scrolls}{" "}
              scrolls / {t.metrics.scrollPx ?? "—"}px ·{" "}
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
          factory={factory ?? ownFactory}
        />
      )}
    </section>
  );
}
