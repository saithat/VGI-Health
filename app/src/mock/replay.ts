import { programSchema, type Program } from "../../../agent/src/schema";
import { createMockInterp, type Interp } from "../core/interp";
import { screenViewSchema, componentSchema } from "../core/types";
import { mockFacts } from "./workflow";

/** Explicit MOCK adapter. All EHR component interpretation stays in the existing mock. */
export function mockReplayInterp(program: Program): Interp {
  const views = program.screens.map((screen) =>
    screenViewSchema.parse({
      screen: screen.id,
      title: screen.title,
      items: screen.components.map((source) => {
        const component = componentSchema.parse({
          ...source,
          parent: source.parent ?? null,
          hotkey: source.hotkey ?? null,
          copyOf: source.copyOf ?? null,
        });
        return {
          component,
          shown: true,
          depth: component.parent ? 1 : 0,
          expanded:
            typeof component.kind === "object" &&
            "group" in component.kind &&
            typeof component.kind.group === "object" &&
            component.kind.group !== null &&
            "startCollapsed" in component.kind.group &&
            !component.kind.group.startCollapsed,
          selectedTab: 0,
          bound:
            typeof component.kind === "object" &&
            "field" in component.kind &&
            typeof component.kind.field === "object" &&
            component.kind.field !== null &&
            "prefill" in component.kind.field &&
            typeof component.kind.field.prefill === "object" &&
            component.kind.field.prefill !== null &&
            "default" in component.kind.field.prefill
              ? {
                  value: {
                    text: {
                      s: String(component.kind.field.prefill.default.value),
                    },
                  },
                  provenance: "MOCK default · human confirmation required",
                  pendingConfirm: true,
                }
              : null,
          alertActive: false,
        };
      }),
      enabled: screen.components
        .filter((c) => c.id !== "commit-action")
        .map((c) => c.id),
      blocked: [
        [
          "commit-action",
          "MOCK: no clinical writes; recorded checker results are illustrative.",
        ],
      ],
      popup: null,
    }),
  );
  const interp = createMockInterp(views, mockFacts);
  // Legacy fixture interpreter requires explicit null Option keys. This adapter
  // is never applied to WASM input or output.
  const legacy = (raw: string) => {
    const p = programSchema.parse(JSON.parse(raw));
    return JSON.stringify({
      ...p,
      screens: p.screens.map((s) => ({
        ...s,
        components: s.components.map((c) => ({
          ...c,
          parent: c.parent ?? null,
          hotkey: c.hotkey ?? null,
          copyOf: c.copyOf ?? null,
        })),
      })),
    });
  };
  return {
    init: (s, p, b, u) => interp.init(s, legacy(p), b, u),
    step: (s, p, b, u, state, event) =>
      interp.step(s, legacy(p), b, u, state, event),
    view: (s, p, b, u, state) => interp.view(s, legacy(p), b, u, state),
    render: (s, p, b, u, state) => interp.render(s, legacy(p), b, u, state),
    facts: (b) => interp.facts(b),
  };
}
