# Handoff: agent-loop lane (`agent/`, branch `lane/agent`, worktree `/home/saithat/Projects/VGI-agent`)

Written for whoever continues this lane (planned: Codex). Read `agent/STATUS.md` too. It has the full feature table, CLI usage, design decisions for the owner, and the live-verification log. This note adds commit hashes, what was in progress, and the exact remaining work.

## Build / test

```sh
cd /home/saithat/Projects/VGI-agent && pnpm install
pnpm --filter agent typecheck   # tsc --noEmit (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
pnpm --filter agent lint        # eslint: no any, no `!`, no `as` except `as const`, no ts-ignore
pnpm --filter agent test        # vitest; vitest.config.ts sets EHR_FAKE=1; 31 tests, ~1 s
```

All three pass at `d2610e4`. The tests need no API key and no network.

A smoke run needs no key:

```sh
EHR_FAKE=1 pnpm --filter agent fake-world --out /tmp/w --days 4
EHR_FAKE=1 pnpm --filter agent run-days --days 4 --backend replay --replay-from <run dir with llm/> --world /tmp/w
```

Live backends were verified against the fake ehr: `--backend claude` (needs `ANTHROPIC_API_KEY`) and `--backend codex`.

## Done (commits on `lane/agent`)

| Commit | What |
|---|---|
| `3f5ad14` | Package scaffold. Backends: claude, codex, replay, and the call recorder. `schema.ts` (Candidate with selector-patch format, LLM wire formats, DecisionRecord per BRIEF §10). `ehr.ts` adapter plus the fake. `night.ts` (all 9 steps). `modes.ts` (surface-feature, migrate, try-to-break-it). `seeded.ts`. `run.ts` orchestrator. `cli.ts`. |
| `a804953` | Tests: one fake night per persona produces a valid record (replay backend); rejected candidates are logged with counterexamples; no validation or test data in prompts (day-marker leak check); releases; adapter contract via a stub binary. |
| `737c8f6`, `5b8bdba` | Merged origin/main and origin/lane/lean-core. |
| `bcbc197` | Switched to the generated `lean/generated/ehr-types.ts` (`src/lean-types.ts`, zod typed as `z.ZodType<Generated>`, round-trip tested on `ehr-samples.ts`). Lean `Option` fields are omitted keys; an LLM's `null` is dropped. `run-batch <file.jsonl>` and `spec-export <name>` match the real CLI. |
| `bb2bec0` | `night` command (`src/adhoc.ts`) re-runs one night of an existing run into `<run>/adhoc/`. The fake now reports the property names from `lean/Ehr/Props/Properties.lean`. |
| `317fe90` | `agent/STATUS.md`. |
| `f04921a` | Merged origin/main (painter, stylesheet, app `screen-check`, lean-core proofs). |
| `d2610e4` | Offline screen check gates every deploy: `ehr check`, then `ehr render-screens` plus `pnpm --filter app screen-check`, then `ehr deploy`. The result is recorded as `screenCheck` next to `certificate`. A failure is logged as a rejection (certification attempt `source: 'screen-check'`, `property: 'ScreenCheck'`, failing screens) and as outcome `screen-check-failed`. Fake under `EHR_FAKE=1`. |

## In progress when stopped

Nothing half-written. The screen-check step is complete and tested, with two follow-ups left (items 1 and 2 under "Remaining tasks", below).

## Remaining tasks

None of these were dropped. They come from the original brief and the screen-check message.

1. **Migration fallback on a screen-check failure.** In `modes.ts:runMigration`, if the LLM-migrated program passes `ehr check` but fails the screen check, the code currently records `screen-check-failed` and stops. That leaves the user on a program that fails v2. Fix: continue to the canonical-plus-customizations fallback. Similarly, in `runSurfaceFeature`, if the surfaced version fails the screen check, recertify the unchanged program instead of stopping.
2. **Optional repair on a screen-check failure.** Feeding the failing screens back into the repair loop (like counterexamples) was not requested and is not done. Ask the owner whether to add it.
3. **Switch to the real Lean commands as they land.** Edit `src/ehr.ts` and its pinned contract test `test/ehr-adapter.test.ts`:
   - `check`, `simulate`, `min-clicks`, `deploy` (lane A);
   - `render-screens` (render lane).

   Until then every run needs `EHR_FAKE=1` and certifies nothing.
4. **Replace the remaining mirrors with generated types** when Lean emits them:
   - the `min-clicks` output (`MinClicksResult` in `src/lean-types.ts`);
   - the v1.1 `priorAuthStatus` kind (`FutureKind`);
   - the Html page tree, if needed.

   Also replace the hand-written zod validators if Lean emits validators.
5. **Adapt to the real world and content formats.**
   - The world layout is assumed in `src/world.ts`. No `lane/world` output exists yet.
   - Release inputs are assumed in `src/releases.ts`: `releases/<ver>/{spec.json,canonical.json,RELEASE_NOTES.md}` and `lean/Ehr/Specs/{V1,V1_1,V2}.lean`. Currently `lane/content` has only `lean/Ehr/Specs/V1.lean`.
6. **Record the demo run.** Record one 10-day × 5-persona run with `--backend claude` (or codex) against the REAL checker, simulator, world, and canonical programs. Commit it under `runs/<run-id>/` so `make run` can replay it keyless (BRIEF 9: replay is the default demo). Also pre-record the try-to-break-it fallback for the exact demo request text (replay keys = persona + hash of the request).
7. **Confirm the seeded lb-weight move.** `seeded.ts` builds it as a prefill from fact `triageWeightLb`. Confirm the real checker rejects it as `UnitsRight`. Better: derive all three seeded patches by diffing lane B's seeded bad programs against the canonical program once they are published. If a seeded move ever passes, the loop flags `OWNER REVIEW` and never deploys it.
8. **Wire `make run`/`make install`** (root Makefile, shared) so the demo replays a recorded run. Coordinate with the infra lane.
9. **Owner review of the design decisions** in `agent/STATUS.md`:
   - release nights are dedicated to the release;
   - acceptance rules;
   - the "prediction held" threshold;
   - the test day is night+2;
   - user-revert model and timing;
   - min-clicks aggregation.

## Assumed command formats (not yet implemented by other lanes)

These are pinned in `test/ehr-adapter.test.ts`. The real ones today are `init`/`step`/`view` on stdin, `run-batch <file.jsonl>` (JSONL `BatchCase` in, JSONL `BatchStep` out), and `spec-export <name>`.

```
ehr check     --spec <ver> --program P.json --prev PREV.json --canonical C.json
              -> stdout Verdict ("ok" | {"violation":{property,message,counterexample,screens}}); exit 0 ok / 1 violation
ehr simulate  --spec <ver> --program P.json --persona PersonaParams.json --schedule DaySchedule.json --world <dir> --seed <n>
              -> stdout DayResult
ehr min-clicks --spec <ver> --program P.json --schedule DaySchedule.json --world <dir>
              -> stdout {"tasks":[{"task","workflow"?,"clicks","keystrokes"}]}
ehr deploy    --spec <ver> --program P.json --prev PREV.json --canonical C.json --out <runDir>
              -> stdout Certificate (exit 0) | Verdict (exit 1, refused)
ehr render-screens --spec <ver> --program P.json --fhir <bundle.json> --out <dir>
              -> writes one Html page-tree JSON per screen/state: <screenId>.json or <screenId>__<state>.json; exit 0
pnpm --filter app screen-check <files...>      (real, on main) exit 0 = pass; failing files parsed from Playwright output
```

`--spec` takes a spec module version name (`v1`, `v1.1`, `v2`). Sample bundles for the screen check come from `--fhir a.json,b.json` (run-days) or `EHR_SAMPLE_FHIR`. With none configured, the real screen check fails closed and nothing deploys, including the day-1 canonical program, which aborts the run with a clear error.

## Known pitfalls

- **Lean `Option` fields are omitted keys** (`parent?`, `hotkey?`, `copyOf?`, `linkedFrom?`, `waivedBy?`, …), never `null` in output. A JSON-Patch `replace` on an absent key fails, as RFC 6902 requires. Use `add`. The system prompt tells the LLM this.
- **Patch selectors** `[id=…]` / `[tag=…]` (and `+` for "after") resolve just before each op. The stored patch keeps selectors, so it stays portable across versions; migration fallback re-applies history patches onto the new canonical program.
- **Integrity.** Prompts are built only in `src/prompts.ts`, from train-only inputs. Day d+1 is reachable only through `Holdout.validate`, which returns aggregates to the loop. Do not pass DayResults of later days, or validation/test metrics, into history or prompts. The test in `test/night.test.ts` injects `LEAKCHECK-day-N` markers and will catch it.
- **Determinism.** Seeds derive from the world seed (simulate: `seed*1000+day`; user revert: hash of world seed, night, persona), not the run id, so replay runs reproduce decisions exactly. Recorded prompts are compared byte for byte (`promptMatched`). Do not put timestamps or run ids in prompts.
- **Claude.** Opus 5.5 cannot disable thinking and rejects forced `tool_choice`. The backend uses `output_config.format` (JSON schema), `thinking: {type:'adaptive'}`, effort `high`, and `fallbacks:'default'` with beta `server-side-fallback-2026-07-01`, via `client.beta.messages.stream(...).finalMessage()`. Patch values travel as `valueJson` strings, because strict schemas cannot express arbitrary JSON.
- **Codex** runs from an empty temp dir with `--sandbox read-only --ephemeral`, so it does not start inside the repo, where later days' traces live.
- **Lockfile.** Merges with other lanes conflict on `pnpm-lock.yaml`. Take main's (`git checkout --theirs pnpm-lock.yaml`), run `pnpm install`, and commit.
- **TS config.** The agent uses `moduleResolution: Bundler` so the generated `lean/generated/ehr-types.ts` (no `"type":"module"` above it) type-checks under `verbatimModuleSyntax`.
- **The fake ehr is a crude stand-in.** Its "checker" is a set of structural heuristics, not the verified checker. Never present `EHR_FAKE=1` runs as certified. The manifest and certificates say FAKE.
