# Clean-clone shipping check

The check is `KEEP_CLONE=1 scripts/clean-clone-test.sh`. It clones **local HEAD**
into a new `/tmp` directory, without dependencies or Lean outputs, runs
`make install`, starts `make run APP_PORT=5189`, and opens one headless Chromium.
External requests are blocked. It stops its own preview server, preserves the
named **vgi-medplum** stack and its data, and never calls a reset/down target.

## Current attempt — 2026-11-01

The corrected harness is being run against commit `2452e68`. It explicitly requests `inspect=1` and opens the first **Open chart:** row before asserting a patient banner. This fresh attempt passed `make install` but was still completing Chromium setup at the 11:30 PDT hard stop; it is not yet a full pass; logs: `/tmp/honesty-clean.log`, clone/build logs: `/tmp/vgi-clean-clone.QfKZUw`. The result below is historical and does not validate the current landing-list integration.

## Historical recorded result

**PASSED**, 2026-10-31 PDT, at commit
[`e7c4c04281f39bed0e9156c71969873c17f7c391`](https://github.com/saithat/VGI-Health/commit/e7c4c04281f39bed0e9156c71969873c17f7c391).

| Command | Wall time |
|---|---:|
| `make install` | **57.752 seconds** |
| `make run` to first HTTP 200 | **8.127 seconds** |

Chromium passed live sign-in loading, all five replay personas, dashboard EHR
pairs and WASM checks, with **zero external requests, HTTP failures or browser
errors**. Logs and the fresh clone were retained locally at
`/tmp/vgi-clean-clone.Ux6Zmn` (`install.log`, `run.log`, `timings.log`);
the complete harness output is `/tmp/vgi-ship-clean-final.log`.
The final run used `TAILSCALE_SERVE=0` and the Chromium cache downloaded by the
prior attempt; dependency and Lean build directories were new.
Startup means the first HTTP 200, including TypeScript/Vite production build;
`make run` remains running to serve the app. Browser installation/testing time
is separate from both Make timings.

Environment: Linux x86_64, Node **22.23.1**, pnpm **11.8.0**, elan **4.2.4**, Lean
**4.35.0**, Docker Compose **5.6.1**. Every fresh Lean build used
**LEAN_NUM_THREADS=4**. The toolchain/package/image caches are distinct from
fresh project build outputs: the shared Medplum containers/images and existing
credentials were reused. These are not cold-machine/image-download timings.

## What was repaired

- The test used an unwritable shared pnpm SQLite store. It now uses a temporary
  package store, with an environment override for callers who want another one.
- The smoke script targeted the former default replay route, a persona selector
  outside its Inspector drawer, old banner CSS, and a removed dashboard tab.
  `scripts/clean-clone-smoke.mjs` now checks live sign-in, all five explicit
  replay personas, their current semantic banners, the version drawer's EHR
  pair, WASM magic bytes, browser errors, HTTP failures and external attempts.
  The dashboard's historical replay still uses the Lean HTML painter, whose
  `.ehr-shell` is checked separately from the live semantic banner.
- The committed WASM source receipt predated the opt-in verification audit.
  Inspection found only a new `lean/Audit/SpecSurface.lean` and the audit target
  in `lean/lakefile.toml`; every previously recorded `.lean` hash matched.
  The refreshed receipt changes **no runtime source, WASM binary, bridge input
  or asset hash**. The stale-asset guard stays enabled.
- `make install` defaults Lean to four workers and installs the frozen pnpm
  lockfile. The harness forces four workers even when its parent lane uses more.
- README Quick start now leads with the required `make install && make run`,
  lists prerequisites, explains generated credentials and distinguishes live
  operation, real recorded runs and mock illustrations.

## Configuration and toolchain checks

A separate `make install` began with **no `.env` file** and successfully generated
complete configuration with mode **0600**. Because this host shares persona
accounts with other lanes, that check supplied their existing password through
the process environment, then restored the original file. No credential was
printed or committed. On a new stack, `infra/scripts/setup.mjs` generates the
persona password with `randomBytes`, obtains the local client credentials, and
writes `.env` itself. **There is no manual secret step for a new local stack.**
For an existing shared stack, retain/copy its `.env` to avoid resetting logins.

Elan was also run with an **empty ELAN_HOME**, outside the normal toolchain
cache. Invoking `lake --version` inside `lean/` automatically downloaded and
installed the toolchain named in `lean/lean-toolchain`; the result was
`Lake version 5.0.0-src+eb6cafb (Lean version 4.35.0)`.
Elan itself, Node/pnpm, the C toolchain and a running Docker daemon are host
prerequisites, as stated in README.

Compose starts all four pinned services, and both server and admin health checks
pass. Setup is idempotent. The loader reports **174 already-loaded Synthea
fixtures**; seeding reports **0 new / 308 already seeded day-one resources** and
verifies their references. A new stack would spend additional time downloading
images, migrating Medplum and uploading those fixtures; this test deliberately
does not delete shared data to measure that.

## Additional rehearsal and limits

The [demo](DEMO.md) uses a real local persona login, synthetic patient data and
FHIR saves, plus the recorded real P3 overnight run. The rehearsed P1 note
completed after all four medication decisions and the Health maintenance
reminder acknowledgment; its saved links included DocumentReference,
Observation, Condition, ChargeItem and Encounter. No browser errors occurred.
Its native bad-program
command was rerun and returned exit 1 with `humanOnlyKept` and the expected
human-readable identity-prefill rejection.

This shipping check is not a fresh Comparator or `lake check` audit, a clinical
correctness claim, or completion of the pending branching-timeline UI. See
[VERIFICATION.md](VERIFICATION.md) for the proof scope and open completion gap.
