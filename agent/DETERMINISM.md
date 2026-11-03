# Orchestration determinism

`run-days` fixes the world, seeds, releases, backend and build inputs at the run
boundary. Resume verifies their fingerprints. Parallel workers have independent
native recorders and seed-injection state, including when running serially.
Live models remain external nondeterministic inputs: their requests and successful
responses are recorded, and replay requires identical system and user prompts.
`ReplayDivergedError` identifies the call, field, first UTF-16 character offset
and nearby text. `--replay-allow-drift` is explicit; the manifest retains the
policy and affected call IDs. Standalone `night` writes its own manifest;
`try-to-break-it` writes `break/manifest.json`. Neither changes the source run's
execution status. No existing caller needs an implicit drift exception.

## Failure boundary inventory

The audit covered catches in `night.ts`, `modes.ts`, `no-agent.ts`, `agent.ts`,
`run.ts`, `rebind.ts`, `screencheck.ts`, `ehr.ts`, `native-process.ts` and the backend adapters.

| Boundary | Policy |
|---|---|
| Native check, simulation, minimum search, deploy, render, batch, spec export | Retry the same typed input. Native timeout kills its process group. Refusals returned by the checker are ordinary results. |
| Screen gate exception or `status: error`, geometry-provider error | Retry the same input. A measured `fail` remains a rejection. |
| LLM transport exception/timeout | Retry the same request and call ID. Every failed attempt has an error file; only a successful response occupies `<callId>.json`. Replay divergence/missing recordings stop immediately. |
| Rebind native/screen infrastructure | Retry, then stop in `rebind/manifest.json`; preserve the existing build pointer. Clinical refusals still reject. |
| Build binding, certification snapshots, publication I/O | Retry the identical stage, then stop. |
| Nightly propose/choose/repair, feature surfacing, migration, no-agent validation | Infrastructure exhaustion propagates; it cannot select a fallback, retain a revision as a night outcome, or publish a decision. |
| Invalid JSON patch or a successfully recorded, schema-invalid model answer | Deterministic rejection/LLM error under the existing data format. This is distinct from failed transport. |

`EHR_INFRA_RETRIES` is the number of retries after the initial attempt (default
2, therefore at most 3 attempts). Exhausted inner retry budgets are never retried
by an outer boundary. Manifest `infrastructureRetries` entries retain the op,
persona, day/night, failed-attempt count and cumulative messages, including the
terminal failure. Error attempts and requests survive resume. New runs stop with
`status: infrastructure-error`; old decision outcomes still parse and display.

## Content and durability

`src/content-digest.ts` is the authoritative declaration of volatile fields,
files and temporary-directory prefixes. The inventory came from searches for
`Date`, `time`, `timestamp`, `duration`, `elapsed`, `pid`, `randomUUID`,
`createdAt`, `startedAt`, `resumes` and `publishedAt` in `agent/src`, plus the
snapshot publisher and build-binding format. Exclusions cover provenance clocks,
run identity and execution concurrency, retry/recovery audit data, atomic-write
scratch files, caches, screen console logs and recursive digest fields.
Certificate timestamps and their derived binding/journal hashes are provenance;
the actual certificate/spec/program content remains included. Clinical trace
times, event order, simulated time and timing estimates remain content.
Run-relative and known native/screen scratch paths are normalized. Binary files
are hashed without decoding their bytes as text.

A native journal ID is `<worker>-1-<command>-<input-sha8>`. The sequence is scoped
to an exact normalized input: repeated identical successes replace the same
idempotent record; failed attempts get distinct `.attempt-N.error.json.gz`
files. Worker indexes retain their existing row fields and live under
`ehr/<worker>/index.jsonl`. Index row order is provenance; successful entries
are sorted for comparison. Recorder timestamps remain in the raw records.

Daily `digest.json` files cover each persona's active, canonical baseline,
no-agent and training records, plus their combined digest. The completed manifest
contains the whole-directory `contentDigest`. JSON uses the existing
`stableStringify`; arrays retain order. Production hashing retains hashes rather
than accumulating every file's parsed content in memory. A content digest is a
comparison tool, not a replacement for certificate/build-binding verification.

JSON and journal writes use a same-directory temporary file, file sync, rename
and directory sync. The baseline companion program precedes its completion
record. Geometry accumulation reloads persisted coverage on resume, preserving
earlier workspace states when recorded days are skipped. Identical publication retries reuse an already durable pointer. Pending deployment plus durable decision controls pointer recovery.
`EHR_CRASH_TEST=1 EHR_CRASH_AFTER_WRITES=N` arms a process-local SIGKILL immediately
after the Nth durable write; live Claude/Codex backends refuse to arm it. The
optional `EHR_CRASH_WRITE_TRACE` records write boundaries for the harness.

## Native verification harnesses

From the repository root:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
pnpm --filter agent verify-determinism
pnpm --filter agent verify-crash-resume --points 8 --seed 20261102
```

Both commands accept `--out DIR` for a fresh disk-backed output directory and
print its path. They share two days, two personas, two tasks per shift, the
existing `dryFixture`/tiny spec, `ScriptedLlm` and the real prebuilt `ehr` binary.
The world derives from the ignored world-2 data. The synthetic fixed geometry
and screen gate are explicitly test fixtures; these outputs are not clinical,
browser-fidelity or production-screen certification evidence. The fixture must
reach both nightly deployments for the crash harness to proceed.

The determinism command compares serial, serial again and parallel runs. The
Vitest-excluded crash script records a reference write trace, selects seeded
points from active-day, no-agent, LLM, nightly native check/certification, pending publication,
decision and completion-manifest phases, and checks each resumed result against the
reference. Some resumes are killed again. Differences name the first file and
JSON path. Defaults target a bounded local run under 30 minutes; native speed
and configured transport timeouts still affect elapsed verification time.

These checks cover this small configuration, not every seed, release migration,
live model service, external partial-snapshot publisher or arbitrary storage
failure. Browser geometry/font determinism belongs to a separate lane. Native
processes are bounded by four real persona workers; real screen-worker settings
must fit a total budget of four. Neither harness launches a browser or Lake.

Verification on 2026-11-02: agent typecheck and lint passed; all 118 Vitest tests
passed with four workers. The real native serial/serial/parallel comparison
matched. Seed 20261102 with eight phase-stratified points (writes 46, 118, 121,
166, 187, 269, 270 and 341) matched the uninterrupted digest after ten SIGKILLs,
including repeated crashes during resume. The harness found lost atlas coverage
after pending publication (write 269); reloading persisted geometry fixed it,
and a regression test covers reconstruction in a fresh simulator instance.
