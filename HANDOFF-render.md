# Handoff: render lane (`lane/render`)

Worktree: `/home/saithat/Projects/VGI-render`, branch `lane/render` (pushed).
The original brief is the render-lane task (Lean renders the whole page tree;
T5, T10, T11). Read first: `docs/design/core-model.md` §9 and §9.1,
`docs/design/changes.md`, `BRIEF.md` §2, §5, §5a, §7.4, `CLAUDE.md`.

## Done

| Commit | What |
|---|---|
| `108c014` | Merged `origin/lane/lean-core` (M2 interpreter, M3 API/CLI). |
| `170f373` | Merged `origin/main` (lane A API/CLI, California rules, proofs T0/T3/A2/A4; lane app painter, `app/src/ehr.css`, offline screen check). |
| `5dcb7f0` | Step 1: types. `lean/Ehr/Render/Types.lean` (Init-only), `Html.lean`, `Json.lean`, aggregator `lean/Ehr/Render.lean` (imported from `lean/Ehr.lean`). |
| `46d8cb4` | Step 2 (in progress): `lean/Ehr/Render/Fhir.lean`, the FHIR parser. |

### Step 1 design (`Types.lean`, `Html.lean`, `Json.lean`)
- `Html` is a typed tree: `text`, or `node tag (cls : List Cls) (attrs : List Attr) children`.
  - `Cls` is an enum of the §9.1 classes **without `ehr-tiny`**: tiny components are never shown, so they are never rendered. The theorem "no `ehr-tiny` in the tree" therefore holds by the type.
  - `Attr` is an enum of the whitelisted attributes. It has no `hidden`, `aria-hidden`, or `style`; `InputType` has no `hidden`.
  - `Tag` leaves out `dialog` (hidden without `open`) and `form` (submits and reloads). The modal is a `div role="dialog"`. Record this in a design note.
- `Ro` is read-only content (banner, sidebar, info rows). It cannot carry a component ID or an event.
- `Part` is one component's rendering before its ID is filled in. It has the constructors `ro`, `el`, `box` (carries the ID), `act` (carries the ID and the event, plus `disabled` iff the component is not enabled), and `kids` (where children go).
  - `Part.toHtmls id on kids` is the **only** place that writes `data-comp-id`, `data-event`, and `disabled`.
  - Plan for the T10 proofs: one lemma by induction on `Within` over `Part.toHtmls`. It covers "only shown ids appear" and "disabled iff not enabled" for every component kind at once.
- `Within x h` is an inductive "occurs in" relation (`Within.trans` and `Within.of_mem` are proved). It also has the accessors `HasCompId`, `HasEvent`, `HasEventOf`, `IsDisabled`, `HasText`, `classNames`.
- Wire form: `Html.toPage : Html → PageNode`. The JSON is `{"text":{"s":…}}` and `{"node":{"tag","attrs":[{"name","value"}],"children"}}`, with the class list as the attribute `class`. This matches `app/src/ehr/html.ts` (zod) and `app/src/ehr/painter.tsx`.
- `PageNode.toHtmlString` produces HTML text for previews.
- `#guard`s check that every `Cls.name` is in `stylesheetClasses`, that the names are distinct, and that only `ehr-tiny` is never written.
- `Display` has `asOf` (today), `banner : BannerInfo`, and the lists `allergies`, `meds`, `vitals`, `labs` (one row per LOINC code with `trend : List TrendPoint`), `problems`, `immunizations`, `encounters`, `procedures`, and `growth`.
  - The banner is a structure, not `List (String × String)` as in the §9 sketch, so proofs can name the two identifiers.
- `FactsContext {today, now, medToGive?, receipts, record}`, `FactsOutput {facts, display}`, and `RenderInput {spec, program, facts, display, user, state}` all have derived JSON.

### Step 2 status (`Fhir.lean`)
- `parseBundle (ctx : FactsContext) (b : Json) : Except String (Facts × Display)`.
  - It takes a context because "dated today" needs today's date. This differs from the brief's `Json → …`; record it.
  - All readers are total. It fails only on a non-Bundle input or a bundle with no Patient.
- Rules in the module docstring:
  - `allergyActive`: not inactive or resolved, and not entered in error. A missing status counts as active.
  - `medActive`: status `active`. `Display.meds` holds active and on-hold requests.
  - `weightTodayOf`: the latest body-weight Observation (LOINC 29463-7) dated `ctx.today`, with a known unit (`kg`, `[lb_av]`/`lb`, `g`). Observations entered in error or cancelled are excluded.
  - `allergyVersion` and `medsVersion` = `listVersion` = a 52-bit FNV-1a digest of the sorted `id@meta.versionId` keys.
    - Why a digest: Medplum's `versionId` is a UUID, so a sum is impossible. Collisions are a trusted assumption.
    - File a change request suggesting `dataVersion : String` for exactness.
- Smoke-tested on `fixtures/synthea/Aaron_Ankunding_4966bd28.json` from `origin/lane/infra`:
  - Counts: 2 meds, 33 vitals, 24 labs, 25 problems, 15 immunizations, 20 encounters, 14 procedures, 6 growth points.
  - The banner, med, and lab rows look right (HbA1c is flagged abnormal, and its trend is read).
- **Bug found, not fixed:** the trimmed fixtures have no `resource.id`, only `entry.fullUrl` (`urn:uuid:…`).
  - As a result, `Facts.patientId`, every row `id`, and `versionKey` are empty.
  - Fix: make `bundleResources` keep `fullUrl`, or add an `idOf r` that falls back to the `fullUrl` uuid, then to the Synthea identifier (system `https://github.com/synthetichealth/synthea`).
  - The `patientId` must equal what Medplum and the wristband scan use. Coordinate with infra on which id the loader keeps.
  - Keep the T5/T11 statements phrased over the same reader.

## Remaining tasks (none dropped)

1. **Finish step 2.**
   - Fix the id bug above.
   - Merge `origin/lane/infra` to get `fixtures/synthea/` (175 files, 39 MB; `index.json` gives referenceDate 2026-10-31).
   - Add 2–3 small hand-made bundles in `lean/Ehr/Render/TestData/` (`include_str` works) covering:
     - a penicillin allergy with `meta.versionId`;
     - an inactive allergy;
     - an entered-in-error allergy;
     - active and stopped meds;
     - a weight dated today in kg and one in `[lb_av]`;
     - yesterday's weight;
     - a BP with components;
     - labs with `referenceRange` and `interpretation`.
   - Add `#guard`s on facts and display.
   - Write the Display JSON (de)serializer test (`roundTrips`).
   - Add Display/PageNode to TS generation. GenTS is lane A's file, so file a request in `docs/design/changes-requests.md`: add `Ehr.Render.Types` and `Ehr.Render.Json` to `sourceModules` in `lean/Ehr/Tools/GenTS.lean`. Test it locally first.
     - The types use only String, Nat, Bool, List, Option `?`-fields, Prod, and enums, so GenTS should handle them.
     - It would also export the internal `Html`/`Attr`/`Ro`/`Part` types; that is harmless, or split them out.
2. **Renderer** `lean/Ehr/Render/Page.lean`: `render : Spec → Program → Facts → Display → User → State → Html`. It is Init-only and uses `Ehr.view`.
   - Planned structure:
     - `Ctx {sp, prog, facts, disp, user, s, v := view …}`.
     - `itemPart cx it : Part` by `it.comp.kind`.
     - `renderItem cx : Nat → ItemView → List Html`. It uses fuel; children are `cx.v.items.filter (parent? == some id && shown)`, and the fuel is `items.length + 1`, the same as `layoutShown`.
     - Roots are the shown items with `parent? = none`.
   - Shell layout, matching `app/src/ehr.css`: `div.ehr-shell > [toolbar, div.ehr-banner.ehr-landmark (Ro), div.ehr-nav (program screens as ehr-nav-item and ehr-nav-active, plus activity-tab labels; non-interactive), modal (if popup; in document flow), div.ehr-grid > [div.ehr-sidebar (Ro), div.ehr-main > [h1.ehr-screen-title, components…]]]`.
     - `.ehr-shell > .ehr-grid` is the two-column rule.
     - The modal must stay in flow; the CSS already does this.
   - Per kind:
     - **banner** → `box` identity strip (`infoContent "patientBanner"`).
     - **field** → `box div.ehr-field` containing:
       - label text;
       - `ehr-required`;
       - an `act enter` input (or a select for coded `formulary`; a checkbox for flag, with its state in `value="true"/"false"` as `painter.tsx` expects) with `data-value-kind` and `data-unit`;
       - `ehr-unit`;
       - `ehr-provenance` showing `provenanceText p` (source and date) for `"record:<fact>"`, `"default"`, `"linked:<e>"`, `"macro"`;
       - an `act confirm` button when `pendingConfirm`;
       - an `ehr-human-only` badge when `it.humanOnly`;
       - a warning when the captured unit differs from the required unit.
     - **panel/table/trend** → `box div.ehr-panel`: title, review status (`hasValidReceipt`), and `infoContent cx i` as Ro. Trend adds an SVG `polyline`.
       - Info ids to support: `patientBanner`, `allergyList`, `currentMeds`, `vitals` (flowsheet), `resultTrend`/`labs`, `problemList`, `immunizations`, `growthChart`, `encounters`, `procedures`, `doseCheck`, `anticoagulants`, `careGaps`.
       - `doseCheck` uses lane A's `doseOutOfRange` and `weightKgTenths?`.
       - Unknown ids → spec label plus an `ehr-empty` notice.
       - The allergy and meds tables must render **every** row (T11).
       - Empty allergies → "No allergy records on file", never "NKA".
     - **alert** → `box div.ehr-alert-inline` plus the tier class, with details from `alertKeys`.
     - **button** → `act click` (`ehr-button-primary` for commit), with title = blocked reason and an `ehr-blocked-reason` span.
     - **group** → `box div.ehr-section` (plus `ehr-section-collapsed` when closed), an `act toggle` header, and `.kids` **only when `it.expanded`**.
     - **tabs** → `box div.ehr-tabs` with one `act selectTab` button per tab index (`data-tab`, titled by the first child's label), then a tabpanel holding `.kids`.
     - **macro** → `act click`.
     - **search** → `act search` input.
   - Popup: an `ehr-modal-backdrop > ehr-modal` with an ack button (`data-event=ack`, `data-alert`). The ack button gets **no `data-comp-id`**: alert ids could collide with component ids and break T10's absence part.
   - Do not emit `data-event=scroll` with a screen id in `data-comp-id`. The painter supports it, but it breaks T10's absence part.
   - Screen-check constraints (`app/e2e/visibility.ts`):
     - every `data-comp-id` element must have a nonzero box, stay inside the page width at 390px, be hit-testable at its center, and use fonts ≥12px;
     - the DOM order of `data-comp-id` must equal the tree's order.
3. **WASM-facing API** `lean/Ehr/Render/Api.lean`:
   - `@[export ehr_render] apiRender : String → String` (`RenderInput` JSON → `PageNode` JSON);
   - `@[export ehr_facts] apiFacts : String → String` (`FactsInput {bundle, context}` → `FactsOutput`);
   - on error, return `{"error": …}`, following `Ehr.Api.errorJson`.
4. **CLI `ehr render-screens`** (orchestrator request):
   `ehr render-screens --spec <spec.json> --program <p.json> --fhir <bundle.json> [--user <user.json>] --out <dir>`
   - Writes one `PageNode` JSON per (screen × representative state) to `<dir>/<screenId>[-<variant>].json`.
   - Variants:
     - the initial state on entering each screen (the `init` state, then the screen set and prefilled via `goTo`);
     - every collapsed group expanded;
     - each tab selected;
     - a popup state for each interruptive alert that can fire with the given record.
   - The context's `today` should come from the fixture `index.json` referenceDate or a `--today` flag.
   - Add it as a match arm in `lean/Main.lean` that calls a function in your own module, to keep the conflict with lane A small.
   - Check the output with `pnpm --filter app screen-check <dir>/*.json` (run `pnpm --filter app exec playwright install chromium` once).
5. **Proofs** `lean/Ehr/Proofs/Render*.lean`. Each needs a plain-language docstring, a satisfiable `example` on Tiny, `#print axioms`, and no `sorry`. Track unfinished ones in `TODO_PROOFS.md`; add T10 and T11 rows; T5 is listed with owner A and is now ours.
   - **T10**, for `page := render sp prog facts disp user s` and `v := view …`:
     - (a) every `it ∈ v.items` with `it.shown` has a node `n` with `Within n page`, `n.HasCompId it.comp.id`, and the label text (when the label is non-empty);
     - (b) every `HasCompId id` node belongs to a shown item;
     - (c) no node has class `ehr-tiny` (by the type);
     - (d) every info that `infoShown` holds for (so the guard counts it as shown) appears with all of `infoContent` inside a node with its component id;
     - (e) for each node with a comp id and an event: `IsDisabled ↔ id ∉ v.enabled`;
     - a lemma: for a shown commit button `c` with `(comps.map (·.id)).Nodup`, `c.id ∈ v.enabled ↔ popup? = none ∧ cm ∉ s.commits ∧ guardBase …`.
   - Proof plan for (a): induction on the `layoutShownAux` fuel along the ancestor chain.
     - You need fuel monotonicity of `layoutShownAux`.
     - Use: `parentOpen` ⇒ the parent is a group or tabs ⇒ `compShown parent = layoutShown parent`, and the group's `it.expanded` equals `parentOpen`.
   - Proof plan for (b) and (e): the `Part.toHtmls`/`Within` lemma.
   - **T11:**
     - `parseBundle ctx b = .ok (f, d)` → every `r ∈ bundleResources b` with `isAllergy r ∧ allergyActive r` has `allergyRow r ∈ d.allergies` (through `mergeSort_perm`);
     - then, if an allergy panel is shown, `Within (allergyTr (allergyRow r)).toHtml page`;
     - the same for meds with `medActive`;
     - pending prefills render `provenanceText p` and a confirm button.
   - **T5:**
     - `f.weightToday? = some (w, u)` → there is `r ∈ bundleResources b` with `isBodyWeight r`, `dayOf (obsWhen r) = ctx.today`, `unitOf (field r "valueQuantity") = some u`, and `qtyScaled … 1 = some w` (needs `latestBy` membership);
     - `f.allergyVersion = listVersion (filter isAllergy (bundleResources b))`, and it does not depend on bundle order (needs a lemma that mergeSort of permutations is equal).
6. **Tests and executable:**
   - `#guard`s on rendered Tiny screens (comp ids present or absent, disabled sign button);
   - an executable (for example `ehr render-screens` on Tiny, or a separate `lean_exe`) that writes HTML strings for Tiny screens and Synthea fixtures;
   - write a short `docs/design/render.md` covering the wire format, info ids, the reasons for leaving out dialog/form, and the reason for the digest.
7. Run `git fetch origin && git merge origin/main origin/lane/lean-core` regularly. Never edit `lean/Ehr/Core/**`; request changes in `docs/design/changes-requests.md`.

## Pitfalls
- `String.take` and `String.drop` return `String.Slice` in Lean 4.35. Use `.toString`, or the `Fhir.sub` helper.
- `String.splitOn` and `toLower` do not reduce in the kernel. Proofs with `decide` on concrete data must avoid them; lane A rewrote `parseTenths` over `List Char` for this reason.
- `induction` does not work on nested inductives (`Html`, `Ro`, `Part`). Reason by induction on `Within`, and use the `@[simp]` equations `Ro.toHtml_el` and `Part.toHtmls_box`/`_act`/`_el`/`_kids`, which rewrite children as `map`/`flatMap`.
- Lean's `Prod` has no `<`; compare fields directly.
- Lean's derived JSON writes `PageNode.text` as `{"text":{"s":…}}`, and the painter expects exactly this.

## Build and test
```sh
cd lean && lake build          # whole project (Ehr lib + ehr exe), ~10 s incremental
lake build Ehr.Render.Fhir     # one module
lake env lean --run /tmp/Smoke.lean   # ad-hoc runs; see git history of this note for the smoke script idea
```
Run only one `lake` process per checkout.
