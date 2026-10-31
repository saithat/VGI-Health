import type { Observation } from "../data/fhir";
import { conceptText, dateText } from "../data/fhir";

/** SVG deliberately has no hidden state, animation, or data loading. */
export function TrendChart({
  observations,
  label,
}: {
  observations: Observation[];
  label: string;
}) {
  const sorted = observations
    .filter((item) => item.valueQuantity?.value !== undefined)
    .sort((a, b) =>
      (a.effectiveDateTime ?? "").localeCompare(b.effectiveDateTime ?? ""),
    );
  if (sorted.length === 0)
    return (
      <div className="empty-state">
        No measurements recorded for {label.toLowerCase()}.
      </div>
    );
  const first = sorted[0];
  const unit = first?.valueQuantity?.unit ?? "";
  const values = sorted.map((item) => item.valueQuantity?.value ?? 0);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = Math.max(high - low, 1);
  const min = low - spread * 0.25;
  const max = high + spread * 0.25;
  const points = sorted.map((item, index) => ({
    item,
    x: 58 + (index * 650) / Math.max(sorted.length - 1, 1),
    y: 150 - (((item.valueQuantity?.value ?? 0) - min) / (max - min)) * 122,
  }));
  return (
    <figure className="trend-chart">
      <figcaption>
        {label}{" "}
        <span>
          {unit} · {sorted.length} measurements
        </span>
      </figcaption>
      <svg
        viewBox="0 0 760 196"
        role="img"
        aria-label={`${label}: ${values.join(", ")} ${unit}`}
      >
        {[0, 1, 2, 3].map((tick) => {
          const y = 28 + (tick * 122) / 3;
          return (
            <g key={tick}>
              <line x1="52" x2="720" y1={y} y2={y} stroke="#e1e7ee" />
              <text x="44" y={y + 4} textAnchor="end">
                {(max - (tick * (max - min)) / 3).toFixed(1)}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="#218b91"
          strokeWidth="2.5"
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        />
        {points.map(({ item, x, y }) => (
          <circle key={item.id} cx={x} cy={y} r="4" fill="#218b91">
            <title>{`${dateText(item.effectiveDateTime)}: ${item.valueQuantity?.value} ${unit}`}</title>
          </circle>
        ))}
        <text x="58" y="179">
          {dateText(first?.effectiveDateTime)}
        </text>
        <text x="708" y="179" textAnchor="end">
          {dateText(sorted.at(-1)?.effectiveDateTime)}
        </text>
      </svg>
      <details>
        <summary>Measurement data</summary>
        <table className="dense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Measurement</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id}>
                <td>{dateText(item.effectiveDateTime)}</td>
                <td>{conceptText(item.code)}</td>
                <td>
                  {item.valueQuantity?.value} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
