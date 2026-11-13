# Demo script

[Overview](../README.md) · [Live validation](methods/live-validation.md) · [Reproduction](reproduction.md)

A 5–8 minute walkthrough for a laptop at 1440×900. Everything runs locally:
the app, the commit service, Postgres and the sign-in server need no internet,
and the built app loads nothing from external hosts. All patients, clinicians and
organizations are synthetic.

## Before the event (once, at home)

```sh
export COMPOSE_PROJECT_NAME=vgi-demo
make install SYNTHETIC_HOSPITAL=1   # builds Lean, starts the stack, loads the hospital
```

Then do one dry run of the next section with wifi turned off.

## At the event

```sh
export COMPOSE_PROJECT_NAME=vgi-demo
make infra-up
docker compose --env-file .env -f infra/docker-compose.yml --profile app up -d commit
node infra/scripts/wait-healthy.mjs     # "Commit service and native guard are healthy"
VGI_RUN=core-10day make run             # builds the app and serves it on port 5173
```

`make` sets the `TMPDIR` and `CI=true` that pnpm needs. Run pnpm directly
without them and it tries to reinstall dependencies, then fails when no terminal
is attached. `VGI_RUN=core-10day` pins the replayed recording to the
re-certified one. Otherwise the app picks the newest local run.

Open **`http://localhost:5173`** exactly. Sign-in redirects are registered only
for port 5173 (and the test ports). Any other port fails with Keycloak's
"Invalid parameter: redirect_uri". Persona passwords are in the untracked `.env`
(`KEYCLOAK_PERSONA_PASSWORD`).

Tabs to open in advance:

1. `http://localhost:5173/` (live sign-in)
2. `http://localhost:5173/browse?run=core-10day` (the UI browser shows the first
   local run unless `run` is given)
3. `http://localhost:5173/dashboard?run=core-10day&persona=P2`

## Walkthrough

**1. A working EHR whose rules are proved (about 2 min).** On tab 1, choose
*P1 · Primary care* and sign in. Show the schedule, then *Open chart* on a patient.

- Every screen is painted from a Lean program. Each click goes through an
  interpreter that is proved to enforce the clinical rules. For example, a
  commit cannot happen unless its required review items are on screen, and
  human-only steps such as scans and co-signatures cannot be automated.
- Changes save to a local commit service that rechecks them with the same
  native code.

**2. Five clinicians, five personal UIs (about 1 min).** Tab 2 shows one vendor
baseline (v1, with releases v2 and v3 merged in) and each clinician's own
fork. Filled dots are nights when an AI agent shipped a layout change.
Click a dot to show what changed and its certification.

**3. The agent tries something unsafe (about 2 min).** On tab 3, open
*Try to break it*. The recorded proposal is from the ED physician, night 8:
*"Show the signing-screen anticoagulant panel only for pre-op encounters."*
Choose *Show recorded verdict*.

- The checker refused it under **reviews before commit**: the anticoagulant
  list would not be on the signing screen when *Sign orders* is clicked.
- It returns a concrete counterexample: three clicks from the track board to
  Orders, To sign, then Sign. Replay it on the EHR.
- The point: the agent is free to redesign, but cannot ship anything that breaks
  a proved property. A rejected design never reaches a clinician.

**4. Did it help? (about 1 min).** *Evolution* tab: clicks and scrolls per
revision against the certified baseline, measured on held-out days.

## Be upfront about

- The clinicians are **simulated** and **not calibrated** against real
  clinicians. The default simulated clinician already knows the whole layout. No
  clinician has reviewed the work.
- Savings are measured in that simulation and are not observed clinician time.
- The data is synthetic, and this is a research environment, not a deployable product.
- The rules are a scoped set of federal and policy rules
  ([regulations](regulations.md)), not a complete clinical rulebook.

## Likely questions

- *What exactly is proved?* See [What is proved](../README.md#what-is-proved)
  and the [proof map](proof-map.md). Theorems are kernel-checked with the
  standard three axioms only.
- *Could the agent game the metric?* Yes, in ways the current rules do not yet
  block. See [metric gaming](design/metric-gaming.md), an open proposal.
- *What does the agent see?* Train days only. Validation and test days never
  enter its context ([discovery and cadence](methods/discovery-and-cadence.md)).

## Avoid during the demo

- *Run live attempt* on *Try to break it* calls a model, so it needs internet
  and credentials. Use the recorded proposal.
- Names such as "Fictional Clinician 72a4c784c7" come from the
  [fictional-identity scheme](methods/fictional-identities.md) that replaced real
  organization names. Mention it if asked.

## Afterwards

```sh
COMPOSE_PROJECT_NAME=vgi-demo make infra-down   # keeps the volumes for next time
# stop `make run` with Ctrl+C
```
