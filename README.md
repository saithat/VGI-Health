# Certified Adaptive Clinical Interfaces

Every night an AI agent redesigns each clinician's EHR screens to save them clicks. A Lean checker, proven correct, certifies every version before anyone logs in. The app's screen logic is the verified Lean code itself, compiled to WebAssembly.

- Project spec: [`BRIEF.md`](BRIEF.md)
- Core data formats and interpreter semantics: [`docs/design/core-model.md`](docs/design/core-model.md)
- Lean practices: [`CLAUDE.md`](CLAUDE.md) · Proof status: [`TODO_PROOFS.md`](TODO_PROOFS.md)

## Quick start
Requires Node 22+ and pnpm 11 (`corepack enable`). The offline UI needs no
Docker, Medplum, API key, Lean installation or Emscripten:

```sh
git clone https://github.com/saithat/VGI-Health.git
cd VGI-Health
pnpm install
make run
```

UI browser: **http://localhost:5173/browse**. Open any of the canonical releases,
P1–P5 projections, bad programs or recorded program versions with one of the
174 committed Synthea patients. Every EHR click runs **real Lean WASM**.

Persona defaults: **http://localhost:5173/?persona=P1** (change to P2–P5).
Add `&run=mock` or another recorded run id for its latest deployed program;
without a run, the v1 projection opens. P2 defaults to an ED fixture, P3 to an
inpatient fixture, P4 to a child and P5 to a surgical fixture. The inspector shows
live state, blockers and commits; checker verdicts remain “verdict not computed”
until the native checker CLI is available (`pnpm --filter app verdicts`).

Dashboard: **http://localhost:5173/dashboard**. Its recorded run selection prefers
the longest replayable real run, then newest timestamp; currently it falls back
to the labeled authored `runs/mock` examples. Only this mock dashboard replay
uses a fixture interpreter. Override selection with `VGI_RUN=mock make run`.
Use `make run APP_PORT=5187` if 5173 is occupied.

For remote access from your MacBook, both `pnpm --filter app dev` and `make run`
automatically use Tailscale Serve when the local Tailscale daemon is connected.
Startup prints HTTPS links available on your tailnet, using the same HTTPS port
as the local app (normally 5173). An existing matching proxy is reused; other
Serve routes are left alone. Newly created routes stop with the app. Use
`TAILSCALE_SERVE=0 pnpm --filter app dev` (or `TAILSCALE_SERVE=0 make run`) to opt out.
Tailscale failures leave the local app available.

WASM is committed; `make wasm-check` verifies freshness. Developers rebuilding
it use `wasm/setup.sh && make wasm`. Full Medplum installation remains optional:
install Docker Compose and [elan](https://github.com/leanprover/elan), then run
`make install`. Medplum API: **:8103**; admin: **http://localhost:3000/**.

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
