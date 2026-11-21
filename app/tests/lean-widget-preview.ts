/** Test-only read-only fixture host; no live session or save endpoint. */
import { loadWasmInterp } from "../src/core/wasmInterp";
import { createReferencePainter } from "../src/lean-ui/reference";
import { createPainter } from "../src/lean-ui/painter";
import type { UiScreen } from "../src/core/types";
import type { Output } from "../src/lean-ui/layout";
import "../src/lean-ui/painter.css";
import {
  eraseContent,
  fixedShellFor,
  layoutFor,
  shapeFor,
  viewports,
} from "../../scripts/layout-reference/generator.mjs";
declare global {
  interface Window {
    paintLeanWidget?: (screen: UiScreen) => Output;
    /** Events the painter sent, in order; the fixture host applies none. */
    leanEvents?: { patient?: string; event: unknown }[];
  }
}
const root = document.getElementById("root");
if (!root) throw Error("Missing preview root");
const interp = await loadWasmInterp(),
  layout = interp.layout;
if (!layout) throw Error("Missing layout API");
const reference = createReferencePainter(layout);
const events: { patient?: string; event: unknown }[] = [];
window.leanEvents = events;
const painter = createPainter(root, {
  dispatch(event) {
    events.push({ event });
  },
  dispatchPatient(patient, event) {
    events.push({ patient, event });
  },
  // The proved transitions through the same layout API as the clinical page.
  keyboard: (profile, rows, cols, state, key) =>
    JSON.parse(
      layout(
        JSON.stringify({ op: "keyboard", profile, rows, cols, state, key }),
      ),
    ),
});
window.paintLeanWidget = (screen) => {
  const start = performance.now();
  const selected = reference(
    screen,
    { w: innerWidth * 64, h: innerHeight * 64 },
    15,
  );
  root.dataset.layoutMs = String(performance.now() - start);
  root.dataset.referenceLayout = selected.dense ? "dense" : "fixed-shell";
  painter.patch(screen, selected.output);
  window.__leanPaint = selected.output;
  return selected.output;
};
declare global {
  interface Window {
    /** Paints through an explicit family (as `/lean.html?family=`): the dense
     * generator or the fixed shell, for `shapeOf` (default: this screen's own
     * shape). Lean revalidates the family; an uncovered shape is refused. */
    paintLeanFamily?: (
      screen: UiScreen,
      generator: "dense" | "fixed-shell",
      shapeOf?: UiScreen,
    ) => Output;
  }
}
window.paintLeanFamily = (screen, generator, shapeOf) => {
  const call = (value: unknown): Output =>
    JSON.parse(layout(JSON.stringify(value)));
  const windowed = (s: UiScreen): UiScreen =>
    JSON.parse(layout(JSON.stringify({ op: "window", screen: s }))).screen;
  const shown = windowed(screen);
  const source = windowed(shapeOf ?? screen);
  const shape = shapeFor(source);
  const build = generator === "dense" ? layoutFor : fixedShellFor;
  const references = [
    {
      screen: eraseContent(source),
      layouts: viewports.map((viewport) => ({
        viewport,
        tree: build(shape, viewport),
      })),
    },
  ];
  const output = call({
    op: "family-paint",
    references,
    screen: shown,
    viewport: { w: innerWidth * 64, h: innerHeight * 64 },
    maxTargetsPerViewport: 15,
  });
  root.dataset.referenceLayout = generator;
  if (output.accepted) painter.patch(shown, output);
  window.__leanPaint = output;
  return output;
};
