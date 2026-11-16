import { z } from "zod";
import type { ScreenGeometry } from "../../app/src/metrics/geometry.js";
const rect = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export const leanBoxSchema = z.object({
  box: z.object({
    rect,
    scroll: z.boolean(),
    clips: z.array(z.tuple([z.string(), rect])),
    style: z.object({
      z: z.number(),
      fg: z.json(),
      bg: z.json(),
      radius: z.number(),
    }),
    info: z.object({
      id: z.string(),
      source: z.array(z.number()).nullable(),
      target: z.boolean(),
      interruptive: z.boolean(),
      banner: z.boolean(),
      commit: z.boolean(),
      paint: z.boolean(),
      text: z.json().nullable(),
    }),
  }),
  original: z.string().nullable().optional(),
});
export const paintSchema = z
  .object({ accepted: z.boolean(), boxes: z.array(leanBoxSchema) })
  .passthrough();
export type Paint = z.infer<typeof paintSchema>;
export function occurrences(
  screen: Record<string, unknown>,
): { path: number[]; ids: string[] }[] {
  const entries: { path: number[]; ids: string[] }[] = [];
  function visit(node: unknown, path: number[]) {
    const [kind, value] =
      Object.entries(z.record(z.string(), z.unknown()).parse(node))[0] ?? [];
    const data = z.record(z.string(), z.unknown()).safeParse(value),
      d = data.success ? data.data : {};
    const id =
      d["comp"] ??
      (["tabs", "section", "patientPane"].includes(kind ?? "")
        ? d["id"]
        : undefined) ??
      d["alert"];
    entries.push({ path, ids: typeof id === "string" ? [id] : [] });
    const children = z
      .array(z.unknown())
      .parse(d["children"] ?? d["body"] ?? []);
    children.forEach((child, i) => visit(child, [...path, i]));
    if (kind === "patientPane")
      z.array(z.unknown())
        .parse(d["modal"] ?? [])
        .forEach((child, i) => visit(child, [...path, children.length + i]));
  }
  const roots = [
    { text: { s: "" } },
    { text: { s: "" } },
    { text: { s: "" } },
    ...z.array(z.unknown()).parse(screen["workspace"]),
    ...z.array(z.unknown()).parse(screen["side"]),
    ...(screen["modal"] ? [screen["modal"]] : []),
    ...z.array(z.unknown()).parse(screen["urgent"] ?? []),
  ];
  roots.forEach((n, i) => visit(n, [i]));
  // Navigation is one semantic text card in this research compiler.
  const nav = z
    .array(z.tuple([z.string(), z.array(z.tuple([z.string(), z.string()]))]))
    .parse(screen["nav"]);
  const navigation = entries.find(
    (e) => e.path.length === 1 && e.path[0] === 2,
  );
  if (navigation)
    navigation.ids = nav.flatMap(([, xs]) => xs.map(([id]) => id));
  return entries;
}
const px = (r: z.infer<typeof rect>) => ({
  x: r.x / 64,
  y: r.y / 64,
  w: r.w / 64,
  h: r.h / 64,
});
/** Lean clip chains replace DOM scroll ancestors in the unchanged atlas format. */
export function placedGeometry(
  paint: Paint,
  screen: Record<string, unknown>,
  id: string,
  state: string,
): ScreenGeometry {
  const scrollers: ScreenGeometry["scrollers"] = {},
    components: ScreenGeometry["components"] = {};
  for (const d of paint.boxes.filter((d) => d.box.scroll)) {
    const r = px(d.box.rect),
      key = d.box.info.id;
    scrollers[key] = {
      maxX: 0,
      maxY: Math.max(
        0,
        ...paint.boxes
          .filter((c) => c.box.clips.some(([k]) => k === key))
          .map((c) => (c.box.rect.y + c.box.rect.h) / 64 - r.y - r.h),
      ),
      width: r.w,
      height: r.h,
    };
  }
  const ids = new Map(
    occurrences(screen).map((e) => [e.path.join("."), e.ids]),
  );
  for (const { box: b } of paint.boxes) {
    if (!b.info.source) continue;
    const names = ids.get(b.info.source.join(".")) ?? [],
      r = px(b.rect),
      center = { x: r.x + r.w / 2, y: r.y + r.h / 2 },
      offsets: Record<string, { x: number; y: number }> = {};
    let y = center.y;
    for (const [key, raw] of b.clips) {
      const clip = px(raw),
        amount = Math.max(
          0,
          Math.min(scrollers[key]?.maxY ?? 0, y - clip.y - clip.h / 2),
        );
      offsets[key] = { x: 0, y: amount };
      y -= amount;
    }
    for (const name of names)
      components[name] = {
        center,
        reveal: { x: center.x, y },
        chain: b.clips.map(([key]) => key),
        offsets,
      };
  }
  return {
    screen: id,
    state,
    viewport: { width: 1440, height: 900 },
    components,
    scrollers,
  };
}
/** Re-express the fixed shell boxes as ordinary layout-language Nodes so Lean
 * can check an exact per-screen limit below the program certificate's 15.
 * The flat shell has one outer scroller and no nested clipping. */
export function shellTree(paint: Paint) {
  const node = (d: Paint["boxes"][number], x = 0, y = 0) => ({
    type: d.box.info.target ? "Button" : "Text",
    ...d.box.info,
    ...d.box.style,
    position: { x: d.box.rect.x - x, y: d.box.rect.y - y },
    width: d.box.rect.w,
    height: d.box.rect.h,
    children: [],
  });
  const fixed = paint.boxes
    .filter((d) => !d.box.scroll && !d.box.clips.length)
    .map((d) => node(d));
  const regions = paint.boxes
    .filter((d) => d.box.scroll)
    .map((d) => {
      const r = d.box.rect,
        children = paint.boxes
          .filter((c) => c.box.clips[0]?.[0] === d.box.info.id)
          .map((c) => node(c, r.x, r.y));
      return {
        type: "Scroll",
        id: d.box.info.id,
        position: { x: r.x, y: r.y },
        width: r.w,
        height: r.h,
        children: [
          {
            type: "Absolute",
            width: "fill",
            height: Math.max(
              r.h,
              ...children.map((c) => c.position.y + c.height),
            ),
            children,
          },
        ],
      };
    });
  return {
    type: "Absolute",
    width: "fill",
    height: "fill",
    children: [...fixed, ...regions],
  };
}
