#!/usr/bin/env node
/** Small adversarial native-family benchmark; no model, simulator or browser. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tsImport } from "../../agent/node_modules/tsx/dist/esm/api/index.mjs";
const { layoutRunner, viewports } = await tsImport(
  "../../agent/src/lean-layout-native.ts",
  import.meta.url,
);
const { shellTree, paintSchema } = await tsImport(
  "../../agent/src/lean-layout-geometry.ts",
  import.meta.url,
);
const screen = {
  banner: [["Patient", "Synthetic gate benchmark"]],
  title: "Review",
  nav: [],
  workspace: [
    {
      button: {
        comp: "review",
        label: "Review",
        role: "secondary",
        enabled: true,
        blockedReason: null,
        hotkey: null,
      },
    },
    {
      button: {
        comp: "sign",
        label: "Sign",
        role: "primary",
        enabled: true,
        blockedReason: null,
        hotkey: null,
      },
    },
  ],
  side: [],
  modal: null,
};
const paints = await layoutRunner(
  viewports.map((viewport) => ({ op: "structural-paint", screen, viewport })),
);
const reference = paints.map((p, i) => ({
  viewport: viewports[i],
  tree: shellTree(paintSchema.parse(p)),
}));
const nodes = (tree) => [tree, ...(tree.children ?? []).flatMap(nodes)];
const variants = [
  { id: "reference", limit: 15, edit: () => {} },
  {
    id: "banner-flag",
    limit: 15,
    edit: (t) => {
      for (const n of nodes(t)) if (n.banner) n.banner = false;
    },
  },
  {
    id: "missing-source",
    limit: 15,
    edit: (t) => {
      for (const n of nodes(t)) if (n.commit) n.source = null;
    },
  },
  {
    id: "small-target",
    limit: 15,
    edit: (t) => {
      for (const n of nodes(t)) if (n.target) n.height = 512;
    },
  },
  {
    id: "low-contrast",
    limit: 15,
    edit: (t) => {
      for (const n of nodes(t))
        if (n.target) {
          n.fg = "white";
          n.bg = "white";
        }
    },
  },
  { id: "density-one", limit: 1, edit: () => {} },
];
const proposals = variants.map((v) => {
  const layouts = structuredClone(reference);
  layouts.forEach((c) => v.edit(c.tree));
  return {
    id: v.id,
    references: [{ screen, layouts }],
    maxTargetsPerViewport: v.limit,
  };
});
const started = performance.now();
const checks = await layoutRunner(
  proposals.map((p) => ({
    op: "family-check",
    references: p.references,
    maxTargetsPerViewport: p.maxTargetsPerViewport,
  })),
);
const elapsedMs = performance.now() - started;
const diagnoses = await layoutRunner(
  proposals.map((p) => ({
    op: "family-paint",
    references: p.references,
    screen,
    maxTargetsPerViewport: p.maxTargetsPerViewport,
  })),
);
const refusalsByRule = {};
const candidates = checks.map((checked, i) => {
  const rules = [
    ...new Set(
      (diagnoses[i].findings ?? [])
        .filter((f) => !f.warning)
        .map((f) => f.rule),
    ),
  ];
  if (!checked.accepted)
    for (const rule of rules)
      refusalsByRule[rule] = (refusalsByRule[rule] ?? 0) + 1;
  return { id: proposals[i].id, accepted: checked.accepted, rules };
});
const report = {
  scope:
    "Six hand-written adversarial fixture families; family-check at all three viewports. Full nightly gate also exports/replays states. No clinical/model claim.",
  candidates,
  elapsedMs,
  candidatesPerSecond: variants.length / (elapsedMs / 1000),
  refusalsByRule,
};
const out = resolve(process.argv[2] ?? "runs/lean-gate-benchmark");
await mkdir(out, { recursive: true });
await writeFile(
  join(out, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
