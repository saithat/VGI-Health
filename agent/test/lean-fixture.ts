/** Explicit fake semantic fixture, used only with the fake EHR/scripted backend. */
import type { GeometryProvider } from "../src/geometry.js";
import type { LeanScreenState } from "../src/lean-layout-states.js";
export const fakeLeanStates = async (
  input: Parameters<GeometryProvider>[0],
): Promise<LeanScreenState[]> =>
  input.program.screens.map((s) => ({
    screen: s.id,
    state: s.id,
    ui: {
      screen: s.id,
      banner: [["Patient", "Synthetic Lean fixture"]],
      title: s.title,
      nav: [],
      workspace: s.components.map((c) => ({
        button: {
          comp: c.id,
          label: c.label,
          role: "secondary",
          enabled: true,
          blockedReason: null,
          hotkey: null,
        },
      })),
      side: [],
      modal: null,
    },
  }));

export const scriptedClimb = {
  leanOptions: {states: fakeLeanStates, limits: async () => ({})},
  hillclimb: {fixture: async (host: import("../src/hillclimb.js").ClimbHost) => {
    await host.execute({command:"done",argv:["--no-change","fixture"],file:null});
  }},
};
