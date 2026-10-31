/** Reproducible, deliberately synthetic run. No checker, simulator, or LLM was run. */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import {
  decisionRecordSchema,
  programSchema,
  dayResultSchema,
  certificateSchema,
  type Program,
  type Candidate,
  type DecisionRecord,
} from "../../agent/src/schema";
import { mockSpec, mockFacts } from "../src/mock/workflow";

const root = resolve(import.meta.dirname, "../../runs/mock");
await rm(root, { recursive: true, force: true });
async function write(file: string, value: unknown) {
  const path = resolve(root, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}
const stamp = "2026-10-31T12:00:00Z";
const personas = [
  {
    id: "P1",
    role: "physician",
    title: "Repeat prescription",
    field: "Refill medication",
    move: "useReceipt",
    why: "Rooming already reviewed the allergy list; repeat navigation adds no information.",
    migration: "Indication from visit diagnosis; clinician confirms.",
  },
  {
    id: "P2",
    role: "physician",
    title: "ED sepsis order set",
    field: "ED order set",
    move: "macro",
    why: "Sepsis orders repeatedly traverse four screens under time pressure.",
    migration: "Indication picker inside the ED order-set macro.",
  },
  {
    id: "P3",
    role: "rn",
    title: "MAR · Medication administration",
    field: "Barcode / medication",
    move: "composeTaskView",
    why: "Medication passes repeatedly backtrack between the MAR and patient chart.",
    migration: "Indication stays visible beside the dose on the MAR.",
  },
  {
    id: "P4",
    role: "np",
    title: "Pediatric weight-based dosing",
    field: "Weight-based medication",
    move: "bringInfoForward",
    why: "Weight review and dose entry are separated by repeated navigation.",
    migration: "Indication field on the weight-based dosing screen.",
  },
  {
    id: "P5",
    role: "surgeon",
    title: "Post-op order set",
    field: "Post-operative orders",
    move: "defaultConfirm",
    why: "The same surgical prophylaxis choices recur between cases.",
    migration:
      "Surgical prophylaxis default with explicit surgeon confirmation.",
  },
];
const metrics = (clicks: number, factor = 1) => ({
  tasks: 4,
  completed: 4,
  clicks: clicks * factor,
  keystrokes: 80 * factor,
  scrolls: Math.max(4, clicks - 16) * factor,
  popups: 2,
  overrides: 1,
  searches: 2,
  backtracks: 1,
  klmDeciSec: (clicks * 20 + 200) * factor,
});
const saving = { clicks: 8, keystrokes: 12, scrolls: 4, klmDeciSec: 180 };
const pct = (n: number) => ({
  clicks: n,
  keystrokes: n + 5,
  scrolls: n + 10,
  klmDeciSec: n + 3,
});
const pass = {
  status: "pass",
  property: null,
  message: null,
  counterexample: null,
  screens: null,
  verdict: "ok",
};
const click = (comp: string) => ({ click: { comp } });
const enter = (comp: string, s: string) => ({
  enter: { comp, value: { text: { s } } },
});
const trace = (version: number) => {
  const events = [
    ...(version === 0 ? [click("open-work")] : []),
    enter("drug", "Synthetic antibiotic"),
    enter("dose", "500 mg"),
    ...(version === 0
      ? [{ scroll: { screen: "work" } }, click("open-commit")]
      : [click("open-commit")]),
    enter("patientIdReentry", "AM"),
    click("commit-action"),
  ];
  let t = 0;
  return events.map((event) => {
    const ops =
      "enter" in event
        ? Array.from({ length: event.enter.value.text.s.length }, () => "key")
        : "scroll" in event
          ? ["scroll"]
          : ["point", "click"];
    t += ops.length * 2 + 12;
    return { event, ops, t };
  });
};
const comp = (id: string, kind: unknown, label: string, extra = {}) => ({
  id,
  kind,
  label,
  tag: id,
  tab: 0,
  visibility: "always",
  size: "normal",
  ...extra,
});
const field = (id: string, label: string) =>
  comp(id, { field: { element: id, slot: "current", prefill: "none" } }, label);
const panel = (id: string, info: string, label: string) =>
  comp(id, { panel: { info } }, label);
const goto = (id: string, screen: string, label: string) =>
  comp(id, { button: { action: { goto: { screen } } } }, label);
const certificate = (p: string, version: number, spec: string) =>
  certificateSchema.parse({
    specVersion: spec,
    specHash: `MOCK-spec-${spec}`,
    programHash: `MOCK-${p}-v${version}`,
    verdict: "ok",
    checkerVersion: "MOCK-not-a-checker",
    time: stamp,
  });
const records: DecisionRecord[] = [];
const replayTasks: unknown[] = [];
const contexts: unknown[] = [];
for (const [i, p] of personas.entries()) {
  let version = 0;
  let current: Program = programSchema.parse({
    id: `mock-${p.id}`,
    version,
    owner: p.id,
    role: p.role,
    specVersion: "v1",
    start: "chart",
    macros: [],
    screens: [
      {
        id: "chart",
        title: "Chart review",
        workflow: p.id === "P3" ? "W4" : "W1",
        components: [
          comp("banner", "banner", "Patient"),
          panel("history", "currentMeds", "Medication history"),
          panel("allergy-review", "allergyList", "Allergies"),
          goto("open-work", "work", "Open task"),
        ],
      },
      {
        id: "work",
        title: p.title,
        workflow: p.id === "P3" ? "W4" : "W1",
        components: [
          comp("banner", "banner", "Patient"),
          field("drug", p.field),
          field(
            "dose",
            p.id === "P4" ? "Dose · mg/kg · confirm current kg weight" : "Dose",
          ),
          field("weight", "Current weight · kg"),
          panel("work-allergies", "allergyList", "Allergies"),
          goto(
            "open-commit",
            "commit",
            p.id === "P3" ? "Review administration" : "Review orders",
          ),
        ],
      },
      {
        id: "commit",
        title: p.id === "P3" ? "Administer medication" : "Review & sign",
        workflow: p.id === "P3" ? "W4" : "W1",
        components: [
          comp("banner", "banner", "Patient"),
          panel("allergies", "allergyList", "Allergies before commit"),
          field("patientIdReentry", "Re-enter patient identity"),
          comp(
            "commit-action",
            {
              button: {
                action: {
                  commit: {
                    commit: p.id === "P3" ? "administerMed" : "signOrders",
                  },
                },
              },
            },
            p.id === "P3" ? "Administer medication" : "Sign orders",
          ),
        ],
      },
    ],
  });
  async function deploy() {
    await write(`programs/${p.id}/v${version}.json`, current);
    await write(
      `certs/${p.id}/v${version}.json`,
      certificate(p.id, version, current.specVersion),
    );
    await write(`programs/${p.id}/deployed.json`, {
      version,
      program: `programs/${p.id}/v${version}.json`,
      certificate: `certs/${p.id}/v${version}.json`,
    });
  }
  await deploy();
  for (const night of [1, 2, 3, 6, 8]) {
    const beforeVersion = version;
    const surface = night === 3;
    const migrate = night === 6;
    const show = surface && ["P1", "P5"].includes(p.id);
    const spec = migrate || night > 6 ? "v2" : surface ? "v1.1" : "v1";
    const patch =
      night === 1
        ? [{ op: "replace", path: "/start", value: "work" }]
        : show
          ? [
              {
                op: "add",
                path: "/screens/1/components/4",
                value: panel(
                  "prior-auth",
                  "priorAuth",
                  "Prior authorization status",
                ),
              },
            ]
          : migrate
            ? [
                {
                  op: "add",
                  path: "/screens/2/components/2",
                  value: field(
                    "indication",
                    p.id === "P3"
                      ? "Indication · visible beside dose"
                      : p.migration,
                  ),
                },
              ]
            : [
                {
                  op: "replace",
                  path: "/screens/1/title",
                  value: `${p.title} · ${night === 2 ? "focused" : "personalized"}`,
                },
              ];
    const candidate: Candidate = {
      id: `${p.id}-${night}-safe`,
      summary: migrate
        ? p.migration
        : surface
          ? show
            ? "Surface prior-auth status"
            : "Keep prior-auth out of the main workflow"
          : p.why,
      moveType: migrate
        ? "migrate"
        : surface
          ? "surfaceFeature"
          : night === 1
            ? "reorder"
            : night === 2
              ? p.move === "macro"
                ? "macro"
                : p.move === "useReceipt"
                  ? "useReceipt"
                  : p.move === "composeTaskView"
                    ? "composeTaskView"
                    : p.move === "bringInfoForward"
                      ? "bringInfoForward"
                      : "defaultConfirm"
              : "shortcut",
      rationale: migrate ? p.migration : p.why,
      targets: ["work", "allergies"],
      patch: [],
      predicted: saving,
      source: "llm",
      seeded: false,
      seededKind: null,
    };
    // Validate patches using the same schema as the real loop.
    candidate.patch =
      decisionRecordSchema.shape.candidates.element.shape.candidate.shape.patch.parse(
        patch,
      );
    const kind =
      ["allergyHidden", "idReentryPrefilled", "lbWeightAccepted"][i % 3] ??
      "allergyHidden";
    const unsafe = night === 2 || (migrate && p.id === "P3");
    const property = migrate
      ? "reviewsBeforeCommit"
      : kind === "allergyHidden"
        ? "reviewsBeforeCommit"
        : kind === "idReentryPrefilled"
          ? "humanOnly"
          : "unitSafety";
    const message = migrate
      ? "The antibiotic indication must be shown before administration. A closed Details drawer does not count."
      : kind === "allergyHidden"
        ? "Allergies must be visible before signing; hiding the panel removes the required review."
        : kind === "idReentryPrefilled"
          ? "Patient identity must be entered by a human; a prefilled identifier cannot satisfy this safety step."
          : "Weight in pounds cannot satisfy a kilogram dose check; capture and confirm a current kg weight.";
    const ce = [click("open-commit"), click("commit-action")];
    const badPatch = migrate
      ? [
          {
            op: "add",
            path: "/screens/2/components/2",
            value: comp(
              "details",
              { group: { collapsible: true, startCollapsed: true } },
              "Details",
            ),
          },
          {
            op: "add",
            path: "/screens/2/components/3",
            value: {
              ...field("indication", "Antibiotic indication"),
              parent: "details",
            },
          },
        ]
      : kind === "allergyHidden"
        ? [{ op: "remove", path: "/screens/2/components/1" }]
        : kind === "idReentryPrefilled"
          ? [
              {
                op: "replace",
                path: "/screens/2/components/2/kind/field/prefill",
                value: { default: { value: "AM" } },
              },
            ]
          : [
              {
                op: "replace",
                path: "/screens/1/components/3/label",
                value: "Weight · lb (unsafe proposal)",
              },
            ];
    const bad = {
      ...candidate,
      id: `${p.id}-${night}-rejected`,
      summary: migrate
        ? "Place indication in collapsed Details drawer"
        : kind === "allergyHidden"
          ? "Hide the allergy panel"
          : kind === "idReentryPrefilled"
            ? "Prefill patient identity"
            : "Accept weight in pounds",
      source: migrate ? "repair" : "seeded",
      seeded: !migrate,
      seededKind: migrate ? null : kind,
      targets: [
        migrate
          ? "details"
          : kind === "allergyHidden"
            ? "allergies"
            : kind === "idReentryPrefilled"
              ? "patientIdReentry"
              : "weight",
      ],
      patch: badPatch,
    };
    const fail = {
      status: "fail",
      property,
      message,
      counterexample: ce,
      screens: ["work", "commit"],
      verdict: {
        violation: {
          property,
          message,
          counterexample: ce,
          screens: ["work", "commit"],
        },
      },
    };
    const noChange = surface && !show;
    if (!noChange) {
      const { applyPatch } = await import("../../agent/src/jsonpatch");
      version++;
      current = programSchema.parse({
        ...programSchema.parse(applyPatch(current, candidate.patch).doc),
        version,
        specVersion: spec,
      });
      await deploy();
    }
    const day = night + 2;
    const load = day % 2 === 0 ? "busy" : "quiet";
    const before = metrics(48 - beforeVersion * 4 + i * 2);
    const after = metrics(48 - version * 4 + i * 2);
    const measuredSaving = {
      clicks: before.clicks - after.clicks,
      keystrokes: before.keystrokes - after.keystrokes,
      scrolls: before.scrolls - after.scrolls,
      klmDeciSec: before.klmDeciSec - after.klmDeciSec,
    };
    const replay = {
      day,
      load,
      before,
      after,
      saving: measuredSaving,
      pctAboveFloor: {
        before: pct(90 - beforeVersion * 12),
        after: pct(90 - version * 12),
      },
    };
    const record = decisionRecordSchema.parse({
      schemaVersion: 1,
      runId: "mock",
      night,
      persona: p.id,
      owner: p.id,
      mode: surface ? "surface-feature" : migrate ? "migrate" : "nightly",
      specVersion: spec,
      versionBefore: beforeVersion,
      versionAfter: version,
      backend: {
        name: "scripted",
        model: "MOCK-authored-fixture",
        replayOf: null,
      },
      ehr: { mode: "fake", binary: null },
      evidence: {
        persona: p.id,
        trainDays: [1],
        programVersion: beforeVersion,
        totals: before,
        perDay: [
          {
            day: 1,
            load: "normal",
            programVersion: beforeVersion,
            metrics: before,
          },
        ],
        pctAboveFloor: pct(90),
        byWorkflow: [
          {
            workflow: p.id === "P3" ? "W4" : "W1",
            tasks: 4,
            avgClicks: before.clicks / 4,
            avgKeystrokes: 20,
            avgScrolls: before.scrolls / 4,
            avgKlmSec: before.klmDeciSec / 40,
          },
        ],
        timeSinksByScreen: [
          { screen: "work", events: 18, klmSec: 60, share: 0.6 },
        ],
        redundantPrompts: [],
        unusedReceipts: [],
        buriedSearches: [],
        alertOverrides: [],
        totalOverrides: 1,
        backtracks: [],
        complaints: [{ text: p.why, count: 3 }],
        orderMix: [],
      },
      hypothesis: surface
        ? show
          ? "Prior authorization is relevant to elective orders in this workflow."
          : p.id === "P3"
            ? "A nurse does not order; the optional panel would add clutter."
            : p.id === "P4"
              ? "No specialty-order evidence supports surfacing this panel yet."
              : "Emergency orders do not show a prior-authorization bottleneck."
        : migrate
          ? p.migration
          : p.why,
      candidates: [
        {
          candidate,
          check: pass,
          trainEstimate: { days: [1], before, after, saving: measuredSaving },
          componentsMoved: 1,
        },
        ...(unsafe
          ? [
              {
                candidate: bad,
                check: fail,
                trainEstimate: null,
                componentsMoved: 1,
              },
            ]
          : []),
      ],
      chosen: {
        candidateIds: noChange ? [] : [candidate.id],
        rationale: noChange
          ? "The feature is optional; this persona has no observed need."
          : migrate
            ? "Restore the new requirement while retaining the personalized task layout."
            : "Preserve safety steps and reduce navigation; reject the unsafe shortcut.",
        rejectedAlternatives: unsafe ? [{ id: bad.id, reason: message }] : [],
        choiceBy: "loop-fallback",
      },
      predicted: noChange ? null : saving,
      certification: {
        result: "certified",
        attempts: [
          ...(unsafe
            ? [
                {
                  attempt: 1,
                  candidateIds: [bad.id],
                  source: migrate ? "migration" : "merged",
                  patch: badPatch,
                  check: fail,
                },
              ]
            : []),
          {
            attempt: unsafe ? 2 : 1,
            candidateIds: [candidate.id],
            source: migrate ? "repair" : "merged",
            patch: candidate.patch,
            check: pass,
          },
        ],
      },
      validation: {
        replay: { ...replay, day: night + 1 },
        improved: true,
        stabilityOk: true,
        accepted: true,
        reason: "MOCK validation accepted; values are illustrative.",
      },
      measured: {
        validation: { ...replay, day: night + 1 },
        test: replay,
        minClicks: [
          { workflow: p.id === "P3" ? "W4" : "W1", before: 23, after: 6 },
        ],
        predictionHeld: false,
        predictionNote:
          "Illustrative measured savings were below the prediction.",
      },
      userResponse: {
        response: "accepted",
        probability: 0.9,
        reason: "MOCK clinician accepted the focused workflow.",
      },
      certificate: certificate(p.id, version, spec),
      deployed: {
        version,
        program: `programs/${p.id}/v${version}.json`,
        certificate: `certs/${p.id}/v${version}.json`,
      },
      outcome: noChange
        ? "not-surfaced"
        : surface
          ? "surfaced"
          : migrate
            ? "migrated"
            : "deployed",
      release:
        surface || migrate
          ? {
              id: surface ? "v1.1" : "v2",
              specVersion: spec,
              recheck: migrate ? fail : pass,
              items: surface
                ? ["R1.1-1", "R1.1-2", "R1.1-3"]
                : ["R2-1", "R2-2", "R2-3", "R2-4"],
              surfaced: surface ? show : null,
              customizationsKept: [p.move, "Focused task layout"],
              customizationsDropped:
                migrate && p.id === "P3"
                  ? ["Collapsed indication drawer (rejected proposal)"]
                  : [],
              fallback: false,
              flaggedUser: false,
            }
          : null,
      flags: [],
      llmCalls: [],
      createdAt: stamp,
    });
    records.push(record);
    await write(
      `decisions/night-${String(night).padStart(2, "0")}/${p.id}.json`,
      record,
    );
    const task = `${p.id}-same-task`;
    const taskMetrics = { task, ...after, completed: true };
    await write(
      `days/day-${String(day).padStart(2, "0")}/${p.id}.json`,
      dayResultSchema.parse({
        day,
        persona: p.id,
        programVersion: version,
        trace: trace(version).map((t) => ({
          ...t,
          task,
          screen: "work",
          result: "ok",
        })),
        tasks: [taskMetrics],
        floor: [
          {
            ...taskMetrics,
            clicks: 12,
            keystrokes: 40,
            scrolls: 2,
            klmDeciSec: 400,
          },
        ],
        complaints: [],
      }),
    );
  }
  replayTasks.push({
    persona: p.id,
    id: `${p.id}-same-task`,
    title: p.title,
    before: { version: 0, trace: trace(0) },
    after: { version, trace: trace(version) },
  });
  contexts.push({
    persona: p.id,
    spec: {
      ...mockSpec,
      elements: [
        ...mockSpec.elements,
        {
          ...mockSpec.elements[0],
          id: "indication",
          label: "Antibiotic indication",
          kind: "text",
          humanOnly: false,
          prefill: "defaultConfirm",
        },
      ],
    },
    bundle: mockFacts,
    user: { id: p.id, role: p.role },
  });
}
await write("manifest.json", {
  runId: "mock",
  createdAt: stamp,
  days: 10,
  personas: personas.map((p) => p.id),
  worldIsFake: true,
  backend: "scripted",
  model: "MOCK-authored-fixture",
  ehr: { mode: "fake", binary: null },
  releaseDays: { v1_1: 4, v2: 7 },
  warning:
    "MOCK RUN · Authored example data. No real checker, simulator, LLM, or clinical writes. Certificates and savings are illustrative.",
});
await write("replay.json", { mode: "mock", contexts, tasks: replayTasks });
await write("llm/README.json", {
  warning: "No LLM calls occurred. Decisions are authored fixtures.",
});
await write("summary.json", {
  runId: "mock",
  records: records.length,
  warning: "MOCK only",
});
// A recorded, explicitly fixed attack; the text box never claims arbitrary text was checked.
const base = records.find((r) => r.persona === "P1" && r.night === 2);
if (!base) throw new Error("Missing mock rejection");
const attack = base.candidates.find((c) => c.candidate.seeded);
if (!attack) throw new Error("Missing seeded attack");
await write(
  "break/P1-hide-allergies.json",
  decisionRecordSchema.parse({
    ...base,
    mode: "try-to-break-it",
    hypothesis: "Hide allergies so signing is faster",
    candidates: [attack],
    chosen: null,
    predicted: null,
    certificate: null,
    deployed: null,
    outcome: "break-attempt-rejected",
    certification: {
      result: "rejected",
      attempts: [base.certification.attempts[0]],
    },
  }),
);
