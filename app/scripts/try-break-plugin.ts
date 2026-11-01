import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin } from "vite";
import { z } from "zod";
import { root } from "./catalog.mjs";
import { recheckRevision } from "./recheck-revision";
const checkInput = z.object({
  action: z.literal("check-revision"),
  persona: z.enum(["P1", "P2", "P3", "P4", "P5"]),
  program: z.string().max(240),
});

const input = z.object({
  persona: z.enum(["P1", "P2", "P3", "P4", "P5"]),
  request: z.string().trim().min(1).max(2000),
  run: z.string().regex(/^[\w-]+$/),
});
/** Recorded manifests may contain another worktree's absolute world path. */
export function worldInCheckout(
  recordedWorld: unknown,
  checkout = root,
): string {
  const source = z.string().parse(recordedWorld).replaceAll("\\", "/");
  const match = /(?:^|\/)runs\/world\/([\w.-]+(?:\/[\w.-]+)*)$/.exec(source);
  const relative = match?.[1];
  if (!relative || relative.split("/").includes(".."))
    throw new Error("Recorded world must be under runs/world in this checkout");
  return resolve(checkout, "runs/world", relative);
}
export function tryBreakPlugin(): Plugin {
  let backend: "claude" | "codex" | null = null;
  let environment = process.env;
  let busy = false;
  let checkAvailable = false;
  let unavailableReason =
    "Set ANTHROPIC_API_KEY in .env or run codex login on the app server, then restart preview.";
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (req.url !== "/__dev/try-to-break-it") return next();
    const send = (code: number, body: unknown) => {
      res.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET")
      return send(200, {
        checkAvailable,
        available: !!backend,
        backend,
        reason: backend ? null : unavailableReason,
      });
    const host = req.headers.host;
    if (
      req.method !== "POST" ||
      !host ||
      ![`http://${host}`, `https://${host}`].includes(
        req.headers.origin ?? "",
      ) ||
      req.headers["content-type"] !== "application/json"
    )
      return send(403, { error: "Use a same-origin JSON POST." });
    if (busy)
      return send(200, {
        error: "An attempt is already running. Try again when it finishes.",
      });
    try {
      let body = "";
      for await (const chunk of req) {
        body += String(chunk);
        if (body.length > 8192)
          return send(413, { error: "Request too large." });
      }
      const parsed: unknown = JSON.parse(body);
      const check = checkInput.safeParse(parsed);
      if (check.success) {
        if (!checkAvailable)
          return send(503, {
            error: "The native checker is unavailable on this server.",
          });
        busy = true;
        return send(
          200,
          await recheckRevision(
            check.data.program,
            check.data.persona,
            environment.EHR_BIN,
          ),
        );
      }
      if (!backend) return send(503, { error: unavailableReason });
      const data = input.parse(parsed);
      const manifest = JSON.parse(
        await readFile(
          resolve(root, "runs", data.run, "manifest.json"),
          "utf8",
        ),
      );
      if (manifest.worldIsFake || !manifest.personas.includes(data.persona))
        return send(400, {
          error:
            "Select a real run containing this persona for a live attempt.",
        });
      const world = worldInCheckout(manifest.world);
      busy = true;
      const output = await mkdtemp(resolve(tmpdir(), "vgi-break-"));
      const result = await new Promise<string>((done, reject) => {
        const child = spawn(
          "pnpm",
          [
            "--filter",
            "agent",
            "try-to-break-it",
            "--persona",
            data.persona,
            "--request",
            data.request,
            "--backend",
            backend ?? "codex",
            "--run",
            resolve(root, "runs", data.run),
            "--world",
            world,
            "--out",
            output,
          ],
          {
            cwd: root,
            env: { ...environment, EHR_FAKE: "0" },
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let stdout = "";
        let stderr = "";
        const stop = () => {
          if (child.pid) {
            try {
              process.kill(-child.pid, "SIGKILL");
            } catch {
              /* already exited */
            }
          }
        };
        const timer = setTimeout(() => {
          stop();
          reject(
            new Error(
              "Attempt timed out after 120 seconds. Recorded examples remain available.",
            ),
          );
        }, 120000);
        child.stdout.on("data", (chunk) => {
          stdout += String(chunk);
          if (stdout.length > 4000000) stop();
        });
        child.stderr.on("data", (chunk) => {
          stderr = (stderr + String(chunk)).slice(-2000);
        });
        child.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          if (code === 0) done(stdout);
          else reject(new Error(`Agent exited ${code}: ${stderr}`));
        });
      });
      const start = result.indexOf('{\n  "request"');
      if (start < 0) throw new Error("Agent returned no verdict JSON.");
      return send(200, JSON.parse(result.slice(start)));
    } catch (error) {
      return send(200, {
        error: error instanceof Error ? error.message : "Attempt failed",
      });
    } finally {
      busy = false;
    }
  };
  return {
    name: "local-try-to-break-it",
    async configResolved(config) {
      environment = {
        ...process.env,
        ...loadEnv(config.mode, config.envDir, ""),
      };
      if (environment.ANTHROPIC_API_KEY) backend = "claude";
      else
        backend = await new Promise((resolveBackend) => {
          execFile(
            "codex",
            ["login", "status"],
            { timeout: 2000, env: environment },
            (error, stdout, stderr) =>
              resolveBackend(
                !error && /Logged in/i.test(stdout + stderr) ? "codex" : null,
              ),
          );
        });
      {
        checkAvailable = await new Promise<boolean>((done) =>
          execFile(
            environment.EHR_BIN ?? resolve(root, "lean/.lake/build/bin/ehr"),
            ["--help"],
            { timeout: 2000, env: environment },
            (_error, stdout, stderr) =>
              done(/check --spec/.test(stdout + stderr)),
          ),
        );
        if (!checkAvailable && backend) {
          backend = null;
          unavailableReason =
            "Agent authentication is configured. Set EHR_BIN to an existing native ehr checker matching the committed releases, then restart preview. Recorded attempts remain available.";
        }
      }
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
