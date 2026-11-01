import { z } from "zod";

/** §10 wire format: Lean's externally tagged constructors, without FHIR interpretation. */
export type Pair = [string, string];
export type { UiNode, UiScreen } from "../../../../lean/generated/ehr-types";
import { UiPresentationKindValues } from "../../../../lean/generated/ehr-types";
import type { UiNode, UiScreen } from "../../../../lean/generated/ehr-types";
export type NodeOf<K extends keyof UnionKeys> = Extract<
  UiNode,
  Record<K, unknown>
>[K];
type UnionKeys = { [K in UiNode as keyof K]: unknown };
const pair = z.tuple([z.string(), z.string()]);
const label = z.string().min(1);
const nat = z.number().int().nonnegative();
export const uiNodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z.union([
    z.strictObject({
      rowAction: z.strictObject({
        target: label,
        row: nat,
        children: z.array(uiNodeSchema),
      }),
    }),
    z.strictObject({
      presentation: z.strictObject({
        kind: z.enum(UiPresentationKindValues),
        children: z.array(uiNodeSchema),
      }),
    }),
    z.strictObject({
      section: z.strictObject({
        id: label,
        title: label,
        children: z.array(uiNodeSchema),
      }),
    }),
    z.strictObject({
      columns: z.strictObject({ children: z.array(uiNodeSchema) }),
    }),
    z.strictObject({
      tabs: z.strictObject({
        id: label,
        labels: z.array(label),
        selected: nat,
        body: z.array(uiNodeSchema),
      }),
    }),
    z.strictObject({
      stepper: z.strictObject({ steps: z.array(pair), current: nat }),
    }),
    z.strictObject({
      field: z.strictObject({
        comp: label,
        label,
        kind: label,
        value: z.string().nullable(),
        unit: z.string().nullable(),
        provenance: z.string().nullable(),
        pendingConfirm: z.boolean(),
        humanOnly: z.boolean(),
        required: z.boolean(),
      }),
    }),
    z.strictObject({
      info: z.strictObject({
        comp: z.string(),
        label,
        infoId: label,
        display: label,
        rows: z.array(z.array(pair)),
      }),
    }),
    z.strictObject({
      alert: z.strictObject({
        comp: label,
        alertId: label,
        label,
        severity: label,
      }),
    }),
    z.strictObject({
      button: z.strictObject({
        comp: label,
        label,
        role: label,
        enabled: z.boolean(),
        blockedReason: z.string().nullable(),
        hotkey: z.string().nullable(),
      }),
    }),
    z.strictObject({ text: z.strictObject({ s: z.string() }) }),
  ]),
);
/** Offline boundary only; the clinician path forwards Lean output unchanged. */
export const uiScreenSchema: z.ZodType<UiScreen> = z.strictObject({
  banner: z.array(pair),
  nav: z.array(z.tuple([label, z.array(pair)])),
  title: label,
  workspace: z.array(uiNodeSchema),
  side: z.array(uiNodeSchema),
  modal: uiNodeSchema.nullable(),
});
