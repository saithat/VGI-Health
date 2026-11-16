import {
  shapeFor,
  layoutFor,
  fixedShellFor,
  eraseContent,
  viewports,
  version,
} from "../../../scripts/layout-reference/generator.mjs";
import density from "../../../docs/methods/lean-screen-density.json";
import audit from "../../../docs/audits/r5-per-screen.json";
import type { UiScreen } from "../ehr/ui/types";
import type { Output } from "./layout";
/** Same vendor snapshots as the nightly gate; absent screens keep limit 15. */
export function referenceLimit(
  release: string,
  persona: string,
  screen: string,
): number {
  const measurements: Record<string, { limits: Record<string, number> }> =
    density.measurements;
  const recorded = measurements[`${release}/${persona}`]?.limits[screen];
  if (recorded !== undefined) return recorded;
  const vendor = audit.programs.filter(
    (p) =>
      p.group === "vendor" &&
      (p.id === `${release}/${persona}` ||
        p.id === `${release}/personas/${persona}`),
  );
  const samples = (
    vendor.length
      ? vendor
      : audit.programs.filter(
          (p) => p.group === "vendor" && p.id === `${release}/canonical`,
        )
  )
    .flatMap((p) => p.screens)
    .filter((s) => s.screen === screen);
  return samples.length ? Math.max(...samples.map((s) => s.maximum)) : 15;
}
export function createReferencePainter(call: (request: string) => string) {
  const cache = new Map<string, { references: unknown; dense: boolean }>();
  return (
    rendered: UiScreen,
    viewport: { w: number; h: number },
    limit: number,
  ) => {
    if (!viewports.some((v) => v.w === viewport.w && v.h === viewport.h))
      throw Error("Unsupported layout viewport");
    // Lean decides the window of every bounded list (Layout.Window); the
    // family is generated and checked for the screen as it is shown.
    const windowed: { screen?: UiScreen } = JSON.parse(
      call(JSON.stringify({ op: "window", screen: rendered })),
    );
    const screen = windowed.screen;
    if (!screen) throw Error("Missing Lean window");
    const shape = shapeFor(screen),
      key = JSON.stringify([version, shape, limit]);
    let selected = cache.get(key);
    const request = (value: unknown): Output =>
      JSON.parse(call(JSON.stringify(value)));
    if (!selected) {
      const erased = eraseContent(screen);
      const family = (generator: typeof layoutFor) => [
        {
          screen: erased,
          layouts: viewports.map((viewport) => ({
            viewport,
            tree: generator(shape, viewport),
          })),
        },
      ];
      let references = family(layoutFor);
      const check = (references: unknown) => {
        const out = request({
          op: "family-check",
          references,
          maxTargetsPerViewport: limit,
        });
        if (typeof out.accepted !== "boolean")
          throw Error("Missing Lean family verdict");
        return out.accepted;
      };
      const dense = check(references);
      if (!dense) {
        references = family(fixedShellFor);
        if (!check(references))
          throw Error(
            "Lean refused dense layout and fixed shell at screen density limit",
          );
      }
      selected = { references, dense };
      cache.set(key, selected);
      while (cache.size > 256) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
    return {
      output: request({
        op: "family-paint",
        references: selected.references,
        screen,
        viewport,
        maxTargetsPerViewport: limit,
      }),
      dense: selected.dense,
    };
  };
}
