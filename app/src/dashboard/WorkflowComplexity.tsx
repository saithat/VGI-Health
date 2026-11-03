import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import { useEffect, useRef, useState } from "react";
import type { RunData } from "./data";
import {
  formatComplexity as fmt,
  metricOptions,
  type Metric,
} from "./complexity-data";
import { workloadAt, versionsFor } from "./workload";
import "./complexity.css";

export const personas = [
  { id: "P1", name: "Primary care physician" },
  { id: "P2", name: "ED physician" },
  { id: "P3", name: "Inpatient RN" },
  { id: "P4", name: "Pediatric NP" },
  { id: "P5", name: "General surgeon" },
];
const workflowNames: Record<string, string> = {
  W1: "Office visit",
  W2: "Results",
  W3: "ED disposition",
  W4: "MAR + assessment",
  W5: "Pediatrics",
  W6: "Surgery",
  W7: "Refills",
};
type Measure = "expert" | "workload";
const colors = [
  "#245A81",
  "#7A8FA6",
  "#65448B",
  "#256348",
  "#825300",
  "#243341",
  "#9C2833",
];
const workflowColor = (workflow: string, workflows: string[]) =>
  colors[Math.max(0, workflows.indexOf(workflow)) % colors.length];
interface Point {
  version: number;
  spec: string;
  values: { workflow: string; value: number }[];
  total: number | null;
  expert: number | null;
  floor: number | null;
  sample: string;
  unavailableReason:string|null;
}
function pointsFor(
  run: RunData,
  persona: string,
  measure: Measure,
  metric: Metric,
): Point[] {
  const exact = run.complexity?.personas.find((p) => p.persona === persona);
  return versionsFor(run, persona).map((version) => {
    const iteration = exact?.iterations.find((i) => i.version === version);
    const workload = workloadAt(run, persona, version);
    const missing=iteration?.tasks.filter(task=>task.status==='not-computed')??[];
    const complete=missing.length===0;
    const unavailableReason=missing.length?`not computed (${[...new Set(missing.map(task=>task.reason??'search bound'))].join(', ')})`:null;
    const key = metric === "clicks" || metric === "keystrokes" || metric === "scrolls" || metric === "scrollPx" || metric === "mouseTravelPx" ? metric : null;
    return {
      version,
      spec:
        iteration?.specVersion ??
        releaseLabel(
          run.programs.get(`programs/${persona}/v${version}.json`)
            ?.specVersion ?? "—",
          run.manifest.runId,
        ),
      values:
        measure === "expert"
          ? (complete?iteration?.workflows.flatMap((w) => typeof w.metrics[metric]==='number'?[{workflow:w.workflow,value:w.metrics[metric]??0}]:[])??[]:[])
          : key
            ? workload.workflows.flatMap((w) => typeof w.mean[key]==='number'?[{workflow:w.workflow,value:w.mean[key]??0}]:[])
            : [],
      total:
        measure === "expert"
          ? (complete?iteration?.total[metric]??null:null)
          : key
            ? (workload.total?.[key] ?? null)
            : null,
      expert: measure === "workload" && run.manifest.measurementProtocol && key ? workload.canonical?.[key] ?? null : complete?iteration?.total[metric]??null:null,
      floor: complete?iteration?.floor[metric]??null:null,unavailableReason,
      sample:
        measure === "expert"
          ? unavailableReason?`${unavailableReason}; ${iteration?.coverage?.computed??0}/${iteration?.coverage?.expected??iteration?.tasks.length??0} tasks computed; missing tasks excluded from floor aggregates`:[...new Set(iteration?.tasks.map((t) => t.space) ?? [])].join(
              ", ",
            ) || "Unavailable"
          : workload.total
            ? `Days ${workload.days.join(", ")} · ${workload.completed}/${workload.tasks} tasks completed${workload.unclassified ? ` · ${workload.unclassified} tasks without workflow excluded` : ""}`
            : "No recorded workload for this version",
    };
  });
}
function Chart({
  run,
  persona,
  points,
  ceiling,
  measure,
}: {
  run: RunData;
  persona: string;
  points: Point[];
  ceiling: number;
  measure: Measure;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const size = entries[0]?.contentRect.width;
      if (size) setWidth(Math.max(600, size));
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const height = 260,
    left = 52,
    right = 24,
    top = 34,
    bottom = 36;
  const plot = width - left - right;
  const x = (i: number) => left + ((i + 0.5) * plot) / points.length;
  const y = (value: number) =>
    top + (height - top - bottom) * (1 - value / ceiling);
  const workflows = [
    ...new Set(points.flatMap((p) => p.values.map((w) => w.workflow))),
  ];
  const markers = run.records.filter((r) => r.persona === persona && r.release);
  // Draw separate line segments around missing values; unknown is never zero.
  const line = (key: "floor" | "expert", dashed: boolean) =>
    points.flatMap((p, i) => {
      const prev = points[i - 1];
      const value = p[key];
      return value === null
        ? []
        : [
            <g key={`${key}-${p.version}`}>
              {prev && prev[key] !== null && (
                <line
                  x1={x(i - 1)}
                  y1={y(prev[key])}
                  x2={x(i)}
                  y2={y(value)}
                  stroke={dashed ? "#243341" : "#825300"}
                  strokeWidth={2}
                  strokeDasharray={dashed ? "6 4" : undefined}
                />
              )}
              <circle
                cx={x(i)}
                cy={y(value)}
                r={3}
                fill={dashed ? "#243341" : "#825300"}
              />
            </g>,
          ];
    });
  return (
    <div ref={ref} className="complexity-plot-scroll">
      <svg
        style={{ width, minWidth: width }}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${persona} union ${measure === "expert" ? "exact expert minimum" : "simulated realistic workload"} by UI iteration`}
      >
        <title>
          Union workflow complexity; exact values and sample sizes in the data
          table
        </title>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={left}
              x2={width - right}
              y1={y(ceiling * t)}
              y2={y(ceiling * t)}
              stroke="#CBD5DF"
            />
            <text x={left - 8} y={y(ceiling * t) + 4} textAnchor="end">
              {fmt(ceiling * t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          let acc = 0;
          const releases = markers.filter((r) => r.versionAfter === p.version);
          const bw = Math.min(44, (plot / points.length) * 0.45);
          return (
            <g key={p.version}>
              {releases.length > 0 && (
                <>
                  <line
                    x1={x(i)}
                    x2={x(i)}
                    y1={top - 12}
                    y2={height - bottom}
                    stroke="#718096"
                    strokeDasharray="3 4"
                  />
                  <text x={x(i)} y={16} textAnchor="middle">
                    {releases
                      .map((r) =>
                        releaseLabel(r.release?.id ?? "", run.manifest.runId),
                      )
                      .join(" / ")}
                  </text>
                </>
              )}
              {p.values.map((w) => {
                const before = acc;
                acc += w.value;
                return (
                  <rect
                    key={w.workflow}
                    x={x(i) - bw / 2}
                    y={y(acc)}
                    width={bw}
                    height={Math.max(0, y(before) - y(acc))}
                    fill={workflowColor(w.workflow, workflows)}
                  >
                    <title>
                      rev {p.version} · {w.workflow}: {fmt(w.value)}
                    </title>
                  </rect>
                );
              })}
              <text x={x(i)} y={height - 12} textAnchor="middle">
                rev {p.version}
                {p.total === null ? " · —" : ""}
              </text>
            </g>
          );
        })}
        {measure === "workload" && line("expert", false)}
        {line("floor", true)}
      </svg>
    </div>
  );
}
export function WorkflowComplexity({
  run,
  persona,
}: {
  run: RunData;
  persona: string;
}) {
  // Open on whichever measure has data, so the first view is never an empty chart.
  const [measure, setMeasure] = useState<Measure>(() =>
    pointsFor(run, persona, "expert", "clicks").some((p) => p.total !== null)
      ? "expert"
      : "workload",
  );
  const [metric, setMetric] = useState<Metric>("clicks");
  const [compare, setCompare] = useState(false);
  const selected = pointsFor(run, persona, measure, metric);
  const series = personas.map((p) => ({
    ...p,
    points: pointsFor(run, p.id, measure, metric),
  }));
  const maximum = Math.max(
    1,
    ...(compare ? series.flatMap((p) => p.points) : selected).flatMap((p) => [
      p.total ?? 0,
      p.floor ?? 0,
      measure === "workload" ? (p.expert ?? 0) : 0,
    ]),
  );
  const ceiling = Math.ceil((maximum * 1.15) / 5) * 5;
  const options = metricOptions.filter(
    (m) =>
      measure === "expert" ||
      ["clicks", "keystrokes", "scrolls","scrollPx","mouseTravelPx"].includes(m.key),
  );
  const unit = metricOptions.find((m) => m.key === metric)?.unit;
  const exact = run.complexity?.personas.find((p) => p.persona === persona);
  const workflows = [
    ...new Set(selected.flatMap((p) => p.values.map((w) => w.workflow))),
  ];
  return (
    <section
      className="workflow-complexity"
      aria-label="Union workflow complexity"
    >
      <div className="complexity-controls">
        <h3>Effort by revision</h3>
        <label>
          Measure{" "}
          <select
            aria-label="Complexity measure"
            value={measure}
            onChange={(e) => {
              setMeasure(
                e.currentTarget.value === "workload" ? "workload" : "expert",
              );
              if (!["clicks", "keystrokes", "scrolls","scrollPx","mouseTravelPx"].includes(metric))
                setMetric("clicks");
            }}
          >
            <option value="expert">Expert minimum</option>
            <option value="workload">Realistic workload</option>
          </select>
        </label>
        <label>
          Metric{" "}
          <select
            aria-label="Complexity metric"
            value={metric}
            onChange={(e) => {
              const option = metricOptions.find(
                (m) => m.key === e.currentTarget.value,
              );
              if (option) setMetric(option.key);
            }}
          >
            {options.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.currentTarget.checked)}
          />{" "}
          Compare personas
        </label>
      </div>
      <div className="complexity-key">
        {workflows.map((w) => (
          <span key={w} className="workflow-key">
            <i style={{ background: workflowColor(w, workflows) }} />
            {w} · {workflowNames[w]}
          </span>
        ))}
        <span className="floor-key">Theoretical minimum</span>
        {measure === "workload" && (
          <span className="expert-key">
            {run.manifest.measurementProtocol ? "Certified canonical" : "Expert minimum"}
          </span>
        )}
        {exact?.markers
          .filter((m) => m.kind === "release")
          .map((m) => (
            <span key={`${m.version}-${m.label}`} className="release-key">
              Release {m.label} · rev {m.version}
            </span>
          ))}
        <span className="unit-key">{unit} per workflow union</span>
      </div>
      {compare ? (
        <div className="complexity-multiples">
          {series.map((p) => (
            <article key={p.id}>
              <h4>
                {p.id} · {p.name}
              </h4>
              {p.points.some((p) => p.total !== null) ? (
                <Chart
                  run={run}
                  persona={p.id}
                  points={p.points}
                  ceiling={ceiling}
                  measure={measure}
                />
              ) : (
                <p>No measured iterations in this run.</p>
              )}
            </article>
          ))}
        </div>
      ) : selected.some((p) => p.total !== null) ? (
        <Chart
          run={run}
          persona={persona}
          points={selected}
          ceiling={ceiling}
          measure={measure}
        />
      ) : (
        <p role="status">
          No {measure === "expert" ? "exact benchmark" : "simulated workload"}{" "}
          recorded for this persona.
        </p>
      )}
      {compare && (
        <p className="complexity-method">
          Shared scale: 0–{fmt(ceiling)} {unit}.
        </p>
      )}
      <details className="complexity-numbers">
        <summary>Chart data and measurement definitions</summary>
        <p className="complexity-method">
          {measure === "expert"
            ? "Bars: exact expert minimum. Fixed representative case per workflow, summed across the workflow union. Exact within the reported search space; Interaction geometry and other counts follow the minimum-click path. Keystrokes are optimized separately."
            : `Bars: simulated realistic workload. Simulated day results: mean clicks, scrolls and mouse pixels per completed paired task within each workflow, then sum those workflow means. Incomplete tasks are counted separately and excluded from savings. Patient mix varies by iteration; this is observed effort, not a controlled causal estimate. Solid line: ${run.manifest.measurementProtocol ? "certified canonical for each day’s active release · same schedule and seed" : "exact expert minimum · fixed cases"}.`}{" "}
          Dashed line: theoretical minimum · fixed benchmark.
        </p>
        <p className="complexity-method">
          Geometry model: Chromium at 1440×900, representative screen states,
          straight-line travel between control centers with no tremor. Scroll
          distance includes measured reveal offsets. Missing pixels are
          unavailable; these are modeled interactions, not observed humans.
        </p>
        <div className="table-scroll">
          <table>
            <caption>
              {persona} ·{" "}
              {measure === "expert"
                ? "Exact expert minimum"
                : "Simulated realistic workload"}{" "}
              · {unit} / workflow union
            </caption>
            <thead>
              <tr>
                <th scope="col">Iteration</th>
                <th scope="col">Release</th>
                <th scope="col">Workflows</th>
                <th scope="col">Union effort</th>
                <th scope="col">Exact expert</th>
                <th scope="col">Theoretical minimum</th>
                <th scope="col">Source / sample</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((p) => (
                <tr key={p.version}>
                  <th scope="row">
                    rev {p.version}
                    {p.version === 0 ? " · baseline" : ""}
                  </th>
                  <td>{p.spec}</td>
                  <td>
                    {p.values
                      .map((w) => `${w.workflow}: ${fmt(w.value)}`)
                      .join("; ") || "Unavailable"}
                  </td>
                  <td>{p.total === null ? p.unavailableReason??"Unavailable" : fmt(p.total)}</td>
                  <td>{p.expert === null ? p.unavailableReason??"Unavailable" : fmt(p.expert)}</td>
                  <td>{p.floor === null ? p.unavailableReason??"Unavailable" : fmt(p.floor)}</td>
                  <td>{p.sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {run.complexity?.suite} {run.complexity?.search}
        </p>
        <p>
          Missing values are unavailable, never zero. Floor searches run only after adaptation; bounded tasks say “not computed (search bound)” and are excluded from aggregates. Partial unions are not charted as complete floors. Realistic workload uses
          recorded day results at the exact program version; no predictions are
          used. Different personas cover different workflow unions. Mouse travel uses measured component centers at 1440×900, straight lines, no tremor; missing geometry is unavailable.
        </p>
      </details>
    </section>
  );
}
