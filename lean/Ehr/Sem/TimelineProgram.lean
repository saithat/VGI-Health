import Ehr.Sem.Timeline
import Ehr.Props.Examples
import Ehr.Check.Check

/-! A timeline emitted by ordinary renderUi, admitted by the existing checker. -/
namespace Ehr.Sem
open Ehr Render
set_option maxRecDepth 4096
set_option maxHeartbeats 800000

/-- All original clinical controls and IDs survive inside an expanded group. -/
def timelineProgram : Program :=
  { Props.Examples.goodProgram with
    screens := Props.Examples.goodProgram.screens.map fun sc =>
      if sc.id == "sign" then
        { sc with components :=
          [{ id := "eventAxis", label := "Signing review", kind := .group false true,
             tag := "layout.timeline" }] ++
          sc.components.map (fun c => { c with parent? := some "eventAxis" }) }
      else sc }

/-- The unchanged checker admits this layout extension against the good baseline. -/
theorem timelineProgram_checked :
    Check.check Ehr.Examples.Tiny.spec none Props.Examples.goodProgram timelineProgram = .ok := by decide

def timelineProgramState : State :=
  runAll Ehr.Examples.Tiny.spec timelineProgram Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user .human
    (init Ehr.Examples.Tiny.spec timelineProgram Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user)
    [.click "toOrder", .click "toSign"]

def timelineDisplay : Display :=
  { Display.empty with
    banner := { Display.empty.banner with name := "Example patient", mrn := "example-1" }
    allergies := [{ (default : AllergyRow) with
      id := "allergy-1"
      substance := "Penicillin"
      reaction := "Rash"
      status := "active" }] }

def timelineProgramCtx : Ctx :=
  { sp := Ehr.Examples.Tiny.spec, prog := timelineProgram, facts := Ehr.Examples.Tiny.facts,
    disp := timelineDisplay, user := Ehr.Examples.Tiny.user, s := timelineProgramState }

def canonicalTimelineProgramScreen : UiScreen := rendered timelineProgramCtx

/-- The canonical example reaches signing by ordinary human navigation. -/
theorem timelineProgram_at_sign : timelineProgramState.screen = "sign" := by decide

/-- The expanded signing group opts into the admitted timeline tag. -/
theorem timelineProgram_emits :
    ∃ it ∈ timelineProgramCtx.v.items,
      it.comp.id = "eventAxis" ∧ uiTimelineTag it.comp.tag = true := by decide

mutual
/-- Raw-tree observer, independent of the semantic atom erasure. -/
def containsTimeline : UiNode → Bool
  | .timeline _ _ => true
  | .board _ kids | .datedTimeline _ _ _ kids => containsTimelineList kids
  | .patientPane _ _ _ kids modal => containsTimelineList kids || containsTimelineList modal
  | .section _ _ kids | .columns kids | .tabs _ _ _ kids | .presentation _ kids
  | .valueSet _ _ kids | .chartReferences _ kids | .rowAction _ _ kids => containsTimelineList kids
  | _ => false
termination_by n => sizeOf n

def containsTimelineList : List UiNode → Bool
  | [] => false
  | n :: ns => containsTimeline n || containsTimelineList ns
termination_by ns => sizeOf ns
end

-- Executable regression: ordinary interpreter rendering emits the new primitive.
#guard containsTimelineList canonicalTimelineProgramScreen.workspace

theorem timelineProgram_honest : Honest timelineProgramCtx (meaning canonicalTimelineProgramScreen) :=
  D3_semantic _

theorem timelineProgram_reviews :
    Reviews (meaning canonicalTimelineProgramScreen) exposed
      ((uiRequiredReviews timelineProgramCtx).map fun r => (r.info, uiRows timelineProgramCtx r.info)) :=
  D2_semantic _ (by decide)

#print axioms timelineProgram_checked
#print axioms timelineProgram_at_sign
#print axioms timelineProgram_emits
#print axioms timelineProgram_honest
#print axioms timelineProgram_reviews
end Ehr.Sem
