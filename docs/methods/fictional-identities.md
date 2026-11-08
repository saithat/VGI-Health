# Terminology and organization names

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

Screens use neutral clinical terms: Patient sidebar, Inbox, workflow, Chart
History, Activities and Order favorites. Synthea and Synthetic Hospital patient data
is synthetic and is used as generated, with no de-identification. Real
organization names are replaced so the fixtures do not imply any real
organization's involvement: `scripts/fictional-identities.mjs` replaces every
facility, location, practitioner, payer and contact detail that the generators
draw from public directories with seeded fictional values, and
`scripts/fictional-identities.test.mjs` fails on any name outside that
generator.

The import regression checks the restored seed-1 worklists exactly: 20 primary-care
appointments, 19 refill requests and nine future OR cases, including appointment
and surgical-case identity agreement with the source world.

World generation preserves the frozen seed-serialization keys and inbox random
stream internally (`world/src/seed-contract.ts`), so terminology changes do not
redraw clinical cases. Persisted state uses neutral keys. Worlds 1/2 are immutable
pre-critical-result inputs; exact snapshot tests use the test-only frozen ward flow and construct the additive
critical-result successor, and world 1 also applies the documented service-order
release gate and release-event display rename. The full current generator's
critical-route tests remain active. Clinical overlay generation fictionalizes
complete bundles once; per-resource repetition previously changed clinical
specialty text. Reproducibility tests now use scratch copies and generation
refreshes named context files without deleting recorded context directories.

Regenerating derived artifacts:

Curated screenshot fidelity covers the complete clinical root, including the
urgent strip outside the inner shell. Saved P1 UI samples come from the current
native `ExportTests.lean` inputs; stale source labels require regenerating those
samples before native/WASM comparison.

- `node scripts/regenerate-full-fixture.mjs`: the mapper's full-profile v3
  fixture.
- `node scripts/refresh-clinical-fixtures.mjs`: the five painter samples and
  saved clinical semantic screens, from the native interpreter and local world.
  `--live-selection-only` reconstructs the saved live-selection snapshot
  sidecars without rewriting painter fixture inputs. These sidecars supply the
  18 live-selection captures in the opt-in neutral screenshot refresh; images
  alone do not satisfy its semantic-fidelity coverage check. Run
  `live-selection.spec.ts` against the fresh authority after that refresh to
  replace those references with the actual live PNG/model pairs and update
  their manifest digests. Selection must issue no clinical commands.
- `node conformance/verify.mjs <run>` then `node conformance/refresh-evidence.mjs
  <run>`: agreement of independent conformance runs, then the derived case
  reports and checker probes.
- `node scripts/migrate-neutral-terms.mjs`
  (after building Lean, WASM and the app): one-time rewrite of local `runs/`,
  `programs/` and `fixtures/` to the current terms and fictional identities,
  rebuilding digests, certificates and bindings and checking strict replay.
  Recordings the current gates reject are listed in
  `runs/neutral-migration-report.json` and cannot supply conformance targets or
  deployment bindings.

`AUDIT_RUN` selects the local recording for the performance audit.
