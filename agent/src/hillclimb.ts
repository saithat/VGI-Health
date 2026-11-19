import { nativeCancellation } from "./native-process.js";
import path from "node:path";
import {
  daySeed,
  checkPatch,
  completionOk,
  emptyRecord,
  deployVersion,
  recordDeploy,
  validationGross,
  type LoopDeps,
  type NightInput,
  type Gate,
} from "./night.js";
import {
  addMetrics,
  sumMetrics,
  saving,
  summarizeTrain,
  type TrainDay,
} from "./observe.js";
import { componentsMoved, sha256, stableStringify } from "./program.js";
import {
  RELEASE_SCORING_POLICY,
  releaseScoringSchema,
  scoredMetrics,
} from "./release-scoring.js";
import { defaultStructurePolicy } from "./structure-policy.js";
import { usageWeightedSwitchCost } from "./cadence.js";
import { layoutRuleSchema } from "./layout-rules.js";
import { designOf } from "./layout-design.js";
import { screenAttribution } from "./lean-layout-prompt.js";
import { LeanLayoutRefusal } from "./lean-layout-refusal.js";
import { RELEASE_IDS } from "./release-config.js";
import {
  jsonPatchSchema,
  type DayResult,
  type DaySchedule,
  type Program,
  type UserMemory,
  type JsonPatchOp,
} from "./schema.js";
import type { ReplayDay } from "../../app/src/dashboard/agent-evidence.js";
import { harnessRequestSchema, type HarnessReply } from "./harness/host.js";
import { workspaceHash } from "./harness/workspace.js";
import { pad2, writeJson } from "./util.js";
import {
  runClimbingSession,
  type ClimbSessionOptions,
} from "./harness/climb-session.js";

export const CLIMB_PROMPT =
  "Read README.md in /work. Continue until night done succeeds.";
export const CLIMB_WALL_MS = 2 * 60 * 60 * 1000;
export function climbReadme(persona: string, role: string) {
  return `You are redesigning the EHR for ${persona}, a simulated ${role}. Reduce daily clicks plus scrolls while preserving completion, learnability, typing effort and modeled time. The checker enforces the clinical, screen and movement rules.

persona.json describes this clinician. days/N.json contains their recorded tasks and trace on the program in versions/V.json. program.json is your working copy of the deployed program, including its layouts. spec.json is the active rulebook.

Edit the working copy and run \`node patch.mjs > patch.json\`, or write an RFC 6902 patch against the deployed version directly. Run \`night measure patch.json\` to certify it and replay all past days with the expert and bounded clinicians. Inspect the verdict, totals and breakdowns. Iterate as often as needed. Savings must cover movement and reach five actions per day. Both clinicians must finish every task, with at most 2% more keys and modeled time. Bounded clicks and scrolls must each hold.

Finish with \`night done patch.json "summary"\`. Say what you changed and why in a few sentences. A refusal gives the reason so you can keep working. To retain the current version, use \`night done --no-change "reason"\`.`;
}
type Context = Pick<
  NightInput,
  "night" | "persona" | "current" | "release" | "declaredWorkload"
>;
export function assertReplay(
  result: DayResult,
  schedule: DaySchedule,
  program: Program,
) {
  if (result.policy === "bounded" && !result.memory)
    throw Error("Missing bounded memory");
  const expected = schedule.tasks.map((t) => t.id).sort();
  if (
    result.persona !== schedule.persona ||
    result.day !== schedule.day ||
    result.programVersion !== program.version ||
    new Set(expected).size !== expected.length ||
    JSON.stringify(result.tasks.map((t) => t.task).sort()) !==
      JSON.stringify(expected)
  )
    throw Error(
      "Replay omitted or substituted a scheduled task, day, version or persona",
    );
}
const source = (program: Program) => ({
  ...program,
  layouts: designOf(program) ?? [],
});
export function climbWorkspace(
  input: Context,
  days: readonly TrainDay[],
  versions: ReadonlyMap<number, Program>,
) {
  const json = (v: unknown) => JSON.stringify(v, null, 1);
  const files: Record<string, string> = {
    "README.md": climbReadme(input.persona.id, input.current.role),
    "program.json": json(source(input.current)),
    "spec.json": json(input.release.spec),
    "persona.json": json(input.persona.params),
    "layouts.schema.json": json({
      entry: {
        screen: "screen ID or *",
        rules: "array of the following rules",
      },
      rule: layoutRuleSchema.toJSONSchema(),
    }),
    "patch.mjs": `import {readFileSync} from 'node:fs';
const read = file => JSON.parse(readFileSync(file,'utf8'));
const base = read('versions/${input.current.version}.json'), edited = read('program.json');
const ops = [];
for (const key of new Set([...Object.keys(base), ...Object.keys(edited)])) {
  if (JSON.stringify(base[key]) === JSON.stringify(edited[key])) continue;
  const path = '/' + key.replaceAll('~','~0').replaceAll('/','~1');
  ops.push(key in edited ? {op:key in base?'replace':'add',path,value:edited[key]} : {op:'remove',path});
}
console.log(JSON.stringify(ops));
`,
  };
  if (days.length !== input.night) throw Error("Missing observed day");
  for (const [index, { result, schedule }] of days.entries()) {
    const version = versions.get(result.programVersion);
    if (
      schedule.day !== index + 1 ||
      schedule.persona !== input.persona.id ||
      !version ||
      version.owner !== input.current.owner
    )
      throw Error("Foreign or missing observed day/program");
    assertReplay(result, schedule, version);
    const ids = new Set(schedule.tasks.map((t) => t.id));
    if (result.trace.some((t) => !ids.has(t.task)))
      throw Error("Foreign trace task");
    files[`days/${result.day}.json`] = json({
      day: result.day,
      version: version.version,
      workflows: schedule.tasks.map(({ id, workflow }) => ({ id, workflow })),
      tasks: result.tasks.map(
        ({
          task,
          completed,
          clicks,
          scrolls,
          keystrokes,
          klmDeciSec,
          scrollPx,
        }) => ({
          task,
          completed,
          clicks,
          scrolls,
          keystrokes,
          klmDeciSec,
          scrollPx,
        }),
      ),
      trace: result.trace,
    });
    files[`versions/${version.version}.json`] = json(source(version));
  }
  const latest = days.at(-1)?.result;
  if (
    latest?.programVersion !== input.current.version ||
    files[`versions/${input.current.version}.json`] !== files["program.json"]
  )
    throw Error(
      "Current program differs from the most recent observed version",
    );
  return files;
}

async function breakdown(dir: string, result: DayResult) {
  const screens: Record<
    string,
    { clickOperators: number; keyOperators: number; scrolls: number }
  > = Object.create(null);
  const { costs } = await screenAttribution(dir, result);
  for (const [index, row] of result.trace.entries()) {
    const s = (screens[row.screen] ??= {
      clickOperators: 0,
      keyOperators: 0,
      scrolls: 0,
    });
    s.clickOperators += row.ops.filter((op) => op === "click").length;
    s.keyOperators += row.ops.filter((op) => op === "key").length;
    s.scrolls +=
      costs[index]?.scrolls ?? row.ops.filter((op) => op === "scroll").length;
  }
  return {
    tasks: result.tasks.map(
      ({
        task,
        completed,
        clicks,
        scrolls,
        scrollPx,
        keystrokes,
        klmDeciSec,
      }) => ({
        task,
        completed,
        clicks,
        scrolls,
        scrollPx,
        keystrokes,
        klmDeciSec,
      }),
    ),
    screens,
  };
}
// Screen evidence carries vendor archive filenames as provenance. Return the
// native findings and numeric limits, keeping the run-store provenance private.
function screenReason(message: string): string {
  try {
    const evidence = JSON.parse(message);
    if (Array.isArray(evidence.findings))
      return JSON.stringify(
        { gate: evidence.gate, findings: evidence.findings },
        (key, value) => (key === "source" ? undefined : value),
      );
  } catch {
    /* plain native refusal */
  }
  return message;
}
export class Deadline extends Error {}
export function climbingGate(
  deps: LoopDeps,
  input: Context,
  past: readonly TrainDay[],
  memory: UserMemory,
  deadline: number,
) {
  const { current, release, night, persona } = input,
    specVersion = release.specVersion;
  const latest = past.at(-1);
  if (!latest) throw Error("No observed workflows");
  const gate: Gate = {
    workspace: { schedule: latest.schedule, worldDir: deps.worldDir },
    prev: current,
    nextVersion: current.version + 1,
    canonical: release.canonical,
    specVersion,
    night,
    ...(release.id !== RELEASE_IDS.base
      ? {
          workload:
            input.declaredWorkload ?? past.flatMap((d) => d.schedule.tasks),
        }
      : {}),
  };
  if (memory.actor !== current.owner) throw Error("Foreign clinician memory");
  const checkTime = () => {
    if (Date.now() >= deadline) throw new Deadline();
  };
  const baseline = new Map<string, Awaited<ReturnType<typeof simulate>>>();
  async function simulate(
    program: Program,
    schedule: DaySchedule,
    policy: "expert" | "bounded",
  ) {
    checkTime();
    const result = await deps.ehr.simulate({
      specVersion,
      program,
      schedule,
      policy,
      persona: persona.params,
      worldDir: deps.worldDir,
      seed: daySeed(deps.worldSeed, schedule.day),
      ...(policy === "bounded" ? { memory: structuredClone(memory) } : {}),
    });
    assertReplay(result, schedule, program);
    if (policy === "expert" && result.policy === "bounded")
      throw Error("Expert replay returned bounded evidence");
    if (
      policy === "bounded" &&
      (result.policy !== "bounded" || result.memory?.actor !== current.owner)
    )
      throw Error("Missing bounded replay evidence");
    return {
      tasks: result.tasks,
      breakdown: await breakdown(deps.store.dir, result),
    };
  }
  async function measure(patch: JsonPatchOp[]) {
    checkTime();
    const { program, check } = await checkPatch(
      deps.ehr,
      current,
      patch,
      gate,
      deps.screens,
    );
    if (check.status === "error")
      throw Error(check.message ?? "Lean screen infrastructure error");
    if (check.property === "ScreenCheck" && check.message)
      check.message = screenReason(check.message);
    if (!program || check.status !== "pass")
      return {
        ships: false,
        reason: [check.property, check.message].filter(Boolean).join(": "),
        check,
      };
    const moved = componentsMoved(current, program);
    if (moved > release.spec.design.stabilityBudget)
      return {
        ships: false,
        reason: `Identity movement ${moved} exceeds budget ${release.spec.design.stabilityBudget}`,
        check,
      };
    const totals = () => ({ before: sumMetrics([]), after: sumMetrics([]) });
    const metrics = { expert: totals(), bounded: totals() };
    const details = [];
    for (const { schedule } of past)
      for (const policy of ["expert", "bounded"] as const) {
        const key = `${schedule.day}/${policy}`;
        const b =
          baseline.get(key) ?? (await simulate(current, schedule, policy));
        baseline.set(key, b);
        const a = await simulate(program, schedule, policy);
        // Preserve the canonical incomplete-task charge on either arm.
        let vendor = b;
        if ([...b.tasks, ...a.tasks].some((t) => !t.completed)) {
          vendor =
            baseline.get("vendor/" + key) ??
            (await simulate(
              { ...release.canonical, owner: current.owner, id: current.id },
              schedule,
              policy,
            ));
          baseline.set("vendor/" + key, vendor);
        }
        const m = metrics[policy];
        m.before = addMetrics(
          m.before,
          scoredMetrics(b, vendor, deps.incompletePenalty),
        );
        m.after = addMetrics(
          m.after,
          scoredMetrics(a, vendor, deps.incompletePenalty),
        );
        details.push({
          day: schedule.day,
          policy,
          before: b.breakdown,
          after: a.breakdown,
        });
      }
    checkTime();
    const reasons: string[] = [];
    const boundedReasons: string[] = [];
    for (const policy of ["expert", "bounded"] as const) {
      const m = metrics[policy],
        fail = policy === "bounded" ? boundedReasons : reasons;
      if (!completionOk(m))
        fail.push(
          `${policy} completed ${m.after.completed}/${m.after.tasks} tasks`,
        );
      for (const metric of [
        "clicks",
        "scrolls",
        "keystrokes",
        "klmDeciSec",
      ] as const) {
        const effort = metric === "keystrokes" || metric === "klmDeciSec";
        if (
          (effort || policy === "bounded") &&
          100 * m.after[metric] > (effort ? 102 : 100) * m.before[metric]
        )
          fail.push(
            `${policy} ${metric}: ${m.before[metric]} → ${m.after[metric]} exceeds +${effort ? 2 : 0}%`,
          );
      }
    }
    reasons.push(...boundedReasons);
    const { expert, bounded } = metrics;
    const replay: ReplayDay = {
      day: night,
      load: "all observed days",
      days: past.map((d) => d.schedule.day),
      taskCounts: past.map((d) => ({
        day: d.schedule.day,
        tasks: d.schedule.tasks.length,
      })),
      ...expert,
      saving: saving(expert.before, expert.after, past.length),
      pctAboveFloor: { before: null, after: null },
      scoring: {
        policy: RELEASE_SCORING_POLICY,
        incompletePenalty: releaseScoringSchema.parse({
          incompletePenalty: deps.incompletePenalty,
        }).incompletePenalty,
      },
      bounded: {
        ...bounded,
        saving: saving(bounded.before, bounded.after, past.length),
        policy: "bounded",
        memorySource: "all-past",
        memorySha256: sha256(stableStringify(memory)),
        reasons: boundedReasons,
        accepted: !boundedReasons.length,
      },
    };
    const movement = await usageWeightedSwitchCost(current, program, {
      clinician: persona.id,
      role: current.role,
      department: "unspecified",
      train: past,
    });
    const net = validationGross(replay) - movement.cost,
      minimum = defaultStructurePolicy().minimumEffect;
    if (net < minimum)
      reasons.push(
        `Daily net saving ${net} below ${minimum} (movement charge ${movement.cost})`,
      );
    return {
      ships: !reasons.length,
      reason: reasons.join("; "),
      check,
      program,
      replay,
      net,
      movement: movement.cost,
      details,
      delta: {
        expert: saving(expert.before, expert.after),
        bounded: saving(bounded.before, bounded.after),
      },
    };
  }
  return { gate, measure };
}

type Measurement = Awaited<
  ReturnType<ReturnType<typeof climbingGate>["measure"]>
>;
export class ClimbHost {
  final: {
    summary: string;
    patch?: JsonPatchOp[];
    measurement?: Measurement;
  } | null = null;
  measures = 0;
  constructor(
    private measure: (patch: JsonPatchOp[]) => Promise<Measurement>,
    readonly deadline: number,
    private record: (
      request: unknown,
      reply: HarnessReply,
      elapsedMs: number,
    ) => Promise<void>,
  ) {}
  async execute(raw: unknown): Promise<HarnessReply> {
    const start = Date.now(),
      reply = await this.command(raw);
    await this.record(raw, reply, Date.now() - start);
    return reply;
  }
  private async command(raw: unknown): Promise<HarnessReply> {
    const fail = (reason: string) => ({
      exit: 1,
      output: { ships: false, reason },
    });
    if (this.final || Date.now() >= this.deadline) return fail("Session ended");
    const parsed = harnessRequestSchema.safeParse(raw);
    if (!parsed.success) return fail("Invalid night command");
    const { command, argv, file } = parsed.data;
    const done = command === "done",
      summary = argv[1]?.trim() ?? "";
    if (
      done
        ? argv.length !== 2 || !summary
        : command !== "measure" || argv.length !== 1
    )
      return fail(
        'Use night measure <patch> or night done <patch>|--no-change "summary"',
      );
    if (done && argv[0] === "--no-change" && !file) {
      this.final = { summary };
      return { exit: 0, output: { done: true } };
    }
    if (!file || file.name !== argv[0]) return fail("Missing patch file");
    let patch: JsonPatchOp[];
    try {
      patch = jsonPatchSchema.parse(JSON.parse(file.text));
      for (const op of patch) {
        const pointers = "from" in op ? [op.from, op.path] : [op.path];
        if (
          pointers.some((pointer) =>
            pointer
              .split("/")
              .some(
                (key) =>
                  Object.hasOwn(Object.prototype, key) || key === "prototype",
              ),
          )
        )
          return fail("Patch pointer targets a reserved object member");
      }
    } catch (e) {
      return fail(String(e));
    }
    this.measures += Number(!done);
    try {
      const result = await this.measure(patch);
      if (Date.now() >= this.deadline) return fail("Wall-clock backstop");
      if (done && result.ships)
        this.final = { summary, patch, measurement: result };
      const { program: _program, ...report } = result;
      void _program;
      return { exit: done && !result.ships ? 1 : 0, output: report };
    } catch (error) {
      if (error instanceof Deadline || Date.now() >= this.deadline)
        return fail("Wall-clock backstop");
      if (error instanceof LeanLayoutRefusal)
        return fail(screenReason(error.message));
      throw error;
    }
  }
}

export async function runHillclimb(
  deps: LoopDeps,
  input: Context,
  past: readonly TrainDay[],
  versions: ReadonlyMap<number, Program>,
  memory: UserMemory,
  opts: ClimbSessionOptions,
) {
  const start = Date.now(),
    deadline = start + opts.wallMs;
  const files = climbWorkspace(input, past, versions),
    { gate, measure } = climbingGate(deps, input, past, memory, deadline);
  const dir = path.join(
    deps.store.dir,
    "hillclimb",
    `night-${pad2(input.night)}`,
    input.persona.id,
  );
  let commands = 0;
  const signal = AbortSignal.timeout(Math.max(0, deadline - Date.now()));
  const host = new ClimbHost(
    (patch) => nativeCancellation.run(signal, () => measure(patch)),
    deadline,
    async (request, reply, elapsedMs) => {
      await writeJson(path.join(dir, "commands", `${++commands}.json`), {
        request,
        reply,
        elapsedMs,
      });
    },
  );
  const launches = await runClimbingSession(host, files, dir, opts);
  const rec = emptyRecord(
    deps,
    { ...input, spec: input.release.spec, specVersion: gate.specVersion },
    summarizeTrain(input.persona.id, input.current, past, versions),
  );
  rec.mode = "hillclimb";
  rec.backend = {
    name: opts.replayFrom ? "replay" : opts.fixture ? "scripted" : "codex",
    model: deps.agent.model,
    replayOf: null,
  };
  const final = host.final;
  const result = final?.measurement;
  rec.hypothesis = final?.summary ?? "Wall-clock backstop";
  rec.validation.reason = rec.hypothesis;
  rec.outcome = final ? "no-change" : "backstop";
  if (result?.ships && result.program && result.replay && final?.patch) {
    rec.validation = {
      reason: final.summary,
      accepted: true,
      improved: true,
      stabilityOk: true,
      replay: result.replay,
    };
    rec.measured.validation = result.replay;
    rec.certification = {
      attempts: [
        {
          attempt: 0,
          source: "merged",
          candidateIds: [],
          patch: final.patch,
          check: result.check,
        },
      ],
      result: "certified",
    };
    const dep = await deployVersion(deps, input.persona.id, result.program, {
      ...gate,
      validation: result.replay,
    });
    recordDeploy(rec, dep, { candidateIds: [], patch: final.patch });
    if (!dep.ok)
      throw Error(`Measured program failed publication: ${dep.check.message}`);
    rec.versionAfter = result.program.version;
    rec.outcome = "deployed";
  }
  await writeJson(path.join(dir, "session.json"), {
    prompt: CLIMB_PROMPT,
    workspaceSha256: workspaceHash(files),
    outcome: rec.outcome,
    summary: rec.hypothesis,
    commands,
    measures: host.measures,
    wallMs: Date.now() - start,
    launches,
  });
  await deps.store.writeDecision(rec);
  return { record: rec, deployed: result?.program ?? null };
}
