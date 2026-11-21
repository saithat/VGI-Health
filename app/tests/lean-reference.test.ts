import { expect, test, vi } from "vitest";
import {
  createReferencePainter,
  referenceLimit,
} from "../src/lean-ui/reference";
import type { UiScreen } from "../src/core/types";
const ui: UiScreen = {
  banner: [],
  title: "Synthetic",
  nav: [],
  workspace: [],
  side: [],
  modal: null,
  screen: "absent",
};
const viewport = { w: 92160, h: 57600 };
/** Lean's window operation returns the screen as the layout shows it. */
const windowed = (request: string, answer: () => unknown) => {
  const parsed = JSON.parse(request);
  return JSON.stringify(parsed.op === "window" ? { screen: parsed.screen } : answer());
};
test("checks all viewport cases once per shape, then binds actual values for each paint", () => {
  const call = vi.fn((request: string) => windowed(request, () => ({ accepted: true })));
  const paint = createReferencePainter(call);
  expect(paint(ui, viewport, 7).dense).toBe(true);
  paint({ ...ui, title: "Changed clinical value" }, viewport, 7);
  // Each paint asks Lean for the window; the family is checked once.
  const ops = call.mock.calls.map(([request]) => JSON.parse(request).op);
  expect(ops).toEqual(["window", "family-check", "family-paint", "window", "family-paint"]);
  const check = JSON.parse(call.mock.calls[1]?.[0] ?? "{}");
  expect(check.references[0].layouts).toHaveLength(3);
  expect(check.maxTargetsPerViewport).toBe(7);
  expect(referenceLimit("v1", "P1", "absent")).toBe(15);
});
test("refused dense layout checks the fixed shell at the same limit; double refusal blocks", () => {
  let checks = 0;
  const call = vi.fn((request: string) =>
    windowed(request, () => ({
      accepted: JSON.parse(request).op !== "family-check" || ++checks > 1,
    })),
  );
  expect(createReferencePainter(call)(ui, viewport, 9).dense).toBe(false);
  expect(
    call.mock.calls
      .filter(([request]) => JSON.parse(request).op !== "window")
      .every(([request]) => JSON.parse(request).maxTargetsPerViewport === 9),
  ).toBe(true);
  expect(() =>
    createReferencePainter((request) => windowed(request, () => ({ accepted: false })))(
      ui,
      viewport,
      1,
    ),
  ).toThrow("fixed shell");
  expect(() =>
    createReferencePainter(() => {
      throw Error("WASM failure");
    })(ui, viewport, 9),
  ).toThrow("WASM failure");
});

test("replays the recorded literal family and reports refusal without substituting a reference", () => {
  const tree = { type: "recorded" };
  const design = [{ screen: "absent", shape: ["bound"], layouts: [{ viewport, tree }] }];
  let accept = true;
  const call = (wire: string) => {
    const request = JSON.parse(wire);
    if (request.op === "window") return JSON.stringify({ screen: request.screen });
    if (!request.references.length) return JSON.stringify({ uncoveredShape: ["bound"] });
    expect(request.references[0].layouts[0].tree).toEqual(tree);
    return JSON.stringify({ accepted: accept });
  };
  expect(createReferencePainter(call, design)(ui, viewport, 9).output.accepted).toBe(true);
  accept = false;
  expect(() => createReferencePainter(call, design)(ui, viewport, 9)).toThrow("refused the recorded layout");
});
