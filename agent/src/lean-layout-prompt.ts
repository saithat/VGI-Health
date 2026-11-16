import { z } from "zod";
const inventorySchema = z.object({
  currentLayouts: z.json(),
  screens: z.array(
    z.object({
      screen: z.string(),
      shape: z.array(
        z.object({
          path: z.array(z.number().int().nonnegative()),
          target: z.boolean(),
          region: z.enum([
            "banner",
            "title",
            "body",
            "side",
            "footer",
            "modal",
            "urgent",
          ]),
          lines: z.number().int().nonnegative(),
        }),
      ),
      occurrences: z.array(
        z.object({ path: z.array(z.number()), ids: z.array(z.string()) }),
      ),
    }),
  ),
  limits: z.json(),
});
import type { PromptParts } from "./prompts.js";
/** Opt-in only: arbitrary geometry accompanies the existing semantic edits. */
export function leanLayoutPrompt(
  parts: PromptParts,
  design: string,
  traces?: string,
): PromptParts {
  return {
    ...parts,
    portfolio: false,
    system:
      parts.system.replace(
        "Pixel values come from Chromium",
        "Pixel values come from Lean placed boxes",
      ) +
      `\n\n## Lean screen mode: free designs for this simulated persona
Work from this persona's logs and traces. The aim is fewer clicks and scrolls for this persona. Keep full task completion and the existing clinical and release validation rules. G1–G11 are the only limits on layout; no preset templates, placement catalogue or pointer-travel ranking restrict your exploration. You may change the Program AND freely design its screen layouts. The deployed React app does not paint these layouts. This run has no browser certificate.

Use the ordinary candidate patch for Program edits. In this mode only, /layouts is a separate design sidecar, initially []; add/replace that array or address its entries with ordinary RFC 6902 paths. It never enters the Program read by Lean check. Each entry is {screen: screenId, shape: native shape array from the inventory below, layouts: [{viewport:{w,h},tree:Node,components?:object}, ...]}. Include all three viewports: 92160×57600, 81920×51200, 122880×69120 (integer 1/64 CSS pixels). Match the exact occurrence paths and flags in the native shape. A screen without custom cases keeps the fixed-shell reference layout; a customized screen with an uncovered shape refuses measurement. Remove a screen's cases to restore its reference. Layout-only patches are allowed. Disjoint candidates may be bundled; every bundle is checked again.

Node language: {type,id,width,height,min?,max?,position?:{x,y},gap?,padding?,align?,wrap?,columns?,tracks?,direction?,fg?,bg?,radius?,z?,source?,target?,banner?,commit?,interruptive?,urgent?,paint?,text?,children?}. Types: Frame, Stack (row/column, optional wrap), Grid, Absolute (integer positions), Scroll (vertical viewport), Text, Button, Rect, Circle, Wedge (start,sweep,denominator), Line/Polyline (points,stroke), Tabs, Dialog, Listbox, InteractiveGrid. width/height: integer units, "fill", "hug". tracks: integer widths, "Nfr", {fr:N}. min/max use {w,h}; colors opaque {r,g,b} or palette tokens (white, slate-900, slate-100, blue-700); spacing accepts integer units or space-N tokens, radii rounded-lg. Components expand {type:"Component",name,variant,slots}; definitions live in the case's components object and can contain {type:"Slot",name}. Expansion has a 256-level bound.

Each semantic occurrence needs one source:number[] box, including wrappers, title, navigation and banner. Source values bind automatically from the native screen, never from agent text keys. Preserve the target/banner/commit/interruptive flags from the shape, and give every slot whose region is urgent the flag urgent:true (no other box may carry it). A useful safety text slot is {key:"unique",safety:true,overflow:"scroll",maxLines:1,font:0,fontSize:896,lineHeight:1408}; reserve enough height. All safety text is unbounded vertical wrapping, with no truncation. Arbitrary source values and glyph escapes remain available. Non-safety text has finite maxLength and wrap/ellipsis/scroll; fonts 0–7 use pinned metrics. Pure decoration has no source.

G1: exactly one fixed visible patient banner, separated from all other paint.
G2: active interruptive marks are fixed, contained and above ordinary paint; the modal blocks ordinary targets.
G3: targets are at least 24×24 px and active targets cannot overlap.
G4: paint/outer scroll viewports stay contained; text is at least 12 px (fontSize 768), has valid metrics, capacity and vertical reserve, cannot be obscured, and safety text preserves all content through wrapping vertical scrolling.
G5: no horizontal overflow, including scroll content.
G6: contrast is at least 4.5:1 for all text at every size, and 3:1 for targets and for painted Circle, Wedge, Line and Polyline marks.
G7: paint every expected semantic occurrence exactly once with unique IDs; invent no source path.
G8: document order follows top-to-bottom, then left-to-right; scroll regions use their content order and z layers are separate regions.
G9: at 1440×900 a current-task commit, when present, has exactly one fixed visible target.
G10: at 1440×900 active targets at once, at zero and every scroll offset, cannot exceed that screen's vendor limit, or 15 when unmeasured. Targets outside every Scroll are fixed and count with every scroll window. Limits below include their provenance; never raise them.
G11: every urgent box is painted, outside every Scroll, inside the viewport and separated from every other painted box, a modal included; it stays active while a modal is open.

The native inventory below is losslessly dictionary-encoded. ids is a string array. regions maps numeric codes to region names. Each rows entry is [dottedPath, target01, regionIndex, lines, idIndexes]; split dottedPath on dots and convert to integers for the source path. Each cases entry gives a screen id and indexes into rows. To write its shape, expand each row to {path:[...],target:boolean,region:regions[regionIndex],lines}. Its idIndexes select the actual component ids in ids. Every native case is present, without filtering; no template restriction is implied.

Native refusals include rule, node, metric, actual, required and deficit when Lean supplies them. Repair the design against the CURRENT design, retaining Program safety. Optimize clicks plus scrolls; pixel metrics are validation constraints, elapsed time is not a reward.`,
    prompt:
      parts.prompt +
      "\n\n## Current Lean design and native semantic inventory\n" +
      compactLeanInventory(design) +
      (traces
        ? "\n\n## This persona’s training logs and traces\n" + traces
        : ""),
  };
}

/** Read only this persona's committed odd-day training partitions. */
export async function leanTrainingLog(
  directory: string,
  persona: string,
  night: number,
): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { dayResultSchema } = await import("./schema.js");
  const counts = new Map<string, number>(),
    sequences = new Map<string, number>(),
    recent: unknown[] = [];
  for (let day = 1; day <= night; day += 2) {
    const result = dayResultSchema.parse(
      JSON.parse(
        await readFile(
          path.join(directory, "training", `day-${day}`, `${persona}.json`),
          "utf8",
        ),
      ),
    );
    if (result.day !== day || result.persona !== persona)
      throw Error("Foreign Lean training trace");
    let previous = "",
      previousTask = "";
    for (const row of result.trace) {
      const kind = Object.keys(row.event)[0] ?? "",
        payload = Object.values(row.event)[0];
      const target =
        payload && typeof payload === "object"
          ? Object.entries(payload).find(([key]) =>
              ["comp", "alert"].includes(key),
            )?.[1]
          : undefined;
      if (previousTask !== row.task) {
        previous = "";
        previousTask = row.task;
      }
      const key = JSON.stringify([row.screen, kind, target ?? null]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (previous) {
        const sequence = JSON.stringify([previous, key]);
        sequences.set(sequence, (sequences.get(sequence) ?? 0) + 1);
      }
      previous = key;
      recent.push({
        day,
        task: row.task,
        screen: row.screen,
        kind,
        target: target ?? null,
        ops: row.ops,
        result: row.result,
      });
    }
  }
  const ranked = (map: Map<string, number>, limit: number) =>
    [...map]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([key, count]) => ({ events: JSON.parse(key), count }));
  return JSON.stringify({
    targetFrequencies: ranked(counts, 60),
    commonTransitions: ranked(sequences, 30),
    recentTrace: recent.slice(-96),
  });
}

/** Lossless dictionary encoding of every native case, path, flag and target id.
 * This changes transport size only; it does not select or rank layouts. */
export function compactLeanInventory(raw: string): string {
  const parsed = inventorySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return raw;
  const inventory = parsed.data,
    regions = ["banner", "title", "body", "side", "footer", "modal", "urgent"];
  const ids: string[] = [],
    idIndex = new Map<string, number>(),
    rows: unknown[][] = [],
    rowIndex = new Map<string, number>();
  const intern = (id: string) => {
    let index = idIndex.get(id);
    if (index === undefined) {
      index = ids.length;
      ids.push(id);
      idIndex.set(id, index);
    }
    return index;
  };
  const cases = inventory.screens.map((screen) => {
    const occurrences = new Map(
      screen.occurrences.map((o) => [o.path.join("."), o.ids]),
    );
    return {
      screen: screen.screen,
      rows: screen.shape.map((slot) => {
        const path = slot.path.join("."),
          row = [
            path,
            Number(slot.target),
            regions.indexOf(slot.region),
            slot.lines,
            (occurrences.get(path) ?? []).map(intern),
          ];
        const key = JSON.stringify(row);
        let index = rowIndex.get(key);
        if (index === undefined) {
          index = rows.length;
          rows.push(row);
          rowIndex.set(key, index);
        }
        return index;
      }),
    };
  });
  return JSON.stringify({
    encoding: "native-inventory-v1",
    currentLayouts: inventory.currentLayouts,
    ids,
    regions,
    rows,
    cases,
    limits: inventory.limits,
  });
}
