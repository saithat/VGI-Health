import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

/** Local-only convenience: keep the seeded password out of built assets. This
 * endpoint reads .env; Medplum authentication still happens in medplum.ts. */
export function devPersonaPlugin(): Plugin {
  let password = "";
  const middleware = (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => {
    if (request.url !== "/__dev/persona-password") {
      next();
      return;
    }
    const host = request.headers.host ?? "";
    const origin = request.headers.origin;
    // Same-origin requests only (this app's own page), over http or https, so
    // the persona buttons also work through Tailscale. The seeded password is
    // never typed by anyone and never ships in built assets.
    const sameOrigin =
      host !== "" && (origin === `http://${host}` || origin === `https://${host}`);
    if (
      !sameOrigin ||
      request.method !== "POST" ||
      request.headers["content-type"] !== "application/json" ||
      !password
    ) {
      response.writeHead(403);
      response.end("Persona login requires a same-origin request and the local .env");
      return;
    }
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ password }));
  };
  return {
    name: "local-persona-login",
    configResolved(config) {
      password =
        loadEnv(config.mode, config.envDir, "").VGI_USER_PASSWORD ?? "";
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
