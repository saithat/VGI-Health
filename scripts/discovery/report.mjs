#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const lines = async (p) =>
  (await readFile(p, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
async function decisions(root) {
  const out = [];
  for (const dir of await readdir(join(root, "decisions")).catch(() => []))
    for (const file of await readdir(join(root, "decisions", dir)))
      if (file.endsWith(".json"))
        out.push(await read(join(root, "decisions", dir, file)));
  return out;
}
export async function report(root) {
  const manifest = await read(join(root, "manifest.json"));
  if (manifest.screenGate !== "lean") throw Error("Not a Lean-screen run");
  const admissions = await lines(
      join(root, "reports/lean-screens/admissions.jsonl"),
    ).catch(() => []),
    timings = await lines(join(root, "lean-timings.jsonl")).catch(() => []),
    records = await decisions(root);
  const refusalsByRule = {};
  for (const a of admissions.filter((a) => a.status === "fail")) {
    const message = JSON.parse(a.message),
      findings = message.findings ?? [];
    const rules = new Set(
      findings
        .flatMap((f) => f.findings ?? [f])
        .map((f) => f.rule)
        .filter(Boolean),
    );
    for (const rule of rules)
      refusalsByRule[rule] = (refusalsByRule[rule] ?? 0) + 1;
  }
  const personas = [];
  for (const id of manifest.personas) {
    const days = [];
    for (let day = 1; day <= manifest.days; day++) {
      const file = `day-${String(day).padStart(2, "0")}/${id}.json`;
      try {
        const actual = await read(join(root, "days", file)),
          baseline = await read(join(root, "no-agent/days", file)),
          sum = (r) =>
            r.tasks.reduce(
              (a, t) => ({
                clicks: a.clicks + t.clicks,
                scrolls: a.scrolls + t.scrolls,
                completed: a.completed + Number(t.completed),
                tasks: a.tasks + 1,
              }),
              { clicks: 0, scrolls: 0, completed: 0, tasks: 0 },
            );
        days.push({ day, agent: sum(actual), noAgent: sum(baseline) });
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    const customCandidates = records
      .filter((r) => r.persona === id)
      .flatMap((r) =>
        r.candidates
          .filter((e) =>
            e.candidate.patch.some(
              (op) => op.path === "/layouts" || op.path.startsWith("/layouts/"),
            ),
          )
          .map((e) => ({
            night: r.night,
            id: e.candidate.id,
            reason: e.candidate.summary,
            status: e.check.status,
            shipped:
              r.chosen?.candidateIds.includes(e.candidate.id) && !!r.deployed,
          })),
      );
    personas.push({ id, days, customCandidates });
  }
  const gateMs = admissions.reduce((n, a) => n + a.elapsedMs, 0);
  const dayRows = timings.filter((t) => t.day !== null),
    nightRows = timings.filter((t) => t.night !== null);
  return {
    runId: manifest.runId,
    status: manifest.status,
    backend: manifest.backend,
    browserCertified: false,
    referenceGeneratorVersion:manifest.referenceGeneratorVersion,
    referenceUsage:manifest.referenceUsage,
    referenceStats:manifest.referenceStats,
    gate: {
      admissionChecks: admissions.length,
      uniqueDesigns: new Set(
        admissions.map((a) => `${a.programHash}:${a.designHash}`),
      ).size,
      pass: admissions.filter((a) => a.status === "pass").length,
      fail: admissions.filter((a) => a.status === "fail").length,
      error: admissions.filter((a) => a.status === "error").length,
      seconds: gateMs / 1000,
      checksPerSecond: gateMs ? admissions.length / (gateMs / 1000) : null,
      refusalsByRule,
    },
    timings: {
      unit: "seconds; each persona phase includes independent baselines and validation, nights include model calls",
      days: dayRows.map((t) => ({
        ...t,
        elapsedSeconds: t.elapsedMs / 1000,
        elapsedMs: undefined,
      })),
      nights: nightRows.map((t) => ({
        ...t,
        elapsedSeconds: t.elapsedMs / 1000,
        elapsedMs: undefined,
      })),
    },
    personas,
  };
}
if (process.argv[1] === import.meta.filename) {
  if (!process.argv[2])
    throw Error("Usage: node scripts/discovery/report.mjs <run-dir>");
  console.log(JSON.stringify(await report(resolve(process.argv[2])), null, 2));
}
