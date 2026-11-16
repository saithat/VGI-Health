import type { Event } from "../../../lean/generated/ehr-types";
import { keyboardKey, type KeyboardTransition, type Part } from "./layout";

/** One painted box as the grid sees it: its element, Lean part and source path. */
export interface GridBox {
  element: HTMLElement;
  part?: Part | undefined;
  source?: string | undefined;
}
const cellRoles = new Set(["cellValue", "status", "badge"]);
const parent = (source: string) => source.split(".").slice(0, -1).join(".");

/** The value cells of each table, keyed by the table's source path. Lean gives
 * every cell its row and column (Layout.Display.infoParts); a table's cells
 * are display parts of its own occurrence. */
export function tableCells(boxes: GridBox[]): Map<string, GridBox[]> {
  const tables = new Map<string, GridBox[]>();
  for (const box of boxes) {
    if (!box.source || !box.part || !cellRoles.has(box.part.role)) continue;
    if (box.part.row === undefined || box.part.col === undefined) continue;
    const table = parent(box.source);
    if (!tables.has(table)) tables.set(table, []);
    tables.get(table)?.push(box);
  }
  return tables;
}

/** A record row's single navigation action: the one button of the row-action
 * group that Lean attaches to that table row (`rowAction target row`). */
export function rowActions(boxes: GridBox[]): Map<string, GridBox> {
  const byTable = new Map<string, Map<number, GridBox[]>>();
  const wrappers = boxes.filter(
    (b) => b.part?.kind === "rowAction" && b.part.row !== undefined && b.source,
  );
  for (const wrapper of wrappers) {
    const prefix = `${wrapper.source}.`;
    const buttons = boxes.filter(
      (b) =>
        b.source?.startsWith(prefix) &&
        parent(b.source) === wrapper.source &&
        b.part?.target,
    );
    const table = wrapper.part?.comp ?? "";
    if (!byTable.has(table)) byTable.set(table, new Map());
    byTable.get(table)?.set(wrapper.part?.row ?? 0, buttons);
  }
  const actions = new Map<string, GridBox>();
  for (const [table, rows] of byTable)
    for (const [row, buttons] of rows) {
      const only = buttons[0];
      if (buttons.length === 1 && only?.part?.kind === "nav")
        actions.set(`${table}|${row}`, only);
    }
  return actions;
}

/** Connects every painted table to Lean's grid profile and its rows to their
 * single navigation action. Arrow, Home/End and Control+Home/End move a roving
 * focus through `Keyboard.grid` (the proved transitions, called through the
 * layout API); a click on a row whose record has one navigation action sends
 * that action's own click, the same event as its button. No target, text or
 * geometry is added: the row's action stays the Lean target box it is. */
export function connectGrids(
  boxes: GridBox[],
  emit: (box: GridBox, event: Event) => void,
  keyboard: KeyboardTransition,
  blocked: (box: GridBox) => boolean,
) {
  const headings = new Map(
    boxes.filter((b) => b.source).map((b) => [b.source ?? "", b]),
  );
  const actions = rowActions(boxes);
  for (const [table, cells] of tableCells(boxes)) {
    const rows = Math.max(...cells.map((c) => (c.part?.row ?? 0) + 1));
    const cols = Math.max(...cells.map((c) => (c.part?.col ?? 0) + 1));
    const comp = headings.get(table)?.part?.comp ?? "";
    const at = (focus: number) =>
      cells.find(
        (c) =>
          (c.part?.row ?? 0) * cols + (c.part?.col ?? 0) === focus,
      );
    cells.forEach((cell, i) => {
      const { element, part } = cell;
      const row = part?.row ?? 0,
        col = part?.col ?? 0;
      element.setAttribute("role", "gridcell");
      element.setAttribute("aria-rowindex", String(row + 1));
      element.setAttribute("aria-colindex", String(col + 1));
      if (!element.hasAttribute("tabindex") || element.tabIndex >= 0)
        element.tabIndex = i === 0 ? 0 : -1;
      const action = actions.get(`${comp}|${row}`);
      const click = () => {
        if (action && !blocked(cell))
          emit(action, { click: { comp: action.part?.comp ?? "" } });
      };
      if (action) element.dataset.rowAction = action.part?.comp ?? "";
      else delete element.dataset.rowAction;
      element.onclick = click;
      element.onkeydown = (event) => {
        const key = keyboardKey(event);
        if (!key || ["tab", "shiftTab"].includes(key)) return;
        if ((key === "enter" || key === "space") && action && !blocked(cell)) {
          event.preventDefault();
          click();
          return;
        }
        const next = keyboard(
          "grid",
          rows,
          cols,
          { focus: row * cols + col, selected: 0, isOpen: true, invoker: "" },
          key,
        );
        const target = at(next.focus);
        if (!target || target === cell) return;
        event.preventDefault();
        element.tabIndex = -1;
        target.element.tabIndex = 0;
        target.element.focus({ preventScroll: true });
      };
    });
    const grid = headings.get(table)?.element;
    if (grid) {
      grid.setAttribute("aria-rowcount", String(rows));
      grid.setAttribute("aria-colcount", String(cols));
    }
  }
}

/** The event of a pager target: `selectTab` on its list with the page Lean
 * gives it (Layout.Display.pagerParts); the page selector sends the page
 * chosen among Lean's options. */
export function pagerEvent(part: Part, chosen?: string): Event | undefined {
  if (part.role !== "pager" || part.enabled === false) return undefined;
  const idx = chosen === undefined ? (part.col ?? 0) : Number(chosen);
  if (!Number.isSafeInteger(idx) || idx < 0) return undefined;
  return { selectTab: { comp: part.comp ?? "", idx } };
}
