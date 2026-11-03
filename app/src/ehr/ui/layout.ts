import type { UiNode } from "./types";

/** A visual card flow is appropriate only for complete read-only sections. */
export function isCardColumns(nodes: UiNode[]): boolean {
  const readOnly = (node: UiNode): boolean => {
    if (
      "field" in node ||
      "alert" in node ||
      "tabs" in node ||
      "stepper" in node
    )
      return false;
    if ("button" in node) return ["nav", "toggle"].includes(node.button.role);
    if ("datedTimeline" in node)
      return node.datedTimeline.children.every(readOnly);
    if ("board" in node || "patientPane" in node) return false;
    if ("timeline" in node) return node.timeline.children.every(readOnly);
    if ("section" in node) return node.section.children.every(readOnly);
    if ("columns" in node) return node.columns.children.every(readOnly);
    if ("presentation" in node)
      return node.presentation.children.every(readOnly);
    if ("chartReferences" in node)
      return node.chartReferences.children.every(readOnly);
    if ("valueSet" in node) return node.valueSet.children.every(readOnly);
    if ("rowAction" in node) return node.rowAction.children.every(readOnly);
    return "info" in node || "text" in node;
  };
  return (
    nodes.length >= 3 &&
    nodes.every((node) => "section" in node) &&
    nodes.every(readOnly)
  );
}
