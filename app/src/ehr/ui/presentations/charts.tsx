import type { Info } from "./StructuredInfo";
import type { Pair } from "../types";

type Point = { x: number; y: number; label: string };
type Series = {
  name: string;
  unit: string;
  points: Point[];
  references: Map<string, Point[]>;
  timeBased: boolean;
};
function cell(row: Pair[], key: string) {
  return row.find(([name]) => name === key)?.[1] ?? "";
}
function number(value: string): number | undefined {
  // Plot only an entire supplied numeric string. Do not turn '<5' or '120/80' into a number.
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim())) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
/** Geometry only: unlike measures and units always occupy different charts. */
function seriesFor(node: Info, kind: "trend" | "growth"): Series[] {
  const groups = new Map<string, Series>();
  const add = (
    name: string,
    unit: string,
    x: number | undefined,
    y: number | undefined,
    label: string,
    percentile = "",
    timeBased = true,
  ) => {
    if (x === undefined || y === undefined) return;
    const key = `${name}\u0000${unit}`;
    const series = groups.get(key) ?? {
      name,
      unit,
      points: [],
      references: new Map<string, Point[]>(),
      timeBased: true,
    };
    series.timeBased = series.timeBased && timeBased;
    if (percentile) {
      const points = series.references.get(percentile) ?? [];
      points.push({ x, y, label });
      series.references.set(percentile, points);
    } else series.points.push({ x, y, label });
    groups.set(key, series);
  };
  node.rows.forEach((row, index) => {
    if (kind === "growth") {
      const age = number(cell(row, "Age (months)"));
      add(
        "Weight",
        "kg",
        age,
        number(cell(row, "Weight (kg)")),
        cell(row, "Date"),
      );
      add(
        "Height",
        "cm",
        age,
        number(cell(row, "Height (cm)")),
        cell(row, "Date"),
      );
      if (cell(row, "Percentile"))
        add(
          cell(row, "Series"),
          cell(row, "Unit"),
          age,
          number(cell(row, "Value")),
          cell(row, "Reference"),
          cell(row, "Percentile"),
        );
    } else {
      const name = cell(row, "Test") || cell(row, "Measure") || node.label;
      const unit = cell(row, "Unit");
      // Summary + dated trend are both in the table; plot each dated trend once.
      const detailed = node.rows.some(
        (other) =>
          cell(other, "Test") === name &&
          cell(other, "Unit") === unit &&
          !other.some(([key]) => key === "Range"),
      );
      if (row.some(([key]) => key === "Range") && detailed) return;
      const label = cell(row, "Recorded") || cell(row, "Date");
      const time = Date.parse(label);
      add(
        name,
        unit,
        Number.isFinite(time) ? time : index,
        number(cell(row, "Value")),
        label,
        "",
        Number.isFinite(time),
      );
    }
  });
  return [...groups.values()].map((series) =>
    series.timeBased
      ? series
      : {
          ...series,
          points: series.points.map((point, index) => ({ ...point, x: index })),
        },
  );
}
export function ClinicalChart({
  node,
  kind,
}: {
  node: Info;
  kind: "trend" | "growth";
}) {
  const series = seriesFor(node, kind);
  if (!series.length) return null;
  return (
    <div className="presentation-charts">
      {series.map((s) => {
        const all = [...s.points, ...[...s.references.values()].flat()];
        const xmin = Math.min(...all.map((p) => p.x)),
          xmax = Math.max(...all.map((p) => p.x));
        const ymin = Math.min(...all.map((p) => p.y)),
          ymax = Math.max(...all.map((p) => p.y));
        const yrange = ymax - ymin || Math.abs(ymax) * 0.1 || 1;
        const low = ymin - yrange * 0.12,
          high = ymax + yrange * 0.12;
        const x = (n: number) => 64 + ((n - xmin) / (xmax - xmin || 1)) * 560;
        const y = (n: number) => 200 - ((n - low) / (high - low)) * 162;
        const path = (points: Point[]) =>
          points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ");
        const lower = s.references.get("5th"),
          upper = s.references.get("95th");
        const band =
          lower &&
          upper &&
          lower.length === upper.length &&
          lower.every((p, i) => p.x === upper[i]?.x)
            ? path(lower) + " " + path([...upper].reverse())
            : undefined;
        const aria = `${node.label}: ${s.name}${s.unit ? ` (${s.unit})` : ""}`;
        return (
          <figure key={`${s.name}-${s.unit}`} className="presentation-chart">
            <figcaption>
              {s.name}
              {s.unit && <span> ({s.unit})</span>}
            </figcaption>
            <svg role="img" aria-label={aria} viewBox="0 0 700 246">
              <title>{aria}</title>
              <desc>
                {kind === "growth"
                  ? "Age in months on the horizontal axis. "
                  : s.timeBased
                    ? "Recorded time on the horizontal axis. "
                    : "Observation sequence on the horizontal axis. "}
                All source values appear in the table below.
              </desc>
              {band && (
                <polygon points={band} className="chart-reference-band" />
              )}
              {[0, 1, 2, 3, 4].map((i) => {
                const value = low + ((high - low) * i) / 4,
                  py = y(value);
                return (
                  <g key={i}>
                    <line
                      x1="64"
                      x2="624"
                      y1={py}
                      y2={py}
                      className="chart-grid"
                    />
                    <text x="56" y={py + 4} textAnchor="end">
                      {Number(value.toPrecision(3))}
                    </text>
                  </g>
                );
              })}
              {[0, 1, 2, 3, 4].map((i) => {
                const value = xmin + ((xmax - xmin) * i) / 4,
                  px = x(value);
                const text =
                  kind === "growth"
                    ? String(Number(value.toFixed(1)))
                    : s.timeBased
                      ? new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })
                      : s.points[Math.round(value)]?.label || "Not recorded";
                return (
                  <g key={i}>
                    <line
                      x1={px}
                      x2={px}
                      y1="38"
                      y2="200"
                      className="chart-grid"
                    />
                    <text x={px} y="222" textAnchor="middle">
                      {text}
                    </text>
                  </g>
                );
              })}
              {[...s.references].map(([percentile, points]) => {
                const last = points.at(-1);
                return (
                  <g key={percentile}>
                    <polyline
                      points={path(points)}
                      className="chart-reference"
                    />
                    {last && (
                      <text
                        x="634"
                        y={y(last.y) + 4}
                        className="chart-reference-label"
                      >
                        {percentile}
                      </text>
                    )}
                  </g>
                );
              })}
              {s.points.length > 1 && (
                <polyline
                  points={path(s.points)}
                  className="chart-patient-line"
                />
              )}
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.x)}
                  cy={y(p.y)}
                  r="4.5"
                  className="chart-patient-point"
                >
                  <title>
                    {p.label}: {p.y} {s.unit}
                  </title>
                </circle>
              ))}
              <text x="344" y="244" textAnchor="middle">
                {kind === "growth"
                  ? "Age (months)"
                  : s.timeBased
                    ? "Recorded"
                    : "Observation sequence"}
              </text>
            </svg>
            {kind === "growth" && (
              <p className="presentation-chart-source">
                {s.references.size
                  ? [
                      ...new Set(
                        node.rows
                          .filter(
                            (row) =>
                              cell(row, "Series") === s.name &&
                              cell(row, "Unit") === s.unit,
                          )
                          .map((row) => cell(row, "Reference"))
                          .filter(Boolean),
                      ),
                    ].join(" • ")
                  : "Percentile reference data not supplied."}
              </p>
            )}
          </figure>
        );
      })}
    </div>
  );
}
