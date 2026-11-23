import { WorkloadClock } from "./WorkloadClock";
import { versionsFor } from "./workload";
import { reportingDay } from "./benefit-metrics.mjs";
import { InterruptionWork } from "./InterruptionWork";
import { watchRun, isRunning } from "./run-refresh";
import { EvolutionSummary, InfoTip } from "./EvolutionSummary";
import { AppHeader } from "../browser/AppHeader";
import { loadWasmInterp } from "../core/wasmInterp";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  loadRunDetails,
  defaultRunSchema,
  readRunJson,
  runIndexSchema,
  type RunData,
} from "./data";
import type { InterpFactory } from "./replay";
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
const SpecReview = lazy(() =>
  import("./SpecReview").then((m) => ({ default: m.SpecReview })),
);
import { getRejections, type Selection } from "./rejections";
import { Releases } from "./Releases";
import { BreakPanel } from "./BreakPanel";
import { VersionList } from "./VersionList";
import { DecisionDrawers } from "./DecisionDrawers";

const views = [
  "Evolution",
  "Trajectories",
  "Compare",
  "Releases",
  "Try to break it",
  "Spec review",
];
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
  const [requestedDay] = useState(() => {
    const day = Number(query.get("day"));
    return Number.isSafeInteger(day) && day > 0 ? day : undefined;
  });
  const [view, setView] = useState(
    query.get("view")?.toLowerCase() === "compare"
      ? "Compare"
      : views.includes(query.get("view") ?? "")
        ? (query.get("view") ?? "Evolution")
        : "Evolution",
  );
  const [indexLoaded, setIndexLoaded] = useState(false);
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
    suppliedFactory ?? loadedFactory;
  useEffect(() => {
    let active = true;
    Promise.all([
      readRunJson("/runs/index.json"),
      readRunJson("/runs/default.json"),
    ])
      .then(([raw, selected]) => {
        if (active) {
          setIndex(runIndexSchema.parse(raw));
          setIndexLoaded(true);
          setRunId(
            (current) => current || defaultRunSchema.parse(selected).runId || "",
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
        suppliedFactory
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
  if (indexLoaded && !index.length) return <main><h1>No recordings yet</h1><p>Choose “Download sample recording” on the <a href="/">start page</a>.</p></main>;
  return (
    <div className="dashboard">
      {run?.manifest.status === "blocked" && (
        <div role="alert">
          Run blocked before deployment: {run.manifest.blockers?.join("; ")}
        </div>
      )}
      <AppHeader active="dashboard" title="UI evolution">
        <a href="/" target="_self">Start page</a>
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
                {e.id}
              </option>
            ))}
          </select>
        </label>
        <a href={`/lean.html?persona=${persona}`}>
          Open EHR
        </a>
      </AppHeader>
      {run && <InterruptionWork days={run.days.filter(d => reportingDay(run.manifest.measurementProtocol,d.day))} persona={persona} />}
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
          {view === "Releases" || view === "Spec review" ? (
            <h2>{view}</h2>
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
          {run && view !== "Spec review" && (
            <span className="run-banner" role="status">
              {run.manifest.warning ??
                `${runId} · Real checker · ${run.manifest.daysCompleted ?? run.manifest.days} completed days${isRunning(run.manifest.status) ? ` of ${run.manifest.days} · refreshing every 30 s` : ""}`}
              {(run.manifest.hillclimb?.model ?? run.manifest.model) &&
                ` · Night agent ${run.manifest.hillclimb?.provider ?? run.manifest.backend} / ${run.manifest.hillclimb?.model ?? run.manifest.model}`}
            </span>
          )}
          <div
            className="persona-selector"
            role="group"
            aria-label="Persona"
            hidden={view === "Releases" || view === "Spec review"}
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
        {view === "Spec review" && (
          <Suspense fallback={<p role="status">Loading spec review…</p>}>
            <SpecReview />
          </Suspense>
        )}
        {error && view !== "Spec review" && (
          <p className="failure-message" role="alert">
            Unable to load recorded run: {error}
          </p>
        )}
        {!error && !run && view !== "Spec review" && (
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
                <WorkloadClock run={run} persona={persona} day={requestedDay} />
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
                      initialDay={requestedDay ?? 1}
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
      <DecisionDrawers
        run={run}
        runId={runId}
        selection={selection}
        setSelection={setSelection}
        screenMode={screenMode}
        setScreenMode={setScreenMode}
        detail={detail}
        detailError={detailError}
        selectedPersona={selectedPersona}
        inspect={inspect}
        interpFactory={interpFactory}
      />
    </div>
  );
}
