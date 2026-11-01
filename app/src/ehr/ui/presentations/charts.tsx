import { useContext } from "react";
import { ChartReferenceContext } from "../clinical-metadata";
import type { UiChartReference } from "../../../../../lean/generated/ehr-types";
import type { Info } from "./StructuredInfo";
import type { Pair } from "../types";

type Point = { x: number; y: number; label: string };
type ReferenceCurve = { percentile: string; source: string; points: Point[] };
type Series = {
  name: string;
  unit: string;
  points: Point[];
  references: Map<string, ReferenceCurve>;
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
function seriesFor(
  node: Info,
  kind: "trend" | "growth",
  supplied: UiChartReference[],
): Series[] {
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
      references: new Map<string, ReferenceCurve>(),
      timeBased: true,
    };
    series.timeBased = series.timeBased && timeBased;
    if (percentile) {
      const key = `${label}\u0000${percentile}`;
      const curve = series.references.get(key) ?? {
        percentile,
        source: label,
        points: [],
      };
      curve.points.push({ x, y, label });
      series.references.set(key, curve);
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
  if (kind === "growth")
    for (const reference of supplied) {
      const group = groups.get(`${reference.measure}\u0000${reference.unit}`);
      if (!group) continue;
      const source = `${reference.source} · ${reference.population}`;
      group.references.set(`${source}\u0000${reference.percentile}`, {
        percentile: reference.percentile,
        source,
        points: reference.points.map(([age, value]) => ({
          x: age / 10,
          y: value / 100,
          label: source,
        })),
      });
    }
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
  const supplied = useContext(ChartReferenceContext);
  const series = seriesFor(node, kind, supplied);
  if (!series.length) return null;
  return (
    <div className="presentation-charts">
      {series.map((s) => {
        const all = [
          ...s.points,
          ...[...s.references.values()].flatMap((curve) => curve.points),
        ];
        const { xmin, xmax, ymin, ymax } = all.reduce(
          (bounds, point) => ({
            xmin: Math.min(bounds.xmin, point.x),
            xmax: Math.max(bounds.xmax, point.x),
            ymin: Math.min(bounds.ymin, point.y),
            ymax: Math.max(bounds.ymax, point.y),
          }),
          { xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity },
        );
        const yrange = ymax - ymin || Math.abs(ymax) * 0.1 || 1;
        const low = ymin - yrange * 0.12,
          high = ymax + yrange * 0.12;
        const x = (n: number) =>
          xmin === xmax ? 344 : 64 + ((n - xmin) / (xmax - xmin)) * 560;
        const y = (n: number) => 200 - ((n - low) / (high - low)) * 162;
        const path = (points: Point[]) =>
          points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ");
        const curves = [...s.references.values()];
        const bands = [...new Set(curves.map((curve) => curve.source))].flatMap(
          (source) => {
            const lower = curves.find(
              (curve) => curve.source === source && curve.percentile === "5th",
            )?.points;
            const upper = curves.find(
              (curve) => curve.source === source && curve.percentile === "95th",
            )?.points;
            return lower &&
              upper &&
              lower.length === upper.length &&
              lower.every((p, i) => p.x === upper[i]?.x)
              ? [
                  {
                    source,
                    points: path(lower) + " " + path([...upper].reverse()),
                  },
                ]
              : [];
          },
        );
        const recorded = [...new Set(s.points.map((point) => point.x))];
        const recordedTicks =
          recorded.length <= 5
            ? recorded
            : [0, 1, 2, 3, 4].map(
                (i) =>
                  recorded[Math.round((i * (recorded.length - 1)) / 4)] ?? xmin,
              );
        const ticks =
          kind === "growth"
            ? xmin === xmax
              ? [xmin]
              : [0, 1, 2, 3, 4].map((i) => xmin + ((xmax - xmin) * i) / 4)
            : recordedTicks;
        const sourceTick = (value: number) => {
          if (kind === "growth") return String(Number(value.toFixed(1)));
          if (!s.timeBased) return String(Math.round(value) + 1);
          const label =
            s.points.find((point) => point.x === value)?.label ?? "";
          const human =
            /^([A-Za-z]{3}) (\d{1,2}), \d{4}(?: (\d{2}:\d{2}))?$/.exec(label);
          if (human)
            return xmax - xmin < 86_400_000 && human[3]
              ? human[3]
              : `${human[1]} ${human[2]}`;
          // Labels retain the supplied wall date/time; geometry never rewrites them through UTC.
          const iso = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(label);
          return iso
            ? xmax - xmin < 86_400_000 && iso[2]
              ? iso[2]
              : (iso[1] ?? label)
            : label;
        };
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
                All recorded patient values appear in the table below.
              </desc>
              {bands.map((band) => (
                <polygon
                  key={band.source}
                  points={band.points}
                  className="chart-reference-band"
                />
              ))}
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
              {ticks.map((value, i) => {
                const px = x(value),
                  text = sourceTick(value);
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
              {[...s.references].map(([key, curve]) => {
                const { points, percentile, source } = curve;
                const last = points.at(-1);
                return (
                  <g key={key}>
                    <title>
                      {source}: {percentile} reference curve
                    </title>
                    <polyline
                      points={path(points)}
                      className="chart-reference"
                    />
                    {last && (
                      <text
                        x={last ? x(last.x) + 8 : 634}
                        y={y(last.y) + 4}
                        className="chart-reference-label"
                      >
                        {percentile}
                      </text>
                    )}
                  </g>
                );
              })}
              {s.points.length > 1 && xmin !== xmax && (
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
                        curves.map((curve) => curve.source).filter(Boolean),
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
