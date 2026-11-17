/** Replay observed states with the existing episode-context adapter and native
 * step. A mismatch refuses measurement; it never falls back to invented boxes. */
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { expandProgram } from "./composites.js";
import { EhrSession } from "./lean-layout-native.js";
import { runNative } from "./native-process.js";
import { REPO_ROOT, writeJson } from "./util.js";
import { stableStringify } from "./program.js";
import { occurrences } from "./lean-layout-geometry.js";
import { shapeFor } from "../../scripts/layout-reference/generator.mjs";
import type { DayResult, DaySchedule, Program, Spec } from "./schema.js";
export interface LeanScreenState {
  screen: string;
  ui: Record<string, unknown>;
  render?: Record<string, unknown>;
  state: string;
  eventIndex?: number;
  sample?: string;
}
/** Appends trace states while retaining only the screens the gate reads.
 * The gate paints the last state of each erased shape (`[screen, shape]`) and
 * places boxes from the first state of each `[screen, shape, occurrences]`;
 * every other state is used only through those keys, so it shares that first
 * state's screen object. A day's trace holds thousands of full screens, and
 * keeping all of them (with every interpreter state) exhausted the Node heap.
 * Results are unchanged: each state keeps its own keys, events and order. */
export function compactStates(states: LeanScreenState[]) {
  const lastOfShape = new Map<string, number>(),
    firstOfPlacement = new Map<string, Record<string, unknown>>(),
    placementOf: string[] = [];
  return (state: LeanScreenState) => {
    const shape = stableStringify([state.screen, shapeFor(state.ui)]),
      placement = stableStringify([state.screen, shapeFor(state.ui), occurrences(state.ui)]);
    if (!firstOfPlacement.has(placement)) firstOfPlacement.set(placement, state.ui);
    const previous = lastOfShape.get(shape);
    if (previous !== undefined) {
      const earlier = states[previous],
        canonical = firstOfPlacement.get(placementOf[previous] ?? "");
      if (earlier && canonical) earlier.ui = canonical;
    }
    lastOfShape.set(shape, states.length);
    placementOf.push(placement);
    states.push(state);
  };
}
let contextQueue: Promise<void> = Promise.resolve();
async function serialContext<T>(work: () => Promise<T>): Promise<T> {
  const previous = contextQueue;
  let release = () => {};
  contextQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}
const record = z.record(z.string(), z.unknown());
const contextsSchema = z.array(
  z.object({
    id: z.string(),
    nativeMismatch: z.unknown(),
    segments: z.array(
      z.object({
        start: z.number(),
        end: z.number(),
        facts: record,
        initialState: record,
      }),
    ),
  }),
);
export async function traceStates(
  binary: string,
  input: {
    program: Program;
    spec: Spec;
    schedule: DaySchedule;
    worldDir: string;
    result: DayResult;
  },
): Promise<LeanScreenState[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "lean-states-")),
    session = new EhrSession(binary);
  try {
    const program = expandProgram(input.program);
    await Promise.all(
      Object.entries({
        program,
        spec: input.spec,
        schedule: input.schedule,
        day: input.result,
      }).map(([key, value]) => writeJson(path.join(dir, `${key}.json`), value)),
    );
    const command = await serialContext(() =>
      runNative(
        "lake",
        [
          "env",
          "lean",
          "-j2",
          "--run",
          path.join(REPO_ROOT, "scripts/trajectories/Contexts.lean"),
          REPO_ROOT,
          input.worldDir,
          path.join(dir, "schedule.json"),
          path.join(dir, "spec.json"),
          path.join(dir, "program.json"),
          path.join(dir, "day.json"),
          path.join(dir, "contexts.json"),
        ],
        { cwd: path.join(REPO_ROOT, "lean") },
      ),
    );
    if (command.code !== 0)
      throw Error(
        `Native trace contexts failed: ${command.stderr.slice(-2000)} ${command.stdout.slice(-2000)}`,
      );
    const contexts = contextsSchema.parse(
      JSON.parse(await readFile(path.join(dir, "contexts.json"), "utf8")),
    );
    const index = z
      .object({
        referenceDate: z.string(),
        patients: z.array(z.object({ id: z.string(), file: z.string() })),
      })
      .parse(
        JSON.parse(
          await readFile(
            path.join(REPO_ROOT, "fixtures/synthea/index.json"),
            "utf8",
          ),
        ),
      );
    const states: LeanScreenState[] = [];
    const keep = compactStates(states);
    for (const context of contexts) {
      if (context.nativeMismatch)
        throw Error(
          `Native trace replay mismatch ${context.id}: ${JSON.stringify(context.nativeMismatch)}`,
        );
      const task = input.schedule.tasks.find((t) => t.id === context.id);
      if (!task) throw Error("Missing replay task");
      const patient = index.patients.find((p) => p.id === task.patientId);
      if (!patient) throw Error(`Missing synthetic patient ${task.patientId}`);
      const bundle = record.parse(
        JSON.parse(
          await readFile(
            path.join(REPO_ROOT, "fixtures/synthea", patient.file),
            "utf8",
          ),
        ),
      );
      const entries = z
        .array(
          z
            .object({ resource: record, fullUrl: z.string().optional() })
            .passthrough(),
        )
        .parse(bundle["entry"]);
      const additions = input.schedule.tasks
        .slice(0, input.schedule.tasks.indexOf(task) + 1)
        .filter((t) => t.patientId === task.patientId)
        .flatMap((t) => t.todayResources ?? [])
        .map((r) => ({ resource: record.parse(r) }));
      const resources = [...entries, ...additions];
      const parsed = z
        .object({ display: z.unknown() })
        .parse(
          await session.call("facts", {
            bundle: { resourceType: "Bundle", entry: resources },
            context: {
              today: index.referenceDate,
              now: task.startMin,
              receipts: [],
              record: [["viewerPersona", input.program.id]],
            },
          }),
        );
      const events = input.result.trace
        .map((event, index) => ({ event, index }))
        .filter((e) => e.event.task === context.id);
      const startMs =
        input.result.workload?.timings.find((t) => t.task === task.id)
          ?.startMs ?? task.startMin * 60000;
      for (const segment of context.segments) {
        let state = segment.initialState;
        for (let i = segment.start; i < segment.end; i++) {
          const row = events[i];
          if (!row) throw Error("Missing trace event");
          const patientContext = record.safeParse(state["patientContext"]);
          const user = { id: program.owner, role: program.role },
            common = {
              spec: input.spec,
              program,
              facts: segment.facts,
              display: parsed.display,
              user,
            };
          if (
            patientContext.success &&
            patientContext.data["patient"] &&
            patientContext.data["bound"] !== patientContext.data["patient"]
          )
            state = z
              .object({ state: record })
              .parse(
                await session.call("step", {
                  ...common,
                  state,
                  event: { scroll: { screen: state["screen"] } },
                }),
              ).state;
          state = {
            ...state,
            clock: row.event.t - Math.floor(startMs / 60000) * 600,
          };
          const render = { ...common, state },
            ui = record.parse(await session.call("render-ui", render));
          const after = z
            .object({ state: record, result: z.unknown() })
            .parse(
              await session.call("step", { ...render, event: row.event.event }),
            );
          if (
            state["screen"] !== row.event.screen ||
            !isDeepStrictEqual(after.result, row.event.result)
          )
            throw Error(`Native geometry replay mismatch ${context.id}/${i}`);
          keep({
            screen: row.event.screen,
            ui,
            state: `trace-${row.index}`,
            eventIndex: row.index,
          });
          state = after.state;
        }
      }
    }
    if (states.length !== input.result.trace.length)
      throw Error("Incomplete native geometry state coverage");
    return states;
  } finally {
    session.close();
    await rm(dir, { recursive: true, force: true });
  }
}
