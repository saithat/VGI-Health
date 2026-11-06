/** Ordered results with bounded work; failures settle siblings before returning. */
export async function orderedPool(items, workers, run) {
  const results = new Array(items.length);
  let next = 0;
  const tasks = Array.from(
    { length: Math.min(Math.max(1, workers), items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        try {
          results[index] = { value: await run(items[index], index) };
        } catch (error) {
          results[index] = { error };
        }
      }
    },
  );
  await Promise.all(tasks);
  const failed = results.find((result) => "error" in result);
  if (failed) throw failed.error;
  return results.map((result) => result.value);
}
export function screenWorkers(env = process.env) {
  return Math.min(
    6,
    Math.max(1, Number.parseInt(env.EHR_SCREEN_WORKERS ?? "4", 10) || 4),
  );
}
