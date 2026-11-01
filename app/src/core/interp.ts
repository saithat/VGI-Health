import { mockPage } from "../mock/page";
import { offlineChart } from "../mock/patient";
import type { ChartData } from "../data/fhir";
import { bundleSchema } from "../data/fhir";
import {
  eventSchema,
  factsSchema,
  programSchema,
  screenViewSchema,
  specSchema,
  stateSchema,
  stepResponseSchema,
  userSchema,
  type Component,
  type Facts,
  type ItemView,
  type ScreenView,
  type State,
} from "./types";

/** Exact string-based seam for the forthcoming Lean WASM exports (§5). */
export interface Interp {
  init(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
  ): string;
  step(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
    eventJson: string,
  ): string;
  view(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
  ): string;
  render(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
  ): string;
  /** Semantic §10 UI. Optional until ehr_render_ui is present in the loaded artifact. */
  renderUi?(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
  ): string;
  facts(bundleJson: string): string;
}

function parseContext(
  spec: string,
  program: string,
  facts: string,
  user: string,
) {
  specSchema.parse(JSON.parse(spec));
  const parsedProgram = programSchema.parse(JSON.parse(program));
  const input: unknown = JSON.parse(facts);
  if (!factsSchema.safeParse(input).success) bundleSchema.parse(input);
  userSchema.parse(JSON.parse(user));
  return parsedProgram;
}

/**
 * DEVELOPMENT ONLY. Static fixture views + navigation + editing; no guard,
 * receipt, alert evaluation, confirmation, macro, or commit implementation.
 * It must never be described as certified or used for clinical writes.
 */
export function createMockInterp(
  inputViews: ScreenView[],
  inputFacts: Facts,
  chart: ChartData = offlineChart,
): Interp {
  const views = inputViews.map((view) => screenViewSchema.parse(view));
  const demoFacts = factsSchema.parse(inputFacts);
  function getView(screen: string) {
    const found = views.find((view) => view.screen === screen);
    if (!found) throw new Error(`No mock view for screen ${screen}`);
    return found;
  }
  function visible(
    item: ItemView,
    items: ItemView[],
    state: State,
    seen: Set<string>,
  ): boolean {
    if (!item.shown || seen.has(item.component.id)) return false;
    const parentId = item.component.parent;
    if (!parentId) return true;
    const parent = items.find((entry) => entry.component.id === parentId);
    if (!parent) return true;
    const nextSeen = new Set([...seen, item.component.id]);
    if (!visible(parent, items, state, nextSeen)) return false;
    const kind = parent.component.kind;
    if (typeof kind === "object" && "group" in kind && kind.group.collapsible)
      return state.expanded.includes(parentId);
    if (kind === "tabs")
      return (
        (state.tabSel.find(([id]) => id === parentId)?.[1] ?? 0) ===
        item.component.tab
      );
    return true;
  }
  function slotOf(component: Component, state: State) {
    const kind = component.kind;
    if (
      typeof kind === "object" &&
      "field" in kind &&
      kind.field.slot !== "current"
    )
      return kind.field.slot.fixed.n;
    return state.currentSlot;
  }
  return {
    init(spec, program, facts, user) {
      const parsed = parseContext(spec, program, facts, user);
      getView(parsed.start);
      return JSON.stringify(
        stateSchema.parse({
          screen: parsed.start,
          history: [],
          captured: [],
          receipts: [],
          acked: [],
          commits: [],
          expanded: views.flatMap((view) =>
            view.items
              .filter((item) => item.expanded)
              .map((item) => item.component.id),
          ),
          tabSel: [],
          popup: null,
          currentSlot: 0,
          clock: 0,
        }),
      );
    },
    step(spec, program, facts, user, stateJson, eventJson) {
      parseContext(spec, program, facts, user);
      const state = stateSchema.parse(JSON.parse(stateJson));
      const event = eventSchema.parse(JSON.parse(eventJson));
      const view = getView(state.screen);
      let next = state;
      let changed = false;
      if ("click" in event) {
        const item = view.items.find(
          (entry) => entry.component.id === event.click.comp,
        );
        const kind = item?.component.kind;
        if (kind && typeof kind === "object" && "button" in kind) {
          const action = kind.button.action;
          if (typeof action === "object" && "goto" in action) {
            getView(action.goto.screen);
            next = {
              ...state,
              screen: action.goto.screen,
              history: [...state.history, state.screen],
            };
            changed = true;
          } else if (action === "back") {
            const previous = state.history.at(-1);
            if (previous) {
              next = {
                ...state,
                screen: previous,
                history: state.history.slice(0, -1),
              };
              changed = true;
            }
          }
        } else if (
          kind &&
          typeof kind === "object" &&
          "group" in kind &&
          kind.group.collapsible &&
          item
        ) {
          const id = item.component.id;
          next = {
            ...state,
            expanded: state.expanded.includes(id)
              ? state.expanded.filter((value) => value !== id)
              : [...state.expanded, id],
          };
          changed = true;
        }
      } else if ("selectTab" in event) {
        next = {
          ...state,
          tabSel: [
            ...state.tabSel.filter(([id]) => id !== event.selectTab.comp),
            [event.selectTab.comp, event.selectTab.idx],
          ],
        };
        changed = true;
      } else if ("enter" in event) {
        const item = view.items.find(
          (entry) => entry.component.id === event.enter.comp,
        );
        const kind = item?.component.kind;
        if (kind && typeof kind === "object" && "field" in kind && item) {
          const slot = slotOf(item.component, state);
          next = {
            ...state,
            captured: [
              ...state.captured.filter(
                (entry) =>
                  entry.element !== kind.field.element || entry.slot !== slot,
              ),
              {
                element: kind.field.element,
                slot,
                value: event.enter.value,
                byHuman: true,
                confirmed: false,
                provenance: null,
              },
            ],
          };
          changed = true;
        }
      }
      return JSON.stringify(
        stepResponseSchema.parse({
          state: next,
          result: changed ? "ok" : "ignored",
        }),
      );
    },
    view(spec, program, facts, user, stateJson) {
      parseContext(spec, program, facts, user);
      const state = stateSchema.parse(JSON.parse(stateJson));
      const base = getView(state.screen);
      return JSON.stringify(
        screenViewSchema.parse({
          ...base,
          items: base.items.map((item) => {
            const kind = item.component.kind;
            const captured =
              typeof kind === "object" && "field" in kind
                ? state.captured.find(
                    (entry) =>
                      entry.element === kind.field.element &&
                      entry.slot === slotOf(item.component, state),
                  )
                : undefined;
            return {
              ...item,
              shown: visible(item, base.items, state, new Set()),
              expanded: state.expanded.includes(item.component.id),
              selectedTab:
                state.tabSel.find(([id]) => id === item.component.id)?.[1] ??
                item.selectedTab,
              bound: captured
                ? {
                    value: captured.value,
                    provenance: null,
                    pendingConfirm: false,
                  }
                : item.bound,
            };
          }),
        }),
      );
    },
    render(spec, program, facts, user, stateJson) {
      const view: ScreenView = JSON.parse(
        this.view(spec, program, facts, user, stateJson),
      );
      return JSON.stringify(
        mockPage(view, specSchema.parse(JSON.parse(spec)), chart),
      );
    },
    facts(bundleJson) {
      bundleSchema.parse(JSON.parse(bundleJson));
      // Fixed synthetic fixture. No FHIR-to-clinical-facts semantics in TS.
      return JSON.stringify(demoFacts);
    },
  };
}
