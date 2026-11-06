#!/usr/bin/env node
// Compare stable per-tree verdicts, excluding clocks, paths and fresh certificates.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, contextDigest } from "./screen-results.mjs";

export function screenVerdicts(report) {
  const trees = (entries) =>
    entries
      .map((tree) => {
        if (
          !/^[a-f0-9]{64}$/.test(tree.sha256) ||
          !["pass", "fail"].includes(tree.status) ||
          !Array.isArray(tree.projects)
        )
          throw Error("Incomplete tree verdict");
        return {
          sha256: tree.sha256,
          probe: tree.probe ?? false,
          status: tree.status,
          projects: tree.projects.map(({ project, status }) => ({
            project,
            status,
          })),
        };
      })
      .sort((a, b) => canonical(a).localeCompare(canonical(b)));
  if (report.certificates)
    return report.certificates.map((certificate) => ({
      run: certificate.run,
      persona: certificate.persona,
      version: certificate.version,
      native: certificate.native,
      status: certificate.status,
      screen: certificate.screen,
      trees: trees(certificate.trees),
    }));
  if (!["pass", "fail"].includes(report.status) || !Array.isArray(report.trees))
    throw Error("Incomplete screen report");
  return {
    status: report.status,
    controlsStatus: report.controlsStatus,
    trees: trees(report.trees),
  };
}
export function compareScreenResults(reports) {
  if (reports.length < 2) throw Error("At least two reports required");
  const expected = canonical(screenVerdicts(reports[0]));
  for (const [index, report] of reports.entries())
    if (canonical(screenVerdicts(report)) !== expected)
      throw Error(`Per-tree verdicts differ: report ${index + 1}`);
  return contextDigest(JSON.parse(expected));
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const files = process.argv.slice(2);
  const hash = compareScreenResults(
    files.map((file) => JSON.parse(readFileSync(file, "utf8"))),
  );
  console.log(
    `${files.length} reports have identical per-tree verdicts: ${hash}`,
  );
}
