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
/** Tick spacing affects geometry only; it never supplies a clinical reference range. */
function numericAxis(min: number, max: number) {
  const padding = (max - min) * 0.06 || Math.abs(max) * 0.01 || 1;
  const interval = (max - min + 2 * padding) / 4;
  const power = 10 ** Math.floor(Math.log10(interval));
  const step =
    ([1, 2, 2.5, 5, 10].find((n) => n * power >= interval) ?? 10) * power;
  const start = Math.floor((min - padding) / step);
  const end = Math.ceil((max + padding) / step);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return { low: min, high: max, ticks: [...new Set([min, max])] };
  const low = start * step,
    high = end * step;
  if (!Number.isFinite(low) || !Number.isFinite(high) || low === high)
    return { low: min, high: max, ticks: [...new Set([min, max])] };
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(step)));
  return {
    low,
    high,
    ticks: [
      ...new Set(
        Array.from({ length: end - start + 1 }, (_, i) =>
          Number(
            decimals > 100
              ? ((start + i) * step).toPrecision(15)
              : ((start + i) * step).toFixed(decimals),
          ),
        ),
      ),
    ],
  };
}
function fraction(value: number, low: number, high: number) {
  if (low === high) return 0.5;
  if (Number.isFinite(high - low)) return (value - low) / (high - low);
  const scale = Math.max(Math.abs(low), Math.abs(high)) || 1;
  return (value / scale - low / scale) / (high / scale - low / scale);
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
      ? {
          ...series,
          points: [...series.points].sort((a, b) => a.x - b.x),
          references: new Map(
            [...series.references].map(([name, points]) => [
              name,
              [...points].sort((a, b) => a.x - b.x),
            ]),
          ),
        }
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
        const { xmin, xmax, ymin, ymax } = all.reduce(
          (bounds, point) => ({
            xmin: Math.min(bounds.xmin, point.x),
            xmax: Math.max(bounds.xmax, point.x),
            ymin: Math.min(bounds.ymin, point.y),
            ymax: Math.max(bounds.ymax, point.y),
          }),
          { xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity },
        );
        const { low, high, ticks: valueTicks } = numericAxis(ymin, ymax);
        const x = (n: number) => 64 + fraction(n, xmin, xmax) * 560;
        const y = (n: number) => 200 - fraction(n, low, high) * 162;
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
        const recorded = [...new Set(s.points.map((point) => point.x))];
        const tickLimit = kind === "growth" ? 6 : 5;
        const recordedTicks =
          recorded.length <= tickLimit
            ? recorded
            : Array.from(
                { length: tickLimit },
                (_, i) =>
                  recorded[
                    Math.round((i * (recorded.length - 1)) / (tickLimit - 1))
                  ] ?? xmin,
              );
        // Ages use supplied measurement points, not interpolated fractional months.
        const ticks = recordedTicks.length ? recordedTicks : [xmin];
        const sourceTick = (value: number) => {
          if (kind === "growth") return String(Number(value.toFixed(1)));
          if (!s.timeBased) return String(Math.round(value) + 1);
          const label =
            s.points.find((point) => point.x === value)?.label ?? "";
          const human =
            /^([A-Za-z]{3}) (\d{1,2}), \d{4}(?: (\d{2}:\d{2}))?$/.exec(label);
          if (human)
            return recorded.length === 1
              ? label
              : xmax - xmin < 86_400_000 && human[3]
                ? human[3]
                : `${human[1]} ${human[2]}`;
          // Labels retain the supplied wall date/time; geometry never rewrites them through UTC.
          const iso = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(label);
          return iso
            ? recorded.length === 1
              ? `${iso[1]}${iso[2] ? ` ${iso[2]}` : ""}`
              : xmax - xmin < 86_400_000 && iso[2]
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
                All source values appear in the table below.
              </desc>
              {band && (
                <polygon points={band} className="chart-reference-band" />
              )}
              {valueTicks.map((value, i) => {
                const py = y(value);
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
                      {value}
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
