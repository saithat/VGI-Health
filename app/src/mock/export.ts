/** Offline MOCK samples for exercising the release screen check. */
import { createMockInterp } from "../core/interp";
import type { Html } from "../ehr/html";
import { mockFacts, mockProgram, mockSpec, mockViews } from "./workflow";
import { offlineChart } from "./patient";
import type { State } from "../core/types";

const interp = createMockInterp(mockViews, mockFacts, offlineChart);
const args = [
  JSON.stringify(mockSpec),
  JSON.stringify(mockProgram),
  JSON.stringify({
    resourceType: "Bundle",
    type: "collection",
    entry: [offlineChart.patient, ...offlineChart.resources].map(
      (resource) => ({ resource }),
    ),
  }),
  JSON.stringify({ id: "P1", role: "physician" }),
] as const;
const initial: State = JSON.parse(interp.init(...args));
export const pages: Record<string, Html> = {};
for (const screen of mockProgram.screens) {
  pages[screen.id] = JSON.parse(
    interp.render(...args, JSON.stringify({ ...initial, screen: screen.id })),
  );
}
pages["rooming-history"] = JSON.parse(
  interp.render(
    ...args,
    JSON.stringify({ ...initial, tabSel: [["visit-tabs", 1]] }),
  ),
);
pages["rooming-collapsed"] = JSON.parse(
  interp.render(
    ...args,
    JSON.stringify({
      ...initial,
      expanded: initial.expanded.filter((id) => id !== "medication-section"),
    }),
  ),
);
pages["orders-expanded"] = JSON.parse(
  interp.render(
    ...args,
    JSON.stringify({
      ...initial,
      screen: "orders",
      expanded: [...initial.expanded, "lab-order"],
    }),
  ),
);
