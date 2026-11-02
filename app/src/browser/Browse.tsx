import { RevisionDetails } from "./RevisionDetails";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Switch } from "@mantine/core";
import { navigate } from "../navigation";
import { AppHeader } from "../ehr/ui/AppHeader";
import { ClinicalIcon } from "../ehr/ui/Icons";
import { chartDateForTimelineDay } from "../data/worldChart";
import { formatDisplayValue } from "../ehr/ui/display";
import { loadRunSummary, type RunData } from "../dashboard/data";
import {
  ehrUrl,
  loadCatalog,
  personas,
  readArtifact,
  verdictsSchema,
  type Catalog,
  type ProgramEntry,
} from "./data";
import {
  personaNames,
  timelineNodes,
  vendorReleases,
  workloadDelta,
  type TimelineNode,
} from "./timeline";
import "./browser.css";

type Verdicts = ReturnType<typeof verdictsSchema.parse>["programs"];
function propertyOf(output: unknown): string {
  if (typeof output !== "object" || output === null || !("violation" in output))
    return "";
  const violation = output.violation;
  return typeof violation === "object" &&
    violation !== null &&
    "property" in violation
    ? String(violation.property)
    : "";
}
function CertificateBadge({
  program,
  verdicts,
  run,
}: {
  program: ProgramEntry;
  verdicts: Verdicts;
  run?: RunData | undefined;
}) {
  const record = run?.records.find(
    (record) =>
      record.versionAfter === program.version &&
      record.persona === program.persona &&
      record.certificate,
  );
  const verdict = verdicts[program.path];
  const certificate = run?.certs.get(
    `certs/${program.persona}/v${program.version}.json`,
  );
  const status =
    program.run && (record?.certificate || certificate?.verdict === "ok")
      ? "certified"
      : (program.recordedCertificate ?? verdict?.status ?? "not computed");
  const property = propertyOf(verdict?.output);
  return (
    <span
      className={`browser-badge ${program.mock ? "warning" : status === "certified" ? "success" : status === "rejected" ? "danger" : "neutral"}`}
      title={
        property ||
        (status === "reference"
          ? "Vendor reference for comparison; choose a certified role view to sign in."
          : undefined)
      }
    >
      {program.mock
        ? "MOCK certificate"
        : status === "certified"
          ? "✓ Certified"
          : status === "reference"
            ? "Reference"
            : status === "rejected"
              ? `Rejected${property ? ` · ${property}` : ""}`
              : status === "full-profile only"
                ? "Full-profile only"
                : "Not computed"}
    </span>
  );
}
const nodeKey = (node: TimelineNode) => `${node.persona}-${node.day}`;
function Timeline({
  catalog,
  run,
  verdicts,
}: {
  catalog: Catalog;
  run?: RunData | undefined;
  verdicts: Verdicts;
}) {
  const nodes = useMemo(
    () => personas.flatMap((persona) => timelineNodes(catalog, run, persona)),
    [catalog, run],
  );
  const [selectedKey, setSelectedKey] = useState("P3-5");
  const selected =
    nodes.find((node) => nodeKey(node) === selectedKey) ??
    nodes.find((node) => node.persona === "P3") ??
    nodes[0];
  function move(event: KeyboardEvent<HTMLButtonElement>, node: TimelineNode) {
    const horizontal =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    const vertical =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!horizontal && !vertical && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    const row = nodes.filter((item) => item.persona === node.persona);
    const next = horizontal
      ? row[row.indexOf(node) + horizontal]
      : vertical
        ? nodes
            .filter(
              (item) =>
                item.persona ===
                personas[
                  personas.findIndex((persona) => persona === node.persona) +
                    vertical
                ],
            )
            .sort(
              (a, b) => Math.abs(a.day - node.day) - Math.abs(b.day - node.day),
            )[0]
        : event.key === "Home"
          ? row[0]
          : row.at(-1);
    if (next) {
      setSelectedKey(nodeKey(next));
      event.currentTarget
        .closest(".timeline-canvas")
        ?.querySelector<HTMLButtonElement>(`[data-node-key="${nodeKey(next)}"]`)
        ?.focus();
    }
  }
  const delta = selected ? workloadDelta(run, selected) : null;
  return (
    <section
      className="browser-panel timeline-panel"
      aria-labelledby="timeline-title"
    >
      <div className="browser-section-heading">
        <ClinicalIcon name="trend" />
        <h2 id="timeline-title">One EHR. Five personal forks.</h2>
        <span>Choose a day to open that revision</span>
      </div>
      <div className="timeline-layout">
        <div
          className="timeline-canvas"
          role="group"
          aria-label="Branching persona timeline"
        >
          <div className="timeline-days">
            <span>End of day</span>
            {Array.from({ length: 11 }, (_, day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <svg
            className="timeline-edges"
            aria-hidden="true"
            viewBox="0 0 1100 440"
            preserveAspectRatio="none"
          >
            <path d="M50 38 V405" stroke="var(--clinical-primary)" />
            {[450, 750].map((x) => (
              <g key={x}>
                <path
                  d={`M${x} 38 V405`}
                  stroke="var(--clinical-control)"
                  strokeDasharray="4 5"
                />
                {personas.map((_, index) => (
                  <path
                    key={index}
                    d={`M${x - 6} ${125 + index * 70 - 8} L${x} ${125 + index * 70} L${x + 6} ${125 + index * 70 - 8}`}
                    stroke="var(--clinical-control)"
                    fill="none"
                  />
                ))}
              </g>
            ))}
          </svg>
          <div className="timeline-row vendor-track">
            <div className="timeline-row-label">
              <strong>Vendor reference</strong>
              <span>Shared reference</span>
            </div>
            {Array.from({ length: 11 }, (_, day) => {
              const release = vendorReleases.find(
                (release) => release.day === day,
              );
              const program =
                release &&
                catalog.programs.find(
                  (program) =>
                    program.path === `releases/${release.id}/canonical.json`,
                );
              return (
                <div
                  className={`timeline-slot${release ? " release-slot" : " empty-slot"}`}
                  key={day}
                >
                  {release && program && (
                    <>
                      <a
                        className="release-node"
                        href={ehrUrl(program, "P1", release.day)}
                        title={release.summary}
                      >
                        {release.id}
                      </a>
                      <span className="release-description">
                        {day === 0
                          ? "Initial EHR"
                          : day === 4
                            ? "Prior auth"
                            : "Antibiotic policy"}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {personas.map((persona) => (
            <div
              className={`timeline-row persona-track persona-${persona.toLowerCase()}`}
              key={persona}
            >
              <div className="timeline-row-label">
                <strong>
                  {persona} <span>{personaNames[persona]}</span>
                </strong>
                <span>
                  {run?.manifest.personas.includes(persona)
                    ? "Recorded personalization"
                    : "Certified role view · no run yet"}
                </span>
              </div>
              {Array.from({ length: 11 }, (_, day) => {
                const node = nodes.find(
                  (node) => node.persona === persona && node.day === day,
                );
                return (
                  <div
                    className={`timeline-slot${node ? "" : " empty-slot"}`}
                    key={day}
                  >
                    {node && (
                      <>
                        <span className="mobile-day">Day {day}</span>
                        <button
                          type="button"
                          className={`timeline-node${node.kept ? " kept" : ""}${nodeKey(node) === (selected ? nodeKey(selected) : "") ? " selected" : ""}`}
                          data-node-key={nodeKey(node)}
                          tabIndex={
                            nodeKey(node) ===
                            (selected ? nodeKey(selected) : "")
                              ? 0
                              : -1
                          }
                          aria-label={`${persona} ${personaNames[persona]}, day ${day}, revision ${node.baseline ? 0 : node.program.version}, ${node.program.mock ? "mock authored, " : ""}${verdicts[node.program.path]?.status === "certified" || run?.certs.get(`certs/${persona}/v${node.program.version}.json`)?.verdict === "ok" || node.record?.certificate ? "certified" : "certificate not computed"}; open EHR`}
                          title={node.summary}
                          onFocus={() => setSelectedKey(nodeKey(node))}
                          onMouseEnter={() => setSelectedKey(nodeKey(node))}
                          onKeyDown={(event) => move(event, node)}
                          onClick={() =>
                            navigate(ehrUrl(node.program, persona, node.day))
                          }
                        >
                          <span className="timeline-dot" aria-hidden="true">
                            {node.kept ? "" : "✓"}
                          </span>
                          <span>
                            {node.baseline
                              ? node.program.release
                              : `rev ${node.program.version}`}
                          </span>
                          <small>
                            {node.kept
                              ? "kept"
                              : node.baseline
                                ? "baseline"
                                : "certified"}
                          </small>
                        </button>
                        {node.rejected.length > 0 && (
                          <span
                            className="rejection-stub"
                            title={node.rejected
                              .map(
                                (item) => `${item.property}: ${item.summary}`,
                              )
                              .join("\n")}
                            aria-label={`${node.rejected.length} rejected candidates`}
                          >
                            × {node.rejected.length}
                          </span>
                        )}
                        {[4, 7].includes(day) && (
                          <span
                            className="migration-badge"
                            title="Vendor release merged and role view certified"
                          >
                            ↳ ✓
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <p className="timeline-legend">
            <span>● Deployed</span>
            <span>○ Kept</span>
            <span className="allergy-text">× Rejected candidate</span>
            <span>⇢ Vendor release / re-certification</span>
          </p>
        </div>
        {selected && (
          <aside
            className={`timeline-detail persona-${selected.persona.toLowerCase()}`}
            aria-label="Selected revision details"
            aria-live="polite"
          >
            <span className="browser-eyebrow">
              {selected.persona} · DAY {selected.day}
            </span>
            <h3>
              {selected.baseline
                ? `${selected.program.release} certified baseline`
                : `${selected.persona} rev ${selected.program.version}`}
            </h3>
            <p className="browser-muted">
              Chart date{" "}
              {formatDisplayValue(
                chartDateForTimelineDay(selected.day, catalog.referenceDate),
              )}
            </p>
            <CertificateBadge
              program={selected.program}
              verdicts={verdicts}
              run={run}
            />
            <p>{selected.summary}</p>
            <RevisionDetails
              key={nodeKey(selected)}
              node={selected}
              run={run}
            />
            <div className="timeline-measure">
              <strong>
                Observed workload change (after − before), vs{" "}
                {run?.manifest.measurementProtocol
                  ? "active canonical"
                  : "rev 0"}
              </strong>
              {delta ? (
                <>
                  <p className="browser-muted">
                    Mean workload per workflow; differs from the fixed-case
                    exact minimum on Evolution. Negative means fewer
                    interactions.
                  </p>
                  <dl>
                    {(delta.scrollPx === null ||
                      delta.mouseTravelPx === null) && (
                      <div>
                        <dt>Pixel metrics</dt>
                        <dd>not measured for archived runs</dd>
                      </div>
                    )}
                    <div>
                      <dt>Clicks</dt>
                      <dd>
                        {delta.clicks > 0 ? "+" : ""}
                        {delta.clicks.toFixed(1)}
                      </dd>
                    </div>
                    <div>
                      <dt>Scrolls</dt>
                      <dd>
                        {delta.scrolls > 0 ? "+" : ""}
                        {delta.scrolls.toFixed(1)}
                      </dd>
                    </div>
                    {delta.scrollPx !== null && (
                      <div>
                        <dt>Scroll distance</dt>
                        <dd>
                          {delta.scrollPx !== null && delta.scrollPx > 0
                            ? "+"
                            : ""}
                          {delta.scrollPx === null
                            ? "—"
                            : delta.scrollPx.toFixed(1)}{" "}
                          px
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Keys (secondary)</dt>
                      <dd>
                        {delta.keys > 0 ? "+" : ""}
                        {delta.keys.toFixed(1)}
                      </dd>
                    </div>
                    {delta.mouseTravelPx !== null && (
                      <div>
                        <dt>Mouse travel</dt>
                        <dd>
                          {delta.mouseTravelPx !== null &&
                          delta.mouseTravelPx > 0
                            ? "+"
                            : ""}
                          {delta.mouseTravelPx === null
                            ? "—"
                            : delta.mouseTravelPx.toFixed(1)}{" "}
                          px
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              ) : (
                <p className="browser-muted">
                  {selected.baseline
                    ? "Role baseline before personalization."
                    : "No independent workload measurement for this revision."}
                </p>
              )}
            </div>
            <Button
              fullWidth
              size="xs"
              onClick={() =>
                navigate(
                  ehrUrl(selected.program, selected.persona, selected.day),
                )
              }
            >
              Open this revision
            </Button>
            {run && !selected.baseline && (
              <div className="timeline-links">
                <a
                  href={`/dashboard?${new URLSearchParams({ run: run.manifest.runId, persona: selected.persona, version: String(selected.program.version) })}`}
                >
                  Compare with previous revision →
                </a>
                {run.files?.includes("trajectories/index.json") && (
                  <a
                    href={`/dashboard?${new URLSearchParams({ run: run.manifest.runId, persona: selected.persona, view: "compare", day: String(selected.day), revision: String(selected.program.version) })}`}
                  >
                    Compare with baseline →
                  </a>
                )}
                <a
                  href={`/dashboard?${new URLSearchParams({ run: run.manifest.runId, persona: selected.persona, view: "Trajectories", day: String(selected.day) })}`}
                >
                  Replay this day’s trajectories →
                </a>
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

export function Browse() {
  const query = new URLSearchParams(window.location.search);
  const [catalog, setCatalog] = useState<Catalog>();
  const [runId, setRunId] = useState(query.get("run") ?? "");
  const [run, setRun] = useState<RunData>();
  const [verdicts, setVerdicts] = useState<Verdicts>({});
  const [showMock, setShowMock] = useState(query.get("mock") === "1");
  const [error, setError] = useState("");
  const [runError, setRunError] = useState("");
  useEffect(() => {
    void Promise.all([
      loadCatalog(),
      readArtifact("/verdicts.json").then((data) => verdictsSchema.parse(data)),
    ])
      .then(([data, checks]) => {
        setCatalog(data);
        setVerdicts(checks.programs);
        setRunId((current) =>
          data.runs.some((run) => run.id === current && (!run.mock || showMock))
            ? current
            : (data.runs.find((run) => !run.mock)?.id ?? ""),
        );
      })
      .catch((error: unknown) => setError(String(error)));
    // URL inputs are read only on the route's initial mount.
  }, []);
  useEffect(() => {
    let active = true;
    setRun(undefined);
    setRunError("");
    if (runId)
      void loadRunSummary(runId)
        .then((run) => {
          if (active) setRun(run);
        })
        .catch((error: unknown) => {
          if (active) setRunError(String(error));
        });
    return () => {
      active = false;
    };
  }, [runId]);
  useEffect(() => {
    if (!catalog) return;
    const params = new URLSearchParams({
      ...(runId ? { run: runId } : {}),
      ...(showMock ? { mock: "1" } : {}),
    });
    window.history.replaceState(
      null,
      "",
      `/browse?${params}${window.location.hash}`,
    );
  }, [catalog, runId, showMock]);
  const visibleRuns =
    catalog?.runs.filter((run) => showMock || !run.mock) ?? [];
  const programs =
    catalog?.programs.filter((program) => !program.mock || showMock) ?? [];
  return (
    <>
      <AppHeader active="browse" />
      <main className="browser-page">
        <div className="browse-heading">
          <div>
            <span className="browser-eyebrow">
              CANONICAL EHR & PERSONALIZATION
            </span>
            <h1>Open a clinical UI</h1>
            <p>
              One vendor baseline. A certified view for every role.
              Personalization on each clinician’s fork.
            </p>
          </div>
          <div className="browse-run-controls">
            <label>
              Recorded run
              <select
                aria-label="Recorded run"
                value={runId}
                onChange={(event) => setRunId(event.currentTarget.value)}
              >
                <option value="">Certified baselines only</option>
                {visibleRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.id}
                    {run.mock ? " · mock (illustrative)" : " · real"}
                  </option>
                ))}
              </select>
            </label>
            <Switch
              size="xs"
              label="Show mock data"
              checked={showMock}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setShowMock(checked);
                if (
                  !checked &&
                  catalog?.runs.find((run) => run.id === runId)?.mock
                )
                  setRunId(catalog.runs.find((run) => !run.mock)?.id ?? "");
              }}
            />
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        {runError && <p role="alert">{runError}</p>}
        {!catalog ? (
          <p role="status">Loading certified UI catalog…</p>
        ) : (
          <>
            <div className="browse-context">
              <span>
                Choose a chart day on the timeline. Select a patient inside the
                EHR.
              </span>
              {run?.manifest.ehr.mode === "fake" && (
                <span className="browser-badge warning">
                  MOCK authored data
                </span>
              )}
            </div>
            {runId && !run && !runError ? (
              <p role="status">Loading recorded deployments…</p>
            ) : (
              <Timeline catalog={catalog} run={run} verdicts={verdicts} />
            )}
            <div className="browse-lower">
              <section
                className="browser-panel program-panel"
                aria-labelledby="program-title"
              >
                <div className="browser-section-heading">
                  <ClinicalIcon name="lock" />
                  <h2 id="program-title">Certified role views</h2>
                  <span>Open at the role’s landing activity</span>
                </div>
                <div className="program-grid-scroll">
                  <table className="program-grid">
                    <thead>
                      <tr>
                        <th scope="col">View</th>
                        {vendorReleases.map((release) => (
                          <th scope="col" key={release.id}>
                            {release.id}
                            <small>
                              {release.day === 0
                                ? "Initial EHR"
                                : `Day ${release.day} release`}
                            </small>
                          </th>
                        ))}
                        <th scope="col">
                          Latest personalized
                          <small>Newest real run per persona</small>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {["vendor", ...personas].map((persona) => (
                        <tr
                          key={persona}
                          className={
                            persona === "vendor"
                              ? "vendor-reference"
                              : `persona-${persona.toLowerCase()}`
                          }
                        >
                          <th scope="row">
                            <strong>
                              {persona === "vendor"
                                ? "Vendor reference"
                                : `${persona} · ${personaNames[persona]}`}
                            </strong>
                            <small>
                              {persona === "vendor"
                                ? "Shared source · compare only"
                                : "Canonical with role permissions"}
                            </small>
                          </th>
                          {vendorReleases.map((release) => {
                            const program = programs.find(
                              (program) =>
                                program.path ===
                                `releases/${release.id}/${persona === "vendor" ? "canonical" : `personas/${persona}`}.json`,
                            );
                            return (
                              <td key={release.id}>
                                {program ? (
                                  <>
                                    <CertificateBadge
                                      program={program}
                                      verdicts={verdicts}
                                    />
                                    <Button
                                      component="a"
                                      href={ehrUrl(
                                        program,
                                        persona === "vendor" ? "P1" : persona,
                                      )}
                                      size="compact-xs"
                                      variant={
                                        persona === "vendor"
                                          ? "outline"
                                          : "light"
                                      }
                                      title={program.path}
                                    >
                                      Open
                                      {persona === "vendor" ? " reference" : ""}
                                    </Button>
                                  </>
                                ) : (
                                  "Unavailable"
                                )}
                              </td>
                            );
                          })}
                          <td>
                            {(() => {
                              const latest = catalog.runs
                                .filter((run) => !run.mock)
                                .flatMap((run) =>
                                  programs.filter(
                                    (program) =>
                                      program.run === run.id &&
                                      program.persona === persona &&
                                      program.deployed,
                                  ),
                                )[0];
                              return latest ? (
                                <>
                                  <CertificateBadge
                                    program={latest}
                                    verdicts={verdicts}
                                    run={
                                      run?.manifest.runId === latest.run
                                        ? run
                                        : undefined
                                    }
                                  />
                                  <Button
                                    component="a"
                                    href={ehrUrl(latest)}
                                    size="compact-xs"
                                    title={latest.path}
                                  >
                                    Open rev {latest.version}
                                  </Button>
                                </>
                              ) : (
                                <span className="browser-muted">
                                  {persona === "vendor"
                                    ? "Personalization is per clinician"
                                    : "No recorded run yet"}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="program-grid-note">
                  The vendor reference is shared by every role. Sign in through
                  a certified role view to use that role’s permissions and
                  preset navigation.
                </p>
              </section>
            </div>
            <details className="browser-panel browser-details">
              <summary>
                Bad programs (should be rejected){" "}
                <span>
                  {
                    programs.filter(
                      (program) => program.group === "Bad programs",
                    ).length
                  }{" "}
                  safety examples
                </span>
              </summary>
              <div className="bad-program-list">
                {programs
                  .filter((program) => program.group === "Bad programs")
                  .map((program) => (
                    <div key={program.path}>
                      <strong>
                        {program.label}
                        <small className="bad-expected">
                          Expected:{" "}
                          {program.expectedProperty ?? "See checker result"}
                        </small>
                      </strong>
                      <CertificateBadge program={program} verdicts={verdicts} />
                      <Button
                        component="a"
                        size="compact-xs"
                        variant="outline"
                        href={ehrUrl(program)}
                        title={program.path}
                      >
                        Open example
                      </Button>
                    </div>
                  ))}
              </div>
            </details>
            <details className="browser-panel browser-details">
              <summary>
                Recorded revisions{" "}
                <span>Certified forks and deployment history</span>
              </summary>
              {visibleRuns.map((recorded) => (
                <section className="recorded-run" key={recorded.id}>
                  <h3>
                    {recorded.id}{" "}
                    {recorded.mock && (
                      <span className="browser-badge warning">MOCK</span>
                    )}
                  </h3>
                  {personas.map((persona) => {
                    const revisions = programs
                      .filter(
                        (program) =>
                          program.run === recorded.id &&
                          program.persona === persona,
                      )
                      .sort((a, b) => a.version - b.version);
                    return revisions.length ? (
                      <div className="recorded-revisions" key={persona}>
                        <strong>
                          {persona} · {personaNames[persona]}
                        </strong>
                        {revisions.map((program) => {
                          const decision =
                            run?.manifest.runId === recorded.id
                              ? run.records.find(
                                  (record) =>
                                    record.persona === persona &&
                                    record.versionAfter === program.version &&
                                    record.versionAfter > record.versionBefore,
                                )
                              : undefined;
                          return (
                            <div
                              className="recorded-revision-card"
                              key={program.path}
                            >
                              <a href={ehrUrl(program)} title={program.path}>
                                rev {program.version}
                                {program.deployed ? " · deployed" : ""}
                              </a>
                              <span className="browser-muted">
                                {program.version === 0
                                  ? "Baseline"
                                  : decision
                                    ? `Night ${decision.night}`
                                    : "Recorded revision"}
                              </span>
                              <CertificateBadge
                                program={program}
                                verdicts={verdicts}
                                run={
                                  run?.manifest.runId === recorded.id
                                    ? run
                                    : undefined
                                }
                              />
                              <p>
                                {decision?.hypothesis ??
                                  (program.version === 0
                                    ? "Canonical with role permissions and preset navigation."
                                    : "Select this run above for its decision details.")}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })}
                </section>
              ))}
            </details>
            <p className="browse-footer">
              Synthetic patient records · Original VGI visual design · Clinical
              behavior comes from the certified UI program
            </p>
          </>
        )}
      </main>
    </>
  );
}
