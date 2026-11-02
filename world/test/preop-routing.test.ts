import { dataReason } from "./data";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DayScheduleSchema, PERSONAS } from "../src/schema";

const root = resolve(__dirname, "../..");

[1, 2].forEach((revision) => {
  const reason = dataReason(`runs/world/${revision}`);
  describe.skipIf(Boolean(reason))(`world ${revision} surgical routing${reason ? ` (${reason})` : ""}`, () => {
  it("routes every pre-op or surgical-day step only to the surgical team (P5)", () => {
    let surgical = 0;
    let preop = 0;
    for (let day = 1; day <= 10; day++) {
      for (const persona of PERSONAS) {
        const file = join(root, `runs/world/${revision}/day-${day}-${persona}.json`);
        const schedule = DayScheduleSchema.parse(JSON.parse(readFileSync(file, "utf8")));
        for (const task of schedule.tasks) {
          if (task.workflow !== "W6" && task.choices.w6Step === undefined) continue;
          surgical++;
          if (task.choices.w6Step === "preop") preop++;
          expect(persona, `${file}: ${task.id}`).toBe("P5");
          const user = JSON.parse(readFileSync(join(root, `runs/world/${revision}/personas/${persona}.json`), "utf8"));
          expect(user.role).toBe("surgeon");
        }
      }
    }
    expect(surgical).toBeGreaterThan(0);
    expect(preop).toBeGreaterThan(0);
  });
});
});
