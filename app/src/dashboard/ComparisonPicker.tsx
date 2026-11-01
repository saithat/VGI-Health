import type { CompareOption } from "./trajectory-compare";
import { optionLabel } from "./trajectory-compare";

export function ComparisonPicker({
  side,
  options,
  selected,
  onSelect,
}: {
  side: "Left" | "Right";
  options: CompareOption[];
  selected: CompareOption | undefined;
  onSelect: (key: string) => void;
}) {
  const days = [...new Set(options.map((option) => option.entry.day))].sort(
    (a, b) => a - b,
  );
  const dayOptions = options.filter(
    (option) => option.entry.day === selected?.entry.day,
  );
  const revisions = [
    ...new Set(dayOptions.map((option) => option.entry.programVersion)),
  ].sort((a, b) => a - b);
  const choose = (pool: CompareOption[]) => {
    const sameType = pool.find(
      (option) =>
        option.source === selected?.source &&
        option.entry.id.split("-").at(-1) ===
          selected.entry.id.split("-").at(-1),
    );
    const next =
      sameType ??
      pool.find((option) => option.source === selected?.source) ??
      pool[0];
    if (next) onSelect(next.key);
  };
  return (
    <div className="comparison-picker">
      <strong>{side}</strong>
      <div className="comparison-day-revision">
        <label>
          Day{" "}
          <select
            aria-label={`${side} day`}
            value={selected?.entry.day ?? ""}
            disabled={days.length < 2}
            onChange={(event) =>
              choose(
                options.filter(
                  (option) => option.entry.day === Number(event.target.value),
                ),
              )
            }
          >
            {days.map((day) => (
              <option key={day} value={day}>
                Day {day}
              </option>
            ))}
          </select>
        </label>
        <label>
          Revision{" "}
          <select
            aria-label={`${side} revision`}
            value={selected?.entry.programVersion ?? ""}
            disabled={revisions.length < 2}
            onChange={(event) =>
              choose(
                dayOptions.filter(
                  (option) =>
                    option.entry.programVersion === Number(event.target.value),
                ),
              )
            }
          >
            {revisions.map((revision) => (
              <option key={revision} value={revision}>
                rev {revision}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Task{" "}
        <select
          aria-label={`${side} trajectory`}
          value={selected?.key ?? ""}
          onChange={(event) => onSelect(event.target.value)}
        >
          {dayOptions
            .filter(
              (option) =>
                option.entry.programVersion === selected?.entry.programVersion,
            )
            .map((option) => (
              <option key={option.key} value={option.key}>
                {optionLabel(option)}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}
