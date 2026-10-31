import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { z } from "zod";
import { loadWorld } from "../../agent/src/world";
import { DayScheduleSchema, PERSONAS } from "../src/schema";

it("exports a deterministic agent-loadable world and removes stale days on regeneration", async () => {
  const out = mkdtempSync(join(tmpdir(), "world-cli-"));
  const gen = (days: number) => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", "--seed", "1", "--days", String(days), "--out", out, "--quiet"], {
      cwd: resolve(__dirname, ".."), encoding: "utf8", timeout: 30_000,
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
  };
  try {
    gen(2);
    const world = await loadWorld(out);
    expect(world.manifest).toEqual({ seed: 1, days: 2, personas: PERSONAS });
    for (const p of PERSONAS) {
      expect(world.personas.get(p)?.id).toBe(p);
      expect(await world.schedule(1, p)).toEqual(DayScheduleSchema.parse(JSON.parse(readFileSync(join(out, `day-1-${p}.json`), "utf8"))));
    }
    const manifest = z.object({ files: z.array(z.string()) }).parse(JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")));
    const before = manifest.files.map((f) => readFileSync(join(out, f), "utf8"));
    gen(2);
    expect(manifest.files.map((f) => readFileSync(join(out, f), "utf8"))).toEqual(before);
    gen(1);
    expect(existsSync(join(out, "day-2-P1.json"))).toBe(false);
    expect(existsSync(join(out, "schedules/day-02/P1.json"))).toBe(false);
    expect(existsSync(join(out, "state-day-2.json"))).toBe(false);
    expect(await (await loadWorld(out)).schedule(2, "P1")).toBeNull();
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
