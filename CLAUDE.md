# Working in this repository

## pstack

The pstack plugin (cursor/plugins, MIT) is used for its playbooks and
principles. Where its defaults differ from the rules below, these rules win.

- **Outward actions need confirmation.** Messages, posts, ticket or PR
  comments, releases, deploys and anything sent to an external service are
  confirmed with the owner first, even where a playbook says to proceed.
- **Reviews and audits are done inline** by the session doing the work. Do not
  route reviews to `poteto-agent`, `comment-sicko`, `arena`, `swarm` or
  `interrogate` fan-outs.
- **Spawn subagents only when the owner asks.** Playbook steps that say to
  delegate run inline instead.
- **Cursor-only steps are skipped** with one line: `/deslop`, Bugbot,
  Automations, cloud agents, custom modes and `.mdc` rules.
- **No new model or provider calls.** Multi-model steps use the current
  session only.

## Project rules pstack must not override

- Never weaken a Lean statement, spec, property or theorem. No `sorry`,
  `admit`, `native_decide` or new axioms. Flag every new specification "New
  specification for owner review"; the dashboard's Spec review tab lists them.
- Never commit data: `runs/`, `world/`, `fixtures/`, `verdicts.json`,
  `programs/`. Commit with pathspecs, never `git commit -a`.
- Never exclude a test from CI without asking. Check GitHub CI after every
  push to `main`.
- No full runs or recertifications for routine changes: smokes, targeted
  tests and CI.
