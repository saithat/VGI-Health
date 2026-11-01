import {
  releaseLabel,
  historicalReleaseId,
} from "../../scripts/historical-releases.mjs";
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
  "Restraint care plan omitted",
  "Operative technique omitted from documentation",
  "Vaccination provider address omitted",
  "Medication administration time omitted",
  "Controlled prescription strength omitted",
  "Signing notice hidden",
  "Telehealth consent omitted",
  "Refill eligibility supplied as an unchecked default",
  "Restraint clock restarted",
  "Outdated preoperative history and physical",
  "Expired controlled prescription fill",
  "Minor consent used below the permitted age",
  "Invalid date of birth accepted",
  "Daily methotrexate supplied as a default",
  "Result components hidden",
  "Misleading signing action label",
  "Macro attempts nurse practitioner preoperative signing",
];
export async function buildCatalog() {
  const programs = [];
  const [coreBad] = await readJson("lean/Ehr/Check/bad-program-profiles.json");
  for (const path of [
    ...(await jsonFiles("releases")),
    ...(await jsonFiles("programs")),
    ...(await jsonFiles("runs")),
  ]) {
    if (!/\/(?:canonical|P[1-5]|v\d+|\d\d-[\w-]+)\.json$/.test(path)) continue;
    const program = await readJson(path);
    if (!Array.isArray(program.screens) || typeof program.start !== "string")
      continue;
    const recordedRelease = program.specVersion ?? "v1";
    const bad = /^programs\/bad\/(\d+)/.exec(path);
    const recorded =
      /^runs\/([^/]+)\/(?:programs\/)?(P[1-5])\/v(\d+)\.json$/.exec(path);
    if (path.startsWith("runs/") && !recorded) continue;
    const release = path.startsWith("programs/benchmarks/releases/")
      ? historicalReleaseId(recordedRelease)
      : releaseLabel(recordedRelease, recorded?.[1] ?? "");
    const persona =
      recorded?.[2] ??
      /\/(P[1-5])\.json$/.exec(path)?.[1] ??
      { rn: "P3", np: "P4", surgeon: "P5" }[program.role] ??
      "P1";
    let deployed = false;
    let mock = false;
    let recordedCertificate = null;
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
      if (!mock) {
        try {
          const certificate = await readJson(
            `runs/${recorded[1]}/certs/${persona}/v${program.version}.json`,
          );
          recordedCertificate =
            certificate.verdict === "ok" ? "certified" : "rejected";
        } catch {
          /* A recording without a certificate remains explicitly uncomputed. */
        }
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
      recordedCertificate,
      version: program.version,
      ...(bad
        ? {
            expectedProperty:
              coreBad.find(
                ([name]) => path === `programs/bad/${name}.json`,
              )?.[1] ?? "Full-profile rules",
          }
        : {}),
    });
  }
  const index = await readJson("fixtures/synthea/index.json");
  const hospital = await readJson("fixtures/synthetic-hospital/index.json");
  if (hospital.referenceDate !== index.referenceDate)
    throw new Error("Fixture reference dates disagree");
  const patients = await Promise.all(
    [
      ...index.patients.map((patient) => ({
        ...patient,
        source: "synthea",
        bundlePath: `fixtures/synthea/${patient.file}`,
      })),
      ...hospital.patients.map((patient) => ({
        ...patient,
        source: "synthetic-hospital",
        bundlePath: `fixtures/synthetic-hospital/${patient.file}`,
      })),
    ].map(async (patient) => {
      const bundle = await readJson(patient.bundlePath);
      const encounters = bundle.entry
        .map((e) => e.resource)
        .filter((r) => r.resourceType === "Encounter")
        .sort((a, b) =>
          (b.period?.start ?? "").localeCompare(a.period?.start ?? ""),
        );
      const resources = bundle.entry
        .map((entry) => entry.resource)
        .filter(Boolean);
      const person = resources.find(
        (resource) => resource.resourceType === "Patient",
      );
      const codingText = (concept) =>
        concept?.text ??
        concept?.coding?.find((code) => code.display)?.display ??
        "Not recorded";
      const weights = resources
        .filter(
          (resource) =>
            resource.resourceType === "Observation" &&
            resource.code?.coding?.some(
              (coding) => coding.code === "29463-7",
            ) &&
            resource.valueQuantity,
        )
        .sort((a, b) =>
          (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? ""),
        );
      const weight = weights[0];
      return {
        ...patient,
        encounterClass: encounters[0]?.class?.code ?? "",
        mrn:
          person?.identifier?.find((identifier) =>
            identifier.type?.coding?.some((code) => code.code === "MR"),
          )?.value ?? patient.mrn,
        allergies: resources
          .filter((resource) => resource.resourceType === "AllergyIntolerance")
          .map((resource) => codingText(resource.code)),
        problems: resources
          .filter((resource) => resource.resourceType === "Condition")
          .map((resource) => codingText(resource.code)),
        weight: weight
          ? {
              value: `${weight.valueQuantity.value} ${weight.valueQuantity.unit ?? weight.valueQuantity.code ?? ""}`,
              date: weight.effectiveDateTime ?? "",
            }
          : null,
      };
    }),
  );
  const runs = await Promise.all(
    [
      ...new Set(
        programs.flatMap((program) => (program.run ? [program.run] : [])),
      ),
    ].map(async (id) => {
      const manifest = await readJson(`runs/${id}/manifest.json`);
      return {
        id,
        mock: manifest.ehr?.mode !== "real",
        days: manifest.days ?? 10,
        createdAt: manifest.createdAt ?? "",
      };
    }),
  );
  runs.sort(
    (a, b) =>
      Number(a.mock) - Number(b.mock) ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id),
  );
  // Some archived runs retain legacy top-level copies of the same revision.
  // Prefer the deployment directory so one revision has one replay URL.
  const uniquePrograms = programs.filter(
    (program) =>
      !program.run ||
      program.path.includes("/programs/") ||
      !programs.some(
        (other) =>
          other.run === program.run &&
          other.persona === program.persona &&
          other.version === program.version &&
          other.path.includes("/programs/"),
      ),
  );
  return {
    programs: uniquePrograms,
    patients,
    runs,
    referenceDate: index.referenceDate,
  };
}
