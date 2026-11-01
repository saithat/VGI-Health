import type {
  MedicationAdministration,
  MedicationRequest,
  Timing,
} from "@medplum/fhirtypes";

export function orderTiming(frequency: string, start: string): Timing {
  const repeat: Record<string, [number, number, "d" | "h" | "wk"]> = {
    daily: [1, 1, "d"],
    BID: [2, 1, "d"],
    bid: [2, 1, "d"],
    TID: [3, 1, "d"],
    tid: [3, 1, "d"],
    QID: [4, 1, "d"],
    qid: [4, 1, "d"],
    q4h: [1, 4, "h"],
    q6h: [1, 6, "h"],
    q8h: [1, 8, "h"],
    q12h: [1, 12, "h"],
    weekly: [1, 1, "wk"],
  };
  const schedule = repeat[frequency];
  return {
    code: { text: frequency },
    ...(schedule
      ? {
          repeat: {
            frequency: schedule[0],
            period: schedule[1],
            periodUnit: schedule[2],
            boundsPeriod: { start },
          },
        }
      : {}),
  };
}

/** Home worklist only. Interpret explicit FHIR timing; incomplete or PRN orders
 * stay labeled as such. Never invent due times from a narrative sig. */
export function medicationDue(
  order: MedicationRequest,
  administrations: MedicationAdministration[],
  now: string,
): { status: string; due?: string } {
  const dosage = order.dosageInstruction?.[0];
  if (!dosage) return { status: "Schedule not recorded" };
  if (dosage.asNeededBoolean || dosage.asNeededCodeableConcept)
    return { status: "PRN" };
  const timing = dosage.timing;
  const repeat = timing?.repeat;
  const clock = Date.parse(now);
  const start = repeat?.boundsPeriod?.start;
  const last = administrations
    .filter(
      (a) =>
        a.request?.reference === `MedicationRequest/${order.id}` &&
        a.status === "completed",
    )
    .map((a) => Date.parse(a.effectiveDateTime ?? a.effectivePeriod?.end ?? ""))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  let due: number | undefined;
  if (
    repeat?.count &&
    administrations.filter(
      (a) =>
        a.request?.reference === `MedicationRequest/${order.id}` &&
        a.status === "completed",
    ).length >= repeat.count
  )
    return { status: "Schedule complete" };
  if (repeat?.timeOfDay?.length) {
    const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dates = Array.from({ length: 8 }, (_, offset) => {
      const date = new Date(clock);
      date.setDate(date.getDate() + offset);
      return date;
    });
    due = dates
      .filter(
        (date) =>
          !repeat.dayOfWeek?.length ||
          repeat.dayOfWeek.some((day) => day === weekdays[date.getDay()]),
      )
      .flatMap((date) => {
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return (
          repeat.timeOfDay?.map((time) => Date.parse(`${localDate}T${time}`)) ??
          []
        );
      })
      .filter(
        (time) =>
          Number.isFinite(time) &&
          time > (last ?? Number.NEGATIVE_INFINITY) &&
          (!start || time >= Date.parse(start)),
      )
      .sort((a, b) => a - b)[0];
  } else if (
    repeat?.period &&
    repeat.frequency === 1 &&
    repeat.periodUnit &&
    start &&
    !repeat.dayOfWeek?.length &&
    !repeat.when?.length
  ) {
    const units: Record<string, number> = {
      s: 1000,
      min: 60000,
      h: 3600000,
      d: 86400000,
      wk: 604800000,
    };
    const multiplier = units[repeat.periodUnit];
    if (multiplier) {
      const interval = (multiplier * repeat.period) / repeat.frequency;
      due = last !== undefined ? last + interval : Date.parse(start);
    }
  } else if (timing?.event?.length) {
    due = timing.event
      .map(Date.parse)
      .filter(
        (time) =>
          Number.isFinite(time) && time > (last ?? Number.NEGATIVE_INFINITY),
      )
      .sort((a, b) => a - b)[0];
  }
  if (due === undefined || !Number.isFinite(due))
    return { status: "Schedule needs review" };
  if (repeat?.boundsPeriod?.end && due > Date.parse(repeat.boundsPeriod.end))
    return { status: "Schedule complete" };
  return {
    status:
      due < clock - 3600000 ? "Overdue" : due <= clock ? "Due" : "Scheduled",
    due: new Date(due).toISOString(),
  };
}
