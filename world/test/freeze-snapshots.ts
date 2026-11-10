/** Local, gitignored library snapshots. Preserve the pre-change files separately;
 * this command never rewrites either *-original or *-library-legacy directory. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SIM_START_DATE } from "../src/calendar";
import { loadPopulation } from "../src/patients";
import { personaParams } from "../src/personas";
import { PERSONAS } from "../src/schema";
import { generateWorld } from "../src/world";

const root = join(import.meta.dirname, "../..");
const patients = loadPopulation(join(root, "fixtures/synthea/index.json")).patients;
for (const version of [1, 2]) {
  const run = generateWorld(1, 10, patients);
  const dir = join(root, `runs/world/${version}`);
  mkdirSync(dir, {recursive: true});
  const files: string[] = [];
  const write = (name: string, data: unknown) => {
    writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n");
    files.push(name);
  };
  write("world.json", {seed:1,days:10,personas:PERSONAS});
  write("state-day-0.json",run.initial);
  mkdirSync(join(dir,"personas"),{recursive:true});
  for(const p of PERSONAS) write(`personas/${p}.json`,personaParams(p,1,"expert",false));
  for(const d of run.days) {
    write(`state-day-${d.state.day}.json`,d.state);
    mkdirSync(join(dir,`schedules/day-${String(d.state.day).padStart(2,"0")}`),{recursive:true});
    for(const p of PERSONAS) {
      write(`day-${d.state.day}-${p}.json`,d.schedules[p]);
      write(`schedules/day-${String(d.state.day).padStart(2,"0")}/${p}.json`,d.schedules[p]);
    }
  }
  write("snapshot.json",{initial:run.initial,days:run.days});
  write("manifest.json",{seed:1,days:10,startDate:SIM_START_DATE,workflows:"realistic",caseMix:"legacy",worldClock:"legacy",snapshotWard:"current",
    fixtures:{index:"fixtures/synthea/index.json",source:"synthea",patients:patients.length},
    perDay:run.days.map(d=>({day:d.state.day,date:d.state.date})),files:[...files,"manifest.json"]});
}
