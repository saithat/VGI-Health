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
