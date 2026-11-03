# Agent-authored language extensions

Status: **proposal, 2026-11-02; pending owner review; nothing built.** It
widens the design agent's role from writing UI programs to drafting new UI
primitives; the owner keeps approval of every admission. Section 9 lists the
decisions it needs. It changes no Specs, Props, Statements or Comparator files
and no existing release semantics. A fresh-context adversarial review (Codex,
2026-11-02) found 14 problems in the first draft; this version addresses them.

## 1. Summary

The overnight agent writes UI programs in a fixed language. When it wants a
design the language cannot express (a command palette, a multi-patient board),
its candidate is placed in the sandbox tier and can never deploy. Promoting a
primitive out of the sandbox is hand-built work today: a development lane
drafts it and the owner reviews it.

This proposal lets the design agent draft the promotion. A new primitive is a
value of a fixed, owner-reviewed Lean type, an **admission**, whose fields are
the primitive's definitions plus the proofs its extension class demands. The
kernel checks the proofs. Everything the agent cannot prove (painting,
instrumentation, browser behavior) either comes from owner-controlled code or
goes through the existing declarative presentation sandbox, which never runs
agent JavaScript. The owner approves each admission before it ships in a
release. The agent changes the vocabulary. It never changes the rules, the
properties, the meaning of existing primitives, the checker, the simulator, the
gates or the metrics.

In short: the language evolves; the contract does not. Section 3 records why we
are not building a new self-modifying language instead.

## 2. What exists now

| Piece | Today | Where |
|---|---|---|
| Program language | Screens of typed components (fields, panels, tables, groups, tabs, macros, search, …) run by the Lean interpreter. The agent proposes JSON programs or RFC 6902 patches; `ehr check` certifies them. | `lean/Ehr/Core/Types.lean`, `agent/src/schema.ts` |
| Templates | Agent-source templates (`ComponentDef`) already lower in TypeScript before native checking; safety is checked on the expanded program. Native Lean expansion (`Kind.use`) is a pending patch. | `agent/src/composites.ts`, `agent/src/ehr.ts`, `lean/Ehr/Core/composites-pending.patch` |
| Presentation sandbox | Agent presentation components are compiled from a declarative TSX subset (allowlisted wrappers, one JSX return, props `{ node, onEvent }`); agent JavaScript is never evaluated. | `agent/src/presentation-compiler.ts` |
| Admission type | `PresentationExtension`: a screen transformer plus a kernel proof that the semantic observation `meaning` is unchanged, including order and multiplicity. One value exists: `timelineAdmission`. | `lean/Ehr/Sem/Admission.lean`, `Sem/Timeline.lean` |
| Extension contract | Five obligations per new primitive: typed constructor and schema; meaning adapter; kernel proofs; DOM painter; independent screen-gate projection with browser checks. Painter and gate stay trusted (tested, not proved). | [semantic-ui.md](semantic-ui.md), "Proof-gated extension interface" |
| Tiers | Proved, checked, sandbox. Sandbox never deploys; checked fails closed on missing evidence. | [design-space.md](design-space.md) |
| Sandbox primitives | Round 2 built four: command palette (r2-005), spatial pinned zones (r2-006), multi-patient board (r2-007), source-dated timeline (r2-008). All are sandbox. The palette has kernel lemmas (`command_reachable`, `resolve_authority`, `commands_honest`) for click resolution only; the browser palette also emits confirm and acknowledge events, which no proof covers yet. | `lean/Ehr/Sem/Exotic.lean`, `app/src/ehr/ui/Exotic.tsx`, [exploration-round2.md](exploration-round2.md) |
| Hand promotion in progress | `lane/promote` is promoting the board and the dated timeline. As of 2026-11-02 its tracked, uncommitted diff touches 34 files (+1,126 / −189 lines) and adds three `UiNode` constructors; it also has 12 untracked files (1,839 lines), including `Sem/Board.lean`, `Sem/BoardView.lean` and both painters. | worktree `VGI-promote` |
| Who approves | semantic-ui.md: "Restrict generation to admitted primitives; proposing a new primitive starts a separate reviewable language-extension change with proofs and screen rules … Human review owns … admission of new semantics." | [semantic-ui.md](semantic-ui.md), "Overnight exploration proposal" |

Two facts shape the design.

* **`UiNode` is a closed inductive type.** A new constructor reaches every proof
  that does case analysis on it, which is why one promotion spans dozens of
  files. An agent cannot add a primitive locally today.
* **Round 2 did not show that the new primitives help.** Across 12 held-out
  simulated physicians (24 task executions per design), the stock list/stack had
  the lowest effort per task (55.3); the four sandbox primitives ranged from 63.6
  to 125.6. The board and dated timeline cut mouse travel (5,129 and 4,931 px per
  task, against 9,153), but the already-admitted ordered timeline (r2-004)
  reached 5,490 px. The pilot must measure benefit, not assume it.

## 3. Alternative considered: a new self-modifying language

The owner asked (2026-11-02) whether the agent should instead live in a new
language whose type system and runtime evolve together. Not recommended:

1. **The contract is what makes proofs mean something.** If the agent can
   change the type system, it can change what "safe" means, and its proofs then
   certify the new definition rather than the one the owner reviewed. Checking a
   particular successor's proofs in the same logic is fine; this proposal does
   exactly that. What a logic cannot do is trust everything it proves about
   itself: by Löb's theorem, a theory like Peano arithmetic, with its standard
   provability predicate, proves "if P is provable then P" only for P it already
   proves. Yudkowsky and Herreshoff (2013) study workarounds for self-modifying
   agents. We take the simpler engineering route: a fixed, owner-reviewed
   contract. Lean already has that shape: a small kernel, with syntax, elaborator
   and tactics extended in Lean itself.
2. **Measurement validity.** Comparing effort across revisions needs fixed
   semantics and a versioned, owner-controlled measurement protocol.
3. **Review.** The 44 Comparator-checked headline statements can be reviewed. A
   language whose semantics change with each revision cannot.
4. **Prior work.** The Gödel machine (Schmidhuber, 2003) rewrites itself only
   after proving the rewrite helps. The Darwin Gödel Machine (Zhang et al., 2025)
   replaced such proofs with benchmark scores, citing the difficulty of proving
   that realistic changes help. Its authors also report objective hacking: the
   agent changed logging markers that a hidden checker relied on, without
   editing the checker itself.
5. **Cost.** Years of programming-language work, none of which moves the current
   bottlenecks: agent-loop time, EHR realism and rule coverage.

This proposal keeps the useful part: the agent extends the language, but only by
constructing values of fixed types.

## 4. Goals and non-goals

Goals:

* The agent can take a sandbox primitive to the proved (semantics) and checked
  (browser) tiers without a hand-built lane, within an owner-reviewed class.
* A new primitive is local: one Lean namespace, one declarative presentation and
  one manifest entry, with no edits to core types, existing proofs, specs, gates
  or metrics.
* Every admission is kernel-checked against obligations the owner approved once
  per class.
* Measure whether this works (proof success, cost, review findings) and whether
  admitted primitives help (predeclared held-out criteria).

Non-goals:

* No change to Specs, Props, Statements, Comparator files, the checker, the
  simulator or the gates. Metric definitions and cost entries change only through
  owner-approved, versioned measurement protocols (section 5.6).
* The agent never writes extension classes (the contract types), interaction
  widgets, gate checks or instrumentation. Owner-reviewed lanes do.
* No new clinical events, persistence authority or patient scoping. Class S
  (section 5.2) stays hand-built.
* Nothing ships outside a release. No claim about pixels beyond what the screen
  gate measures.

## 5. Design

### 5.1 Three layers

| Layer | Contents | Who changes it | Gate |
|---|---|---|---|
| Contract | Lean kernel; core semantics; Specs; Props; Statements; `meaning`, `Perceives`, urgency policy; extension class types; `ext` erasure; checker; simulator; measurement protocols and cost tables; gate core; interaction widgets and event dispatcher; release manifest | Owner-reviewed lanes only | Owner review, Comparator, existing audits |
| Vocabulary | Admitted primitives (admission values plus declarative presentations) | The design agent (new) | Pipeline (5.4) and owner approval; ships in a release |
| Programs | Per department × role revisions | The design agent (as today) | `ehr check`, simulator, screen gate |

Language changes follow the release cadence. Program changes follow the
personalization cadence.

### 5.2 An admission is a value of a fixed type

The agent "lives in the type" in a precise sense: its job is to construct a value
whose type lists every obligation. It cannot construct the value without the
proofs, and it cannot weaken the obligations, because the type is owner-reviewed
and outside its writable paths. Each type must be written so that trivial values
fail: a palette that offers nothing, or a view type with no states, must not
satisfy it.

| Class | What it may do | Obligations (fields of the type) | Status |
|---|---|---|---|
| P, presentation | Insert `ext` wrappers around emitted nodes | `erase (layout s) = s` for every screen, where `erase` is core-owned and removes `ext` wrappers. This recovers the whole screen (regions, modal, urgent strip, metadata), so every existing guarantee transfers; meaning equality follows. | Replaces `PresentationExtension`, whose arbitrary transformer and `meaning` equality allow, for example, moving the workspace into the sidebar or clearing the urgent strip |
| V, view state | Add view steps (focus, filter, zoom, pinned regions, typed command entry) on top of a class P layout | See below | To write, generalized from `BoardView` and `Ready` once `lane/promote` lands |
| S, scoped composition | Compose several sessions or patients (the board) | Patient namespaces, receipt scoping, global modal authority | Hand-built only |

Class V obligations, all stated over the primitive's own view states:

* an **initial view** for every screen, and an **interpretation** of each view
  as a measured `Moment` over the unchanged screen;
* view steps leave the **interpreter state unchanged**;
* **authority**: a submission resolves only to an event the screen currently
  offers and that is enabled, using a fixed, owner-defined `OfferedEvent` that
  covers click, confirm and acknowledge, active-modal ownership and
  human-gesture requirements;
* **completeness**: every enabled offer can be submitted within a stated number
  of view steps from the initial view (`ActionWithin`), and required review
  content is `Available` within a stated bound;
* **urgency**: while an urgent condition is clinically active under the fixed
  policy (`Sem/Urgency.lean`), it is perceived at every reachable view, under
  measured exposure evidence;
* **examples** that instantiate these premises: one canonical screen where the
  primitive is used and every obligation's premises hold, and one known-bad
  screen that stays rejected.

The browser's actual transitions must refine `step`. That refinement is measured
by owner-controlled gate checks and replay (5.4, 5.6); it is not proved. Writing
the real class V type is a contract change (section 9).

### 5.3 Keep new primitives local

An owner-reviewed lane adds one constructor, once:
`UiNode.ext (id : ExtId) (children : List UiNode)`, observed transparently: its
atoms are exactly its children's atoms, in order, and `erase` removes it.
Existing proofs handle `ext` once.

An owner-controlled **release manifest** binds each extension ID to its class,
the fully qualified Lean constant of its admission, its schema, its declarative
presentation, the interaction widgets it uses, and their hashes. IDs are unique
and immutable; a release rejects missing, duplicate, mismatched or unknown
entries. Programs opt in per component by ID, under composition rules the
manifest states (for example, which classes may nest).

Trade-off: a primitive that needs a new observation, such as the board's
per-patient namespaces, still needs a core change. That is class S and stays
hand-built.

### 5.4 Admission pipeline

1. **Backlog from sandbox demand.** The explorer already marks candidates that
   need an unsupported primitive as sandbox. Tally them per primitive, with their
   sandbox simulation results. The owner, or a rule the owner sets, picks what
   the agent attempts.
2. **Agent draft.** In its own worktree (Codex): Lean declarations in namespace
   `Ehr.Ext.<id>`, a declarative presentation and examples. A change outside the
   writable paths fails the pipeline.
3. **Lean source and environment rules.** The source check is recursive,
   including tactic blocks. Allowed: `def`, `theorem`, `structure`, `abbrev`,
   `example`, namespaces, and `simp` attributes local to the namespace.
   Forbidden: `sorry`, `axiom`, `opaque`, `partial`, `unsafe`, `instance`,
   `native_decide`, `decide +native`, `run_tac`, metaprogramming (`syntax`,
   `macro`, `elab`, `initialize`), compiler attributes (`implemented_by`,
   `extern`, `csimp`, `export`, `init`), and `set_option` beyond resource limits
   (`debug.skipKernelTC` would skip kernel checks). A syntax allowlist is not
   enough on its own, so the pipeline also elaborates the namespace in an
   isolated clean build and checks the resulting environment. Every new constant
   must be inside `Ehr.Ext.<id>`; no initializer, compiler or extern
   registrations; and the axioms of every new constant are within `propext`,
   `Classical.choice` and `Quot.sound`. Compiler attributes matter because they
   would let the WASM runtime differ from the proved definition.
4. **Kernel check.** The constant named in the manifest has its class type, and
   it and all its dependencies are replayed in the kernel.
5. **Presentation.** The presentation compiles through
   `agent/src/presentation-compiler.ts`: allowlisted wrappers and widgets only,
   with no hooks, globals, side effects or agent JavaScript. Interaction (text
   entry, focus, filtering, zoom) comes only from owner-reviewed widgets, whose
   events pass through a trusted dispatcher with a fixed event mapping. A
   primitive that needs a new widget waits for an owner-reviewed lane to add it.
6. **Gates.** All existing gates must still pass: every canonical and persona
   program passes `ehr check`; the full build and
   `scripts/audit-verification.sh` pass; Comparator files are untouched. The
   owner-controlled, class-generic screen-gate checks must also pass (complete
   child content, event authority, modality, patient binding), along with
   positive and adversarial browser checks across the WCAG viewport matrix.
   These checks record the actual emitted event sequences.
7. **Benefit gate.** Before any held-out run, record:
   - the primary objective (held-out effort per task);
   - the minimum useful improvement;
   - non-regression requirements on completion and urgency exposure;
   - how uncertainty is reported.

   An admission that misses these fails, whatever its proofs.
8. **Owner approval** of the admission, its review record and its benefit
   report. Only then does it leave the sandbox tier. Its semantics then count as
   proved and its browser refinement as checked. It enters the next release; the
   build hash changes and certificates bind to it as today.
9. **Use.** The design agent may use the primitive in programs from that release
   on.

### 5.5 What remains trusted

Owner-reviewed widgets, the event dispatcher, the presentation compiler, the
gate's class-generic checks and the instrumentation are trusted code, as the
painter and gate are today. Admission removes agent-written JavaScript from that
trusted set; it does not remove the set.

### 5.6 Measurement

* The current KLM fold (`lean/Ehr/Sim/Metrics.lean`) consumes recorded
  operations. Round 2 measured target geometry and then dispatched the
  interpreter event directly, without replaying a palette's focus, filter and
  selection keystrokes. So a primitive's benefit can be claimed only after
  owner-controlled instrumentation replays its actual view actions.
* A new interaction kind (typing a command, zooming, dragging) needs a cost
  entry. Entries come only from an owner-reviewed table with a cited source,
  such as the Keystroke-Level Model operator times (Card, Moran and Newell,
  1980, which `Metrics.lean` already cites). Unsourced entries are labeled
  "simulation assumption", as in [shared-world-sim.md](shared-world-sim.md).
  Adding entries creates a new measurement protocol version; results under
  different versions are not compared directly.
* Interactions without a cost entry or replay are rejected for benefit
  purposes.
* Benefit is judged on held-out cohorts and, once built, the shared-world
  simulation; never on the days used to choose the primitive.

## 6. Risks

| Risk | Mitigation |
|---|---|
| The agent games its score, including through signals a checker reads (the Darwin Gödel Machine pattern) | No write access to the checker, simulator, instrumentation, cost tables, gate checks, widgets or cohorts; replay of actual view actions; predeclared held-out benefit gate |
| A vacuous admission (offers nothing, no reachable views, contradictory premises) | Class types require an initial view, completeness and examples that instantiate the premises |
| The layout changes more than presentation | Class P requires `erase (layout s) = s`, which recovers the whole screen, not just `meaning` |
| Runtime differs from the proved definition | Environment check bans compiler, extern and initializer registrations; clean isolated rebuild; WASM built from the same Lean |
| Browser behavior diverges from the view model | Declarative presentations only; owner-reviewed widgets and dispatcher; class-generic gate checks of emitted events; still tested, not proved |
| Manifest mix-ups (a painter bound to a different admission) | Owner-controlled manifest with unique immutable IDs, Lean constant names and hashes; release fails on any mismatch |
| Vocabulary sprawl | Owner-approved backlog; predeclared benefit gate; release notes list vocabulary changes |
| Relearning cost for clinicians | Existing stability budget and release cadence; new primitives appear only in releases |

## 7. Pilot

**Phase 0, prerequisites** (lanes, owner-reviewed):

* Let `lane/promote` land. Freeze a complete inventory of its cost as the
  hand-built baseline: tracked and untracked files, proof lines, agent time and
  review rounds.
* Add `UiNode.ext`, `erase` and the class P type; port `layout.timeline` to it
  with no behavior change.
* Write the class V type, generalized from `BoardView`, for owner review.
* Harden the round-2 palette input into an owner-reviewed widget, with a trusted
  dispatcher covering click, confirm and acknowledge.
* Build the pipeline: path allowlist, source and environment checks, manifest,
  class-generic gate checks, replay instrumentation.

**Phase 1, one agent admission:**

* Target: the command palette (r2-005), as a class V admission using the
  hardened widget. It is not part of `lane/promote`, it maps onto existing
  events, and partial kernel lemmas exist.
* Budget: at most 5 agent attempts.
* Record attempts, time, tokens, proof lines and review findings against the
  Phase 0 baseline.

**Phase 2, close the loop:**

* Sandbox demand feeds the backlog automatically; the design agent uses admitted
  primitives after the next release.
* Apply the predeclared benefit gate on held-out cohorts, with and without the
  admitted vocabulary.

**Stop if:**

* Phase 1 fails within budget, or reviewers find a defect the pipeline missed.
  Keep hand-built lanes and record why.
* The palette fails its predeclared benefit gate. Do not grow the vocabulary
  until the reason is understood.

## 8. What this does not establish

* Pixel correctness. Physical exposure stays measured evidence, as today.
* Correctness of widgets, dispatcher, presentation compiler or instrumentation.
  They are reviewed and tested, not proved.
* General workflow completion, which remains open.
* That a primitive helps real clinicians. Evidence is simulated only.

## 9. Owner decisions needed

1. **Authorship.** Let the design agent draft language-extension changes, which
   dev lanes draft today. Admission stays with human review, as semantic-ui.md
   already requires. Recommended: yes.
2. **Approval.** Owner approval of every admission before a release
   (recommended), or automatic admission for class P.
3. **Core change.** One transparent `UiNode.ext` constructor with core-owned
   `erase` (recommended), or a new constructor per primitive as today.
4. **Class contracts.** Approve replacing `PresentationExtension` with the class
   P type, and writing the class V type from the board's view proofs after
   `lane/promote` lands.
5. **Presentation trust.** Agent presentations only through the declarative
   sandbox, with interaction from owner-reviewed widgets (recommended), or allow
   reviewed agent JavaScript.
6. **Measurement.** New interaction costs only from the owner-reviewed, sourced
   table, with versioned measurement protocols and replay required
   (recommended).
7. **Benefit gate.** Primary objective and threshold for the pilot, for example
   held-out effort per task at least 5% lower than the best admitted design, with
   no loss of completion or urgency exposure.
8. **Pilot target.** The command palette (recommended).
