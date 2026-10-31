/**
 * Prompt builders. INTEGRITY BOUNDARY (BRIEF 8.4): every builder takes only
 * train-safe inputs (TrainSummary over days <= d, the current program, the
 * spec, and outcome-only decision history). Nothing here can reach a
 * validation or test DayResult; those live behind `Holdout` in night.ts.
 */
import type { CheckResult, Component, EvaluatedCandidate, JsonPatchOp, PersonaParams, Program, Spec, TrainSummary } from './schema.js';

export interface PromptParts {
  system: string;
  prompt: string;
}

export interface PersonaView {
  id: string;
  userId: string;
  params: PersonaParams;
}

/** Outcome-only history: never carries validation/test metrics. */
export interface HistoryItem {
  night: number;
  mode: string;
  outcome: string;
  chosen: { id: string; summary: string; moveType: string }[];
  /** Deployed patches (customizations); included for migration prompts. */
  patch: JsonPatchOp[];
}

export const SYSTEM_PROMPT = `You are the overnight interface designer in a certified adaptive EHR. Each night you redesign ONE clinician's UI program (JSON) so that tomorrow they spend fewer clicks, keystrokes, scrolls and seconds on the same clinical work. The hospital's spec says what every workflow must capture and what must be shown before each commit. A Lean checker with a soundness proof certifies every version against the spec before it is deployed. Proposals that violate the spec are rejected, logged with a counterexample, and shown on a public dashboard, so propose changes you expect to pass and to save real time for this specific user.

## UI program format
Lean types; JSON uses constructor-keyed objects ({"field": {"element": "...", "slot": "current", "prefill": "none"}}), nullary constructors are strings, and absent Option keys are omitted.
- Program { id, version, owner, role, specVersion, start, screens: Screen[], macros: Macro[] }
- Screen { id, title, workflow ("W1".."W7"), components: Component[] } (list order = render order)
- Component { id, kind, label, parent? (id of a group or tabs component on the same screen), tab (index under a tabs parent; tab 0 is open by default), visibility ("always" | {"unlessReceipt": {"info"}}), size ("normal" | "compact" | "tiny"), hotkey? (string), tag (stable semantic tag), copyOf? (id of the original when this is a copy) }. Keys marked ? are omitted when absent.
- Kind: "banner" | "tabs" | {"field": {element, slot: "current" | {"fixed": {"n"}}, prefill: "none" | {"fromRecord": {"fact"}} | {"default": {"value"}} | {"linked": {"element"}}}} | {"panel": {"info"}} | {"table": {"info"}} | {"trend": {"info"}} | {"alert": {"alert", "popup"}} | {"button": {"action": {"goto": {"screen"}} | "back" | {"commit": {"commit"}} | {"markReviewed": {"info"}} | "newOrderLine"}} | {"group": {"collapsible", "startCollapsed"}} | {"macro": {"id"}} | {"search": {"scope"}}. Vendor releases may add kinds; their JSON shape is shown when relevant.
- Macro { id, label, steps: ({"setValue": {"comp", "value"}} | {"click": {"comp"}} | {"goto": {"screen"}})[] }. A macro runs as the macro actor: it can never perform human-only steps or commits, and stops at the first one.

## Semantics that decide pass or fail
- "Shown" means: on the same screen, every ancestor group expanded (startCollapsed groups start closed), under a tabs parent only on tab 0, size not "tiny", and its visibility condition holds. Info in a closed group or an unopened tab is NOT shown.
- Review requirements: on each commit screen the required info must be shown. Only where the spec mode is shownOrReceipt may it be receipt-conditional: visibility {"unlessReceipt": {"info"}} hides it only while a valid receipt (same data version, inside the window, allowed role) exists. "shownOnCommit" info must always be shown on the commit screen.
- Human-only elements (spec humanOnly, identity, scan, cosign) and elements whose prefill policy is "never" are entered by a human every time: never pre-fill them and never set them from a macro.
- Pre-fill only as the policy allows: recordConfirm (from the record with provenance, human confirms), defaultConfirm (a default the human confirms), autoLinked (entered once, then linked).
- Units: weight is kg only; never source a value from a pound field.
- Enter once: no element may be asked twice on one path unless the later one is a pre-filled link or copy.
- Alerts: interruptive alerts keep popping up before their commit; passive alerts never pop up; removable-tier alerts may be made passive or removed.
- Every commit stays reachable from the start screen, and every screen keeps the patient banner.
- Stability budget: at most N components may be moved (to a different screen, parent, or tab) per version. Copies (a new component with copyOf = the original's id) do not count, so prefer copying frequently used actions or info over moving them.
- Do not edit the program's id, version, owner, role, or specVersion; the loop sets them.

## Moves
Allowed (moveType): composeTaskView, copyToToolbar, reorder, merge, bringInfoForward, prefillWithProvenance, useReceipt, macro, defaultConfirm, shortcut, collapseOptional, surfaceFeature, migrate.
Forbidden: editing the spec, automating or pre-filling human-only steps, hiding required information, writing elements outside the spec, exceeding the budgets.

## Patch format
Each candidate is an RFC 6902 JSON Patch against the CURRENT program shown in the request. Address array elements by id or tag with selector segments, e.g. "/screens/[id=w1-sign]/components/[id=w1-sign-allergies]/visibility". "[id=X]+" is the position right after X (to insert after it) and "-" appends. Ops apply in order. Put each JSON value in "valueJson" as a JSON-encoded string (for example "\\"compact\\"" or "{\\"id\\":\\"w1-tb-sign\\", ...}"); use "" when the op takes no value. Use "from" only for move and copy ("" otherwise). New components need unique ids and every non-optional Component key; use "add" (not "replace") to set a key that may be absent.

## Predictions
"predicted" is your estimate of the saving per average day for this user: positive means fewer clicks, keystrokes, or scrolls; klmDeciSec is in tenths of a second. The loop measures every prediction, so be calibrated.`;

/** Valid JSON, one component per line: readable without spending tokens on indentation. */
export function formatProgram(p: Program): string {
  const screens = p.screens.map((s) => {
    const comps = s.components.map((c) => `      ${JSON.stringify(c)}`).join(',\n');
    return `    {"id":${JSON.stringify(s.id)},"title":${JSON.stringify(s.title)},"workflow":${JSON.stringify(s.workflow)},"components":[\n${comps}\n    ]}`;
  }).join(',\n');
  const macros = p.macros.map((m) => `    ${JSON.stringify(m)}`).join(',\n');
  return `{"id":${JSON.stringify(p.id)},"version":${p.version},"owner":${JSON.stringify(p.owner)},"role":${JSON.stringify(p.role)},"specVersion":${JSON.stringify(p.specVersion)},"start":${JSON.stringify(p.start)},\n  "screens":[\n${screens}\n  ],\n  "macros":[${macros ? `\n${macros}\n  ` : ''}]}`;
}

const json = (x: unknown) => JSON.stringify(x);

function header(title: string, persona: PersonaView, program: Program, spec: Spec): string {
  return [
    `# ${title}`,
    `Persona ${persona.id} (user ${persona.userId}, role ${persona.params.role}). Current program version ${program.version}, spec ${spec.version}. Stability budget: ${spec.design.stabilityBudget} moved components per version.`,
    '',
    '## Persona behavior parameters',
    json(persona.params),
    '',
    '## Hospital spec (exported from Lean)',
    json(spec),
    '',
    '## Current program',
    formatProgram(program),
  ].join('\n');
}

function historyBlock(history: readonly HistoryItem[], withPatches: boolean): string {
  if (history.length === 0) return '(none yet)';
  return history.map((h) => json({
    night: h.night, mode: h.mode, outcome: h.outcome, chosen: h.chosen, ...(withPatches ? { patch: h.patch } : {}),
  })).join('\n');
}

export interface NightlyContext {
  night: number;
  persona: PersonaView;
  spec: Spec;
  program: Program;
  evidence: TrainSummary;
  history: readonly HistoryItem[];
}

export function nightlyPrompt(c: NightlyContext): PromptParts {
  return {
    system: SYSTEM_PROMPT,
    prompt: [
      header(`Night ${c.night}: nightly redesign`, c.persona, c.program, c.spec),
      '',
      `## Evidence from this user's train days (days ${c.evidence.trainDays.join(', ')})`,
      'Time sinks by screen, redundant prompts, unused receipts, searches for buried information, alert popups and overrides, backtracks, the complaint log (prompts a receipt could not satisfy), per-workflow averages, and % above the floor (human-only steps + clinical choices).',
      json(c.evidence),
      '',
      '## Your previous decisions (outcomes only)',
      historyBlock(c.history, false),
      '',
      '## Task',
      'First state, in "hypothesis", what is slow for this user and why, citing the evidence. Then propose 3 to 5 alternative candidates (decision "change"), each a self-contained patch against the current program with a distinct idea, ranked by expected saving. Candidates may be combined later if their patches touch different components. If nothing worthwhile remains, return decision "noChange" with no candidates.',
    ].join('\n'),
  };
}

export interface RepairContext {
  night: number;
  persona: PersonaView;
  spec: Spec;
  program: Program;
  attempt: number;
  maxAttempts: number;
  failedSummaries: { id: string; summary: string; moveType: string }[];
  failedPatch: readonly JsonPatchOp[];
  check: CheckResult;
}

export function repairPrompt(c: RepairContext): PromptParts {
  return {
    system: SYSTEM_PROMPT,
    prompt: [
      header(`Night ${c.night}: certification failed, repair attempt ${c.attempt} of ${c.maxAttempts}`, c.persona, c.program, c.spec),
      '',
      '## The change you chose',
      json(c.failedSummaries),
      '## Its merged patch',
      json(c.failedPatch),
      '## Checker verdict on the merged program',
      json({ property: c.check.property, message: c.check.message, counterexample: c.check.counterexample, screens: c.check.screens, status: c.check.status }),
      '',
      '## Task',
      'The counterexample is a click path on the merged program that violates the named property. Explain the cause in "hypothesis", then return 1 to 3 corrected candidates that keep as much of the saving as possible without the violation. Each patch applies to the CURRENT program above (not on top of the failed patch).',
    ].join('\n'),
  };
}

export interface ChooseContext {
  night: number;
  persona: PersonaView;
  stabilityBudget: number;
  hypothesis: string;
  candidates: readonly EvaluatedCandidate[];
}

export function choosePrompt(c: ChooseContext): PromptParts {
  const rows = c.candidates.map((e) => ({
    id: e.candidate.id,
    summary: e.candidate.summary,
    moveType: e.candidate.moveType,
    targets: e.candidate.targets,
    predicted: e.candidate.predicted,
    check: e.check.status === 'pass' ? 'pass' : { status: e.check.status, property: e.check.property, message: e.check.message },
    trainEstimatePerDay: e.trainEstimate?.saving ?? null,
    componentsMoved: e.componentsMoved,
    seeded: e.candidate.seeded,
  }));
  return {
    system: SYSTEM_PROMPT,
    prompt: [
      `# Night ${c.night}: choose the change for persona ${c.persona.id}`,
      `Hypothesis: ${c.hypothesis}`,
      '',
      '## Candidates after pre-screening',
      '`check` is the Lean checker verdict on the current program plus that candidate. `trainEstimatePerDay` is the simulated saving per train day (same schedules, current vs candidate program). Only passing candidates are eligible.',
      ...rows.map((r) => json(r)),
      '',
      '## Task',
      `Pick one passing candidate, or a small set of passing candidates whose patches touch different components and whose total moved components stay within ${c.stabilityBudget}. In "rationale", explain why the choice beats the alternatives (use the train estimates, the stability cost, and how predictable the change is for this user). List every other candidate in "rejected" with a one-line reason. Return an empty "chosen" list only if no change is worth deploying.`,
    ].join('\n'),
  };
}

export interface MigrateContext {
  night: number;
  persona: PersonaView;
  spec: Spec;
  program: Program;
  releaseId: string;
  notes: string;
  specDiff: Record<string, unknown>;
  leanSpecSource: string | null;
  vendorChanges: { screen: string; component: Component }[];
  recheck: CheckResult;
  history: readonly HistoryItem[];
  attempt: number;
  maxAttempts: number;
  previousFailures: { id: string; check: CheckResult }[];
}

export function migratePrompt(c: MigrateContext): PromptParts {
  return {
    system: SYSTEM_PROMPT,
    prompt: [
      header(`Night ${c.night}: vendor release ${c.releaseId} migration (attempt ${c.attempt} of ${c.maxAttempts})`, c.persona, c.program, c.spec),
      '',
      '## Release notes',
      c.notes,
      '',
      '## Spec diff (exported specs, before -> after)',
      json(c.specDiff),
      ...(c.leanSpecSource ? ['', '## New Lean spec module', c.leanSpecSource] : []),
      '',
      "## The vendor's canonical change (components added or changed in the new canonical program)",
      ...c.vendorChanges.map((v) => json(v)),
      '',
      "## Re-check of this user's current program against the new spec",
      json({ status: c.recheck.status, property: c.recheck.property, message: c.recheck.message, counterexample: c.recheck.counterexample, screens: c.recheck.screens }),
      '',
      "## This user's customization history (deployed changes, oldest first)",
      historyBlock(c.history, true),
      ...(c.previousFailures.length > 0 ? ['', '## Your earlier migration attempts that the checker rejected', ...c.previousFailures.map((f) => json({ id: f.id, property: f.check.property, message: f.check.message, counterexample: f.check.counterexample }))] : []),
      '',
      '## Task',
      "Propose the MINIMAL patch to the current program that makes it conform to the new spec while keeping this user's customizations (moveType \"migrate\"). Map each change to the release items in the summary (e.g. \"R2-3: ...\"). Return 1 to 3 candidates, best first; explain in \"hypothesis\" why the current program fails and how the patch fixes it.",
    ].join('\n'),
  };
}

export interface SurfaceContext {
  night: number;
  persona: PersonaView;
  spec: Spec;
  program: Program;
  releaseId: string;
  notes: string;
  specDiff: Record<string, unknown>;
  newKindExamples: { screen: string; component: Component }[];
  evidence: TrainSummary;
  history: readonly HistoryItem[];
}

export function surfacePrompt(c: SurfaceContext): PromptParts {
  return {
    system: SYSTEM_PROMPT,
    prompt: [
      header(`Night ${c.night}: vendor release ${c.releaseId} (optional feature)`, c.persona, c.program, c.spec),
      '',
      '## Release notes',
      c.notes,
      '',
      '## Spec diff',
      json(c.specDiff),
      '',
      '## How the vendor canonical program uses the new feature',
      ...c.newKindExamples.map((v) => json(v)),
      '',
      `## Evidence from this user's train days (days ${c.evidence.trainDays.join(', ')})`,
      json(c.evidence),
      '',
      '## Your previous decisions (outcomes only)',
      historyBlock(c.history, false),
      '',
      '## Task',
      "The feature is optional and this user's program already conforms to the new spec. Decide, from this user's own work (task mix, orders, time sinks), whether and where to surface it. If it would help, return decision \"change\" with 1 to 3 candidates (moveType \"surfaceFeature\") that place it where this user needs it. If it would not help (for example the user never places such orders), return decision \"noChange\" with no candidates. Either way, give the reason in \"hypothesis\".",
    ].join('\n'),
  };
}

export interface BreakContext {
  persona: PersonaView;
  spec: Spec;
  program: Program;
  request: string;
}

export function breakPrompt(c: BreakContext): PromptParts {
  return {
    system: SYSTEM_PROMPT,
    prompt: [
      header('Live request from the audience ("try to break it")', c.persona, c.program, c.spec),
      '',
      '## Request',
      c.request,
      '',
      '## Task',
      'This is a demonstration of the checker. Implement the request as literally and faithfully as you can as exactly one candidate patch, even if you expect it to violate the spec; do not soften or reinterpret it. Nothing is deployed unless the Lean checker certifies it, and a rejection is shown with its counterexample. In "hypothesis", say what the change does and whether you expect the checker to accept it.',
    ].join('\n'),
  };
}
