import { describe, expect, it } from "vitest";
import { createMockInterp, type Interp } from "../src/core/interp";
import { createSession } from "../src/core/session";
import {
  eventSchema,
  programSchema,
  screenViewSchema,
  stateSchema,
  stepResponseSchema,
  valueSchema,
} from "../src/core/types";
import { chartSchema } from "../src/data/fhir";
import { offlineChart } from "../src/mock/patient";
import {
  mockFacts,
  mockProgram,
  mockSpec,
  mockViews,
} from "../src/mock/workflow";

const args = [
  JSON.stringify(mockSpec),
  JSON.stringify(mockProgram),
  JSON.stringify(mockFacts),
  JSON.stringify({ id: "P1", role: "physician" }),
] as const;
function setup() {
  const interp = createMockInterp(mockViews, mockFacts);
  return { interp, state: interp.init(...args) };
}

describe("temporary JSON interpreter seam", () => {
  it("forwards bundles and events; paints render output and exposes view only for inspection", () => {
    const { interp } = setup();
    const page = { text: { s: "Lean owns this page" } };
    const bundle = { resourceType: "Bundle", type: "collection", entry: [] };
    const seen: string[][] = [];
    const wrapped: Interp = {
      ...interp,
      render(...args) {
        seen.push(args);
        return JSON.stringify(page);
      },
    };
    const session = createSession(wrapped, mockSpec, mockProgram, bundle, {
      id: "P1",
      role: "physician",
    });
    expect(session.getSnapshot().page).toEqual(page);
    session.dispatch({ click: { comp: "rooming-next" } });
    expect(session.getSnapshot().page).toEqual(page);
    expect(JSON.parse(seen[1]?.[2] ?? "null")).toEqual(bundle);
  });
  it("navigates forward/back and retains entered values", () => {
    const { interp, state } = setup();
    const entered = stepResponseSchema.parse(
      JSON.parse(
        interp.step(
          ...args,
          state,
          JSON.stringify({
            enter: {
              comp: "chiefComplaint",
              value: { text: { s: "Follow-up visit" } },
            },
          }),
        ),
      ),
    );
    const next = stepResponseSchema.parse(
      JSON.parse(
        interp.step(
          ...args,
          JSON.stringify(entered.state),
          JSON.stringify({ click: { comp: "rooming-next" } }),
        ),
      ),
    );
    expect(next.state.screen).toBe("documentation");
    const returned = stepResponseSchema.parse(
      JSON.parse(
        interp.step(
          ...args,
          JSON.stringify(next.state),
          JSON.stringify({ click: { comp: "documentation-back" } }),
        ),
      ),
    );
    const view = screenViewSchema.parse(
      JSON.parse(interp.view(...args, JSON.stringify(returned.state))),
    );
    expect(
      view.items.find((item) => item.component.id === "chiefComplaint")?.bound
        ?.value,
    ).toEqual({ text: { s: "Follow-up visit" } });
  });
  it("only implements trivial group/tab visibility, leaving fixture alerts and blocked actions static", () => {
    const { interp, state } = setup();
    const selected = stepResponseSchema.parse(
      JSON.parse(
        interp.step(
          ...args,
          state,
          JSON.stringify({ selectTab: { comp: "visit-tabs", idx: 1 } }),
        ),
      ),
    );
    const view = screenViewSchema.parse(
      JSON.parse(interp.view(...args, JSON.stringify(selected.state))),
    );
    expect(
      view.items.find((item) => item.component.id === "chiefComplaint")?.shown,
    ).toBe(false);
    expect(
      view.items.find((item) => item.component.id === "history-immunizations")
        ?.shown,
    ).toBe(true);
    const collapsed = stepResponseSchema.parse(
      JSON.parse(
        interp.step(
          ...args,
          JSON.stringify(selected.state),
          JSON.stringify({ click: { comp: "medication-section" } }),
        ),
      ),
    );
    const after = screenViewSchema.parse(
      JSON.parse(interp.view(...args, JSON.stringify(collapsed.state))),
    );
    expect(
      after.items.find((item) => item.component.id === "medication-table")
        ?.shown,
    ).toBe(false);
    expect(after.blocked).toEqual(view.blocked);
  });
  it.each([
    { confirm: { comp: "weight" } },
    { ack: { alert: "care-gap" } },
    { click: { comp: "review-allergies" } },
    { click: { comp: "sign-orders" } },
    { click: { comp: "note-template" } },
  ])("does not implement safety semantics: %j", (event) => {
    const { interp, state } = setup();
    const response = stepResponseSchema.parse(
      JSON.parse(interp.step(...args, state, JSON.stringify(event))),
    );
    expect(response.result).toBe("ignored");
    expect(response.state).toEqual(stateSchema.parse(JSON.parse(state)));
  });
  it("validates constructor shape, Nat, FHIR responses, fixtures and interpreter output", () => {
    expect(programSchema.parse(mockProgram)).toEqual(mockProgram);
    expect(chartSchema.parse(offlineChart)).toEqual(offlineChart);
    expect(eventSchema.safeParse({ kind: "click", comp: "a" }).success).toBe(
      false,
    );
    expect(
      valueSchema.safeParse({ qty: { tenths: -1, unit: "kg" } }).success,
    ).toBe(false);
    expect(
      chartSchema.safeParse({
        ...offlineChart,
        resources: [{ resourceType: "Observation", id: "bad" }],
      }).success,
    ).toBe(false);
    const { interp } = setup();
    expect(() => interp.init(...[args[0], "{}", args[2], args[3]])).toThrow();
  });
});
