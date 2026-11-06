import { loadRunSummary, loadRunEvidence, type RunData } from "./data";

export const isRunning = (status?: string) =>
  status === "initializing" || status === "running";

/** One request at a time; stop polling terminal runs and ignore late replies. */
export function watchRun(
  id: string,
  update: (run: RunData) => void,
  failed: (error: unknown) => void,
  load = loadRunSummary,
  interval = 30_000,
  evidence = loadRunEvidence,
) {
  let active = true;
  let latest: RunData | undefined;
  let currentPrefix = "";
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = async () => {
    let again = true;
    try {
      const run = await load(id);
      if (!active) return;
      latest = run;
      const prefix =
        run.manifest.prefixKey ??
        `${run.manifest.daysCompleted ?? run.days.length}`;
      currentPrefix = prefix;
      update(run);
      if (
        !pending.has(prefix) &&
        run.files?.some(
          (file) =>
            (file === "complexity.json" && !run.complexity) ||
            (file === "conformance.json" && !run.ruleConformance),
        )
      ) {
        pending.add(prefix);
        void evidence(run)
          .then((next) => {
            if (active && currentPrefix === prefix && latest) {
              latest = {
                ...latest,
                complexity: next.complexity,
                ruleConformance: next.ruleConformance ?? null,
              };
              update(latest);
            }
          })
          .catch((error) => {
            if (active && currentPrefix === prefix) failed(error);
          })
          .finally(() => pending.delete(prefix));
      }
      again = isRunning(run.manifest.status);
    } catch (error) {
      if (active) failed(error);
    }
    if (active && again) timer = setTimeout(() => void refresh(), interval);
  };
  void refresh();
  return () => {
    active = false;
    clearTimeout(timer);
  };
}
