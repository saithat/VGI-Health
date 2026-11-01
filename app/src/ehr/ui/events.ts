import {
  UnitKindValues,
  type Event,
  type Value,
} from "../../../../lean/generated/ehr-types";
import type { NodeOf } from "./types";

/** Same Value constructors and tenths rounding as the original Html painter. */
export function fieldValue(
  field: NodeOf<"field">,
  raw: string | number | boolean,
): Value | undefined {
  const kind = field.kind.split(":")[0];
  if (kind === "flag") return { flag: { b: raw === true || raw === "true" } };
  if (kind === "quantity" || kind === "qty" || kind === "number") {
    const unit = UnitKindValues.find((u) => u === field.unit);
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
  field: NodeOf<"field">,
  raw: string | number | boolean,
): Event | undefined {
  if (field.kind === "search") return { search: { query: String(raw) } };
  const value = fieldValue(field, raw);
  return value ? { enter: { comp: field.comp, value } } : undefined;
}
