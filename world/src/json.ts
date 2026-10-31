/** Small type-safe helpers for walking untyped JSON (FHIR bundles) without casts. */

export type Rec = Record<string, unknown>;

export function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Follow a path of keys / indexes; undefined if any step is missing. */
export function getPath(v: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = v;
  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[key];
    } else {
      if (!isRecord(cur)) return undefined;
      cur = cur[key];
    }
  }
  return cur;
}

export function getString(v: unknown, ...path: (string | number)[]): string | undefined {
  return asString(getPath(v, ...path));
}

export function getNumber(v: unknown, ...path: (string | number)[]): number | undefined {
  return asNumber(getPath(v, ...path));
}

/** All `coding[]` entries plus `text` of a CodeableConcept, as {system, code, display}. */
export function codings(cc: unknown): { system: string; code: string; display: string }[] {
  const out: { system: string; code: string; display: string }[] = [];
  for (const c of asArray(getPath(cc, "coding"))) {
    out.push({ system: getString(c, "system") ?? "", code: getString(c, "code") ?? "", display: getString(c, "display") ?? "" });
  }
  const text = getString(cc, "text");
  if (text !== undefined) out.push({ system: "", code: "", display: text });
  return out;
}

/** Concatenated displays and codes of a CodeableConcept, for regex matching. */
export function conceptText(cc: unknown): string {
  return codings(cc)
    .map((c) => `${c.code} ${c.display}`)
    .join(" | ");
}
