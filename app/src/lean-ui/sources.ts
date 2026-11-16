import type { UiNode, UiScreen, Pair } from "../ehr/ui/types";

/** One occurrence of Lean's semantic inventory (Layout.Semantic.screenNodes):
 * its path, the role of its display part (Layout.Display.PartRole), whether it
 * is a target, and the component it operates. Texts are not mirrored: the
 * painter draws Lean's own part text. */
export interface Occurrence {
  path: number[];
  role: string;
  target: boolean;
  /** Component identity of a control, button, tab, alert, section or info. */
  comp: string;
  /** Components whose click point is this occurrence (the agent's geometry). */
  ids: string[];
}
interface Cx {
  options: Pair[];
  fieldChoices: [string, { options: Pair[]; showCode: boolean }][];
  entryHints: [string, string][];
  confirms: Set<string>;
}
interface Leaf {
  role: string;
  target?: boolean;
  comp?: string;
  ids?: string[];
}
const button = (comp: string, label: string, role: string): UiNode => ({
  button: {
    comp,
    label,
    role,
    enabled: true,
    blockedReason: null,
    hotkey: null,
  },
});
/** Layout.Semantic.navNode: a wrapper, a heading per group, a target per link. */
export const navNode = (nav: UiScreen["nav"]): UiNode => ({
  section: {
    id: "navigation",
    title: "Navigation",
    children: nav.map(([title, items]) => ({
      section: {
        id: title,
        title,
        children: items.map(([id, label]) => button(id, label, "nav")),
      },
    })),
  },
});
/** Display.kindOptions: the codes listed in `code:a|b|c`. */
const kindOptions = (kind: string): Pair[] => {
  const [, ...rest] = kind.split(":");
  return rest.length
    ? rest
        .join(":")
        .split("|")
        .filter(Boolean)
        .map((code): Pair => [code, code])
    : [];
};
/** Display.fieldOptions: quick picks, else the value set, else the kind. */
function fieldOptions(cx: Cx, comp: string, kind: string): Pair[] {
  const set = cx.fieldChoices.find(([id]) => id === comp)?.[1];
  return set ? set.options : cx.options.length ? cx.options : kindOptions(kind);
}
/** Display.uniformRows: at least two rows with the same captions in order. */
const uniformRows = (rows: Pair[][]): boolean => {
  const [first, ...rest] = rows;
  if (!first || !rest.length) return false;
  const keys = JSON.stringify(first.map(([key]) => key));
  return rest.every(
    (row) => JSON.stringify(row.map(([key]) => key)) === keys,
  );
};
/** Format.statusColumn and Display.cellRole: the role of a value cell. */
const cellRole = (key: string): string =>
  /status|confirmation|review state|scheduled|administration/i.test(key) ||
  /^\d{1,2}:\d{2}/.test(key)
    ? "status"
    : key === "Flag" || key === "Abnormal"
      ? "badge"
      : "cellValue";
/** Display.leafParts: the display parts of a node after its own part, in
 * Lean's order. Only presence, role and target are mirrored. */
function leafParts(cx: Cx, node: UiNode): Leaf[] {
  if ("field" in node) {
    const f = node.field;
    const chosen =
      f.value !== null &&
      (cx.fieldChoices.find(([id]) => id === f.comp)?.[1].showCode ?? false) &&
      fieldOptions(cx, f.comp, f.kind).some(([code]) => code === f.value);
    return [
      { role: "control", target: true, comp: f.comp, ids: [f.comp] },
      ...(f.unit !== null ? [{ role: "unit" }] : []),
      ...(chosen ? [{ role: "code" }] : []),
      ...(f.required ? [{ role: "required" }] : []),
      ...(cx.entryHints.some(([id]) => id === f.comp)
        ? [{ role: "hint" }]
        : []),
      ...(f.provenance !== null ? [{ role: "source" }] : []),
      ...(f.pendingConfirm
        ? [
            {
              role: "pending",
              target: !cx.confirms.has(f.comp),
              comp: f.comp,
            },
          ]
        : []),
      ...(f.humanOnly ? [{ role: "human" }] : []),
    ];
  }
  if ("button" in node)
    return [
      ...(!node.button.enabled || node.button.blockedReason !== null
        ? [{ role: "reason" }]
        : []),
      ...(node.button.hotkey !== null ? [{ role: "hotkey" }] : []),
    ];
  if ("tabs" in node)
    return node.tabs.labels.map(() => ({
      role: "tab",
      target: true,
      comp: node.tabs.id,
    }));
  if ("stepper" in node)
    return node.stepper.steps.map(() => ({ role: "step" }));
  if ("info" in node) {
    const { rows, display } = node.info;
    if (!rows.length) return display === "status" ? [] : [{ role: "empty" }];
    return uniformRows(rows)
      ? [
          ...(rows[0] ?? []).map(() => ({ role: "cellLabel" })),
          ...rows.flatMap((row) => row.map(([key]) => ({ role: cellRole(key) }))),
        ]
      : rows.flatMap((row) =>
          row.flatMap(([key]) => [
            { role: "cellLabel" },
            { role: cellRole(key) },
          ]),
        );
  }
  if ("board" in node) return node.board.urgent.map(() => ({ role: "alert" }));
  if ("datedTimeline" in node)
    return [...node.datedTimeline.dated, ...node.datedTimeline.undated].map(
      () => ({ role: "item" }),
    );
  if ("chartReferences" in node)
    return node.chartReferences.references.map(() => ({ role: "item" }));
  if ("patientPane" in node)
    return (node.patientPane.metadata.urgent ?? []).map((atom) =>
      "alert" in atom
        ? { role: "alert", comp: atom.alert.comp }
        : { role: "button", target: true, comp: atom.button.comp },
    );
  return [];
}
/** Display.ownPart: the role, target flag and component of a node's own part. */
function ownPart(node: UiNode): Leaf {
  if ("text" in node) return { role: "text" };
  if ("field" in node) return { role: "label", comp: node.field.comp };
  if ("button" in node)
    return {
      role: "button",
      target: true,
      comp: node.button.comp,
      ids: [node.button.comp],
    };
  if ("alert" in node)
    return { role: "alert", comp: node.alert.comp, ids: [node.alert.comp] };
  if ("info" in node)
    return {
      role: "heading",
      comp: node.info.comp === "" ? node.info.infoId : node.info.comp,
      ids: [node.info.comp],
    };
  if ("section" in node)
    return {
      role: "heading",
      comp: node.section.id,
      ids: [node.section.id],
    };
  if ("timeline" in node || "datedTimeline" in node) return { role: "heading" };
  if ("patientPane" in node)
    return { role: "heading", comp: node.patientPane.patient };
  if ("tabs" in node)
    return { role: "wrapper", comp: node.tabs.id, ids: [node.tabs.id] };
  if ("rowAction" in node)
    return { role: "wrapper", comp: node.rowAction.target };
  return { role: "wrapper" };
}
const children = (node: UiNode): UiNode[] =>
  "patientPane" in node
    ? [...node.patientPane.children, ...node.patientPane.modal]
    : "tabs" in node
      ? node.tabs.body
      : "board" in node
        ? node.board.children
        : "datedTimeline" in node
          ? node.datedTimeline.children
          : "timeline" in node
            ? node.timeline.children
            : "presentation" in node
              ? node.presentation.children
              : "valueSet" in node
                ? node.valueSet.children
                : "chartReferences" in node
                  ? node.chartReferences.children
                  : "rowAction" in node
                    ? node.rowAction.children
                    : "section" in node
                      ? node.section.children
                      : "columns" in node
                        ? node.columns.children
                        : [];
/** Semantic.confirmComps: components with an explicit confirmation button. */
function confirmComps(node: UiNode): string[] {
  if ("button" in node)
    return node.button.role === "confirm" ? [node.button.comp] : [];
  return children(node).flatMap(confirmComps);
}
/** The same occurrences, in the same order and with the same paths, as
 * Layout.Semantic.screenNodes: a node's own part, then its display parts
 * (a field's control, unit and annotations; a button's reason and hotkey; one
 * target per tab; one part per step, table cell or listed record), then its
 * child nodes. A value set and a patient pane pass their context down. */
export function screenOccurrences(screen: UiScreen): Occurrence[] {
  const result: Occurrence[] = [];
  const push = (path: number[], part: Leaf) =>
    result.push({
      path,
      role: part.role,
      target: part.target ?? false,
      comp: part.comp ?? "",
      ids: part.ids ?? [],
    });
  // The navigation wrapper and its group headings are chrome, not program
  // components: their captions never name a click point.
  function visit(node: UiNode, path: number[], cx: Cx, chrome = false) {
    const own = ownPart(node);
    push(path, chrome && "section" in node ? { ...own, ids: [] } : own);
    const leaves = leafParts(cx, node);
    leaves.forEach((leaf, i) => push([...path, i], leaf));
    let inner = cx;
    if ("valueSet" in node)
      inner = {
        ...cx,
        options: node.valueSet.options.map((o): Pair => [o.code, o.label]),
      };
    if ("patientPane" in node)
      inner = {
        ...cx,
        fieldChoices: node.patientPane.metadata.fieldChoices,
        entryHints: node.patientPane.metadata.entryHints,
      };
    children(node).forEach((child, i) =>
      visit(child, [...path, leaves.length + i], inner, chrome),
    );
  }
  const body = [
    ...screen.workspace,
    ...screen.side,
    ...(screen.modal ? [screen.modal] : []),
    ...(screen.urgent ?? []),
  ];
  const cx: Cx = {
    options: [],
    fieldChoices: screen.fieldChoices ?? [],
    entryHints: screen.entryHints ?? [],
    confirms: new Set(body.flatMap(confirmComps)),
  };
  push([0], { role: "banner" });
  push([1], { role: "title" });
  visit(navNode(screen.nav), [2], cx, true);
  body.forEach((node, i) => visit(node, [i + 3], cx));
  return result;
}
