import type { UiNode, UiScreen, Pair } from "../ehr/ui/types";

export interface Source {
  node: UiNode;
  choices: Pair[];
  allowOther: boolean;
  patient?: string;
  paneModal?: boolean;
}
/** Same preorder and child ordinals as Layout.Semantic.screenNodes. Wrappers
 * have their own occurrences; patient modal children follow ordinary children. */
export function screenSources(screen: UiScreen): Map<string, Source> {
  const result = new Map<string, Source>();
  const roots: UiNode[] = [
    { text: { s: screen.banner.map(([k, v]) => `${k}: ${v}`).join("  ") } },
    { text: { s: screen.title } },
    {
      text: {
        s: screen.nav
          .map(
            ([title, items]) =>
              `${title}: ${items.map((p) => p[1]).join(" | ")}`,
          )
          .join("  "),
      },
    },
    ...screen.workspace,
    ...screen.side,
    ...(screen.modal ? [screen.modal] : []),
    ...(screen.urgent ?? []),
  ];
  function visit(
    node: UiNode,
    path: number[],
    inherited: Omit<Source, "node">,
  ) {
    let context = inherited;
    if ("valueSet" in node)
      context = {
        ...context,
        choices: node.valueSet.options.map((o) => [o.code, o.label]),
        allowOther: node.valueSet.allowCustom,
      };
    if ("patientPane" in node)
      context = {
        ...context,
        patient: node.patientPane.patient,
        paneModal: node.patientPane.modal.length > 0,
      };
    const choices =
      "field" in node
        ? screen.fieldChoices?.find(([id]) => id === node.field.comp)?.[1]
        : undefined;
    result.set(path.join("."), {
      ...context,
      node,
      ...(choices
        ? { choices: choices.options, allowOther: choices.allowOther }
        : {}),
    });
    const payload = Object.values(node)[0];
    const children: UiNode[] =
      "patientPane" in node
        ? [...node.patientPane.children, ...node.patientPane.modal]
        : "tabs" in node
          ? node.tabs.body
          : "children" in payload
            ? payload.children
            : [];
    children.forEach((child, i) => visit(child, [...path, i], context));
  }
  roots.forEach((node, i) =>
    visit(node, [i], { choices: [], allowOther: false }),
  );
  return result;
}
