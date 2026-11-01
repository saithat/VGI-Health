import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "../..");
export const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));
export async function jsonFiles(directory) {
  const entries = await readdir(resolve(root, directory), {
    withFileTypes: true,
  });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? jsonFiles(`${directory}/${entry.name}`)
          : entry.name.endsWith(".json")
            ? [`${directory}/${entry.name}`]
            : [],
      ),
    )
  )
    .flat()
    .sort();
}
const problems = [
  "Allergies hidden on an unopened signing tab",
  "Human-only identity prefilled from chart",
  "Pounds used as dosing weight",
  "Macro attempts alert override and signing",
  "Nurse cosigns their own administration",
  "Yesterday’s weight copied as today’s",
  "Refill decision unreachable",
  "Macro forges consent; anticoagulants removed",
  "Allergy warning removed",
  "Undeclared alert invented",
  "Interaction popup repeated",
  "Passive reminder requests popup",
  "CURES review and exemption paths removed",
  "Macro claims human naloxone offer",
  "Controlled prescription details hidden",
  "Schedule II refills defaulted to three",
];
export async function buildCatalog() {
  const programs = [];
  for (const path of [
    ...(await jsonFiles("releases")),
    ...(await jsonFiles("programs")),
    ...(await jsonFiles("runs")),
  ]) {
    if (!/\/(?:canonical|P[1-5]|v\d+|\d\d-[\w-]+)\.json$/.test(path)) continue;
    const program = await readJson(path);
    if (!Array.isArray(program.screens) || typeof program.start !== "string")
      continue;
    const release = program.specVersion ?? "v1";
    const bad = /^programs\/bad\/(\d+)/.exec(path);
    const recorded = /^runs\/(.+)\/programs\/(P[1-5])\/v(\d+)\.json$/.exec(
      path,
    );
    const persona =
      recorded?.[2] ??
      /\/(P[1-5])\.json$/.exec(path)?.[1] ??
      { rn: "P3", np: "P4", surgeon: "P5" }[program.role] ??
      "P1";
    let deployed = false;
    let mock = false;
    if (recorded) {
      try {
        deployed =
          (
            await readJson(
              `runs/${recorded[1]}/programs/${persona}/deployed.json`,
            )
          ).version === program.version;
      } catch {
        /* No deployment pointer yet. */
      }
      try {
        mock =
          (await readJson(`runs/${recorded[1]}/manifest.json`)).ehr?.mode ===
          "fake";
      } catch {
        /* Unfinished recording. */
      }
    }
    programs.push({
      path,
      release,
      persona,
      role: program.role ?? "physician",
      group: recorded
        ? `Run ${recorded[1]}${mock ? " · MOCK authored" : ""}`
        : bad
          ? "Bad programs"
          : path.startsWith("releases/")
            ? `Release ${release}`
            : "Other programs",
      label: bad
        ? `${bad[1]} · ${problems[Number(bad[1]) - 1] ?? path}`
        : recorded
          ? `${persona} · v${program.version}${deployed ? " · deployed" : ""}`
          : path.includes("/canonical.")
            ? "Canonical source"
            : path.startsWith("releases/")
              ? `${persona} projection`
              : path,
      run: recorded?.[1] ?? null,
      deployed,
      mock,
      version: program.version,
    });
  }
  const index = await readJson("fixtures/synthea/index.json");
  const hospital = await readJson("fixtures/synthetic-hospital/index.json");
  if (hospital.referenceDate !== index.referenceDate)
    throw new Error("Fixture reference dates disagree");
  const patients = await Promise.all(
    [
      ...index.patients.map((patient) => ({ ...patient,
        source: "synthea", bundlePath: `fixtures/synthea/${patient.file}` })),
      ...hospital.patients.map((patient) => ({ ...patient,
        source: "synthetic-hospital", bundlePath: `fixtures/synthetic-hospital/${patient.file}` })),
    ].map(async (patient) => {
      const bundle = await readJson(patient.bundlePath);
      const encounters = bundle.entry
        .map((e) => e.resource)
        .filter((r) => r.resourceType === "Encounter")
        .sort((a, b) =>
          (b.period?.start ?? "").localeCompare(a.period?.start ?? ""),
        );
      return { ...patient, encounterClass: encounters[0]?.class?.code ?? "" };
    }),
  );
  return { programs, patients, referenceDate: index.referenceDate };
}
