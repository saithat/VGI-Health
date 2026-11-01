import { z } from "zod";
import type {
  Component,
  DecisionRecord,
  JsonPatchOp,
  Program,
} from "../../../agent/src/schema";
import { fieldCaption, sectionCaption } from "../ehr/ui/clinical-display";

export interface RevisionChange {
  label: string;
  before: string;
  after: string;
}
const words = (text: string) =>
  text.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[._-]/g, " ");
const caption = (component: Component) =>
  fieldCaption(component.label || words(component.id));
const fieldKind = z.object({
  field: z.object({
    prefill: z.union([
      z.literal("none"),
      z.object({ fromRecord: z.object({ fact: z.string() }) }),
      z.object({ default: z.object({ value: z.string() }) }),
      z.object({ linked: z.object({ element: z.string() }) }),
    ]),
  }),
});
const prefill = (component: Component) => {
  const parsed = fieldKind.safeParse(component.kind);
  if (!parsed.success) return null;
  const value = parsed.data.field.prefill;
  if (value === "none") return "Entered by the clinician";
  if ("fromRecord" in value)
    return `From the record: ${words(value.fromRecord.fact)}`;
  if ("default" in value) return `Suggested value: ${value.default.value}`;
  return `From the confirmed ${words(value.linked.element)}`;
};
/** Compare immutable recorded programs. This function never applies a patch. */
export function revisionChanges(
  before: Program,
  after: Program,
): RevisionChange[] {
  const changes: RevisionChange[] = [];
  if (before.start !== after.start)
    changes.push({
      label: "Landing activity",
      before:
        before.screens.find((s) => s.id === before.start)?.title ??
        words(before.start),
      after:
        after.screens.find((s) => s.id === after.start)?.title ??
        words(after.start),
    });
  const commonScreens = new Set(
    before.screens
      .filter((s) => after.screens.some((a) => a.id === s.id))
      .map((s) => s.id),
  );
  const oldScreens = before.screens.filter((s) => commonScreens.has(s.id));
  const newScreens = after.screens.filter((s) => commonScreens.has(s.id));
  for (const screen of newScreens) {
    const prior = oldScreens.findIndex((s) => s.id === screen.id),
      next = newScreens.findIndex((s) => s.id === screen.id);
    if (prior !== next)
      changes.push({
        label: `Activity order: ${sectionCaption(screen.title)}`,
        before: `Activity ${prior + 1}`,
        after: `Activity ${next + 1}`,
      });
  }
  for (const screen of after.screens) {
    const prior = before.screens.find((item) => item.id === screen.id);
    if (!prior) {
      changes.push({
        label: "Screen added",
        before: "Not available",
        after: sectionCaption(screen.title),
      });
      continue;
    }
    if (prior.title !== screen.title)
      changes.push({
        label: "Screen name",
        before: prior.title,
        after: screen.title,
      });
    const parents = [
      ...new Set(
        [...prior.components, ...screen.components].map((c) => c.parent ?? ""),
      ),
    ];
    for (const parent of parents) {
      const left = prior.components.filter((c) => (c.parent ?? "") === parent);
      const right = screen.components.filter(
        (c) => (c.parent ?? "") === parent,
      );
      const common = new Set(
        left.filter((c) => right.some((r) => r.id === c.id)).map((c) => c.id),
      );
      const oldOrder = left.filter((c) => common.has(c.id));
      const newOrder = right.filter((c) => common.has(c.id));
      if (
        oldOrder.map((c) => c.id).join("|") !==
        newOrder.map((c) => c.id).join("|")
      ) {
        const group = screen.components.find((c) => c.id === parent)?.label;
        for (const component of newOrder) {
          const oldIndex = oldOrder.findIndex((c) => c.id === component.id);
          const newIndex = newOrder.findIndex((c) => c.id === component.id);
          if (oldIndex === newIndex) continue;
          const position = (items: Component[], index: number) => {
            const previous = items[index - 1];
            return `Position ${index + 1}${previous ? `, after ${caption(previous)}` : ", first in this section"}`;
          };
          changes.push({
            label: `${sectionCaption(screen.title)}${group ? ` · ${sectionCaption(group)}` : ""} · ${caption(component)}: position`,
            before: position(oldOrder, oldIndex),
            after: position(newOrder, newIndex),
          });
        }
      }
    }
    for (const component of screen.components) {
      const old = prior.components.find((c) => c.id === component.id);
      const label = `${sectionCaption(screen.title)} · ${caption(component)}`;
      if (!old) {
        changes.push({
          label,
          before: "Not on this screen",
          after: "Available on this screen",
        });
        continue;
      }
      if (old.parent !== component.parent) {
        const location = (
          components: Component[],
          parent: string | undefined,
        ) =>
          parent
            ? (components.find((c) => c.id === parent)?.label ?? words(parent))
            : "Main workspace";
        changes.push({
          label,
          before: location(prior.components, old.parent),
          after: location(screen.components, component.parent),
        });
      }
      const oldPrefill = prefill(old),
        newPrefill = prefill(component);
      if (oldPrefill !== newPrefill && newPrefill)
        changes.push({
          label: `${label}: suggested entry`,
          before: oldPrefill ?? "No suggested entry",
          after: newPrefill,
        });
      if (
        JSON.stringify(old.visibility) !== JSON.stringify(component.visibility)
      ) {
        const visibility = (c: Component) =>
          typeof c.visibility === "string"
            ? "Always shown"
            : "unlessReceipt" in c.visibility
              ? `Shown until a valid ${words(c.visibility.unlessReceipt.info)} review is recorded`
              : `Shown for ${words(c.visibility.encounter.kind)} encounters`;
        changes.push({
          label: `${label}: visibility`,
          before: visibility(old),
          after: visibility(component),
        });
      }
      const groupKind = z.object({
        group: z.object({
          collapsible: z.boolean(),
          startCollapsed: z.boolean(),
        }),
      });
      const oldGroup = groupKind.safeParse(old.kind),
        nextGroup = groupKind.safeParse(component.kind);
      if (
        oldGroup.success &&
        nextGroup.success &&
        JSON.stringify(oldGroup.data) !== JSON.stringify(nextGroup.data)
      ) {
        const groupText = (group: {
          collapsible: boolean;
          startCollapsed: boolean;
        }) =>
          `${group.startCollapsed ? "Starts collapsed" : "Starts expanded"}${group.collapsible ? "; can be expanded or collapsed" : "; remains open"}`;
        changes.push({
          label: `${label}: section display`,
          before: groupText(oldGroup.data.group),
          after: groupText(nextGroup.data.group),
        });
      }
      const alertKind = z.object({ alert: z.object({ popup: z.boolean() }) });
      const oldAlert = alertKind.safeParse(old.kind),
        nextAlert = alertKind.safeParse(component.kind);
      if (
        oldAlert.success &&
        nextAlert.success &&
        oldAlert.data.alert.popup !== nextAlert.data.alert.popup
      )
        changes.push({
          label: `${label}: alert display request`,
          before: oldAlert.data.alert.popup
            ? "Requests a pop-up dialog"
            : "Requests inline display",
          after: nextAlert.data.alert.popup
            ? "Requests a pop-up dialog; alert policy still applies"
            : "Requests inline display; alert policy still applies",
        });
      if (old.hotkey !== component.hotkey)
        changes.push({
          label: `${label}: keyboard shortcut`,
          before: old.hotkey ?? "No shortcut",
          after: component.hotkey ?? "No shortcut",
        });
      if (old.size !== component.size)
        changes.push({
          label: `${label}: density`,
          before: old.size,
          after: component.size,
        });
      if (old.label !== component.label)
        changes.push({
          label: `${sectionCaption(screen.title)}: field or section name`,
          before: old.label,
          after: component.label,
        });
    }
    for (const component of prior.components.filter(
      (c) => !screen.components.some((r) => r.id === c.id),
    ))
      changes.push({
        label: `${sectionCaption(screen.title)} · ${caption(component)}`,
        before: "Available on this screen",
        after: "Removed from this screen",
      });
  }
  for (const screen of before.screens.filter(
    (s) => !after.screens.some((r) => r.id === s.id),
  ))
    changes.push({
      label: "Screen removed",
      before: sectionCaption(screen.title),
      after: "Not available",
    });
  const stepText = (program: Program, macro: Program["macros"][number]) =>
    macro.steps
      .map((step) => {
        if ("goto" in step)
          return `Open ${program.screens.find((s) => s.id === step.goto.screen)?.title ?? words(step.goto.screen)}`;
        const comp = "click" in step ? step.click.comp : step.setValue.comp;
        const component = program.screens
          .flatMap((s) => s.components)
          .find((c) => c.id === comp);
        return "click" in step
          ? `Choose ${component ? caption(component) : words(comp)}`
          : `Suggest ${step.setValue.value} for ${component ? caption(component) : words(comp)}`;
      })
      .join("; ");
  for (const macro of after.macros) {
    const old = before.macros.find((m) => m.id === macro.id);
    if (JSON.stringify(old) !== JSON.stringify(macro))
      changes.push({
        label: `Quick action: ${macro.label}`,
        before: old ? stepText(before, old) : "No quick action",
        after: stepText(after, macro),
      });
  }
  for (const macro of before.macros.filter(
    (m) => !after.macros.some((r) => r.id === m.id),
  ))
    changes.push({
      label: `Quick action: ${macro.label}`,
      before: stepText(before, macro),
      after: "Removed",
    });
  return changes;
}
/** A chosen proposal is not necessarily the patch that passed final certification. */
export function recordedPatch(record: DecisionRecord): JsonPatchOp[] {
  if (record.versionAfter === record.versionBefore) return [];
  return (
    record.certification.attempts
      .filter((a) => a.check.status === "pass")
      .at(-1)?.patch ?? []
  );
}
const reasons: Record<string, string> = {
  patientSelection: "Patient selection inside the EHR must be retained.",
  wellFormed:
    "The screen structure does not satisfy the current release's requirements.",
  writesOnly: "A field or action exceeds this role's permissions.",
  humanOnlyKept: "An entry that must be made by a person was automated.",
  units: "A dose or measurement does not preserve its required units.",
  capturesAllOnce:
    "A required entry is missing or would be captured more than once.",
  reviewsBeforeCommit:
    "Required clinical information is not visible or reviewed before signing.",
  completable: "A required clinical task cannot be completed.",
  budgets: "The change exceeds the permitted interaction budget.",
  stability: "Too many existing controls moved at once.",
  alertsFire: "A required clinical alert would not appear.",
  noFalseAlarms:
    "The change introduces an alert without the required clinical condition.",
  noRepeatInterruptions:
    "The same alert would interrupt the clinician repeatedly.",
  severityTiers:
    "An alert's display does not match its required level of interruption.",
};
export function propertyReason(
  property: string,
  message?: string | null,
  programs: readonly Program[] = [],
): string {
  const base =
    reasons[property] ?? "The native checker rejected this candidate.";
  if (!message) return base;
  const labels = new Map<string, string>([
    ["allergyList", "Allergies"],
    ["patientIdReentry", "Patient identity re-entry"],
    ["administerMed", "Administer medication"],
  ]);
  for (const program of programs)
    for (const screen of program.screens) {
      labels.set(screen.id, screen.title);
      for (const component of screen.components) {
        if (!component.label) continue;
        labels.set(component.id, caption(component));
        const field = z
          .object({ field: z.object({ element: z.string() }) })
          .safeParse(component.kind);
        if (field.success)
          labels.set(field.data.field.element, caption(component));
        const info = z
          .union([
            z.object({ panel: z.object({ info: z.string() }) }),
            z.object({ table: z.object({ info: z.string() }) }),
          ])
          .safeParse(component.kind);
        if (info.success)
          labels.set(
            "panel" in info.data ? info.data.panel.info : info.data.table.info,
            caption(component),
          );
      }
    }
  let detail = message;
  // Replace complete identifiers only, longest first. Preserve the native reason.
  for (const [id, label] of [...labels].sort(
    ([a], [b]) => b.length - a.length,
  )) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    detail = detail.replace(
      new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, "g"),
      `“${label}”`,
    );
  }
  return `${base} ${detail}`;
}
