/**
 * Agent-owned data formats (zod). The decision record is owned by the agent
 * loop (core-model.md section 8); it is not safety-relevant, so it lives here
 * rather than in Lean. Lean-owned formats come from `lean-types.ts` (generated types)
 * and re-exported below.
 */
import { z } from 'zod';
import { certificateSchema, eventSchema, verdictSchema } from './lean-types.js';

export * from './lean-types.js';

const nat = z.number().int().nonnegative();
const int = z.number().int();
const str = z.string();

// ---------------------------------------------------------------- candidates
/** Move types: BRIEF section 9 allowed moves, plus the release modes. */
export const MOVE_TYPES = [
  'composeTaskView', 'copyToToolbar', 'reorder', 'merge', 'bringInfoForward', 'prefillWithProvenance',
  'useReceipt', 'macro', 'defaultConfirm', 'shortcut', 'collapseOptional', 'surfaceFeature', 'migrate',
] as const;
export const moveTypeSchema = z.enum(MOVE_TYPES);

/**
 * RFC 6902 JSON Patch over Program JSON. Paths are RFC 6901 pointers, with one
 * extension so patches can address components by tag rather than index
 * (BRIEF section 9: "JSON patches (by component tag)"): a segment `[key=value]`
 * selects the first array element whose `key` equals `value`, and
 * `[key=value]+` selects the slot right after it (for inserting). Selectors are
 * resolved to plain indexes immediately before each op is applied, so the
 * applied patch is plain RFC 6902 (see jsonpatch.ts).
 */
export const jsonPatchOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add'), path: str, value: z.json() }),
  z.object({ op: z.literal('remove'), path: str }),
  z.object({ op: z.literal('replace'), path: str, value: z.json() }),
  z.object({ op: z.literal('move'), from: str, path: str }),
  z.object({ op: z.literal('copy'), from: str, path: str }),
  z.object({ op: z.literal('test'), path: str, value: z.json() }),
]);
export const jsonPatchSchema = z.array(jsonPatchOpSchema);

/** Predicted saving per average train day; positive = fewer. */
export const savingsSchema = z.object({ clicks: int, keystrokes: int, scrolls: int, klmDeciSec: int });

export const candidateSourceSchema = z.enum(['llm', 'repair', 'seeded', 'user-request', 'migration-fallback']);
export const seededKindSchema = z.enum(['allergyHidden', 'idReentryPrefilled', 'lbWeightAccepted']);

export const candidateSchema = z.object({
  id: str.min(1),
  summary: str,
  moveType: moveTypeSchema,
  rationale: str,
  /** Component tags or ids the patch touches (for the dashboard and stability). */
  targets: z.array(str),
  patch: jsonPatchSchema,
  predicted: savingsSchema,
  source: candidateSourceSchema,
  /** True iff the loop injected this from the tempting-but-unsafe list (BRIEF section 9). */
  seeded: z.boolean(),
  seededKind: seededKindSchema.nullable(),
});

// ---------------------------------------------------------------- LLM wire formats
/**
 * What the LLM returns. JSON Patch `value`s are arbitrary JSON, which strict
 * structured-output schemas (Claude and Codex alike) cannot express, so the
 * wire format carries them as JSON-encoded strings (`valueJson`) and `from` as
 * "" when unused. `toCandidate` decodes and validates them.
 */
export const llmPatchOpSchema = z.object({
  op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
  path: str,
  from: str,
  valueJson: str,
});
export const llmCandidateSchema = z.object({
  id: str,
  summary: str,
  moveType: moveTypeSchema,
  rationale: str,
  targets: z.array(str),
  patch: z.array(llmPatchOpSchema),
  predicted: savingsSchema,
});
export const llmProposalSchema = z.object({
  hypothesis: str,
  decision: z.enum(['change', 'noChange']),
  candidates: z.array(llmCandidateSchema),
});
export const llmChoiceSchema = z.object({
  chosen: z.array(str),
  rationale: str,
  rejected: z.array(z.object({ id: str, reason: str })),
});

const savingsJson = {
  type: 'object',
  additionalProperties: false,
  required: ['clicks', 'keystrokes', 'scrolls', 'klmDeciSec'],
  properties: {
    clicks: { type: 'integer' },
    keystrokes: { type: 'integer' },
    scrolls: { type: 'integer' },
    klmDeciSec: { type: 'integer' },
  },
} as const;

/** JSON Schema for `llmProposalSchema` (strict: every object closed, every key required). */
export const LLM_PROPOSAL_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hypothesis', 'decision', 'candidates'],
  properties: {
    hypothesis: { type: 'string', description: 'What is slow for this user and why, in plain language.' },
    decision: { type: 'string', enum: ['change', 'noChange'] },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'summary', 'moveType', 'rationale', 'targets', 'patch', 'predicted'],
        properties: {
          id: { type: 'string' },
          summary: { type: 'string' },
          moveType: { type: 'string', enum: [...MOVE_TYPES] },
          rationale: { type: 'string' },
          targets: { type: 'array', items: { type: 'string' } },
          patch: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['op', 'path', 'from', 'valueJson'],
              properties: {
                op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
                path: { type: 'string' },
                from: { type: 'string', description: 'Source pointer for move/copy; "" otherwise.' },
                valueJson: { type: 'string', description: 'JSON-encoded value for add/replace/test; "" otherwise.' },
              },
            },
          },
          predicted: savingsJson,
        },
      },
    },
  },
} as const;

export const LLM_CHOICE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['chosen', 'rationale', 'rejected'],
  properties: {
    chosen: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
    rejected: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'reason'],
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
} as const;

// ---------------------------------------------------------------- evidence (observe step)
export const metricsSchema = z.object({
  tasks: nat,
  completed: nat,
  clicks: nat,
  keystrokes: nat,
  scrolls: nat,
  popups: nat,
  overrides: nat,
  searches: nat,
  backtracks: nat,
  klmDeciSec: nat,
});
export const signedMetricsSchema = z.object({ clicks: int, keystrokes: int, scrolls: int, klmDeciSec: int });
export const pctAboveFloorSchema = z.object({
  clicks: z.number(),
  keystrokes: z.number(),
  scrolls: z.number(),
  klmDeciSec: z.number(),
});

/** Statistics over TRAIN days only (days <= the current night). */
export const trainSummarySchema = z.object({
  persona: str,
  trainDays: z.array(nat),
  programVersion: nat,
  totals: metricsSchema,
  perDay: z.array(z.object({ day: nat, load: str, programVersion: nat, metrics: metricsSchema })),
  pctAboveFloor: pctAboveFloorSchema.nullable(),
  byWorkflow: z.array(z.object({
    workflow: str,
    tasks: nat,
    avgClicks: z.number(),
    avgKeystrokes: z.number(),
    avgScrolls: z.number(),
    avgKlmSec: z.number(),
  })),
  timeSinksByScreen: z.array(z.object({ screen: str, events: nat, klmSec: z.number(), share: z.number() })),
  redundantPrompts: z.array(z.object({ element: str, components: z.array(str), tasksAffected: nat, extraEntries: nat })),
  unusedReceipts: z.array(z.object({ info: str, created: nat, reprompted: nat })),
  buriedSearches: z.array(z.object({ query: str, count: nat, screens: z.array(str) })),
  alertOverrides: z.array(z.object({ alert: str, popups: nat })),
  totalOverrides: nat,
  backtracks: z.array(z.object({ screen: str, count: nat })),
  complaints: z.array(z.object({ text: str, count: nat })),
  orderMix: z.array(z.object({ drug: str, count: nat })),
});

// ---------------------------------------------------------------- decision record (BRIEF section 10)
export const checkResultSchema = z.object({
  status: z.enum(['pass', 'fail', 'invalid-patch']),
  property: str.nullable(),
  message: str.nullable(),
  counterexample: z.array(eventSchema).nullable(),
  screens: z.array(str).nullable(),
  verdict: verdictSchema.nullable(),
});

export const trainEstimateSchema = z.object({
  days: z.array(nat),
  before: metricsSchema,
  after: metricsSchema,
  /** Per average train day; positive = saving. */
  saving: signedMetricsSchema,
});

export const evaluatedCandidateSchema = z.object({
  candidate: candidateSchema,
  check: checkResultSchema,
  trainEstimate: trainEstimateSchema.nullable(),
  componentsMoved: nat.nullable(),
});

export const certAttemptSchema = z.object({
  attempt: nat,
  candidateIds: z.array(str),
  source: z.enum(['merged', 'repair', 'migration', 'migration-fallback', 'recertify', 'screen-check']),
  patch: jsonPatchSchema,
  check: checkResultSchema,
});

export const replayDaySchema = z.object({
  day: nat,
  load: str,
  before: metricsSchema,
  after: metricsSchema,
  saving: signedMetricsSchema,
  pctAboveFloor: z.object({ before: pctAboveFloorSchema.nullable(), after: pctAboveFloorSchema.nullable() }),
});

export const llmCallRefSchema = z.object({
  callId: str,
  purpose: str,
  backend: str,
  model: str,
  servedBy: str.nullable(),
  promptChars: nat,
  promptMatched: z.boolean().nullable(),
  replayOf: z.object({ backend: str, model: str, source: str }).nullable(),
  file: str,
});

/** Offline per-version screen check (render-screens + app screen-check); see screencheck.ts. */
export const screenCheckResultSchema = z.object({
  status: z.enum(['pass', 'fail']),
  mode: z.enum(['real', 'fake']),
  bundles: z.array(str),
  pages: nat,
  failingScreens: z.array(str),
  failingFiles: z.array(str),
  message: str,
});

export const outcomeSchema = z.enum([
  'deployed', 'no-change', 'no-passing-candidate', 'certification-failed', 'screen-check-failed', 'validation-rejected',
  'user-reverted', 'migrated', 'migration-fallback', 'recertified', 'surfaced', 'not-surfaced',
  'break-attempt-rejected', 'break-attempt-passed',
]);

export const decisionRecordSchema = z.object({
  schemaVersion: z.literal(1),
  runId: str,
  night: nat,
  persona: str,
  owner: str,
  mode: z.enum(['nightly', 'surface-feature', 'migrate', 'try-to-break-it']),
  specVersion: str,
  versionBefore: nat,
  versionAfter: nat,
  backend: z.object({
    name: z.enum(['claude', 'codex', 'replay', 'scripted']),
    model: str,
    replayOf: z.object({ backend: str, model: str, source: str }).nullable(),
  }),
  ehr: z.object({ mode: z.enum(['real', 'fake']), binary: str.nullable() }),
  evidence: trainSummarySchema,
  hypothesis: str,
  candidates: z.array(evaluatedCandidateSchema),
  chosen: z.object({
    candidateIds: z.array(str),
    rationale: str,
    rejectedAlternatives: z.array(z.object({ id: str, reason: str })),
    choiceBy: z.enum(['llm', 'loop-fallback']),
  }).nullable(),
  predicted: savingsSchema.nullable(),
  certification: z.object({
    attempts: z.array(certAttemptSchema),
    result: z.enum(['certified', 'rejected', 'skipped']),
  }),
  validation: z.object({
    replay: replayDaySchema.nullable(),
    improved: z.boolean().nullable(),
    stabilityOk: z.boolean().nullable(),
    accepted: z.boolean(),
    reason: str,
  }),
  measured: z.object({
    validation: replayDaySchema.nullable(),
    /** Filled after the run from a later day never used to select this change. */
    test: replayDaySchema.nullable(),
    minClicks: z.array(z.object({ workflow: str, before: z.number(), after: z.number() })),
    predictionHeld: z.boolean().nullable(),
    predictionNote: str,
  }),
  userResponse: z.object({
    response: z.enum(['accepted', 'reverted', 'not-offered']),
    probability: z.number(),
    reason: str,
  }),
  certificate: certificateSchema.nullable(),
  /** Offline screen check of the version that was about to deploy (null if none got that far). */
  screenCheck: screenCheckResultSchema.nullable(),
  deployed: z.object({ version: nat, program: str, certificate: str }).nullable(),
  outcome: outcomeSchema,
  release: z.object({
    id: str,
    specVersion: str,
    recheck: checkResultSchema,
    items: z.array(str),
    surfaced: z.boolean().nullable(),
    customizationsKept: z.array(str),
    customizationsDropped: z.array(str),
    fallback: z.boolean(),
    flaggedUser: z.boolean(),
  }).nullable(),
  /** Seeded tempting-but-unsafe candidates that unexpectedly passed check (owner must review). */
  flags: z.array(str),
  llmCalls: z.array(llmCallRefSchema),
  createdAt: str,
});

export type MoveType = z.infer<typeof moveTypeSchema>;
export type JsonPatchOp = z.infer<typeof jsonPatchOpSchema>;
export type Savings = z.infer<typeof savingsSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type SeededKind = z.infer<typeof seededKindSchema>;
export type LlmCandidate = z.infer<typeof llmCandidateSchema>;
export type LlmProposal = z.infer<typeof llmProposalSchema>;
export type LlmChoice = z.infer<typeof llmChoiceSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type SignedMetrics = z.infer<typeof signedMetricsSchema>;
export type PctAboveFloor = z.infer<typeof pctAboveFloorSchema>;
export type TrainSummary = z.infer<typeof trainSummarySchema>;
export type CheckResult = z.infer<typeof checkResultSchema>;
export type TrainEstimate = z.infer<typeof trainEstimateSchema>;
export type EvaluatedCandidate = z.infer<typeof evaluatedCandidateSchema>;
export type CertAttempt = z.infer<typeof certAttemptSchema>;
export type ReplayDay = z.infer<typeof replayDaySchema>;
export type LlmCallRef = z.infer<typeof llmCallRefSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type ScreenCheckResult = z.infer<typeof screenCheckResultSchema>;
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;

/** Decode an LLM wire candidate into a validated Candidate (throws with a readable message). */
export function toCandidate(raw: LlmCandidate, source: Candidate['source']): Candidate {
  const patch = raw.patch.map((op, i) => {
    const decoded: Record<string, unknown> = { op: op.op, path: op.path };
    if (op.op === 'move' || op.op === 'copy') decoded['from'] = op.from;
    if (op.op === 'add' || op.op === 'replace' || op.op === 'test') {
      try {
        decoded['value'] = JSON.parse(op.valueJson);
      } catch {
        throw new Error(`candidate ${raw.id}: patch op ${i} has invalid valueJson`);
      }
    }
    return decoded;
  });
  return candidateSchema.parse({
    id: raw.id,
    summary: raw.summary,
    moveType: raw.moveType,
    rationale: raw.rationale,
    targets: raw.targets,
    patch,
    predicted: raw.predicted,
    source,
    seeded: false,
    seededKind: null,
  });
}
