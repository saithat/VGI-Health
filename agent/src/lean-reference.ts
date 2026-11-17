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
import { gzipSync, gunzipSync } from "node:zlib";
import { BoundedMap } from "./bounded-map.js";
export { version as referenceGeneratorVersion };
type Entry = { paint: LayoutReply; dense: boolean; references: unknown };
/** Shape-only admission/geometry cache. Values never influence placement. A
 * transport failure is evicted; a refused fixed shell stays a gate failure.
 *
 * An admitted entry (its paint and three-viewport family) is about a megabyte
 * of JSON and several times that as objects; shapes differ between personas,
 * so a cache of objects grew across a run until the Node heap was exhausted.
 * Settled entries are therefore kept gzip-compressed in a byte-bounded LRU
 * (`budgetBytes`); a small LRU of decoded entries serves repeated states of
 * one shape, and a decoded entry is shared by its callers as before. */
export class LeanReference {
  private readonly pending = new Map<string, Promise<Entry>>();
  private readonly packed = new Map<string, Buffer>();
  private readonly hot = new BoundedMap<string, Entry>(8);
  private packedBytes = 0;
  readonly stats = { admissions: 0, admissionMs: 0, hits: 0, evictions: 0 };
  constructor(
    private readonly runner: LayoutRunner,
    readonly budgetBytes = 64 * 1024 * 1024,
  ) {}
  /** Compressed bytes currently retained (for tests and reports). */
  get retainedBytes() {
    return this.packedBytes;
  }
  private keep(key: string, entry: Entry) {
    const bytes = gzipSync(JSON.stringify(entry));
    const old = this.packed.get(key);
    if (old) this.packedBytes -= old.length;
    this.packed.delete(key);
    this.packed.set(key, bytes);
    this.packedBytes += bytes.length;
    while (this.packedBytes > this.budgetBytes && this.packed.size > 1) {
      const [oldest, value] = this.packed.entries().next().value ?? [];
      if (oldest === undefined || value === undefined) break;
      this.packed.delete(oldest);
      this.packedBytes -= value.length;
      this.stats.evictions++;
    }
    this.hot.set(key, entry);
  }
  get(ui: Record<string, unknown>, limit: number): Promise<Entry> {
    const shape = shapeFor(ui),
      key = stableStringify([version, shape, limit]);
    const inFlight = this.pending.get(key);
    if (inFlight) {
      this.stats.hits++;
      return inFlight;
    }
    const decoded = this.hot.get(key);
    if (decoded) {
      this.stats.hits++;
      return Promise.resolve(decoded);
    }
    const bytes = this.packed.get(key);
    if (bytes) {
      this.stats.hits++;
      this.packed.delete(key);
      this.packed.set(key, bytes);
      const entry: Entry = JSON.parse(gunzipSync(bytes).toString("utf8"));
      this.hot.set(key, entry);
      return Promise.resolve(entry);
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
    this.pending.set(key, pending);
    pending.then(
      (entry) => {
        if (this.pending.get(key) === pending) this.pending.delete(key);
        this.keep(key, entry);
      },
      () => {
        if (this.pending.get(key) === pending) this.pending.delete(key);
      },
    );
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
