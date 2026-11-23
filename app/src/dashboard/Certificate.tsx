import type { DecisionRecord } from "./agent-evidence";
import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import { Badge } from "./Badge";
export function Certificate({ record }: { record: DecisionRecord }) {
  const cert = record.certificate;
  return cert ? (
    <details className="certificate">
      <summary>
        <Badge tone="pass">
          Certificate ·{" "}
          {releaseLabel(cert.specVersion, record.runId)}
        </Badge>
      </summary>
      <dl>
        <dt>Verdict</dt>
        <dd>{JSON.stringify(cert.verdict)}</dd>
        <dt>Spec hash</dt>
        <dd>{cert.specHash}</dd>
        <dt>Program hash</dt>
        <dd>{cert.programHash}</dd>
        <dt>Checker</dt>
        <dd>{cert.checkerVersion}</dd>
        <dt>Issued</dt>
        <dd>{cert.time}</dd>
      </dl>
    </details>
  ) : (
    <Badge>No certificate · {record.certification.result}</Badge>
  );
}
