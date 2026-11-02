import { expandProgram } from "../../../agent/src/composites";
import { UiScreenView } from "../ehr/ui/Screen";
import { uiScreenSchema } from "../ehr/ui/types";
import type { PresentationBundle } from "../ehr/ui/presentation-types";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Event, StepOutput } from "../../../lean/generated/ehr-types";
import { applyPatch } from "../../../agent/src/jsonpatch";
import {
  programSchema,
  type Program,
  type JsonPatchOp,
} from "../../../agent/src/schema";
import { verifyRecordedBuild } from "../browser/data";
import type { Interp } from "../core/interp";
import { mockReplayInterp } from "../mock/replay";
import { paint } from "../ehr/painter";
import type { Html } from "../ehr/html";
import { programAt, type RunData, type Replay } from "./data";

export type InterpFactory = (program: Program) => Interp;

export function renderReplay(
  interp: Interp,
  context: Replay["contexts"][number],
  program: Program,
  events: Event[],
): Html {
  const args = [
    JSON.stringify(context.spec),
    JSON.stringify(program),
    JSON.stringify(context.bundle),
    JSON.stringify(context.user),
  ] as const;
  let state = interp.init(...args);
  for (const event of events) {
    const response: StepOutput = JSON.parse(
      interp.step(...args, state, JSON.stringify(event)),
    );
    state = JSON.stringify(response.state);
  }
  return JSON.parse(interp.render(...args, state));
}

export function ReplayScreen({
  run,
  persona,
  version,
  specVersion,
  events = [],
  patch = [],
  highlight = [],
  factory,
  onEvent,
}: {
  run: RunData;
  persona: string;
  version: number;
  specVersion?: string;
  events?: Event[];
  patch?: JsonPatchOp[];
  highlight?: string[];
  factory?: InterpFactory | undefined;
  onEvent?: (event: Event) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const bindingKey = `${run.manifest.runId}/${persona}/${version}`;
  const [binding, setBinding] = useState<{ key: string; error: string; presentations: PresentationBundle | null }>({ key: "", error: "Verifying certified build…", presentations: null });
  useEffect(() => {
    let active = true;
    if (!run.manifest.buildBindingRequired) return;
    verifyRecordedBuild(`runs/${run.manifest.runId}/programs/${persona}/v${version}.json`, run.programs.get(`programs/${persona}/v${version}.json`))
      .then((presentations) => { if (active) setBinding({ key: bindingKey, error: "", presentations }); })
      .catch((error: unknown) => { if (active) setBinding({ key: bindingKey, error: error instanceof Error ? error.message : String(error), presentations: null }); });
    return () => { active = false; };
  }, [run, persona, version, bindingKey]);
  const result = useMemo(() => {
    try {
      if (run.manifest.buildBindingRequired && (binding.key !== bindingKey || binding.error))
        throw new Error(binding.key === bindingKey ? binding.error : "Verifying certified build…");
      if (!run.replay)
        throw new Error(
          "This run needs replay.json with spec, bundle, user and same-task traces. See app/README.md.",
        );
      const contexts = run.replay.contexts.filter((c) => c.persona === persona);
      const context =
        contexts.find(
          (c) =>
            c.version === version &&
            (!specVersion || c.specVersion === specVersion),
        ) ??
        contexts.find((c) => specVersion && c.specVersion === specVersion) ??
        contexts.find(
          (c) => c.version === undefined && c.specVersion === undefined,
        );
      if (!context) throw new Error(`No replay context for ${persona}`);
      const program = expandProgram(programSchema.parse(
        applyPatch(programAt(run, persona, version), patch).doc,
      ));
      const interp = factory
        ? factory(program)
        : run.replay.mode === "mock" && run.manifest.ehr.mode === "fake"
          ? mockReplayInterp(program)
          : null;
      if (!interp)
        throw new Error(
          "WASM Interp is required for this real run. Inject an InterpFactory into Dashboard.",
        );
      let ui = null;
      if (binding.presentations || interp.renderUi) {
        if (!interp.renderUi) throw new Error('Semantic renderer required for presentation components');
        const args = [JSON.stringify(context.spec), JSON.stringify(program), JSON.stringify(context.bundle), JSON.stringify(context.user)] as const;
        let state = interp.init(...args);
        for (const event of events) {
          const output: StepOutput = JSON.parse(interp.step(...args, state, JSON.stringify(event)));
          state = JSON.stringify(output.state);
        }
        ui = uiScreenSchema.parse(JSON.parse(interp.renderUi(...args, state)));
      }
      return {
        ui,
        page: ui ? null : renderReplay(interp, context, program, events),
        error: null,
      };
    } catch (error) {
      return {
        page: null,
        ui: null,
        error: error instanceof Error ? error.message : "Replay failed",
      };
    }
  }, [run, persona, version, specVersion, events, patch, factory, binding, bindingKey]);
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll<HTMLElement>("[data-comp-id]");
    nodes?.forEach((node) => {
      node.dataset.replayHighlight = String(
        highlight.includes(node.dataset.compId ?? ""),
      );
    });
  }, [result, highlight]);
  return (
    <div className="replay-screen" ref={ref}>
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : result.ui ? (
        <UiScreenView screen={result.ui} presentations={binding.presentations} onEvent={onEvent ?? (() => {})} />
      ) : result.page ? (
        paint(result.page, onEvent ?? (() => {}))
      ) : null}
    </div>
  );
}

type Op = Replay["tasks"][number]["before"]["trace"][number]["ops"][number];
export function traceCounters(
  trace: { klmDeciSec: number; ops: Op[] }[],
  step: number,
) {
  const prefix = trace.slice(0, step);
  const count = (op: Op) =>
    prefix.reduce(
      (sum, e) => sum + e.ops.filter((value) => value === op).length,
      0,
    );
  return {
    clicks: count("click"),
    keystrokes: count("key"),
    scrolls: count("scroll"),
  };
}
