import { withData } from "./data";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { decisionRecordSchema, candidateSchema } from "../../agent/src/schema";
import {
  loadRun,
  programAt,
  readRunJson,
  testPoints,
  type ReadJson,
} from "../src/dashboard/data";
import {
  ReplayScreen,
  renderReplay,
  traceCounters,
  type InterpFactory,
} from "../src/dashboard/replay";
import { htmlSchema } from "../src/ehr/html";

const root = resolve(import.meta.dirname, "../../runs/mock");
withData("runs/mock").describe("archive-backed tests", () => {
  const read: ReadJson = async (path) =>
    JSON.parse(
      await readFile(resolve(root, path.replace("/runs/mock/", "")), "utf8"),
    );
  let files: string[];
  let run: Awaited<ReturnType<typeof loadRun>>;
  beforeAll(async () => {
  files = (await readdir(root, { recursive: true })).filter((file) =>
    file.endsWith(".json"),
  );
  run = await loadRun("mock", files, read);
  });
  afterEach(cleanup);

  describe("recorded dashboard data", () => {
    it("loads the agent directory and validates every decision, day, program and certificate", () => {
      expect(run.records).toHaveLength(46);
      expect(run.days).toHaveLength(50);
      expect(run.programs.size).toBeGreaterThan(20);
      expect(run.certs.size).toBe(run.programs.size);
      expect(run.manifest.ehr.mode).toBe("fake");
      const idle = run.records.filter((r) => r.outcome === "no-change");
      expect(idle).toHaveLength(20);
      expect(idle.every((r) => r.versionBefore === r.versionAfter && r.measured.test === null && r.candidates.length === 0)).toBe(true);
      expect(
        run.records.every((r) => decisionRecordSchema.safeParse(r).success),
      ).toBe(true);
      expect(
        new Set(
          run.records.flatMap((r) =>
            r.candidates.flatMap((c) =>
              c.candidate.seededKind ? [c.candidate.seededKind] : [],
            ),
          ),
        ).size,
      ).toBe(3);
    });
    it("uses the agent Candidate schema, rejecting invalid predictions and unknown move types", () => {
      const candidate = run.records[0]?.candidates[0]?.candidate;
      expect(
        candidateSchema.safeParse({ ...candidate, moveType: "hideSafety" })
          .success,
      ).toBe(false);
      expect(
        candidateSchema.safeParse({ ...candidate, predicted: { clicks: 1.5 } })
          .success,
      ).toBe(false);
    });
    it("rejects corrupt nested records, incorrect run ids, and traversal", async () => {
      const corrupt: ReadJson = async (path) =>
        path.includes("decisions/")
          ? {
              ...decisionRecordSchema.parse(await read(path)),
              candidates: [{ candidate: {} }],
            }
          : read(path);
      await expect(loadRun("mock", files, corrupt)).rejects.toThrow();
      const wrong: ReadJson = async (path) =>
        path.endsWith("manifest.json")
          ? { ...run.manifest, runId: "other" }
          : read(path);
      await expect(loadRun("mock", files, wrong)).rejects.toThrow(
        "does not match",
      );
      await expect(loadRun("../secret", [], read)).rejects.toThrow(
        "Invalid run id",
      );
      await expect(loadRun("mock", ["../secret.json"], read)).rejects.toThrow(
        "Invalid run file",
      );
      await expect(readRunJson("https://example.com/data.json")).rejects.toThrow(
        "Invalid recorded-run path",
      );
    });
    it("cost points come only from measured.test, excluding train/validation and break attempts", () => {
      const points = testPoints(run, "P1");
      expect(points.map((p) => p.day)).toEqual([3, 4, 5, 8, 10]);
      expect(points.every((p) => p.day >= 3)).toBe(true);
      expect(new Set(points.map((p) => p.load))).toEqual(
        new Set(["busy", "quiet"]),
      );
    });
    it("requires recorded programs rather than synthesizing missing real data", () => {
      expect(() => programAt(run, "P1", 999)).toThrow("Missing recorded program");
    });
  });
  describe("Interp replay and painter integration", () => {
    it("passes opaque init state through step/render and forwards exact context inputs", () => {
      const calls: string[] = [];
      const context = {
        persona: "P1",
        spec: { version: "spec" },
        bundle: { opaque: true },
        user: { id: "u" },
      };
      const page = { text: { s: "rendered by interpreter" } };
      const interp = {
        init: (...args: string[]) => {
          calls.push(...args);
          return '{"state":0}';
        },
        step: (...args: string[]) => {
          calls.push(...args);
          return '{"state":{"state":1},"result":"ok"}';
        },
        render: (...args: string[]) => {
          calls.push(...args);
          return JSON.stringify(page);
        },
        view: () => "unused",
        facts: () => "unused",
      };
      expect(
        renderReplay(interp, context, programAt(run, "P1", 0), [
          { click: { comp: "test" } },
        ]),
      ).toEqual(page);
      expect(calls).toContain('{"state":0}');
      expect(calls).toContain('{"state":1}');
      expect(calls).toContain('{"opaque":true}');
    });
    it("replays all paired mock tasks and rejected patches through the existing painter", () => {
      for (const task of run.replay?.tasks ?? []) {
        const screen = render(
          <ReplayScreen
            run={run}
            persona={task.persona}
            version={task.after.version}
            events={task.after.trace.map((t) => t.event)}
          />,
        );
        expect(screen.container.querySelector(".ehr-shell")).not.toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();
        cleanup();
      }
      for (const r of run.records)
        for (const c of r.candidates.filter((c) => c.check.status === "fail")) {
          const screen = render(
            <ReplayScreen
              run={run}
              persona={r.persona}
              version={r.versionBefore}
              patch={c.candidate.patch}
              events={c.check.counterexample ?? []}
            />,
          );
          expect(screen.queryByRole("alert")).toBeNull();
          expect(screen.container.querySelector(".ehr-shell")).not.toBeNull();
          cleanup();
        }
    });
    it("permits injecting a real Interp without selecting the mock", () => {
      let rendered = false;
      const factory: InterpFactory = () => ({
        init: () => "{}",
        step: () => '{"state":{}}',
        view: () => "{}",
        facts: () => "{}",
        render: () => {
          rendered = true;
          return JSON.stringify(
            htmlSchema.parse({ text: { s: "Injected WASM screen" } }),
          );
        },
      });
      const screen = render(
        <ReplayScreen run={run} persona="P1" version={0} factory={factory} />,
      );
      expect(rendered).toBe(true);
      expect(screen.getByText("Injected WASM screen")).toBeTruthy();
    });
    it("counts independent recorded operators and KLM time, with no elapsed wall-clock inflation", () => {
      expect(
        traceCounters(
          [
            { klmDeciSec: 20, ops: ["click", "point"] },
            { klmDeciSec: 28, ops: ["key", "key", "scroll"] },
          ],
          1,
        ),
      ).toEqual({ clicks: 1, keystrokes: 0, scrolls: 0 });
      expect(
        traceCounters([{ klmDeciSec: 28, ops: ["key", "key", "scroll"] }], 100),
      ).toEqual({ clicks: 0, keystrokes: 2, scrolls: 1 });
    });
  });


  it('shows bounded floor tasks as not computed and never compares a partial floor with full workload',async()=>{
   const {complexitySchema}=await import('../src/dashboard/complexity-data');
   const {WorkflowComplexity}=await import('../src/dashboard/WorkflowComplexity');
   const values={clicks:null,keystrokes:null,scrolls:null,scrollPx:null,mouseTravelPx:null,screens:null,requiredFields:null,popups:null};
   const complexity=complexitySchema.parse({schemaVersion:1,runId:'mock',suite:'bounded fixture',search:'Reporting only',personas:[{persona:'P3',iterations:[{version:0,label:'v0',specVersion:'v1',total:values,floor:values,workflows:[{workflow:'W4',metrics:values,floor:values,coverage:{expected:1,computed:0,notComputed:1}}],coverage:{expected:1,computed:0,notComputed:1},tasks:[{status:'not-computed',reason:'search bound',space:null,exact:false}]}],markers:[]}]});
   const view=render(<WorkflowComplexity run={{...run,complexity}} persona="P3"/>);
   // With no complete exact floor the chart opens on workload; switch to the expert measure under test.
   const measure = view.getByLabelText('Complexity measure');
   if (!(measure instanceof HTMLSelectElement)) throw new Error('Expected a native measure selector');
   expect(measure.value).toBe('workload');
   fireEvent.change(view.getByLabelText('Complexity measure'),{target:{value:'expert'}});
   expect(view.getAllByText('not computed (search bound)').length).toBeGreaterThan(0);
   expect(view.getByText(/0\/1 tasks computed; missing tasks excluded/)).toBeTruthy();
   expect(view.queryByRole('img',{name:'P3 union exact expert minimum by UI iteration'})).toBeNull();
  });

});
