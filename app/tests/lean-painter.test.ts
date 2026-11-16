import { afterEach, expect, test, vi } from "vitest";
import { createPainter } from "../src/lean-ui/painter";
import { screenOccurrences } from "../src/lean-ui/sources";
import type { Drawn, Output, Part } from "../src/lean-ui/layout";
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
    urgent?: boolean;
    clip?: boolean;
    original?: string;
    target?: boolean;
    lines?: string[];
  } = {},
): Drawn {
  const lines = options.lines ?? ["abc"];
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
        target: options.target ?? true,
        banner: false,
        interruptive: options.modal ?? false,
        commit: false,
        urgent: options.urgent ?? false,
        paint: true,
        role: "",
        mark: "rect",
      },
      scroll: options.scroll ?? false,
      clip: null,
      clips: options.clip ? [["body", { x: 0, y: 0, w: 6400, h: 3072 }]] : [],
    },
    lines,
    glyphWidths: lines.map((line) => Array.from(line).map(() => 512)),
    original: options.original ?? "abc",
  };
}
/** Parts as Lean emits them: defaults omitted. */
const label = (text = "Clinical note"): Part => ({ role: "label", text });
const control = (extra: Partial<Part> = {}): Part => ({
  role: "control",
  text: "abc",
  target: true,
  comp: "note",
  kind: "textarea",
  entry: "text",
  ...extra,
});
const action = (comp: string, kind: string, text = comp): Part => ({
  role: "button",
  text,
  target: true,
  comp,
  kind,
});
const output = (boxes: Drawn[], parts: (Part | null)[]): Output => ({
  accepted: true,
  viewport: { w: 92160, h: 57600 },
  boxes,
  parts,
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

test("a field is painted as Lean's parts: the label box names the control, the other parts describe it", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(
    screen([field]),
    output(
      [
        drawn("label", [3], 0, { target: false, original: "Clinical note" }),
        drawn("value", [3, 0], 3584),
        drawn("required", [3, 1], 7168, {
          target: false,
          original: "Required",
        }),
        drawn("human", [3, 2], 10752, {
          target: false,
          original: "Human entry",
        }),
      ],
      [
        label(),
        control(),
        { role: "required", text: "Required" },
        { role: "human", text: "Human entry" },
      ],
    ),
  );
  // Only the control part is a native control; label and markers are text.
  expect(root.querySelectorAll("textarea")).toHaveLength(1);
  const box = (id: string) =>
    root.querySelector<HTMLElement>(`[data-box="${id}"]`);
  expect(box("label")?.querySelector(".lean-control")).toBeNull();
  expect(box("label")?.dataset.role).toBe("label");
  expect(box("required")?.dataset.role).toBe("required");
  const input = box("value")?.querySelector("textarea");
  if (!input) throw new Error("No control");
  expect(input.getAttribute("aria-labelledby")).toBe("lean-box-label");
  expect(input.getAttribute("aria-describedby")).toBe(
    "lean-box-required lean-box-human",
  );
  expect(input.getAttribute("aria-required")).toBe("true");
  expect(input.value).toBe("abc");
  expect(input.dataset.compId).toBe("note");
  expect(input.dataset.event).toBe("enter");
  input.value = "typed";
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(dispatch).toHaveBeenLastCalledWith({
    enter: { comp: "note", value: { text: { s: "typed" } } },
  });
});

test("a coded control shows Lean's label, offers Lean's options and sends the code", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(
    screen([]),
    output(
      [
        drawn("label", [3], 0, { target: false, original: "Route" }),
        drawn("value", [3, 0], 3584, {
          original: "By mouth",
          lines: ["By mouth"],
        }),
        drawn("unit", [4, 1], 7168, { target: false, original: "kg" }),
        drawn("weight", [4, 0], 10752, { original: "70.5", lines: ["70.5"] }),
        drawn("flag", [5, 0], 14336, { original: "Yes", lines: ["Yes"] }),
      ],
      [
        label("Route"),
        control({
          text: "By mouth",
          raw: "PO",
          comp: "route",
          kind: "select",
          entry: "code",
          placeholder: "Choose value",
          options: [
            ["PO", "By mouth"],
            ["IV", "Intravenous"],
          ],
        }),
        { role: "unit", text: "kg" },
        control({
          text: "70.5",
          comp: "weight",
          kind: "number",
          entry: "qty",
          unit: "kg",
        }),
        control({
          text: "Yes",
          raw: "true",
          comp: "consent",
          kind: "checkbox",
          entry: "flag",
          selected: true,
        }),
      ],
    ),
  );
  const select = root.querySelector("select");
  if (!select) throw new Error("No select");
  // The painted text is the option label; the control's value is the code.
  expect(
    root.querySelector('[data-box="value"] .lean-lines')?.textContent,
  ).toBe("By mouth");
  expect(select.value).toBe("PO");
  expect([...select.options].map((o) => [o.value, o.text])).toEqual([
    ["", "Choose value"],
    ["PO", "By mouth"],
    ["IV", "Intravenous"],
  ]);
  select.value = "IV";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(dispatch).toHaveBeenLastCalledWith({
    enter: { comp: "route", value: { code: { c: "IV" } } },
  });
  const number = root.querySelector<HTMLInputElement>('input[type="number"]');
  if (!number) throw new Error("No number input");
  number.value = "71.2";
  number.dispatchEvent(new InputEvent("input", { bubbles: true }));
  expect(dispatch).toHaveBeenLastCalledWith({
    enter: { comp: "weight", value: { qty: { tenths: 712, unit: "kg" } } },
  });
  const checkbox = root.querySelector<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  expect(checkbox?.checked).toBe(true);
  checkbox?.click();
  expect(dispatch).toHaveBeenLastCalledWith({
    enter: { comp: "consent", value: { flag: { b: false } } },
  });
});

test("keyed clinical control survives inserted parts, preserving focus, selection and draft text", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(
    screen([field]),
    output(
      [drawn("l", [3], 0, { target: false }), drawn("a", [3, 0], 3584)],
      [label(), control()],
    ),
  );
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
    output(
      [
        drawn("new", [3], 0, { target: false }),
        drawn("l", [4], 3584, { target: false }),
        drawn("renumbered", [4, 0], 7168),
      ],
      [{ role: "text", text: "New preceding card" }, label(), control()],
    ),
  );
  expect(root.querySelector("textarea")).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("typing locally");
  expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5]);
  expect(input.parentElement?.dataset.source).toBe("4.0");
});

test("native scroll and safety-text scroll survive value patches and clip translations", () => {
  const { root, painter } = setup();
  const boxes = [
    drawn("body", null, 0, { scroll: true, target: false }),
    drawn("a", [3, 0], 6400, { clip: true }),
  ];
  painter.patch(screen([field]), output(boxes, [null, control()]));
  const scroll = root.querySelector<HTMLElement>('[data-box="body"]');
  const card = root.querySelector<HTMLElement>('[data-box="a"]');
  const lines = card?.querySelector<HTMLElement>(".lean-lines");
  if (!scroll || !lines || !card) throw new Error("Missing scroll region");
  scroll.scrollTop = 30;
  scroll.dispatchEvent(new window.Event("scroll"));
  lines.scrollTop = 12;
  painter.patch(
    screen([field]),
    output(
      [
        boxes[0] ?? drawn("body", null),
        { ...(boxes[1] ?? drawn("a", [3, 0])), lines: ["updated"] },
      ],
      [null, control({ text: "updated" })],
    ),
  );
  expect(scroll.scrollTop).toBe(30);
  expect(card.style.top).toBe("70px");
  expect(card.querySelector(".lean-lines")?.scrollTop).toBe(12);
});

test("same component IDs on different occurrences stay distinct and stale controls are removed", () => {
  const { root, painter } = setup();
  painter.patch(
    screen([field, field]),
    output(
      [drawn("a", [3, 0]), drawn("b", [4, 0], 3584)],
      [control(), control()],
    ),
  );
  const controls = [...root.querySelectorAll("textarea")];
  expect(controls).toHaveLength(2);
  expect(controls[0]).not.toBe(controls[1]);
  painter.patch(screen([field]), output([drawn("a", [3, 0])], [control()]));
  expect(root.querySelectorAll("textarea")).toHaveLength(1);
  expect(controls[1]?.isConnected).toBe(false);
});

test("a button is named by its own text and described by its reason and hotkey parts", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(
    screen([]),
    output(
      [
        drawn("sign", [3], 0, { original: "Sign" }),
        drawn("why", [3, 0], 3584, {
          target: false,
          original: "Allergies not reviewed",
        }),
        drawn("key", [3, 1], 7168, { target: false, original: "Ctrl+S" }),
      ],
      [
        { ...action("sign", "primary", "Sign"), enabled: false, commit: true },
        { role: "reason", text: "Allergies not reviewed" },
        { role: "hotkey", text: "Ctrl+S" },
      ],
    ),
  );
  const sign = root.querySelector("button");
  expect(root.querySelectorAll("button")).toHaveLength(1);
  expect(sign?.disabled).toBe(true);
  expect(sign?.getAttribute("aria-label")).toBe("Sign");
  expect(sign?.getAttribute("aria-describedby")).toBe(
    "lean-box-why lean-box-key",
  );
  expect(root.querySelector<HTMLElement>('[data-box="sign"]')?.dataset).toMatchObject(
    { role: "button", kind: "primary", disabled: "true" },
  );
  sign?.click();
  expect(dispatch).not.toHaveBeenCalled();
});

test("interruptive controls block ordinary actions, trap Tab through Lean, then restore focus", () => {
  const { root, painter, keyboard, dispatch } = setup();
  const sign = action("sign", "primary", "Sign"),
    ack = action("alert", "ack", "Acknowledge");
  painter.patch(screen([]), output([drawn("sign", [3])], [sign]));
  const button = root.querySelector("button");
  button?.focus();
  painter.patch(
    screen([]),
    output(
      [drawn("sign", [3]), drawn("ack", [4, 0], 5000, { modal: true })],
      [sign, ack],
    ),
  );
  expect(button?.disabled).toBe(true);
  expect(button?.parentElement?.inert).toBe(true);
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
    "alert-dialog",
    1,
    1,
    expect.anything(),
    "tab",
  );
  // Escape goes to Lean's clinical alert profile and dismisses nothing.
  const escape = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  acknowledgment?.dispatchEvent(escape);
  expect(keyboard).toHaveBeenLastCalledWith(
    "alert-dialog",
    1,
    1,
    expect.anything(),
    "escape",
  );
  expect(escape.defaultPrevented).toBe(true);
  expect(dispatch).not.toHaveBeenCalled();
  expect(root.querySelector('[data-box="ack"]')).not.toBeNull();
  expect(button?.disabled).toBe(true);
  acknowledgment?.click();
  expect(dispatch).toHaveBeenCalledWith({ ack: { alert: "alert" } });
  painter.patch(screen([]), output([drawn("sign", [3])], [sign]));
  expect(document.activeElement).toBe(button);
});

test("the pinned urgent strip stays operable beside a modal while ordinary controls are blocked", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(
    screen([]),
    output(
      [
        drawn("sign", [3]),
        drawn("notice", [4], 5000, { modal: true }),
        drawn("strip", [5], 10000, { urgent: true }),
      ],
      [
        action("sign", "primary"),
        action("notice", "ack"),
        action("allergy", "ack"),
      ],
    ),
  );
  const button = (box: string) =>
    root.querySelector<HTMLButtonElement>(`[data-box="${box}"] button`);
  expect(button("sign")?.disabled).toBe(true);
  expect(button("sign")?.parentElement?.inert).toBe(true);
  expect(button("strip")?.disabled).toBe(false);
  expect(button("strip")?.parentElement?.inert).toBe(false);
  button("strip")?.click();
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({
    ack: { alert: "allergy" },
  });
});

test("navigation links and tabs are separate controls; selection and roles come from Lean", () => {
  const { root, painter, dispatch, keyboard } = setup();
  const tab = (index: number, text: string): Part => ({
    role: "tab",
    text,
    target: true,
    comp: "panel",
    kind: "tab",
    col: index,
    ...(index === 1 ? { selected: true } : {}),
  });
  painter.patch(
    screen([]),
    output(
      [
        drawn("nav", [2], 0, { target: false }),
        drawn("group", [2, 0], 3584, { target: false }),
        drawn("orders", [2, 0, 0], 7168),
        drawn("notes", [2, 0, 1], 10752),
        drawn("tabs", [3], 14336, { target: false }),
        drawn("tab0", [3, 0], 17920),
        drawn("tab1", [3, 1], 21504),
        drawn("tab2", [3, 2], 25088),
      ],
      [
        { role: "heading", text: "Navigation", comp: "navigation" },
        { role: "heading", text: "Chart", comp: "Chart" },
        { ...action("goOrders", "nav", "Orders"), selected: true },
        action("goNotes", "nav", "Notes"),
        { role: "wrapper", text: "", comp: "panel", kind: "tabs" },
        tab(0, "Vitals"),
        tab(1, "Labs"),
        tab(2, "Notes"),
      ],
    ),
  );
  const button = (box: string) =>
    root.querySelector<HTMLButtonElement>(`[data-box="${box}"] button`);
  // The wrappers carry text only; every link and tab is its own button.
  expect(button("nav")).toBeNull();
  expect(button("group")).toBeNull();
  expect(button("tabs")).toBeNull();
  expect(root.querySelectorAll("select")).toHaveLength(0);
  expect(
    root.querySelector<HTMLElement>('[data-box="orders"]')?.dataset.selected,
  ).toBe("true");
  button("notes")?.click();
  expect(dispatch).toHaveBeenLastCalledWith({ click: { comp: "goNotes" } });
  expect(button("orders")?.dataset.compId).toBe("goOrders");
  expect(
    ["tab0", "tab1", "tab2"].map((id) => [
      button(id)?.getAttribute("role"),
      button(id)?.getAttribute("aria-selected"),
      button(id)?.dataset.event,
    ]),
  ).toEqual([
    ["tab", "false", "selectTab"],
    ["tab", "true", "selectTab"],
    ["tab", "false", "selectTab"],
  ]);
  button("tab2")?.click();
  expect(dispatch).toHaveBeenLastCalledWith({
    selectTab: { comp: "panel", idx: 2 },
  });
  // Arrow keys move focus through Lean's manual-activation tabs profile.
  keyboard.mockImplementationOnce((_profile, _rows, _cols, state) => ({
    ...state,
    focus: 2,
  }));
  button("tab1")?.focus();
  button("tab1")?.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(keyboard).toHaveBeenLastCalledWith(
    "tabs",
    1,
    3,
    { focus: 1, selected: 1, isOpen: true, invoker: "" },
    "right",
  );
  expect(document.activeElement).toBe(button("tab2"));
  expect(dispatch).toHaveBeenCalledTimes(2);
});

test("a pending confirmation is its own target; the control stays an editor", () => {
  const { root, painter, dispatch } = setup();
  painter.patch(
    screen([]),
    output(
      [
        drawn("l", [3], 0, { target: false }),
        drawn("a", [3, 0], 3584),
        drawn("confirm", [3, 1], 7168, { original: "Confirm" }),
      ],
      [
        label(),
        control(),
        {
          role: "pending",
          text: "Confirm",
          raw: "Confirmation pending",
          target: true,
          comp: "note",
          kind: "confirm",
        },
      ],
    ),
  );
  expect(root.querySelector("textarea")).not.toBeNull();
  const confirm = root.querySelector<HTMLButtonElement>(
    '[data-box="confirm"] button',
  );
  expect(confirm?.dataset.event).toBe("confirm");
  confirm?.click();
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({
    confirm: { comp: "note" },
  });
  // With an explicit confirmation button elsewhere Lean sends plain text.
  painter.patch(
    screen([]),
    output(
      [drawn("confirm", [3, 1], 7168, { target: false })],
      [{ role: "pending", text: "Confirmation pending", comp: "note" }],
    ),
  );
  expect(root.querySelector('[data-box="confirm"] button')).toBeNull();
});

test("text uses scalar cells, tags the banner's runs from Lean's cell counts, and respects paint=false", () => {
  const { root, painter } = setup();
  const d = drawn("a", [0], 0, {
    target: false,
    original: "Ada  MRN: 1",
    lines: ["Ada  MR", "N: 1"],
  });
  const banner: Part = {
    role: "banner",
    text: "Ada  MRN: 1",
    runs: [
      { role: "name", text: "Ada" },
      { role: "separator", text: "  " },
      { role: "identity", text: "MRN: 1" },
    ],
    cells: [3, 2, 6],
  };
  painter.patch(screen([]), output([d], [banner]));
  expect(root.querySelector('[data-box="a"]')?.getAttribute("aria-label")).toBe(
    "Ada  MRN: 1",
  );
  expect(root.querySelector<HTMLElement>('[data-line="0"]')?.style.width).toBe(
    "56px",
  );
  // Runs continue across Lean's line breaks; no text is re-read to find them.
  expect(
    [...root.querySelectorAll<HTMLElement>("[data-glyph]")].map(
      (g) => g.dataset.run,
    ),
  ).toEqual([
    ...Array<string>(3).fill("name"),
    ...Array<string>(2).fill("separator"),
    ...Array<string>(6).fill("identity"),
  ]);
  painter.patch(
    screen([]),
    output(
      [{ ...d, box: { ...d.box, info: { ...d.box.info, paint: false } } }],
      [banner],
    ),
  );
  expect(root.querySelectorAll(".lean-lines")).toHaveLength(0);
});

test("patient-pane controls remain disabled until a patient-scoped dispatch host exists", () => {
  const { root, painter } = setup();
  painter.patch(
    screen([]),
    output(
      [
        drawn("pane", [3], 0, { target: false }),
        drawn("l", [3, 0], 3584, { target: false }),
        drawn("a", [3, 0, 0], 7168),
        drawn("free", [4, 0], 10752),
      ],
      [
        { role: "heading", text: "A", comp: "A", kind: "patientPane" },
        label(),
        control(),
        control({ comp: "other" }),
      ],
    ),
  );
  expect(
    root.querySelector<HTMLTextAreaElement>('[data-box="a"] textarea')?.disabled,
  ).toBe(true);
  expect(
    root.querySelector<HTMLTextAreaElement>('[data-box="free"] textarea')
      ?.disabled,
  ).toBe(false);
});

test("the TypeScript mirror lists Lean's occurrences: parts of a node before its children", () => {
  const tabs: UiNode = {
    tabs: { id: "panel", labels: ["Vitals", "Labs"], selected: 1, body: [field] },
  };
  const coded: UiNode = {
    valueSet: {
      options: [{ code: "2", label: "Urgent" }],
      allowCustom: false,
      children: [
        {
          field: {
            comp: "esi",
            label: "ESI",
            kind: "code",
            value: "2",
            unit: null,
            provenance: "macro",
            pendingConfirm: true,
            humanOnly: false,
            required: false,
          },
        },
      ],
    },
  };
  const table: UiNode = {
    info: {
      comp: "meds",
      label: "Medications",
      infoId: "currentMeds",
      display: "table",
      rows: [
        [
          ["Medication", "Aspirin"],
          ["Status", "active"],
        ],
        [
          ["Medication", "Lisinopril"],
          ["Status", "on hold"],
        ],
      ],
    },
  };
  const s: UiScreen = {
    ...screen([
      tabs,
      coded,
      table,
      {
        button: {
          comp: "sign",
          label: "Sign",
          role: "primary",
          enabled: false,
          blockedReason: null,
          hotkey: "Ctrl+S",
        },
      },
      { stepper: { steps: [["a", "A"]], current: 0 } },
    ]),
    banner: [["Patient", "Synthetic"]],
    viewer: "Registered nurse",
    nav: [["Chart", [["goOrders", "Orders"]]]],
    entryHints: [["note", "Free text"]],
  };
  expect(
    screenOccurrences(s).map((o) => [o.path.join("."), o.role, o.target]),
  ).toEqual([
    ["0", "banner", false],
    ["1", "title", false],
    ["2", "heading", false],
    ["2.0", "heading", false],
    ["2.0.0", "button", true],
    ["3", "wrapper", false],
    ["3.0", "tab", true],
    ["3.1", "tab", true],
    ["3.2", "label", false],
    ["3.2.0", "control", true],
    ["3.2.1", "required", false],
    ["3.2.2", "hint", false],
    ["3.2.3", "human", false],
    ["4", "wrapper", false],
    ["4.0", "label", false],
    ["4.0.0", "control", true],
    ["4.0.1", "source", false],
    ["4.0.2", "pending", true],
    ["5", "heading", false],
    ["5.0", "cellLabel", false],
    ["5.1", "cellLabel", false],
    ["5.2", "cellValue", false],
    ["5.3", "status", false],
    ["5.4", "cellValue", false],
    ["5.5", "status", false],
    ["6", "button", true],
    ["6.0", "reason", false],
    ["6.1", "hotkey", false],
    ["7", "wrapper", false],
    ["7.0", "step", false],
  ]);
  // A field's component is bound to its control, the click point.
  expect(
    screenOccurrences(s)
      .filter((o) => o.ids.length)
      .map((o) => [o.path.join("."), o.ids]),
  ).toEqual([
    ["2.0.0", ["goOrders"]],
    ["3", ["panel"]],
    ["3.2.0", ["note"]],
    ["4.0.0", ["esi"]],
    ["5", ["meds"]],
    ["6", ["sign"]],
  ]);
});
