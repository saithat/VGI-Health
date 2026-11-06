/** A marker is the last durable write of a whole day/night, across all clinicians.
 * Inventory and URLs refer to the original files; no run is copied or staged.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
export const readJson = async (file) =>
  JSON.parse(await readFile(file, "utf8"));
const pad = (n) => String(n).padStart(2, "0");
export async function runFiles(dir, prefix = "") {
  const entries = await readdir(path.join(dir, prefix), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.endsWith(".tmp")) continue;
    const file = prefix + entry.name;
    if (entry.isDirectory()) files.push(...(await runFiles(dir, file + "/")));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(file);
  }
  return files.sort();
}
export async function completedPrefix(dir, all) {
  const manifest = await readJson(path.join(dir, "manifest.json"));
  if (
    !Array.isArray(manifest.personas) ||
    !manifest.personas.length ||
    manifest.personas.some((p) => !/^P[1-5]$/.test(p)) ||
    new Set(manifest.personas).size !== manifest.personas.length ||
    !Number.isSafeInteger(manifest.days) ||
    manifest.days < 1
  )
    throw new Error("Invalid run manifest");
  all ??= await runFiles(dir);
  const available = new Set(all),
    versions = new Map(manifest.personas.map((p) => [p, new Set()])),
    markers = [];
  let daysCompleted = 0,
    nightsCompleted = 0;
  for (let day = 1; day <= (manifest.daysPlanned ?? manifest.days); day++) {
    const dayPrefix = `days/day-${pad(day)}/`,
      dayMarker = dayPrefix + "digest.json";
    if (!available.has(dayMarker)) break;
    if (available.has(dayMarker)) {
      const marker = await readJson(path.join(dir, dayMarker));
      if (
        marker.schemaVersion !== 1 ||
        !manifest.personas.every(
          (p) => typeof marker.personas?.[p] === "string",
        )
      )
        throw new Error("Invalid day completion marker");
      markers.push(marker);
    }
    for (const persona of manifest.personas) {
      const row = await readJson(path.join(dir, dayPrefix + persona + ".json"));
      if (
        row.day !== day ||
        row.persona !== persona ||
        !Number.isSafeInteger(row.programVersion)
      )
        throw new Error("Invalid committed day");
      versions.get(persona).add(row.programVersion);
    }
    daysCompleted = day;
    if (day === (manifest.daysPlanned ?? manifest.days)) break;
    const nightMarker = `completion/night-${pad(day)}.json`;
    if (!available.has(nightMarker)) break;
    if (available.has(nightMarker)) {
      const marker = await readJson(path.join(dir, nightMarker));
      if (
        marker.schemaVersion !== 1 ||
        marker.night !== day ||
        !manifest.personas.every((p) => marker.personas?.includes(p))
      )
        throw new Error("Invalid night completion marker");
      markers.push(marker);
    }
    for (const persona of manifest.personas) {
      const row = await readJson(
        path.join(dir, `decisions/night-${pad(day)}/${persona}.json`),
      );
      if (
        row.night !== day ||
        row.persona !== persona ||
        row.runId !== manifest.runId
      )
        throw new Error("Invalid committed night");
      versions.get(persona).add(row.versionBefore);
      versions.get(persona).add(row.versionAfter);
    }
    nightsCompleted = day;
  }
  const files = all.filter((file) => {
    if (
      !daysCompleted &&
      /^(?:replay\.json|complexity\.json|conformance\.json|trajectories\/)/.test(
        file,
      )
    )
      return false;
    const day = /^(?:days|baselines|no-agent\/days)\/day-(\d+)\//.exec(file);
    if (day) return +day[1] <= daysCompleted;
    const night = /^decisions\/night-(\d+)\//.exec(file);
    if (night) return +night[1] <= nightsCompleted;
    const version =
      /^(?:programs|certs|certifications|native)\/(P[1-5])\/v(\d+)(?:\.|\/)/.exec(
        file,
      );
    if (version) return versions.get(version[1])?.has(+version[2]);
    if (/^break\/P[1-5]-[\w-]+\.json$/.test(file)) return true;
    // Deploy pointers can advance ahead of the night fence. Serve a virtual
    // pointer in the data layer, never the writer's in-flight pointer.
    return /^(?:manifest\.json|replay\.json|complexity\.json|conformance\.json|trajectories\/|geometry\/)/.test(
      file,
    );
  });
  const key = createHash("sha256")
    .update(
      JSON.stringify({
        markers,
        daysCompleted,
        nightsCompleted,
        versions: [...versions].map(([p, v]) => [p, [...v]]),
      }),
    )
    .digest("hex");
  return {
    manifest: { ...manifest, daysCompleted, nightsCompleted, prefixKey: key },
    files,
    versions,
    key,
    dir,
  };
}
