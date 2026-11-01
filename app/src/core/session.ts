import type {
  Event,
  StepOutput,
  State,
  ScreenView,
} from "../../../lean/generated/ehr-types";
import type { UiScreen } from "../ehr/ui/types";
import type { Html } from "../ehr/html";
import type { Interp } from "./interp";
import { installButtonAudit } from "./buttonAudit";

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
  function readSnapshot(
    result: StepOutput["result"] | null = null,
    snapshotArgs = args,
    snapshotState = stateJson,
  ) {
    const state: State = JSON.parse(snapshotState);
    let page: Html | undefined;
    let view: ScreenView | undefined;
    const ui: UiScreen | undefined = interp.renderUi
      ? JSON.parse(interp.renderUi(...snapshotArgs, snapshotState))
      : undefined;
    // The semantic painter uses `ui`. Generate legacy HTML and the inspector's
    // detailed view only when a consumer asks for them. Capture this snapshot's
    // inputs so reading an old snapshot after a click still returns its tree.
    return {
      get page(): Html {
        return (page ??= JSON.parse(
          interp.render(...snapshotArgs, snapshotState),
        ));
      },
      get view(): ScreenView {
        return (view ??= JSON.parse(
          interp.view(...snapshotArgs, snapshotState),
        ));
      },
      ui,
      state,
      result,
    };
  }
  let snapshot = readSnapshot();
  const listeners = new Set<() => void>();
  function preview(event: Event): StepOutput {
    return JSON.parse(interp.step(...args, stateJson, JSON.stringify(event)));
  }
  function accept(response: StepOutput, facts?: unknown) {
    const nextArgs =
      facts === undefined
        ? args
        : ([args[0], args[1], JSON.stringify(facts), args[3]] as const);
    const nextState = JSON.stringify(response.state);
    const nextSnapshot = readSnapshot(response.result, nextArgs, nextState);
    args = nextArgs;
    stateJson = nextState;
    snapshot = nextSnapshot;
    listeners.forEach((listener) => listener());
  }
  const checkpoints: {
    args: typeof args;
    state: string;
    snapshot: typeof snapshot;
  }[] = [];
  installButtonAudit({
    program,
    snapshot: () => ({
      state: snapshot.state,
      result: snapshot.result,
      ui: snapshot.ui,
    }),
    checkpoint: () =>
      checkpoints.push({ args, state: stateJson, snapshot }) - 1,
    restore(id) {
      const saved = checkpoints[id];
      if (!saved) throw new Error("Unknown audit checkpoint");
      args = saved.args;
      stateJson = saved.state;
      snapshot = saved.snapshot;
      listeners.forEach((listener) => listener());
    },
  });
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
    dispatch(event: Event) {
      accept(preview(event));
    },
  };
}
