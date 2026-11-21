import { AsyncLocalStorage } from "node:async_hooks";

// A day task owns this many native task slots. The outer pool divides a
// persona's budget between active day/policy pairs before entering it.
export const taskSlots = new AsyncLocalStorage<number>();

export function replayWorkers(value = process.env["EHR_MEASURE_WORKERS"]) {
  const workers = Number(value ?? 4);
  if (!Number.isSafeInteger(workers) || workers < 1)
    throw Error("EHR_MEASURE_WORKERS must be a positive integer");
  return workers;
}

// Preserve input order, including which refusal is reported. Drain in-flight
// operations before returning so a failed measure cannot overlap the next one.
export async function mapOrdered<T, R>(
  items: readonly T[],
  workers: number,
  work: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const values: R[] = [];
  let next = 0;
  let failure: { index: number; reason: unknown } | undefined;
  const fail = (index: number, reason: unknown) => {
    if (!failure || index < failure.index) failure = { index, reason };
  };
  async function run() {
    while (!failure && next < items.length) {
      const i = next++;
      try {
        const item = items[i];
        if (item === undefined) throw Error("Missing replay job");
        values[i] = await work(item, i);
      } catch (reason) {
        fail(i, reason);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(items.length, workers) }, run),
  );
  if (failure) throw failure.reason;
  return values;
}

// The geometry store has exact per-result pointers as well as "latest" views.
// If an earlier day finishes late, it must not overwrite the serial winner.
type Publication = { index: number; pending: Promise<void> };
const publicationOrder = new AsyncLocalStorage<{
  index: number;
  latest: Map<string, Publication>;
}>();
export function replayJobs<T, R>(
  items: readonly T[],
  workers: number,
  work: (item: T) => Promise<R>,
) {
  const concurrent = Math.min(workers, 2, items.length);
  const latest = new Map<string, Publication>();
  return mapOrdered(items, concurrent, (item, index) =>
    publicationOrder.run({ index, latest }, () =>
      taskSlots.run(Math.floor(workers / concurrent), () => work(item)),
    ),
  );
}
export async function publishReplayPointer(
  file: string,
  write: () => Promise<void>,
) {
  const order = publicationOrder.getStore();
  if (!order) return write();
  const last = order.latest.get(file);
  if (last && last.index > order.index) return last.pending;
  const pending = last ? last.pending.then(write) : write();
  order.latest.set(file, { index: order.index, pending });
  await pending;
}
