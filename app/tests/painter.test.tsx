import { cleanup, fireEvent, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paint } from "../src/ehr/painter";
import { htmlSchema, tags, type Html } from "../src/ehr/html";
import type { Event } from "../../lean/generated/ehr-types";
import { node } from "../src/mock/page";

afterEach(cleanup);
const leaf = fc.string().map((s) => ({ text: { s } }));
function tree(depth: number): fc.Arbitrary<Html> {
  return depth === 0
    ? leaf
    : fc.oneof(
        leaf,
        fc
          .record({
            tag: fc.constant("div"),
            children: fc.array(tree(depth - 1), { maxLength: 4 }),
          })
          .map(({ tag, children }): Html => ({
            node: { tag, attrs: [], children },
          })),
      );
}
function domTree(node: Node): Html {
  const tag = tags.find((tag) => tag === node.nodeName.toLowerCase());
  if (node.nodeType !== Node.TEXT_NODE && !tag)
    throw new Error("Unexpected element");
  return node.nodeType === Node.TEXT_NODE
    ? { text: { s: node.textContent ?? "" } }
    : {
        node: {
          tag: tag ?? "div",
          attrs: [],
          children: [...node.childNodes].map(domTree),
        },
      };
}
// React coalesces adjacent text leaves; compare their exact concatenation.
function normalize(html: Html): Html {
  if ("text" in html) return { text: { s: html.text.s } };
  const children: Html[] = [];
  for (const child of html.node.children.map(normalize)) {
    const last = children.at(-1);
    if ("text" in child && child.text.s === "") continue;
    if (last && "text" in last && "text" in child) last.text.s += child.text.s;
    else children.push(child);
  }
  return { node: { ...html.node, children } };
}

describe("generic Lean page painter", () => {
  it("preserves exactly the elements and text, in order, on random trees", () => {
    fc.assert(
      fc.property(tree(4), (html) => {
        const root = node("div", {}, html);
        const { container, unmount } = render(paint(root, () => {}));
        expect([...container.childNodes].map(domTree).map(normalize)).toEqual([
          normalize(root),
        ]);
        unmount();
      }),
      { numRuns: 250 },
    );
  });
  it("paints all whitelisted tags with valid HTML nesting and SVG namespaces", () => {
    const html = node(
      "div",
      {},
      node("span", {}, "text"),
      node(
        "table",
        {},
        node("thead", {}, node("tr", {}, node("th", {}, "Header"))),
        node("tbody", {}, node("tr", {}, node("td", {}, "Cell"))),
      ),
      node("button", {}, "Click"),
      node("input", {}),
      node("select", {}, node("option", {}, "A")),
      node("label", {}, "Label"),
      node("h1", {}, "1"),
      node("h2", {}, "2"),
      node("h3", {}, "3"),
      node("ul", {}, node("li", {}, "Item")),
      node("svg", {}, node("polyline", { points: "0,0 10,10" })),
      node("dialog", {}, "Dialog"),
      node("form", {}, "Form"),
    );
    const { container } = render(paint(html, () => {}));
    expect(
      new Set(
        [...container.querySelectorAll("*")].map((e) =>
          e.tagName.toLowerCase(),
        ),
      ),
    ).toEqual(new Set(tags));
    expect(container.querySelector("polyline")?.namespaceURI).toBe(
      "http://www.w3.org/2000/svg",
    );
  });
  it("drops unapproved tags, attributes, and classes and reports in dev", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const html: Html = JSON.parse(
      '{"node":{"tag":"div","attrs":[{"name":"style","value":"display:none"},{"name":"onclick","value":"evil()"},{"name":"class","value":"ehr-panel foreign"},{"name":"aria-label","value":"safe"}],"children":[{"node":{"tag":"script","attrs":[],"children":[{"text":{"s":"evil"}}]}}]}}',
    );
    const { container } = render(paint(html, () => {}));
    expect(container.innerHTML).toBe(
      '<div class="ehr-panel" aria-label="safe"></div>',
    );
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
    expect(htmlSchema.safeParse(html).success).toBe(false);
  });
  type EventCase = {
    event: string;
    attrs?: Record<string, string>;
    tag?: "input" | "select" | "div";
    value?: string;
    checked?: boolean;
    expected: Event;
  };
  const cases: EventCase[] = [
    { event: "click", expected: { click: { comp: "c" } } },
    { event: "toggle", expected: { click: { comp: "c" } } },
    { event: "confirm", expected: { confirm: { comp: "c" } } },
    {
      event: "selectTab",
      attrs: { "data-tab": "2" },
      expected: { selectTab: { comp: "c", idx: 2 } },
    },
    {
      event: "ack",
      attrs: { "data-alert": "allergy" },
      expected: { ack: { alert: "allergy" } },
    },
    { event: "scroll", tag: "div", expected: { scroll: { screen: "c" } } },
    {
      event: "search",
      tag: "input",
      value: "metformin",
      expected: { search: { query: "metformin" } },
    },
    ...["text", "code", "user"].map(
      (kind) =>
        ({
          event: "enter",
          tag: "input",
          attrs: { "data-value-kind": kind },
          value: "abc",
          expected:
            kind === "text"
              ? { enter: { comp: "c", value: { text: { s: "abc" } } } }
              : kind === "code"
                ? { enter: { comp: "c", value: { code: { c: "abc" } } } }
                : { enter: { comp: "c", value: { user: { u: "abc" } } } },
        }) satisfies EventCase,
    ),
    {
      event: "enter",
      tag: "select",
      attrs: { "data-value-kind": "code" },
      value: "abc",
      expected: { enter: { comp: "c", value: { code: { c: "abc" } } } },
    },
    {
      event: "enter",
      tag: "input",
      attrs: { "data-value-kind": "qty", "data-unit": "kg" },
      value: "82.4",
      expected: {
        enter: { comp: "c", value: { qty: { tenths: 824, unit: "kg" } } },
      },
    },
    {
      event: "enter",
      tag: "input",
      attrs: { "data-value-kind": "flag", type: "checkbox" },
      checked: true,
      expected: { enter: { comp: "c", value: { flag: { b: true } } } },
    },
    {
      event: "enter",
      tag: "input",
      attrs: { "data-value-kind": "flag", type: "checkbox", value: "true" },
      checked: false,
      expected: { enter: { comp: "c", value: { flag: { b: false } } } },
    },
  ];
  it.each(cases)(
    "maps $event $attrs to exactly one Lean Event",
    ({ event, tag, attrs, value, checked, expected }) => {
      const events: Event[] = [];
      const tree = node(
        tag ?? "button",
        { "data-event": event, "data-comp-id": "c", ...attrs },
        ...(tag === "select"
          ? [
              node("option", { value: "" }, "Empty"),
              node("option", { value: "abc" }, "ABC"),
            ]
          : []),
      );
      const { container } = render(paint(tree, (e) => events.push(e)));
      const target = container.firstElementChild;
      if (!target) throw new Error("Missing target");
      expect(events).toEqual([]);
      if (event === "scroll") fireEvent.scroll(target);
      else if (checked !== undefined) fireEvent.click(target);
      else if (value !== undefined)
        fireEvent.change(target, { target: { value } });
      else fireEvent.click(target);
      expect(events).toEqual([expected]);
    },
  );
  it("does not invent missing events or bubble child events into parent actions", () => {
    const onEvent = vi.fn();
    const { container } = render(
      paint(
        node(
          "div",
          { "data-event": "click", "data-comp-id": "parent" },
          node(
            "button",
            { "data-event": "confirm", "data-comp-id": "child" },
            "Confirm",
          ),
        ),
        onEvent,
      ),
    );
    const button = container.querySelector("button");
    if (!button) throw new Error("Missing button");
    fireEvent.click(button);
    expect(onEvent.mock.calls).toEqual([[{ confirm: { comp: "child" } }]]);
    onEvent.mockClear();
    cleanup();
    render(
      paint(
        node("input", { "data-comp-id": "silent", "aria-label": "No event" }),
        onEvent,
      ),
    );
    fireEvent.change(document.querySelector("input") ?? document.body, {
      target: { value: "ignored" },
    });
    expect(onEvent).not.toHaveBeenCalled();
  });
  it.each([
    { "data-event": "click" },
    { "data-event": "ack" },
    { "data-event": "selectTab", "data-comp-id": "c", "data-tab": "-1" },
    { "data-event": "selectTab", "data-comp-id": "c" },
    { "data-event": "invented", "data-comp-id": "c" },
    {
      "data-event": "enter",
      "data-comp-id": "c",
      "data-value-kind": "qty",
      "data-unit": "unknown",
    },
  ])("emits nothing for incomplete/unknown metadata %j", (attrs) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {}),
      onEvent = vi.fn();
    const { container } = render(paint(node("input", attrs), onEvent));
    const target = container.firstElementChild;
    if (!target) throw new Error("Missing input");
    if (attrs["data-event"] === "enter")
      fireEvent.change(target, { target: { value: "2" } });
    else fireEvent.click(target);
    expect(onEvent).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
