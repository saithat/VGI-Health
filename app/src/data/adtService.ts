import { z } from "zod";
import { subscribeService, marRequest } from "./commitService";

export const boardSchema = z.object({
  state: z.object({
    patients: z.array(
      z.object({
        id: z.string(),
        admitted: z.boolean(),
        bed: z.number().nullable(),
        revision: z.number().int().nonnegative().default(0),
        encounter: z.number().int().nonnegative().default(0),
        last: z.object({ kind: z.enum(["admit", "transfer", "discharge"]),
          source: z.number().nullable(), target: z.number().nullable() }).nullable().default(null),
      }),
    ),
    beds: z.array(
      z.object({
        id: z.number(),
        unit: z.string(),
        active: z.boolean().default(true),
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
  "admit" | "assign" | "transfer" | "swap" | "cancelAdmit" | "cancelTransfer" | "cancelDischarge" | "release" | "discharge" | "clean" | "ready";
export interface AdtIntent {
  requestId: string;
  expected: Board["versions"];
  patient: string;
  action: AdtAction;
  bed?: number;
  source?: number;
  other?: string;
  event?: number;
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

export function adtRefusal(reason: string): string {
  const messages: Record<string, string> = {
    version_conflict: "The board changed. Review the refreshed placements and submit a new command.",
    adt_role_forbidden: "Your signed role does not permit this action.",
    adt_swap_requires_distinct_occupied_beds: "Swap requires two different admitted patients in two different active, occupied beds.",
    adt_cancel_not_latest_event: "Cancellation requires the patient's latest ADT event of the selected kind. A later movement or correction prevents cancellation.",
    adt_cancel_admit_placement_changed: "Cancel admission requires the patient to remain in the admission bed.",
    adt_cancel_transfer_requires_current_destination_and_ready_origin: "Cancel transfer requires the patient to remain in the destination and the original bed to be empty and ready after cleaning.",
    adt_cancel_discharge_requires_ready_bed: "Cancel discharge requires a patient who remains discharged and an explicitly selected empty, ready bed.",
    adt_ambiguous_encounter: "The chart has multiple matching inpatient encounters. Encounter reconciliation is required.",
    adt_encounter_missing: "The original inpatient encounter is missing. Encounter reconciliation is required.",
    adt_guard: "Placement refused. Admission and transfer require an empty, ready bed; cleaning must precede ready status.",
  };
  return messages[reason] ?? reason;
}
