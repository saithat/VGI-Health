import { z } from "zod";

// TEMPORARY Html mirror of core-model §9. Replace with lean/generated when exported.
// Derived Lean constructors: {text:{s:...}} / {node:{tag,attrs,children}}.
export const tags = [
  "div",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "button",
  "input",
  "select",
  "option",
  "label",
  "h1",
  "h2",
  "h3",
  "ul",
  "li",
  "svg",
  "polyline",
  "dialog",
  "form",
] as const;
export const classes = [
  "ehr-shell",
  "ehr-banner",
  "ehr-banner-field",
  "ehr-banner-label",
  "ehr-badge",
  "ehr-badge-allergy",
  "ehr-badge-flag",
  "ehr-sidebar",
  "ehr-sidebar-section",
  "ehr-main",
  "ehr-screen-title",
  "ehr-nav",
  "ehr-nav-item",
  "ehr-nav-active",
  "ehr-toolbar",
  "ehr-section",
  "ehr-section-header",
  "ehr-section-collapsed",
  "ehr-tabs",
  "ehr-tab",
  "ehr-tab-active",
  "ehr-grid",
  "ehr-row",
  "ehr-landmark",
  "ehr-field",
  "ehr-field-label",
  "ehr-input",
  "ehr-input-pending",
  "ehr-unit",
  "ehr-provenance",
  "ehr-confirm",
  "ehr-human-only",
  "ehr-required",
  "ehr-value",
  "ehr-panel",
  "ehr-panel-title",
  "ehr-table",
  "ehr-table-compact",
  "ehr-empty",
  "ehr-trend",
  "ehr-trend-line",
  "ehr-abnormal",
  "ehr-alert-inline",
  "ehr-alert-interruptive",
  "ehr-alert-passive",
  "ehr-modal-backdrop",
  "ehr-modal",
  "ehr-modal-title",
  "ehr-modal-body",
  "ehr-button",
  "ehr-button-primary",
  "ehr-button-secondary",
  "ehr-blocked-reason",
  "ehr-macro",
  "ehr-hotkey",
  "ehr-search",
  "ehr-compact",
  "ehr-tiny",
] as const;
export const attributes = new Set([
  "class",
  "data-comp-id",
  "data-event",
  "data-tab",
  "data-alert",
  "data-value-kind",
  "data-unit",
  "disabled",
  "value",
  "type",
  "placeholder",
  "title",
  "role",
  "points",
  "viewBox",
]);
export const allowedAttribute = (name: string) =>
  attributes.has(name) || /^aria-[a-z-]+$/.test(name);
export interface HtmlText {
  text: { s: string };
}
export interface HtmlNode {
  node: {
    tag: (typeof tags)[number];
    attrs: { name: string; value: string }[];
    children: Html[];
  };
}
export type Html = HtmlText | HtmlNode;
// Offline validation only. The clinician path never invokes this validator.
export const htmlSchema: z.ZodType<Html> = z.lazy(() =>
  z.union([
    z.strictObject({ text: z.strictObject({ s: z.string() }) }),
    z.strictObject({
      node: z.strictObject({
        tag: z.enum(tags),
        attrs: z
          .array(
            z.strictObject({
              name: z
                .string()
                .refine(allowedAttribute, "Non-whitelisted attribute"),
              value: z.string(),
            }),
          )
          .superRefine((attrs, ctx) => {
            for (const attr of attrs)
              if (
                attr.name === "class" &&
                attr.value
                  .split(/\s+/)
                  .filter(Boolean)
                  .some((c) => !new Set<string>(classes).has(c))
              )
                ctx.addIssue({
                  code: "custom",
                  message: "Non-whitelisted class",
                });
          }),
        children: z.array(htmlSchema),
      }),
    }),
  ]),
);
