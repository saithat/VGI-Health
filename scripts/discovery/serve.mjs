#!/usr/bin/env node
/** Read-only loopback overview of an existing run-days --screens lean run. */
import { createServer as httpServer } from "node:http";
import { readFile, readdir, open } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
const stable = (x) =>
  Array.isArray(x)
    ? `[${x.map(stable).join(",")}]`
    : x && typeof x === "object"
      ? `{${Object.keys(x)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + stable(x[k]))
          .join(",")}}`
      : JSON.stringify(x);
export const paintBindingHash = (value) =>
  createHash("sha256").update(stable(value)).digest("hex");
async function paintHeader(path) {
  const file = await open(path, "r");
  try {
    for (let size = 16384; size <= 1048576; size *= 2) {
      const buffer = Buffer.alloc(size);
      const { bytesRead } = await file.read(buffer, 0, size, 0);
      const prefix = buffer.subarray(0, bytesRead).toString();
      const match = /^([\s\S]*?),\s*"ui"\s*:/.exec(prefix);
      if (match) return { ...JSON.parse(match[1] + "}"), path };
      if (bytesRead < size) break;
    }
    throw Error("Missing native paint header");
  } finally {
    await file.close();
  }
}
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const descriptions = {
  P1: "A primary-care prescriber working through clinic visits, results and refills.",
  P2: "An emergency physician managing triage, orders and disposition.",
  P3: "A ward nurse reviewing medications, administering doses and recording observations.",
  P4: "A surgical clinician preparing, operating and following up.",
  P5: "An inpatient clinician rounding, reviewing charts and placing orders.",
};
async function files(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(join(root, e.name)) : join(root, e.name),
      ),
    )
  ).flat();
}
export async function overview(dir) {
  const manifest = await read(join(dir, "manifest.json"));
  if (manifest.screenGate !== "lean" || manifest.browserCertified !== false)
    throw Error("Gallery requires a run-days --screens lean manifest");
  const decisions = (await files(join(dir, "decisions"))).filter((p) =>
    p.endsWith(".json"),
  );
  const records = await Promise.all(decisions.map(read));
  const paintFiles = (await files(join(dir, "reports/lean-screens"))).filter(
    (p) => /\/gallery\/\d+\.json$/.test(p),
  );
  const indexed = new Map();
  async function indexPaints(owner, version, design) {
    const programHash = paintBindingHash(design.program),
      layoutsSha256 = paintBindingHash(design.layouts),
      key = `${owner}/${version}/${programHash}/${layoutsSha256}`;
    if (indexed.has(key)) return indexed.get(key);
    const selected = [];
    for (const directory of new Set(
      paintFiles
        .filter((p) => p.includes(`/${owner}/v${version}/`))
        .map(dirname),
    )) {
      const coverage = await read(join(directory, "coverage.json"));
      if (
        coverage.programHash !== programHash ||
        coverage.layoutsSha256 !== layoutsSha256 ||
        coverage.failures?.length
      )
        continue;
      for (const path of paintFiles.filter((p) => dirname(p) === directory))
        selected.push(await paintHeader(path));
    }
    indexed.set(key, selected);
    return selected;
  }
  const previews = new Map();
  const personas = [];
  for (const id of manifest.personas) {
    const days = [];
    for (let day = 1; day <= manifest.days; day++) {
      const name = `day-${String(day).padStart(2, "0")}/${id}.json`;
      let actual, baseline;
      try {
        actual = await read(join(dir, "days", name));
        baseline = await read(join(dir, "no-agent/days", name));
      } catch (e) {
        if (e.code === "ENOENT") continue;
        throw e;
      }
      const totals = (r) => ({
        clicks: r.tasks.reduce((n, t) => n + t.clicks, 0),
        scrolls: r.tasks.reduce((n, t) => n + t.scrolls, 0),
        completed: r.tasks.filter((t) => t.completed).length,
        tasks: r.tasks.length,
      });
      days.push({
        day,
        version: actual.programVersion,
        agent: totals(actual),
        noAgent: totals(baseline),
      });
    }
    const versions = [];
    for (const record of records
      .filter((r) => r.persona === id && r.deployed)
      .sort((a, b) => a.night - b.night)) {
      const load = async (version) => {
        const base = join(dir, "programs", id, `v${version}`);
        return {
          program: await read(base + ".json"),
          layouts: await read(base + ".layouts.json"),
        };
      };
      const before = await load(record.versionBefore),
        after = await load(record.versionAfter),
        changed = [];
      const leftPaints = await indexPaints(
          after.program.owner,
          record.versionBefore,
          before,
        ),
        rightPaints = await indexPaints(
          after.program.owner,
          record.versionAfter,
          after,
        );
      const screenIds = new Set([
        ...before.program.screens.map((s) => s.id),
        ...after.program.screens.map((s) => s.id),
      ]);
      for (const screenId of screenIds) {
        const prior = before.program.screens.find((s) => s.id === screenId),
          current = after.program.screens.find((s) => s.id === screenId),
          screen = current ?? prior;
        const custom = (design) =>
          design.layouts.filter((c) => c.screen === screen.id);
        if (
          JSON.stringify(prior) === JSON.stringify(current) &&
          JSON.stringify(custom(before)) === JSON.stringify(custom(after))
        )
          continue;
        const left = leftPaints.filter((p) => p.screen === screen.id),
          right = rightPaints.filter((p) => p.screen === screen.id);
        const a = prior && left[0],
          b =
            current &&
            (right.find(
              (p) => JSON.stringify(p.shape) === JSON.stringify(a?.shape),
            ) ??
              right[0]);
        const beforeId = `${id}-v${record.versionAfter}-${screen.id}-before`,
          afterId = `${id}-v${record.versionAfter}-${screen.id}-after`;
        if (a) previews.set(beforeId, a.path);
        if (b) previews.set(afterId, b.path);
        changed.push({
          screen: screen.id,
          title: screen.title,
          before: a ? beforeId : null,
          after: b ? afterId : null,
          unavailable:
            !prior || !current
              ? "This screen is absent from this version."
              : !a || !b
                ? "No matching admitted native paint was retained for this version."
                : null,
        });
      }
      const chosen = record.candidates
        .filter((c) => record.chosen?.candidateIds.includes(c.candidate.id))
        .map((c) => c.candidate.summary);
      versions.push({
        version: record.versionAfter,
        night: record.night,
        reason:
          chosen.join(" ") ||
          record.hypothesis ||
          record.chosen?.rationale ||
          "No reason recorded",
        screens: changed,
      });
    }
    personas.push({
      id,
      description: descriptions[id] ?? "Simulated clinician",
      days,
      versions,
    });
  }
  return {
    data: {
      runId: manifest.runId,
      status: manifest.status,
      mode: manifest.mode ?? "RESEARCH",
      personas,
    },
    previews,
  };
}
export async function serve({ dir, port = 5190 }) {
  dir = resolve(dir);
  const { data, previews } = await overview(dir);
  const { createServer } = await import(
    pathToFileURL(resolve("app/node_modules/vite/dist/node/index.js")).href
  );
  const vite = await createServer({
    configFile: false,
    root: resolve("app"),
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, fs: { allow: [resolve("app")] } },
    appType: "mpa",
  });
  const server = httpServer(async (req, res) => {
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      if (req.headers.host !== new URL(origin).host) {
        res.writeHead(403);
        return res.end("Use loopback");
      }
      const url = new URL(req.url, origin);
      if (req.method !== "GET") {
        res.writeHead(405);
        return res.end("{}");
      }
      if (url.pathname.startsWith("/api/")) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (url.pathname === "/api/run") return res.end(JSON.stringify(data));
        const preview =
          url.pathname === "/api/design" &&
          previews.get(url.searchParams.get("id"));
        if (preview) {
          const stream = createReadStream(preview);
          stream.on("error", () => {
            if (!res.headersSent) res.writeHead(500);
            res.end("{}");
          });
          stream.pipe(res);
          return;
        }
        res.writeHead(404);
        return res.end("{}");
      }
      if (url.pathname === "/") {
        res.writeHead(302, { Location: "/src/browser/discovery/index.html" });
        return res.end();
      }
      vite.middlewares(req, res, () => {
        res.writeHead(404);
        res.end("Not found");
      });
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  await new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(port, "127.0.0.1", res);
  });
  const address = `http://127.0.0.1:${server.address().port}`;
  console.log(`Lean nightly gallery: ${address}`);
  return {
    address,
    close: async () => {
      await vite.close();
      await new Promise((res) => server.close(res));
    },
  };
}
if (process.argv[1] === import.meta.filename) {
  const arg = (k, f) => {
    const i = process.argv.indexOf(k);
    return i < 0 ? f : process.argv[i + 1];
  };
  const dir = arg("--run", null);
  if (!dir)
    throw Error(
      "Usage: node scripts/discovery/serve.mjs --run <dir> [--port 5190]",
    );
  const gallery = await serve({ dir, port: Number(arg("--port", "5190")) });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await gallery.close();
      process.exit(0);
    });
}
