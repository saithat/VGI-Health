# Changes to the core model (lane A)

Where `core-model.md` was ambiguous, or the Lean code had to differ from the
sketch, the choice and the reason are recorded here. No safety rule was weakened.
Several were made stricter; those are marked **(stricter)**.

## Data formats (M1)

1. **Optional fields end in `?`.** `parent?`, `hotkey?`, `copyOf?` (Component),
   `linkedFrom?` (ElementSpec), `provenance?` (Captured), `popup?` (State,
   ScreenView), `weightToday?`, `medToGive?` (Facts), `indication?`
   (OrderChoice), `refill?`, `disposition?` (TaskChoices), `value?`,
   `provenance?` (ItemView).
   *Why:* Lean's derived JSON writes such a field under the name without `?`
   and leaves it out when it is `none`. Without `?` it would write `null`.
   JSON names are unchanged (`"parent"`, `"popup"`, …).
2. **Formulary keyed by name.** `DrugInfo.code` is replaced by `name` (the
   lowercase generic name, the key) plus `rxnorm : List String`.
   *Why:* orchestrator decision; the world generator uses the same names.
   Order-line drugs (`"drug"` element values), `Facts.medToGive?`, and
   `OrderChoice.drug` all use the name.
3. **New `Facts` fields.**
   - `medToGive? : Option String`: the drug being administered in this
     episode. *Why:* `When.medClass` ("the med being given") needs a source.
   - `receipts : List Receipt`: prior review receipts (from Provenance).
     *Why:* the doc says `State.receipts` starts "from context"; `init` only
     gets spec, program, facts, and user, so the context goes in the facts.
   - `record : List (String × String)`: other named record values a field may
     prefill from (e.g. `visitDiagnosis`). *Why:* BRIEF 9a prefills the
     indication from the visit diagnosis; this avoids a new field per fact.
4. **Times.** `Receipt.time` uses the same minute scale as `Facts.now`. The
   current time in minutes is `facts.now + state.clock / 600` (clock is in
   deciseconds).
5. **Interface records added** (so their TS types are generated too):
   `StepOutput {state, result}`, `StepInput`, `ViewInput`, `BatchCase`
   (one `run-batch` line), `BatchStep` (one `run-batch` output line).
6. **`ItemView` fields** made concrete: `comp`, `shown`, `depth`, `expanded`,
   `selectedTab`, `slot` (the order line a field is bound to), `value?`,
   `provenance?`, `pendingConfirm`, `firing`.
7. **`Task` and `DaySchedule` live in `Ehr/Core/Json.lean`**, not `Types.lean`.
   *Why:* `Task.todayResources : List Lean.Json` needs `Lean.Data.Json`, and
   `Types.lean` must import only `Init` for the WASM build.
8. **`Certificate.time` is a string** (ISO 8601 timestamp).
9. **Fields with defaults are still required in JSON.** Derived `FromJson`
   only treats `Option` fields as optional. Lean always writes every field;
   writers on the TS side must too (`label`, `tab`, `visibility`, `size`,
   `tag` on components; `receipts`, `record` on facts; etc.).
10. `macro` is a Lean keyword, so the constructors are written `«macro»`
    (`Kind.macro`, `Actor.macro`). JSON is unchanged: `"macro"`.
11. **`ItemView.humanOnly`** (added in M2): the field's element only a human
    may enter, so the app can render it as unskippable (BRIEF 5a).

## Interpreter semantics (M2)

1. **Well-known element IDs.** `"drug"` (an order line's drug: a formulary
   name as `Value.code`), `"dose"` (quantity, checked in mg), `"weight"`
   (quantity, required in kg). Each slot with a captured `"drug"` is an order
   line. `banner` shows the info `"patientBanner"`.
   *Why:* `When.orderClass`, per-order-line requirements, and the dose and
   weight alerts need to know where drugs, doses, and weights live.
2. **Guard split.** The doc lists "interruptive alerts acked" both in the guard
   and as a separate popup step. The code splits it: `guardBase` (role,
   entries, reviews) fails → `blocked reason`; otherwise a pending popup
   becomes `popup` → `blocked "alert"`; otherwise the commit needs
   `alertsAcked` too. `commitGuard = guardBase && alertsAcked` is what T0 proves.
3. **Human-only clause folded into entries.** An entry requirement is met by a
   single captured value that is confirmed, valid, and (for a human-only
   element) entered by a human. *Why:* checking "confirmed" and "by a human"
   on possibly different values would be weaker.
4. **Guard re-checks values.** The guard re-checks identity (against current
   facts), cosign (different from the current user), scan targets, units, and
   that a flag is checked, not only at entry time.
5. **Identity format.** Patient-ID re-entry is `Value.text "<initials>/<sex>/<age>"`,
   e.g. `"JD/F/34"`.
6. **Scans** **(stricter)**: a `wristband` scan must read `Facts.patientId`; a
   `medication` scan must read `Facts.medToGive?`. Other targets need a
   non-empty code.
7. **Macro values need a human confirm** **(stricter)**. The doc says `enter`
   stores `confirmed := true` for any actor. A macro's value is stored with
   `confirmed := false` and provenance `"macro"`, so a human must confirm it
   (BRIEF 9a: "the indication defaults …, and the surgeon confirms it").
   A macro also may not enter a `never`-prefill element (the policy says a
   human must enter it).
8. **Macros may not review, confirm, or run macros** **(stricter)**.
   `markReviewed`, `confirm`, and clicking a macro button are refused for
   `Actor.macro` (as are commit, ack, and human-only entries, per the doc).
   *Why:* a receipt claims a human reviewed the info; a nested macro would
   also break structural recursion.
9. **`markReviewed` only while the info is shown** **(stricter)**. *Why:* a
   receipt is evidence of review; making one for hidden info would be false.
10. **Prefill also skips human-only elements** **(stricter)**, not only
    `never`-policy ones. `autoLinked` gives `confirmed := true` only for a
    `linked` prefill copied from a confirmed value; every other prefill is
    unconfirmed.
11. **Prefill never overwrites**: a field is prefilled only if nothing is
    captured for its element and slot. Revisiting a screen captures nothing twice.
12. **Popup is modal**: while `popup` is set, every event except `ack` is
    `blocked`, and `view` lists nothing as enabled.
13. **Removable alerts** pop up at a commit only if the current screen has an
    `alert a (popup := true)` component for them. Interruptive alerts pop up
    from the spec alone. Passive alerts never pop up.
14. **Alert keys**: drug–allergy `drug@allergyVersion`; interaction and
    duplicate therapy `drug@medsVersion`; dose out of range `drug#slot`;
    weight in lb `"weight"`; care gap: the gap name; high-alert: the drug.
    A new data version is a new key, so the alert may fire again (A3).
    Drugs considered: order-line drugs plus `Facts.medToGive?`.
15. **Alert conditions** (over facts, captured values, formulary):
    drug–allergy: a drug class is in `allergyClasses`; interaction: a drug's
    `interactsWith` class is a current-med class or a class of another drug in
    play; duplicate therapy: the drug's first class is a current-med class or
    the first class of another drug in play; dose out of range: a dose in mg
    on an order line is outside the drug's mg/kg range for the kg weight
    (captured, else recorded today in kg; never lb); weight in lb: a captured
    weight in lb; care gap: any `careGaps`; high-alert: a high-alert drug.
16. **`unlessReceipt i`** hides a component when some `shownOrReceipt` review
    requirement for `i` has a valid receipt.
17. **Parents.** A component whose `parent?` is missing, or is not a group or
    tabs component, is not shown. Ancestors must themselves be shown. A parent
    cycle ends as "not shown". Non-collapsible groups are always open.
18. **A commit already done is ignored.** Clicking a hidden or unknown
    component is ignored. `scroll` is ok only for the current screen; `search`
    is ok only if a search component is shown.
19. **Macro result.** A macro that stops returns
    `blocked "macro stopped at step <i>: <reason>"` with the state after the
    steps that ran. A macro step that is `ignored` also stops it.
20. **The clock is advanced by the caller** (the app or the simulation sets
    `state.clock`); `step` does not change it.

## API and CLI (M3)

1. **Exports.** `@[export ehr_init] apiInit`, `@[export ehr_step] apiStep`,
   `@[export ehr_view] apiView` take one JSON string per argument, as in
   section 5 (`step(spec, program, facts, user, state, event)`). The WASM spike
   bridge calls a one-string envelope, so envelope forms are exported too:
   `ehr_init_envelope` (`InitInput`), `ehr_step_envelope` (`StepInput`),
   `ehr_view_envelope` (`ViewInput`). All six are thin wrappers over
   `runInit`/`runStep`/`runView`, which the native CLI also calls.
   Parse errors return `{"error": "<argument>: <message>"}`.
2. **`facts(bundle)` is not implemented yet** (FHIR → Facts abstraction, T5).
3. **API events are always `Actor.human`.** Macros run inside `step`.
4. **`InitInput {spec, program, facts, user}`** type added for `ehr init`.
5. **`run-batch`** prints `{"case": i, "error": …}` for a line it cannot parse,
   continues with the next line, and exits with code 1 at the end.
6. **`spec-export`** knows only `tiny` for now; real specs
   (`Ehr/Specs/V1.lean`, …) register in `specRegistry` in `Main.lean`.

## California rules (owner-approved extension)

1. **`ReviewReq.waivedBy? : Option ElementId`** (JSON `waivedBy`, left out
   when none). A review requirement is also met when its `waivedBy` element
   was captured in this episode by a human (`byHuman`), confirmed, with a
   non-empty value (non-empty code/text/user, a checked flag, or any
   quantity). For CA H&S Code §11165.4: review CURES before a first Schedule
   II–IV prescription, or document why it was not consulted.
2. **`When.naloxoneRisk`**: some order line's drug is in class `"opioid"` and
   (the patient's `currentMedClasses` has `"benzodiazepine"`, or the line's
   daily MME ≥ 90). Daily MME = dose (mg) × doses per day × MME factor; in
   tenths, `dose × perDay × mmeFactorTenths ≥ 9000`. Doses per day come from
   the order line's `"freq"` element (new well-known ID; `Value.code` or
   `Value.text`): q4h 6, q6h 4, q8h 3, q12h 2, daily 1, bid 2, tid 3, qid 4
   (case-insensitive). **Stricter choices:** an unknown or missing
   frequency, a missing dose in mg, or an opioid with no MME factor all count
   as a risk. Per order line (`perOrderLine := true`), the line's own dose and
   frequency are used. For CA B&P Code §741.
3. **`DrugInfo.mmeFactorTenths : Nat := 0`** (morphine 10, hydromorphone 40,
   oxycodone 15, hydrocodone 10, tramadol 2). New drugs: oxycodone,
   hydrocodone-acetaminophen, tramadol, lorazepam, alprazolam. The class
   `"controlled-II-IV"` is on morphine, hydromorphone, oxycodone,
   hydrocodone-acetaminophen, tramadol, lorazepam, alprazolam. Reference data,
   not clinical advice.
4. `lineMatches` now takes the state and slot (needed for the per-line MME).

## Proofs (M4)

1. `parseTenths` and `freqPerDay` are written over character lists with
   structural recursion (same behavior as before). *Why:* `String.splitOn` and
   `String.toLower` do not reduce in the kernel, and the proofs' `example`s
   evaluate the real interpreter with `decide` (no `native_decide`).
2. A4 is stated with the alert rule looked up by ID (`sp.alert? a`). If a spec
   had two alert rules with the same ID, the theorem speaks about the first.
   The checker's well-formedness check should require unique alert IDs.

## Release v1.1 support (BRIEF 9b)

1. **`Kind.priorAuth (info : InfoId)`**: the prior-authorization status of the
   current order line. It counts as showing `info`, like a panel (`showsInfo`).
   In the view, its `slot` is the current order line and its `value` is the
   request on that line (`flag true`), if any.
2. **`Action.requestPriorAuth`**: writes only the `"priorAuthRequest"` element
   (new well-known ID) on the current slot, as `Value.flag true`. Same rules as
   entering a value: the element must be in the spec (so under spec v1 the
   request is `blocked "unknown element priorAuthRequest"`), the role must be
   allowed, a macro may not request it if the element is human-only or
   `never`-prefill, and a macro's request waits for a human confirm. Ignored if
   the current slot has no order.
3. **Catalog tags.** `Kind.catalogTag` gives each kind's tag; a
   `button requestPriorAuth` has the tag `"priorAuth"` too, so both parts of the
   feature need the v1.1 catalog. `Program.inCatalog` is a helper for the
   checker lane (the checker enforces the catalog).
4. **Tiny v1.1 example**: `specV1_1` (adds the optional element, the
   `priorAuthStatus` info, and the `"priorAuth"` catalog tag; no requirement
   uses them) and `programV1_1` (status panel and request button in the order
   composer). `ehr spec-export tiny-1.1` prints the spec.
5. T0, T3, A2, A4 were re-checked with the new kind and action (new branch
   lemmas `requestPriorAuth_macro_safe`, `requestPriorAuth_commits`,
   `requestPriorAuth_popup`).

## T6 (macros)

1. `runMacro` builds its stop message with `macroStopReason i r` (same text
   as before), so T6 can state the result exactly.
2. T6 compares a macro run with a reference fold of the public `step` with
   `actor := macro` over the macro's steps. `MacroStep.goto` has no `Event`, so
   the reference does it as a navigation (like a `goto` button), refused while
   a popup is open.

## Core requests: CR-1

`newOrderLine` is blocked with `finish this order line first` while the current
drug line misses any applicable per-order-line entry requirement. Both human
and macro clicks obey it. Empty lines can advance. This keeps earlier lines
complete without adding another navigation action. Core regression guards cover
incomplete, empty, complete, and macro cases.

Minimal compatibility edits: split the new hard-stop branch in T0, T3 and Alerts
frame proofs; register Core.Tests in Ehr.lean. No theorem statements changed.

## Core requests: alert clicks, CR-2 and CR-4

Inline alert components are informational: a human click is `ignored`; a macro
click is explicitly `blocked "human only: acknowledge"`, stopping the macro.
Only a human `ack` event matching the open popup records an acknowledgment.
A popup continues to block all clicks. Interruptive alerts still fire from the
spec at commit even if their inline component is removed. Passive alerts never
pop up. Core guards exercise these paths.

CR-2 keeps the existing `unlessReceipt` semantics. The checker must use its
requested conservative rule: a conditional pin is usable only when every
receipt that hides it also satisfies that commit's requirement. CR-4 is already
implemented by `waivedBy?`, `waived`, `reviewMet`, and T2's human-waiver branch;
no new weakening or change is needed. CR-3 is handled with the workflow request
in the next core item.

Minimal compatibility edits: add a state-preserving alert branch to T0/T3/Alerts
frame proofs. The 18 Comparator theorem statements are unchanged.

## Core requests: record source, episode conditions and passive workflows (CR-3)

- `ElementSpec.recordFact?` is the sole permitted `fromRecord` source. Missing
  or mismatched declarations cause no prefill. `weightToday` retains its unit.
- `When.encounter kind` matches the optional `Facts.encounterKind?` for this
  episode (absent or another kind is false). `FactsContext` passes it through
  the FHIR projection. `When.weightBased` tests the formulary range, per drug
  for per-line requirements and existentially over orders otherwise.
- Passive-alert `screens` now contains workflow tags. `targetsScreen` compares
  `Screen.workflow`, surviving arbitrary screen IDs. Enter-once remains a
  checker responsibility per workflow path, as requested by content.

Minimal compatibility edits: annotate Tiny's weight source and V1's weight,
chiefComplaint, pharmacy and refillPharmacy sources; migrate the three passive
V1 targets and Tiny's target to W1/W5. Add optional context plumbing in
Render.Types/Fhir; adapt prefillRecord_element to the source check and the Alerts example
target to W1. Preserve recordFact and accept the new When constructors in
agent/src/lean-types.ts (its round-trip test would otherwise strip recordFact).
No entry/review rule or theorem statement changed. Content
must spread passive components to every relevant workflow screen, and checker
must use workflow targets. Existing pre-op rules remain on signPreOpOrders;
content can now migrate them using the encounter condition without core edits.

## Core requests: typed task choices, service orders and dose caps

- Added optional `OrderChoice.supplyDays?`, `curesExemptReason?`, `holdReason?`;
  `TaskChoices.painScore?`, `w6Step?` (typed W6Step), `refillReason?`. These JSON
  fields omit `?` and no longer need overloaded note strings. Existing schedules
  remain parseable because additions are optional.
- `OrderKind` is medication/imaging/procedure. Optional `OrderChoice.kind?`
  defaults semantically to medication; `code?` holds a service code for non-drugs,
  whose drug string is empty. `OrderChoice.drug` is the lowercase generic name
  for medications (core-model section 7 corrected). `isPriorAuthService` selects
  imaging/procedure for the CMS-0057-F release, excluding drugs.
- Core service orders capture `orderKind` and nonempty `orderCode` on a slot,
  with no drug there. `hasOrderAt` lets prior-auth requests recognize them;
  drug alerts/class requirements keep using medication-only `orderLines`.
  Content's release spec must declare those two fields for entry.
- `DrugInfo.maxDoseMgTenths` is an absolute per-dose cap (0 = unspecified).
  `doseOutOfRange` clamps both weight-based bounds to the cap and independently
  detects an absolute overdose even without weight. Existing world's pediatric
  reference caps populate amoxicillin (largest cap 2000 mg), azithromycin,
  ceftriaxone, acetaminophen, ibuprofen and ondansetron. Regimen-specific caps
  below a drug's largest cap remain world regimen decisions, not generic caps.

Minimal non-core edits: add those six cap values in Ehr/Formulary.lean and
preserve the optional choices in agent/src/lean-types.ts. No
property/spec rule or theorem statement changed. Core guards cover heavy-teen
caps, ordinary ranges, missing weight, typed JSON round trips and service-order
prior-auth requests without spurious drug alerts. HANDOFF-sim.md is absent on
main at the fetched revision; the orchestrator's explicit requests were used.

## Core requests: full GenTS render and schedule exports

GenTS now collects Ehr.Render.Types alongside Core.Types/Json: Display and its
rows, Html/Attr/Tag/Cls, read-only/part types, wire PageNode/PageAttr, FactsContext,
FactsOutput and RenderInput. Task and DaySchedule were already exported from
Core.Json and remain included. Generation fails if key public types disappear
or two namespaces produce the same TypeScript name. Samples add real Lean JSON
for Display, PageNode, RenderInput, FactsContext and FactsOutput; tsc checks the
boundary representation alongside the existing Task/DaySchedule samples.

No runtime semantics, properties, or theorem statements changed. GenTS and
Samples are the necessary generator files outside Core; outputs are regenerated,
never hand-edited.

## Consolidated content follow-up: human alert clicks open pending alerts

The consolidated checker request file includes content's more specific request
that human clicks open firing alerts. This supersedes item 2's informational
human-click choice: `clickAlert` opens the clicked alert's first pending popup
candidate and never acknowledges it. Passive/unknown/nonfiring/acked alerts
remain ignored. Removable alerts retain their program popup opt-in. Macros are
still blocked; the view enables precisely clicks that open a pending alert.

Minimal proof compatibility: T0 uses clickAlert_commits and Alerts uses
clickAlert_popup. Existing A2/A4 statements and safety rules are unchanged.
Core guards exercise public clicks, unchanged acks and ignored cases.

## Checker CR-6: preserve prior-auth captures and literal human-entry policy

The consolidated checker request file also identifies two genuine prior-auth
capture issues. A request action now preserves the entire state when this slot
already has any confirmed priorAuthRequest capture (including a false flag or
one with different provenance). A human request click cannot create a capture
for a never/human-only element: it is blocked with `human entry required`.
Such a request must use an ordinary human field Event.enter, as the existing
HumanStepsByHuman property requires. Allowed non-human-only policy requests
retain their convenience-action behavior. No property was weakened.

Minimal compatibility: Tiny v1.1 exposes the required human request field,
TinyTests enters it before checking status/signing, and the T3 frame proof
splits the preservation branch. The Tiny spec retains its never policy.
View reasons and public-step service tests match the stricter behavior.

## World follow-up: albuterol absolute cap

Added the requested 5 mg per-dose cap (`maxDoseMgTenths := 50`) while keeping
albuterol's existing mg/kg range. Regression guards cover the three adolescent
weights from the world run (52.5, 69.6 and 71.4 kg), doses just below and above
the capped range, a smaller child's ordinary dose, and overdose without weight.


## Owner-approved Schedule II rule: allowed entry values

Added optional `EntryReq.allowed?` (`allowed` in JSON). The guard compares each
allowed string parsed using the element kind to the exact capture that meets
confirmation, validity, human-entry, units and slot requirements. No constraint
preserves old behavior; an empty list permits no capture. Numeric refills are
`quantity none`, so `some ["0"]` permits `qty 0 none`; wrong units, unchecked
flags and unconfirmed values still fail. Both commit and current-line guards
use the check. Entry reasons identify failing matching slots and report
`value not allowed: refills (allowed: 0)` for confirmed nonzero refills.

`When.drugClass` is an additional spelling of `orderClass`, for compatibility
with the requested contract. With `perOrderLine := true` it matches the drug on
that line. The four requested Schedule II formulary drugs carry `scheduleII`;
tramadol, lorazepam and alprazolam retain controlled-II-IV without that class.
The first therapeutic class is preserved for duplicate-therapy detection.

T0's existing `commitGuard_iff` now refers to the stricter executable `entryMet`.
`entryMet_iff_values` and `commitGuard_iff_values` additionally spell out the
allowed-value witnesses. `T0_entry_values_allowed` adds the constraint to all
previous value guarantees, and the original `T0_entry_values` is derived from
it. `T0_entry_values_perLine` proves the same guarantees on every matching
order slot. Concrete completing examples discharge all hypotheses for both
new T0 corollaries. Original Comparator statements stay intact; no safety
property or hospital spec is weakened. New theorems are axiom-audited.

Core guards cover confirmed bad defaults, successful zero entry, all four
Schedule II drugs, all three Schedule IV exclusions, whole-episode and per-line
checks, inactive requirements, empty/invalid allowlists, units, pending values,
wrong-slot and mixed-line captures, view reasons, human/macro new-line stops,
and the JSON API. GenTS regenerates the optional list and new constructor;
real JSON samples include the requirement and an example spec. Content/check,
agent validators, and WASM artifact adoption are requested explicitly in
`changes-requests.md`, respecting lane ownership.

## Rules catalog: event-time-window (67 rules, M)

`CommitSpec.temporal?` adds independent `TemporalReq` obligations. Event refs
select a unique current artifact binding and evidence with matching patient,
episode, artifact/version and nonempty actor. Completion and filing are separate
event IDs. Only anchor evidence may be planned; future actual evidence fails.
`Facts.epochMinute?` plus the interpreter clock uses signed UTC epoch minutes,
independent of the existing day-relative receipt clock. Inclusive signed offsets
express both before and after windows. An explicit deadline distinguishes missing,
invalid and overdue obligations. Completed timely obligations stay met thereafter.
Business-day calculations require a named calendar covering both local epoch dates;
the trusted adapter supplies timezone and holiday mapping. Missing/ambiguous inputs
fail closed. No typed UI value can fabricate external event evidence.

`extraGuard` strengthens `guardBase`; screen views expose all obligation statuses
and commit buttons use the same guard/reason. GenTS now exports Int as number and
the evidence, calendar and temporal types, with real JSON samples. Tiny examples
and boundary/identity/version/calendar regression guards live in Core.Tests.

**DRAFT statement change:** `commitGuard_iff` (and its value corollary) now has
an additional `extraGuard = true` conjunct. This is necessary to describe the
stronger executable guard; the other 17 Comparator statements remain unchanged.
The proof implementation and matching DRAFT Statements entry are minimal
compatibility edits explicitly requested by the orchestrator. No finished proof
uses sorry, admit, new axioms or native_decide. Adapter, checker route coverage
and production content adoption remain owning-lane work below.

## Rules catalog: patient-predicate (59 rules, M)

`ClinicalPredicate` is a closed AST: age bands, named service/payer/setting,
homelessness, pregnancy, capacity and consent facts, named risk/test categories,
confirmed captured-code equality on a specific slot, and and/or/not. Record
facts retain artifact/version provenance checked against the unique current
binding. Missing, ambiguous or stale facts evaluate to unknown. Kleene logic
preserves unknown through negation; **the explicit fixed unknown policy applies
a requirement unless known false**. Thus missing age never bypasses a minor rule.
`When.clinical` is shared by whole-episode and per-line entries and reviews;
`TemporalReq.when` supports conditional event obligations. `AlertCond.clinical`
uses the same evaluation, with distinct true/unknown keys bound to the clinical
snapshot and captures so changed evidence can be acknowledged again.

Core Tiny examples cover age 17/18, composition, stale provenance, unknowns,
captured equality, actual entry applicability and alert keys. GenTS exports the
AST, source records and examples. No property or theorem statement changed in
this group. Adapter completeness and truth remain trusted; content must choose
source codes, applicability and lawful refusal paths explicitly.

## Rules catalog: value-validation (34 rules, M)

`ElementSpec.validation` is an optional closed `Validation` AST. It supports
nonempty narratives, exact membership in a versioned trusted code/product table,
Gregorian ISO dates, bounded lexical tokens/decimal formatting, quantity bounds,
formulation/unit pairs, kg weight bands, GTIN-14 checksums, a closed GS1 UDI
human-readable grammar, and named supply-days-ceiling / capped mg-per-kg
calculations. `and` composes constraints. Lexical rules require `Value.text` or
`Value.code` and preserve the exact input; a numeric quantity cannot satisfy them.
Other UDI issuer/codec formats use explicit versioned validated product tables;
the GS1 grammar accepts (01), optionally (17)/(10)/(21) in that order, with
20xx expiry dates. This is an explicit supported grammar, not a universal codec.

Validation runs on human/macro entry, generated default/record/linked prefills,
and again on every captured value at commit, including relational dependencies.
Relations require unique confirmed captures on the correct slot and exact units;
zero denominators, missing terminology and pending/wrong-unit weights fail closed.
The fixed arithmetic functions use bounded output contracts, never arbitrary
executable predicates. `ElementSpec.defaultValue` also requires program fields
to declare the exact specified default; incorrect generated values are ignored.
Views expose field validation errors and the same commit hard stop/reason. GenTS
exports all constraints and real examples. Existing theorem statements remain
unchanged; all original human/confirmation/unit/allowed-value checks are retained.

## Rules catalog: order-expiry-clock (11 rules, M)

`OrderClock` preserves durable order/detention IDs and original issue/start/
first-fill `ClockStamp`s across episodes and transfers. `CommitSpec.expiry` lists
`ExpiryReq` policies bound to current order artifact IDs/versions, independently
conditional on clinical predicates. A new UI slot/episode cannot reset an anchor;
core never writes these trusted record inputs. Actions fail at the exact expiry
instant. Views expose missing/invalid/overdue clocks and the commit hard stop.

Policies support elapsed minutes or actual calendar-month anniversaries, clamping
the day at month end. `MonthCutoff` evidence supplies the timezone service's UTC
resolution (including DST ambiguity); core verifies Gregorian date arithmetic,
zone, wall time, offset bounds and exact UTC conversion. It never approximates
months as 30 days. Renewal/reassessment use named current-version instance events,
nonempty actors, nonfuture timestamps and explicit validity windows. Renewal is
opt-in and never overrides the separate maximum original lifetime. Stop/release/
lawful-exception routes are separate commits; backend auto-stop or release is
still a scheduler duty. GenTS and Tiny guards cover cutoff boundaries, transfers,
renewals, max lifetime, reassessment and January-31 → February-28 behavior.
No property or theorem statement changed in this group.
