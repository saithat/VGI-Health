/** Replay observed states with the existing episode-context adapter and native
 * step. A mismatch refuses measurement; it never falls back to invented boxes. */
import { existsSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { EhrSession } from "./lean-layout-native.js";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { mapOrdered, taskSlots } from "./replay-pool.js";
import { z } from "zod";
import { expandProgram } from "./composites.js";

import { runNative } from "./native-process.js";
import { REPO_ROOT, writeJson } from "./util.js";
import { BoundedMap } from "./bounded-map.js";
import { sha256, stableStringify } from "./program.js";
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
  const keys = new WeakMap<object, { shape: string; placement: string }>();
  return (state: LeanScreenState) => {
    let key = keys.get(state.ui);
    if (!key) {
      const shape = sha256(stableStringify([state.screen, shapeFor(state.ui)]));
      key = {
        shape,
        placement: shape + sha256(stableStringify(occurrences(state.ui))),
      };
      keys.set(state.ui, key);
    }
    const { shape, placement } = key;
    if (!firstOfPlacement.has(placement))
      firstOfPlacement.set(placement, state.ui);
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
  const dir = await mkdtemp(path.join(tmpdir(), "lean-states-"));
  const lean = path.join(REPO_ROOT, "lean"),
    scripts = path.join(REPO_ROOT, "scripts");
  const built = path.join(scripts, "measure-replay/.lake/build/bin");
  // The overnight preflight builds these two native adapters. Direct CLI
  // invocations can also interpret the exact same sources against built Ehr.
  function runTool(
    name: "trace-contexts" | "trace-task",
    args: string[],
    stdin?: string,
  ) {
    const file = path.join(built, name);
    const options = stdin === undefined ? {} : { input: stdin };
    if (existsSync(file)) return runNative(file, args, options);
    const source =
      name === "trace-contexts"
        ? "trajectories/Contexts.lean"
        : "measure-replay/TraceTask.lean";
    return runNative(
      "lean",
      ["-j1", "--run", path.join(scripts, source), ...args],
      {
        ...options,
        cwd: lean,
        env: {
          ...process.env,
          LEAN_PATH: path.join(lean, ".lake/build/lib/lean"),
        },
      },
    );
  }
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
    const command = await runTool("trace-contexts", [
      REPO_ROOT,
      input.worldDir,
      path.join(dir, "schedule.json"),
      path.join(dir, "spec.json"),
      path.join(dir, "program.json"),
      path.join(dir, "day.json"),
      path.join(dir, "contexts.json"),
    ]);
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
    const recentScreens = new BoundedMap<string, Record<string, unknown>>(64);
    const workers = taskSlots.getStore() ?? 1;
    const replay = async (context: (typeof contexts)[number]) => {
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
      const projection = {
        bundle: { resourceType: "Bundle", entry: resources },
        context: {
          today: index.referenceDate,
          now: task.startMin,
          receipts: [],
          record: [["viewerPersona", input.program.id]],
        },
      };
      const events = input.result.trace
        .map((event, index) => ({ event, index }))
        .filter((e) => e.event.task === context.id);
      const startMs =
        input.result.workload?.timings.find((t) => t.task === task.id)
          ?.startMs ?? task.startMin * 60000;
      // A caller may supply an independent interpreter executable. Its render
      // and step operations must still come from that executable.
      if (path.resolve(binary) !== path.join(lean, ".lake/build/bin/ehr")) {
        const session = new EhrSession(binary);
        try {
          const { display } = z
            .object({ display: z.unknown() })
            .parse(await session.call("facts", projection));
          const out: LeanScreenState[] = [];
          for (const segment of context.segments) {
            let state = segment.initialState;
            const common = {
              spec: input.spec,
              program,
              user: { id: program.owner, role: program.role },
              facts: segment.facts,
              display,
            };
            for (let i = segment.start; i < segment.end; i++) {
              const row = events[i];
              if (!row) throw Error("Missing trace event");
              const patient = record.safeParse(state["patientContext"]);
              if (
                patient.success &&
                patient.data["patient"] &&
                patient.data["bound"] !== patient.data["patient"]
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
              const ui = record.parse(
                await session.call("render-ui", { ...common, state }),
              );
              const after = z
                .object({ state: record, result: z.unknown() })
                .parse(
                  await session.call("step", {
                    ...common,
                    state,
                    event: row.event.event,
                  }),
                );
              if (
                state["screen"] !== row.event.screen ||
                !isDeepStrictEqual(after.result, row.event.result)
              )
                throw Error(
                  `Native geometry replay mismatch ${context.id}/${i}`,
                );
              out.push({
                screen: row.event.screen,
                ui,
                state: `trace-${row.index}`,
                eventIndex: row.index,
              });
              state = after.state;
            }
          }
          return out;
        } finally {
          session.close();
        }
      }
      const taskResult = await runTool(
        "trace-task",
        [path.join(dir, "spec.json"), path.join(dir, "program.json")],
        JSON.stringify({
          projection,
          segments: context.segments,
          startMinute: Math.floor(startMs / 60000),
          events: events.map((e) => e.event),
        }) + "\n",
      );
      if (taskResult.code !== 0) throw Error(taskResult.stderr.slice(-2000));
      const lines = taskResult.stdout.trimEnd();
      const rows = lines ? lines.split("\n") : [];
      if (rows.length !== events.length) throw Error("Incomplete task replay");
      return rows.map((line, i) => {
        const row = events[i];
        if (!row) throw Error("Unexpected native trace event");
        const hash = sha256(line);
        let ui = recentScreens.get(hash);
        if (!ui) {
          ui = record.parse(JSON.parse(line));
          recentScreens.set(hash, ui);
        }
        return {
          screen: row.event.screen,
          ui,
          state: `trace-${row.index}`,
          eventIndex: row.index,
        };
      });
    };
    // Compact in the original day/episode order. At most one batch of full
    // task screens is resident in addition to the compacted day.
    for (let i = 0; i < contexts.length; i += workers) {
      const batch = await mapOrdered(
        contexts.slice(i, i + workers),
        workers,
        replay,
      );
      for (const task of batch) for (const state of task) keep(state);
    }
    if (states.length !== input.result.trace.length)
      throw Error("Incomplete native geometry state coverage");
    return states;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
