import { createElement, Fragment, type ReactNode, type SyntheticEvent } from "react";
import { UnitKindValues, type Event, type Value } from "../../../lean/generated/ehr-types";
import { allowedAttribute, classes, tags, type Html } from "./html";

const tagSet = new Set<string>(tags);
const classSet = new Set<string>(classes);
function report(message: string) {
  if (import.meta.env.DEV) console.warn(`EHR painter dropped ${message}`);
}
function valueOf(attrs: Record<string, string>, target: EventTarget): Value | undefined {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return undefined;
  const value = target.value;
  switch (attrs["data-value-kind"]) {
    case "text": return { text: { s: value } };
    case "code": return { code: { c: value } };
    case "user": return { user: { u: value } };
    case "flag": return target instanceof HTMLInputElement ? { flag: { b: target.checked } } : undefined;
    case "qty": {
      const unit = UnitKindValues.find(unit => unit === attrs["data-unit"]);
      const tenths = Math.round(Number(value) * 10);
      if (unit && value.trim() && Number.isSafeInteger(tenths) && tenths >= 0) return { qty: { tenths, unit } };
    }
  }
  return undefined;
}
function eventOf(attrs: Record<string, string>, target: EventTarget): Event | undefined {
  const comp = attrs["data-comp-id"];
  switch (attrs["data-event"]) {
    case "click": case "toggle": return comp ? { click: { comp } } : undefined;
    case "confirm": return comp ? { confirm: { comp } } : undefined;
    case "selectTab": {
      const raw = attrs["data-tab"], idx = Number(raw);
      return comp && raw?.trim() && Number.isSafeInteger(idx) && idx >= 0 ? { selectTab: { comp, idx } } : undefined;
    }
    case "ack": return attrs["data-alert"] ? { ack: { alert: attrs["data-alert"] } } : undefined;
    // Lean puts the screen id in data-comp-id on a scroll surface.
    case "scroll": return comp ? { scroll: { screen: comp } } : undefined;
    case "search": return target instanceof HTMLInputElement ? { search: { query: target.value } } : undefined;
    case "enter": {
      const value = valueOf(attrs, target);
      return comp && value ? { enter: { comp, value } } : undefined;
    }
  }
  return undefined;
}

/** Generic painter only: no state, clinical decisions, or component-kind dispatch. */
export function paint(tree: Html, onEvent: (event: Event) => void): ReactNode {
  if ("text" in tree) return tree.text.s;
  const { tag, attrs, children } = tree.node;
  if (!tagSet.has(tag)) { report(`tag ${tag}`); return null; }
  const safe: Record<string, string> = {};
  for (const { name, value } of attrs) {
    if (!allowedAttribute(name)) { report(`attribute ${name}`); continue; }
    safe[name] = name === "class" ? value.split(/\s+/).filter(c => {
      if (!c) return false;
      if (classSet.has(c)) return true;
      report(`class ${c}`); return false;
    }).join(" ") : value;
  }
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(safe)) {
    props[name === "class" ? "className" : name] = name === "disabled" ? value !== "false" : value;
  }
  // DOM boolean semantics: Lean carries checkbox state in the value attribute.
  if (tag === "input" && safe.type === "checkbox" && safe.value !== undefined) {
    props.checked = safe.value === "true";
    delete props.value;
  }
  const event = safe["data-event"];
  if (event) {
    const handler = (dom: SyntheticEvent) => {
      dom.stopPropagation();
      if (dom.type === "click") dom.preventDefault();
      const lean = eventOf(safe, dom.currentTarget);
      if (lean) onEvent(lean); else report(`event ${event} with incomplete metadata`);
    };
    props[event === "enter" || event === "search" ? "onChange" : event === "scroll" ? "onScroll" : "onClick"] = handler;
  }
  if (safe.value !== undefined && !props.onChange) props.onChange = () => {};
  return createElement(tag, props, ...children.map((child, index) => createElement(Fragment, { key: index }, paint(child, onEvent))));
}
