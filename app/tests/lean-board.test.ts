import { expect, test, vi } from "vitest";
import { createBoardTransport } from "../src/lean-ui/board";
import type { UiScreen } from "../src/ehr/ui/types";
const screen = (modal: UiScreen["modal"] = null): UiScreen => ({
  banner: [],
  title: "Board",
  nav: [],
  workspace: [],
  side: [],
  modal,
});
test("board events and paint journals stay in the named session; foreign modal blocks", async () => {
  let a = screen();
  const A = {
    getSnapshot: () => ({ ui: a }),
    dispatch: vi.fn(async () => undefined),
    onPaint: vi.fn(),
  };
  const B = {
    getSnapshot: () => ({ ui: screen() }),
    dispatch: vi.fn(async () => undefined),
    onPaint: vi.fn(),
  };
  const board = createBoardTransport(
    new Map([
      ["A", A],
      ["B", B],
    ]),
  );
  await board.dispatch("B", { click: { comp: "same" } });
  expect(A.dispatch).not.toHaveBeenCalled();
  expect(B.dispatch).toHaveBeenCalledOnce();
  await expect(
    board.dispatch("unknown", { click: { comp: "same" } }),
  ).rejects.toThrow("Unknown");
  await expect(
    board.dispatch("A", { click: { comp: "workspace.open|B|0" } }),
  ).rejects.toThrow("this pane");
  a = screen({ text: { s: "Clinical acknowledgment" } });
  await expect(board.dispatch("B", { ack: { alert: "same" } })).rejects.toThrow(
    "owns interaction",
  );
  await board.dispatch("A", { ack: { alert: "same" } });
  board.onPaint();
  expect(A.onPaint).toHaveBeenCalledWith(a);
  expect(B.onPaint).toHaveBeenCalledOnce();
});
