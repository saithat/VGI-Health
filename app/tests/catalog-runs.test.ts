import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { completedCatalogRuns } from "../scripts/catalog.mjs";

it("ignores research manifests while retaining strict completion validation for recordings", async () => {
  const root = await mkdtemp(join(tmpdir(), "catalog-runs-"));
  const put = async (name: string, manifest: unknown) => {
    await mkdir(join(root, name), { recursive: true });
    await writeFile(
      join(root, name, "manifest.json"),
      JSON.stringify(manifest),
    );
  };
  try {
    await put("study", { seed: 1, programs: [] });
    await put("recording", {
      runId: "recording",
      days: 1,
      personas: ["P3"],
      ehr: { mode: "real" },
    });
    await mkdir(join(root, "recording/programs/P3"), { recursive: true });
    await writeFile(join(root, "recording/programs/P3/v1.json"), "{}");
    const prefixes = await completedCatalogRuns(root);
    expect([...prefixes.keys()]).toEqual(["recording"]);
    expect(prefixes.get("recording")?.manifest.daysCompleted).toBe(0);
    expect(prefixes.get("recording")?.files).not.toContain(
      "programs/P3/v1.json",
    );
    await put("broken", {
      runId: "broken",
      days: 1,
      personas: [],
      ehr: { mode: "real" },
    });
    await expect(completedCatalogRuns(root)).rejects.toThrow(
      "Invalid run manifest",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
