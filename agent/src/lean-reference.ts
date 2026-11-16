import {
  shapeFor,
  layoutFor,
  fixedShellFor,
  eraseContent,
  viewports,
  version,
} from "../../scripts/layout-reference/generator.mjs";
import type { LayoutRunner, LayoutReply } from "./lean-layout-native.js";
import { stableStringify } from "./program.js";
export { version as referenceGeneratorVersion };
/** Shape-only admission/geometry cache. Values never influence placement. A
 * transport failure is evicted; a refused fixed shell stays a gate failure. */
export class LeanReference {
  private readonly cache = new Map<
    string,
    Promise<{ paint: LayoutReply; dense: boolean; references: unknown }>
  >();
  readonly stats = { admissions: 0, admissionMs: 0, hits: 0 };
  constructor(private readonly runner: LayoutRunner) {}
  get(ui: Record<string, unknown>, limit: number) {
    const shape = shapeFor(ui),
      key = stableStringify([version, shape, limit]);
    const hit = this.cache.get(key);
    if (hit) {
      this.stats.hits++;
      return hit;
    }
    const pending = (async () => {
      const started = performance.now(),
        screen = eraseContent(ui);
      let layouts = viewports.map((viewport) => ({
        viewport,
        tree: layoutFor(shape, viewport),
      }));
      const check = async () => {
        const [reply] = await this.runner([
          {
            op: "family-check",
            references: [{ screen, layouts }],
            maxTargetsPerViewport: limit,
          },
        ]);
        if (reply?.error) throw Error(reply.error);
        if (typeof reply?.accepted !== "boolean")
          throw Error("Missing native family verdict");
        return reply;
      };
      const dense = Boolean((await check()).accepted);
      let fallbackAccepted = true;
      if (!dense) {
        layouts = viewports.map((viewport) => ({
          viewport,
          tree: fixedShellFor(shape, viewport),
        }));
        fallbackAccepted = Boolean((await check()).accepted);
      }
      const [paint] = await this.runner([
        {
          op: "family-paint",
          references: [{ screen, layouts }],
          screen,
          viewport: viewports[0],
          maxTargetsPerViewport: limit,
        },
      ]);
      if (!paint || paint.error)
        throw Error(paint?.error ?? "Missing native paint");
      if (!fallbackAccepted) paint.accepted = false;
      this.stats.admissions++;
      this.stats.admissionMs += performance.now() - started;
      return { paint, dense, references: [{ screen, layouts }] };
    })();
    this.cache.set(key, pending);
    while (this.cache.size > 1024) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    void pending.catch(() => {
      this.cache.delete(key);
    });
    return pending;
  }
}

export interface ReferenceUsage {
  day: number;
  persona: string;
  dense: number;
  fallback: number;
  custom: number;
  refused: number;
}
/** Counts geometry states across all day/night evaluations, including both
 * arms, training, bounded validation and canonical controls. */
export function summarizeReferenceUsage(
  rows: readonly ReferenceUsage[],
): ReferenceUsage[] {
  const totals = new Map<string, ReferenceUsage>();
  for (const row of rows) {
    const key = `${row.day}/${row.persona}`,
      total = totals.get(key) ?? {
        day: row.day,
        persona: row.persona,
        dense: 0,
        fallback: 0,
        custom: 0,
        refused: 0,
      };
    for (const field of ["dense", "fallback", "custom", "refused"] as const)
      total[field] += row[field] ?? 0;
    totals.set(key, total);
  }
  return [...totals.values()].sort(
    (a, b) => a.day - b.day || a.persona.localeCompare(b.persona),
  );
}
