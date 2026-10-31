import type { Interp } from "./interp";
import {
  eventSchema,
  factsSchema,
  programSchema,
  screenViewSchema,
  specSchema,
  stateSchema,
  stepResponseSchema,
  userSchema,
  type Event,
  type Facts,
  type Program,
  type Spec,
  type User,
} from "./types";

/** Opaque state is owned by the interpreter; React subscribes to its view. */
export function createSession(
  interp: Interp,
  spec: Spec,
  program: Program,
  facts: Facts,
  user: User,
) {
  const args = [
    JSON.stringify(specSchema.parse(spec)),
    JSON.stringify(programSchema.parse(program)),
    JSON.stringify(factsSchema.parse(facts)),
    JSON.stringify(userSchema.parse(user)),
  ] as const;
  let stateJson = JSON.stringify(
    stateSchema.parse(JSON.parse(interp.init(...args))),
  );
  const readView = (json: string) =>
    screenViewSchema.parse(JSON.parse(interp.view(...args, json)));
  let snapshot = {
    view: readView(stateJson),
    message: "Navigation preview · clinical actions require Lean WASM",
  };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(event: Event) {
      try {
        const response = stepResponseSchema.parse(
          JSON.parse(
            interp.step(
              ...args,
              stateJson,
              JSON.stringify(eventSchema.parse(event)),
            ),
          ),
        );
        const nextStateJson = JSON.stringify(response.state);
        const nextView = readView(nextStateJson);
        // Adopt state and view together only after both boundaries validate.
        stateJson = nextStateJson;
        const result = response.result;
        snapshot = {
          view: nextView,
          message:
            typeof result === "object"
              ? result.blocked.reason
              : result === "ignored"
                ? "This preview only supports navigation and editing. Lean WASM is required for this action."
                : "Preview updated · changes remain in this browser session",
        };
      } catch (error) {
        snapshot = {
          ...snapshot,
          message: `Interpreter response rejected: ${error instanceof Error ? error.message : "Invalid JSON"}`,
        };
      }
      listeners.forEach((listener) => listener());
    },
  };
}
