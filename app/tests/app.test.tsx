// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildCatalog, readJson } from "../scripts/catalog.mjs";
import { loadEhrInterp } from "../public/ehr/interp-loader.mjs";
import {
  catalogSchema,
  currentProgram,
  defaultPatient,
} from "../src/browser/data";
import { createWasmInterp } from "../src/core/wasmInterp";
import { createSession } from "../src/core/session";

const catalog = catalogSchema.parse(await buildCatalog());
describe("offline live UI catalog", () => {
  it("includes canonical and all persona releases, bad programs, and recorded versions", () => {
    for (const release of ["v1", "v1.1", "v2"]) {
      expect(
        catalog.programs.filter((program) =>
          program.path.startsWith(`releases/${release}/`),
        ),
      ).toHaveLength(6);
    }
    expect(
      catalog.programs.filter((program) => program.group === "Bad programs"),
    ).toHaveLength(16);
    expect(
      catalog.programs.filter((program) => program.run === "mock").length,
    ).toBeGreaterThan(20);
    expect(catalog.patients).toHaveLength(174);
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
      const bundle = await readJson(`fixtures/synthea/${patient.file}`);
      const data = JSON.parse(
        interp.facts(JSON.stringify({ bundle, context })),
      );
      expect(data.facts.patientId).toContain(patient.id);
      projection ??= data;
    }
    for (const program of catalog.programs) {
      const session = createSession(
        interp,
        await readJson(`releases/${program.release}/spec.json`),
        await readJson(program.path),
        projection,
        { id: program.persona, role: program.role },
      );
      const snapshot = session.getSnapshot();
      expect(snapshot.state.screen, program.path).toBeTruthy();
      expect(snapshot.page, program.path).toHaveProperty("node");
      expect(snapshot.view.screen).toBe(snapshot.state.screen);
    }
    expect(() => interp.facts("{}")).toThrow("Lean:");
  }, 20000);
});
