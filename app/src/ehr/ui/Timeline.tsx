import { useContext, type ReactNode } from "react";
import { ExplicitConfirmContext } from "./clinical-metadata";
import type { NodeOf } from "./types";

/** Ordered source events with complete children. No sorting, filtering or local clinical state. */
export function Timeline({
  node,
  render,
}: {
  node: NodeOf<"timeline">;
  render: (child: NodeOf<"timeline">["children"][number], index: number) => ReactNode;
}) {
  const inherited = useContext(ExplicitConfirmContext);
  const explicit = new Set(inherited);
  for (const child of node.children)
    if ("button" in child && child.button.role === "confirm")
      explicit.add(child.button.comp);
  return (
    <ExplicitConfirmContext.Provider value={explicit}>
      <section role="region" aria-label={node.title} className="clinical-timeline">
        <h2>{node.title}</h2>
        <ol aria-label={`${node.title} events`}>
          {node.children.map((child, index) => (
            <li key={index}>{render(child, index)}</li>
          ))}
        </ol>
      </section>
    </ExplicitConfirmContext.Provider>
  );
}
