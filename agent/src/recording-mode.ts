import { z } from "zod";
import { HILLCLIMB } from "./protocol.js";

const supportedMode = z.object({
  screenGate: z.literal("lean"),
  nightMode: z.literal("hillclimb").optional(),
  measurementProtocol: z.object({ name: z.literal(HILLCLIMB) }),
});

export function assertRecordingMode(record: unknown): void {
  if (!supportedMode.safeParse(record).success)
    throw Error("This run was recorded with a removed mode. Replay requires Lean screens and hill climbing.");
}
