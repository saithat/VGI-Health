import process from "node:process";
import { pathToFileURL } from "node:url";
import { it, expect } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { acquireBrowserLock } from "../../scripts/browser-heavy-lock.mjs";

it("serializes contenders, permits inherited tokens, opts out, and recovers dead holders", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "browser-lock-test-"));
  const path = resolve(directory, "heavy.lock");
  const env = { EHR_BROWSER_LOCK_PATH: path };
  let held;
  let contender;
  let child;
  try {
    // A dead PID's stale metadata must not block acquiring an unlocked inode.
    writeFileSync(
      `${path}.owner.json`,
      JSON.stringify({ pid: 2147483647, token: "dead" }),
    );
    held = await acquireBrowserLock({ env });
    expect(JSON.parse(readFileSync(`${path}.owner.json`, "utf8")).token).toBe(
      env.EHR_BROWSER_LOCK_TOKEN,
    );
    const inherited = await acquireBrowserLock({ env: { ...env } });
    expect(inherited.inherited).toBe(true);
    inherited.release();
    const off = await acquireBrowserLock({
      env: { EHR_BROWSER_LOCK: "off", EHR_BROWSER_LOCK_PATH: path },
    });
    off.release();
    let acquired = false;
    const messages = [];
    const waiting = acquireBrowserLock({
      env: { EHR_BROWSER_LOCK_PATH: path },
      pollMs: 10,
      log: (message) => messages.push(message),
    }).then((lock) => {
      acquired = true;
      return lock;
    });
    await delay(120);
    expect(acquired).toBe(false);
    expect(messages[0]).toContain(`pid=${process.pid}`);
    expect(messages[0]).toContain("command=");
    expect(messages[0]).toContain("started=");
    held.release();
    held = null;
    contender = await waiting;
    contender.release();
    contender = null;
    // Kill a real owner. EOF on its private pipe must release flock automatically.
    const module = pathToFileURL(
      resolve(process.cwd(), "../scripts/browser-heavy-lock.mjs"),
    ).href;
    child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { acquireBrowserLock } from ${JSON.stringify(module)}; await acquireBrowserLock(); console.log('ready'); setInterval(()=>{},1000);`,
      ],
      {
        env: {
          ...process.env,
          EHR_BROWSER_LOCK_TOKEN: "",
          EHR_BROWSER_LOCK_PATH: path,
        },
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    await new Promise((accept, reject) => {
      child.stdout.once("data", accept);
      child.once("error", reject);
      child.once("exit", () =>
        reject(new Error("Lock owner exited before ready")),
      );
    });
    child.kill("SIGKILL");
    await new Promise((accept) => child.once("exit", accept));
    held = await acquireBrowserLock({
      env: { EHR_BROWSER_LOCK_PATH: path },
      pollMs: 10,
    });
    expect(existsSync(path)).toBe(true); // never unlink the flock inode
  } finally {
    child?.kill();
    held?.release();
    contender?.release();
    // Let lock holders close before removing their test directory.
    await delay(100);
    rmSync(directory, { recursive: true, force: true });
  }
}, 10000);
