import { assertRecordingMode } from "../../../agent/src/recording-mode";
import { replayScreen,createReferencePainter,referenceLimit } from "../lean-ui/reference";
import { LeanReplay } from "./LeanReplay";
import { expandProgram } from "../../../agent/src/composites";
import { uiScreenSchema } from "../core/types";
import type { LayoutDesign } from "../../../agent/src/layout-design";
import { useEffect,useMemo,useRef,useState } from "react";
import type { Event,StepOutput } from "../../../lean/generated/ehr-types";
import { applyPatch } from "../../../agent/src/jsonpatch";
import {
programSchema,
type Program,
type JsonPatchOp,
} from "../../../agent/src/schema";
import { verifyRecordedBuild } from "../browser/data";
import type { Interp } from "../core/interp";
import { programAt,type RunData,type Replay } from "./data";

export type InterpFactory = (program: Program) => Interp;

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
  const [binding, setBinding] = useState<{ key: string; error: string; design: LayoutDesign | null }>({ key: "", error: "Verifying certified build…", design: null });
  useEffect(() => {
    let active = true;
    verifyRecordedBuild(`runs/${run.manifest.runId}/programs/${persona}/v${version}.json`, run.programs.get(`programs/${persona}/v${version}.json`))
      .then((design) => { if (active) setBinding({ key: bindingKey, error: "", design }); })
      .catch((error: unknown) => { if (active) setBinding({ key: bindingKey, error: error instanceof Error ? error.message : String(error), design: null }); });
    return () => { active = false; };
  }, [run, persona, version, bindingKey]);
  const result = useMemo(() => {
    try {
      assertRecordingMode(run.manifest);
      if (binding.key !== bindingKey || binding.error)
        throw new Error(binding.key === bindingKey ? binding.error : "Verifying certified build…");

      if (!run.replay)
        throw new Error(
          "This run needs replay.json with spec, bundle, user and same-task traces.",
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
      const interp = factory?.(program);
      if (!interp?.renderUi || !interp.layout)
        throw new Error(
          "WASM Interp is required for this real run. Inject an InterpFactory into Dashboard.",
        );
      {
        const args = [JSON.stringify(context.spec), JSON.stringify(program), JSON.stringify(context.bundle), JSON.stringify(context.user)] as const;
        let state = interp.init(...args);
        for (const event of events) {
          const output: StepOutput = JSON.parse(interp.step(...args, state, JSON.stringify(event)));
          state = JSON.stringify(output.state);
        }
        const ui = replayScreen(interp.layout, uiScreenSchema.parse(JSON.parse(interp.renderUi(...args, state))));
        const {output} = createReferencePainter(interp.layout, binding.design ?? [])(ui, {w:1440*64,h:900*64}, referenceLimit(program.specVersion,persona,ui.screen ?? ""));
        if (!output.accepted) throw Error("Lean refused replay layout");
        return {ui,output,layout:interp.layout,error:null};
      }
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
        <LeanReplay screen={result.ui} output={result.output} layout={result.layout} onEvent={onEvent} />
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
