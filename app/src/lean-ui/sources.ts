import { occurrences } from "../../../scripts/layout-reference/generator.mjs";
import type { UiScreen } from "../ehr/ui/types";

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
  /** Patient namespace supplied by an enclosing pane. */
  patient?: string;
}
/** The same occurrences, in the same order and with the same paths, as
 * Layout.Semantic.screenNodes: a node's own part, then its display parts
 * (a field's control, unit and annotations; a button's reason and hotkey; one
 * target per tab; one part per step, table cell or listed record), then its
 * child nodes. The single mirror lives in the shared reference generator. */
export function screenOccurrences(screen: UiScreen): Occurrence[] {
  return occurrences(screen).map(
    ({ path, role, target, comp, ids, patient }) => ({
      path,
      role,
      target,
      comp,
      ids,
      ...(patient ? { patient } : {}),
    }),
  );
}
