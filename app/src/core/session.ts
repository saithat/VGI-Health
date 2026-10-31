import type { Event, StepOutput } from "../../../lean/generated/ehr-types";
import type { Html } from "../ehr/html";
import type { Interp } from "./interp";

/** Opaque interpreter state. No runtime certification or tree validation.
 * The release pipeline validates JSON and checks rendered screens offline.
 * Bundle JSON is forwarded unchanged; Lean owns facts and display projection.
 */
export function createSession(
  interp: Interp,
  spec: unknown,
  program: unknown,
  bundle: unknown,
  user: unknown,
) {
  const args = [
    JSON.stringify(spec),
    JSON.stringify(program),
    JSON.stringify(bundle),
    JSON.stringify(user),
  ] as const;
  let stateJson = interp.init(...args);
  const readPage = (): Html => JSON.parse(interp.render(...args, stateJson));
  let snapshot = { page: readPage() };
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
      const response: StepOutput = JSON.parse(
        interp.step(...args, stateJson, JSON.stringify(event)),
      );
      stateJson = JSON.stringify(response.state);
      snapshot = { page: readPage() };
      listeners.forEach((listener) => listener());
    },
  };
}
