import type {
  Event,
  StepOutput,
  State,
  ScreenView,
} from "../../../lean/generated/ehr-types";
import type { UiScreen } from "../ehr/ui/types";
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
  let args = [
    JSON.stringify(spec),
    JSON.stringify(program),
    JSON.stringify(bundle),
    JSON.stringify(user),
  ] as const;
  let stateJson = interp.init(...args);
  const readPage = (): Html => JSON.parse(interp.render(...args, stateJson));
  function readSnapshot(result: StepOutput["result"] | null = null) {
    const state: State = JSON.parse(stateJson);
    const view: ScreenView = JSON.parse(interp.view(...args, stateJson));
    const ui: UiScreen | undefined = interp.renderUi
      ? JSON.parse(interp.renderUi(...args, stateJson))
      : undefined;
    return { page: readPage(), ui, state, view, result };
  }
  let snapshot = readSnapshot();
  const listeners = new Set<() => void>();
  function preview(event: Event): StepOutput {
    return JSON.parse(interp.step(...args, stateJson, JSON.stringify(event)));
  }
  function accept(response: StepOutput, facts?: unknown) {
    if (facts !== undefined) args = [args[0], args[1], JSON.stringify(facts), args[3]];
    stateJson = JSON.stringify(response.state);
    snapshot = readSnapshot(response.result);
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    preview,
    accept,
    dispatch(event: Event) { accept(preview(event)); },
  };
}
