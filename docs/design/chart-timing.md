# Entry times, late entries, signing deficiencies and order reconciliation

[Overview](../../README.md) · [Live drafts](../methods/live-drafts.md) · [Rule catalog](../rules/catalog.md)

Status: **entry/observation times and late-entry labeling implemented; signing
deficiencies and order reconciliation remain in implementation.** The timing
definitions and theorems are marked *New specification for owner review* in Lean.

## Why

An open chart session can be renewed at any age if the patient's record is
unchanged ([live drafts](../methods/live-drafts.md)). Real EHRs don't put a
maximum age on unsigned work either. They handle the same risk in four ways,
which this design adopts. Renewal itself stays as it is, with no time cap.

1. Each entry keeps the time it was entered, and observations keep the time the
   patient was observed, separately from the time the entry was signed.
2. An entry signed long after the observation is labeled a late entry.
3. Unsigned and overdue work appears on a per-clinician deficiency list.
4. Unsigned orders are reconciled when the patient is transferred or discharged.

The catalog records these binding rules and their implementation scope:

| Rule | Source | Catalog status |
|---|---|---|
| Entries are dated and timed | 42 CFR §482.24(c)(1) (`cms-482.24-c1-dated`, `-timed`) | Interpreter entry stamps and persisted provenance (legacy clockless entries excluded) |
| Record completed within 30 days of discharge | 42 CFR §482.24(c)(4)(viii) | Encoded as `temporal007`; no cross-record view |
| Record completed and authenticated within two weeks of discharge | 22 CCR §70751(g) | Encoded as `temporal018`, `temporal019`; "needs cross-record deficiency tracking" |
| H&P within 24 hours of admission | 42 CFR §482.24(c)(4)(i)(A) | Encoded; no cross-record view |

Late-entry labeling and order reconciliation are hospital policy, not law.
Their numbers are local policy defaults and are labeled as such.

## 1. Entry and observation time (*new specification*)

- Every capture records `enteredAt`, the interpreter's epoch minute at the moment
  of entry (`epochNow`). It comes from the trusted clock, never from the screen.
- Elements whose value describes a moment of care (vitals, measurements,
  assessments, administrations already handled by the MAR) are marked
  `observation`. For those, the clinician may set an earlier `observedAt`
  ("Time taken"), which defaults to `enteredAt`. Only a human can set it; it
  cannot be prefilled or automated, like other human-only entries.
- Bounds checked by the interpreter: `observedAt ≤ enteredAt`, and not before the
  encounter start when that is known.
- At signing, `signedAt` is the trusted commit time. The record keeps all three:
  FHIR `effectiveDateTime` is `observedAt`, `issued` is `signedAt`, and the entry
  time is kept in provenance. The existing MAR split between bedside time and
  charting time is the model.

## 2. Late entries (*new specification*, hospital policy)

- An entry is late when `signedAt − observedAt` exceeds
  `spec.design.lateEntryMinutes`. The default is 1440 (24 hours), a local policy
  value; record-keeping guidance asks for late entries to be identified but sets
  no number.
- A late entry is labeled "Late entry" with its observed and signed times, on the
  signing screen and in the stored record. The label informs; it does not block
  signing.
- Proved: the label appears exactly when the gap exceeds the threshold, and no
  accepted timing projection has `observedAt` after `signedAt` (theorems below).

### Encoding and trust boundary

`Captured.enteredAt?` is set by every value-creation path (human entry, macro,
record/default/link prefill and prior-authorization convenience action), from
`epochNow`. Confirmation and draft restoration retain the original stamp.
A replacement value is a new entry with a new stamp. The FHIR adapter supplies
an absolute UTC minute and the selected encounter's start when present.

Observation elements carry `observation? = some true`. Their optional companion
`<element>.observedAt` is a normal text field, with `observationOf?` naming the
source, `.never` prefill, human-only entry, and the new `.observationTime` validation.
The wire text is an integer UTC epoch minute; the painter offers local date/time
input. This companion was chosen over a new event constructor to retain the
existing field, event, role, macro and painter paths. It also avoids extending
workspace state. It is not a required entry and never copies an observed time.
Empty text resets to entry time; all nonempty values must satisfy the inclusive
source-entry and known encounter-start bounds. Source-value changes invalidate
the companion through the existing linked-dependency mechanism. Canonical
programs place it beside each marked vital, measurement and assessment field.
The initial marked set is weight, height, head circumference, both blood-pressure
components, pulse, respiratory rate, temperature, oxygen saturation, pain score
and reassessment, exam, assessment/plan, nursing and handoff assessments, fall-risk
and depression screens, disposition condition, operative findings, estimated
blood loss and postoperative condition. Historical narrative and calculated
dosing copies retain entry timing without a separate observation override.

`DesignRules.lateEntryMinutes` reads the optional wire field `lateEntryMinutes`,
with a default of 1440. This is **local policy**, not a regulatory interval.
The same native `EntryTimes.records` drives the signing preview and accepted
command's `entryTimes`; a timestamp after signing refuses the commit, while a
late label alone never does. The app formats the informational observed/signed
times for the clinician. Clearing an optional override always remains possible;
the completion checker permits only this resettable, optional validation family
and retains its conservative refusal for required or other validated values.

The service stamps each accepted interaction with server-owned
`entryEpochMinute` journal metadata (overwriting any caller value), and supplies
it as `Facts.epochMinute?` during native reconstruction. The metadata is
removed before decoding the unchanged Lean `Event` format. Live fields wait for
that response before painting, so replay uses the original clock rather than
renewal or replay time. Ordinary interactions reuse their session; an expired
interaction uses the existing guarded renewal before retry. Signing and
departure retain their existing renewal boundary, with no chart-session cap. The commit guard receives the fresh trusted signing
clock. This requires no schema migration: command events, draft checkpoints and
FHIR resources already persist JSON atomically.

Observation resources use observed time for `effectiveDateTime` and signing time
for `issued`. Blood-pressure components observed at different times become
separate resources. `Provenance` retains each source capture's entry, observed
and signed times and a per-entry `late-entry` extension; late observations also
carry that extension. Notes retain their existing FHIR document signing date
and store per-section timing in provenance. MAR keeps its existing bedside vs
charted-time projection and gains capture timing in the durable accepted command.
TypeScript/FHIR/SQL serialization remains a tested trust boundary.

### Proofs and compatibility

All new timing statements are marked **New specification for owner review**:

| Lean theorem | Scope |
|---|---|
| `EntryTimes.late_iff`, `EntryTimes.records_late_exact` | A native stored/preview label is true exactly when signed minus observed exceeds the local threshold, including equality at the boundary. |
| `EntryTimes.stored_observed_le_signed`, `Commit.accepted_observed_le_signed` | No timestamp in an accepted native timing projection has observation after signing. |
| `EntryTimes.companion_needsHuman`, `companion_no_prefill`, `companion_no_macro` | The time companion cannot be prefilled or supplied by a macro. |
| `EntryTimes.prefill_enteredAt`, `prefill_field_new_enteredAt`, `enter_new_enteredAt`, `new_entry_has_enteredAt`, `prior_auth_new_enteredAt` | Newly created prefills and entered values use the trusted clock; with an absolute clock, new entries have an entry timestamp. |
| `EntryTimes.observation_time_reset` | A human can reset an optional override despite missing historical facts. |
| `Render.uiLateEntries_exact`, `uiLateEntries_readOnly` | Signing labels appear exactly for above-policy gaps and add no interactive component identity. |

Existing guarantee statements stay proved. Auxiliary capture-construction
statements include the new metadata, and prior-authorization frame lemmas are
generalized over that metadata. No clinical requirement or guard is relaxed.

All new core fields are optional: absent JSON decodes to `none`, and `none` is
omitted on encoding. The derived encoding for existing events is unchanged.
Legacy facts without an absolute clock retain unstamped captures, rather than
inventing a date from a day-relative clock. This compatibility exception is why
the capture-time proofs explicitly assume a trusted absolute clock; live service
contexts provide it. It is not a claim that historical entries were retroactively
dated. The catalog's dated/timed entries describe this implemented scope.

## 3. Signing deficiencies (*new specification* for the cross-record view)

- A deficiency is a clinician, patient, encounter, item, deadline and status:
  pending, or delinquent once the deadline has passed.
- Items:
  - Every `TemporalReq` whose status is missing or overdue, for commits the
    clinician's role performs. The deadlines are the encoded rules above.
  - Every saved unsigned draft (a draft checkpoint). Its deadline is the commit's
    temporal deadline if it has one. Otherwise, it is
    `spec.design.unsignedDraftMinutes`, default 1440 (local policy).
- Computed in Lean from the same `temporalStatus` the interpreter uses, so the
  list introduces no new rule semantics. The commit service serves it to the
  signed-in clinician, and the app shows it as a work list.
- To prove: completeness (every overdue obligation of the role's commits is
  listed) and soundness (no listed item belongs to a signed commit).

## 4. Order reconciliation at transfer and discharge (*new specification*, hospital policy)

- A draft checkpoint records the patient's ADT revision when it is saved.
- **Transfer:** if the ADT revision changed because of a transfer, unsigned order
  drafts restore marked "Needs reconciliation". The order commit is blocked until
  the clinician makes an explicit per-line decision: keep, change or discontinue.
  Only a human can make it, like medication reconciliation.
- **Discharge:** the encounter is closed, so unsigned inpatient order drafts are
  not restored. They are kept in provenance and listed to their author as
  discarded at discharge.
- To prove: after a transfer, no restored order draft can be signed without a
  decision; after a discharge, no inpatient order draft is restored.

## Effect on recordings

The timing implementation changes the Lean contract, exported release specs and
programs, the commit service and the app. Historical codecs remain compatible,
but new absolute-clock captures and new controls change replay output. These
changes intentionally invalidate the certified app hash. `runs/core-10day`
needs one re-certification after the timing and outstanding-work changes merge.


## Verification

The default Lean build passes **623 jobs**. The new and edited theorem axiom
prints contain only the permitted axioms; the verification audit passes all
**84 audited theorems**. Generated types/release content and the proof map were
refreshed. App and service typechecks, the production app build and targeted
ESLint pass. The targeted app suite passes **104 tests**; service unit and
integration suites pass **41 tests**, including immutable retry timestamps,
clock-forgery rejection, bounds, restoration, renewal and independent replay.

Commands were run with `CI=true`, `TMPDIR=/home/saithat/Projects/run-tmp`,
`LEAN_NUM_THREADS=4`, and `pnpm_config_verify_deps_before_run=false`:

```sh
(cd lean && lake build)
(cd lean && lake exe gents)
(cd lean && lake exe export-content "$TMPDIR/timing-content")
# Only releases/**/*.json from that scratch export were copied into the worktree.
bash scripts/audit-verification.sh
(cd lean && lake build Ehr.Layout.Range Ehr.Layout.Structural Ehr.Layout.Shell Ehr.Layout.FamilyJson Ehr.Sem.ExoticApi Solution)
scripts/proof-map/build.sh --readme
pnpm --filter app typecheck
pnpm --filter @vgi/commit typecheck
pnpm --filter app build
pnpm --filter app exec eslint src/core/liveSession.ts src/data/commitMapper.ts src/data/commitService.ts src/data/fhir-r4.ts src/ehr/ui/nodes.tsx tests/commitMapper.test.ts tests/ui-painter.test.tsx tests/live-drafts.test.ts e2e/ui-check.spec.ts --max-warnings 0
pnpm --filter @vgi/commit exec eslint src/store.ts src/projection.ts src/projection-codecs.ts test/entry-times.integration.test.ts test/integration.test.ts --max-warnings 0
```

The database tests used a separate 256 MB Postgres instance on port 55438,
with unique synthetic tenants; no shared clinical database was modified:

```sh
COMMIT_PG_PORT=55438 docker compose -p vgi-timing-tests -f services/commit/compose.yml up -d --wait postgres
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55438/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/timing-commit-fixture.json"
(cd lean && LEAN_PATH=.lake/build/lib/lean /home/saithat/.elan/toolchains/leanprover--lean4---v4.35.0/bin/lean --run ../services/commit/test/Fixture.lean) > "$COMMIT_FIXTURE"
pnpm --filter app exec vitest run tests/commitMapper.test.ts tests/ui-painter.test.tsx tests/live-drafts.test.ts tests/live-projection.test.ts tests/mar-session.test.ts tests/screen-fingerprint.test.tsx tests/promoted-schema.test.ts --maxWorkers=4
(cd services/commit && node --experimental-strip-types --test --test-concurrency=1 test/unit.test.ts test/entry-times.integration.test.ts test/drafts.integration.test.ts test/workflows.integration.test.ts test/screen-fingerprint.integration.test.ts test/integration.test.ts)
```

Two focused browser audits ran sequentially with four workers. Native synthetic
exports exercise the earlier-time control, a three-minute gap and the exact
two-minute boundary under an explicit two-minute test policy. This does not
change the default 1440-minute local policy. The timing audit passes **29 tests**
(5 project-scoped skips), **2 states / 18 measurements / zero findings**. The
alert-policy subset passes **53 tests** (13 project-scoped skips), **11 states /
99 measurements / zero findings**. The gate checks both readable local dates
and exact UTC instants in machine-readable `time` elements.

```sh
node --experimental-strip-types scripts/export-entry-time-screens.mjs "$TMPDIR/timing-screens"
EHR_SCREEN_WORKERS=4 EHR_PHYSICAL_POLICY=1 EHR_ENFORCE_PHYSICAL=1 EHR_PHYSICAL_REPORT="$TMPDIR/timing-screen-physical.json" EHR_SCREEN_RESULT="$TMPDIR/timing-screen-result.json" node app/scripts/screen-check.mjs --ui "$TMPDIR/timing-screens/late.json" "$TMPDIR/timing-screens/boundary.json"
EHR_SCREEN_WORKERS=4 node scripts/audit-alert-policy.mjs "$TMPDIR/timing-audit-urgency" --urgency-only
COMMIT_PG_PORT=55438 docker compose -p vgi-timing-tests -f services/commit/compose.yml down -v
```

The full template/persona audit pair, full conformance, packaged WASM rebuild and
recording re-certification remain for the combined changes after merge. These
checks use current native Lean; they do not certify the older packaged WASM.
Signing deficiencies and order reconciliation are not implemented here.
