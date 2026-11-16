import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { serve, paintBindingHash } from "./serve.mjs";
const dir = resolve("runs/lean-gallery-test");
const write = async (p, data) => {
  const target = join(dir, p);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, JSON.stringify(data));
};
const bundle = JSON.parse(
  await readFile("fixtures/synthea/Ashly_Rippin_149fcc1f.json", "utf8"),
);
const patient = bundle.entry.find(
  (e) => e.resource.resourceType === "Patient",
).resource;
const name = [...(patient.name[0].given ?? []), patient.name[0].family].join(
  " ",
);
const native = (request) =>
  JSON.parse(
    execFileSync(resolve("lean/.lake/build/bin/ui-layout"), {
      input: JSON.stringify(request) + "\n",
      env: { ...process.env, LEAN_NUM_THREADS: "2" },
    }),
  );
const screen = {
  screen: "s",
  banner: [
    ["Patient", name],
    ["MRN", patient.id ?? patient.identifier?.[0]?.value ?? "synthetic"],
  ],
  title: "Synthetic patient review",
  nav: [],
  workspace: [
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
const paint = native({ op: "structural-paint", screen });
await write("manifest.json", {
  screenGate: "lean",
  browserCertified: false,
  runId: "gallery-test",
  status: "completed",
  personas: ["P1"],
  days: 2,
});
for (const version of [0, 1]) {
  const program = {
    owner: "P1",
    screens: [
      {
        id: "s",
        title: "Review",
        components: [
          { id: "sign", label: version ? "Sign reviewed order" : "Sign" },
        ],
      },
      {
        id: version ? "added" : "removed",
        title: version ? "New review" : "Old review",
        components: [],
      },
    ],
  };
  await write(`programs/P1/v${version}.json`, program);
  await write(
    `reports/lean-screens/P1/v${version}/sample/gallery/coverage.json`,
    {
      programHash: paintBindingHash(program),
      layoutsSha256: paintBindingHash([]),
      failures: [],
    },
  );
  await write(`programs/P1/v${version}.layouts.json`, []);
  await write(`reports/lean-screens/P1/v${version}/sample/gallery/0.json`, {
    screen: "s",
    shape: [],
    ui: screen,
    paint,
  });
  const other = { ...screen, screen: version ? "added" : "removed" };
  await write(`reports/lean-screens/P1/v${version}/sample/gallery/1.json`, {
    screen: other.screen,
    shape: [],
    ui: other,
    paint: native({ op: "structural-paint", screen: other }),
  });
}
await write("decisions/night-01/P1.json", {
  persona: "P1",
  night: 1,
  versionBefore: 0,
  versionAfter: 1,
  deployed: { version: 1 },
  chosen: { candidateIds: ["change"] },
  candidates: [
    {
      candidate: {
        id: "change",
        summary:
          "Bring the frequently used review action into the current task.",
      },
    },
  ],
});
for (const day of [1, 2])
  for (const arm of ["days", "no-agent/days"])
    await write(`${arm}/day-${String(day).padStart(2, "0")}/P1.json`, {
      programVersion: day - 1,
      tasks: [
        {
          clicks: arm === "days" ? 8 : 10,
          scrolls: arm === "days" ? 1 : 2,
          completed: true,
        },
      ],
    });
const gallery = await serve({ dir, port: 5191 });
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await gallery.close();
    process.exit(0);
  });
