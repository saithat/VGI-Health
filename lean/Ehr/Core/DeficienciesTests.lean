import Ehr.Core.Deficiencies
import Ehr.Examples.TinyTests
import Ehr.Render.PatientWorkspace

/-!
# Deficiency and reconciliation tests on the tiny example

Each check runs the real interpreter, guard and deficiency computation.
-/

namespace Ehr.Deficiencies.Tests

open Ehr Ehr.Examples.Tiny Ehr.Examples.TinyTests

/-! ## ADT movement -/

#guard movement (some ⟨3, 1, true⟩) (some ⟨4, 1, true⟩) == .transfer
#guard movement (some ⟨3, 1, true⟩) (some ⟨4, 1, false⟩) == .discharge
#guard movement (some ⟨3, 1, true⟩) (some ⟨6, 5, true⟩) == .discharge
#guard movement (some ⟨3, 1, true⟩) (some ⟨3, 1, true⟩) == .unchanged
-- An outpatient or ED draft is not an inpatient draft.
#guard movement (some ⟨3, 0, false⟩) (some ⟨4, 4, true⟩) == .unchanged
-- Unknown stamps change nothing.
#guard movement none (some ⟨4, 1, true⟩) == .unchanged
#guard movement (some ⟨4, 1, true⟩) none == .unchanged

/-! ## Draft reconciliation -/

/-- The unsigned order at the sign screen, saved as a draft. -/
def draft0 : PatientDraft := { patient := "p1", captured := atSignTab.captured, acked := [] }

-- A transfer tags exactly the order-line captures (drug and dose).
#guard ((reconcileDraft spec draft0 .transfer).captured.filter (·.provenance? == some reconcileTag)).map (·.element)
  == ["drug", "dose"]
-- A discharge removes them and keeps the rest; the removed lines are returned.
#guard (reconcileDraft spec draft0 .discharge).captured.map (·.element) == ["weight", "patientIdReentry"]
#guard (discarded spec draft0 .discharge).map (·.element) == ["drug", "dose"]
#guard discarded spec draft0 .transfer == []
#guard reconcileDraft spec draft0 .unchanged == draft0
-- The store changes only the named patient's draft.
#guard Workspace.draft (reconcileStore spec { atSignTab with patientDrafts? := some [draft0, { draft0 with patient := "p2" }] } "p1" .discharge) "p2"
  == { draft0 with patient := "p2" }

/-! ## The guard and the per-line decision -/

/-- The chart reopened after a transfer: its restored order line is tagged. -/
def pending : State :=
  { atSignTab with captured := (reconcileDraft spec { draft0 with captured := atSignTab.captured } .transfer).captured }

#guard reconcilePending pending
#guard reconcileSlots pending == [0]
#guard isBlocked (stepH pending (.click "signButton")).2
#guard reason (stepH pending (.click "signButton")).2 ==
  "Needs reconciliation: choose keep, change or discontinue for each order line restored after the transfer"
#guard (stepH pending (.click "signButton")).1.commits == []
-- A macro cannot decide; an unknown value is refused; another line is ignored.
#guard isBlocked (step spec program facts user .«macro» pending (.enter (reconcileComp 0) (.code "keep"))).2
#guard (step spec program facts user .«macro» pending (.enter (reconcileComp 0) (.code "keep"))).1 == pending
#guard isBlocked (stepH pending (.enter (reconcileComp 0) (.code "maybe"))).2
#guard (stepH pending (.enter (reconcileComp 3) (.code "keep"))).2 == .ignored
-- Another role may not decide for lines it may not enter.
#guard isBlocked (stepH pending (.enter (reconcileComp 0) (.code "keep")) (u := { id := "n1", role := .rn })).2

/-- Keep: the line is signed as it was. -/
def kept : State := (stepH pending (.enter (reconcileComp 0) (.code "keep"))).1

#guard (stepH pending (.enter (reconcileComp 0) (.code "keep"))).2 == .ok
#guard !reconcilePending kept
#guard (cap kept "drug").bind (·.provenance?) == some "reconciled:keep"
#guard (cap kept "drug").map (·.value) == (cap atSignTab "drug").map (·.value)
#guard (stepH kept (.click "signButton")).1.commits == ["signOrders"]

/-- Change: the line stays, is selected for editing, and is no longer pending. -/
def changed : State := (stepH pending (.enter (reconcileComp 0) (.code "change"))).1

#guard !reconcilePending changed
#guard (cap changed "drug").bind (·.provenance?) == some "reconciled:change"
#guard changed.currentSlot == 0

/-- Discontinue: the line's order captures are removed; nothing is left to sign. -/
def dropped : State := (stepH pending (.enter (reconcileComp 0) (.code "discontinue"))).1

#guard (cap dropped "drug").isNone && (cap dropped "dose").isNone
#guard (cap dropped "patientIdReentry").isSome
#guard reason (stepH dropped (.click "signButton")).2 == "entry required: drug"
#guard (stepH dropped (.click "signButton")).1.commits == []

-- New specification for owner review: reconciliation retains historical entry
-- time while ordinary replacement receives the new trusted clock.
def timedPending : State := { pending with captured := pending.captured.map fun c => { c with enteredAt? := some 900 } }
#guard ((step spec program { facts with epochMinute? := some 1000 } user .human timedPending
  (.enter (reconcileComp 0) (.code "keep"))).1.captured).all (·.enteredAt? == some 900)

-- Re-entering a tagged value keeps the tag (the field is on the order screen).
def reentered : State := run { pending with screen := "order" } [.enter "doseField" (.qty 2500 .mg)]

#guard (cap reentered "dose").map (·.value) == some (.qty 2500 .mg)
#guard (cap reentered "dose").bind (·.provenance?) == some reconcileTag

-- The chart shows one reconciliation control per pending line.
#guard (Render.reconcileNodes pending).length == 1
#guard (Render.reconcileNodes kept).isEmpty

/-! ## Deficiency list -/

/-- A chart whose saved order draft was saved at minute 1000. -/
def chart (now : Int) (commits : List CommitId := []) (saved current : Option AdtStamp := none)
    (discards : List DiscardedDraft := []) : ChartInput :=
  { patient := "p1", encounter := "e1", facts := { facts with epochMinute? := some now }, commits,
    adt? := current, drafts := [{ checkpoint := "c1", draft := draft0, savedAt := 1000, adt? := saved }],
    discards }

-- Pending until the local-policy deadline (1440 minutes after saving), then delinquent.
#guard (deficiencies spec user [chart 1500]).map (·.status) == [.pending]
#guard (deficiencies spec user [chart 1500]).map (·.deadline?) == [some 2440]
#guard (deficiencies spec user [chart 3000]).map (·.status) == [.delinquent]
-- A signed commit is never listed.
#guard (deficiencies spec user [chart 3000 ["signOrders"]]).isEmpty
-- A role that does not perform the commit sees nothing.
#guard (deficiencies spec { id := "n1", role := .rn } [chart 3000]).isEmpty
-- After a transfer the draft row says it needs reconciliation.
#guard (deficiencies spec user [chart 1500 [] (some ⟨1, 1, true⟩) (some ⟨2, 1, true⟩)]).map (·.label)
  == ["Unsigned draft: Sign orders (needs reconciliation)"]
-- After a discharge the order lines are listed as discarded; the rest of the draft remains.
#guard (deficiencies spec user [chart 1500 [] (some ⟨1, 1, true⟩) (some ⟨2, 1, false⟩)
    [{ checkpoint := "c1", encounter := "e1", captured := discarded spec draft0 .discharge }]]).map (·.status)
  == [.pending, .discardedAtDischarge]
-- The work list is a workspace activity with patient names.
#guard (activity [{ id := "p1", name := "Doe, Jane", mrn := "1" }] (deficiencies spec user [chart 3000])).rows.map (·.fields)
  == [[("Patient", "Doe, Jane"), ("Item", "Unsigned draft: Sign orders"), ("Due", "1970-01-02 16:40 UTC"),
       ("Status", "Delinquent")]]

end Ehr.Deficiencies.Tests
