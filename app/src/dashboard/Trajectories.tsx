import { trajectoryReleaseLabels } from "../../../scripts/historical-releases.mjs";
import { useEffect, useRef, useState } from "react";
import type { InterpFactory } from "./replay";
import { loadWasmInterp } from "../core/wasmInterp";
import { readRunJson } from "./data";
import {
  trajectoryIndexSchema,
  type TrajectoryEntry,
  type TrajectoryIndex,
} from "./trajectories-data";
import { TrajectoryPlayer, type LoadedTrajectory } from "./TrajectoryPlayer";
import { loadTrajectory } from "./trajectory-loader";
import "./trajectories.css";

function TaskPlayback({
  runId,
  entry,
  factory,
}: {
  runId: string;
  entry: TrajectoryEntry;
  factory?: InterpFactory | undefined;
}) {
  const [loaded, setLoaded] = useState<LoadedTrajectory | null>(null);
  const [baseline, setBaseline] = useState<LoadedTrajectory | null>(null);
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
    void loadTrajectory(runId, entry.file, entry.metrics, factory)
      .then((value) => {
        if (active) setLoaded(value);
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    if (compare && entry.baseline)
      void loadTrajectory(
        runId,
        entry.baseline.file,
        entry.baseline.metrics,
        factory,
      )
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
          <TrajectoryPlayer
            loaded={loaded}
            factory={factory}
            count={Math.min(count, entry.eventCount)}
            label="Recorded"
            speed={speed}
            metrics={entry.metrics}
          />
        )}
        {compare && baseline && factory && entry.baseline && (
          <TrajectoryPlayer
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
        <a
          href={`/dashboard?${new URLSearchParams({ view: "compare", run: runId, persona })}`}
        >
          Compare two trajectories →
        </a>
      </p>
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
