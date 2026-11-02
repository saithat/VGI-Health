import { z } from "zod";
import { subscribeService, marRequest } from "./commitService";

export const boardSchema = z.object({
  state: z.object({
    patients: z.array(
      z.object({
        id: z.string(),
        admitted: z.boolean(),
        bed: z.number().nullable(),
      }),
    ),
    beds: z.array(
      z.object({
        id: z.number(),
        unit: z.string(),
        phase: z.enum(["ready", "occupied", "dirty", "cleaning"]),
        occupant: z.string().nullable(),
      }),
    ),
  }),
  versions: z.array(z.object({ key: z.string(), version: z.number() })),
  roles: z.array(z.enum(["chargeNurse", "bedManager", "admittingClerk"])),
  cursor: z.string(),
});
export type Board = z.infer<typeof boardSchema>;
export type AdtAction =
  "admit" | "assign" | "transfer" | "release" | "discharge" | "clean" | "ready";
export interface AdtIntent {
  requestId: string;
  expected: Board["versions"];
  patient: string;
  action: AdtAction;
  bed?: number;
  source?: number;
}
export const readBoard = async () =>
  boardSchema.parse(await marRequest("/adt/board"));
export const sendAdt = (command: AdtIntent) =>
  marRequest("/adt/commands", command);

/** SSE transports complete durable snapshots. Reconnect compares the version
 * vector digest and receives the current board, including missed changes. */
export function subscribeBoard(
  cursor: string,
  onBoard: (board: Board) => void,
  onError: (error: unknown) => void,
) {
  return subscribeService(
    "/adt/events",
    cursor,
    (value) => onBoard(boardSchema.parse(value)),
    onError,
  );
}
