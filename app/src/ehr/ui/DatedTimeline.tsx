import type { ReactNode } from "react";
import type { NodeOf, UiNode } from "./types";

/** Coordinates and ordering come from Lean; raw FHIR timestamp/provenance survives. */
export function DatedTimeline({
  node,
  render,
}: {
  node: NodeOf<"datedTimeline">;
  render: (children: UiNode[]) => ReactNode;
}) {
  const first = node.dated[0];
  const offset = (item: NodeOf<"datedTimeline">["dated"][number]) =>
    item.utcSecond -
    (first?.utcSecond ?? 0) +
    (item.nanosecond - (first?.nanosecond ?? 0)) / 1e9;
  const last = node.dated.at(-1);
  const span = Math.max(1e-9, last ? offset(last) : 1);
  return (
    <section className="clinical-dated" role="region" aria-label={node.title}>
      <h2>{node.title}</h2>
      <svg
        className="time-axis"
        viewBox="0 0 1000 60"
        role="img"
        aria-label="Proportional UTC time axis"
      >
        <line x1="20" y1="30" x2="980" y2="30" stroke="currentColor" />
        {node.dated.map((item, i) => (
          <circle
            key={i}
            data-second={item.utcSecond}
            data-nanosecond={item.nanosecond}
            cx={20 + (offset(item) / span) * 960}
            cy="30"
            r="5"
            fill="currentColor"
          >
            <title>
              {item.source.timestamp} · {item.source.resource}
            </title>
          </circle>
        ))}
      </svg>
      <ol aria-label="Dated source events">
        {node.dated.map((item, i) => (
          <li
            key={i}
            data-second={item.utcSecond}
            data-nanosecond={item.nanosecond}
          >
            <time dateTime={item.source.timestamp}>
              {new Date(item.utcSecond * 1000).toISOString().slice(0, 19)}.
              {String(item.nanosecond).padStart(9, "0")}Z
            </time>
            {" · "}
            {item.source.resource} · {item.source.field} ·{" "}
            {item.source.timestamp}
          </li>
        ))}
      </ol>
      {node.undated.length > 0 && (
        <section role="region" aria-label="Unpositioned source events">
          <h3>Time or offset unavailable</h3>
          <ul>
            {node.undated.map((source, i) => (
              <li key={i}>
                {source.resource} · {source.field} · {source.timestamp}
              </li>
            ))}
          </ul>
        </section>
      )}
      {render(node.children)}
    </section>
  );
}
