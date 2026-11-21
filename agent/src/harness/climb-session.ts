import { z } from "zod";
import { workspaceHash } from "./workspace.js";
import { stableStringify } from "../program.js";
import { mkdir,mkdtemp,rm,writeFile } from "node:fs/promises";
import path from "node:path";
import { CLIMB_PROMPT,estimateInstruction,type ClimbHost } from "../hillclimb.js";
import { prepareWorkspace } from "./workspace.js";
import {
prepareLaunch,
launchUsage,
auditLaunch,
type LaunchUsage,
type AgentConfig,
} from "./agents.js";
import { startEgressProxy,type EgressEvent } from "./egress.js";
import { startModelBridge } from "./model-bridge.js";
import { DEFAULT_MODEL_URL } from "./night-provider.js";
import { serveHarnessSpool } from "./host.js";
import { harnessSandboxArgs,runSandboxed } from "./sandbox.js";
import { readJson,writeJson } from "../util.js";
import { UsageLimitError,usageLimitIn } from "../usage-limit.js";

export interface ClimbSessionOptions extends AgentConfig {
  wallMs: number;
  replayFrom?: string;
  /** In-process driver for synthetic verification only. */
  fixture?: (host: ClimbHost) => Promise<void>;
}

export async function runClimbingSession(
  host: ClimbHost,
  files: Record<string, string>,
  dir: string,
  opts: ClimbSessionOptions,
) {
  const launches: LaunchUsage[] = [];
  if (opts.replayFrom) {
    const session = await readJson(
      path.join(opts.replayFrom, "session.json"),
      z.object({
        workspaceSha256: z.string(),
        outcome: z.enum(["backstop", "no-change", "deployed"]),
        commands: z.number().int().nonnegative(),
      }),
    );
    if (session.workspaceSha256 !== workspaceHash(files)) {
      // Older sessions saw the identical workspace without the estimate hint.
      const legacy = {...files, "README.md": files["README.md"]?.replace(estimateInstruction + "\n\n", "") ?? ""};
      if (session.workspaceSha256 !== workspaceHash(legacy))
        throw Error("Hill-climbing replay workspace mismatch");
    }
    for (let index = 1; index <= session.commands; index++) {
      const entry = await readJson(
        path.join(opts.replayFrom, "commands", index + ".json"),
        z.object({
          request: z.unknown(),
          reply: z.object({ exit: z.number(), output: z.unknown() }),
        }),
      );
      // An interrupted command produced no usable measurement. The guard is a wall-clock observation.
      if (
        session.outcome === "backstop" &&
        index === session.commands &&
        z
          .object({ reason: z.literal("Wall-clock backstop") })
          .safeParse(entry.reply.output).success
      )
        break;
      if (
        stableStringify(await host.execute(entry.request)) !==
        stableStringify(entry.reply)
      )
        throw Error(`Hill-climbing replay diverged at command ${index}`);
    }
    const outcome = host.final?.measurement
      ? "deployed"
      : host.final
        ? "no-change"
        : "backstop";
    if (session.outcome !== outcome)
      throw Error("Hill-climbing replay outcome mismatch");
    return launches;
  }
  if (opts.fixture) {
    await opts.fixture(host);
    if (!host.final && Date.now() < host.deadline)
      throw Error("Fixture ended without a completion token");
    return launches;
  }
  const root = await prepareWorkspace(files, "program.json");
  const control = path.join(root, "control"),
    spool = path.join(root, "spool");
  let failure: unknown;
  const stopSession = new AbortController();
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(control, "hillclimb"), "");
    const stopHost = await serveHarnessSpool(spool, {
      execute: async (raw) => {
        try {
          // The accepted token seals the host immediately. The CLI emits billing
          // totals only after its final model turn, so allow it to exit normally.
          return await host.execute(raw);
        } catch (error) {
          failure = error;
          stopSession.abort();
          return {
            exit: 1,
            output: { error: "Measurement infrastructure unavailable" },
          };
        }
      },
    });
    try {
      while (!host.final && Date.now() < host.deadline) {
        const index = launches.length;
        const home = await mkdtemp(path.join(root, "cli-home-"));
        const spec = await prepareLaunch(opts, home, control, index);
        const egress: (EgressEvent & { route?: "model" })[] = [];
        const stop = await startEgressProxy(
          path.join(control, "egress.sock"),
          spec.hosts,
          (e) => egress.push(e),
        );
        let stopBridge: (() => Promise<void>) | undefined;
        try {
          const localModel = opts.provider === "local";
          if (localModel) {
            stopBridge = await startModelBridge(path.join(control, "model.sock"), opts.baseUrl ?? DEFAULT_MODEL_URL,
              event => egress.push({ ...event, route: "model" }));
          }
          const args = harnessSandboxArgs(
            {
              workspace: path.join(root, "work"),
              localModel, control,
              home,
              spool,
              readOnly: spec.readOnly,
            },
            spec.command,
            spec.args,
            spec.env,
          );
          const run = await runSandboxed(
            args,
            CLIMB_PROMPT,
            Math.max(1, host.deadline - Date.now()),
            undefined,
            stopSession.signal,
          );
          const usage = launchUsage(run.stdout),
            audit = auditLaunch(run.stdout);
          launches.push(usage);
          await writeFile(path.join(dir, `launch-${index}.txt`), run.stdout);
          await writeJson(path.join(dir, `launch-${index}.json`), {
            usage,
            audit,
            egress,
            stderr: run.stderr,
            code: run.code,
            timedOut: run.timedOut,
          });
          if (failure) throw failure;
          if (audit.status !== "pass" || run.stdoutTruncated)
            throw Error("Incomplete or failed CLI isolation audit");
          if (run.timedOut) break;
          const limit = usageLimitIn(run.stdout, run.stderr, "codex");
          if (limit && !host.final) throw new UsageLimitError(limit);
          if (run.code !== 0 && !host.final)
            throw Error(
              `Codex launch failed (${run.code}): ${run.stderr.slice(-1500)}`,
            );
        } finally {
          await Promise.all([stopBridge?.(), stop()]);
        }
      }
    } finally {
      await stopHost();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  return launches;
}
