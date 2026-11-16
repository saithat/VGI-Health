import type { Event } from "../../../lean/generated/ehr-types";
import type { UiScreen } from "../ehr/ui/types";
import { entryEvent } from "../ehr/ui/events";
import { screenSources, type Source } from "./sources";
import {
  keyboardKey,
  type KeyboardState,
  type KeyboardTransition,
  type Drawn,
  type Output,
} from "./layout";
import { paintShape, paintText, px, rgb } from "./text";

type Control =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLButtonElement;
interface Entry {
  element: HTMLDivElement;
  drawn: Drawn;
  source?: Source | undefined;
  control?: Control | undefined;
  controlKind?: string;
  textKey?: string;
  keyboard?: KeyboardState;
}
export interface PainterOptions {
  dispatch(event: Event): void;
  keyboard: KeyboardTransition;
}
/** Layout is already decided. DOM mutation only translates/clips Lean rectangles.
 * Keys use clinical control identity + occurrence, so inserted sibling cards do
 * not replace an editing control. Source paths still bind each current payload. */
export function createPainter(root: HTMLElement, options: PainterOptions) {
  const entries = new Map<string, Entry>();
  const offsets = new Map<string, number>();
  let screenId: string | undefined;
  let modalInvoker: HTMLElement | undefined;
  let modalOpen = false;
  let currentScreen: UiScreen;
  const emit = (event: Event) => options.dispatch(event);
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
  function buildControl(entry: Entry, kind: string): Control | undefined {
    let control: Control | undefined;
    if (kind === "button" || kind === "confirm" || kind === "tabs")
      control = document.createElement("button");
    else if (kind === "select" || kind === "nav")
      control = document.createElement("select");
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
      const n = entry.source?.node;
      if (!n || !("field" in n) || entry.source?.patient) return;
      let raw: string | boolean =
        control instanceof HTMLInputElement && control.type === "checkbox"
          ? control.checked
          : control.value;
      if (n.field.kind === "observation-time" && typeof raw === "string")
        raw = raw ? String(Math.floor(Date.parse(raw) / 60000)) : "";
      const event = entryEvent(n.field, raw);
      if (event) emit(event);
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
      if (control instanceof HTMLSelectElement) {
        if (entry.controlKind === "nav") {
          if (control.value) emit({ click: { comp: control.value } });
        } else sendValue();
      } else if (
        control instanceof HTMLInputElement &&
        control.type === "checkbox"
      )
        sendValue();
    };
    control.onclick = () => {
      const n = entry.source?.node;
      if (!n || entry.source?.patient) return; // Board dispatch needs a patient-scoped host.
      if (entry.controlKind === "confirm" && "field" in n)
        emit({ confirm: { comp: n.field.comp } });
      else if ("button" in n)
        emit(
          n.button.role === "ack"
            ? { ack: { alert: n.button.comp } }
            : n.button.role === "confirm"
              ? { confirm: { comp: n.button.comp } }
              : { click: { comp: n.button.comp } },
        );
      else if ("tabs" in n) {
        const state = entry.keyboard ?? {
          focus: n.tabs.selected,
          selected: n.tabs.selected,
          isOpen: true,
          invoker: "",
        };
        // One native button occupies the sole tab source box. Pointer cycles;
        // arrows + Enter use the manual-activation Lean tabs profile.
        const next = options.keyboard(
          "tabs",
          1,
          n.tabs.labels.length,
          state,
          "right",
        );
        entry.keyboard = options.keyboard(
          "tabs",
          1,
          n.tabs.labels.length,
          next,
          "enter",
        );
        emit({ selectTab: { comp: n.tabs.id, idx: entry.keyboard.selected } });
      }
    };
    control.onkeydown = (event) => {
      const key = keyboardKey(event),
        n = entry.source?.node;
      if (!key || !n) return;
      if (
        "tabs" in n &&
        ["left", "right", "home", "end", "enter", "space"].includes(key)
      ) {
        event.preventDefault();
        const state = entry.keyboard ?? {
          focus: n.tabs.selected,
          selected: n.tabs.selected,
          isOpen: true,
          invoker: "",
        };
        entry.keyboard = options.keyboard(
          "tabs",
          1,
          n.tabs.labels.length,
          state,
          key,
        );
        control.title = `${n.tabs.labels[entry.keyboard.focus] ?? ""} (Enter to activate)`;
        if (key === "enter" || key === "space")
          emit({
            selectTab: { comp: n.tabs.id, idx: entry.keyboard.selected },
          });
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
    // The full source stays visible until editing begins. Native controls own
    // their caret and selection; their assigned rectangle is never subdivided.
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
      if (!(control instanceof HTMLButtonElement))
        entry.element.dataset.editing = "true";
      const current = entry.source?.node;
      if (current && "tabs" in current)
        entry.keyboard = {
          focus: current.tabs.selected,
          selected: current.tabs.selected,
          isOpen: true,
          invoker: "",
        };
    };
    control.onblur = () => {
      delete entry.element.dataset.editing;
    };
    return control;
  }
  function updateControl(
    entry: Entry,
    blocked: boolean,
    explicit: Set<string>,
  ) {
    const source = entry.source,
      node = source?.node;
    const field = node && "field" in node ? node.field : undefined;
    const nav =
      entry.drawn.box.info.source?.join(".") === "2" &&
      currentScreen.nav.some(([, xs]) => xs.length);
    let kind = "";
    if (node && "button" in node) kind = "button";
    else if (node && "tabs" in node && node.tabs.labels.length) kind = "tabs";
    else if (nav) kind = "nav";
    else if (field) {
      const base = field.kind.split(":")[0];
      if (field.pendingConfirm && !explicit.has(field.comp)) kind = "confirm";
      else if (base === "flag") kind = "checkbox";
      else if (["qty", "quantity", "number"].includes(base ?? ""))
        kind = "number";
      else if (
        ["code", "coded"].includes(base ?? "") &&
        !source?.allowOther &&
        (source?.choices.length || field.kind.includes(":"))
      )
        kind = "select";
      else if (base === "observation-time") kind = "datetime-local";
      else if (base === "textarea" || base === "text") kind = "textarea";
      else kind = base === "search" ? "search" : "text";
    }
    if (entry.controlKind !== kind) {
      entry.control?.remove();
      entry.control = buildControl(entry, kind);
      entry.controlKind = kind;
      if (entry.control) entry.element.append(entry.control);
    }
    const control = entry.control;
    if (!control) return;
    control.hidden = !entry.drawn.box.info.paint;
    control.disabled =
      !entry.drawn.box.info.paint ||
      blocked ||
      Boolean(source?.patient) ||
      Boolean(node && "button" in node && !node.button.enabled);
    const original = entry.drawn.original ?? "";
    control.setAttribute(
      "aria-label",
      kind === "confirm" && field
        ? `Confirm ${field.label}. ${original}`
        : original,
    );
    control.title =
      node && "button" in node
        ? (node.button.blockedReason ?? original)
        : original;
    control.dataset.compId =
      field?.comp ??
      (node && "button" in node
        ? node.button.comp
        : node && "tabs" in node
          ? node.tabs.id
          : "");
    control.dataset.event = field
      ? kind === "confirm"
        ? "confirm"
        : "enter"
      : node && "button" in node
        ? node.button.role === "ack"
          ? "ack"
          : node.button.role === "confirm"
            ? "confirm"
            : "click"
        : kind === "tabs"
          ? "selectTab"
          : "click";
    if (field) {
      control.setAttribute("aria-required", String(field.required));
      if (control instanceof HTMLInputElement && control.type === "checkbox")
        control.checked = field.value === "true";
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement
      ) {
        let value = field.value ?? "";
        if (field.kind === "observation-time" && value) {
          const date = new Date(Number(value) * 60000);
          value = Number.isFinite(date.getTime())
            ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            : "";
        }
        if (document.activeElement !== control && control.value !== value)
          control.value = value;
      }
    }
    if (control instanceof HTMLSelectElement) {
      const pairs: [string, string][] =
        kind === "nav"
          ? [
              ["", "Choose clinical screen"],
              ...currentScreen.nav.flatMap(([, xs]) => xs),
            ]
          : [
              ["", "Choose value"],
              ...(source?.choices.length
                ? source.choices
                : (field?.kind
                    .split(":")
                    .slice(1)
                    .join(":")
                    .split("|")
                    .filter(Boolean)
                    .map((s) => [s, s] satisfies [string, string]) ?? [])),
            ];
      if (field?.value && !pairs.some(([id]) => id === field.value))
        pairs.push([field.value, field.value]);
      const key = JSON.stringify(pairs);
      if (control.dataset.options !== key) {
        control.replaceChildren(
          ...pairs.map(([value, label]) => new Option(label, value)),
        );
        control.dataset.options = key;
      }
      control.value = field?.value ?? "";
    }
  }
  const dialogKeys = (event: KeyboardEvent) => {
    if (!modalOpen || event.key !== "Tab") return;
    const controls = [...entries.values()]
      .filter(
        (e) =>
          e.drawn.box.info.interruptive && e.control && !e.control.disabled,
      )
      .flatMap((e) => (e.control ? [e.control] : []));
    if (!controls.length) {
      event.preventDefault();
      return;
    }
    const state = {
      focus: Math.max(
        0,
        controls.findIndex((c) => c === document.activeElement),
      ),
      selected: 0,
      isOpen: true,
      invoker: modalInvoker?.id ?? "",
    };
    const next = options.keyboard(
      "dialog",
      1,
      controls.length,
      state,
      event.shiftKey ? "shiftTab" : "tab",
    );
    event.preventDefault();
    controls[next.focus]?.focus({ preventScroll: true });
    // Clinical interruptive alerts have no dismiss Event. Escape must not
    // apply Keyboard.dialog's close transition without Lean authorization.
  };
  root.addEventListener("keydown", dialogKeys);
  return {
    patch(screen: UiScreen, output: Output) {
      if (!output.accepted) throw new Error("Lean refused the layout");
      currentScreen = screen;
      const changed = screenId !== screen.screen;
      if (changed) {
        offsets.clear();
        screenId = screen.screen;
      }
      const sources = screenSources(screen);
      const explicit = new Set(
        [...sources.values()].flatMap((s) =>
          "button" in s.node && s.node.button.role === "confirm"
            ? [s.node.button.comp]
            : [],
        ),
      );
      const modal = output.boxes.some((d) => d.box.info.interruptive);
      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined;
      if (modal && !modalOpen) modalInvoker = active;
      const retained = new Set<string>(),
        counts = new Map<string, number>();
      let cursor: ChildNode | null = root.firstChild;
      for (const drawn of output.boxes) {
        const source = drawn.box.info.source
          ? sources.get(drawn.box.info.source.join("."))
          : undefined;
        const node = source?.node;
        const identity =
          node && "field" in node
            ? `field:${node.field.comp}`
            : node && "button" in node
              ? `button:${node.button.comp}:${node.button.role}`
              : node && "tabs" in node
                ? `tabs:${node.tabs.id}`
                : (drawn.box.info.source?.join(".") ??
                  `box:${drawn.box.info.id}`);
        const occurrence = counts.get(identity) ?? 0;
        counts.set(identity, occurrence + 1);
        const key = `${screen.screen ?? screen.title}:${identity}:${occurrence}`;
        retained.add(key);
        let entry = entries.get(key);
        if (!entry) {
          const element = document.createElement("div");
          entry = { element, drawn, source };
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
        entry.source = source;
        const { element } = entry;
        element.dataset.box = drawn.box.info.id;
        element.id = `lean-box-${drawn.box.info.id}`;
        if (drawn.box.info.source)
          element.dataset.source = drawn.box.info.source.join(".");
        else delete element.dataset.source;
        element.setAttribute("aria-label", drawn.original ?? drawn.box.info.id);
        const role =
          drawn.box.info.role ||
          (drawn.box.info.banner
            ? "banner"
            : node && "alert" in node
              ? "alert"
              : drawn.box.info.interruptive && !drawn.box.info.target
                ? "dialog"
                : "");
        if (role) element.setAttribute("role", role);
        else element.removeAttribute("role");
        if (role === "dialog") {
          element.setAttribute("aria-modal", "true");
          element.tabIndex = -1;
        }
        element.inert = modal && !drawn.box.info.interruptive;
        place(entry);
        const textKey = JSON.stringify([
          drawn.lines,
          drawn.glyphWidths,
          drawn.box.info.paint,
          drawn.box.style,
          drawn.box.info.text,
          drawn.box.info.mark,
        ]);
        if (entry.textKey !== textKey) {
          const previous = element.querySelector<HTMLElement>(".lean-lines");
          const scroll = previous?.scrollTop ?? 0;
          previous?.remove();
          element.querySelector("svg")?.remove();
          if (drawn.box.info.paint) {
            const shape = paintShape(drawn);
            if (shape) element.append(shape);
            if (drawn.lines.length) {
              const lines = paintText(drawn);
              element.append(lines);
              lines.scrollTop = scroll;
            }
          }
          entry.textKey = textKey;
        }
        updateControl(entry, modal && !drawn.box.info.interruptive, explicit);
        element.dataset.interactive = String(Boolean(entry.control));
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
      }
      for (const [key, entry] of entries)
        if (!retained.has(key)) {
          entry.element.remove();
          entries.delete(key);
        }
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
      if (modal && !modalOpen) {
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
              .filter((e) => e !== entry && e.drawn.box.info.interruptive)
              .map((e) => e.element.id)
              .join(" "),
          );
      }
      modalOpen = modal;
    },
    destroy() {
      root.removeEventListener("keydown", dialogKeys);
      root.replaceChildren();
      entries.clear();
      offsets.clear();
    },
  };
}
