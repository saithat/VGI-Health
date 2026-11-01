import type { UiPresentationKind } from "../../../../lean/generated/ehr-types";
import type { NodeOf, UiNode, UiScreen } from "./types";

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
interface ExpectedRowPlacement {
  rows: Map<NodeOf<"info">, Map<number, UiNode[]>>;
  placed: Set<NodeOf<"rowAction">>;
}
/** Independent placement model: explicit targets may only bind an existing source row. */
function expectedRowPlacement(
  kind: UiPresentationKind,
  nodes: UiNode[],
): ExpectedRowPlacement {
  const infos: NodeOf<"info">[] = [];
  const actions: NodeOf<"rowAction">[] = [];
  const scan = (nodes: UiNode[], view: UiPresentationKind) => {
    for (const node of nodes) {
      if ("presentation" in node)
        scan(node.presentation.children, node.presentation.kind);
      else if ("columns" in node) scan(node.columns.children, view);
      else if ("section" in node) scan(node.section.children, view);
      else if ("tabs" in node) scan(node.tabs.body, view);
      else if ("rowAction" in node) actions.push(node.rowAction);
      else if (
        "info" in node &&
        view !== "growth" &&
        view !== "trend" &&
        view !== "notes"
      )
        infos.push(node.info);
    }
  };
  scan(nodes, kind);
  const rows: ExpectedRowPlacement["rows"] = new Map();
  const placed: ExpectedRowPlacement["placed"] = new Set();
  for (const action of actions) {
    if (!Number.isSafeInteger(action.row) || action.row < 0) continue;
    const target = infos.find(
      (info) => info.comp === action.target && info.rows.length > action.row,
    );
    if (!target) continue;
    const slots = rows.get(target) ?? new Map<number, UiNode[]>();
    slots.set(action.row, [
      ...(slots.get(action.row) ?? []),
      ...action.children,
    ]);
    rows.set(target, slots);
    placed.add(action);
  }
  return { rows, placed };
}
/** Independent model-to-accessibility projection, used only by release checks. */
export function expectedNodeAria(
  node: UiNode,
  confirmProvided = false,
  presentation?: UiPresentationKind,
  placement?: ExpectedRowPlacement,
): AriaEntry[] {
  switch (true) {
    case "presentation" in node:
      return expectedChildrenAria(
        node.presentation.children,
        node.presentation.kind,
        placement ??
          expectedRowPlacement(
            node.presentation.kind,
            node.presentation.children,
          ),
      );
    case "rowAction" in node:
      return placement?.placed.has(node.rowAction)
        ? []
        : expectedChildrenAria(
            node.rowAction.children,
            presentation,
            placement,
          );
    case "section" in node:
      return nest(
        entry("region", node.section.title),
        expectedChildrenAria(node.section.children, presentation, placement),
      );
    case "columns" in node:
      return expectedChildrenAria(
        node.columns.children,
        presentation,
        placement,
      );
    case "tabs" in node:
      return [
        ...nest(
          entry("tablist", "Chart tabs"),
          node.tabs.labels.map((name) => entry("tab", name)),
        ),
        ...nest(
          entry("tabpanel", node.tabs.labels[node.tabs.selected] ?? ""),
          expectedChildrenAria(node.tabs.body, presentation, placement),
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
      if (presentation) {
        const controls = [...(placement?.rows.get(node.info) ?? [])]
          .sort(([left], [right]) => left - right)
          .flatMap(([, children]) =>
            expectedChildrenAria(children, presentation, placement),
          );
        if (presentation === "folderList" || presentation === "notes")
          return nest(entry("list", node.info.label), controls);
        const names = new Set<string>();
        if (presentation === "trend" || presentation === "growth") {
          for (const row of node.info.rows) {
            const value = (key: string) =>
              row.find(([name]) => name === key)?.[1] ?? "";
            const numeric = (s: string) =>
              /^-?\d+(?:\.\d+)?$/.test(s.trim()) && Number.isFinite(Number(s));
            if (presentation === "growth") {
              if (!numeric(value("Age (months)"))) continue;
              if (numeric(value("Weight (kg)")))
                names.add(`${node.info.label}: Weight (kg)`);
              if (numeric(value("Height (cm)")))
                names.add(`${node.info.label}: Height (cm)`);
              if (value("Percentile") && numeric(value("Value")))
                names.add(
                  `${node.info.label}: ${value("Series")}${value("Unit") ? ` (${value("Unit")})` : ""}`,
                );
            } else if (numeric(value("Value")))
              names.add(
                `${node.info.label}: ${value("Test") || value("Measure") || node.info.label}${value("Unit") ? ` (${value("Unit")})` : ""}`,
              );
          }
        }
        return [
          ...[...names].map((name) => entry("img", name)),
          ...nest(entry("table", node.info.label), controls),
          ...(presentation === "growth" &&
          node.info.rows.some((row) =>
            row.some(([key, value]) => key === "Percentile" && value !== ""),
          )
            ? [entry("table", `${node.info.label} reference data`)]
            : []),
          ...(presentation === "timeGrid" &&
          node.info.rows.some((row) =>
            row.some(
              ([key, value]) =>
                ![
                  "Medication",
                  "Dose",
                  "Route",
                  "Frequency",
                  "Order status",
                ].includes(key) && value.split(" · ").length > 3,
            ),
          )
            ? [entry("list", `${node.info.label} administration details`)]
            : []),
        ];
      }
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
function expectedChildrenAria(
  nodes: UiNode[],
  presentation?: UiPresentationKind,
  placement?: ExpectedRowPlacement,
): AriaEntry[] {
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
      presentation,
      placement,
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
      entry("navigation", "Chart navigation"),
      screen.nav
        .filter(([, items]) => items.length > 0)
        .flatMap(([group, items]) =>
          nest(
            entry("region", group),
            nest(
              entry("list", `${group} screens`),
              items.map(([, label]) => ({
                role: "button",
                name: label,
                disabled: false,
              })),
            ),
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
