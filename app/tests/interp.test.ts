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
  it("keeps the last validated state and view together after an invalid interpreter response", () => {
    const { interp } = setup();
    let invalid = false;
    const observed: string[] = [];
    const wrapped: Interp = {
      ...interp,
      step(...input) {
        observed.push(input[4]);
        return interp.step(...input);
      },
      view(...input) {
        return invalid ? "{}" : interp.view(...input);
      },
    };
    const session = createSession(wrapped, mockSpec, mockProgram, mockFacts, {
      id: "P1",
      role: "physician",
    });
    invalid = true;
    session.dispatch({ click: { comp: "rooming-next" } });
    expect(session.getSnapshot().view.screen).toBe("rooming");
    expect(session.getSnapshot().message).toContain(
      "Interpreter response rejected",
    );
    invalid = false;
    session.dispatch({ click: { comp: "rooming-next" } });
    expect(observed[1]).toEqual(observed[0]);
    expect(session.getSnapshot().view.screen).toBe("documentation");
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
    expect(() =>
      createSession(
        { ...interp, view: () => '{"invalid":true}' },
        mockSpec,
        mockProgram,
        mockFacts,
        { id: "P1", role: "physician" },
      ),
    ).toThrow();
  });
});
