// @vitest-environment node
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import {
  kindSchema,
  renderKind,
  screenViewSchema,
  type Kind,
  type ScreenView,
  type ValueKind,
} from "../src/core/types";
import { offlineChart } from "../src/mock/patient";
import { mockSpec, mockValueSets, mockViews } from "../src/mock/workflow";
import { ScreenRenderer } from "../src/render/ScreenRenderer";

const catalog: Kind[] = [
  "banner",
  { field: { element: "weight", slot: "current", prefill: "none" } },
  { panel: { info: "problemList" } },
  { table: { info: "allergyList" } },
  { trend: { info: "resultTrend" } },
  { alert: { alert: "sample-alert", popup: false } },
  { button: { action: { goto: { screen: "rooming" } } } },
  { group: { collapsible: true, startCollapsed: true } },
  "tabs",
  { macro: { id: "sample-macro" } },
  { search: { scope: "orders" } },
];
const infoIds = [
  "allergyList",
  "currentMeds",
  "vitals",
  "resultTrend",
  "problemList",
  "immunizations",
  "growthChart",
  "encounters",
];
const kindArbitrary: fc.Arbitrary<Kind> = fc.oneof(
  fc.constantFrom(...catalog),
  fc.constantFrom(...infoIds).map((info): Kind => ({ table: { info } })),
  fc
    .boolean()
    .map((popup): Kind => ({ alert: { alert: "sample-alert", popup } })),
);
const viewArbitrary = fc
  .array(
    fc.record({
      kind: kindArbitrary,
      shown: fc.boolean(),
      expanded: fc.boolean(),
      enabled: fc.boolean(),
      depth: fc.nat(4),
      selectedTab: fc.nat(3),
      tab: fc.nat(3),
      parentIndex: fc.option(fc.nat(35)),
      size: fc.constantFrom("normal", "compact", "tiny"),
      label: fc.string({ maxLength: 40 }),
      prefilled: fc.boolean(),
      alertActive: fc.boolean(),
      activity: fc.boolean(),
    }),
    { maxLength: 35 },
  )
  .map((descriptors) =>
    screenViewSchema.parse({
      screen: "random-screen",
      title: "Generated view",
      items: descriptors.map((item, index) => ({
        component: {
          id: `comp-${index}`,
          kind: item.kind,
          label: item.label,
          parent: item.parentIndex === null ? null : `comp-${item.parentIndex}`,
          tab: item.tab,
          visibility:
            index % 2 ? "always" : { unlessReceipt: { info: "allergyList" } },
          size: item.size,
          hotkey: null,
          tag: item.activity ? "activity-test" : "",
          copyOf: null,
        },
        shown: item.shown,
        depth: item.depth,
        expanded: item.expanded,
        selectedTab: item.selectedTab,
        bound: item.prefilled
          ? {
              value: { qty: { tenths: 750, unit: "kg" } },
              provenance: "Observation/fixture · 2026-10-31",
              pendingConfirm: true,
            }
          : null,
        alertActive: item.alertActive,
      })),
      enabled: descriptors.flatMap((item, index) =>
        item.enabled ? [`comp-${index}`] : [],
      ),
      blocked: descriptors.flatMap((item, index) =>
        item.enabled ? [] : [[`comp-${index}`, "Interpreter blocked reason"]],
      ),
      popup: null,
    }),
  );

function markup(view: ScreenView) {
  return renderToStaticMarkup(
    <MantineProvider>
      <ScreenRenderer
        view={view}
        data={offlineChart}
        spec={mockSpec}
        valueSets={mockValueSets}
        onEvent={() => {}}
      />
    </MantineProvider>,
  );
}
function componentIds(html: string) {
  return [...html.matchAll(/data-comp-id="([^"]*)"/g)].map((match) => match[1]);
}

describe("painting the interpreter view", () => {
  it("contains exactly the shown components across random ScreenViews, including contradictory ancestor/tab/size/alert metadata", () => {
    fc.assert(
      fc.property(viewArbitrary, (view) => {
        expect(componentIds(markup(view))).toEqual(
          view.items
            .filter((item) => item.shown)
            .map((item) => item.component.id),
        );
      }),
      { numRuns: 180, seed: 20261031 },
    );
  });
  it("exhaustiveness sanity: every constructor accepted by the catalog paints", () => {
    const expected = [
      "banner",
      "field",
      "panel",
      "table",
      "trend",
      "alert",
      "button",
      "group",
      "tabs",
      "macro",
      "search",
    ];
    expect(
      catalog.map((kind) => renderKind(kindSchema.parse(kind)).tag),
    ).toEqual(expected);
    const base = mockViews[0];
    if (!base?.items[0]) throw new Error("Missing fixture");
    const seed = base.items[0];
    const view = screenViewSchema.parse({
      ...base,
      popup: null,
      items: catalog.map((kind, index) => ({
        ...seed,
        component: { ...seed.component, kind, id: `catalog-${index}`, tag: "" },
        shown: true,
      })),
      enabled: [],
    });
    expect(componentIds(markup(view))).toHaveLength(expected.length);
    expect(kindSchema.safeParse({ invented: {} }).success).toBe(false);
  });
  it.each(infoIds)("renders the %s FHIR adapter", (info) => {
    const base = mockViews[0];
    const seed = base?.items[0];
    if (!base || !seed) throw new Error("Missing fixture");
    const view = screenViewSchema.parse({
      ...base,
      items: [
        {
          ...seed,
          component: { ...seed.component, kind: { table: { info } } },
        },
      ],
    });
    expect(markup(view)).not.toContain("No FHIR display adapter");
    expect(markup(view)).toContain(
      info === "growthChart" || info === "resultTrend" ? "<svg" : "<table",
    );
  });
  it.each<ValueKind>([
    "text",
    "flag",
    "identity",
    "cosign",
    { scan: { target: "wristband" } },
    { coded: { valueSet: "route" } },
    { quantity: { unit: "kg" } },
  ])("renders each field kind: %j", (kind) => {
    const base = mockViews[0];
    const seed = base?.items.find((item) => item.component.id === "weight");
    const element = mockSpec.elements.find((item) => item.id === "weight");
    if (!base || !seed || !element) throw new Error("Missing fixture");
    const spec = {
      ...mockSpec,
      elements: [{ ...element, kind, humanOnly: true }],
    };
    const view = {
      ...base,
      items: [{ ...seed, shown: true }],
      enabled: [seed.component.id],
    };
    const html = renderToStaticMarkup(
      <MantineProvider>
        <ScreenRenderer
          view={view}
          data={offlineChart}
          spec={spec}
          valueSets={mockValueSets}
          onEvent={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(html).toContain("unskippable");
    expect(html).toContain("Confirm");
    expect(html).toContain("Observation/weight");
  });
});
