import { expect, test, vi } from "vitest";
import {
  createReferencePainter,
  referenceLimit,
} from "../src/lean-ui/reference";
import type { UiScreen } from "../src/ehr/ui/types";
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
test("checks all viewport cases once per shape, then binds actual values for each paint", () => {
  const call = vi.fn((request: string) => {
    void request;
    return JSON.stringify({ accepted: true });
  });
  const paint = createReferencePainter(call);
  expect(paint(ui, viewport, 7).dense).toBe(true);
  paint({ ...ui, title: "Changed clinical value" }, viewport, 7);
  expect(call).toHaveBeenCalledTimes(3);
  const check = JSON.parse(call.mock.calls[0]?.[0] ?? "{}");
  expect(check.references[0].layouts).toHaveLength(3);
  expect(check.maxTargetsPerViewport).toBe(7);
  expect(referenceLimit("v1", "P1", "absent")).toBe(15);
});
test("refused dense layout checks the fixed shell at the same limit; double refusal blocks", () => {
  const call = vi.fn((request: string) =>
    JSON.stringify({
      accepted:
        JSON.parse(request).op !== "family-check" || call.mock.calls.length > 1,
    }),
  );
  expect(createReferencePainter(call)(ui, viewport, 9).dense).toBe(false);
  expect(
    call.mock.calls.every(
      ([request]) => JSON.parse(request).maxTargetsPerViewport === 9,
    ),
  ).toBe(true);
  expect(() =>
    createReferencePainter(() => JSON.stringify({ accepted: false }))(
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
