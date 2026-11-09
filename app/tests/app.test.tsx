import { withData } from "./data";
import { readdirSync } from "node:fs";
// @vitest-environment node
import { beforeAll, describe, expect } from "vitest";
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
import type { UiNode } from "../src/ehr/ui/types";

let catalog: ReturnType<typeof catalogSchema.parse>;
describe("offline live UI catalog", () => {
  beforeAll(async () => { catalog = catalogSchema.parse(await buildCatalog()); });
  withData("fixtures", "programs/bad", "runs/mock").it("renders a nonempty chart search for every committed patient without runtime exceptions", async () => {
    const interp = createWasmInterp(await loadEhrInterp());
    const spec = await readJson("releases/v3/spec.json");
    const program = await readJson("releases/v3/personas/P1.json");
    const infos = (nodes: UiNode[]): { infoId: string; rows: unknown[] }[] =>
      nodes.flatMap((node) =>
        "info" in node
          ? [node.info]
          : "section" in node
            ? infos(node.section.children)
            : "columns" in node
              ? infos(node.columns.children)
              : "tabs" in node
                ? infos(node.tabs.body)
                : [],
      );
    for (const patient of catalog.patients) {
      const facts = JSON.parse(
        interp.facts(
          JSON.stringify({
            bundle: await readJson(patient.bundlePath),
            context: {
              today: catalog.referenceDate,
              now: 540,
              receipts: [],
              record: [],
            },
          }),
        ),
      );
      const directory = JSON.parse(
        interp.facts(
          JSON.stringify({
            bundle: await readJson(patient.bundlePath),
            directoryOnly: true,
            context: {
              today: catalog.referenceDate,
              now: 540,
              receipts: [],
              record: [],
            },
          }),
        ),
      );
      facts.facts.patientDirectory = directory.facts.patientDirectory;
      const session = createSession(interp, spec, program, facts, {
        id: "P1",
        role: "physician",
      });
      expect(session.getSnapshot().ui?.banner).toEqual([]);
      session.dispatch({ click: { comp: "workspace.lookup" } });
      session.dispatch({
        search: {
          query:
            directory.facts.patientDirectory.patients[0].mrn || patient.name,
        },
      });
      session.dispatch({
        click: {
          comp: `workspace.open|${facts.facts.sourcePatientId}|0|lookup`,
        },
      });
      session.dispatch({ scroll: { screen: "home" } });
      expect(session.getSnapshot().state.patientContext?.bound).toBe(
        facts.facts.sourcePatientId,
      );
      expect(session.getSnapshot().state.screen).toBe("chartSummary");
      const search = session
        .getSnapshot()
        .ui?.workspace.find(
          (node) => "field" in node && node.field.kind === "search",
        );
      if (!search || !("field" in search))
        throw new Error("Current chart has no semantic search");
      session.dispatch({
        enter: { comp: search.field.comp, value: { text: { s: "72" } } },
      });
      const snapshot = session.getSnapshot();
      expect(snapshot.result, patient.name).toBe("ok");
      const result = infos(snapshot.ui?.workspace ?? []).find(
        (info) => info.infoId === "searchResults",
      );
      expect(result, patient.name).toBeDefined();
      expect(result?.rows.length, patient.name).toBeGreaterThan(0);
      expect(result?.rows.length, patient.name).toBeLessThanOrEqual(26);
    }
  }, 240000);
  withData("fixtures", "programs/bad", "runs/mock").it("includes canonical and all persona releases, bad programs, and recorded versions", () => {
    for (const release of ["v1", "v2", "v3"]) {
      expect(
        catalog.programs.filter((program) =>
          program.path.startsWith(`releases/${release}/`),
        ),
      ).toHaveLength(6);
    }
    expect(
      catalog.programs.filter((program) => program.group === "Bad programs"),
    ).toHaveLength(
      readdirSync(new URL("../../programs/bad/", import.meta.url)).filter((f) =>
        f.endsWith(".json"),
      ).length,
    );
    expect(
      catalog.programs.filter((program) => program.run === "mock").length,
    ).toBeGreaterThan(20);
    expect(catalog.patients).toHaveLength(1442);
    expect(catalog.patients.filter((p) => p.source === "synthea")).toHaveLength(
      174,
    );
    expect(
      catalog.patients.filter((p) => p.source === "synthetic-hospital"),
    ).toHaveLength(1268);
    expect(defaultPatient(catalog, "P2").encounterClass).toBe("EMER");
    expect(defaultPatient(catalog, "P3").encounterClass).toBe("IMP");
    expect(defaultPatient(catalog, "P4").flags.pediatric).toBe(true);
    expect(defaultPatient(catalog, "P5").flags.surgical).toBe(true);
    expect(currentProgram(catalog, "P1", null).path).toBe(
      "releases/v1/personas/P1.json",
    );
    expect(currentProgram(catalog, "P1", "mock").deployed).toBe(true);
  });
  withData("fixtures", "programs/bad", "runs/mock").it("projects every committed bundle and renders every program with real Lean WASM", async () => {
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
      if (snapshot.state.patientContext) {
        expect(snapshot.ui?.banner, program.path).toEqual([]);
        expect(snapshot.ui?.side, program.path).toEqual([]);
        expect(snapshot.state.captured, program.path).toEqual([]);
        expect(snapshot.page, program.path).toHaveProperty("text");
      } else expect(snapshot.page, program.path).toHaveProperty("node");
      expect(snapshot.ui, program.path).toHaveProperty("banner");
      expect(snapshot.ui, program.path).toHaveProperty("workspace");
      expect(snapshot.view.screen).toBe(snapshot.state.screen);
    }
    expect(() => interp.facts("{}")).toThrow("Lean:");
  }, 240000);
});
