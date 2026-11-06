import { createServer, get } from "node:http";
import { mkdtemp, mkdir, writeFile, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { runMiddleware } from "../scripts/runs-plugin";

it("HTTP summary/index and direct artifacts share the marker boundary", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "run-http-"));
  const put = async (file: string, value: unknown) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), JSON.stringify(value));
  };
  await put("runs/live/manifest.json", {
    runId: "live",
    days: 2,
    personas: ["P1"],
    status: "running",
    ehr: { mode: "fake" },
    completionProtocol: "atomic-prefix-v1",
  });
  await put("runs/live/programs/P1/v0.json", { version: 0 });
  await put("runs/live/days/day-01/P1.json", {
    day: 1,
    persona: "P1",
    programVersion: 0,
    tasks: [{ task: "task-1" }],
    trace: [],
  });
  const middleware = runMiddleware(root),
    server = createServer(
      (req, res) =>
        void middleware(req, res, () => {
          res.statusCode = 404;
          res.end();
        }),
    );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test listener");
  const read = (file: string) =>
    new Promise<{ status: number; body: string }>((resolve) =>
      get(`http://127.0.0.1:${address.port}/runs/live/${file}`, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      }),
    );
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await read("days/day-01/P1.json")).status).toBe(404);
    expect(JSON.parse((await read("summary.json")).body).days).toEqual([]);
    await put("runs/live/days/day-01/digest.json.tmp", {
      schemaVersion: 1,
      personas: { P1: "done" },
      contentDigest: "f".repeat(64),
    });
    expect((await read("days/day-01/P1.json")).status).toBe(404);
    await rename(
      path.join(root, "runs/live/days/day-01/digest.json.tmp"),
      path.join(root, "runs/live/days/day-01/digest.json"),
    );
    expect((await read("days/day-01/P1.json")).status).toBe(200);
    const summary = JSON.parse((await read("summary.json")).body);
    expect(summary.days).toHaveLength(1);
    expect(summary.manifest.daysCompleted).toBe(1);
    const committedKey = summary.manifest.prefixKey;
    await put("runs/live/trajectories/index.json", {
      runId: "live",
      tasks: [
        {
          id: "task-1",
          day: 1,
          persona: "P1",
          programVersion: 0,
          file: "tasks/task-1.json",
        },
      ],
    });
    await put("runs/live/trajectories/tasks/task-1.json", {
      source: "committed",
    });
    const incomplete = `runs/live/.cache/completed/${committedKey}/trajectories/tasks/task-1.json`;
    await mkdir(path.dirname(path.join(root, incomplete)), { recursive: true });
    await writeFile(path.join(root, incomplete), "{");
    // A failed/in-flight cache fill cannot shadow complete source evidence.
    expect(
      JSON.parse((await read("trajectories/tasks/task-1.json")).body),
    ).toEqual({ source: "committed" });

    await put("runs/live/programs/P1/v1.json", { version: 1 });
    await put("runs/live/programs/P1/deployed.json", { version: 1 });
    await put("runs/live/decisions/night-01/P1.json", {
      runId: "live",
      night: 1,
      persona: "P1",
      versionBefore: 0,
      versionAfter: 1,
      measured: { test: { day: 2 } },
      flags: ["test-unmeasured: future", "recorded"],
    });
    expect((await read("programs/P1/v1.json")).status).toBe(404);
    expect(
      JSON.parse((await read("programs/P1/deployed.json")).body).version,
    ).toBe(0);
    await put("runs/live/completion/night-01.json", {
      schemaVersion: 1,
      night: 1,
      personas: ["P1"],
      contentDigest: "a".repeat(64),
    });
    expect((await read("programs/P1/v1.json")).status).toBe(200);
    expect(
      JSON.parse((await read("programs/P1/deployed.json")).body).version,
    ).toBe(1);
    const decision = JSON.parse(
      (await read("decisions/night-01/P1.json")).body,
    );
    expect(decision.measured.test).toBeNull();
    expect(decision.flags).toEqual(["recorded"]);
    const pinned = JSON.parse(
      (await read(`.cache/completed/${committedKey}/summary.json`)).body,
    );
    expect(pinned.manifest.nightsCompleted).toBe(0);
    expect(
      (await read(`.cache/completed/${committedKey}/programs/P1/v1.json`))
        .status,
    ).toBe(404);
    expect(
      JSON.parse(
        (
          await read(
            `.cache/completed/${committedKey}/programs/P1/deployed.json`,
          )
        ).body,
      ).version,
    ).toBe(0);
  } finally {
    log.mockRestore();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await rm(root, { recursive: true, force: true });
  }
});
