import { TaskControlSummary } from "./TaskControlSummary";
import { noAgentMetrics, controlKey } from "./trajectory-filter";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { programSchema, type Program } from "../../../agent/src/schema";
import { loadTrajectoryIndex } from "./trajectory-index";
import { loadWasmInterp } from "../core/wasmInterp";
import { stableJson } from "../core/buildBinding";
import { revisionChanges, type RevisionChange } from "../browser/revision-diff";
import { readRunJson, type RunData } from "./data";
import type { InterpFactory } from "./replay";
import { type TrajectoryIndex } from "./trajectories-data";
import { TrajectoryPlayer, type LoadedTrajectory } from "./TrajectoryPlayer";
import { loadTrajectory } from "./trajectory-loader";
import { personas } from "./WorkflowComplexity";
import {
  comparisonOptions,
  defaultComparison,
  pairedTask,
  comparisonMetrics,
  changeMoment,
  workflowNames,
  type ComparisonKind,
} from "./trajectory-compare";
import { ComparisonPicker } from "./ComparisonPicker";
import "./trajectories.css";
import "./trajectory-compare.css";

const scheduleSchema = z.object({
  tasks: z.array(
    z.object({ id: z.string(), choices: z.record(z.string(), z.unknown()) }),
  ),
});
async function scheduleChoices(runId: string, persona: string, days: number[]) {
  const manifest = z
    .object({ world: z.string().optional() })
    .parse(await readRunJson(`/runs/${runId}/manifest.json`));
  const world = manifest.world?.startsWith("runs/")
    ? manifest.world.slice(5)
    : manifest.world?.split("/runs/")[1];
  const choices = new Map<string, string>();
  if (!world || !/^[\w./-]+$/.test(world) || world.split("/").includes(".."))
    return choices;
  const results = await Promise.allSettled(
    [...new Set(days)].map(async (day) =>
      scheduleSchema.parse(
        await readRunJson(
          `/runs/${world}/schedules/day-${String(day).padStart(2, "0")}/${persona}.json`,
        ),
      ),
    ),
  );
  for (const result of results)
    if (result.status === "fulfilled")
      for (const task of result.value.tasks)
        choices.set(task.id, stableJson(task.choices));
  return choices;
}
interface LoadedPair {
  key: string;
  left: LoadedTrajectory;
  right: LoadedTrajectory;
}
interface ChangeGroup {
  id: string;
  title: string;
  summary: string;
  changes: RevisionChange[];
  programs: Program[];
}
const format = (value: number | null) =>
  value === null
    ? "—"
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(1);
const metricLabels = [
  ["clicks", "Clicks"],
  ["scrolls", "Scrolls"],
  ["scrollPx", "Scroll distance · px"],
  ["mouseTravelPx", "Mouse travel · px"],
  ["keys", "Keystrokes · secondary"],
  ["screens", "Screens visited"],
] as const;

export function CompareTrajectories({
  run,
  persona,
  active = true,
  onPersonaChange,
  factory: suppliedFactory,
}: {
  run: RunData;
  active?: boolean;
  persona: string;
  onPersonaChange: (persona: string) => void;
  factory?: InterpFactory | undefined;
}) {
  const runId = run.manifest.runId;
  const [query] = useState(() => new URLSearchParams(location.search));
  const [index, setIndex] = useState<TrajectoryIndex | null>(null);
  const [workflow, setWorkflow] = useState(query.get("workflow") ?? "");
  const [kind, setKind] = useState<ComparisonKind | null>(
    query.get("comparison") === "cross-day" ||
      (query.has("left") &&
        query.has("right") &&
        query.get("left") !== `${query.get("right")}:baseline`)
      ? "cross-day"
      : query.get("comparison") === "paired"
        ? "paired"
        : null,
  );
  const [leftKey, setLeftKey] = useState(query.get("left") ?? "");
  const [rightKey, setRightKey] = useState(query.get("right") ?? "");
  const [choices, setChoices] = useState<ReadonlyMap<string, string>>(
    new Map(),
  );
  const [ownFactory, setOwnFactory] = useState<InterpFactory>();
  const factory = suppliedFactory ?? ownFactory;
  const [loadedPair, setPair] = useState<LoadedPair | null>(null);
  const [error, setError] = useState("");
  const [positions, setPositions] = useState({ left: 0, right: 0 });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [groups, setGroups] = useState<ChangeGroup[]>([]);
  const [changeStatus, setChangeStatus] = useState("Loading recorded changes…");
  const player = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    setError("");
    void loadTrajectoryIndex(runId)
      .then((loaded) => {
        if (alive) setIndex(loaded);
      })
      .catch((error: unknown) => {
        if (alive) setError(String(error));
      });
    return () => {
      alive = false;
    };
  }, [runId, active]);
  useEffect(() => {
    let alive = true;
    if (!suppliedFactory)
      void loadWasmInterp()
        .then((interp) => {
          if (alive) setOwnFactory(() => () => interp);
        })
        .catch((error: unknown) => {
          if (alive) setError(String(error));
        });
    return () => {
      alive = false;
    };
  }, [suppliedFactory]);

  const personaTasks =
    index?.tasks.filter((task) => task.persona === persona) ?? [];
  const activeWorkflow =
    workflowNames[workflow] &&
    personaTasks.some((task) => task.workflow === workflow)
      ? workflow
      : (personaTasks[0]?.workflow ?? "W1");
  const tasks = useMemo(
    () =>
      index?.tasks.filter(
        (task) => task.persona === persona && task.workflow === activeWorkflow,
      ) ?? [],
    [index, persona, activeWorkflow],
  );
  const options = useMemo(() => comparisonOptions(tasks), [tasks]);
  const savedPairs = tasks.filter(pairedTask);
  const controls = useMemo(
    () => noAgentMetrics(run.noAgentDays),
    [run.noAgentDays],
  );
  const requestedRevision = /^\d+$/.test(query.get("revision") ?? "")
    ? Number(query.get("revision"))
    : undefined;
  const requestedDay = /^\d+$/.test(query.get("day") ?? "")
    ? Number(query.get("day"))
    : undefined;
  const hintedTasks =
    requestedRevision !== undefined
      ? tasks.filter((task) => task.programVersion === requestedRevision)
      : requestedDay !== undefined
        ? tasks.filter((task) => task.day === requestedDay)
        : tasks;
  const canPairHint = hintedTasks.some(pairedTask);
  const comparisonKind =
    kind === "paired" && !savedPairs.length
      ? "cross-day"
      : (kind ?? (savedPairs.length && canPairHint ? "paired" : "cross-day"));
  const defaults = defaultComparison(
    options,
    comparisonKind,
    choices,
    requestedDay,
    requestedRevision,
  );
  const right =
    options.find(
      (option) =>
        option.key === rightKey &&
        (comparisonKind !== "paired" ||
          (option.source === "recorded" && pairedTask(option.task))),
    ) ?? defaults?.right;
  const left =
    comparisonKind === "paired"
      ? options.find((option) => option.key === `${right?.key}:baseline`)
      : (options.find((option) => option.key === leftKey) ?? defaults?.left);
  const pairKey = left && right ? `${runId}/${left.key}/${right.key}` : "";

  const pair = loadedPair?.key === pairKey ? loadedPair : null;

  useEffect(() => {
    if (comparisonKind !== "cross-day" || !defaults) return;
    let active = true;
    void scheduleChoices(runId, persona, [
      defaults.left.entry.day,
      defaults.right.entry.day,
    ])
      .then((value) => {
        if (active) setChoices(value);
      })
      .catch(() => {
        /* Schedule metadata is optional for historical exports. */
      });
    return () => {
      active = false;
    };
  }, [
    runId,
    persona,
    comparisonKind,
    defaults?.left.entry.day,
    defaults?.right.entry.day,
  ]);

  useEffect(() => {
    if (!active || !left || !right) return;
    const params = new URLSearchParams(location.search);
    params.set("view", "compare");
    params.set("run", runId);
    params.set("persona", persona);
    params.set("workflow", activeWorkflow);
    params.set("left", left.key);
    params.set("right", right.key);
    params.set("comparison", comparisonKind);
    history.replaceState(null, "", `/dashboard?${params}`);
  }, [
    active,
    runId,
    persona,
    activeWorkflow,
    comparisonKind,
    left?.key,
    right?.key,
  ]);

  useEffect(() => {
    let active = true;
    setPlaying(false);
    setPositions({ left: 0, right: 0 });
    setPair(null);
    setError("");
    setGroups([]);
    if (left && right && factory) {
      void Promise.all([
        loadTrajectory(runId, left.entry.file, left.entry.metrics, factory),
        loadTrajectory(runId, right.entry.file, right.entry.metrics, factory),
      ])
        .then(([loadedLeft, loadedRight]) => {
          if (active)
            setPair({ key: pairKey, left: loadedLeft, right: loadedRight });
        })
        .catch((error: unknown) => {
          if (active) setError(String(error));
        });
    }
    return () => {
      active = false;
    };
  }, [pairKey, factory, runId, left?.entry, right?.entry]);

  useEffect(() => {
    if (!pair || !left || !right) return;
    let active = true;
    setChangeStatus("Loading recorded changes…");
    const lo = Math.min(left.entry.programVersion, right.entry.programVersion),
      hi = Math.max(left.entry.programVersion, right.entry.programVersion);
    const reverse = left.entry.programVersion > right.entry.programVersion;
    const records = run.records
      .filter(
        (record) =>
          record.persona === persona &&
          record.deployed &&
          record.certification.result === "certified" &&
          record.versionAfter !== record.versionBefore &&
          record.versionAfter > lo &&
          record.versionAfter <= hi,
      )
      .sort((a, b) =>
        reverse
          ? b.versionAfter - a.versionAfter
          : a.versionAfter - b.versionAfter,
      );
    const getProgram = async (version: number) => {
      const path = `runs/${runId}/programs/${persona}/v${version}.json`;
      if (pair.left.task.context.programPath === path) return pair.left.program;
      if (pair.right.task.context.programPath === path)
        return pair.right.program;
      return programSchema.parse(await readRunJson(`/${path}`));
    };
    void Promise.allSettled(
      records.map(async (record) => {
        const [before, after] = await Promise.all([
          getProgram(record.versionBefore),
          getProgram(record.versionAfter),
        ]);
        const programs = reverse ? [after, before] : [before, after];
        const changes = revisionChanges(
          programs[0] ?? before,
          programs[1] ?? after,
        );
        const summaries = record.candidates
          .filter((candidate) =>
            record.chosen?.candidateIds.includes(candidate.candidate.id),
          )
          .map((candidate) => candidate.candidate.summary);
        return {
          id: `${record.mode}-${record.night}-${record.versionAfter}`,
          title: `${record.mode === "migrate" ? "Vendor release" : "Agent revision"} · night ${record.night} · rev ${reverse ? record.versionAfter : record.versionBefore} → ${reverse ? record.versionBefore : record.versionAfter}`,
          summary:
            (summaries.length
              ? `Selected proposal: ${summaries.join(" ")}`
              : "") ||
            record.release?.items.join(" ") ||
            "Recorded certified program change.",
          changes,
          programs,
        };
      }),
    ).then((results) => {
      if (!active) return;
      const available = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (!available.length)
        available.push({
          id: "net",
          title: "Difference between the selected programs",
          summary:
            "Includes recorded vendor and personalization changes; a day-to-day workload difference is not a causal estimate of agent savings.",
          changes: revisionChanges(pair.left.program, pair.right.program),
          programs: [pair.left.program, pair.right.program],
        });
      setGroups(available);
      setChangeStatus(
        results.some((result) => result.status === "rejected")
          ? "Some intermediate revisions are not available in this partial run."
          : "",
      );
    });
    return () => {
      active = false;
    };
  }, [pair, run, persona, runId, left?.entry, right?.entry]);

  const leftMax = pair?.left.task.trace.length ?? 0,
    rightMax = pair?.right.task.trace.length ?? 0;
  const max = Math.max(leftMax, rightMax);
  const finished = positions.left >= leftMax && positions.right >= rightMax;
  const advance = (direction: number) =>
    setPositions((value) => ({
      left: Math.max(0, Math.min(leftMax, value.left + direction)),
      right: Math.max(0, Math.min(rightMax, value.right + direction)),
    }));
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);
  useEffect(() => {
    if (!active || !playing || !pair || finished) {
      if (finished) setPlaying(false);
      return;
    }
    const timer = window.setInterval(
      () =>
        setPositions((value) => ({
          left: Math.min(leftMax, value.left + 1),
          right: Math.min(rightMax, value.right + 1),
        })),
      1000 / speed,
    );
    return () => window.clearInterval(timer);
  }, [active, playing, pair, finished, leftMax, rightMax, speed]);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === player.current);
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
        !pair ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, select, textarea, [contenteditable=true]",
          ))
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        if (finished) setPositions({ left: 0, right: 0 });
        setPlaying((value) => !value);
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        setPlaying(false);
        advance(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    document.addEventListener("fullscreenchange", changed);
    window.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      window.removeEventListener("keydown", keydown);
    };
  }, [active, pair, finished, leftMax, rightMax]);

  const leftMetrics =
    pair && left ? comparisonMetrics(pair.left.task, left.entry) : null;
  const rightMetrics =
    pair && right ? comparisonMetrics(pair.right.task, right.entry) : null;
  const sameChoices =
    left &&
    right &&
    choices.has(left.entry.id) &&
    choices.get(left.entry.id) === choices.get(right.entry.id);
  const anchoredGroups = useMemo(
    () =>
      pair
        ? groups.map((group) => ({
            ...group,
            changes: group.changes.map((change) => ({
              change,
              moment: changeMoment(
                change,
                group.programs,
                pair.left.task,
                pair.right.task,
              ),
            })),
          }))
        : [],
    [groups, pair],
  );
  const chooseMode = (value: ComparisonKind) => {
    setKind(value);
    setLeftKey("");
    setRightKey("");
  };
  return (
    <section
      className="trajectories trajectory-comparison"
      aria-label="Compare trajectories"
    >
      <div className="comparison-heading">
        <div>
          <h3>Compare trajectories</h3>
          <p>Compare completed tasks within the same workflow.</p>
        </div>
        <a
          href={`/dashboard?${new URLSearchParams({ run: runId, persona, view: "Trajectories" })}`}
        >
          Single trajectory →
        </a>
      </div>
      <div className="trajectory-controls comparison-filters">
        <label>
          Persona{" "}
          <select
            aria-label="Comparison persona"
            value={persona}
            onChange={(event) => onPersonaChange(event.target.value)}
          >
            {personas.map((person) => (
              <option
                key={person.id}
                value={person.id}
                disabled={
                  !index?.tasks.some((task) => task.persona === person.id)
                }
              >
                {person.id} · {person.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workflow{" "}
          <select
            aria-label="Comparison workflow"
            value={activeWorkflow}
            onChange={(event) => {
              setWorkflow(event.target.value);
              setLeftKey("");
              setRightKey("");
              setKind(null);
            }}
          >
            {Object.entries(workflowNames).map(([id, name]) => (
              <option
                key={id}
                value={id}
                disabled={!personaTasks.some((task) => task.workflow === id)}
              >
                {id} · {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compare{" "}
          <select
            aria-label="Comparison type"
            value={comparisonKind}
            onChange={(event) =>
              chooseMode(
                event.target.value === "paired" ? "paired" : "cross-day",
              )
            }
          >
            <option value="paired" disabled={!savedPairs.length}>
              Same task · baseline vs recorded
              {!savedPairs.length ? " (not recorded)" : ""}
            </option>
            <option value="cross-day">Across days / revisions</option>
          </select>
        </label>
      </div>
      <div className="comparison-pickers">
        <ComparisonPicker
          side="Left"
          options={options.filter(
            (option) =>
              comparisonKind !== "paired" ||
              (option.source === "baseline" && pairedTask(option.task)),
          )}
          selected={left}
          onSelect={(key) => {
            setLeftKey(key);
            if (comparisonKind === "paired")
              setRightKey(key.replace(/:baseline$/, ""));
          }}
        />
        <ComparisonPicker
          side="Right"
          options={options.filter(
            (option) =>
              comparisonKind !== "paired" ||
              (option.source === "recorded" && pairedTask(option.task)),
          )}
          selected={right}
          onSelect={setRightKey}
        />
      </div>
      {left && right && (
        <p
          className={`comparison-context ${comparisonKind}`}
          data-testid="comparison-context"
        >
          <strong>
            {comparisonKind === "paired"
              ? "Same scheduled task · baseline vs recorded"
              : "Cross-day / revision comparison"}
          </strong>{" "}
          ·{" "}
          {comparisonKind === "paired"
            ? `${left.entry.programPath.includes("/canonicals/") ? "Daily canonical / no-agent control" : "Rev 0 control"}; same patient and scheduled choices.`
            : sameChoices
              ? "Matching scheduled choices; patient and day may differ."
              : "Matched by workflow; patient, choices and day may differ."}{" "}
          {left.entry.release !== right.entry.release &&
            `Release ${left.entry.release} → ${right.entry.release}; includes vendor changes.`}
        </p>
      )}
      {right?.source === "recorded" && (
        <TaskControlSummary
          entry={right.task}
          control={controls.get(controlKey(right.task))}
        />
      )}
      {error && <p role="alert">{error}</p>}
      {!index && !error && <p role="status">Loading recorded trajectories…</p>}
      {index && !options.length && (
        <p role="status">
          No completed tasks for this persona and workflow yet. Choose another
          workflow or run.
        </p>
      )}
      {leftMetrics && rightMetrics && (
        <dl className="comparison-delta" aria-label="Trajectory workload delta">
          {metricLabels.map(([metric, label]) => {
            const a = leftMetrics[metric],
              b = rightMetrics[metric],
              delta = a === null || b === null ? null : b - a;
            return (
              <div
                key={metric}
                data-metric={metric}
                data-left={a ?? "unavailable"}
                data-right={b ?? "unavailable"}
                data-delta={delta ?? "unavailable"}
                className={
                  delta === null || delta === 0
                    ? "neutral"
                    : delta < 0
                      ? "less"
                      : "more"
                }
              >
                <dt>{label}</dt>
                <dd>
                  <strong>
                    {delta === null
                      ? "—"
                      : delta === 0
                        ? "±0"
                        : `${delta > 0 ? "+" : "−"}${format(Math.abs(delta))}`}
                  </strong>
                  <span>
                    {format(a)} → {format(b)}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      <p className="trajectory-caption comparison-metric-note">
        Full-trace totals · delta = Right − Left · green means less work. Scroll
        counts and keys come from trace operations; pixels require recorded
        geometry. Screens count distinct event screens. Day comparisons are
        observational.
      </p>
      <div
        ref={player}
        className="trajectory-playback comparison-player"
        tabIndex={-1}
      >
        <div
          className="trajectory-controls trajectory-transport"
          role="group"
          aria-label="Compare playback controls"
        >
          <button
            disabled={
              !pair || (!positions.left && !positions.right && !playing)
            }
            onClick={() => {
              setPlaying(false);
              setPositions({ left: 0, right: 0 });
            }}
          >
            Reset
          </button>
          <button
            disabled={!pair || !max}
            onClick={() => {
              if (finished) setPositions({ left: 0, right: 0 });
              setPlaying((value) => !value);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            disabled={!pair || finished}
            onClick={() => {
              setPlaying(false);
              advance(1);
            }}
          >
            Step
          </button>
          <label>
            Step{" "}
            <input
              aria-label="Compare replay step"
              type="range"
              min={0}
              max={max}
              value={Math.max(positions.left, positions.right)}
              disabled={!pair}
              onChange={(event) => {
                setPlaying(false);
                const value = Number(event.target.value);
                setPositions({
                  left: Math.min(leftMax, value),
                  right: Math.min(rightMax, value),
                });
              }}
            />
          </label>
          <output aria-label="Compare replay position">
            L {positions.left}/{leftMax} · R {positions.right}/{rightMax}
          </output>
          <label>
            Speed{" "}
            <select
              aria-label="Compare playback speed"
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
            disabled={!pair}
            onClick={() => {
              if (document.fullscreenElement === player.current)
                void document.exitFullscreen();
              else if (player.current?.requestFullscreen)
                void player.current
                  .requestFullscreen()
                  .catch(() =>
                    setError(
                      "Fullscreen is unavailable; both fixed viewports remain active.",
                    ),
                  );
            }}
          >
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
        <p className="trajectory-caption">
          Synchronized steps: one event on each side; the shorter replay holds
          at the end. Space: play/pause · ←/→: step. Change links align each
          side to its relevant pre-event screen.
        </p>
        {pair && factory && left && right ? (
          <div className="trajectory-panels compare" key={pair.key}>
            <div className="comparison-side">
              <p className="comparison-side-label">
                Left · Day {left.entry.day} · rev {left.entry.programVersion} ·{" "}
                {left.source === "baseline" ? "Baseline control" : "Recorded"}
              </p>
              <TrajectoryPlayer
                loaded={pair.left}
                count={positions.left}
                factory={factory}
                speed={speed}
                metrics={left.entry.metrics}
                label="Left"
              />
            </div>
            <div className="comparison-side">
              <p className="comparison-side-label">
                Right · Day {right.entry.day} · rev {right.entry.programVersion}{" "}
                ·{" "}
                {right.source === "baseline" ? "Baseline control" : "Recorded"}
              </p>
              <TrajectoryPlayer
                loaded={pair.right}
                count={positions.right}
                factory={factory}
                speed={speed}
                metrics={right.entry.metrics}
                label="Right"
              />
            </div>
          </div>
        ) : (
          left &&
          right &&
          !error && <p role="status">Loading both recorded EHR contexts…</p>
        )}
      </div>
      {pair && (
        <section
          className="comparison-changes"
          aria-label="Changes between revisions"
        >
          <h3>What changed</h3>
          <p>
            Readable differences from certified decision records. Jump to see
            each change in context.
          </p>
          {changeStatus && <p role="status">{changeStatus}</p>}
          <div className="comparison-change-list">
            {anchoredGroups.map((group) => (
              <article key={group.id}>
                <h4>{group.title}</h4>
                <p>{group.summary}</p>
                {group.changes.length ? (
                  <ul>
                    {group.changes.map((row, i) => {
                      const { change, moment } = row;
                      return (
                        <li key={i}>
                          <div>
                            <strong>{change.label}</strong>
                            <span>
                              {change.before} → {change.after}
                            </span>
                          </div>
                          {moment ? (
                            <button
                              title={
                                moment.leftObserved && moment.rightObserved
                                  ? "Show the changed component or screen on each side"
                                  : "This screen is absent from one trace; that side aligns to its next shared action"
                              }
                              onClick={() => {
                                setPlaying(false);
                                setPositions({
                                  left: moment.left,
                                  right: moment.right,
                                });
                                player.current?.scrollIntoView({
                                  block: "start",
                                  behavior: "smooth",
                                });
                              }}
                            >
                              Jump · L{moment.left} / R{moment.right}
                            </button>
                          ) : (
                            <small>Not visited in these tasks</small>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No structural change in this recorded revision.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
