# Certified Adaptive Clinical Interfaces

Every night an AI agent redesigns each clinician's EHR screens to save them clicks. A Lean checker, proven correct, certifies every version before anyone logs in. The app's screen logic is the verified Lean code itself, compiled to WebAssembly.

- Project spec: [`BRIEF.md`](BRIEF.md)
- Core data formats and interpreter semantics: [`docs/design/core-model.md`](docs/design/core-model.md)
- Lean practices: [`CLAUDE.md`](CLAUDE.md) · Proof status: [`TODO_PROOFS.md`](TODO_PROOFS.md)

## Quick start
Requires Docker Compose, Node 22+, pnpm 11 (`corepack enable`), and
[elan](https://github.com/leanprover/elan) on PATH. Start Docker, then:

```sh
git clone https://github.com/saithat/VGI-Health.git
cd VGI-Health
make install   # Lean build, packages, Medplum setup, committed patient fixtures
make run
```

EHR: **http://localhost:5173/?persona=P1** (change to P2–P5).
Dashboard: **http://localhost:5173/dashboard**. Medplum API: **:8103**;
Medplum admin: **http://localhost:3000/**. Override the app port with
`make run APP_PORT=5187` if 5173 is occupied.

The default is **REPLAY**: no API key or internet after install. It selects the
longest replayable real run under `runs/`, then newest timestamp; currently it
falls back to the clearly labeled authored `runs/mock` examples. A real replay
needs `replay.json` inputs for P1–P5 ([format](app/README.md#recorded-run-demo-dashboard)).
Override selection with `VGI_RUN=mock make run`. WASM is committed;
**install does not need Emscripten**. `make wasm-check` verifies freshness;
developers rebuilding it use `wasm/setup.sh && make wasm`.

Replay needs no login. For local Medplum, persona logins are:

| Persona | Login |
|---|---|
| P1 · Dr. Maya Chen (primary care) | `p1@vgi-health.example` |
| P2 · Dr. Marcus Okafor (ED) | `p2@vgi-health.example` |
| P3 · Rosa Delgado (RN) | `p3@vgi-health.example` |
| RN2 · Ethan Park (double checks) | `rn2@vgi-health.example` |
| P4 · Priya Raman (pediatric NP) | `p4@vgi-health.example` |
| P5 · Dr. James Whitaker (surgeon) | `p5@vgi-health.example` |

Shared persona password: `VGI_USER_PASSWORD` in the generated `.env`.
Admin: `admin@example.com` / `medplum_admin`. Keep `.env` when reusing the
stack so setup preserves persona passwords. See [infra/README.md](infra/README.md).

Live agent nights: `make run-live` with `ANTHROPIC_API_KEY` exported or an
authenticated `codex` CLI. This generates a local world and calls the agent;
`LIVE_DAYS=2` and `LIVE_ARGS='--personas P1'` can shorten a run. It needs internet.

Verify a clean clone: `scripts/clean-clone-test.sh` (Linux `timeout`, `setsid`,
`curl`, Playwright system libraries). It clones **local HEAD**, installs, serves
on **5189**, and runs Chromium with external requests blocked. It reuses the
named `vgi-medplum` stack and copies local `.env` to preserve credentials; it
never resets or stops Medplum. Set `CLEAN_CLONE_PORT` or `KEEP_CLONE=1` as needed.

Trusted: Lean/Emscripten, Node/React/browser, Docker/Medplum, Synthea, and the
owner-reviewed specs. The mock run illustrates the demo; it does not establish
clinical correctness or real certification. See [BRIEF §13](BRIEF.md#13-trusted-base-say-this-in-the-readme-and-the-demo).
