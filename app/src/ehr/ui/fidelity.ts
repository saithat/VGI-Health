import type { UiNode, UiScreen } from "./types";

export interface AriaEntry {
  role: string;
  name: string;
  disabled?: boolean;
  ancestors?: string[];
}
const entry = (role: string, name = ""): AriaEntry => ({ role, name });
const roleKey = (entry: AriaEntry) =>
  `${entry.role} ${JSON.stringify(entry.name)}`;
function nest(parent: AriaEntry, children: AriaEntry[]): AriaEntry[] {
  return [
    parent,
    ...children.map((child) => ({
      ...child,
      ancestors: [roleKey(parent), ...(child.ancestors ?? [])],
    })),
  ];
}
/** Independent model-to-accessibility projection, used only by release checks. */
export function expectedNodeAria(
  node: UiNode,
  confirmProvided = false,
): AriaEntry[] {
  switch (true) {
    case "section" in node:
      return nest(
        entry("region", node.section.title),
        expectedChildrenAria(node.section.children),
      );
    case "columns" in node:
      return expectedChildrenAria(node.columns.children);
    case "tabs" in node:
      return [
        ...nest(
          entry("tablist", "Chart tabs"),
          node.tabs.labels.map((name) => entry("tab", name)),
        ),
        ...nest(
          entry("tabpanel", node.tabs.labels[node.tabs.selected] ?? ""),
          expectedChildrenAria(node.tabs.body),
        ),
      ];
    case "stepper" in node:
      return [entry("list", "Visit progress")];
    case "field" in node: {
      const kind = node.field.kind.split(":")[0];
      return [
        entry(
          kind === "flag"
            ? "checkbox"
            : kind === "coded" || kind === "code"
              ? "combobox"
              : "textbox",
          node.field.label,
        ),
        ...(node.field.pendingConfirm && !confirmProvided
          ? [
              {
                role: "button",
                name: `Confirm ${node.field.label}`,
                disabled: false,
              },
            ]
          : []),
      ];
    }
    case "info" in node:
      return node.info.display === "summary"
        ? []
        : node.info.display === "list"
          ? [entry("list", node.info.label)]
          : [
              ...(node.info.display === "trend" &&
              node.info.rows.some((row) =>
                row.some(
                  ([key, value]) =>
                    /value|result|weight/i.test(key) &&
                    Number.isFinite(Number.parseFloat(value)),
                ),
              )
                ? [entry("img", `${node.info.label} trend`)]
                : []),
              entry("table", node.info.label),
            ];
    case "alert" in node:
      return [entry("alert", node.alert.label)];
    case "button" in node:
      return [
        {
          role: "button",
          name: node.button.label,
          disabled: !node.button.enabled,
        },
      ];
    case "text" in node:
      return [];
    default:
      return exhaust(node);
  }
}
function expectedChildrenAria(nodes: UiNode[]): AriaEntry[] {
  return nodes.flatMap((node) =>
    expectedNodeAria(
      node,
      "field" in node &&
        nodes.some(
          (other) =>
            "button" in other &&
            other.button.role === "confirm" &&
            other.button.comp === node.field.comp,
        ),
    ),
  );
}
function exhaust(node: never): never {
  throw new Error(`Unknown node: ${String(node)}`);
}
export function expectedAria(screen: UiScreen): AriaEntry[] {
  if (screen.modal)
    return nest(
      entry("dialog", modalName(screen.modal) ?? "Clinical alert"),
      expectedNodeAria(screen.modal),
    );
  return [
    entry("banner", "Patient banner"),
    ...nest(
      entry("navigation", "Clinical navigation"),
      screen.nav.flatMap(([group, items]) =>
        nest(
          entry("list", `${group} screens`),
          items.map(([, name]) => ({
            role: "button",
            name,
            disabled: false,
          })),
        ),
      ),
    ),
    ...nest(entry("main"), [
      ...(screen.side.length
        ? nest(
            entry("complementary", "Clinical summary"),
            expectedChildrenAria(screen.side),
          )
        : []),
      ...expectedChildrenAria(screen.workspace),
    ]),
  ];
}

function modalName(node: UiNode): string | undefined {
  if ("section" in node) return node.section.title;
  if ("alert" in node) return node.alert.label;
  if ("columns" in node)
    return node.columns.children.map(modalName).find(Boolean);
  return undefined;
}
const roles = new Set([
  "banner",
  "navigation",
  "main",
  "complementary",
  "region",
  "dialog",
  "textbox",
  "combobox",
  "checkbox",
  "button",
  "table",
  "alert",
  "list",
  "img",
  "tab",
  "tablist",
  "tabpanel",
]);
/** Flatten only contracted roles from Playwright's browser accessibility snapshot.
 * Ignoring headings/cells/layout here permits design-system wrappers, while exact
 * equality still detects extra/missing controls, names, ordering, semantic
 * ancestry and disabled state.
 */
export function observedAria(snapshot: string): AriaEntry[] {
  const stack: { indent: number; entry: AriaEntry }[] = [];
  return snapshot.split("\n").flatMap((line) => {
    // YAML quotes the entire key when a name contains a colon. Undo YAML's
    // single-quote escaping before parsing the role/name inside that key.
    const normalized = line.replace(
      /^(\s*- )'(.+)'(:.*)?$/,
      (_, prefix: string, key: string, suffix: string | undefined) =>
        prefix + key.replaceAll("''", "'") + (suffix ?? ""),
    );
    const match = /^\s*- (\w+)(?: ("(?:[^"\\]|\\.)*"))?(.*)$/.exec(normalized);
    const role = match?.[1];
    if (!role) return [];
    const indent = normalized.length - normalized.trimStart().length;
    while (stack.length && (stack.at(-1)?.indent ?? -1) >= indent) stack.pop();
    if (!roles.has(role)) return [];
    const name: string = match?.[2] ? JSON.parse(match[2]) : "";
    const observed: AriaEntry = {
      role,
      name,
      ...(role === "button"
        ? { disabled: match?.[3]?.includes("[disabled]") ?? false }
        : {}),
      ...(stack.length
        ? { ancestors: stack.map((parent) => roleKey(parent.entry)) }
        : {}),
    };
    stack.push({ indent, entry: observed });
    return [observed];
  });
}
