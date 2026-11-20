import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import {
  csrfAllowed,
  loopback,
  recordingJobs,
  recordingOptions,
  stackStatus,
} from "./local-recording";

const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/local-start/page.css", ["page.css", "text/css; charset=utf-8"]],
  ["/local-start/page.js", ["page.js", "text/javascript; charset=utf-8"]],
]);
const api = "/api/local-start/";

async function jsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > 4096) {
      req.resume();
      throw new Error("Recording options exceed 4 KB.");
    }
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function startPage(root: string, server: ViteDevServer["httpServer"]) {
  const dir = join(root, "app/src/dashboard/start");
  const token = randomBytes(32).toString("hex");
  const jobs = recordingJobs(root);
  server?.once("close", jobs.close);
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    // Existing clinical entry points and OIDC callbacks keep their root queries.
    const staticAsset =
      url.pathname === "/" && url.search ? undefined : assets.get(url.pathname);
    const localApi = url.pathname.startsWith(api);
    if (!staticAsset && !localApi) return next();
    const send = (status: number, data: unknown) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(data));
    };
    const address = server?.address();
    if (
      !address ||
      typeof address === "string" ||
      address.address !== "127.0.0.1" ||
      !loopback(req)
    ) {
      if (url.pathname === "/") return next();
      return send(404, { error: "Local start page unavailable" });
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    try {
      if (staticAsset) {
        if (req.method !== "GET" && req.method !== "HEAD")
          return send(405, { error: "Method not allowed" });
        const [file = "", type = ""] = staticAsset;
        res.setHeader("Content-Type", type);
        res.end(req.method === "HEAD" ? "" : await readFile(join(dir, file)));
        return;
      }
      const endpoint = url.pathname.slice(api.length);
      if (req.method === "GET") {
        if (endpoint === "status") {
          const [stack, recording, capped] = await Promise.all([
            stackStatus(),
            jobs.status(),
            jobs.capped(),
          ]);
          return send(200, { stack, recording, capped, csrf: token });
        }
        if (endpoint === "options")
          return send(200, await recordingOptions(root));
        return send(404, { error: "Unknown endpoint" });
      }
      if (req.method !== "POST")
        return send(405, { error: "Method not allowed" });
      if (!csrfAllowed(req, token))
        return send(403, {
          error: "Recording requests must come from the local start page.",
        });
      if (endpoint === "launch") await jobs.launch(await jsonBody(req));
      else if (endpoint === "stop") {
        await jsonBody(req);
        jobs.stop();
      } else return send(404, { error: "Unknown endpoint" });
      return send(202, { recording: await jobs.status() });
    } catch (error) {
      return send(400, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
