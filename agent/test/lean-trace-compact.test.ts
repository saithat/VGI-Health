import { describe, expect, it } from "vitest";
import { compactStates, type LeanScreenState } from "../src/lean-layout-states.js";
import { shapeFor } from "../../scripts/layout-reference/generator.mjs";
import { occurrences } from "../src/lean-layout-geometry.js";
import { stableStringify } from "../src/program.js";

const ui = (value: string, buttons = 1) => ({
  screen: "s",
  banner: [["Patient", "Synthetic"]],
  nav: [],
  title: "T",
  side: [],
  modal: null,
  workspace: [
    { text: { s: value } },
    ...Array.from({ length: buttons }, (_, i) => ({
      button: { comp: `b${i}`, label: "Go", role: "secondary", enabled: true, blockedReason: null, hotkey: null },
    })),
  ],
});
describe("trace state compaction", () => {
  it("keeps the last screen of each shape and the first of each placement, and every key", () => {
    const sequence = [ui("a"), ui("b"), ui("c", 2), ui("d"), ui("e", 2), ui("f")];
    const plain: LeanScreenState[] = sequence.map((u, i) => ({ screen: "s", ui: u, state: `t${i}`, eventIndex: i }));
    const compact: LeanScreenState[] = [];
    const keep = compactStates(compact);
    for (const s of plain) keep({ ...s });
    const keys = (states: LeanScreenState[]) =>
      states.map((s) => [s.state, s.eventIndex, stableStringify([s.screen, shapeFor(s.ui), occurrences(s.ui)])]);
    expect(keys(compact)).toEqual(keys(plain));
    // Last of each shape keeps its own screen (painted representative).
    expect(compact[5]?.ui).toBe(sequence[5]);
    expect(compact[4]?.ui).toBe(sequence[4]);
    // Earlier states share the first screen of their placement.
    expect(compact[1]?.ui).toBe(sequence[0]);
    expect(compact[3]?.ui).toBe(sequence[0]);
    expect(compact[2]?.ui).toBe(sequence[2]);
  });
});
