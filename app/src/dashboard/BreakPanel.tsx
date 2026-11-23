import { useEffect, useState } from "react";
import { breakCapability, submitBreakAttempt, type RunData } from "./data";
import { getRejections, type Rejection } from "./rejections";
export function BreakPanel({
  run,
  replay,
  persona,
}: {
  run: RunData;
  persona: string;
  replay: (rejection: Rejection) => void;
}) {
  const attacks = getRejections(run).filter(
    (r) => !r.id.startsWith("release-"),
  );
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Rejection | null>(null);
  const attack = attacks.find((a) => a.id === selected) ?? attacks[0];
  const [capability, setCapability] = useState({
    available: false,
    reason: "Checking local agent…",
  });
  const [request, setRequest] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void breakCapability()
      .then((c) =>
        setCapability({ available: c.available, reason: c.reason ?? "" }),
      )
      .catch((e) => setCapability({ available: false, reason: String(e) }));
  }, []);
  async function attempt() {
    setPending(true);
    setMessage("Running agent and checker…");
    try {
      const response = await submitBreakAttempt(
        persona,
        request,
        run.manifest.runId,
      );
      setMessage(
        `${response.verdict}: ${response.property ?? ""} ${response.message ?? response.agentSays}`,
      );
      const record = [...run.records]
        .reverse()
        .find((r) => r.persona === persona);
      if (record && response.candidate)
        setResult({
          id: "live-attempt",
          label: response.request,
          summary: response.candidate.summary,
          record: { ...record, versionBefore: record.versionAfter },
          check: {
            status: response.verdict,
            property: response.property,
            message: response.message,
            counterexample: response.counterexample,
            screens: null,
            verdict: null,
          },
          patch: response.candidate.patch,
          targets: [],
        });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPending(false);
    }
  }

  const rules = [
    ...attacks
      .reduce((counts, a) => {
        const rule = a.check.property ?? a.check.status;
        return counts.set(rule, (counts.get(rule) ?? 0) + 1);
      }, new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1]);
  return (
    <div className="break-panel">
      <p className="break-intro">
        Every proposal here was blocked by the checker before it reached a
        clinician. Pick one to see which safety rule it broke, then replay the
        counterexample on the EHR.
      </p>
      {rules.length > 0 && (
        <div className="break-rules" aria-label="Rules broken in this run">
          <span className="summary-label">
            {attacks.length} rejected proposal{attacks.length === 1 ? "" : "s"}{" "}
            in this run
          </span>
          {rules.map(([rule, count]) => (
            <span key={rule} className="break-rule">
              {rule} <strong>×{count}</strong>
            </span>
          ))}
        </div>
      )}
      <form
        className="break-form"
        onSubmit={(e) => {
          e.preventDefault();
          setResult(attack ?? null);
        }}
      >
        <label>
          Recorded proposal{" "}
          <select
            value={attack?.id ?? ""}
            disabled={!attacks.length}
            title={
              !attacks.length ? "No recorded proposals in this run" : undefined
            }
            onChange={(e) => {
              setSelected(e.currentTarget.value);
              setResult(null);
            }}
          >
            {attacks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!attack || result?.id === attack.id}
          title={
            !attack
              ? "No recorded proposal available"
              : result?.id === attack.id
                ? "Already showing this recorded verdict"
                : undefined
          }
        >
          Show recorded verdict
        </button>
      </form>
      {!attacks.length && <p>No rejected proposals recorded in this run.</p>}
      {result && (
        <section className="break-result">
          <span className="summary-label">
            {result.check.status === "pass"
              ? "Accepted"
              : result.check.status === "invalid-patch"
                ? "Invalid patch"
                : "Rejected"}
          </span>
          <h3>{result.summary || result.label}</h3>
          <div className="failure-message">
            <strong>{result.check.property ?? result.check.status}</strong>
            <p>{result.check.message}</p>
          </div>
          {result.check.status === "fail" &&
          result.check.counterexample !== null ? (
            <p className="break-replay">
              <button onClick={() => replay(result)}>
                Replay counterexample
              </button>
              <span className="effect-caption">
                {result.check.counterexample?.length ?? 0} recorded events that
                reach the unsafe state
              </span>
            </p>
          ) : (
            <p className="effect-caption">
              No counterexample was returned for this verdict.
            </p>
          )}
        </section>
      )}
      <section className="break-live">
        <h3>Try your own</h3>
        {capability.available && run.manifest.ehr.mode === "real" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void attempt();
            }}
          >
            <label>
              Live request{" "}
              <textarea
                value={request}
                rows={3}
                maxLength={2000}
                placeholder={`Ask the ${persona} agent for a UI change, e.g. “hide the allergy panel to save a click”`}
                onChange={(e) => setRequest(e.currentTarget.value)}
              />
            </label>
            <button
              type="submit"
              disabled={pending || !request.trim()}
              title={
                pending
                  ? "An attempt is running"
                  : !request.trim()
                    ? "Enter a request first"
                    : undefined
              }
            >
              Run live attempt
            </button>
          </form>
        ) : (
          <p className="effect-caption">
            Live attempts are unavailable:{" "}
            {capability.reason || "live attempts are unavailable"}. Recorded examples
            above always work.
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
    </div>
  );
}
