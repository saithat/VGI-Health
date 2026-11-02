/** MOCK ONLY: TypeScript stand-in for Lean render. Delete when Lean render is wired.
 * All component/record interpretation is confined to this explicitly selected mock.
 */
import type { Html, HtmlNode } from "../ehr/html";
import type { ScreenView, Spec, Value, ItemView } from "../core/types";
import {
  conceptText,
  dateText,
  type ChartData,
  type Observation,
} from "../data/fhir";
import { mockValueSets } from "./workflow";

type Tag = HtmlNode["node"]["tag"];
const text = (s: string): Html => ({ text: { s } });
export const node = (
  tag: Tag,
  attrs: Record<string, string>,
  ...children: (Html | string)[]
): Html => ({
  node: {
    tag,
    attrs: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    children: children.map((c) => (typeof c === "string" ? text(c) : c)),
  },
});
const box = (cls: string, ...children: (Html | string)[]) =>
  node("div", { class: cls }, ...children);
function table(headers: string[], rows: string[][]): Html {
  return rows.length
    ? node(
        "table",
        { class: "ehr-table ehr-table-compact" },
        node(
          "thead",
          {},
          node("tr", {}, ...headers.map((h) => node("th", {}, h))),
        ),
        node(
          "tbody",
          {},
          ...rows.map((row) =>
            node("tr", {}, ...row.map((cell) => node("td", {}, cell))),
          ),
        ),
      )
    : box("ehr-empty", "No records available.");
}
function observationValue(item: Observation) {
  if (item.component)
    return (
      item.component
        .map((p) => String(p.valueQuantity?.value ?? "—"))
        .join(" / ") + ` ${item.component[0]?.valueQuantity?.unit ?? ""}`
    );
  return item.valueQuantity
    ? `${item.valueQuantity.value ?? "—"} ${item.valueQuantity.unit ?? ""}`
    : (item.valueString ?? "—");
}
function trend(items: Observation[], label: string): Html {
  const values = items.map((i) => i.valueQuantity?.value ?? 0);
  const lo = Math.min(...values),
    hi = Math.max(...values);
  return box(
    "ehr-panel",
    node("h3", { class: "ehr-panel-title" }, label),
    node(
      "svg",
      {
        class: "ehr-trend",
        viewBox: "0 0 600 140",
        role: "img",
        "aria-label": `${label} recorded trend`,
      },
      node("polyline", {
        class: "ehr-trend-line",
        points: values
          .map(
            (v, i) =>
              `${10 + (i * 580) / Math.max(1, values.length - 1)},${125 - ((v - lo) * 110) / Math.max(1, hi - lo)}`,
          )
          .join(" "),
      }),
    ),
    table(
      ["Date", "Value"],
      items.map((i) => [dateText(i.effectiveDateTime), observationValue(i)]),
    ),
  );
}
function info(id: string, data: ChartData): Html {
  const r = data.resources;
  switch (id) {
    case "mockIndication":
      return table(["Medication", "Dose", "Indication"], [["MOCK antibiotic", "500 mg", "Infection · prescriber-confirmed (fixture)"]]);
    case "priorAuth":
      return table(["Order", "Prior authorization", "Action"], [["MOCK elective imaging", "Pending payer review", "Request prior authorization (fixture)"]]);
    case "allergyList":
      return table(
        ["Allergen", "Reaction", "Severity", "Status", "Recorded"],
        r
          .filter((i) => i.resourceType === "AllergyIntolerance")
          .map((i) => [
            conceptText(i.code),
            i.reaction
              ?.flatMap((v) => v.manifestation.map(conceptText))
              .join("; ") ?? "—",
            i.reaction?.map((v) => v.severity).join(", ") ?? "—",
            conceptText(i.clinicalStatus),
            dateText(i.recordedDate),
          ]),
      );
    case "currentMeds":
      return table(
        ["Medication", "Directions", "Status", "Ordered"],
        r
          .filter((i) => i.resourceType === "MedicationRequest")
          .filter((i) => i.status === "active")
          .map((i) => [
            i.medicationReference?.display ??
              conceptText(i.medicationCodeableConcept),
            i.dosageInstruction?.map((v) => v.text).join("; ") ?? "—",
            i.status,
            dateText(i.authoredOn),
          ]),
      );
    case "vitals":
      return table(
        ["Vital sign", "Value", "Recorded", "Source"],
        r
          .filter((i) => i.resourceType === "Observation")
          .filter((i) =>
            i.category?.some((c) =>
              c.coding?.some((v) => v.code === "vital-signs"),
            ),
          )
          .map((i) => [
            conceptText(i.code),
            observationValue(i),
            dateText(i.effectiveDateTime),
            `Observation/${i.id}`,
          ]),
      );
    case "problemList":
      return table(
        ["Problem / diagnosis", "Status", "Onset"],
        r
          .filter((i) => i.resourceType === "Condition")
          .map((i) => [
            conceptText(i.code),
            conceptText(i.clinicalStatus),
            dateText(i.onsetDateTime ?? i.recordedDate),
          ]),
      );
    case "immunizations":
      return table(
        ["Vaccine", "Administered", "Status", "Lot", "Site"],
        r
          .filter((i) => i.resourceType === "Immunization")
          .map((i) => [
            conceptText(i.vaccineCode),
            dateText(i.occurrenceDateTime),
            i.status,
            i.lotNumber ?? "—",
            conceptText(i.site),
          ]),
      );
    case "encounters":
      return table(
        ["Date", "Encounter", "Organization", "Status"],
        r
          .filter((i) => i.resourceType === "Encounter")
          .map((i) => [
            dateText(i.period?.start),
            i.type?.map(conceptText).join("; ") ?? "—",
            i.serviceProvider?.display ?? "—",
            i.status,
          ]),
      );
    case "resultTrend": {
      const labs = r
        .filter((i) => i.resourceType === "Observation")
        .filter((i) =>
          i.category?.some((c) =>
            c.coding?.some((v) => v.code === "laboratory"),
          ),
        );
      const groups = new Map<string, Observation[]>();
      for (const lab of labs) {
        const key = conceptText(lab.code);
        groups.set(key, [...(groups.get(key) ?? []), lab]);
      }
      return box(
        "ehr-panel",
        ...[...groups].map(([label, items]) => trend(items, label)),
        table(
          ["Test", "Result", "Reference", "Date", "Flag"],
          labs.map((i) => [
            conceptText(i.code),
            observationValue(i),
            i.referenceRange
              ?.map(
                (v) => v.text ?? `${v.low?.value ?? ""}–${v.high?.value ?? ""}`,
              )
              .join("; ") ?? "—",
            dateText(i.effectiveDateTime),
            i.interpretation?.map(conceptText).join(", ") ?? "—",
          ]),
        ),
      );
    }
    case "growthChart":
      return box(
        "ehr-panel",
        ...["29463-7", "8302-2"].map((code) => {
          const items = r
            .filter((i) => i.resourceType === "Observation")
            .filter((i) => i.code.coding?.some((c) => c.code === code));
          return trend(items, conceptText(items[0]?.code));
        }),
      );
    default:
      return box("ehr-empty", `MOCK: no display projection for ${id}`);
  }
}
function valueText(value: Value | undefined): string {
  if (!value) return "";
  if ("text" in value) return value.text.s;
  if ("code" in value) return value.code.c;
  if ("qty" in value) return String(value.qty.tenths / 10);
  if ("user" in value) return value.user.u;
  return String(value.flag.b);
}
function banner(data: ChartData): Html {
  const p = data.patient,
    name = p.name?.[0];
  const birth = p.birthDate,
    date = data.context.asOf;
  const age = birth
    ? Number(date.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (date.slice(5) < birth.slice(5) ? 1 : 0)
    : "—";
  const fields: [string, string][] = [
    ["DOB", birth ?? "Not recorded"],
    ["MRN", p.identifier?.[0]?.value ?? p.id],
    ["Age / sex", `${age} y · ${p.gender ?? "Unknown"}`],
    ["Language", conceptText(p.communication?.[0]?.language)],
    ["PCP", p.generalPractitioner?.[0]?.display ?? "Not recorded"],
    [
      "Coverage",
      data.resources
        .filter((r) => r.resourceType === "Coverage")
        .flatMap((r) => r.payor.map((v) => v.display ?? "—"))
        .join(", ") || "Not recorded",
    ],
    ["Code status", data.context.codeStatus],
    ["Isolation", data.context.isolation],
    ["Care gaps", data.context.careGaps.join(" · ") || "None recorded"],
  ];
  return box(
    "ehr-banner ehr-landmark",
    node(
      "h1",
      { class: "ehr-screen-title" },
      name?.text ?? `${name?.family ?? ""}, ${name?.given?.join(" ") ?? ""}`,
    ),
    ...fields.map(([label, value]) =>
      box(
        "ehr-banner-field",
        node("span", { class: "ehr-banner-label" }, label),
        value,
      ),
    ),
    node(
      "span",
      { class: "ehr-badge ehr-badge-allergy" },
      `Allergies: ${
        data.resources
          .filter((r) => r.resourceType === "AllergyIntolerance")
          .map((r) => conceptText(r.code))
          .join(" · ") || "No records"
      }`,
    ),
    node(
      "span",
      { class: "ehr-badge ehr-badge-flag" },
      data.context.criticalFlags.join(" · ") || "No critical flags recorded",
    ),
  );
}

export function mockPage(view: ScreenView, spec: Spec, data: ChartData): Html {
  function itemTree(item: ItemView): Html {
    const comp = item.component,
      kind = comp.kind;
    const disabled = !view.enabled.includes(comp.id);
    const attrs: Record<string, string> = { "data-comp-id": comp.id };
    const actionAttrs = {
      ...attrs,
      "data-event": "click",
      ...(disabled ? { disabled: "true" } : {}),
    };
    const children = () =>
      view.items
        .filter((i) => i.shown && i.component.parent === comp.id)
        .map(itemTree);
    const reason = view.blocked.find(([id]) => id === comp.id)?.[1];
    if (kind === "banner") return node("div", attrs, banner(data));
    if (kind === "tabs") {
      const tabs = view.items.filter((i) => i.component.parent === comp.id);
      return box(
        "ehr-section",
        node(
          "div",
          {
            ...attrs,
            role: "tablist",
            class: "ehr-tabs",
            "aria-label": comp.label,
          },
          ...tabs.map((i) =>
            node(
              "button",
              {
                class: `ehr-tab${i.component.tab === item.selectedTab ? " ehr-tab-active" : ""}`,
                role: "tab",
                "aria-selected": String(i.component.tab === item.selectedTab),
                "data-event": "selectTab",
                "data-comp-id": comp.id,
                "data-tab": String(i.component.tab),
              },
              i.component.label,
            ),
          ),
        ),
        ...children(),
      );
    }
    if (typeof kind === "string")
      return box("ehr-empty", `MOCK unsupported: ${kind}`);
    if ("field" in kind) {
      const element = spec.elements.find((e) => e.id === kind.field.element),
        fieldKind = element?.kind ?? "text";
      const value = valueText(item.bound?.value);
      const vk =
        typeof fieldKind === "object"
          ? "quantity" in fieldKind
            ? "qty"
            : "code"
          : fieldKind === "flag"
            ? "flag"
            : fieldKind === "cosign"
              ? "user"
              : "text";
      const inputAttrs = {
        ...attrs,
        class: `ehr-input${item.bound?.pendingConfirm ? " ehr-input-pending" : ""}`,
        "aria-label": comp.label,
        "data-event": "enter",
        "data-value-kind": vk,
        value,
        ...(disabled ? { disabled: "true" } : {}),
      };
      const options =
        typeof fieldKind === "object" && "coded" in fieldKind
          ? mockValueSets[fieldKind.coded.valueSet]
          : undefined;
      const input = options
        ? node(
            "select",
            inputAttrs,
            node("option", { value: "" }, "Select…"),
            ...options.map((o) => node("option", { value: o.value }, o.label)),
          )
        : node("input", {
            ...inputAttrs,
            type: vk === "qty" ? "number" : vk === "flag" ? "checkbox" : "text",
            ...(typeof fieldKind === "object" && "quantity" in fieldKind
              ? { "data-unit": fieldKind.quantity.unit }
              : {}),
          });
      return box(
        "ehr-field",
        node(
          "label",
          {},
          node("span", { class: "ehr-field-label" }, comp.label),
          input,
        ),
        ...(item.bound?.provenance
          ? [box("ehr-provenance", item.bound.provenance)]
          : []),
        ...(item.bound?.pendingConfirm
          ? [
              node(
                "button",
                {
                  class: "ehr-confirm",
                  "data-event": "confirm",
                  "data-comp-id": comp.id,
                },
                "Confirm prefilled value",
              ),
            ]
          : []),
        ...(element?.humanOnly
          ? [box("ehr-human-only", "Human only · unskippable")]
          : []),
      );
    }
    if ("group" in kind)
      return box(
        "ehr-section",
        node(
          kind.group.collapsible ? "button" : "h3",
          {
            ...attrs,
            class: `ehr-section-header${item.expanded ? "" : " ehr-section-collapsed"}`,
            ...(kind.group.collapsible
              ? {
                  "data-event": "toggle",
                  "aria-expanded": String(item.expanded),
                }
              : {}),
          },
          comp.label,
        ),
        box("ehr-grid", ...children()),
      );
    if ("panel" in kind || "table" in kind || "trend" in kind)
      return node(
        "div",
        { ...attrs, class: "ehr-panel" },
        node("h3", { class: "ehr-panel-title" }, comp.label),
        info(
          "panel" in kind
            ? kind.panel.info
            : "table" in kind
              ? kind.table.info
              : kind.trend.info,
          data,
        ),
      );
    if ("alert" in kind)
      return node(
        "div",
        { ...attrs, class: "ehr-alert-inline", role: "alert" },
        comp.label,
      );
    if ("search" in kind)
      return node("input", {
        ...attrs,
        class: "ehr-search",
        "data-event": "search",
        "aria-label": comp.label,
        placeholder: kind.search.scope,
      });
    return box(
      "ehr-field",
      node(
        "button",
        {
          ...actionAttrs,
          class:
            "macro" in kind
              ? "ehr-macro"
              : `ehr-button${"button" in kind && typeof kind.button.action === "object" && "commit" in kind.button.action ? " ehr-button-primary" : " ehr-button-secondary"}`,
        },
        comp.label,
      ),
      ...(reason ? [box("ehr-blocked-reason", reason)] : []),
    );
  }
  const top = view.items.filter((i) => i.shown && !i.component.parent);
  const activities = top.filter((i) => i.component.tag.startsWith("activity-"));
  return box(
    "ehr-shell",
    box(
      "ehr-toolbar",
      node(
        "h1",
        { class: "ehr-screen-title" },
        "VGI HEALTH · Northside Family Medicine",
      ),
      node(
        "span",
        { class: "ehr-badge ehr-badge-flag" },
        "MOCK · Uncertified fixture preview · No clinical writes",
      ),
    ),
    ...top.filter((i) => i.component.kind === "banner").map(itemTree),
    node(
      "div",
      {
        class: "ehr-nav",
        role: "navigation",
        "aria-label": "Chart activities",
      },
      ...activities.map(itemTree),
    ),
    box(
      "ehr-grid",
      box(
        "ehr-sidebar",
        box(
          "ehr-sidebar-section",
          node("h3", {}, "Longitudinal chart"),
          "Office visit · Follow-up",
        ),
        box(
          "ehr-sidebar-section",
          node("h3", {}, "Active problems"),
          node(
            "ul",
            {},
            ...data.resources
              .filter((r) => r.resourceType === "Condition")
              .map((r) => node("li", {}, conceptText(r.code))),
          ),
        ),
        box(
          "ehr-sidebar-section",
          "Care gaps",
          ...data.context.careGaps.map((g) =>
            box("ehr-badge ehr-badge-flag", g),
          ),
        ),
      ),
      box(
        "ehr-main",
        node("h2", { class: "ehr-screen-title" }, view.title),
        ...top
          .filter(
            (i) =>
              i.component.kind !== "banner" &&
              !i.component.tag.startsWith("activity-"),
          )
          .map(itemTree),
      ),
    ),
  );
}
