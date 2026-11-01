/** Helpers over UI programs: patching, personalization, stability, hashing. */
import { createHash } from 'node:crypto';
import { applyPatch, isRecord } from './jsonpatch.js';
import { programSchema, type Component, type JsonPatchOp, type PersonaParams, type Program, type Screen } from './schema.js';

/** Deterministic JSON (sorted keys) for hashing and prompt stability. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function programHash(program: Program): string {
  return sha256(stableStringify(program));
}

/** Apply a candidate patch and bump the version; throws on patch or shape errors. */
export function applyToProgram(
  program: Program,
  patch: readonly JsonPatchOp[],
  next: { version: number; specVersion?: string },
): { program: Program; resolved: JsonPatchOp[] } {
  const { doc, resolved } = applyPatch(program, patch);
  const parsed = programSchema.safeParse(doc);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`patched program is not a valid Program: ${first ? `${first.path.join('.')}: ${first.message}` : 'invalid'}`);
  }
  for (const key of ['id', 'owner', 'role'] as const) {
    if (parsed.data[key] !== program[key]) throw new Error(`patch may not change program ${key}`);
  }
  const out: Program = { ...parsed.data, version: next.version };
  if (next.specVersion !== undefined) out.specVersion = next.specVersion;
  return { program: out, resolved };
}

/** Day-1 program for a persona: the canonical program, owned by that user (version 0). */
export function personalize(canonical: Program, persona: PersonaParams, userId: string): Program {
  return { ...structuredClone(canonical), id: `${persona.id}`, owner: userId, role: persona.role, version: 0 };
}

export interface Located {
  screen: Screen;
  component: Component;
}

export function allComponents(program: Program): Located[] {
  return program.screens.flatMap((screen) => screen.components.map((component) => ({ screen, component })));
}

export function componentById(program: Program): Map<string, Located> {
  return new Map(allComponents(program).map((l) => [l.component.id, l]));
}

/** Constructor name of a component kind ("field", "panel", "banner", ...). */
export function kindTag(kind: Component['kind']): string {
  if (typeof kind === 'string') return kind;
  return Object.keys(kind)[0] ?? 'unknown';
}

/** The `{ <ctor>: payload }` payload of a kind, if it is a record. */
export function kindPayload(kind: Component['kind']): Record<string, unknown> | null {
  if (typeof kind === 'string') return null;
  const tag = Object.keys(kind)[0];
  if (tag === undefined) return null;
  const payload: unknown = Object.values(kind)[0];
  return isRecord(payload) ? payload : null;
}

export function fieldElement(c: Component): string | null {
  if (kindTag(c.kind) !== 'field') return null;
  const el = kindPayload(c.kind)?.['element'];
  return typeof el === 'string' ? el : null;
}

export function infoOf(c: Component): string | null {
  const tag = kindTag(c.kind);
  if (tag !== 'panel' && tag !== 'table' && tag !== 'trend') return null;
  const info = kindPayload(c.kind)?.['info'];
  return typeof info === 'string' ? info : null;
}

/** The commit a button triggers, if any. */
export function commitOf(c: Component): string | null {
  if (kindTag(c.kind) !== 'button') return null;
  const action = kindPayload(c.kind)?.['action'];
  if (!isRecord(action)) return null;
  const commit = action['commit'];
  return isRecord(commit) && typeof commit['commit'] === 'string' ? commit['commit'] : null;
}

export function gotoOf(c: Component): string | null {
  if (kindTag(c.kind) !== 'button') return null;
  const action = kindPayload(c.kind)?.['action'];
  if (!isRecord(action)) return null;
  const go = action['goto'];
  return isRecord(go) && typeof go['screen'] === 'string' ? go['screen'] : null;
}

export function markReviewedOf(c: Component): string | null {
  if (kindTag(c.kind) !== 'button') return null;
  const action = kindPayload(c.kind)?.['action'];
  if (!isRecord(action)) return null;
  const mr = action['markReviewed'];
  return isRecord(mr) && typeof mr['info'] === 'string' ? mr['info'] : null;
}

export function isBackButton(c: Component): boolean {
  if (kindTag(c.kind) !== 'button') return false;
  return kindPayload(c.kind)?.['action'] === 'back';
}

/**
 * Components moved between two versions: same id, different screen, parent,
 * or tab. Copies (`copyOf`) and new components are not moves (BRIEF 5a,
 * stability budget). Informational only; the Lean checker enforces the budget.
 */
export function componentsMoved(before: Program, after: Program): number {
  const old = componentById(before);
  let moved = 0;
  for (const { screen, component } of allComponents(after)) {
    if (component.copyOf) continue;
    const prev = old.get(component.id);
    if (!prev) continue;
    if (prev.screen.id !== screen.id || (prev.component.parent ?? null) !== (component.parent ?? null) || prev.component.tab !== component.tab) {
      moved++;
    }
  }
  return moved;
}

/** Commit screens: screens with a commit button. */
export function commitScreens(program: Program): { screen: Screen; commit: string }[] {
  return program.screens.flatMap((screen) =>
    screen.components.flatMap((c) => {
      const commit = commitOf(c);
      return commit ? [{ screen, commit }] : [];
    }),
  );
}
