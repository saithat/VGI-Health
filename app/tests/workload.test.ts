import { withData } from "./data";
// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadRun } from "../src/dashboard/data";
import { workloadAt, versionsFor } from "../src/dashboard/workload";

const root = resolve(import.meta.dirname, "../../runs/core-10day");
withData("runs/core-10day").describe("archive-backed tests", () => {
  let run: Awaited<ReturnType<typeof loadRun>>;
  beforeAll(async () => {
  const files = (await readdir(root, { recursive: true })).filter((f) =>
    f.endsWith(".json"),
  );
  run = await loadRun("core-10day", files, async (path) =>
    JSON.parse(
      await readFile(resolve(root, path.replace("/runs/core-10day/", "")), "utf8"),
    ),
  );
  });
  describe("simulated realistic workload", () => {
    it("uses every recorded program version and pools tasks across its days", () => {
      expect(versionsFor(run, "P3")).toEqual([0, 1, 2, 3, 4]);
      const point = workloadAt(run, "P3", 4);
      const tasks = run.days
        .filter((d) => d.persona === "P3" && d.programVersion === 4)
        .flatMap((d) => d.tasks);
      expect(point.days).toEqual([10]);
      expect(point.tasks).toBe(45);
      expect(point.workflows.map((w) => w.workflow)).toEqual(["W4"]);
      expect(point.total?.clicks).toBeCloseTo(
        tasks.reduce((n, t) => n + t.clicks, 0) / 45,
      );
      expect(point.total?.mouseTravelPx).toBeGreaterThan(0);
      expect(point.total?.scrollPx).toBeGreaterThan(0);
      expect(workloadAt(run, "P3", 99).total).toBeNull();
      expect(workloadAt(run, "P1", 0).tasks).toBe(0);
    });
    it("sums workflow means, not workload volume, and accounts for incomplete tasks", () => {
      const day = run.days.find(d => d.persona === "P3");
      const task = day?.tasks[0] && {...day.tasks[0],mouseTravelPx:null,scrollPx:null};
      if (!day || !task) throw new Error("Missing fixture");
      const sample = {
        ...run,
        manifest: {...run.manifest, measurementProtocol: undefined},
        days: [
          {
            ...day,
            programVersion: 0,
            tasks: [
              {
                ...task,
                task: "d01-P3-W1-001",
                clicks: 2,
                keystrokes: 4,
                klmDeciSec: 100,
                completed: true,
              },
              {
                ...task,
                task: "d01-P3-W4-001",
                clicks: 10,
                keystrokes: 6,
                klmDeciSec: 200,
                completed: true,
              },
              {
                ...task,
                task: "d01-P3-W4-002",
                clicks: 20,
                keystrokes: 8,
                klmDeciSec: 400,
                completed: false,
              },
              { ...task, task: "unclassified", clicks: 999, completed: false },
            ],
          },
        ],
      };
      expect(workloadAt(sample, "P3", 0)).toMatchObject({
        tasks: 3,
        completed: 2,
        unclassified: 1,
        total: { clicks: 12, keystrokes: 10,mouseTravelPx:null,scrollPx:null },
      });
    });
    it("loads exact data independently: realistic savings can change with a flat expert minimum", () => {
      const exact = run.complexity?.personas.find((p) => p.persona === "P3");
      expect(exact?.iterations.find((i) => i.version === 3)?.total.clicks).toBe(
        exact?.iterations.find((i) => i.version === 4)?.total.clicks,
      );
      expect(workloadAt(run,'P3',3).total?.mouseTravelPx).toBeGreaterThan(0);
      expect(run.manifest.ehr.mode).toBe("real");
    });
  });
  it("uses blind days and paired active-release canonicals so vendor costs are not agent savings", () => {
    const day=run.days.find(d=>d.persona==='P3'), task=day?.tasks[0]; if(!day||!task)throw new Error('Missing fixture');
    const sample={...run, manifest:{...run.manifest,measurementProtocol:{name:'blind'}},
      days:[{...day,day:1,programVersion:1,tasks:[{...task,clicks:999,completed:true}]},{...day,day:4,programVersion:1,tasks:[{...task,clicks:12,completed:true}]}],
      baselines:[{...day,day:4,tasks:[{...task,clicks:15,completed:true}]}]};
    const point=workloadAt(sample,'P3',1);
    expect(point.days).toEqual([4]);expect(point.total?.clicks).toBe(12);expect(point.canonical?.clicks).toBe(15);expect(point.savings?.clicks).toBe(3);
  });
  it('separates canonical drift from agent saving against the no-agent control and excludes staged versions',()=>{
   const day=run.days.find(d=>d.persona==='P3'),task=day?.tasks[0];if(!day||!task)throw new Error('Missing fixture');
   const actual={...day,day:4,programVersion:1,tasks:[{...task,clicks:10,completed:true}]};
   const sample={...run,manifest:{...run.manifest,measurementProtocol:{name:'blind'}},days:[actual],baselines:[{...actual,tasks:[{...task,clicks:15,completed:true}]}],noAgentDays:[actual]};
   const point=workloadAt(sample,'P3',1);
   expect(point.savings?.clicks).toBe(5);expect(point.agentSavings?.clicks).toBe(0);expect(point.noAgent?.clicks).toBe(10);
   const program=run.programs.get('programs/P3/v0.json');if(!program)throw new Error('Missing program');
   sample.programs=new Map([...sample.programs,['programs/P3/v99.json',{...program,version:99}]]);
   expect(versionsFor(sample,'P3')).toEqual([0,1,2,3,4]);
  });

  it('timeline deltas use the active canonical and all physical metrics for blind runs',async()=>{
   const {workloadDelta}=await import('../src/browser/timeline');
   const day=run.days.find(d=>d.persona==='P3'),task=day?.tasks[0];if(!day||!task)throw new Error('Missing fixture');
   const current={...task,completed:true,clicks:12,keystrokes:8,scrolls:1,scrollPx:900,mouseTravelPx:100};
   const sample={...run,manifest:{...run.manifest,measurementProtocol:{name:'blind'}},days:[{...day,day:2,programVersion:0,tasks:[{...current,clicks:9999}]},{...day,day:4,programVersion:1,tasks:[current]}],baselines:[{...day,day:4,tasks:[{...current,clicks:15,keystrokes:10,scrolls:2,scrollPx:1000,mouseTravelPx:110}]}]};
   expect(workloadDelta(sample,{persona:'P3',baseline:false,program:{version:1}})).toEqual({clicks:-3,keys:-2,scrolls:-1,scrollPx:-100,mouseTravelPx:-10});
  });

});
