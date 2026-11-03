import { TaskControlSummary } from "./TaskControlSummary";
import { loadTrajectoryIndex } from "./trajectory-index";
import {
  noAgentMetrics,
  controlKey,
  clickSavings,
  filterTrajectories,
  type TrajectoryFilters,
} from "./trajectory-filter";
import { workflowNames } from "./trajectory-compare";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InterpFactory } from "./replay";
import { loadWasmInterp } from "../core/wasmInterp";
import type { RunData } from "./data";
import {
  type TrajectoryEntry,
  type TrajectoryIndex,
} from "./trajectories-data";
import { TrajectoryPlayer, type LoadedTrajectory } from "./TrajectoryPlayer";
import { loadTrajectory } from "./trajectory-loader";
import { InfoTip, delta } from "./EvolutionSummary";
import { ReplayError } from "./ReplayError";
import "./trajectories.css";

function TaskPlayback({
  runId,
  entry,
  factory,
  active,
}: {
  runId: string;
  entry: TrajectoryEntry;
  active: boolean;
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
    if (!active) setPlaying(false);
  }, [active]);
  useEffect(() => {
    if (!active || !playing) return;
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
  }, [active, playing, max, speed]);
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
        !active ||
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
  }, [active, loaded, count, max]);
  return (
    <div ref={player} className="trajectory-playback" tabIndex={-1}>
      <h3>
        {entry.id} · {entry.workflow} · rev {entry.programVersion} /{" "}
        {entry.release}
      </h3>
      <p className="trajectory-subtitle">
        {workflowNames[entry.workflow] ?? entry.workflow} · Day {entry.day} ·
        Patient {entry.patient.syntheaId.slice(0, 8)} ·{" "}
        {entry.completed ? "Completed" : "Incomplete"}
        <InfoTip label="About this replay" align="right">
          <p>
            Space: play/pause · ←/→: step · Esc: exit fullscreen. Fixed 1440×900
            viewport. Gold outlines mark the next recorded component. Replay
            controls drive the real interpreter. Clinical episode resets and
            receipt carry are preserved. Mouse travel uses recorded geometry
            when available, starting this replay at viewport center; a dash
            means unavailable.
          </p>
          <p>Patient {entry.patient.syntheaId}</p>
        </InfoTip>
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
      {compare && (
        <p className="trajectory-caption">
          Baseline uses its original release for revision 0 and the same
          day/patient schedule and simulation seed. Each panel advances one
          recorded event per step.
        </p>
      )}
      {error && <ReplayError error={error} runId={runId} />}
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
  active = true,
  runId,
  persona,
  factory,
  noAgentDays,
}: {
  runId: string;
  persona: string;
  noAgentDays?: RunData["noAgentDays"];
  initialDay?: number;
  active?: boolean;
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
  const [filters, setFilters] = useState<TrajectoryFilters>(() => {
    const query = new URLSearchParams(location.search);
    return {
      day: query.get("trajectoryDay") ?? query.get("day") ?? String(initialDay),
      workflow: query.get("trajectoryWorkflow") ?? query.get("workflow") ?? "",
      revision: query.get("trajectoryRevision") ?? query.get("revision") ?? "",
      completed: query.get("completed") ?? "",
      search: query.get("search") ?? "",
      sort: query.get("sort") ?? "recorded",
    };
  });
  const [selected, setSelected] = useState(
    () => new URLSearchParams(location.search).get("task") ?? "",
  );
  const [page, setPage] = useState(0);
  const update = (key: keyof TrajectoryFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelected("");
    setPage(0);
  };
  const controls = useMemo(() => noAgentMetrics(noAgentDays), [noAgentDays]);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    void loadTrajectoryIndex(runId)
      .then((data) => {
        if (alive) setIndex(data);
      })
      .catch((e: unknown) => {
        if (alive) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, [runId, active]);
  const tasks = useMemo(
    () => index?.tasks.filter((t) => t.persona === persona) ?? [],
    [index, persona],
  );
  const days = [...new Set(tasks.map((t) => t.day))].sort((a, b) => a - b);
  const workflows = [...new Set(tasks.map((t) => t.workflow))].sort();
  const revisions = [...new Set(tasks.map((t) => t.programVersion))].sort(
    (a, b) => a - b,
  );
  useEffect(() => {
    if (!index || !tasks.length) return;
    setFilters((current) => {
      const workflow =
        current.workflow &&
        !tasks.some((task) => task.workflow === current.workflow)
          ? ""
          : current.workflow;
      const revision =
        current.revision &&
        !tasks.some((task) => task.programVersion === Number(current.revision))
          ? ""
          : current.revision;
      return workflow === current.workflow && revision === current.revision
        ? current
        : { ...current, workflow, revision };
    });
  }, [index, tasks]);
  const visible = useMemo(
    () => filterTrajectories(tasks, filters, controls),
    [tasks, filters, controls],
  );
  const pageSize = 40;
  const selectedIndex = visible.findIndex((t) => t.id === selected);
  const currentPage =
    selectedIndex >= 0
      ? Math.floor(selectedIndex / pageSize)
      : Math.min(page, Math.max(0, Math.ceil(visible.length / pageSize) - 1));
  const pageTasks = visible.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const entry = visible.find((t) => t.id === selected) ?? pageTasks[0];
  const control = entry ? controls.get(controlKey(entry)) : undefined;
  useEffect(() => {
    if (!active) return;
    const params = new URLSearchParams(location.search);
    params.set("view", "Trajectories");
    params.set("run", runId);
    params.set("persona", persona);
    const names: Record<string, string> = {
      day: "trajectoryDay",
      workflow: "trajectoryWorkflow",
      revision: "trajectoryRevision",
    };
    // Keep single-task filters separate from Compare's day/revision hints.
    for (const key of ["day", "workflow", "revision"]) params.delete(key);
    for (const [key, value] of Object.entries(filters))
      params.set(names[key] ?? key, value);
    if (entry) params.set("task", entry.id);
    else params.delete("task");
    history.replaceState(null, "", `/dashboard?${params}`);
  }, [active, runId, persona, filters, entry]);
  return (
    <section className="trajectories" aria-label="All task trajectories">
      <div className="trajectory-topline">
        <p>
          {tasks.length} logged tasks for {persona}.{" "}
          {tasks.filter((t) => !t.completed).length} incomplete.
        </p>
        {index && (
          <InfoTip label="How task effort is measured">
            <p>{index.minimumDefinition}</p>
          </InfoTip>
        )}
        <a
          href={`/dashboard?${new URLSearchParams({ view: "compare", run: runId, persona })}`}
        >
          Compare two trajectories →
        </a>
      </div>
      <div className="trajectory-layout">
        <aside className="trajectory-browser">
          <div className="trajectory-filters">
            <label>
              Day{" "}
              <select
                aria-label="Trajectory day"
                value={filters.day}
                onChange={(e) => update("day", e.target.value)}
              >
                <option value="">All days</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Workflow{" "}
              <select
                aria-label="Trajectory workflow"
                value={filters.workflow}
                onChange={(e) => update("workflow", e.target.value)}
              >
                <option value="">All workflows</option>
                {workflows.map((id) => (
                  <option key={id} value={id}>
                    {id} · {workflowNames[id] ?? id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Revision{" "}
              <select
                aria-label="Trajectory revision"
                value={filters.revision}
                onChange={(e) => update("revision", e.target.value)}
              >
                <option value="">All revisions</option>
                {revisions.map((rev) => (
                  <option key={rev} value={rev}>
                    rev {rev}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status{" "}
              <select
                aria-label="Trajectory completion"
                value={filters.completed}
                onChange={(e) => update("completed", e.target.value)}
              >
                <option value="">All tasks</option>
                <option value="true">Completed</option>
                <option value="false">Incomplete</option>
              </select>
            </label>
            <label className="trajectory-search">
              <span className="mobile-label">Search tasks</span>
              <input
                type="search"
                aria-label="Search tasks"
                value={filters.search}
                onChange={(e) => update("search", e.target.value)}
                placeholder="Search task id, workflow or patient"
              />
            </label>
            <label>
              Sort{" "}
              <select
                aria-label="Trajectory sort"
                value={filters.sort}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="recorded">Recorded order</option>
                <option value="clicks-desc">Most clicks</option>
                <option value="clicks-asc">Fewest clicks</option>
                <option value="scrolls-desc">Most scrolls</option>
                <option value="savings-desc">Click savings vs no-agent</option>
              </select>
            </label>
            <button
              className="text-button"
              onClick={() => {
                setFilters({
                  day: "",
                  workflow: "",
                  revision: "",
                  completed: "",
                  search: "",
                  sort: "recorded",
                });
                setSelected("");
                setPage(0);
              }}
            >
              Clear filters
            </button>
          </div>
          <p role="status" className="trajectory-count">
            {visible.length} matching tasks ·{" "}
            {visible.length ? currentPage * pageSize + 1 : 0}–
            {Math.min((currentPage + 1) * pageSize, visible.length)} shown
          </p>
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
            {pageTasks.map((t) => (
              <button
                role="option"
                aria-selected={entry?.id === t.id}
                disabled={entry?.id === t.id}
                title={entry?.id === t.id ? "Current trajectory" : undefined}
                key={t.id}
                className={t.completed ? "" : "trajectory-incomplete"}
                onClick={() => setSelected(t.id)}
              >
                <strong>
                  <span>{t.id}</span>
                  <span className="trajectory-pick-wf">
                    {t.workflow} · rev{" "}
                    {t.programVersion}
                  </span>
                </strong>
                <span
                  title={`${t.metrics.clicks} clicks (minimum ${t.theoreticalMinimum.clicks}) · ${t.metrics.keystrokes} keys (minimum ${t.theoreticalMinimum.keystrokes}) · ${t.metrics.mouseTravelPx === null || t.metrics.mouseTravelPx === undefined ? "—" : Math.round(t.metrics.mouseTravelPx)}px mouse · ${t.metrics.scrolls} scrolls / ${t.metrics.scrollPx ?? "—"}px`}
                >
                  {t.metrics.clicks} clicks · {t.metrics.scrolls} scrolls
                  {!t.completed && " · Incomplete · goals not met"}
                  {(() => {
                    const control = controls.get(controlKey(t));
                    const saved =
                      clickSavings(t, control) !== null && control
                        ? t.metrics.clicks - control.clicks
                        : 0;
                    return saved ? (
                      <em className={saved < 0 ? "better" : "worse"}>
                        {" "}
                        · {delta(saved)} vs no-agent
                      </em>
                    ) : null;
                  })()}
                </span>
              </button>
            ))}
          </div>
          {visible.length > pageSize && (
            <div className="trajectory-controls" aria-label="Task pages">
              <button
                disabled={currentPage === 0}
                onClick={() => {
                  setSelected("");
                  setPage(currentPage - 1);
                }}
              >
                Previous tasks
              </button>
              <span>
                Page {currentPage + 1} / {Math.ceil(visible.length / pageSize)}
              </span>
              <button
                disabled={(currentPage + 1) * pageSize >= visible.length}
                onClick={() => {
                  setSelected("");
                  setPage(currentPage + 1);
                }}
              >
                Next tasks
              </button>
            </div>
          )}
          {!visible.length && index && <p>No matching trajectories.</p>}
        </aside>
        <div className="trajectory-main">
          {entry && (
            <TaskPlayback
              key={`${runId}-${persona}-${entry.id}`}
              runId={runId}
              active={active}
              entry={entry}
              factory={factory ?? ownFactory}
            />
          )}
          {entry && <TaskControlSummary entry={entry} control={control} />}
        </div>
      </div>
    </section>
  );
}
