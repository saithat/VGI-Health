import { spawnSync } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import {
  occurrences,
  paintSchema,
  placedGeometry,
} from "../src/lean-layout-geometry.js";

/** The agent's occurrence mirror against Lean's own inventory (real ui-layout). */
const binary = path.resolve(
  import.meta.dirname,
  "../../lean/.lake/build/bin/ui-layout",
);
const inventorySchema = z.object({
  inventory: z.array(
    z.object({
      path: z.array(z.number()),
      part: z
        .object({
          role: z.string(),
          text: z.string(),
          target: z.boolean().optional(),
          comp: z.string().optional(),
        })
        .passthrough(),
    }),
  ),
});
function lean(request: Record<string, unknown>): unknown {
  const run = spawnSync(binary, [], {
    input: JSON.stringify(request) + "\n",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout);
}
const field = (comp: string, extra: Record<string, unknown> = {}) => ({
  field: {
    comp,
    label: "Dose",
    kind: "qty",
    value: "5.0",
    unit: "mg",
    provenance: null,
    pendingConfirm: false,
    humanOnly: false,
    required: false,
    ...extra,
  },
});
const button = (comp: string, extra: Record<string, unknown> = {}) => ({
  button: {
    comp,
    label: comp,
    role: "secondary",
    enabled: true,
    blockedReason: null,
    hotkey: null,
    ...extra,
  },
});
const screen = {
  screen: "s",
  banner: [["Patient", "Synthetic"]],
  title: "Orders",
  nav: [["Chart", [["goOrders", "Orders"]]]],
  workspace: [
    field("dose", { required: true, provenance: "macro", pendingConfirm: true }),
    {
      section: {
        id: "group",
        title: "Group",
        children: [
          field("rate", { unit: null }),
          {
            tabs: {
              id: "panel",
              labels: ["A", "B"],
              selected: 0,
              body: [button("inside", { enabled: false })],
            },
          },
        ],
      },
    },
    {
      info: {
        comp: "meds",
        label: "Medications",
        infoId: "currentMeds",
        display: "table",
        rows: [
          [
            ["Medication", "Aspirin"],
            ["Status", "active"],
          ],
        ],
      },
    },
    button("sign", { role: "primary", hotkey: "Ctrl+S" }),
  ],
  side: [],
  modal: null,
};

it("lists the same occurrence paths as Lean's inventory, parts before children", () => {
  const { inventory } = inventorySchema.parse(lean({ op: "inventory", screen }));
  const mirror = occurrences(screen);
  expect(mirror.map((o) => o.path.join("."))).toEqual(
    inventory.map((e) => e.path.join(".")),
  );
  // The components the mirror binds are the components of Lean's parts.
  const comp = new Map(inventory.map((e) => [e.path.join("."), e.part.comp]));
  for (const o of mirror)
    for (const id of o.ids)
      expect(comp.get(o.path.join("."))).toBe(id.replace(/#tab:\d+$/, ""));
  expect(
    mirror.filter((o) => o.ids.length).map((o) => [o.path.join("."), o.ids]),
  ).toEqual([
    ["2.0.0", ["goOrders"]],
    ["3.0", ["dose"]],
    ["4", ["group"]],
    ["4.0.0", ["rate"]],
    ["4.1", ["panel"]],
    ["4.1.0", ["panel#tab:0"]],
    ["4.1.1", ["panel#tab:1"]],
    ["4.1.2", ["inside"]],
    ["5", ["meds"]],
    ["6", ["sign"]],
  ]);
});

it("binds a field's component to its control box, not to its label", () => {
  const reply = lean({ op: "structural-paint", screen });
  const paint = paintSchema.parse(reply);
  const geometry = placedGeometry(paint, screen, "s", "s");
  const center = (source: string) => {
    const box = paint.boxes.find(
      (d) => d.box.info.source?.join(".") === source,
    )?.box.rect;
    if (!box) throw new Error(`No box for ${source}`);
    return { x: (box.x + box.w / 2) / 64, y: (box.y + box.h / 2) / 64 };
  };
  expect(geometry.components["dose"]?.center).toEqual(center("3.0"));
  expect(geometry.components["rate"]?.center).toEqual(center("4.0.0"));
  expect(geometry.components["sign"]?.center).toEqual(center("6"));
  expect(center("3.0").y).toBeGreaterThan(center("3").y);
});
