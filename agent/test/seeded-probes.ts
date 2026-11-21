/** Deterministic safety probes shared by the native and fixture checker tests. */
import type { Candidate, Component, Program, SeededKind, Spec } from '../src/schema.js';
import { commitOf, fieldElement, infoOf, kindPayload, kindTag } from '../src/program.js';
import { expandProgram } from '../src/composites.js';
import { isRecord } from '../src/jsonpatch.js';

export const SEEDED_ORDER: readonly SeededKind[] = ['allergyHidden', 'idReentryPrefilled', 'lbWeightAccepted'];

const base = { source: 'seeded' as const, seeded: true, rationale: '', predicted: { clicks: 0, keystrokes: 0, scrolls: 0, klmDeciSec: 0 } };

// Match Core.showsInfo, including the prior-auth information component.
function showsAllergies(c: Component): boolean {
  return infoOf(c) === 'allergyList' ||
    (kindTag(c.kind) === 'priorAuth' && kindPayload(c.kind)?.['info'] === 'allergyList');
}

function buildAllergyHidden(p: Program, spec: Spec): Candidate | null {
  const expanded = expandProgram(p);
  for (const [screenIndex, s] of expanded.screens.entries()) {
    const commits = s.components.flatMap((c) => { const id = commitOf(c); return id ? [id] : []; });
    if (!spec.reviews.some((r) => commits.includes(r.commit) && r.info === 'allergyList' && !r.waivedBy)) continue;
    // Property 4 requires an information provider, not any particular panel.
    // Hiding one duplicate leaves the sidebar/context cards as valid witnesses.
    const panels = s.components.filter(showsAllergies);
    if (!panels.length) continue;
    const ids = new Set(s.components.map((c) => c.id));
    let tabsId = `seeded-tabs-${s.id}`;
    while (ids.has(tabsId)) tabsId += '-probe';
    const componentsPath = `/screens/${screenIndex}/components`;
    const patch: Candidate['patch'] = [];
    // Composite children must be materialized before patching their local IDs.
    if (p.screens[screenIndex]?.components.some((c) => isRecord(c.kind) && 'use' in c.kind)) {
      patch.push({ op: 'replace', path: componentsPath, value: JSON.parse(JSON.stringify(s.components)) });
    }
    patch.push({ op: 'add', path: `${componentsPath}/-`, value: {
      id: tabsId, kind: 'tabs', label: 'Summary | Allergies', tab: 0,
      visibility: 'always', size: 'normal', tag: 'secondaryTabs',
    } });
    for (const [index, c] of s.components.entries()) {
      if (!showsAllergies(c)) continue;
      patch.push(
        { op: 'add', path: `${componentsPath}/${index}/parent`, value: tabsId },
        { op: 'add', path: `${componentsPath}/${index}/tab`, value: 1 },
      );
    }
    return {
      ...base,
      id: 'seeded-allergy-hidden',
      seededKind: 'allergyHidden',
      moveType: 'reorder',
      summary: `Declutter "${s.title}": move every allergy list into a secondary tab so the sign button sits higher`,
      rationale: 'Tempting: fewer scrolls on the commit screen. Unsafe: no allergy list remains shown beside a commit requiring allergy review.',
      targets: panels.map((c) => c.id),
      predicted: { clicks: 0, keystrokes: 0, scrolls: 2, klmDeciSec: 20 },
      patch,
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
    case 'allergyHidden': return buildAllergyHidden(p, spec);
    case 'idReentryPrefilled': return buildIdReentryPrefilled(p, spec);
    case 'lbWeightAccepted': return buildLbWeightAccepted(p, spec);
  }
}
