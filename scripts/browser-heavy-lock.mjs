// Linux flock is the authority: dead owners release it in the kernel, including
// across PID namespaces. The persistent inode is never unlinked or replaced.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const self = fileURLToPath(import.meta.url);
const ownerFile = (path) => `${path}.owner.json`;
function owner(path) {
  try {
    return JSON.parse(readFileSync(ownerFile(path), "utf8"));
  } catch {
    return null;
  }
}

/** Keep the pipe open even during spawnSync. EOF releases the kernel lock. */
export async function acquireBrowserLock({
  env = process.env,
  log = console.log,
  pollMs = 1000,
} = {}) {
  if (env.EHR_BROWSER_LOCK === "off") return { release() {}, inherited: false };
  const path = resolve(
    env.EHR_BROWSER_LOCK_PATH ??
      resolve(env.TMPDIR ?? tmpdir(), "vgi-browser-heavy.lock"),
  );
  const held = owner(path);
  if (
    env.EHR_BROWSER_LOCK_TOKEN &&
    held?.token === env.EHR_BROWSER_LOCK_TOKEN
  ) {
    const probe = spawnSync("flock", ["-n", path, "true"]);
    if (probe.status === 1) return { release() {}, inherited: true };
  }
  const metadata = {
    pid: process.pid,
    command: process.argv.join(" ").slice(0, 4096),
    startedAt: new Date().toISOString(),
    token: randomUUID(),
  };
  let lastLog = 0;
  for (;;) {
    const child = spawn(
      "flock",
      [
        "-n",
        "-E",
        "75",
        path,
        process.execPath,
        self,
        "--hold",
        path,
        JSON.stringify(metadata),
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let errors = "";
    child.stderr.on("data", (bytes) => {
      errors += bytes;
    });
    const ready = await new Promise((accept, reject) => {
      child.once("error", reject);
      child.stdout.once("data", () => accept(true));
      child.once("exit", (code) => {
        if (code === 75) accept(false);
        else if (code !== 0)
          reject(new Error(`Browser lock failed (${code}): ${errors}`));
      });
    });
    if (ready) {
      env.EHR_BROWSER_LOCK_PATH = path;
      env.EHR_BROWSER_LOCK_TOKEN = metadata.token;
      const release = () => {
        child.stdin.end();
      };
      const onExit = () => {
        child.stdin.destroy();
      };
      process.once("exit", onExit);
      return {
        inherited: false,
        path,
        release: () => {
          process.removeListener("exit", onExit);
          release();
        },
      };
    }
    if (Date.now() - lastLog >= 15_000) {
      const current = owner(path);
      log(
        `Waiting for browser lock ${path}: pid=${current?.pid ?? "unknown"}; command=${current?.command ?? "acquiring"}; started=${current?.startedAt ?? "unknown"}`,
      );
      lastLog = Date.now();
    }
    await delay(pollMs);
  }
}

if (process.argv[1] === self && process.argv[2] === "--hold") {
  const path = process.argv[3];
  const metadata = JSON.parse(process.argv[4]);
  const temporary = `${ownerFile(path)}.${metadata.token}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify({ ...metadata, holderPid: process.pid }),
  );
  renameSync(temporary, ownerFile(path));
  process.stdout.write("locked\n");
  process.stdin.resume();
  process.stdin.on("end", () => {
    if (owner(path)?.token === metadata.token)
      rmSync(ownerFile(path), { force: true });
    process.exit(0);
  });
}
