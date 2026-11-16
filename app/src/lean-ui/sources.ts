import type { UiNode, UiScreen, Pair } from "../ehr/ui/types";

export interface Source {
  node: UiNode;
  choices: Pair[];
  allowOther: boolean;
  patient?: string;
  paneModal?: boolean;
  /** Set on the per-tab targets of a tabs node (Layout.Semantic.tabNodes). */
  tab?: { comp: string; index: number; count: number; selected: number };
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
/** Same preorder and child ordinals as Layout.Semantic.screenNodes. Wrappers
 * have their own occurrences; patient modal children follow ordinary children;
 * a tabs node lists one target per tab label before its selected body. */
export function screenSources(screen: UiScreen): Map<string, Source> {
  const result = new Map<string, Source>();
  const roots: UiNode[] = [
    {
      text: {
        s: [
          ...screen.banner.map(([k, v]) => `${k}: ${v}`),
          ...(screen.viewer ? [`Signed in: ${screen.viewer}`] : []),
        ].join("  "),
      },
    },
    { text: { s: screen.title } },
    navNode(screen.nav),
    ...screen.workspace,
    ...screen.side,
    ...(screen.modal ? [screen.modal] : []),
    ...(screen.urgent ?? []),
  ];
  function visit(
    node: UiNode,
    path: number[],
    inherited: Omit<Source, "node" | "tab">,
    tab?: Source["tab"],
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
      ...(tab ? { tab } : {}),
      ...(choices
        ? { choices: choices.options, allowOther: choices.allowOther }
        : {}),
    });
    if ("tabs" in node) {
      const { id, labels, selected, body } = node.tabs;
      labels.forEach((label, index) =>
        visit(button(id, label, "tab"), [...path, index], context, {
          comp: id,
          index,
          count: labels.length,
          selected,
        }),
      );
      body.forEach((child, i) =>
        visit(child, [...path, labels.length + i], context),
      );
      return;
    }
    const payload = Object.values(node)[0];
    const children: UiNode[] =
      "patientPane" in node
        ? [...node.patientPane.children, ...node.patientPane.modal]
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
