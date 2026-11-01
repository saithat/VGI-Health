import { readdirSync } from "node:fs";
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildCatalog, readJson } from "../scripts/catalog.mjs";
import { loadEhrInterp } from "../public/ehr/interp-loader.mjs";
import {
  catalogSchema,
  currentProgram,
  defaultPatient,
  programSpecPath,
} from "../src/browser/data";
import { createWasmInterp } from "../src/core/wasmInterp";
import { createSession } from "../src/core/session";

const catalog = catalogSchema.parse(await buildCatalog());
describe("offline live UI catalog", () => {
  it("includes canonical and all persona releases, bad programs, and recorded versions", () => {
    for (const release of ["v1", "v2", "v3"]) {
      expect(
        catalog.programs.filter((program) =>
          program.path.startsWith(`releases/${release}/`),
        ),
      ).toHaveLength(6);
    }
    expect(
      catalog.programs.filter((program) => program.group === "Bad programs"),
    ).toHaveLength(readdirSync(new URL("../../programs/bad/", import.meta.url)).filter((f) => f.endsWith(".json")).length);
    expect(
      catalog.programs.filter((program) => program.run === "mock").length,
    ).toBeGreaterThan(20);
    expect(catalog.patients).toHaveLength(324);
    expect(catalog.patients.filter((p) => p.source === "synthea")).toHaveLength(174);
    expect(catalog.patients.filter((p) => p.source === "synthetic-hospital")).toHaveLength(150);
    expect(defaultPatient(catalog, "P2").encounterClass).toBe("EMER");
    expect(defaultPatient(catalog, "P3").encounterClass).toBe("IMP");
    expect(defaultPatient(catalog, "P4").flags.pediatric).toBe(true);
    expect(defaultPatient(catalog, "P5").flags.surgical).toBe(true);
    expect(currentProgram(catalog, "P1", null).path).toBe(
      "releases/v1/personas/P1.json",
    );
    expect(currentProgram(catalog, "P1", "mock").deployed).toBe(true);
  });
  it("projects every committed bundle and renders every program with real Lean WASM", async () => {
    const interp = createWasmInterp(await loadEhrInterp());
    const context = {
      today: catalog.referenceDate,
      now: 540,
      receipts: [],
      record: [],
    };
    let projection: unknown;
    for (const patient of catalog.patients) {
      const bundle = await readJson(patient.bundlePath);
      const data = JSON.parse(
        interp.facts(JSON.stringify({ bundle, context })),
      );
      expect(data.facts.patientId).toContain(patient.id);
      projection ??= data;
    }
    for (const program of catalog.programs) {
      const session = createSession(
        interp,
        await readJson(programSpecPath(program).slice(1)),
        await readJson(program.path),
        projection,
        { id: program.persona, role: program.role },
      );
      const snapshot = session.getSnapshot();
      expect(snapshot.state.screen, program.path).toBeTruthy();
      expect(snapshot.page, program.path).toHaveProperty("node");
      expect(snapshot.ui, program.path).toHaveProperty("banner");
      expect(snapshot.ui, program.path).toHaveProperty("workspace");
      expect(snapshot.view.screen).toBe(snapshot.state.screen);
    }
    expect(() => interp.facts("{}")).toThrow("Lean:");
  }, 240000);
});
