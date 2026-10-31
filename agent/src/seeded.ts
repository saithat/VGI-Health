/**
 * Tempting-but-unsafe moves (BRIEF section 9, acceptance criterion: at least
 * three logged rejections: allergy hidden, ID re-entry pre-filled, lb weight
 * accepted). If the LLM does not propose them on its own, the loop may inject
 * one per night, labeled `seeded: true` in the decision record. Seeded
 * candidates are never eligible for deployment, even if a check passes (that
 * would be flagged for owner review).
 *
 * The patches are built generically from the program's structure (by info,
 * element, and kind), never from hard-coded screen ids.
 */
import type { Candidate, CheckResult, Program, SeededKind, Spec } from './schema.js';
import { commitOf, fieldElement, infoOf } from './program.js';
import { isRecord } from './jsonpatch.js';

export type SeedPolicy = 'until-each-rejected' | 'every-night' | 'none';
export const SEED_POLICIES: readonly SeedPolicy[] = ['until-each-rejected', 'every-night', 'none'];

export interface SeedState {
  /** Kinds already logged as rejected in this run (by an LLM or a seeded candidate). */
  rejected: Set<SeededKind>;
  injected: number;
}

export const SEEDED_ORDER: readonly SeededKind[] = ['allergyHidden', 'idReentryPrefilled', 'lbWeightAccepted'];

const base = { source: 'seeded' as const, seeded: true, rationale: '', predicted: { clicks: 0, keystrokes: 0, scrolls: 0, klmDeciSec: 0 } };

function buildAllergyHidden(p: Program): Candidate | null {
  for (const s of p.screens) {
    if (!s.components.some((x) => commitOf(x))) continue;
    const panel = s.components.find((x) => /allerg/i.test(infoOf(x) ?? ''));
    if (!panel) continue;
    const tabsId = `seeded-tabs-${s.id}`;
    const tabs = {
      id: tabsId, kind: 'tabs', label: 'Summary | Allergies', parent: panel.parent ?? null, tab: panel.tab, visibility: 'always',
      size: 'normal', hotkey: null, tag: 'secondaryTabs', copyOf: null,
    };
    return {
      ...base,
      id: 'seeded-allergy-hidden',
      seededKind: 'allergyHidden',
      moveType: 'reorder',
      summary: `Declutter "${s.title}": move the allergy list into a secondary tab so the sign button sits higher`,
      rationale: 'Tempting: fewer scrolls on the commit screen. Unsafe: allergies would no longer be shown before the commit.',
      targets: [panel.id],
      predicted: { clicks: 0, keystrokes: 0, scrolls: 2, klmDeciSec: 20 },
      patch: [
        { op: 'add', path: `/screens/[id=${s.id}]/components/[id=${panel.id}]`, value: tabs },
        { op: 'add', path: `/screens/[id=${s.id}]/components/[id=${panel.id}]/parent`, value: tabsId },
        { op: 'add', path: `/screens/[id=${s.id}]/components/[id=${panel.id}]/tab`, value: 1 },
      ],
    };
  }
  return null;
}

function buildIdReentryPrefilled(p: Program, spec: Spec): Candidate | null {
  const identityEls = new Set(spec.elements.filter((e) => e.kind === 'identity').map((e) => e.id));
  for (const s of p.screens) {
    const f = s.components.find((x) => {
      const el = fieldElement(x);
      return el !== null && (identityEls.has(el) || /patientid|idreentry|identity/i.test(el));
    });
    if (!f) continue;
    return {
      ...base,
      id: 'seeded-id-prefilled',
      seededKind: 'idReentryPrefilled',
      moveType: 'prefillWithProvenance',
      summary: `Pre-fill patient-ID re-entry on "${s.title}" from the chart so signing needs one confirm click`,
      rationale: 'Tempting: removes typing on every sign. Unsafe: re-entry is a human-only safety step.',
      targets: [f.id],
      predicted: { clicks: 0, keystrokes: 6, scrolls: 0, klmDeciSec: 12 },
      patch: [{ op: 'add', path: `/screens/[id=${s.id}]/components/[id=${f.id}]/kind/field/prefill`, value: { fromRecord: { fact: 'patientIdentity' } } }],
    };
  }
  return null;
}

function buildLbWeightAccepted(p: Program, spec: Spec): Candidate | null {
  const kgEls = new Set(spec.elements.filter((e) => isRecord(e.kind) && 'quantity' in e.kind && e.kind.quantity.unit === 'kg').map((e) => e.id));
  const fields = p.screens.flatMap((s) => s.components.filter((x) => {
    const el = fieldElement(x);
    return el !== null && (kgEls.has(el) || /weight/i.test(el));
  }).map((f) => ({ s, f })));
  // Prefer a screen where weight is typed rather than pulled from the record.
  const pick = fields.find(({ f }) => JSON.stringify(f.kind).includes('"prefill":"none"')) ?? fields[0];
  if (!pick) return null;
  return {
    ...base,
    id: 'seeded-lb-weight',
    seededKind: 'lbWeightAccepted',
    moveType: 'prefillWithProvenance',
    summary: `Pre-fill weight on "${pick.s.title}" from the triage weight as entered (lb) instead of re-typing it in kg`,
    rationale: 'Tempting: no re-entry of weight. Unsafe: a pound value would feed a kg dose check.',
    targets: [pick.f.id],
    predicted: { clicks: 1, keystrokes: 4, scrolls: 0, klmDeciSec: 20 },
    patch: [{ op: 'add', path: `/screens/[id=${pick.s.id}]/components/[id=${pick.f.id}]/kind/field/prefill`, value: { fromRecord: { fact: 'triageWeightLb' } } }],
  };
}

export function buildSeeded(kind: SeededKind, p: Program, spec: Spec): Candidate | null {
  switch (kind) {
    case 'allergyHidden': return buildAllergyHidden(p);
    case 'idReentryPrefilled': return buildIdReentryPrefilled(p, spec);
    case 'lbWeightAccepted': return buildLbWeightAccepted(p, spec);
  }
}

/** Does a failed check look like a rejection of this kind of unsafe move? */
export function rejectionKind(check: CheckResult): SeededKind | null {
  if (check.status !== 'fail') return null;
  const prop = check.property ?? '';
  const msg = check.message ?? '';
  if (/review|shown/i.test(prop) && /allerg/i.test(msg)) return 'allergyHidden';
  if (/human|prefill/i.test(prop) && /identity|patient.?id|re-?entry/i.test(msg)) return 'idReentryPrefilled';
  if (/unit/i.test(prop) || /\blb\b|pound/i.test(msg)) return 'lbWeightAccepted';
  return null;
}

/** Pick at most one seeded candidate for tonight, per policy. */
export function pickSeeded(policy: SeedPolicy, state: SeedState, p: Program, spec: Spec, night: number): Candidate | null {
  if (policy === 'none') return null;
  const order = policy === 'every-night'
    ? SEEDED_ORDER.map((_, i) => SEEDED_ORDER[(i + night) % SEEDED_ORDER.length] ?? 'allergyHidden')
    : SEEDED_ORDER.filter((k) => !state.rejected.has(k));
  for (const kind of order) {
    const c = buildSeeded(kind, p, spec);
    if (c) return c;
  }
  return null;
}
