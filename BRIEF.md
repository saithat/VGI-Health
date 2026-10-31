# Project Brief: Certified Adaptive Clinical Interfaces (v2)

> This is the project spec for coding agents. Build in the schedule order (section 11). If time runs short, propose cuts to the owner; never cut on your own. This brief says *what* must be modeled and proven, not the exact Lean definitions.
>
> Read with it: `rules.md` (hackathon rules) and `CLAUDE.md` (how to do Lean verification here).

## 0. Context

This is a Vibecheck hackathon entry. It is judged on two axes:
1. **Coolness:** a non-technical person watches the demo and says "ooh."
2. **Verification:** how meaningful the proofs are, and whether they are about the **code that actually runs** or about a model of it. Proofs must pass Comparator / `lake check` (Lean 4.35+).

Hard requirement: `make install && make run` works from a clean clone on a machine with Docker. `make install` may download images and packages. After that, the default demo needs no API key and no internet.

## 1. Summary

The hospital writes a **spec**. It says what each workflow must capture, what must be shown before each commit (sign, administer, acknowledge), and the rules of the design language.

Every night an **AI agent** redesigns each clinician's screen to make their own work faster. A **Lean checker**, proven correct, certifies every version offline before anyone logs in to it. For clinicians, the EHR is a normal, fast web application. Checking happens only offline. The app's screen logic is the verified Lean code itself, compiled to WebAssembly and running in the browser.

We ship:
- a realistic, dense EHR built out for the tested workflows, backed by a **Medplum** FHIR server loaded with synthetic Synthea patients;
- the specs, the Lean semantics of UI programs, the Lean checker, and proofs;
- a simulation of **five very different healthcare workers** using it for 10 work-days, while the agent evolves each one's interface;
- a dashboard that shows every decision the agent made and why.

**Pitch lines:**
- *"Every night, AI redesigns your doctor's screen to save them time. Math makes sure it never hides your allergies."*
- *"The hospital defines what must be entered and reviewed. The agent designs everything else, and Lean signs off on every version."*
- *"Every prompt we removed comes with a receipt. Every prompt we kept is there on purpose."*

## 2. Architecture

**The clinician uses a normal EHR app. Checking happens only offline. The app's screen logic is verified Lean code compiled to WebAssembly.**

| | When | What runs |
|---|---|---|
| **Online (during a shift)** | Every click | A normal web EHR (React + TypeScript) talking directly to Medplum. At login it loads the user's deployed UI program (JSON) and its certificate. The **interpreter** decides what each screen shows, what is enabled, the hard stops, and which alerts fire. It is the Lean semantics compiled to WebAssembly, called from React like a library (`ehr.step(program, state, click)`). Writes go straight to Medplum, like any EHR. No checking happens here. |
| **Offline (overnight / at release time)** | After each shift, before the next login | The agent proposes a new UI program. Lean checks it, simulation measures it, a rendered-screen check confirms it, and Lean deploys it only if it passed. |

```
 ONLINE   Browser: EHR app (React + TS, Medplum React components)
            ├─ loads the user's deployed UI program + certificate at login
            ├─ interpreter = Lean semantics compiled to WASM: screens, enabled actions,
            │                hard stops, alerts, FHIR facts
            └─ @medplum/core ──REST──> Medplum (Docker: server + Postgres + Redis)

 OFFLINE  agent loop (TS) ──> Claude API | Codex CLI ──> candidate UI program
            ──> ehr check     (Lean, proven sound: verdict or counterexample)
            ──> ehr simulate  (same Lean semantics, native build: persona runs a day -> trace + metrics)
            ──> screen check  (headless browser renders every screen of the candidate in the
                               real app; compared with Lean's description of each screen)
            ──> ehr deploy    (Lean: publishes program + certificate to Medplum only if verdict = ok)
          world generator (TS): Synthea patients -> daily schedules

 CI       build-equivalence tests: native and WASM builds give identical results on thousands
          of random programs and click sequences (this checks the toolchain; the logic is shared)
```

**Principle: everything is settled before the clinician opens the EHR.** Nothing is checked at runtime, and nothing may break or block unexpectedly during a shift. Every risk is either proven for **all** inputs (every patient record, every click sequence) or tested offline before a version is deployed. The commit guard is an ordinary hard stop (for example, "Sign" stays disabled until patient-ID re-entry is done), and the checker proves offline that a certified UI never leaves the clinician stuck behind it.

**Lean renders the page.** Given the program, the state, the click, and the patient's FHIR records, the Lean module returns the next state and the **complete page tree**: elements, text, the rows of every info panel (allergies, meds, dose check, trend points), and style classes from one fixed stylesheet. A generic painter of about 50–80 lines puts that tree in the browser and turns clicks and keystrokes back into events. It makes no decisions. The theorems cover the page tree, for every record: what must be visible is in the tree, legible, and not hidden, and every panel lists every relevant record. The app reads and writes Medplum itself, the way any EHR does: signing an order creates a MedicationRequest, and marking allergies reviewed creates a Provenance record. Each UI program declares which fields write to which FHIR elements. Overnight, the checker proves those declarations stay inside the spec ("writes only").

**What the proofs cover:** the interpreter clinicians click through, the checker, and deploy are **one Lean codebase**. So the theorems are about the code that actually runs, both online in the browser and offline in the pipeline. Nothing is re-implemented in another language.

**What is tested rather than proven (all offline, before deploy):**
- **The generic painter, the fixed stylesheet, and the browser.** The per-version screen check renders every screen of every candidate version in a headless browser, on sample patients, and confirms the visible page matches Lean's page tree (nothing required is hidden, off-screen, or covered). A version that fails is not deployed.
- **The Emscripten/WASM toolchain.** Covered by the build-equivalence tests.

**Option A (chosen), with fallback B.** Phase 0 includes a time-boxed (2–3 h) spike that compiles the interpreter to WASM with Emscripten (prior art: xeus-lean runs the Lean runtime in the browser). If the spike fails, fall back to **option B**: the same Lean code runs as a small local service (`ehr serve`) that the app calls on each click for screen logic only. The app still does all Medplum reads and writes. Switching to B needs owner sign-off, and nothing else changes.

**One Lean codebase, two builds:** a WASM library for the app (`step`, `screen`, `enabled`, `facts`), and a native `ehr` binary for the offline pipeline:
- `check`: inputs are a spec, a program, the previous version, and the canonical program. Output is an ok verdict, or the violated property plus a counterexample click path.
- `simulate`: runs a persona through a day's schedule on a program, using the Lean semantics. Outputs a trace and the metrics (section 8.1a).
- `min-clicks`: computes the exact minimum clicks (and keystrokes) to complete each task on a program, as the shortest path through its states.
- `run-batch`: runs a batch of programs and click sequences, for the build-equivalence tests.
- `spec-export`: writes a spec version as JSON for the agent and dashboard (generated; never edited by hand).
- `deploy`: publishes a program version (with its certificate) to Medplum only if its verdict against the current spec is ok.

Counterexamples replay in the **real app**, in a dashboard frame, so judges see the violation on the screens clinicians would actually see.

**The hospital spec is written in Lean,** one module per version (`lean/Ehr/Specs/V1.lean`, `V2.lean`, …), so a vendor release is a reviewable Lean diff.

**Languages:** Lean for the spec, interpreter (semantics), checker, simulation, deploy, and proofs. TypeScript for the app UI (React), the agent loop, and the world generator.

**Single source of truth for data formats:** the Lean types. Derive `ToJson`/`FromJson` in Lean, and generate TypeScript types plus zod validators from them, either by emitting a JSON Schema from Lean or with round-trip tests in CI. Validate at every boundary: Medplum responses, Lean output, agent output, fixtures.

### Tech stack

| Layer | Choice | What it does |
|---|---|---|
| Verified logic | **Lean 4.35.0** (core + Batteries; `plausible` for testing; no Mathlib) | One codebase: the interpreter (built to WASM for the app with **Emscripten**), plus the native `ehr` binary (checker, simulate, min-clicks, run-batch, spec-export, deploy, metrics). Proofs checked by `lake check` and Comparator. |
| FHIR backend | **Medplum**, self-hosted with Docker Compose (server, Postgres, Redis, admin app) | Stores patients, allergies, observations, meds, orders, administrations, Provenance (receipts), Task (in-basket), and the deployed UI programs with their certificates. |
| Patient data | **Synthea** (Java) | Generated once, trimmed, and committed. `make install` loads it into Medplum. It is also exported as fixtures for fast simulation. |
| EHR app | **React + Vite + TypeScript**, `@medplum/core`, zod; Mantine + `@medplum/react` for the dashboard and sign-in only | EHR screens: a generic painter of Lean's page tree, plus one fixed, reviewed stylesheet. It calls the Lean WASM module for state and the page tree, and talks directly to Medplum for data. |
| Agent loop | **TypeScript**, with Claude API (`@anthropic-ai/sdk`, default model `claude-opus-5-5`) or Codex CLI (`codex exec --output-schema`) | Overnight redesign and release migration. |
| World generator | **TypeScript** | Daily schedules from the Synthea population. |
| Tests | Lean `#guard` / `plausible`; Vitest + fast-check; Playwright ARIA snapshots | |
| Build | Makefile, pnpm workspaces, Lake, Docker Compose | `make install`, `make run`, `make check`. |

## 3. Instructions for coding agents (read first)

The owner writes no code. Agents build, and the owner reviews and steers.

**Lean rules** (see `CLAUDE.md` for details)
- Pin the Lean toolchain (v4.35.0) and every dependency rev. Commit `lake-manifest.json`. Use core plus Batteries (and `plausible` for testing). No Mathlib unless the owner approves.
- Everything that runs must be computable: no `Classical` in definitions that execute. `#eval` / `#guard` each executable function (checker, semantics, simulate, deploy).
- Final proofs: no `sorry`, `admit`, new `axiom`, `native_decide`, `implemented_by`, `unsafe`, `debug.skipKernelTC`, or `maxHeartbeats 0`. CI runs `lake check` plus Comparator against a trusted statements file, and `#audit_axioms` on each main theorem. During development, `sorry` is allowed only when listed in `TODO_PROOFS.md`.
- Each main theorem gets: a plain-language docstring; a satisfiable `example` (all hypotheses met on a concrete input); and `¬ Satisfies` lemmas for the seeded bad programs. Keep the `#spec_surface` list short and reviewed.
- Prefer **structural checks proven to imply semantic properties** over exploring every state (see section 7.3).

**TypeScript/React rules** (keep the app checkable)
- TS `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`.
- ESLint bans `any`, non-null `!`, `as`, `@ts-ignore`, and `dangerouslySetInnerHTML`.
- Component kinds are a discriminated union. The renderer uses an exhaustive `switch` with a `never` check.
- **The app has no UI logic of its own.** State, enabled actions, hard stops, alerts, panel contents, and the page tree all come from the Lean WASM module. The EHR screens are drawn by a **generic painter**: it maps each page-tree node (tag and attributes from a fixed whitelist, text, a class from the fixed stylesheet) to a DOM element, and maps DOM events back to Lean events by `data-comp-id`. No component-specific rendering code exists for EHR screens.
- **The fixed stylesheet** (`app/src/ehr.css`) is reviewed and has no rule that hides, collapses, or moves content off-screen. Lean leaves hidden things out of the tree instead.
- **One data module** is the only code allowed to call Medplum (lint rule). It passes FHIR records to Lean and writes records on commit.
- **Painter tests:** fast-check generates random page trees; assert the DOM contains exactly the tree's nodes and text. The per-version screen check runs offline before deploy.

**Guardrails (agents optimize for passing; prevent cheating)**
- **Owner-owned:** `lean/Ehr/Specs/**` (the hospital spec, one Lean module per version), `lean/Ehr/Props/**` (property definitions), the Comparator statements file, and data-format types. Vendor releases add a new spec module; they never edit an old one. Change these only with explicit owner approval. Never weaken a property or spec to make a check pass.
- **Seeded bad programs are permanent regression tests** (section 7.5). The checker must always reject them with a counterexample, and the app's hard stop must block the unsafe commit.
- **No hard-coding:** the app, interpreter, checker, simulator, and agent loop must not special-case the seeded examples or demo patients.
- **Evaluation integrity:** see section 8.4.
- **Never reduce scope on your own.** Don't drop, shrink, stub, or defer a feature without explicit owner approval. If behind, report it with options.
- **Every PR states** what changed, which acceptance criteria it advances, and whether it touches specs, properties, data formats, or the statements file. If it does, flag it for owner review.

**Using Codex**
- **As a development subagent:** good for parallel proof attempts on well-stated lemmas, second-opinion reviews (`codex exec review`), and boilerplate. The same guardrails apply.
- **As the overnight design agent:** the agent loop has pluggable backends: `claude` (Claude API) and `codex` (`codex exec --output-schema <schema> --sandbox read-only --ephemeral -o <file>`). Record which backend made each decision.

**Owner review checklist** (keep it visible in the README)
1. Do the seeded bad programs still fail, with readable counterexamples replayed on real screens?
2. Do spec, property, or statements-file diffs exist? If so, approve each one explicitly.
3. Are `lake check`, Comparator, and the axiom audit clean?
4. Do decision records include alternatives, plus predicted versus measured savings?
5. Does the rendered commit screen show the banner, allergies, and dose check (fidelity test)?

## 4. Goals and non-goals

**Goals**
- G1. A realistic, dense EHR built out for the tested workflows (section 5), on a Medplum FHIR backend with Synthea data.
- G2. Governance specs, written in Lean: entry requirements, review requirements, design rules, friction classes. Versioned, with at least one worked vendor release (section 9a).
- G3. A declarative UI program format (JSON) that the agent writes and Lean runs. Screens are never hand-built.
- G4. A Lean semantics for UI programs that is also the app's interpreter (compiled to WASM), and a checker proven sound, returning counterexamples that replay in the real app.
- G5. Five persona simulators with realistic traces. Interaction counts (clicks, keystrokes, scrolls), exact minimum clicks per task, and KLM time.
- G6. An overnight agent loop. Only certified versions are deployed.
- G7. Decision transparency: every decision is recorded and viewable.
- G8. One vendor regulatory release, migrated differently for each persona, with every result certified.

**Non-goals (state openly)**
- We do not verify the LLM, the browser, Emscripten, Medplum, or Synthea. The generic painter and the stylesheet are tested offline per version, not proven.
- **Not in scope (owner decision, Oct 31):** the six extra dashboard views, the Medplum Bot differential test, a third (rename/deprecate) release, and a hospitalist persona.
- We do not prove clinical appropriateness. We prove conformance to the spec.
- We do not prove efficiency is optimal. We measure it.
- We do not claim users read what is shown.
- Anything not in the spec may change. The spec is the only backstop.

## 5. The EHR: built out for the tested workflows

**Fidelity bar:** every screen the demo touches looks and behaves like a busy production EHR. That means a dense banner, a sidebar, many tabs, real multi-year Synthea histories, long order composers, interruptive and passive alerts, redundant questions, and deep navigation. Build only what the tested workflows (W1–W7) use. Tabs outside those workflows may appear as labels for realism, but they are not built.

**Target scale across the tested workflows (approximate):** 25–30 screens, 150+ fields, 100+ actions, 12+ alert or hard-stop types.

**Realism references:** OpenEMR (structure and density); ONC §170.315(g)(3) usability test tasks (task scripts); general production-EHR conventions. Do not copy any vendor's proprietary screens. If possible, have a clinician sanity-check the canonical UI and specs.

### Chart shell (always present)
- **Patient banner:** name, DOB, MRN, age/sex, photo placeholder, allergies badge, code status, isolation, preferred language, PCP, coverage, care-gap count, critical flags. On inpatient screens it also shows room/bed, attending, and weight with its date.
- **Sidebar:** active problems, current meds, recent vitals, last visit, upcoming appointments, open orders, alerts.
- **Activity tabs:** Chart Review, Results (table + trend graph), Imaging, Medications, MAR (inpatient), Problem List, Allergies, Immunizations, Vitals/Flowsheet, Growth Chart (pediatric), History, Care Gaps, Notes, Orders, Encounters, Surgical Case (consent, op note). A tab is built only if a tested workflow opens it.

### Workflows (deep, end to end)

**W1. Adult outpatient visit** (P1)
1. *Rooming:* vitals, chief complaint, intake questions, allergy review ("mark as reviewed"), medication reconciliation (continue/stop/modify per med), depression screen.
2. *Documentation:* HPI, ROS, exam, assessment and plan, with templates and copy-forward options (realistic note bloat).
3. *Orders:* a medication order composer (drug, dose, unit, route, frequency, duration, quantity, refills, indication, pharmacy, substitution, PRN), labs with diagnosis association, and preference lists.
4. *Alerts:* drug–allergy, drug–drug interaction, duplicate therapy, care-gap reminders (passive), required-field hard stops.
5. *Close:* diagnosis per order, level of service, follow-up, patient instructions, patient-ID re-entry, sign orders, sign note.

**W2. Results in-basket** (P1): open a new abnormal result, view its trend, acknowledge it, message the patient, order follow-up, mark done.

**W3. ED encounter** (P2): triage data (weight sometimes typed in **lb**), order sets, allergy-critical prescribing, a weight-based dose check, interaction acknowledgment, and disposition. Choosing "admit" creates inpatient orders that P3 will work on.

**W4. Inpatient medication administration** (P3)
1. *Shift worklist:* due and overdue meds, tasks, new orders since last shift.
2. *MAR:* open the due med and scan the patient wristband and the med barcode (the "five rights").
3. *Administration:* allergy check and dose details shown.
4. *High-alert meds* (insulin, heparin): an **independent double check by a second, different nurse**.
5. *PRN meds:* a pain score before giving, and a reassessment later.
6. *Charting:* flowsheet vitals and assessment; document given, held, or refused, with a reason.
7. *Handoff summary.*

**W5. Pediatric visit** (P4): growth chart review, weight recorded today in kg, weight-based (mg/kg) dosing on every prescription with a dose range check, immunizations (vaccine, lot number, site, VIS given), anticipatory guidance, sign.

**W6. Surgical day** (P5)
1. *ED consult:* review imaging and labs, write the consult note, decide on surgery.
2. *Pre-op:* update the history and physical, verify consent documentation, review anticoagulants and other meds to hold, review allergies, and order prophylactic antibiotics (allergy and weight-based dose checks apply).
3. *Brief op note and post-op orders:* a long post-op order set (diet, activity, VTE prophylaxis, pain control, antibiotics, labs).
4. *Rounding:* review overnight events, vitals, and labs for post-op patients; modify orders.
5. *Discharge:* medication reconciliation, discharge prescriptions, follow-up appointment, instructions.
6. *Surgical clinic:* post-op visits (a W1 variant) and a light in-basket.

**W7. Refill requests** (P1): open the request from the in-basket (Task); check the last visit, relevant labs (for example potassium and creatinine for lisinopril), and adherence; approve, deny, or modify (dose, quantity, refills); sign. The commit is "approve refill."

### Deliberate friction in the canonical UI
- **The same fact asked in several places:** allergies re-confirmed in rooming, ordering, and signing; weight re-entered; diagnosis re-entered for billing.
- Hard stops that repeat earlier checks.
- Important information buried behind tabs.
- Long scrolling order composers.
- Alert interruptions with override reasons.
- **Safety friction that must survive:**
  - patient-ID re-entry before signing orders;
  - wristband and med scans at administration;
  - human acknowledgment of interaction warnings;
  - the high-alert double check by a second nurse;
  - consent verification before pre-op orders are signed;
  - signing.

## 5a. Governance spec content (written in Lean)

### Entry requirements (per workflow)
Every required data element has a type and unit, the roles that may enter it, and a pre-fill policy:
- **never:** a human must enter it (for example, patient-ID re-entry);
- **from the record, with provenance shown; a human confirms** (for example, weight recorded today, in kg);
- **default allowed; a human confirms** (route, frequency);
- **auto-linked, enter once** (diagnosis → order → claim).

Weight must be in kg. Pound values are rejected.

### Review requirements
For every commit (sign orders, sign note, approve refill, acknowledge result, administer med, record immunization, sign op note, discharge), the spec says what must be shown, to which roles, and in which mode:
- **Pinned landmark:** the patient banner with two identifiers, on every screen.
- **Shown on the commit screen, or a valid prior-review receipt:** a receipt counts only for the same data version, within a time window, from an allowed role (for example, the allergy list and current meds).
- **Re-performed every time:** patient-ID re-entry; wristband and med scan.
- **Human-only acknowledgment:** interaction warnings, the high-alert double check by a second nurse, consent verification, and signing.
- **Shown on the commit screen, with no receipt allowed:** the weight-based dose check, and the trend for an abnormal result before acknowledging it.

### Alert rules
Each alert has a **trigger condition** over FHIR facts and a **tier**. Example conditions: drug–allergy match, drug–drug interaction, duplicate therapy, dose out of range for the recorded weight, weight entered in lb, care gap, required field missing. The tiers:
- **Interruptive:** it pops up and must be handled before the commit it concerns (for example drug–allergy, severe interaction, dose out of range).
- **Passive:** it is shown inline on the relevant screen and never pops up (for example care gaps).
- **Removable:** accidental friction. The canonical UI may pop it up; the agent may make it passive or remove it.

Properties A1–A4 (section 7.2) apply. The canonical UI's alert noise comes from removable-tier popups and repeated compliance prompts, so the canonical still passes A1–A4.

### Friction classes
Every prompt in the canonical UI is tagged with one class:
- **safety:** preserved, and performed by the human;
- **compliance:** the information is required, but a pre-fill or a valid receipt can satisfy it;
- **accidental:** free to remove.

### Design rules
- A fixed component catalog (below).
- Pinned landmarks.
- A maximum navigation depth to any required element.
- Legibility rules (minimum size and contrast).
- **"Shown"** means on the same screen, not collapsed, not in an unopened tab, at legible size.
- **Alert budget:** interruptive alerts on a required path never exceed the canonical count.
- **Stability budget:** a maximum number of components moved per accepted version. Frequently used components are copied, not moved.

### Component catalog (about 12 kinds)
Banner, field, choice, read-only panel, trend chart, table, alert/warning, button, group, tab container, macro/bundle, and search. Each kind has a defined meaning in the Lean semantics: what it shows, what it captures, and whether it counts as "shown."

The agent may propose a new kind. It is added only with owner approval, with its Lean meaning, and with the proofs re-checked. Vendor releases may also add kinds (release v1.1, section 9b).

### App rendering rules
- Lean renders these rules into the page tree (proven):
  - pre-filled values show their provenance (source and date) and need a human confirm;
  - human-only steps render as unskippable.
- **FHIR resources used:**
  - Patient, Encounter;
  - AllergyIntolerance (its version IDs back the receipts);
  - Observation (vitals, labs), DiagnosticReport;
  - Condition;
  - MedicationRequest, MedicationStatement, MedicationAdministration;
  - Immunization;
  - ServiceRequest, Procedure;
  - Consent or DocumentReference;
  - Questionnaire, QuestionnaireResponse;
  - Provenance or AuditEvent (review receipts);
  - Task (in-basket, refill requests).

## 6. Personas: five workers, maximum variability

| | P1 Primary care physician | P2 ED physician | P3 Inpatient RN | P4 Pediatric NP | P5 General surgeon |
|---|---|---|---|---|---|
| **Role** | Physician, prescriber | Physician, prescriber | Nurse, non-prescriber | Advanced practice, prescriber | Physician, proceduralist |
| **Setting** | Adult clinic | Emergency dept | Medical ward, 12 h shift | Pediatric clinic | Clinic, OR, ward rounds |
| **Main work** | Visits, in-basket | Rapid triage, ordering, disposition | Giving meds, charting, handoff | Weight-based dosing, immunizations | Consults, pre-op, post-op order sets, rounding, discharge |
| **Commit actions** | Sign orders/note, acknowledge result, approve refill | Sign orders, disposition | Administer med, chart assessment | Sign orders, record immunization | Sign pre-op and post-op orders, sign op note, discharge |
| **Receipts** | Many (reviewed in rooming, known patients) | None (new patients) | Per shift (reviewed at shift start) | Some (weights recorded today) | Some (own patients across days) |
| **Input style** | Keyboard heavy | Mouse, order sets, time pressure | Barcode scanner, workstation on wheels, interrupted | Mixed, talking with family | Fast, between cases, order-set heavy; least EHR time of the ambulatory specialties |
| **Edge cases** | Long histories, repeat prescriptions | Weights in lb, allergy-critical drugs | High-alert meds, PRN reassessment, held doses | Yesterday's weight, mg/kg math | Anticoagulant holds, prophylaxis with allergy and weight checks, alternating clinic and OR days |

Each persona has a task mix, behavior parameters (when they review allergies, keyboard versus mouse, sidebar scanning, backtracking, interruptions), and edge cases.

**Cross-persona flow:** P2 admits a patient → P3 gives the inpatient meds → the patient is discharged → a follow-up visit and pending results land with P1. Pediatric patients cycle through P4's clinic with changing weights and immunizations. P2 consults P5 on a suspected appendicitis → P5 operates → the patient is admitted (P3 gives the meds) → P5 rounds and discharges → post-op visit with P5 and follow-up with P1.

## 7. Lean: model, checker, and proofs

### 7.1 Model
A UI program denotes a transition system over an abstract state:
- the current screen;
- the captured elements, with values and units;
- what is shown, and how;
- the review receipts present (data version, time, role, user);
- which human-only steps are done in this episode, and by whom;
- which commits have happened;
- an abstract clock.

FHIR data enters through an **abstraction function** that turns FHIR resources into the few facts the spec needs. Examples: the allergy-list version (from `meta.versionId`), weight recorded today in kg, and whether a dose is within the range for that weight. It exists only in Lean. The app calls it through the WASM interpreter, and the checker and simulation use the same code. Its key facts are proven (T5).

Navigation has cycles (tabs, back, backtracking). The model must handle cycles. Revisiting a field does not capture it twice.

### 7.2 What the checker certifies (as properties over the Lean semantics)
1. **Well-formed:** catalog components only; landmarks present; every required element reachable within the depth bound.
2. **Captures all, once:** every path to a commit captures each required element. No two components ask the human for the same element on one path (enter once). Units are correct.
3. **Writes only:** the UI can't write anything outside the spec, and each role writes only what it may.
4. **Reviews before commit:** required information is **shown** on the commit screen, or covered by a valid receipt. "Shown" means on the same screen, not collapsed, not in an unopened tab, at legible size.
5. **Human-only kept:** re-perform, scan, double-check, and acknowledgment steps are never pre-filled, skipped, or automated by a macro. A double check needs a second user who is not the first.
6. **Completable:** from every reachable state, each commit is still reachable. The hard stop never leaves the user stuck.
7. **Units:** weight in kg only, and the dose check uses kg.
8. **Budgets:** interruptive alerts on a required path never exceed the canonical count; the components moved since the previous version stay within the stability budget.

**Alerts: shown when they matter, and no fatigue.**

9. **A1 Alerts fire when they should:** whenever an interruptive-tier alert's condition holds, it pops up and must be handled before the commit it concerns. Whenever a passive-tier alert's condition holds, it is shown inline on the relevant screen.
10. **A2 No false alarms:** an alert of any tier appears only when its condition holds.
11. **A3 No repeat interruptions:** an interruptive alert interrupts at most once per encounter for the same condition and data version. If the data changes (for example, a new allergy is recorded), it may fire again.
12. **A4 Severity tiers:** passive-tier alerts never pop up. Only interruptive-tier and removable-tier alerts may.

### 7.3 How to check it without state explosion
200+ fields make the full state space far too large. Make most checks **structural**: per screen, per commit, per macro, and over the screen graph with sets of elements as abstract values. Prove that each structural check implies its semantic property. That is exactly what the soundness theorem says, and it makes the theorem worth having. Run large instances with the compiled checker, never with kernel `decide`.

Counterexamples are click paths. The dashboard replays them in the real app, so a judge sees the violation on the actual rendered screens. The checker also re-validates each counterexample by replaying it before reporting it.

### 7.4 Theorems (priority order; time-box each)
Each one is stated in plain words and quantifies over **all** specs and programs.
- **T0 Hard-stop safety (any program):** in the interpreter, a commit never happens unless that commit's review requirements and human-only steps are met in this episode, with kg units.
- **T1 Checker soundness:** if `check spec prev canonical prog = ok`, then `prog` satisfies properties 1–12 (including alerts A1–A4).
- **T2 Receipts are sound:** a review prompt is skipped only with a receipt for the same data version, within the time window, from an allowed role.
- **T3 Human-only never automated:** in an accepted program, no macro, default, or pre-fill performs a human-only step. A double check always involves two distinct users.
- **T4 Only certified versions are published:** `ehr deploy` publishes a version only if its verdict against the current spec is ok, including right after a vendor release. (The app's side, refusing a program whose certificate doesn't match, is tested rather than proven.)
- **T5 Abstraction facts:** the "weight recorded today in kg" fact holds only if a kg weight Observation dated today exists. The allergy-version fact equals the resource version.
- **T6 Macros:** a macro behaves exactly like its expansion into canonical steps, or stops at a guard.
- **T7 (stretch) Counterexamples are genuine:** if the checker rejects, the returned path is a real run that violates the named property.
- **T8 Releases only tighten:** if spec B only adds requirements to spec A, every program that satisfies B also satisfies A. Applied to the releases: `V1_1` extends `V1` and `V2` extends `V1_1`, so no customization certified against a later spec loses an earlier guarantee.
- **T9 Minimum clicks is exact:** `min-clicks` returns the length of a real completing path, and no shorter completing path exists.
- **T10 The page shows what must be shown (any program, any record):** every component the interpreter marks as shown appears in the page tree, with its text, at legible size, and with no hidden ancestor. Nothing marked hidden appears. On a commit screen, every required review item appears with its content. The commit button is enabled in the tree exactly when the guard holds.
- **T11 Panels are complete (any record):** each info panel lists every relevant record from the patient's FHIR data. For example, the allergy panel lists every active AllergyIntolerance, and the current-meds panel every active MedicationRequest. Pre-filled values show their provenance.

### 7.5 Seeded bad programs (permanent regression tests)
1. The allergy list moved into an unopened tab on the sign screen.
2. Patient-ID re-entry pre-filled.
3. A weight in lb accepted.
4. A macro that skips the interaction acknowledgment.
5. RN: the high-alert double check completed by the same nurse, or auto-filled.
6. NP: the dose check using yesterday's weight.
7. A commit made unreachable (completability).
8. Surgeon: a pre-op macro that signs orders without the anticoagulant list shown, or that auto-confirms consent.
9. A1: a macro that suppresses the drug–allergy alert for an order that matches the patient's allergy.
10. A2: a "dose out of range" popup on every order, regardless of the dose.
11. A3: the same interaction alert interrupting twice in one encounter.
12. A4: the passive care-gap reminder turned into a popup.

Each one gets a `¬ Satisfies` lemma, a checker rejection with a replayable counterexample, and an app test showing the hard stop blocks the commit.

## 8. Simulation

### 8.1 Work-days
For each simulated day and each persona:
1. **Log in:** the app loads the version `ehr deploy` published for that user. If it changed overnight, show a short "what changed" notice. The user may revert a change (simulated with a small probability, and logged).
2. **Work the shift:**
   - P1: a clinic day of 16–20 visits, plus in-basket bursts (results and refill requests) before clinic, at lunch, and after clinic.
   - P2: an ED shift with a stream of new patients.
   - P3: a 12 h ward shift with med passes at fixed times, PRNs, and interruptions.
   - P4: a pediatric clinic day.
   - P5: alternating clinic and OR days: ED consults, pre-op, post-op order sets, rounding, discharges, post-op clinic.
3. **Log out:** save the trace and metrics.
4. **Overnight:** the agent proposes changes, the checker gates them, and a certified version takes effect at the **next login**. Never mid-shift.

The schedule is 10 days × 5 personas. Day 1 uses the canonical UI.

### 8.1a Metrics (all computed in Lean from traces and programs)
- **Alert load:** popups per task and per day, and the simulated override rate (an alert-fatigue indicator).
- **Headline: interaction counts** per task and per day: clicks, keystrokes, and scrolls. They are counted separately, so the agent can't win by trading clicks for typing or for one long scrolling screen. Searches, screen changes, and backtracks are also recorded.
- **Exact minimum clicks per task** (`ehr min-clicks`): the shortest path through the program's states that completes the task, with no persona assumptions. Reported for version 0 and every later version ("Sign a refill: 23 → 6 clicks").
- **KLM time** (estimate): constants live in one config. From Card, Moran & Newell (1980): keystroke 0.2 s, point 1.1 s, click 0.1 s, home hands 0.4 s, mental prep 1.35 s. **Our own assumptions, labeled as such:** a barcode scan operator and a fixed wait for a second nurse.

### 8.2 A living world
A persistent Synthea population evolves day to day:
- ED arrivals, admissions, and discharges;
- follow-ups with P1;
- pending labs that return on later days;
- a carried-over in-basket backlog;
- inpatient census changes for P3;
- pediatric patients cycling through P4's clinic;
- surgical consults from the ED, OR cases, post-op inpatients for P5 to round on, and post-op clinic visits.

Daily variability: volume (busy and quiet days), acuity, no-shows and add-ons, new versus established patients, the share of allergic patients, high-alert meds, and interruptions. Seed each day from the world state.

### 8.3 Fair comparison
- **Clinical decisions are independent of the UI version.** Each scenario fixes what is ordered, given, or acknowledged, and the disposition. The interface changes only how long those choices take, so the world evolves identically under every UI version.
- **Floor:** the clicks, keystrokes, and scrolls (and KLM time) of only the human-only steps plus the genuine clinical choices. Report every version as % above the floor, for each metric.

### 8.4 Evaluation integrity (no leakage)
- The agent learns from the traces of days ≤ d (**train**).
- A candidate is accepted by replaying day d+1 on the old and new versions (**validation**: same patients, same events, same clinical choices).
- **Reported savings** come only from later days that were never used to select a change (**test**). Report busy and quiet days separately.
- The agent never sees validation or test traces, only the aggregate accept/reject result.

## 9. Agent loop

Each night, for each persona:
1. **Observe:** summarize train traces: time sinks by screen, redundant prompts, unused receipts, searches for buried information, alert overrides, backtracks, and the complaint log (prompts a receipt could not satisfy, with reasons).
2. **Hypothesize:** state what is slow and why.
3. **Generate:** propose 3–5 alternative changes as JSON patches (by component tag), each with a predicted saving.
4. **Pre-screen:** `ehr check` each candidate, and estimate its saving on train traces with `ehr simulate`.
5. **Choose:** pick one candidate or a small compatible set, and explain why it beats the alternatives.
6. **Certify:** run the final check on the merged program. If it is rejected, feed back the counterexample (max 3 retries) and log it.
7. **Validate:** accept only if the validation replay improves and stability holds. The simulated user may occasionally reject the change (logged).
8. **Record:** write the decision record and the new version with its certificate.

**Allowed moves:** compose task views; copy frequent actions to a toolbar; reorder or merge sections; bring buried information onto the screen where it's needed; pre-fill with provenance (FHIR SDC style); satisfy prompts with valid receipts; create macros or order-set bundles with guards; add defaults the human confirms; add keyboard or scan shortcuts; collapse panels that are not required.

**Forbidden moves:** edit specs; automate or pre-fill human-only steps; hide required information; write outside the spec; exceed the budgets.

**Demo modes:**
- **Replay (default for `make run`):** recorded runs from `/runs/`, so the demo is deterministic and needs no API key.
- **Live:** set a backend (`claude` or `codex`) to run new nights.
- **"Try to break it":** an audience member types a request ("make signing faster by hiding the allergy box"). The agent tries it, the checker rejects it, and the counterexample replays on the real screen. This is the "ooh" moment. It needs a live backend, so pre-record a fallback.

**Scripted events:**
- **Day 5:** P1 covers urgent care for a day. The task mix shifts, and the agent adapts without discarding P1's usual customizations.
- **Day 4:** vendor release v1.1, the prior-auth feature (section 9b).
- **Day 7:** vendor release v2, antibiotic indication (section 9a).
- Tempting bad proposals: expect them, or seed them, so that at least the first three seeded bad programs appear as real logged rejections.

## 9a. Vendor release example: v2 "Antibiotic indication required" (Day 7)

A vendor release changes the canonical system: the **Lean spec**, the **canonical UI program**, and sometimes the component catalog. Every user's customized UI must conform before their next login, without wiping their personalization. This is the worked example. It is a hypothetical stewardship policy for the demo.

### What ships in the release
```
lean/Ehr/Specs/V2.lean        new spec module (imports V1_1; old modules are never edited)
releases/v2/RELEASE_NOTES.md  items R2-1 … R2-4, in plain language
releases/v2/canonical.json    the vendor's new canonical UI program
releases/v2/spec.json         generated by `ehr spec-export`
```

### The Lean spec change (illustrative; exact definitions are up to lane A)
In plain words:
- **New data element:** antibiotic indication, a coded value from an "antibiotic indications" list. Entered by physicians and NPs. Pre-fill policy: "default allowed, human confirms" (for example from the visit diagnosis, with provenance shown). Friction class: compliance.
- **New entry requirement:** a sign-orders commit that includes an antibiotic must capture a confirmed indication for each antibiotic order.
- **New review requirement:** the administer-medication commit for an antibiotic must **show** the indication on the commit screen. A receipt does not count.

Roughly:
```lean
/-- Release v2: antibiotic orders carry a confirmed indication,
    and nurses see it before giving the drug. -/
def specV2 : Spec :=
  specV1_1
  |>.addElement { id := .abxIndication, kind := .coded "abx-indications",
                  enteredBy := [.physician, .np],
                  prefill := .defaultHumanConfirms, friction := .compliance }
  |>.addEntry   { commit := .signOrders, when := .orderClass .antibiotic,
                  element := .abxIndication }
  |>.addReview  { commit := .administerMed, when := .medClass .antibiotic,
                  element := .abxIndication, mode := .shownOnCommitScreen }

theorem specV2_extends_specV1_1 : specV2.Extends specV1_1 := by decide   -- feeds T8
```

### The canonical UI change
| Release note | Canonical program change |
|---|---|
| R2-1 | Order composer: a required **Indication** picker appears for antibiotic orders, with a hard stop "Indication required." |
| R2-2 | Sign-orders screen: an **Indication** column in the order summary. |
| R2-3 | MAR administration panel: an **Indication** row next to the dose for antibiotics. |
| R2-4 | Order sets containing antibiotics (ED sepsis, surgical prophylaxis) inherit R2-1. |

CI checks both directions:
- The new canonical program passes against `specV2`.
- The **old** canonical program fails against `specV2`. The counterexample is the path to "Sign orders" with an amoxicillin order and no indication. This shows the release has teeth.

### What happens on Day 7 (pipeline, for every user, before their next login)
1. **Re-check** each user's current program against `specV2`. Expected failures:
   - P1's repeat-prescription macro (signs without an indication);
   - P2's ED order-set macro;
   - P3's streamlined MAR (indication not shown);
   - P4's weight-based dosing screen;
   - P5's post-op order set.
2. **Migration mode:** the agent gets the release notes, the Lean spec diff, the counterexamples, and the user's decision history. It proposes the **minimal patch** that restores conformance while keeping the user's customizations. The patch must pass `ehr check`.
3. **Fallback:** if migration still fails after N attempts, deploy the new canonical program plus only the customizations that still pass, and flag the user. T4 means nothing uncertified is ever published.
4. **Migration report** per user: what changed and why (mapped to R2-1…R2-4), the customizations kept or dropped, and the certificate.

**Expected, distinct migrations:**
- **P1:** the indication is pre-filled from the visit diagnosis, and the human confirms it.
- **P2:** an indication picker inside the ED order-set macro, with a guard.
- **P3:** the indication is added to the MAR administration panel next to the dose.
- **P4:** a field on the weight-based dosing screen.
- **P5:** inside the post-op order set, the indication defaults to surgical prophylaxis, and the surgeon confirms it.

**One migration goes wrong first (for the demo):** P3's first attempt puts the indication in a collapsed "Details" drawer on the MAR panel. The checker rejects it ("Reviews before commit: indication not shown"), and the counterexample replays the administration path in the real app with the drawer closed. The second attempt passes.

## 9b. Vendor release example: v1.1 "Prior-authorization status" (feature, Day 4)

This release changes the **catalog and the Lean semantics**, not just spec content.

**What ships:**
```
lean/Ehr/Specs/V1_1.lean        spec module: imports V1, adds optional elements only
lean/Ehr/Catalog/…              new component kind `priorAuthStatus` with its Lean meaning
releases/v1.1/RELEASE_NOTES.md  items R1.1-1 … R1.1-3
releases/v1.1/canonical.json    canonical program with the panel in the order composer
releases/v1.1/spec.json         generated by `ehr spec-export`
```

**Content:** a prior-authorization status panel and a "request prior auth" action in the order composer, for imaging and specialty meds. The motivation is CMS's interoperability and prior-authorization rule, which requires payer prior-auth APIs from January 2027. The feature is **optional** in the spec, with no required review.

**What must happen:**
- The new kind gets a defined meaning in the semantics: what it shows, that it writes only a ServiceRequest/Task for the prior-auth request, and that it counts as "shown." T0–T6 are re-checked with the new kind; the generic proofs must still go through.
- `V1_1` extends `V1` (T8).
- Every personalized UI still passes the checker. Nothing is migrated, and nobody's customizations change.
- The agent decides **per persona** whether and where to surface the new feature, based on that persona's traces, and records why:
  - **P1** (orders imaging and specialty meds): inline in the order composer.
  - **P5:** on the pre-op screen for elective cases.
  - **P2** (ED): likely not surfaced.
  - **P3:** not applicable (doesn't order).
  - **P4:** surfaced only if their traces show specialty orders.

Release v2 (Day 7) then builds on v1.1: `V2` imports `V1_1`.

## 10. Decision transparency

**Decision record** (one per night per persona, JSON):
- night, persona, versions before and after, backend used;
- **evidence:** the trace statistics behind the change;
- **hypothesis:** in plain language;
- **candidates:** each with a patch summary, predicted saving, and checker result (pass, or the violated property with a counterexample);
- **chosen change** and its rationale against the alternatives;
- **measured outcome:** validation and test clicks, keystrokes, scrolls, and KLM time before and after; minimum clicks per affected task; % above floor; and whether the prediction held;
- **user response;**
- **certificate:** spec hash, program hash, verdict, timestamp.

**Dashboard views**
- **MVP:**
  1. Evolution timeline per persona, with rejected proposals as side branches.
  2. "Why" panel (evidence → hypothesis → candidates → choice → outcome).
  3. Counterexample viewer (replayed on real screens).
  4. Trace replay of version 0 versus version N, side by side, with live click, keystroke, and scroll counters and timers.
  5. Persona divergence: the five final UIs side by side.
  6. Release view: for v1.1, each persona's decision on surfacing the prior-auth panel; for v2, five personas, one regulation, five different certified patches.
- **Not in scope (owner decision, Oct 31):** before/after screen diff with highlights; navigation Sankey; heatmaps; inferred persona model; move statistics; day view.

## 11. Schedule (deadline: Sun Nov 1, 4:30 PM PDT)

About 26 hours from kickoff (Sat 2:30 PM), including the owner's sleep. Agents work in parallel lanes, each in its own git worktree.

**Scope changes need owner approval.** Agents never drop, shrink, or defer a feature on their own. If something is behind at a checkpoint, report it to the owner with options. The owner decides.

**Phase 0 · Sat 2:30–4:30 PM · foundations (serial, critical path)**
- Repo skeleton, Makefile, pinned Lean 4.35.0, pnpm workspace, and `make check` (lake build, `lake check`, axiom audit, lint, tests).
- Lean types for UIProgram, Spec, Screen, Event, Verdict, Trace, and DecisionRecord, with JSON derivation and generated TS types.
- Property definitions (`lean/Ehr/Props/`), spec v1 (`lean/Ehr/Specs/V1.lean`), and theorem statements T0–T9 (the Comparator statements file).
- **WASM spike (2–3 h, time-boxed):** install Emscripten and compile a minimal Lean interpreter stub to WASM, called from a React page. Result reported at owner review 1.
- Synthea runs in the background (about 200 patients, including pediatric, allergic, and surgical ones), then its output is trimmed.
- Medplum Docker stack up, with a scripted, idempotent first-boot setup (project, client credentials in a local `.env`). Synthea data loaded by batch upload (never the same file twice).
- **Owner review 1 (about 4:30 PM, 20 min):** approve the data formats and the property and theorem statements, read in plain words. They are frozen after this.

**Phase 1 · Sat 4:30–10:00 PM · six parallel lanes**
- **A, Lean:** the semantics, structural checks, counterexamples, `run-batch`, and `deploy`.
- **A2, WASM:** the Emscripten build of the interpreter, JS bindings for the app, the build-equivalence tests, and size and speed checks. Option B (`ehr serve`) only if the spike failed and the owner signed off.
- **B, EHR content:** spec v1 content (with lane A); the canonical program (W1–W7); the seeded bad programs; releases v1.1 and v2 (spec modules, canonical programs, release notes).
- **C, App:** the React renderer with catalog components and dense EHR styling, Medplum login and data access, and the dashboard shell.
- **D, Simulation:** FHIR abstraction (Lean); persona policies, metrics, and `min-clicks`; the living-world generator (TS) with cross-persona flow.
- **E, Infra:** the Medplum stack in `make install` / `make run`; storing deployed programs and certificates in Medplum; fixture export for simulation; the per-version headless screen check.
- **Owner review 2 (about 10 PM, 30 min):** click through the workflows in the browser on live Medplum data. The canonical program passes, and the seeded bad programs fail with readable counterexamples.

**Phase 2 · Sat 10 PM – Sun 8 AM · overnight, unattended**
- **Proof agents** (Claude and Codex in parallel on separate theorems): T0–T9 in priority order. Status is tracked in `TODO_PROOFS.md`. They may not touch `lean/Ehr/Props/`, `lean/Ehr/Specs/`, or the statements file. `lake check` decides what counts.
- **Agent loop:** built, then a first 10-day × 5-persona run recorded to `/runs/`.

**Phase 3 · Sun 8 AM – 12:30 PM**
- **Owner review 3 (8 AM, 30 min):** proof status, the first run's decision records, and which rejections occurred.
- The dashboard views, releases v1.1 and v2 with migrations, and the final recorded run.
- Proofs continue.

**Phase 4 · Sun 12:30–2:30 PM · demo polish**
- "Try to break it" (live, plus a recorded fallback).
- Playwright fidelity tests.
- README: trusted base, review checklist, proof status.
- Backup demo video.

**Phase 5 · Sun 2:30–4:30 PM · freeze**
- Feature freeze at 2:30 PM.
- A clean-clone `make install && make run` test.
- A final `lake check` and Comparator run, plus the axiom audit.
- **Submit by 4:00 PM** (30 min buffer).

**If behind (proposal only; the owner approves each cut):**
stretch dashboard views → T7, then T6 → P4's immunization steps (keep weight-based dosing) → live mode (keep replay) → Playwright fidelity.

**Never cut:** dense W1; the verified interpreter in the app; the checker with counterexamples; receipts; human-only rules; T0–T2; decision records; click, keystroke, scroll, and time curves; the regulatory release; `make install && make run`.

## 12. Acceptance criteria

- [ ] `make install && make run` works on a clean clone with Docker. After install, the demo opens in replay mode with no API key and no internet.
- [ ] The EHR reads patient data from Medplum and writes commits back (orders, administrations, receipts as Provenance).
- [ ] The EHR meets the density targets on demo paths and passes the checker.
- [ ] Seeded bad programs fail, with counterexamples replayed on rendered screens, and the app's hard stop blocks each unsafe commit.
- [ ] Every deployed version has a certificate, and re-checking it returns ok. The app refuses to load a program whose certificate doesn't match.
- [ ] The app's screen logic is the Lean interpreter compiled to WASM (or option B, if the owner approved it). Native and WASM builds agree on thousands of random programs and click sequences.
- [ ] Seeded bad programs 9–12 (alerts) fail with counterexamples. A1–A4 hold for every deployed version.
- [ ] W7 (refill requests) is built and used in P1's simulated days.
- [ ] Release v1.1: the new component kind is in the Lean semantics with proofs re-checked; all personalized UIs still pass; per-persona surfacing decisions are recorded.
- [ ] The per-version screen check passes for every deployed version, and runs offline before deploy (a failing version is never deployed).
- [ ] EHR screens are drawn by the generic painter from Lean's page tree; T10 and T11 are proven.
- [ ] All five personas show test-day clicks, keystrokes, scrolls, and KLM time falling toward the floor, with minimum clicks per task reported for every version, across busy and quiet days, and their final UIs differ meaningfully.
- [ ] Every night has a complete decision record with alternatives, plus predicted versus measured savings.
- [ ] At least three logged rejections with counterexamples (allergy hidden, ID re-entry pre-filled, lb weight).
- [ ] Simulation runs as work-days: login → shift → logout → overnight adaptation → certified deploy at next login.
- [ ] Release v2 ships as a new Lean spec module and a new canonical program. The new canonical passes, the old canonical fails with a counterexample, and `specV2` extends `specV1` (T8).
- [ ] Release v2: failing UIs are detected and migrated with minimal patches that keep customizations; five distinct migrations, all certified before next login, all documented.
- [ ] T0–T5 and T8 proven with a clean `lake check` and Comparator run; T6, T7, and T9 proven or clearly marked as open.
- [ ] Each main theorem has a satisfiable `example` and `¬ Satisfies` lemmas for the seeded bad programs.
- [ ] The Playwright fidelity test passes for the canonical and final versions. The expected ARIA snapshot is generated from Lean's screen description, not hand-written.

## 13. Trusted base (say this in the README and the demo)

- **Proven about running code:**
  - the interpreter in the app, which is the same Lean code: the hard stop (T0), receipts (T2), human-only steps (T3), abstraction facts (T5), macros (T6);
  - the page tree and panel contents (T10, T11);
  - the checker, including alerts A1–A4 (T1);
  - deploy (T4);
  - minimum clicks (T9).
- **Proven about the specs:** releases only tighten (T8).
- **Tested:**
  - the generic painter, the fixed stylesheet, and the browser: every deployed version's screens match Lean's page tree in a headless browser (offline, before deploy);
  - native and WASM builds agree (build-equivalence tests).
- **Trusted:**
  - the Lean compiler and Emscripten;
  - Node, the browser, and React;
  - Medplum and Docker;
  - the Synthea data;
  - the spec content itself, which is owner-reviewed.
- **Not claimed:**
  - clinical correctness;
  - completeness of the spec;
  - that users read what is shown;
  - that efficiency is optimal.

## 14. Demo script (3–5 minutes)

1. **The problem:** clinicians spend hours a day in the EHR. Show the dense canonical screen. Some friction is deliberate: re-typing patient identifiers cut wrong-patient orders by 41%, versus 16% for a one-click verify (Adelman et al.). An optimizer that can't tell the difference is dangerous.
2. **The rules:** what the hospital requires to be entered and reviewed, and which prompts are safety, compliance, or accidental.
3. **Ten days later:** five clinicians, five different screens. Replay the same task on day 1 versus day 10, with click counters and timers. Open the "why" panel on one decision.
4. **The agent tries to cheat:** hiding allergies, pre-filling patient ID, accepting a weight in lb. Each is rejected, and the counterexample replays on the real screen.
5. **Try to break it:** a live request from the audience is refused.
6. **Vendor releases:** on Day 4, the prior-auth panel is surfaced for P1 and P5 but not P2, and the agent explains why. On Day 7, a **new regulation overnight:** every custom UI fails, and five different migrations are each certified before morning, with customizations kept.
7. **Trusted base:** what is proven, tested, trusted, and not claimed.

## 15. Pitfalls

- **"Shown" loophole:** collapsed or tabbed information doesn't count.
- **Vacuous properties:** satisfiable `example`s, `¬ Satisfies` lemmas, and a check that the canonical program is completable.
- **Agents drift to easy specs:** the owner owns properties and the statements file.
- **State explosion:** use structural checks and the compiled checker.
- **Proof time sinks:** prove soundness once, generically; time-box each theorem; build skeletons first.
- **Agent flakiness:** schema-validate outputs, cap retries, fix seeds, record runs and a backup video.
- **Circular evaluation:** the train / validation / test split.
- **Moving versus copying:** prefer copies and macros, and enforce stability (Findlater & McGrenere 2004; Gajos et al. 2006).
- **Synthea data size:** trim bundles to the needed resource types and years before committing them. `make install` loads them into Medplum (idempotent). Generating new data (`make synthea`, needs Java) is separate.
- **Medplum first boot:** script the setup so it is idempotent, and wait for the server's health check before loading data.

## 16. Positioning (for Q&A)

- **Prior art:**
  - SUPPLE (2004) optimized generated UIs, without proofs.
  - UI Façades (2006) let users recombine existing GUIs.
  - Oliveira et al. (2015) applied equivalence checking to adapted UIs.
  - Recent generative-UI work offers no correctness guarantees.
  - A CHI 2026 workshop paper calls for bounded, invariant-protected adaptation but proposes no formal mechanism.
- **Method precedent:** AWS Cedar (Lean models, proofs, differential testing against production). We go further: the app's interpreter *is* the Lean code (compiled to WASM), and every deployed version's rendered screens are checked.
- **Not Compiled Health:** they verify guideline *content*. We verify that agent-generated *interfaces* conform to the hospital's entry and review contract.
- **von Hippel, "Your software should build itself" (2026):** agents edit tagged, typed objects; "complain" maps to our complaint log; changes require proofs.

## 17. References

- Vibecheck: https://fmxai.org/vibecheck/
- Cedar: https://arxiv.org/pdf/2407.01688 · https://lean-lang.org/use-cases/cedar/
- OpenEMR: https://www.open-emr.org/welcome/
- ONC §170.315(g)(3): https://healthit.gov/test-method/safety-enhanced-design
- Example usability test tasks: https://slicompliance.com/wp-content/uploads/2026/07/g3_SED_Usability_Test_Report_a_OptiMantra.pdf
- FHIR SDC population: https://hl7.org/fhir/uv/sdc/en/populate.html
- Synthea: https://github.com/synthetichealth/synthea
- Medplum Docker: https://www.medplum.com/docs/self-hosting/running-full-medplum-stack-in-docker
- Medplum Synthea import: https://www.medplum.com/docs/tutorials/importing-sample-data
- Medplum Questionnaires: https://www.medplum.com/docs/questionnaires
- Medplum CDS Hooks/Bots: https://medplum.com/docs/integration/cds-hooks
- Playwright ARIA snapshots: https://playwright.dev/docs/aria-snapshots
- Findlater & McGrenere 2004: https://www.cs.ubc.ca/labs/edapt/papers/findlater2004.pdf
- Gajos et al. 2006: https://www.eecs.harvard.edu/~kgajos/papers/2006/kgajos-avi06.pdf
- Wrong-patient orders (ID re-entry): https://www.vagelos.columbia.edu/departments-centers/center-patient-safety-science/research/our-impact
- CDS malfunctions (Wright 2016): https://psnet.ahrq.gov/issue/analysis-clinical-decision-support-system-malfunctions-case-series-and-survey
- Weight lb/kg errors: https://patientsafety.pa.gov/ADVISORIES/Pages/201809_SafetyStories_Weight.aspx
- EHR time (Arndt 2017): https://healthexec.com/topics/health-it/medical-records/primary-care-physicians-spend-52-day-entering-ehr-data
- EHR time by specialty (Rotenstein 2021): https://www.healio.com/news/primary-care/20210322/primary-care-clinicians-use-ehrs-more-than-other-ambulatory-specialists
- von Hippel: https://www.lesswrong.com/posts/CeRHyeot37KoqDqHC/your-software-should-build-itself
- Zero to QED (Lean): https://sdiehl.github.io/zero-to-qed/
- xeus-lean (Lean runtime in the browser via Emscripten): https://github.com/Verilean/xeus-lean
- lean2wasm (experimental): https://reservoir.lean-lang.org/@T-Brick/lean2wasm
- CMS Interoperability and Prior Authorization final rule: https://www.cms.gov/priorities/burden-reduction/overview/interoperability/policies-regulations/cms-interoperability-prior-authorization-final-rule-cms-0057-f
