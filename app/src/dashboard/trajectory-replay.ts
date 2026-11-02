import type {
  Event,
  State,
  StepOutput,
} from "../../../lean/generated/ehr-types";
import type { Interp } from "../core/interp";

export interface TrajectoryEvent {
  task: string;
  t: number;
  screen: string;
  event: Event;
  ops: string[];
  result: StepOutput["result"];
}
export interface TrajectorySegment {
  start: number;
  end: number;
  facts: unknown;
  seed: { kind: "init"; clock: number; clinical?:boolean|undefined };
  goalsMet: boolean;
}
export interface Trajectory {
  schemaVersion: 1;
  id: string;
  context: {
    programPath: string;
    specPath: string;
    user: { id: string; role: string };
    startMin: number;
    today: string;
    fixtureFile: string;
    resources: { resourceType: string; id?: string | undefined }[];
    segments: TrajectorySegment[];
  };
  trace: TrajectoryEvent[];
  nativeMismatch: unknown;
}
export interface ReplayMismatch {
  eventIndex: number;
  expectedScreen?: string;
  actualScreen?: string;
  expectedResult?: unknown;
  actualResult?: unknown;
  reason?: string;
}
export function replayTrajectory(
  interp: Interp,
  task: Trajectory,
  spec: unknown,
  program: unknown,
  count = task.trace.length,
  display?: unknown,
) {
  let firstMismatch: ReplayMismatch | null = null;
  let state: State | undefined;
  let args: readonly [string, string, string, string] | undefined;
  let eventsVerified = 0;
  for (const segment of task.context.segments) {
    // At a reset boundary show the next clinical episode, including its facts.
    if (segment.start > count) break;
    args = [
      JSON.stringify(spec),
      JSON.stringify(program),
      JSON.stringify(
        display === undefined
          ? segment.facts
          : { facts: segment.facts, display },
      ),
      JSON.stringify(task.context.user),
    ];
    // A later clinical episode resets captures but carries the verified selected patient.
    // The temporary init argument dispatches to the existing clinical initializer;
    // every replayed event still uses the original certified executable in args.
    const initial: State = JSON.parse(segment.seed.clinical
      ? interp.init(args[0],JSON.stringify({...JSON.parse(args[1]),patientSelection:false}),args[2],args[3])
      : interp.init(...args));
    const patientContext=state?.patientContext;
    state = { ...initial,...(segment.seed.clinical&&patientContext?{patientContext}:{}),clock: segment.seed.clock };
    for (let i = segment.start; i < Math.min(segment.end, count); i++) {
      const event = task.trace[i];
      if (!event || !state) throw new Error("Missing recorded event or state");
      if(state.patientContext?.patient&&state.patientContext.bound!==state.patientContext.patient){
        // Same data-arrival operation as the app host; it is not a clinician activation.
        const hydrated:StepOutput=JSON.parse(interp.step(...args,JSON.stringify(state),JSON.stringify({scroll:{screen:state.screen}})));
        state=hydrated.state;
      }
      state.clock = event.t - task.context.startMin * 600;
      const screen = state.screen;
      const output: StepOutput = JSON.parse(
        interp.step(
          ...args,
          JSON.stringify(state),
          JSON.stringify(event.event),
        ),
      );
      if (
        !firstMismatch &&
        (screen !== event.screen ||
          JSON.stringify(output.result) !== JSON.stringify(event.result))
      ) {
        firstMismatch = {
          eventIndex: i,
          expectedScreen: event.screen,
          actualScreen: screen,
          expectedResult: event.result,
          actualResult: output.result,
        };
      }
      state = output.state;
      eventsVerified++;
    }
    if (segment.end > count) break;
  }
  if (!state || !args) throw new Error("Trajectory has no replay context");
  if (!firstMismatch && eventsVerified !== Math.min(count, task.trace.length))
    firstMismatch = {
      eventIndex: eventsVerified,
      reason: "Context segments do not cover the recorded events",
    };
  return { state, args, eventsVerified, firstMismatch };
}

/** Component IDs are opaque and must be matched as data, not CSS selectors. */
export function eventTarget(
  event: TrajectoryEvent["event"] | undefined,
): string | undefined {
  if (!event) return undefined;
  for (const payload of Object.values(event)) {
    if (payload && typeof payload === "object") {
      if ("comp" in payload) return String(payload.comp);
      if ("alert" in payload) return String(payload.alert);
    }
  }
  return undefined;
}

export function entryText(event: TrajectoryEvent["event"]): string | null {
  if ("search" in event) return event.search.query;
  if (!("enter" in event)) return null;
  const value = event.enter.value;
  if ("text" in value) return value.text.s;
  if ("code" in value) return value.code.c;
  if ("user" in value) return value.user.u;
  if ("qty" in value) return String(value.qty.tenths / 10);
  return String(value.flag.b);
}
