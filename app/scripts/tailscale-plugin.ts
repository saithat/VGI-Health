import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { Plugin, ViteDevServer } from "vite";

type Server = NonNullable<ViteDevServer["httpServer"]>;

const exec = promisify(execFile);
const command = async (args: string[]) =>
  (await exec("tailscale", args, { timeout: 4000 })).stdout;
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};

/** Never replace another service or reuse an endpoint exposed by Funnel. */
export function endpointStatus(
  config: unknown,
  host: string,
  port: number,
): "available" | "reuse" | "conflict" {
  const root = record(config);
  const foreground = Object.values(record(root.Foreground)).map((value) =>
    endpointStatus(value, host, port),
  );
  if (foreground.includes("conflict")) return "conflict";
  const endpoint = `${host}:${port}`;
  if (record(root.AllowFunnel)[endpoint]) return "conflict";
  const tcp = record(root.TCP)[String(port)];
  const web = record(root.Web)[endpoint];
  if (tcp === undefined && web === undefined)
    return foreground.includes("reuse") ? "reuse" : "available";
  const proxy = record(record(record(web).Handlers)["/"]).Proxy;
  return record(tcp).HTTPS === true &&
    (proxy === `http://127.0.0.1:${port}` || proxy === `http://localhost:${port}`)
    ? "reuse"
    : "conflict";
}

/** Applies to both `vite` and `vite preview`; builds never change Serve. */
export function tailscalePlugin(): Plugin {
  let host = "";
  return {
    name: "tailscale-preview",
    async config(_config, env) {
      if (env.command !== "serve" || env.mode === "test" || process.env.TAILSCALE_SERVE === "0") return;
      try {
        const status = record(JSON.parse(await command(["status", "--json"])));
        if (status.BackendState !== "Running") {
          console.warn("Tailscale is not connected; continuing with local URLs.");
          return;
        }
        const name = record(status.Self).DNSName;
        if (typeof name !== "string" || !name) return;
        host = name.replace(/\.$/, "");
        // Allow this machine's exact name, without allowing arbitrary hosts.
        return {
          server: { allowedHosts: [host] },
          preview: { allowedHosts: [host] },
        };
      } catch (error) {
        if (record(error).code !== "ENOENT")
          console.warn(`Tailscale unavailable; continuing locally: ${message(error)}`);
      }
      return undefined;
    },
    configureServer(server) {
      attach(server.httpServer);
    },
    configurePreviewServer(server) {
      attach(server.httpServer);
    },
  };

  function attach(server: Server | null) {
    if (!host || !server) return;
    server.once("listening", () => {
      void share(server).catch((error: unknown) => {
        console.warn(`Tailscale Serve unavailable; continuing locally: ${message(error)}`);
      });
    });
  }

  async function share(server: Server) {
    const address = server.address();
    if (!address || typeof address === "string") return;
    const port = address.port;
    const config: unknown = JSON.parse(await command(["serve", "status", "--json"]));
    if (!server.listening) return;
    const status = endpointStatus(config, host, port);
    if (status === "conflict") {
      console.warn(`Tailscale port ${port} is already configured for another endpoint or Funnel; leaving it unchanged.`);
      return;
    }
    if (status === "reuse") {
      links(port);
      return;
    }
    // Foreground Serve removes its own route on exit. Existing routes are reused.
    const child = spawn("tailscale", ["serve", `--https=${port}`, `http://127.0.0.1:${port}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stop = () => { child.kill("SIGTERM"); };
    process.once("exit", stop);
    server.once("close", stop);
    child.stdout.on("data", (data: Buffer) => process.stdout.write(data));
    child.stderr.on("data", (data: Buffer) => process.stderr.write(data));
    child.once("error", (error) => console.warn(`Tailscale Serve: ${message(error)}`));
    child.once("exit", (code) => {
      process.removeListener("exit", stop);
      server.removeListener("close", stop);
      if (code) console.warn(`Tailscale Serve exited (${code}); local server is still running.`);
    });
    // Confirm provisioning before advertising a remote link.
    child.stdout.once("data", () => {
      void command(["serve", "status", "--json"]).then((output) => {
        if (server.listening && endpointStatus(JSON.parse(output), host, port) === "reuse") links(port);
      }).catch((error: unknown) => console.warn(`Tailscale Serve: ${message(error)}`));
    });
  }

  function links(port: number) {
    const base = `https://${host}:${port}`;
    console.log(`\nTailscale UI browser: ${base}/browse`);
    console.log(`Canonical UI: ${base}/ehr?release=v1&program=releases/v1/canonical.json&persona=P1`);
    console.log(`Dashboard: ${base}/dashboard\n`);
  }
}
