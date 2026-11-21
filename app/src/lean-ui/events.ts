import {
  UnitKindValues,
  type Event,
  type Value,
} from "../../../lean/generated/ehr-types";
import type { NodeOf } from "../core/types";

/** Same Value constructors and tenths rounding as the original Html painter. */
type EntryField = Pick<NodeOf<"field">, "comp" | "kind" | "unit"> &
  Partial<Pick<NodeOf<"field">, "value">>;
export function fieldValue(
  field: EntryField,
  raw: string | number | boolean,
): Value | undefined {
  const kind = field.kind.split(":")[0];
  if (kind === "flag") return { flag: { b: raw === true || raw === "true" } };
  // Search and the critical-action draft have dedicated text handlers in Lean.
  if (raw === "" && kind !== "search" && !field.comp.startsWith("critical.action:"))
    return "cleared";
  if (kind === "quantity" || kind === "qty" || kind === "number") {
    // Lean omits the optional display unit for dimensionless quantities.
    const unit =
      field.unit === null
        ? "none"
        : UnitKindValues.find((u) => u === field.unit);
    const tenths = Math.round(Number(raw) * 10);
    return unit &&
      String(raw).trim() &&
      Number.isSafeInteger(tenths) &&
      tenths >= 0
      ? { qty: { tenths, unit } }
      : undefined;
  }
  if (["code", "coded", "scan"].includes(kind ?? ""))
    return { code: { c: String(raw) } };
  if (kind === "cosign" || kind === "user") return { user: { u: String(raw) } };
  return { text: { s: String(raw) } };
}
export function entryEvent(
  field: EntryField,
  raw: string | number | boolean,
  hadValue = Boolean(field.value),
): Event | undefined {
  if (raw === "" && !hadValue) return undefined;
  const value = fieldValue(field, raw);
  return value ? { enter: { comp: field.comp, value } } : undefined;
}
