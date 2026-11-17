/** Test-only read-only fixture host; no live session or save endpoint. */
import { loadWasmInterp } from "../src/core/wasmInterp";
import { createReferencePainter } from "../src/lean-ui/reference";
import { createPainter } from "../src/lean-ui/painter";
import type { UiScreen } from "../src/ehr/ui/types";
import type { Output } from "../src/lean-ui/layout";
import "../src/lean-ui/painter.css";
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
