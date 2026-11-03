import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import type { RunData } from "./data";
import { versionsFor, workloadAt } from "./workload";

const one = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const signed = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
/** Round for reading; the chart data table keeps exact values. */
export const round = (value: number) => one.format(value);
/** Signed delta with a true minus sign; negative means less work. */
export const delta = (value: number) =>
  signed.format(value).replace("-", "−");
export const deltaTone = (value: number) =>
  value < 0 ? "better" : value > 0 ? "worse" : "flat";

/** Small disclosure that keeps method notes one click away instead of on the page. */
export function InfoTip({
  label,
  children,
  align = "left",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <details className={`info-tip ${align}`}>
      <summary aria-label={label} title={label}>
        i
      </summary>
      <div className="info-tip-panel">{children}</div>
    </details>
  );
}

function Tile({
  label,
  value,
  detail,
  tone = "",
}: {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className={`summary-tile ${tone}`}>
      <span className="summary-label">{label}</span>
      <strong className="summary-value">{value}</strong>
      <span className="summary-detail">{detail}</span>
    </div>
  );
}

function effortTile(run: RunData, persona: string) {
  const versions = versionsFor(run, persona);
  const first = versions[0],
    last = versions[versions.length - 1];
  if (first === undefined || last === undefined || first === last) return null;
  const exact = run.complexity?.personas.find((p) => p.persona === persona);
  const at = (v: number) => {
    const i = exact?.iterations.find((i) => i.version === v);
    return i && !i.coverage?.notComputed && typeof i.total.clicks === "number"
      ? i.total.clicks
      : null;
  };
  const [a, b] = [at(first), at(last)];
  if (a !== null && b !== null)
    return {
      label: "Expert minimum clicks",
      from: a,
      to: b,
      detail: `rev ${first} → rev ${last} · fixed benchmark`,
    };
  const [wa, wb] = [workloadAt(run, persona, first), workloadAt(run, persona, last)];
  if (wa.total && wb.total)
    return {
      label: "Typical clicks per workflow",
      from: wa.total.clicks,
      to: wb.total.clicks,
      detail: `rev ${first} → rev ${last} · simulated workload`,
    };
  return null;
}

export function EvolutionSummary({
  run,
  persona,
  rejected,
}: {
  run: RunData;
  persona: string;
  rejected: number;
}) {
  const records = run.records.filter(
    (r) => r.persona === persona && r.mode !== "try-to-break-it",
  );
  const nights = records.filter((r) => !r.release);
  const shipped = nights.filter((r) => r.versionAfter !== r.versionBefore);
  const releases = records.filter((r) => r.release);
  const effort = effortTile(run, persona);
  const blind = [...records].reverse().find((r) => r.measured.test);
  const conformance = run.ruleConformance?.targets.filter(
    (t) => t.kind === "deployed" && t.persona === persona,
  );
  const failures = conformance?.reduce((n, t) => n + t.failed, 0) ?? 0;
  return (
    <div className="evolution-summary" aria-label="Summary">
      {effort ? (
        <Tile
          label={effort.label}
          value={
            <>
              {round(effort.from)} → {round(effort.to)}{" "}
              <em className={deltaTone(effort.to - effort.from)}>
                {effort.from
                  ? `${delta(((effort.to - effort.from) / effort.from) * 100)}%`
                  : ""}
              </em>
            </>
          }
          detail={effort.detail}
        />
      ) : blind?.measured.test ? (
        <Tile
          label="Latest blind test"
          value={
            <span className={deltaTone(-blind.measured.test.saving.clicks)}>
              {delta(-blind.measured.test.saving.clicks)} clicks
            </span>
          }
          detail={`Night ${blind.night} · vs certified canonical · ${blind.measured.test.after.completed}/${blind.measured.test.after.tasks} tasks`}
        />
      ) : (
        <Tile label="Effort" value="—" detail="Not measured in this run" />
      )}
      <Tile
        label="Changes shipped"
        value={shipped.length}
        detail={`of ${nights.length} night${nights.length === 1 ? "" : "s"} · all certified before use`}
      />
      <Tile
        label="Rejected by checker"
        value={rejected}
        detail={
          rejected
            ? "Unsafe proposals blocked · listed below"
            : "No unsafe proposals"
        }
      />
      <Tile
        label="Vendor releases"
        value={
          releases.length
            ? releases
                .map((r) => releaseLabel(r.release?.id ?? "", run.manifest.runId))
                .join(", ")
            : "None"
        }
        detail={
          releases.length
            ? releases.every((r) => r.certificate)
              ? "Merged into this fork and re-certified"
              : "Some releases not re-certified"
            : "No releases during this run"
        }
      />
      <Tile
        label="Rule conformance"
        value={
          !conformance?.length
            ? "—"
            : failures
              ? `${failures} failure${failures === 1 ? "" : "s"}`
              : "All pass"
        }
        tone={failures ? "attention" : ""}
        detail={
          conformance?.length
            ? `${conformance.length} deployed revision${conformance.length === 1 ? "" : "s"} checked · advisory`
            : "Not recorded for this run"
        }
      />
    </div>
  );
}
