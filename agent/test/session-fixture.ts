/** Fake backend only; shared by desktop review tests and the offline smoke artifact. */
import { createFakeEhr } from "../src/fake/ehr-fake.js";
import { fakeCanonical } from "../src/fake/fixtures.js";
import { FAKE_PERSONAS, fakeSchedule } from "../src/fake/world.js";
import {
  answerSession,
  prepareSession,
  type ArchivedSessionBundle,
} from "../src/session.js";
import { seededSessionChooser } from "../src/session-simulator.js";
export async function fakeRecordedSession() {
  const ehr = createFakeEhr(),
    current = fakeCanonical("v1");
  const persona = FAKE_PERSONAS[0];
  if (!persona) throw new Error("Missing fake persona");
  const candidates: ArchivedSessionBundle[] = [];
  for (let i = 1; i <= 3; i++) {
    const program = structuredClone(current);
    program.version = i;
    const screen = program.screens[i];
    if (!screen) throw new Error("Missing fake screen");
    screen.components.reverse();
    const result = await ehr.deploy({
      specVersion: "v1",
      program,
      prev: current,
      canonical: current,
      outDir: "",
    });
    if (!result.deployed) throw new Error("Fake candidate rejected");
    candidates.push({
      id: `layout-${i}`,
      label: `Screen ${i + 1} reordered`,
      program,
      certificate: result.certificate,
    });
  }
  const session = await prepareSession({
    id: "simulated-weekly-demo",
    createdAt: "2026-11-03T18:00:00Z",
    phase: "offShift",
    cadence: "weekly",
    asOfDay: 3,
    current,
    canonical: current,
    persona,
    recentDays: [fakeSchedule(2, "P1", 7), fakeSchedule(3, "P1", 7)],
    worldDir: "",
    seed: 7,
    ehr,
    archive: { candidates: async () => candidates },
    flags: [
      {
        kind: "friction",
        id: "slow-orders",
        clinician: current.owner,
        programHash: "fake-trace-program",
        day: 2,
        task: "d02-P1-t01",
        t: 30,
        screen: "w1-orders",
        signal: { kind: "slowHere" },
      },
    ],
  });
  return answerSession(session, seededSessionChooser(7, session.clinician));
}

if (process.argv.includes("--emit-session"))
  console.log(JSON.stringify(await fakeRecordedSession()));
