import type { Event } from "../../../lean/generated/ehr-types";
import type { NodeOf, UiScreen } from "../ehr/ui/types";
import { entryEvent } from "../ehr/ui/events";
import {
  keyboardKey,
  type KeyboardTransition,
  type Drawn,
  type Output,
  type Part,
} from "./layout";
import { paintShape, paintText, px, rgb } from "./text";
import { connectGrids, pagerEvent } from "./grid";

type Control =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLButtonElement;
interface Entry {
  element: HTMLDivElement;
  drawn: Drawn;
  /** Lean's display part of this box: role, state and control data. */
  part?: Part | undefined;
  /** The enclosing Lean patient pane, never an ambient selected patient. */
  patient?: string | undefined;
  control?: Control | undefined;
  controlKind?: string;
  textKey?: string;
}
export interface PainterOptions {
  dispatch(event: Event): void;
  dispatchPatient?(patient: string, event: Event): void;
  keyboard: KeyboardTransition;
}
const sourceKey = (drawn: Drawn) => drawn.box.info.source?.join(".");
const parentKey = (drawn: Drawn) =>
  drawn.box.info.source?.slice(0, -1).join(".");
/** The native control of a part, decided by Lean's role and kind alone. */
function nativeKind(part: Part | undefined): string {
  if (!part?.target) return "";
  if (part.role === "control")
    return part.kind === "datetime" ? "datetime-local" : (part.kind ?? "text");
  // A paged list's page selector is a select over Lean's page options.
  if (part.role === "pager" && part.kind === "page") return "select";
  return "button";
}
/** Layout is already decided, and so is every text: each box draws the part
 * Lean assigned to it. DOM mutation only translates and clips Lean rectangles.
 * Keys use clinical control identity + occurrence, so inserted sibling parts
 * do not replace an editing control. */
export function createPainter(root: HTMLElement, options: PainterOptions) {
  const entries = new Map<string, Entry>();
  const offsets = new Map<string, number>();
  let screenId: string | undefined;
  let modalInvoker: HTMLElement | undefined;
  let modalOpen = false;
  let modalToken = "";
  const emit = (entry: Entry, event: Event) => {
    if (entry.control?.disabled || entry.element.inert) return;
    if (entry.patient !== undefined)
      options.dispatchPatient?.(entry.patient, event);
    else options.dispatch(event);
  };
  root.style.position = "relative";
  function place(entry: Entry) {
    const { box } = entry.drawn,
      { rect, style, info } = box;
    const displacement = box.clips.reduce(
      (sum, [id]) => sum + (offsets.get(id) ?? 0),
      0,
    );
    const y = rect.y / 64 - displacement;
    let left = 0,
      top = 0,
      right = 0,
      bottom = 0;
    box.clips.forEach(([, clip], i) => {
      const outer = box.clips
        .slice(i + 1)
        .reduce((sum, [id]) => sum + (offsets.get(id) ?? 0), 0);
      left = Math.max(left, (clip.x - rect.x) / 64);
      right = Math.max(right, (rect.x + rect.w - clip.x - clip.w) / 64);
      top = Math.max(top, clip.y / 64 - outer - y);
      bottom = Math.max(
        bottom,
        y + rect.h / 64 - (clip.y + clip.h) / 64 + outer,
      );
    });
    Object.assign(entry.element.style, {
      position: "absolute",
      left: px(rect.x),
      top: `${y}px`,
      width: px(rect.w),
      height: px(rect.h),
      zIndex: String(style.z),
      boxSizing: "border-box",
      padding: "0",
      margin: "0",
      border: "0",
      borderRadius: px(style.radius),
      background: info.paint ? rgb(style.bg) : "transparent",
      color: rgb(style.fg),
      overflowX: box.scroll ? "hidden" : "visible",
      overflowY: box.scroll ? "auto" : "visible",
      clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px)`,
      pointerEvents: info.paint || box.scroll ? "auto" : "none",
    });
  }
  /** The parts of the same node: the boxes with the same parent path. */
  const siblings = (entry: Entry) => {
    const parent = parentKey(entry.drawn);
    return [...entries.values()].filter(
      (e) => e !== entry && parentKey(e.drawn) === parent,
    );
  };
  function buildControl(entry: Entry, kind: string): Control | undefined {
    let control: Control | undefined;
    if (kind === "button") control = document.createElement("button");
    else if (kind === "select") control = document.createElement("select");
    else if (kind === "textarea") control = document.createElement("textarea");
    else if (kind) {
      const input = document.createElement("input");
      input.type = kind;
      if (kind === "number") {
        input.step = "0.1";
        input.min = "0";
      }
      control = input;
    }
    if (!control) return;
    control.className = "lean-control";
    if (control instanceof HTMLButtonElement) control.type = "button";
    const sendValue = () => {
      const part = entry.part;
      if (part?.role !== "control") return;
      let raw: string | boolean =
        control instanceof HTMLInputElement && control.type === "checkbox"
          ? control.checked
          : control.value;
      if (part.kind === "datetime" && typeof raw === "string")
        raw = raw ? String(Math.floor(Date.parse(raw) / 60000)) : "";
      // Lean supplies the component, value kind and unit of the entry.
      const field: Pick<NodeOf<"field">, "comp" | "kind" | "unit"> = {
        comp: part.comp ?? "",
        kind: part.entry ?? "text",
        unit: part.unit ?? null,
      };
      const event = entryEvent(field, raw);
      if (event) emit(entry, event);
    };
    control.oninput = (event) => {
      if (
        !(control instanceof HTMLSelectElement) &&
        !(control instanceof HTMLInputElement && control.type === "checkbox") &&
        (!(event instanceof InputEvent) || !event.isComposing)
      )
        sendValue();
    };
    control.addEventListener("compositionend", sendValue);
    control.onchange = () => {
      if (
        control instanceof HTMLSelectElement &&
        entry.part?.role === "pager"
      ) {
        const event = pagerEvent(entry.part, control.value);
        if (event) emit(entry, event);
      } else if (control instanceof HTMLSelectElement) sendValue();
      else if (
        control instanceof HTMLInputElement &&
        control.type === "checkbox"
      )
        sendValue();
    };
    control.onclick = () => {
      const part = entry.part;
      if (!part) return;
      const comp = part.comp ?? "";
      if (part.role === "pager") {
        // The pager's targets select their page of the list (selectTab).
        const event =
          control instanceof HTMLSelectElement ? undefined : pagerEvent(part);
        if (event) emit(entry, event);
      } else if (part.role === "pending") emit(entry, { confirm: { comp } });
      else if (part.role === "tab")
        // Each tab is its own Lean target box; Lean gives its index.
        emit(entry, { selectTab: { comp, idx: part.col ?? 0 } });
      else if (part.role === "button")
        emit(
          entry,
          part.kind === "ack"
            ? { ack: { alert: comp } }
            : part.kind === "confirm"
              ? { confirm: { comp } }
              : { click: { comp } },
        );
    };
    control.onkeydown = (event) => {
      const key = keyboardKey(event),
        part = entry.part;
      if (!key || !part) return;
      if (
        part.role === "tab" &&
        ["left", "right", "home", "end"].includes(key)
      ) {
        // Manual activation: arrows move focus among the sibling tab boxes
        // through the Lean tabs profile; Enter/Space click the focused tab.
        event.preventDefault();
        const tabs = [entry, ...siblings(entry)].filter(
          (e) => e.part?.role === "tab" && e.part.comp === part.comp,
        );
        const next = options.keyboard(
          "tabs",
          1,
          tabs.length,
          {
            focus: part.col ?? 0,
            selected: tabs.find((e) => e.part?.selected)?.part?.col ?? 0,
            isOpen: true,
            invoker: "",
          },
          key,
        );
        tabs
          .find((e) => e.part?.col === next.focus)
          ?.control?.focus({ preventScroll: true });
      } else if (
        control instanceof HTMLSelectElement &&
        ["up", "down", "home", "end"].includes(key) &&
        control.options.length
      ) {
        event.preventDefault();
        const state = {
          focus: Math.max(0, control.selectedIndex),
          selected: Math.max(0, control.selectedIndex),
          isOpen: true,
          invoker: "",
        };
        const next = options.keyboard(
          "listbox",
          1,
          control.options.length,
          state,
          key,
        );
        control.selectedIndex = next.selected;
        control.dispatchEvent(new window.Event("change", { bubbles: true }));
      }
    };
    // The displayed value stays Lean's text until editing begins. Native
    // controls own their caret and selection; their assigned rectangle is
    // never subdivided.
    control.onfocus = () => {
      for (const [id, clip] of entry.drawn.box.clips) {
        const scroll = [...entries.values()].find(
          (e) => e.drawn.box.info.id === id,
        );
        if (!scroll) continue;
        const rect = entry.drawn.box.rect,
          offset = scroll.element.scrollTop;
        const top = (rect.y - clip.y) / 64,
          bottom = (rect.y + rect.h - clip.y - clip.h) / 64;
        if (top < offset) scroll.element.scrollTop = top;
        else if (bottom > offset) scroll.element.scrollTop = bottom;
      }
      if (
        !(control instanceof HTMLButtonElement) &&
        !(control instanceof HTMLSelectElement) &&
        !(control instanceof HTMLInputElement && control.type === "checkbox")
      )
        entry.element.dataset.editing = "true";
    };
    control.onblur = () => {
      delete entry.element.dataset.editing;
    };
    return control;
  }
  function updateControl(entry: Entry, blocked: boolean) {
    const part = entry.part;
    const kind = nativeKind(part);
    if (entry.controlKind !== kind) {
      entry.control?.remove();
      entry.control = buildControl(entry, kind);
      entry.controlKind = kind;
      if (entry.control) entry.element.append(entry.control);
    }
    const control = entry.control;
    if (!control || !part) return;
    control.hidden = !entry.drawn.box.info.paint;
    control.disabled =
      !entry.drawn.box.info.paint ||
      blocked ||
      (entry.patient !== undefined &&
        (!entry.patient || !options.dispatchPatient)) ||
      part.enabled === false;
    control.dataset.compId = part.comp ?? "";
    control.dataset.event =
      part.role === "control"
        ? "enter"
        : part.role === "tab" || part.role === "pager"
          ? "selectTab"
          : part.role === "pending" || part.kind === "confirm"
            ? "confirm"
            : part.kind === "ack"
              ? "ack"
              : "click";
    // Accessible names are relationships between Lean's own parts: a control
    // is labelled by its field's label box and described by the field's other
    // parts; a button is named by its own text and described by its parts.
    const name = entry.drawn.original ?? "";
    if (part.role === "control") {
      const parent = [...entries.values()].find(
        (e) => sourceKey(e.drawn) === parentKey(entry.drawn),
      );
      if (parent) control.setAttribute("aria-labelledby", parent.element.id);
      else control.setAttribute("aria-label", name);
      const described = siblings(entry).map((e) => e.element.id);
      if (described.length)
        control.setAttribute("aria-describedby", described.join(" "));
      else control.removeAttribute("aria-describedby");
      control.setAttribute(
        "aria-required",
        String(siblings(entry).some((e) => e.part?.role === "required")),
      );
    } else {
      control.setAttribute("aria-label", name);
      const described = [...entries.values()]
        .filter((e) => parentKey(e.drawn) === sourceKey(entry.drawn))
        .filter((e) => e.part?.role === "reason" || e.part?.role === "hotkey")
        .map((e) => e.element.id);
      if (described.length)
        control.setAttribute("aria-describedby", described.join(" "));
      else control.removeAttribute("aria-describedby");
    }
    control.title = name;
    if (part.role === "tab") {
      control.setAttribute("role", "tab");
      control.setAttribute("aria-selected", String(part.selected ?? false));
      control.dataset.tabIndex = String(part.col ?? 0);
    } else {
      control.removeAttribute("role");
      control.removeAttribute("aria-selected");
      delete control.dataset.tabIndex;
    }
    if (part.role === "pager" && control instanceof HTMLSelectElement) {
      // Lean names every page; the selected one is the page shown.
      const key = JSON.stringify(part.options ?? []);
      if (control.dataset.options !== key) {
        control.replaceChildren(
          ...(part.options ?? []).map(
            ([value, label]) => new Option(label, value),
          ),
        );
        control.dataset.options = key;
      }
      control.value = String(part.col ?? 0);
      return;
    }
    if (part.role !== "control") return;
    const raw = part.raw ?? part.text;
    if (control instanceof HTMLInputElement && control.type === "checkbox")
      control.checked = part.selected ?? false;
    else if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement
    ) {
      let value = raw;
      if (part.kind === "datetime" && value) {
        // The native editor works in the browser's wall time; the stored
        // value stays the epoch minute Lean recorded.
        const date = new Date(Number(value) * 60000);
        value = Number.isFinite(date.getTime())
          ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
          : "";
      }
      if (document.activeElement !== control && control.value !== value)
        control.value = value;
      control.placeholder = part.placeholder ?? "";
    } else if (control instanceof HTMLSelectElement) {
      // Options and the empty choice's caption are Lean's data.
      const pairs: [string, string][] = [
        ["", part.placeholder ?? ""],
        ...(part.options ?? []),
      ];
      const key = JSON.stringify(pairs);
      if (control.dataset.options !== key) {
        control.replaceChildren(
          ...pairs.map(([value, label]) => new Option(label, value)),
        );
        control.dataset.options = key;
      }
      control.value = raw;
    }
  }
  const dialogKeys = (event: KeyboardEvent) => {
    if (!modalOpen || (event.key !== "Tab" && event.key !== "Escape")) return;
    const controls = [...entries.values()]
      .filter(
        (e) =>
          e.drawn.box.info.interruptive && e.control && !e.control.disabled,
      )
      .flatMap((e) => (e.control ? [e.control] : []));
    const state = {
      focus: Math.max(
        0,
        controls.findIndex((c) => c === document.activeElement),
      ),
      selected: 0,
      isOpen: true,
      invoker: modalInvoker?.id ?? "",
    };
    // Interruptive boxes are clinical alerts: Lean's alert-dialog profile
    // traps Tab and ignores Escape (Keyboard.alertDialog_stays_open). There
    // is no dismiss Event, so Escape is swallowed whatever the host would do.
    if (event.key === "Escape") {
      options.keyboard(
        "alert-dialog",
        1,
        Math.max(1, controls.length),
        state,
        "escape",
      );
      event.preventDefault();
      return;
    }
    if (!controls.length) {
      event.preventDefault();
      return;
    }
    const next = options.keyboard(
      "alert-dialog",
      1,
      controls.length,
      state,
      event.shiftKey ? "shiftTab" : "tab",
    );
    event.preventDefault();
    controls[next.focus]?.focus({ preventScroll: true });
  };
  const hotkeys = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat || event.isComposing) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    )
      return;
    const matches = (text: string) => {
      const keys = text
        .toLowerCase()
        .split("+")
        .map((s) => s.trim());
      return (
        keys.at(-1) === event.key.toLowerCase() &&
        event.ctrlKey === keys.some((k) => k === "ctrl" || k === "control") &&
        event.metaKey === keys.some((k) => k === "meta" || k === "cmd") &&
        event.altKey === keys.includes("alt") &&
        event.shiftKey === keys.includes("shift")
      );
    };
    const focusedPatient =
      active instanceof HTMLElement
        ? active.closest<HTMLElement>("[data-patient]")?.dataset.patient
        : undefined;
    const candidates = [...entries.values()].filter(
      (e) =>
        e.part?.role === "button" &&
        e.control?.isConnected &&
        !e.control.disabled &&
        (!focusedPatient || focusedPatient === e.patient) &&
        [...entries.values()].some(
          (k) =>
            k.part?.role === "hotkey" &&
            parentKey(k.drawn) === sourceKey(e.drawn) &&
            matches(k.part.text),
        ),
    );
    // Repeated commands in two panes require a focused patient namespace.
    if (candidates.length !== 1) return;
    event.preventDefault();
    candidates[0]?.control?.click();
  };
  /** Relates every tabs node to its tabs and visible panel (APG tabs). The
   * boxes stay flat and positioned by Lean; the tabs wrapper box holds two
   * accessibility-only children without geometry or text: a `tablist` that
   * owns the tab buttons and a `tabpanel` labelled by the selected tab that
   * owns the boxes of the shown body. A box belongs to its innermost tabs
   * node. Only the selected tab is in the Tab order and controls the panel.
   * Returns the elements now owned, so a dialog does not claim them twice. */
  function relateTabs(): Set<HTMLElement> {
    const owned = new Set<HTMLElement>();
    const wrappers = [...entries.values()].filter(
      (e) =>
        e.part?.role === "wrapper" &&
        e.part.kind === "tabs" &&
        sourceKey(e.drawn) !== undefined,
    );
    const lists = new Map<Entry, Entry[]>(),
      bodies = new Map<Entry, HTMLElement[]>();
    for (const wrapper of wrappers) {
      lists.set(wrapper, []);
      bodies.set(wrapper, []);
    }
    for (const entry of entries.values()) {
      const path = sourceKey(entry.drawn);
      if (path === undefined) continue;
      let owner: Entry | undefined,
        length = -1;
      for (const wrapper of wrappers) {
        const prefix = `${sourceKey(wrapper.drawn)}.`;
        if (path.startsWith(prefix) && prefix.length > length) {
          owner = wrapper;
          length = prefix.length;
        }
      }
      if (!owner) continue;
      if (
        entry.part?.role === "tab" &&
        parentKey(entry.drawn) === sourceKey(owner.drawn)
      )
        lists.get(owner)?.push(entry);
      else bodies.get(owner)?.push(entry.element);
    }
    for (const wrapper of wrappers) {
      const tabs = lists.get(wrapper) ?? [];
      const body = bodies.get(wrapper) ?? [];
      let list = wrapper.element.querySelector<HTMLElement>(
          ":scope > .lean-tablist",
        ),
        panel = wrapper.element.querySelector<HTMLElement>(
          ":scope > .lean-tabpanel",
        );
      if (!list) {
        list = document.createElement("div");
        list.className = "lean-tablist";
        list.setAttribute("role", "tablist");
        wrapper.element.append(list);
      }
      if (!panel) {
        panel = document.createElement("div");
        panel.className = "lean-tabpanel";
        panel.setAttribute("role", "tabpanel");
        wrapper.element.append(panel);
      }
      wrapper.element.setAttribute("role", "none");
      wrapper.element.removeAttribute("aria-label");
      list.id = `${wrapper.element.id}-tablist`;
      panel.id = `${wrapper.element.id}-panel`;
      const selected = tabs.find((t) => t.part?.selected);
      for (const tab of tabs) {
        const control = tab.control;
        if (!control) continue;
        control.id = `${tab.element.id}-tab`;
        owned.add(tab.element);
        if (tab === selected) control.setAttribute("aria-controls", panel.id);
        else control.removeAttribute("aria-controls");
        control.tabIndex = tab === (selected ?? tabs[0]) ? 0 : -1;
      }
      list.setAttribute(
        "aria-owns",
        tabs.flatMap((t) => (t.control ? [t.control.id] : [])).join(" "),
      );
      if (selected?.control)
        panel.setAttribute("aria-labelledby", selected.control.id);
      else panel.removeAttribute("aria-labelledby");
      panel.setAttribute("aria-owns", body.map((e) => e.id).join(" "));
      for (const element of body) owned.add(element);
    }
    return owned;
  }
  root.addEventListener("keydown", dialogKeys);
  document.addEventListener("keydown", hotkeys);
  return {
    patch(screen: UiScreen, output: Output) {
      if (!output.accepted) throw new Error("Lean refused the layout");
      const changed = screenId !== screen.screen;
      if (changed) {
        offsets.clear();
        screenId = screen.screen;
      }
      const parts = output.parts ?? [];
      // Occurrences under a patient pane's caption belong to that pane.
      const panes = output.boxes.flatMap((d, i) =>
        parts[i]?.kind === "patientPane" && d.box.info.source
          ? [
              {
                prefix: `${d.box.info.source.join(".")}.`,
                patient: parts[i]?.comp ?? "",
              },
            ]
          : [],
      );
      const modal = output.boxes.some((d) => d.box.info.interruptive);
      const ownerPath = output.boxes
        .find((d) => d.box.info.interruptive)
        ?.box.info.source?.join(".");
      const modalPatient =
        ownerPath === undefined
          ? undefined
          : panes.find((p) => ownerPath.startsWith(p.prefix))?.patient;
      const blockedByModal = (entry: Entry) =>
        modal &&
        ((modalPatient !== undefined && entry.patient !== modalPatient) ||
          (!entry.drawn.box.info.interruptive && !entry.drawn.box.info.urgent));
      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined;
      const token = modal ? `${modalPatient ?? ""}:${ownerPath ?? ""}` : "";
      const modalChanged = modal && token !== modalToken;
      if (modalChanged && !modalOpen) modalInvoker = active;
      const retained = new Set<string>(),
        counts = new Map<string, number>();
      const fresh: Entry[] = [];
      let cursor: ChildNode | null = root.firstChild;
      let dialogAssigned = false;
      output.boxes.forEach((drawn, index) => {
        const part = parts[index] ?? undefined;
        const path = sourceKey(drawn);
        const patient =
          path === undefined
            ? ""
            : (panes.find((p) => path.startsWith(p.prefix))?.patient ?? "");
        const identity =
          part?.target && part.comp !== undefined
            ? `${patient}:${part.role}:${part.comp}:${part.kind ?? ""}:${part.role === "tab" ? (part.col ?? 0) : ""}`
            : (path ?? `box:${drawn.box.info.id}`);
        const occurrence = counts.get(identity) ?? 0;
        counts.set(identity, occurrence + 1);
        const key = `${screen.screen ?? screen.title}:${identity}:${occurrence}`;
        retained.add(key);
        let entry = entries.get(key);
        if (!entry) {
          const element = document.createElement("div");
          entry = { element, drawn, part };
          entries.set(key, entry);
          const current = entry;
          element.onscroll = () => {
            if (!current.drawn.box.scroll) return;
            offsets.set(current.drawn.box.info.id, element.scrollTop);
            entries.forEach(place);
          };
          element.onwheel = (event) => {
            if (event.ctrlKey || !current.drawn.box.clips.length) return;
            // Native text overflow consumes its wheel before the outer scroller.
            const lines = element.querySelector<HTMLElement>(".lean-lines");
            if (
              lines &&
              lines.scrollHeight > lines.clientHeight &&
              ((event.deltaY > 0 &&
                lines.scrollTop + lines.clientHeight < lines.scrollHeight) ||
                (event.deltaY < 0 && lines.scrollTop > 0))
            )
              return;
            const id = current.drawn.box.clips[0]?.[0];
            const scroll = [...entries.values()].find(
              (e) => e.drawn.box.info.id === id,
            );
            if (scroll) {
              scroll.element.scrollTop += event.deltaY;
              event.preventDefault();
            }
          };
        }
        entry.drawn = drawn;
        entry.part = part;
        entry.patient =
          path === undefined
            ? undefined
            : panes.find((p) => path.startsWith(p.prefix))?.patient;
        if (entry.patient) entry.element.dataset.patient = entry.patient;
        else delete entry.element.dataset.patient;
        fresh.push(entry);
        const { element } = entry;
        element.dataset.box = drawn.box.info.id;
        element.id = `lean-box-${drawn.box.info.id}`;
        if (path !== undefined) element.dataset.source = path;
        else delete element.dataset.source;
        // Role and state are Lean's; they select presentation, never text.
        const state: Record<string, string | undefined> = {
          role: part?.role,
          kind: part?.kind,
          tone: part?.tone,
          selected: part?.selected ? "true" : undefined,
          disabled: part?.enabled === false ? "true" : undefined,
          row: part?.row === undefined ? undefined : String(part.row),
          col: part?.col === undefined ? undefined : String(part.col),
        };
        for (const [name, value] of Object.entries(state))
          if (value === undefined || value === "") delete element.dataset[name];
          else element.dataset[name] = value;
        element.setAttribute("aria-label", drawn.original ?? drawn.box.info.id);
        if (part?.raw !== undefined && part.raw !== part.text)
          element.title = part.raw;
        else element.removeAttribute("title");
        const role =
          drawn.box.info.role ||
          (drawn.box.info.banner
            ? "banner"
            : part?.role === "alert"
              ? "alert"
              : drawn.box.info.interruptive &&
                  !drawn.box.info.target &&
                  !dialogAssigned
                ? "dialog"
                : "");
        if (role) element.setAttribute("role", role);
        else element.removeAttribute("role");
        if (part?.role === "step" && part.selected)
          element.setAttribute("aria-current", "step");
        else element.removeAttribute("aria-current");
        if (role === "dialog") {
          dialogAssigned = true;
          element.setAttribute("aria-modal", "true");
          element.tabIndex = -1;
        }
        // The pinned urgent strip stays operable beside a modal
        // (Lean: stripDispatchable, strip_dispatches).
        const blocked = blockedByModal(entry);
        element.inert = blocked;
        place(entry);
        const textKey = JSON.stringify([
          drawn.lines,
          drawn.glyphWidths,
          drawn.box.info.paint,
          drawn.box.style,
          drawn.box.info.text,
          drawn.box.info.mark,
          part?.runs,
          part?.cells,
        ]);
        if (entry.textKey !== textKey) {
          const previous = element.querySelector<HTMLElement>(".lean-lines");
          const scroll = previous?.scrollTop ?? 0;
          previous?.remove();
          element.querySelector("svg")?.remove();
          if (drawn.box.info.paint) {
            const shape = paintShape(drawn);
            if (shape) element.append(shape);
            if (drawn.lines.some((line) => line.length > 0)) {
              const lines = paintText(drawn, part);
              // New specification for owner review: Lean reserves the alert icon width.
              const inset = drawn.box.info.text?.inset ?? 0;
              lines.style.left = px(inset);
              lines.style.width = px(drawn.box.rect.w - inset);
              element.append(lines);
              lines.scrollTop = scroll;
            }
          }
          entry.textKey = textKey;
        }
        if (drawn.box.scroll) {
          let spacer = element.querySelector<HTMLElement>(".lean-spacer");
          if (!spacer) {
            spacer = document.createElement("div");
            spacer.className = "lean-spacer";
            element.append(spacer);
          }
          const height = Math.max(
            drawn.box.rect.h,
            ...output.boxes
              .filter((d) => d.box.clips[0]?.[0] === drawn.box.info.id)
              .map((d) => d.box.rect.y + d.box.rect.h - drawn.box.rect.y),
          );
          Object.assign(spacer.style, {
            position: "absolute",
            left: "0",
            top: "0",
            width: "1px",
            height: px(height),
            pointerEvents: "none",
          });
          if (changed) element.scrollTop = 0;
        }
        if (element !== cursor) root.insertBefore(element, cursor);
        else cursor = cursor?.nextSibling ?? null;
      });
      for (const [key, entry] of entries)
        if (!retained.has(key)) {
          entry.element.remove();
          entries.delete(key);
        }
      // Controls refer to the boxes of their sibling parts, so they are
      // updated once every box of this paint exists.
      for (const entry of fresh) {
        updateControl(entry, blockedByModal(entry));
        entry.element.dataset.interactive = String(Boolean(entry.control));
      }
      const owned = relateTabs();
      // Tables are grids: Lean's cell rows and columns, its grid keyboard
      // profile and each record's single navigation action.
      const byElement = new Map<HTMLElement, Entry>(
        [...entries.values()].map((e) => [e.element, e]),
      );
      connectGrids(
        [...entries.values()].map((e) => ({
          element: e.element,
          part: e.part,
          source: sourceKey(e.drawn),
        })),
        (box, event) => {
          const target = byElement.get(box.element);
          if (target) emit(target, event);
        },
        options.keyboard,
        (box) => box.element.inert,
      );
      Object.assign(root.style, {
        width: px(output.viewport.w),
        height: px(output.viewport.h),
      });
      root.dataset.accepted = "true";
      root.dataset.screen = screen.screen ?? "";
      if (
        active?.isConnected &&
        document.activeElement !== active &&
        !active.closest("[inert]")
      )
        active.focus({ preventScroll: true });
      if (modalChanged) {
        const focus = [...entries.values()].find(
          (e) =>
            e.drawn.box.info.interruptive && e.control && !e.control.disabled,
        );
        (
          focus?.control ??
          [...entries.values()].find(
            (e) => e.element.getAttribute("role") === "dialog",
          )?.element
        )?.focus({ preventScroll: true });
      } else if (!modal && modalOpen && modalInvoker?.isConnected)
        modalInvoker.focus({ preventScroll: true });
      for (const entry of entries.values()) {
        if (entry.element.getAttribute("role") === "dialog")
          entry.element.setAttribute(
            "aria-owns",
            [...entries.values()]
              .filter(
                (e) =>
                  e !== entry &&
                  e.drawn.box.info.interruptive &&
                  !owned.has(e.element),
              )
              .map((e) => e.element.id)
              .join(" "),
          );
      }
      // New specification for owner review: a retained scroller may be reset
      // or clamped when its content or modal state changes. Translate from
      // its actual browser offset even when no scroll event was delivered.
      let moved = false;
      for (const entry of entries.values()) {
        if (!entry.drawn.box.scroll) continue;
        const id = entry.drawn.box.info.id;
        const offset = entry.element.scrollTop;
        if ((offsets.get(id) ?? 0) !== offset) {
          offsets.set(id, offset);
          moved = true;
        }
      }
      if (moved) entries.forEach(place);
      modalOpen = modal;
      modalToken = token;
    },
    destroy() {
      root.removeEventListener("keydown", dialogKeys);
      document.removeEventListener("keydown", hotkeys);
      root.replaceChildren();
      entries.clear();
      offsets.clear();
    },
  };
}
