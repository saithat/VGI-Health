import { z } from "zod";
const nat = z.number().int().nonnegative();
export const ArrivalSchema = z.object({
  arrivalMs: nat, readyMs: nat, priority: nat,
  resultAgeMs: nat,
  deadlineMs: nat.exactOptional(), resultAvailableMs: nat.exactOptional(),
  doseWindows: z.array(z.tuple([z.string(), nat])),
});
export type Arrival = z.infer<typeof ArrivalSchema>;
export const ShiftSchema = z.object({id: z.string(), startMs: nat, endMs: nat});
export type Shift = z.infer<typeof ShiftSchema>;
