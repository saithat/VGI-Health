import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
export interface Control {
  route: string;
  persona: string;
  program: string;
  screen: string;
  label: string;
  comp: string | null;
  kind: string;
  owner: "app" | "lean";
  status: "works" | "disabled-with-reason" | "dead" | "error";
  effect: string;
}
const directory = resolve(process.env.EHR_AUDIT_DIR ?? "../docs/audits");
const escape = (s: string) => s.replaceAll("|", "\\|").replaceAll(/\s+/g, " ");
export function writeReport(rows: Control[], scope: string) {
  mkdirSync(directory, { recursive: true });
  const partial = resolve(directory, `buttons-${scope}.json`);
  writeFileSync(partial, JSON.stringify(rows, null, 2) + "\n");
  const all = ["app", "ehr"].flatMap((name) => {
    const file = resolve(directory, `buttons-${name}.json`);
    return existsSync(file)
      ? z
          .array(
            z.object({
              route: z.string(),
              persona: z.string(),
              program: z.string(),
              screen: z.string(),
              label: z.string(),
              comp: z.string().nullable(),
              kind: z.string(),
              owner: z.enum(["app", "lean"]),
              status: z.enum([
                "works",
                "disabled-with-reason",
                "dead",
                "error",
              ]),
              effect: z.string(),
            }),
          )
          .parse(JSON.parse(readFileSync(file, "utf8")))
      : [];
  });
  const counts = Object.fromEntries(
    ["works", "disabled-with-reason", "dead", "error"].map((status) => [
      status,
      all.filter((r) => r.status === status).length,
    ]),
  );
  const build = existsSync("dist/build-info.json")
    ? z
        .object({
          revision: z.string(),
          mainRevision: z.string(),
          leanHash: z.string(),
          builtAt: z.string(),
        })
        .parse(JSON.parse(readFileSync("dist/build-info.json", "utf8")))
    : null;
  writeFileSync(
    resolve(directory, "buttons.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        revision:
          build?.revision ??
          execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
        mainRevision:
          build?.mainRevision ??
          execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
            encoding: "utf8",
          }).trim(),
        builtAt: build?.builtAt ?? null,
        leanHash:
          build?.leanHash ??
          JSON.parse(readFileSync("public/ehr/manifest.json", "utf8"))
            .leanSourceHash,
        counts,
        byOwner: Object.fromEntries(
          ["app", "lean"].map((owner) => [
            owner,
            Object.fromEntries(
              ["works", "disabled-with-reason", "dead", "error"].map(
                (status) => [
                  status,
                  all.filter((r) => r.owner === owner && r.status === status)
                    .length,
                ],
              ),
            ),
          ]),
        ),
        controls: all,
      },
      null,
      2,
    ) + "\n",
  );
  const table = (controls: Control[]) =>
    "| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |\n|---|---|---|---|---|---|---|\n" +
    controls
      .map(
        (r) =>
          `| ${[`${r.route} · ${r.persona} · ${r.program}`, r.screen, r.label, r.comp ?? "—", `${r.kind} / ${r.owner}`, r.status, r.effect].map(escape).join(" | ")} |`,
      )
      .join("\n") +
    "\n";
  const baseline = existsSync(resolve(directory, "buttons-before-app.json"))
    ? JSON.parse(
        readFileSync(resolve(directory, "buttons-before-app.json"), "utf8"),
      )
    : [];
  const countRow = (label: string, rows: Control[]) =>
    `| ${label} | ${["works", "disabled-with-reason", "dead", "error"].map((status) => rows.filter((r) => r.status === status).length).join(" | ")} |`;
  const comparison = `| Scope | Works | Disabled with reason | Dead | Error |\n|---|---:|---:|---:|---:|\n${countRow("App baseline", baseline)}\n${countRow(
    "App final",
    all.filter((r) => r.owner === "app"),
  )}\n${countRow(
    "Lean final",
    all.filter((r) => r.owner === "lean"),
  )}\n`;
  writeFileSync(
    resolve(directory, "buttons.md"),
    `# Button audit\n\nGenerated ${new Date().toISOString()}. Preview build; one Chromium worker.\n\n${comparison}\nApp coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.\n\nEach sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.\n\n${table(all)}`,
  );
  writeFileSync(
    resolve(directory, "ehr-dead-controls.md"),
    `# Lean-rendered dead controls\n\nContent lane: remove inert components or give them interpreter behavior. Render lane: emit click component metadata for nav/stepper destinations. Navigator entries without interpreter buttons are listed explicitly. A semantic progress stepper is a noninteractive list, not a button.\n\n${table(all.filter((r) => r.owner === "lean" && (r.status === "dead" || r.status === "error")))}`,
  );
}

export function writeLiveAttempt(result: unknown) {
  const verdict = z
    .object({
      request: z.string(),
      persona: z.string(),
      verdict: z.enum(["pass", "fail", "invalid-patch"]),
      property: z.string().nullable(),
      message: z.string().nullable(),
      counterexample: z.unknown(),
      candidate: z.unknown(),
    })
    .safeParse(result);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    resolve(directory, "try-to-break-it.json"),
    JSON.stringify(
      verdict.success
        ? verdict.data
        : {
            status: "backend-error",
            message:
              "The configured backend did not return a verdict; recorded examples remain available.",
          },
      null,
      2,
    ) + "\n",
  );
}
