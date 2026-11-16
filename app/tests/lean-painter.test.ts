import { afterEach, expect, test, vi } from "vitest";
import { createPainter } from "../src/lean-ui/painter";
import { screenSources } from "../src/lean-ui/sources";
import type { Drawn, Output } from "../src/lean-ui/layout";
import type { UiNode, UiScreen } from "../src/ehr/ui/types";
const field: UiNode = {
  field: {
    comp: "note",
    label: "Clinical note",
    kind: "text",
    value: "abc",
    unit: null,
    provenance: null,
    pendingConfirm: false,
    humanOnly: true,
    required: true,
  },
};
const screen = (
  workspace: UiNode[],
  modal: UiNode | null = null,
): UiScreen => ({
  banner: [],
  title: "Visit",
  nav: [],
  workspace,
  side: [],
  modal,
  screen: "visit",
});
function drawn(
  id: string,
  source: number[] | null,
  y = 0,
  options: {
    scroll?: boolean;
    modal?: boolean;
    clip?: boolean;
    original?: string;
  } = {},
): Drawn {
  return {
    box: {
      rect: { x: 0, y, w: 6400, h: 3072 },
      style: {
        fg: { r: 15, g: 23, b: 42 },
        bg: { r: 255, g: 255, b: 255 },
        radius: 0,
        z: options.modal ? 100 : 0,
      },
      info: {
        id,
        source,
        text: {
          key: id,
          maxLength: 0,
          maxLines: 2,
          overflow: "scroll",
          safety: true,
          font: 0,
          fontSize: 896,
          lineHeight: 1408,
        },
        target: source?.[0] === 3,
        banner: false,
        interruptive: options.modal ?? false,
        commit: false,
        paint: true,
        role: "",
        mark: "rect",
      },
      scroll: options.scroll ?? false,
      clip: null,
      clips: options.clip ? [["body", { x: 0, y: 0, w: 6400, h: 3072 }]] : [],
    },
    lines: ["abc"],
    glyphWidths: [[512, 512, 512]],
    original: options.original ?? "Clinical note: abc",
  };
}
const output = (boxes: Drawn[]): Output => ({
  accepted: true,
  viewport: { w: 92160, h: 57600 },
  boxes,
  tree: { drawn: boxes[0] ?? drawn("root", null), children: [] },
  lineWidths: boxes.map((d) =>
    d.glyphWidths.map((ws) => ws.reduce((s, n) => s + n, 0)),
  ),
  findings: [],
});
const setup = () => {
  const root = document.createElement("main");
  document.body.append(root);
  const dispatch = vi.fn(),
    keyboard = vi.fn((_profile, _rows, _cols, state) => ({
      ...state,
      focus: 1,
      selected: 1,
    }));
  return {
    root,
    dispatch,
    keyboard,
    painter: createPainter(root, { dispatch, keyboard }),
  };
};
afterEach(() => document.body.replaceChildren());

test("keyed clinical control survives inserted cards, preserving focus, selection and draft text", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(screen([field]), output([drawn("a", [3])]));
  const input = root.querySelector("textarea");
  if (!input) throw new Error("No input");
  input.focus();
  input.value = "typing locally";
  input.setSelectionRange(2, 5);
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(dispatch).toHaveBeenLastCalledWith({
    enter: { comp: "note", value: { text: { s: "typing locally" } } },
  });
  painter.patch(
    screen([{ text: { s: "New preceding card" } }, field]),
    output([drawn("new", [3]), drawn("renumbered", [4], 3584)]),
  );
  expect(root.querySelector("textarea")).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("typing locally");
  expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5]);
  expect(input.parentElement?.dataset.source).toBe("4");
});

test("native scroll and safety-text scroll survive value patches and clip translations", () => {
  const { root, painter } = setup();
  const boxes = [
    drawn("body", null, 0, { scroll: true }),
    drawn("a", [3], 6400, { clip: true }),
  ];
  painter.patch(screen([field]), output(boxes));
  const scroll = root.querySelector<HTMLElement>('[data-box="body"]');
  const card = root.querySelector<HTMLElement>('[data-box="a"]');
  const lines = card?.querySelector<HTMLElement>(".lean-lines");
  if (!scroll || !lines || !card) throw new Error("Missing scroll region");
  scroll.scrollTop = 30;
  scroll.dispatchEvent(new window.Event("scroll"));
  lines.scrollTop = 12;
  painter.patch(
    screen([field]),
    output([
      boxes[0] ?? drawn("body", null),
      { ...(boxes[1] ?? drawn("a", [3])), lines: ["updated"] },
    ]),
  );
  expect(scroll.scrollTop).toBe(30);
  expect(card.style.top).toBe("70px");
  expect(card.querySelector(".lean-lines")?.scrollTop).toBe(12);
});

test("same component IDs on different occurrences stay distinct and stale controls are removed", () => {
  const { root, painter } = setup();
  painter.patch(
    screen([field, field]),
    output([drawn("a", [3]), drawn("b", [4], 3584)]),
  );
  const controls = [...root.querySelectorAll("textarea")];
  expect(controls).toHaveLength(2);
  expect(controls[0]).not.toBe(controls[1]);
  painter.patch(screen([field]), output([drawn("a", [3])]));
  expect(root.querySelectorAll("textarea")).toHaveLength(1);
  expect(controls[1]?.isConnected).toBe(false);
});

test("interruptive controls block ordinary actions, trap Tab through Lean, then restore focus", () => {
  const { root, painter, keyboard, dispatch } = setup();
  const button: UiNode = {
    button: {
      comp: "sign",
      label: "Sign",
      role: "primary",
      enabled: true,
      blockedReason: null,
      hotkey: null,
    },
  };
  const ack: UiNode = {
    button: {
      comp: "alert",
      label: "Acknowledge",
      role: "ack",
      enabled: true,
      blockedReason: null,
      hotkey: null,
    },
  };
  painter.patch(screen([button]), output([drawn("sign", [3])]));
  const sign = root.querySelector("button");
  sign?.focus();
  painter.patch(
    screen([button], ack),
    output([drawn("sign", [3]), drawn("ack", [4], 5000, { modal: true })]),
  );
  expect(sign?.disabled).toBe(true);
  expect(sign?.parentElement?.inert).toBe(true);
  const acknowledgment = root.querySelector<HTMLButtonElement>(
    '[data-box="ack"] button',
  );
  acknowledgment?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(keyboard).toHaveBeenCalledWith(
    "dialog",
    1,
    1,
    expect.anything(),
    "tab",
  );
  acknowledgment?.click();
  expect(dispatch).toHaveBeenCalledWith({ ack: { alert: "alert" } });
  painter.patch(screen([button]), output([drawn("sign", [3])]));
  expect(document.activeElement).toBe(sign);
});

test("pending fields expose confirmation at the same box and never fabricate clinical values", () => {
  const { root, painter, dispatch } = setup();
  if (!("field" in field)) throw new Error("Field required");
  painter.patch(
    screen([{ field: { ...field.field, pendingConfirm: true } }]),
    output([drawn("a", [3])]),
  );
  const confirm = root.querySelector("button");
  expect(confirm?.getAttribute("aria-label")).toContain(
    "Confirm Clinical note",
  );
  confirm?.click();
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({
    confirm: { comp: "note" },
  });
});

test("text uses scalar cells, preserves original accessible strings, and respects paint=false", () => {
  const { root, painter } = setup();
  const d = drawn("a", [3], 0, { original: "🧬 full original" });
  painter.patch(screen([field]), output([d]));
  expect(root.querySelector("textarea")?.getAttribute("aria-label")).toBe(
    "🧬 full original",
  );
  expect(root.querySelector<HTMLElement>('[data-line="0"]')?.style.width).toBe(
    "24px",
  );
  painter.patch(
    screen([field]),
    output([
      { ...d, box: { ...d.box, info: { ...d.box.info, paint: false } } },
    ]),
  );
  expect(root.querySelectorAll(".lean-lines")).toHaveLength(0);
  expect(root.querySelector("textarea")?.hidden).toBe(true);
  expect(root.querySelector("textarea")?.disabled).toBe(true);
});

test("patient-pane controls remain disabled until a patient-scoped dispatch host exists", () => {
  const { root, painter } = setup();
  const pane: UiNode = {
    patientPane: {
      patient: "A",
      banner: [],
      metadata: {
        sourceLabels: [],
        fieldSources: [],
        entryHints: [],
        fieldChoices: [],
      },
      children: [field],
      modal: [],
    },
  };
  const s = screen([pane]);
  expect(screenSources(s).get("3.0")?.patient).toBe("A");
  painter.patch(s, output([drawn("a", [3, 0])]));
  expect(root.querySelector("textarea")?.disabled).toBe(true);
});
