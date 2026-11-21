import { assertRecordingMode } from "../../agent/src/recording-mode";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { get, type IncomingMessage } from "node:http";
import { mkdir, open, readFile, readdir, realpath } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { completedPrefix } from "../../scripts/run-prefix.mjs";

const exec = promisify(execFile);
const id = z.string().regex(/^[A-Za-z0-9_][A-Za-z0-9_-]{0,79}$/);
const persona = z.enum(["P1", "P2", "P3", "P4", "P5"]);
const backend = z.enum(["codex", "replay"]);
const effort = z.enum(["low", "medium", "high", "xhigh", "max", "ultra"]);
const requestSchema = z
  .object({
    runId: id.refine((name) => name !== "world", "Run id is reserved"),
    days: z.string().regex(/^\d{1,9}$/, "--days must be a positive integer"),
    personas: z.array(persona).min(1).max(5),
    screens: z.literal("lean"),
    backend,
    model: z.string().regex(/^(?:[A-Za-z0-9][A-Za-z0-9_./:@+-]{0,127})?$/),
    reasoningEffort: effort,
    world: id,
    resume: z.boolean(),
    replayFrom: z.union([id, z.literal("")]),
  })
  .strict();

export function recordingArgs(input: unknown, parallel = true) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .map(
          ({ path, message }) =>
            (path.length ? path.join(".") + ": " : "") + message,
        )
        .join("\n"),
    );
  const config = parsed.data;
  if (new Set(config.personas).size !== config.personas.length)
    throw new Error(
      "Every requested persona must occur exactly once in the world",
    );
  const args = [
    "--days",
    config.days,
    "--personas",
    config.personas.join(","),
    "--screens",
    config.screens,
    "--world",
    `runs/world/${config.world}`,
  ];
  if (parallel) args.push("--parallel");
  if (config.resume) args.push("--resume");
  args.push("--backend", config.backend);
  if (config.backend === "replay" && config.replayFrom)
    args.push("--replay-from", `runs/${config.replayFrom}`);
  if (config.model && config.backend !== "replay")
    args.push("--model", config.model);
  if (config.backend === "codex")
    args.push("--reasoning-effort", config.reasoningEffort);
  return { config, args };
}

export function loopback(req: Pick<IncomingMessage, "headers" | "socket">) {
  const { headers, socket } = req;
  return (
    socket.localAddress === "127.0.0.1" &&
    socket.remoteAddress === "127.0.0.1" &&
    headers.host === `127.0.0.1:${socket.localPort}` &&
    !Object.keys(headers).some(
      (name) => name === "forwarded" || name.startsWith("x-forwarded-"),
    )
  );
}

export function csrfAllowed(
  req: Pick<IncomingMessage, "headers" | "socket">,
  token: string,
) {
  const { headers } = req;
  const supplied = headers["x-vgi-csrf"];
  return (
    loopback(req) &&
    headers.origin === `http://${headers.host}` &&
    (headers["sec-fetch-site"] === undefined ||
      headers["sec-fetch-site"] === "same-origin") &&
    headers["content-type"]?.split(";")[0] === "application/json" &&
    typeof supplied === "string" &&
    Buffer.byteLength(supplied) === Buffer.byteLength(token) &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
  );
}

const manifestSchema = z.object({
  runId: id,
  world: z.string(),
  days: z.number().int().min(1),
  daysCompleted: z.number().int().min(0).optional(),
  nightsCompleted: z.number().int().min(0).optional(),
  status: z.string().optional(),
  backend: z.string(),
  model: z.string(),
  personas: z.array(persona),
  screenGate: z.string().optional(),
  nightMode: z.string().optional(),
  measurementProtocol: z.object({name:z.string()}).optional(),
  parallel: z.boolean().optional(),
});
const readJson = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(file, "utf8"));
const readManifest = async (dir: string) =>
  manifestSchema.parse(await readJson(join(dir, "manifest.json")));
const missing = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

export async function recordingOptions(root: string) {
  const runs = join(root, "runs");
  const directories = async (path: string) =>
    (
      await readdir(path, { withFileTypes: true }).catch((error: unknown) => {
        if (missing(error)) return [];
        throw error;
      })
    )
      .filter(
        (entry) => entry.isDirectory() && id.safeParse(entry.name).success,
      )
      .map((entry) => entry.name)
      .sort();
  const worlds = await Promise.all(
    (await directories(join(runs, "world"))).map(async (name) => {
      const data = z
        .object({
          days: z.number().int().positive(),
          personas: z.array(persona),
        })
        .safeParse(
          await readJson(join(runs, "world", name, "world.json")).catch(
            () => null,
          ),
        );
      return data.success ? { id: name, ...data.data } : null;
    }),
  );
  const manifests = await Promise.all(
    (await directories(runs)).map(async (name) => {
      const data = await readManifest(join(runs, name)).catch(() => null);
      if (data?.runId !== name) return null;
      try { assertRecordingMode(data); } catch { return null; }
      const choice = backend.safeParse(data.backend);
      return {
        id: name,
        backend: choice.success ? choice.data : null,
        days: data.days,
        personas: data.personas,
        screens: "lean",
        model: data.model,
        world: basename(data.world),
      };
    }),
  );
  return {
    worlds: worlds.filter((value) => value !== null),
    runs: manifests.filter((value) => value !== null),
  };
}

function probeCommit() {
  return new Promise<boolean>((resolve) => {
    const url = new URL(
      "/health",
      process.env.COMMIT_INTERNAL_URL ?? "http://127.0.0.1:18090",
    );
    const request = get(url, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.once("error", () => resolve(false));
    request.setTimeout(1500, () => request.destroy());
  });
}

export async function stackStatus() {
  const state = process.env.VGI_STACK_STATUS;
  if (state === "starting")
    return {
      state,
      message: "Starting Postgres, Keycloak and the commit service.",
    };
  if (state === "unavailable" || state === "docker-missing")
    return { state, message: process.env.VGI_STACK_MESSAGE ?? "" };
  if (await probeCommit())
    return { state: "running", message: "Live EHR is ready." };
  const docker = await exec(
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    { timeout: 3500 },
  ).then(
    () => true,
    () => false,
  );
  return docker
    ? {
        state: "unavailable",
        message: "Live sign-in needs the Docker stack. Run pnpm start.",
      }
    : {
        state: "docker-missing",
        message:
          "Live sign-in needs Docker. Start Docker with Compose, then run pnpm start.",
      };
}

const cap = ["--user", "--scope", "--quiet", "-p", "MemoryMax=24G"];
const capAvailable = () =>
  exec("systemd-run", [...cap, "--", "true"], { timeout: 4000 }).then(
    () => true,
    () => false,
  );

type Job = {
  runId: string;
  log: string;
  unit: string;
  capped: boolean;
  state: "running" | "stopping" | "stopped" | "completed" | "failed";
  child: ChildProcess;
  error?: string;
};

async function logTail(path: string) {
  const file = await open(path, "r");
  try {
    const { size } = await file.stat();
    const bytes = Buffer.alloc(Math.min(size, 16384));
    const { bytesRead } = await file.read(
      bytes,
      0,
      bytes.length,
      size - bytes.length,
    );
    return bytes.subarray(0, bytesRead).toString("utf8");
  } finally {
    await file.close();
  }
}

export function recordingJobs(root: string) {
  let latest: Job | undefined;
  let launching = false;
  let closing = false;
  let memory: Promise<boolean> | undefined;
  const capped = () => (memory ??= capAvailable());

  async function launch(body: unknown) {
    if (
      closing ||
      launching ||
      latest?.state === "running" ||
      latest?.state === "stopping"
    )
      throw new Error("A recording is already active.");
    launching = true;
    try {
      const { config, args } = recordingArgs(body, false);
      const run = join(root, "runs", config.runId);
      const world = join(root, "runs", "world", config.world);
      const safeDirectory = async (path: string) => {
        const physical = await realpath(path).catch((error: unknown) => {
          if (missing(error)) return path;
          throw error;
        });
        if (physical !== path)
          throw new Error(
            "Choose a recording or world directory inside this checkout.",
          );
      };
      await Promise.all([
        safeDirectory(run),
        safeDirectory(world),
        ...(config.replayFrom
          ? [safeDirectory(join(root, "runs", config.replayFrom))]
          : []),
      ]);
      const previous = await readManifest(run).catch((error: unknown) => {
        if (missing(error)) return null;
        throw error;
      });
      if (!config.resume && previous)
        throw new Error("Run already exists; use --resume or a new run id");
      if (config.resume && !previous)
        throw new Error("--resume requires an existing --run-id");
      if (config.resume) assertRecordingMode(previous);
      if (!previous || previous.parallel) args.push("--parallel");
      const unit = `vgi-record-${randomUUID()}`;
      const useCap = await capped();
      const invocation = [
        "bash",
        join(root, "scripts/run-overnight.sh"),
        config.runId,
        ...args,
      ];
      if (closing) throw new Error("The app server is shutting down.");
      const logs = join(run, "logs");
      await mkdir(logs, { recursive: true });
      await safeDirectory(logs);
      const log = join(logs, `${unit}.log`);
      const output = await open(log, "wx", 0o600);
      try {
        if (closing) throw new Error("The app server is shutting down.");
        const child = spawn(
          useCap ? "systemd-run" : "bash",
          useCap
            ? [...cap, "--unit", unit, "--", ...invocation]
            : invocation.slice(1),
          {
            cwd: root,
            detached: true,
            stdio: ["ignore", output.fd, output.fd],
            env: {
              ...process.env,
              VGI_LOCAL_RECORD: "1",
              EHR_SCREEN_WORKERS: "1",
            },
          },
        );
        const job: Job = {
          runId: config.runId,
          log,
          unit,
          capped: useCap,
          child,
          state: "running",
        };
        latest = job;
        child.once("error", (error) => {
          job.state = "failed";
          job.error = error.message;
        });
        child.once("exit", (code, signal) => {
          if (job.state === "stopping") job.state = "stopped";
          else {
            job.state = code === 0 ? "completed" : "failed";
            if (code !== 0)
              job.error = `Recording exited with ${signal ?? code}.`;
          }
        });
      } finally {
        await output.close();
      }
    } finally {
      launching = false;
    }
  }

  function stop() {
    const job = latest;
    if (job?.state !== "running") return;
    job.state = "stopping";
    const signalGroup = (signal: NodeJS.Signals) => {
      if (!job.child.pid) return;
      try {
        process.kill(-job.child.pid, signal);
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        ))
          job.error = String(error);
      }
    };
    if (job.capped)
      void exec("systemctl", ["--user", "stop", `${job.unit}.scope`], {
        timeout: 5000,
      }).catch(() => signalGroup("SIGTERM"));
    else signalGroup("SIGTERM");
    const timer = setTimeout(() => {
      if (job.state === "stopping") signalGroup("SIGKILL");
    }, 6000);
    timer.unref();
  }

  async function status() {
    const job = latest;
    if (!job) return null;
    const [manifest, log] = await Promise.all([
      completedPrefix(join(root, "runs", job.runId))
        .then((prefix) => manifestSchema.parse(prefix.manifest))
        .catch(() => null),
      logTail(job.log).catch(() => ""),
    ]);
    return {
      runId: job.runId,
      state: job.state,
      error: job.error,
      log,
      manifest: manifest
        ? {
            status: manifest.status,
            days: manifest.days,
            daysCompleted: manifest.daysCompleted,
            nightsCompleted: manifest.nightsCompleted,
          }
        : null,
    };
  }

  return {
    launch,
    stop,
    status,
    capped,
    close() {
      closing = true;
      stop();
    },
  };
}
