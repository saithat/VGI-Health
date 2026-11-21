import { appliesTo, ruleCase, type LayoutDesign } from "../../../agent/src/layout-design";
import { applyLayoutRules } from "../../../agent/src/layout-rules";
import { stableJson } from "../core/buildBinding";
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
import paged from "../../../docs/methods/lean-paged-density.json";
import type { UiScreen } from "../core/types";
import type { Output } from "./layout";
/** Same vendor snapshots as the nightly gate; absent screens keep limit 15. */
export function referenceLimit(
  release: string,
  persona: string,
  screen: string,
): number {
  // Bounded lists: the frozen vendor baseline (the larger of the measured
  // vendor limit and the vendor Program's own dense layout over the retained
  // recorded states) when it covers the screen.
  const frozen: Record<string, { limit: number }> = paged.limits;
  const baseline = frozen[`${release}/${persona}/${screen}`];
  if (baseline !== undefined) return baseline.limit;
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
export function createReferencePainter(call: (request: string) => string, design: LayoutDesign = []) {
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
      key = JSON.stringify([version, screen.screen, shape, limit]);
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
            tree: generator(shape, viewport, limit),
          })),
        },
      ];
      const rules = design.filter(ruleCase).filter(entry => appliesTo(entry, screen.screen ?? "")).flatMap(entry => entry.rules);
      const literals = design.filter(entry => !ruleCase(entry) && entry.screen === screen.screen);
      const semantic = literals.length ? JSON.parse(call(JSON.stringify({op:"family-paint", references:[], screen}))).uncoveredShape : null;
      const literal = literals.find(entry => stableJson(entry.shape) === stableJson(semantic));
      if (literal && rules.length) throw Error("Conflicting recorded layout rules and literal layout");
      const custom = literal?.layouts ?? (rules.length ? viewports.map(viewport => ({
        viewport, tree: applyLayoutRules({...screen}, viewport, rules)
      })) : null);
      const references = custom ? [{screen: erased, layouts: custom}] : family(layoutFor);
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
      let admitted: unknown = references;
      if (!dense) {
        if (custom) throw Error("Lean refused the recorded layout family");
        admitted = family(fixedShellFor);
        if (!check(admitted))
          throw Error(
            "Lean refused dense layout and fixed shell at screen density limit",
          );
      }
      selected = { references: admitted, dense };
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

export function replayScreen(call: (request: string) => string, ui: UiScreen): UiScreen {
  const result = JSON.parse(call(JSON.stringify({op: "session", screen: ui})));
  if (!result.screen) throw Error("Missing Lean session screen");
  return result.screen;
}
