/** The only painter helper available to declarative presentation TSX. */
import type { UiNode } from "./types";
import { StockUiNodeView, type Emit } from "./nodes";
export type PresentationProps = { node: UiNode; onEvent: Emit };
export function UiNodeView({ node, onEvent }: PresentationProps) {
  return <StockUiNodeView node={node} onEvent={onEvent} />;
}
