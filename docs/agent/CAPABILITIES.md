# Capabilities manual (generated; pnpm --filter agent manual)

One canonical EHR serves everyone. Each persona's v0 is the canonical with that role's permissions and pre-set view. The overnight agent evolves only that persona's FORK. Vendor releases are merged into every fork and re-certified before next login.

Rule profile: core. Catalog additions are switched off for this run, except the explicitly retained denyRefill requirements; the hand-written base rules and all safety/design properties remain enforced.

## What you can change

Program screens, start navigation, components, labels, grouping, tabs, visibility, density, shortcuts, copies, provenance prefills, receipts, defaults with confirmation, and guarded macros. Use the generated Program/Kind/Macro types as the exact vocabulary (lean/generated/ehr-types.ts). JSON Patch examples: add a copied button with copyOf; change a panel from normal to compact; link an autoLinked field to its source.

Composite source templates are planned through componentDefs and kind.use. This checkout declares componentDefs but has no Kind.use/Program.expand yet, so composite proposals cannot deploy until that formal support lands. Example: componentDefs [{name:"summary",params:["info"],body:[{id:"panel",kind:{panel:{info:"{{info}}"}},label:"Summary",tab:0,visibility:"always",size:"normal",tag:"summary"}]}], then kind {use:{name:"summary",args:[["info","currentMeds"]]}}. The use component id namespaces expanded ids. No nested use in template bodies.

Presentation components may draw an existing UiNode subtree differently, with events only through its mapped callback. They require a sandbox manifest, component bundle hash, type/lint checks and whole-version ARIA/visibility checks before deployment. If that pipeline is unavailable, presentation proposals cannot deploy.

## What you cannot change

Never change Lean interpreter, checker, spec, properties, data/FHIR write layer or backend. No new semantic kinds. Never automate a human-only action, identity check, scan, acknowledgement, commit or cosign (including NP pre-op attending co-signature). No hidden required information and no exceeded budgets. Presentation code cannot fetch, use storage, timers, global DOM, unsafe HTML or imports outside the allowlist.

## Enforced properties 1–13, A1–A4

Source: lean/Ehr/Props/Properties.lean

Every component is of a kind in the spec's catalog.

The spec names each element, info, commit, and alert rule once.

Screen IDs are unique, and component IDs are unique on each screen.

The program's references point at real things: the start screen exists;
every "go to" button and macro "go to" step names a screen of the program;
every macro button names a macro of the program; every alert component names
an alert of the spec; every parent is a group or tab container on the same
screen.

On every screen the user can reach, every landmark (e.g. the patient
banner) is shown.

Every element a required commit needs has a field on a screen at most
`maxDepth` "go to" clicks from the start screen.

**Property 1, well-formed.** Catalog components only, unique IDs (in the
spec and the program), references resolve, landmarks always shown, and every
required element within the depth bound. Needs the checker.

When a commit happens, every entry requirement for it is met: each
required element is captured, confirmed, valid, in the right unit, and entered
by a human if only a human may enter it. By construction (T0).

A confirmed value is never asked for again. Navigating, opening groups or
tabs, reviewing, acknowledging, or confirming keep every confirmed value;
only typing a new value, or running a macro, changes one. By construction.

A field for an auto-linked element (e.g. the diagnosis on an order,
linked from the visit diagnosis) copies the linked element, so the human
never types it twice. Needs the checker.

**Property 2, captures all, once.** Every commit captures each required
element (by construction), a confirmed value is never asked for again (by
construction), and auto-linked elements are never retyped (checker). Units
are in property 7.

Every field is for an element of the spec that the program's role may
enter; every commit button is for a commit of the spec that the role may
perform; every "mark reviewed" button is for an info of the spec. Needs the
checker.

In every reachable state, everything the episode would write is allowed:
each captured value is for a spec element the user's role may enter; each
commit is a spec commit the role may perform; each new receipt is for a spec
info.

**Property 3, writes only.** The UI cannot write anything outside the
spec, and the role writes only what it may.

When a commit happens, every review requirement for it is met on that
screen: the info is shown, or a valid receipt covers it, or a human entered
its waiver. By construction (T0).

Whenever a button for a commit is shown, every review requirement for
that commit without a waiver is already met on that screen: the info is
shown, or a valid receipt covers it. So the user is never sent hunting for
hidden information (in a closed tab or a collapsed group) at the moment of
signing. (A requirement with a waiver may instead be met by entering the
waiver; property 6 makes sure the user can.) Needs the checker.

**Property 4, reviews before commit.**

A value for an element a human must enter (patient-ID re-entry, scans,
the second nurse's cosign, `never`-prefill elements) appears only when the
human types or scans it: never at the start, never from a prefill, and never
from a macro. By construction (T3).

Commits and acknowledgments are done only by the human's own click: a
commit only by clicking a shown button for that commit; an acknowledgment only
by the human's `ack`. Never by a macro. By construction (T3).

When a commit happens, every cosign it needs names a second user, not
the signed-in one. By construction (T0).

The program never tries to automate a human step: no field prefills an
element a human must enter; no macro step types into such a field, clicks a
commit, review, macro button, or a request action for a human-required
element. Needs the checker.

**Property 5, human-only kept.** Re-entry, scans, double checks, and
acknowledgments are never prefilled, skipped, or automated by a macro, and a
double check needs a second user.

The patient record makes a commit possible at all: a medication scan
needs a medication to give.

From every reachable state, each required commit not yet done can still
be done by the human, with some list of events. The hard stop never leaves
the user stuck.

**Property 6, completable.** For every patient record that allows the
commit at all, each commit the program must support stays reachable from
every reachable state: the user can always enter what is required, see what
must be reviewed (or enter its waiver), and acknowledge alerts. Needs the
checker.

When a commit happens, every required quantity counts only in the spec's
unit: a weight in lb never satisfies a weight in kg. By construction (T0).

A quantity field is prefilled from the record only from `weightToday`,
which keeps the unit it was recorded in. Other record values are bare numbers
with no unit or date (e.g. a weight in lb, or yesterday's weight), so they may
not fill a quantity. Needs the checker.

**Property 7, units.** Weight in kg only, and the dose check uses kg
(the interpreter's dose check reads only kg weights).

The program asks for no more popups, on screens reachable from its start,
than the canonical program does. Needs the checker.

At most `stabilityBudget` components moved since the previous version
(moved: same tag, different screen or parent; copies do not count). Needs the
checker.

**Property 8, budgets.**

When a commit happens, every interruptive alert about it was acknowledged
for each thing it fires for (it popped up and the human handled it). By
construction (T0).

In every reachable state whose screen has a workflow targeted by a passive
alert, if its condition holds, the alert is shown inline. Needs the checker.
`targetsScreen` is the interpreter's workflow-tag matching rule.

No macro step clicks or types into an alert component. Needs the checker.

**Property 9 (A1), alerts fire when they should.**

An alert appears only when its condition holds: a popup only for an alert
of the spec whose condition holds for that key, and an alert component is
shown only while its condition holds. By construction.

The program never asks an interruptive alert to pop up by itself.
Interruptive alerts pop up from the spec, when their condition holds, at their
commit; a popup placed by the program would not be tied to that. (Passive
alerts are property 12.) Needs the checker.

**Property 10 (A2), no false alarms.**

An interruptive alert interrupts at most once per episode for the same
key (alert, drug, data version): acknowledgments are never lost, a popup
stays until it is acknowledged, and an acknowledged popup never comes back.
By construction.

The program never asks the same interruptive alert to pop up on two
different screens. Needs the checker.

**Property 11 (A3), no repeat interruptions.**

Passive alerts never pop up. By construction.

The program never asks a passive alert to pop up. Needs the checker.

**Property 12 (A4), severity tiers.** Passive alerts never pop up; only
interruptive and removable ones may.

**A certified program.** `prog` satisfies properties 1–13 against `spec`,
given the previous deployed version `prev` (if any) and the vendor's
`canonical` program.

Source: lean/Ehr/Props/Navigation.lean

D5 checks the actual semantic renderer's navigation tree: unique group and
within-group labels, at most twelve groups/entries, and every program screen
represented. This observes `uiNav`; it does not invent a second navigation model.

The renderer ignores the spec parameter: both names check the same tree.

## Design rules D1–D6

 (theorems over every program, record, and state). Just enough to rule out bad UI:**
- **D1 Landmark:** exactly one banner, first, with at least two patient identifiers (name + DOB or MRN), on every screen.
- **D2 Required info visible:** on a screen with a commit button, every applicable required review item appears in `workspace` (not only in `side` or a non-selected tab), as an `info` node with all relevant rows (generalizes T10/T11).
- **D3 Honest actions:** every button has a non-empty label; a `primary` button exists only for commits and is `enabled` iff the interpreter's view enables it; a disabled button has a blocked reason.
- **D4 Alert presentation:** an interruptive alert that fires appears as `modal`; a passive alert appears only inline (`alert` node), never as `modal`.
- **D5 Sane navigation:** within a nav group, and among group labels, no duplicate labels; at most 12 entries per group and at most 12 groups; every screen of the program appears in nav (no orphans).
- **D6 Clear fields:** every field has a non-empty label; `humanOnly` and `provenance` flags are set exactly as the interpreter's view says; `pendingConfirm` fields have a confirm affordance.



## Active spec rules, labels and citations

Every prompt includes the persona's formalRuleContext, derived from the active releases/<version>/spec.json, its role and workflow commits; it includes exact entry/review/alert conditions, budgets and source docstrings with citations. Full exported spec follows it. Only active rules are listed; source catalog additions are not imported as obligations under core.

## Certification and deployment

Each candidate is pre-screened. Compatible candidates are merged, then checked as ONE program. The whole merged version passes offline screen visibility, legibility, no-cover and ARIA fidelity checks before real ehr deploy re-checks it. A refusal publishes nothing. The per-user login pointer is replaced atomically after program, components, certificate and build binding are staged. Next login loads the certified fork; release migrations preserve customizations where certification permits. Stability and alert budgets come from spec.design and alert tiers; no budget is relaxed.

Counterexample: {violation:{property,message,counterexample:[Event],screens:[ScreenId]}}. Replay the events to see why the checker refused the design; repair the program, never the rule.

## Recorded examples

rejected (historical full-profile run1-P3, night-01): {"candidate":{"summary":"Put human allergy review in the home and shift-worklist sidebars.","patch":[{"op":"add","path":"/screens/[id=home]/components/[id=home.sidebar]+","value":{"id":"home.side.allergiesEarly","kind":{"panel":{"info":"allergyList"}},"label":"Allergies","parent":"home.sidebar","tab":0,"visibility":"always","size":"compact","tag":"home.side.allergiesEarly","copyOf":"home.chart.allergyList"}},{"op":"add","path":"/screens/[id=home]/components/[id=home.side.allergiesEarly]+","value":{"id":"home.side.reviewAllergiesEarly","kind":{"button":{"action":{"markReviewed":{"info":"allergyList"}}}},"label":"Mark allergies reviewed","parent":"home.sidebar","tab":0,"visibility":"always","size":"compact","tag":"home.side.reviewAllergiesEarly","copyOf":"w4Worklist.review.allergyList"}},{"op":"add","path":"/screens/[id=w4Worklist]/components/[id=w4Worklist.sidebar]+","value":{"id":"w4Worklist.side.allergiesEarly","kind":{"panel":{"info":"allergyList"}},"label":"Allergies","parent":"w4Worklist.sidebar","tab":0,"visibility":"always","size":"compact","tag":"w4Worklist.side.allergiesEarly","copyOf":"w4Worklist.allergies"}},{"op":"add","path":"/screens/[id=w4Worklist]/components/[id=w4Worklist.side.allergiesEarly]+","value":{"id":"w4Worklist.side.reviewAllergiesEarly","kind":{"button":{"action":{"markReviewed":{"info":"allergyList"}}}},"label":"Mark allergies reviewed (start of shift)","parent":"w4Worklist.sidebar","tab":0,"visibility":"always","size":"compact","tag":"w4Worklist.side.reviewAllergiesEarly","copyOf":"w4Worklist.review.allergyList"}},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.alert.drugAllergy]/kind/alert/popup","value":true},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.alert.highAlert]/kind/alert/popup","value":true},{"op":"replace","path":"/macros/[id=w5FluVaccine]/steps","value":[{"setValue":{"comp":"w5Immunizations.vaccine","value":"150"}},{"setValue":{"comp":"w5Immunizations.vaccineRoute","value":"IM"}}]}]},"check":{"status":"fail","property":"noFalseAlarms","message":"A2: alert w4Admin.alert.drugAllergy on screen w4Admin makes the interruptive alert drugAllergyAdmin pop up on its own; it must pop up only when its condition holds, at its commit"}}

accepted by checker (historical full-profile run1-P3, night-02): {"candidate":{"summary":"Make administration review information and entry controls compact.","patch":[{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.dose]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.allergies]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.glucose]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.coag]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.prn]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.fiveRights]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.wristbandScan]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.medScan]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.highAlertCosign]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.painScore]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.documentation]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.adminStatus]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.adminReason]/size","value":"compact"},{"op":"replace","path":"/screens/[id=w4Admin]/components/[id=w4Admin.adminSite]/size","value":"compact"}]},"check":{"status":"pass","property":null,"message":null}}
