import type { Event, RenderInput, StepOutput } from "../../../../lean/generated/ehr-types";
import type { EhrInterp } from "../../../public/ehr/interp-loader.mjs";
import type { UiScreen } from "../../ehr/ui/types";
import { emptyEffort, type ChoiceContext, type Design, type StudyCase, type StudyTrace, type Trial, type StudySegment } from "./model";

/** Same RenderInput/step/state trajectory seam as recorded replay; no live client. */
export class StudyEngine {
  input: RenderInput;
  screen: UiScreen;
  episode = 0;
  completed = false;
  trace: StudyTrace[] = [];
  segments: StudySegment[] = [];
  effort = emptyEffort();
  readonly started = performance.now();
  private hiddenStart: number | null = null;
  private hiddenTotal = 0;
  constructor(readonly wasm: EhrInterp, readonly scenario: StudyCase, readonly design: Design) {
    const first = scenario.episodes[0];
    if (!first) throw Error("Missing task episode");
    this.input = structuredClone(first);
    this.segments.push({ start: 0, end: 0, facts: first.facts, seed: { kind: "init", clock: first.state.clock }, goalsMet: false });
    this.screen = this.render();
  }
  call<T>(name: string, input: unknown): T {
    const result = JSON.parse(this.wasm.call(name, JSON.stringify(input)));
    if (result.error) throw Error(result.error);
    return result;
  }
  render(): UiScreen {
    const context = this.input.state.patientContext;
    if (this.input.program.patientSelection && context?.patient === this.input.facts.sourcePatientId && context?.patient && context.bound !== context.patient) {
      const output = this.call<StepOutput>("ehr_step_envelope", { ...this.input, event: { scroll: { screen: this.input.state.screen } } });
      this.input = { ...this.input, state: output.state };
    }
    return this.call<{ screen: UiScreen }>("ehr_exotic", { op: "render", render: this.input }).screen;
  }
  hidden(value: boolean) {
    if (value && this.hiddenStart === null) this.hiddenStart = performance.now();
    if (!value && this.hiddenStart !== null) { this.hiddenTotal += performance.now() - this.hiddenStart; this.hiddenStart = null; }
  }
  step(event: Event, choice: ChoiceContext) {
    if (this.completed) return;
    const before = structuredClone(this.input);
    before.state.clock = Math.floor((performance.now() - this.started) / 100);
    const result = this.call<StepOutput>("ehr_step_envelope", { ...before, event });
    this.trace.push({ task: this.scenario.id, t: this.scenario.task.startMin * 600 + before.state.clock, elapsedMs: performance.now() - this.started,
      screen: before.state.screen, event, ops: [], result: result.result, episode: this.episode, before: before.state,
      choice, chosen: choice.options.find(o => JSON.stringify(o.event) === JSON.stringify(event))?.id ?? null });
    if (typeof result.result === "object" && "blocked" in result.result) this.effort.blocked++;
    this.input = { ...before, state: result.state };
    const progress = this.call<{ done: boolean }>("ehr_exotic", { op: "choices", render: this.input, task: this.scenario.task, episode: this.episode });
    const segment = this.segments[this.episode];
    if (!segment) throw Error("Missing trajectory segment");
    segment.end = this.trace.length;
    segment.goalsMet = progress.done;
    if (progress.done) {
      const next = this.scenario.episodes[this.episode + 1];
      if (next) {
        this.episode++;
        const facts = { ...next.facts, receipts: [...next.facts.receipts, ...result.state.receipts] };
        const state = this.call<RenderInput["state"]>("ehr_init_envelope", { ...next, program: { ...next.program, patientSelection: false }, facts });
        this.input = { ...structuredClone(next), facts, state: { ...state, ...(result.state.patientContext ? { patientContext: result.state.patientContext } : {}) } };
        this.segments.push({ start: this.trace.length, end: this.trace.length, facts, seed: { kind: "init", clock: state.clock, clinical: true }, goalsMet: false });
      } else this.completed = true;
    }
    this.screen = this.render();
  }
  snapshot(position: number, practice: boolean, stopReason: Trial["stopReason"]): Trial {
    return { design: this.design, caseId: this.scenario.id, position, practice,
      completed: this.completed, stopReason,
      effort: { ...this.effort, elapsedMs: performance.now() - this.started,
        hiddenMs: this.hiddenTotal + (this.hiddenStart === null ? 0 : performance.now() - this.hiddenStart) },
      trace: structuredClone(this.trace), segments: structuredClone(this.segments), finalState: structuredClone(this.input.state), tlx: null, sus: null };
  }
}
