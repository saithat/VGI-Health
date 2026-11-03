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
const sourceDate = z.strictObject({
  resource: label,
  field: z.enum(["effectiveDateTime", "effectivePeriod.start", "issued"]),
  timestamp: z.string(),
});
const codeChoices = z.strictObject({
  options: z.array(pair),
  showCode: z.boolean(),
  allowOther: z.boolean(),
});
export const uiNodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z
    .union([
      z.strictObject({
        board: z.strictObject({
          urgent: z.array(
            z.strictObject({
              patient: label,
              banner: z.array(pair),
              alertId: label,
              label,
              severity: label,
            }),
          ),
          children: z.array(uiNodeSchema),
        }),
      }),
      z.strictObject({
        patientPane: z.strictObject({
          patient: label,
          banner: z.array(pair),
          metadata: z.strictObject({
            sourceLabels: z.array(pair),
            fieldSources: z.array(pair),
            entryHints: z.array(pair),
            fieldChoices: z.array(z.tuple([label, codeChoices])),
          }),
          children: z.array(uiNodeSchema),
          modal: z.array(uiNodeSchema),
        }),
      }),
      z.strictObject({
        datedTimeline: z.strictObject({
          title: label,
          dated: z.array(
            z.strictObject({
              source: sourceDate,
              utcSecond: z.number().int().safe(),
              nanosecond: nat.max(999999999),
            }),
          ),
          undated: z.array(sourceDate),
          children: z.array(uiNodeSchema),
        }),
      }),
      z.strictObject({
        timeline: z.strictObject({
          title: label,
          children: z.array(uiNodeSchema),
        }),
      }),
      z.strictObject({
        valueSet: z.strictObject({
          options: z.array(z.strictObject({ code: label, label })),
          allowCustom: z.boolean(),
          children: z.array(uiNodeSchema),
        }),
      }),
      z.strictObject({
        chartReferences: z.strictObject({
          references: z.array(
            z.strictObject({
              measure: label,
              unit: label,
              percentile: label,
              source: label,
              population: label,
              points: z.array(z.tuple([nat, nat])),
            }),
          ),
          children: z.array(uiNodeSchema),
        }),
      }),
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
    ])
    .superRefine((node, ctx) => {
      if ("board" in node) {
        const panes = node.board.children;
        const keys = panes.flatMap((p) =>
          "patientPane" in p ? [p.patientPane.patient] : [],
        );
        if (
          keys.length !== panes.length ||
          new Set(keys).size !== keys.length ||
          node.board.urgent.some((d) => !keys.includes(d.patient))
        )
          ctx.addIssue({
            code: "custom",
            message: "Board requires unique patient panes and scoped urgency",
          });
      }
      if (
        "datedTimeline" in node &&
        node.datedTimeline.dated.some((d, i, items) => {
          const previous = items[i - 1];
          return (
            previous &&
            (d.utcSecond < previous.utcSecond ||
              (d.utcSecond === previous.utcSecond &&
                d.nanosecond < previous.nanosecond))
          );
        })
      )
        ctx.addIssue({
          code: "custom",
          message: "Dated timeline chronology rejected",
        });
    }),
);
/** Offline boundary only; the clinician path forwards Lean output unchanged. */
export const uiScreenSchema: z.ZodType<UiScreen> = z
  .strictObject({
    banner: z.array(pair),
    viewer: label.optional(),
    nav: z.array(z.tuple([label, z.array(pair)])),
    activeNav: label.optional(),
    sourceLabels: z.array(pair).optional(),
    entryHints: z.array(pair).optional(),
    fieldChoices: z
      .array(
        z.tuple([
          label,
          z.strictObject({
            options: z.array(pair),
            showCode: z.boolean(),
            allowOther: z.boolean(),
          }),
        ]),
      )
      .optional(),
    screen: label.optional(),
    fieldSources: z.array(pair).optional(),
    title: label,
    workspace: z.array(uiNodeSchema),
    side: z.array(uiNodeSchema),
    modal: uiNodeSchema.nullable(),
  })
  .transform(
    ({
      screen: screenId,
      fieldSources,
      viewer,
      activeNav,
      sourceLabels,
      entryHints,
      fieldChoices,
      ...screen
    }) => ({
      ...screen,
      ...(screenId === undefined ? {} : { screen: screenId }),
      ...(fieldSources === undefined ? {} : { fieldSources }),
      ...(viewer === undefined ? {} : { viewer }),
      ...(activeNav === undefined ? {} : { activeNav }),
      ...(sourceLabels === undefined ? {} : { sourceLabels }),
      ...(entryHints === undefined ? {} : { entryHints }),
      ...(fieldChoices === undefined ? {} : { fieldChoices }),
    }),
  );
