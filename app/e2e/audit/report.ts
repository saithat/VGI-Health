import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { z } from "zod";
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
const directory = resolve("../docs/audits");
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
  writeFileSync(
    resolve(directory, "buttons.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), counts, controls: all },
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
  writeFileSync(
    resolve(directory, "buttons.md"),
    `# Button audit\n\nGenerated ${new Date().toISOString()}. Preview build; one Chromium worker.\n\n${JSON.stringify(counts)}\n\nEach enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.\n\n${table(all)}`,
  );
  writeFileSync(
    resolve(directory, "ehr-dead-controls.md"),
    `# Lean-rendered dead controls\n\nContent lane: remove inert components or give them interpreter behavior. Render lane: emit click component metadata for nav/stepper destinations. Static nav entries and stepper labels are listed explicitly even when they are not DOM buttons.\n\n${table(all.filter((r) => r.owner === "lean" && (r.status === "dead" || r.status === "error")))}`,
  );
}
