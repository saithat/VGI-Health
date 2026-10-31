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
