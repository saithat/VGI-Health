import { createContext } from "react";
import type { UiPresentationKind } from "../../../../../lean/generated/ehr-types";
import type { NodeOf, UiNode } from "../types";

type Info = NodeOf<"info">;
type RowAction = NodeOf<"rowAction">;
export interface RowLayout {
  kind: UiPresentationKind;
  rows: Map<Info, Map<number, UiNode[]>>;
  embedded: Set<RowAction>;
}
export const PresentationContext = createContext<RowLayout | undefined>(
  undefined,
);

/** Bind explicit semantic placement hints. Missing targets retain their inline controls. */
export function rowLayout(
  kind: UiPresentationKind,
  children: UiNode[],
  parent?: RowLayout,
): RowLayout {
  const rows = new Map(
    [...(parent?.rows ?? [])].map(([node, slots]) => [
      node,
      new Map([...slots].map(([slot, nodes]) => [slot, [...nodes]])),
    ]),
  );
  const embedded = new Set(parent?.embedded);
  const infos: Info[] = [];
  const controls: RowAction[] = [];
  function visit(nodes: UiNode[], current: UiPresentationKind) {
    for (const node of nodes) {
      if ("presentation" in node)
        visit(node.presentation.children, node.presentation.kind);
      else if ("valueSet" in node) visit(node.valueSet.children, current);
      else if ("chartReferences" in node)
        visit(node.chartReferences.children, current);
      else if ("section" in node) visit(node.section.children, current);
      else if ("columns" in node) visit(node.columns.children, current);
      else if ("tabs" in node) visit(node.tabs.body, current);
      else if ("rowAction" in node) controls.push(node.rowAction);
      else if (
        "info" in node &&
        !["status", "document"].includes(node.info.display) &&
        !["growth", "trend", "notes"].includes(current)
      )
        infos.push(node.info);
    }
  }
  visit(children, kind);
  for (const action of controls) {
    if (embedded.has(action)) continue;
    const target =
      Number.isSafeInteger(action.row) && action.row >= 0
        ? infos.find(
            (info) =>
              info.comp === action.target && action.row < info.rows.length,
          )
        : undefined;
    if (!target) continue;
    const slots = rows.get(target) ?? new Map<number, UiNode[]>();
    slots.set(action.row, [
      ...(slots.get(action.row) ?? []),
      ...action.children,
    ]);
    rows.set(target, slots);
    embedded.add(action);
  }
  return { kind, rows, embedded };
}
