import Ehr.Sem.Examples
import Ehr.Sem.Admission
import Ehr.Render.Json

/-! Admission proof for the ordered, full-detail clinical timeline primitive. -/
namespace Ehr.Sem
open Ehr Render

/-- Opt-in layout; shell, side controls, modal and interpreter are unchanged. -/
def timelineScreen (s : UiScreen) : UiScreen :=
  { s with workspace := [.timeline "Clinical timeline" s.workspace] }

@[simp] theorem timeline_atoms (title children) :
    uiAtoms (.timeline title children) = uiAtomsList children := by simp [uiAtoms]

/-- Preserves order and multiplicity, not just set membership. -/
@[simp] theorem timeline_meaning (s : UiScreen) : meaning (timelineScreen s) = meaning s := by
  simp [meaning, timelineScreen, baseAtoms, uiAtoms, uiAtomsList, uiBannerAtom]

/-- A rendering extension can be constructed only with its preservation proof. -/
def timelineAdmission : PresentationExtension := ⟨timelineScreen, timeline_meaning⟩

def renderTimelineUi (sp : Spec) (prog : Program) (facts : Facts) (disp : Display)
    (user : User) (state : State) : UiScreen :=
  timelineAdmission.transform (renderUi sp prog facts disp user state)

/-- Admission obligation for *every* semantic screen predicate. In particular
perception, urgency, reviews, action honesty, fields, tier and step bounds. -/
theorem timeline_preserves (P : Screen → Prop) (s : UiScreen) :
    P (meaning (timelineScreen s)) ↔ P (meaning s) := by rw [timeline_meaning]

theorem timeline_reviews (cx : Ctx) (hn : (rendered cx).modal = none) :
    Reviews (meaning (renderTimelineUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)) exposed
      ((uiRequiredReviews cx).map fun r => (r.info, uiRows cx r.info)) := by
  simpa [renderTimelineUi, timelineAdmission, rendered] using D2_semantic cx hn

theorem timeline_honest (cx : Ctx) :
    Honest cx (meaning (renderTimelineUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)) := by
  simpa [renderTimelineUi, timelineAdmission, rendered] using D3_semantic cx

theorem timeline_perception (s m f) :
    Perceives (meaning (timelineScreen s)) m f ↔ Perceives (meaning s) m f := by simp

theorem timeline_reachability (s edge bound m id) :
    ActionWithin (meaning (timelineScreen s)) edge bound m id ↔
      ActionWithin (meaning s) edge bound m id := by simp

/-- Canonical full-detail event sequence. Dates remain ordinary supplied cells. -/
def canonicalTimeline : UiScreen := timelineScreen
  { Examples.goodUi with
    title := "Timeline review"
    workspace := [
      .info "history" "Earlier encounter" "encounterHistory" "table"
        [[("Recorded", "Oct 30, 2026"), ("Reason", "Medication review")]],
      .info "allergies" "Current allergies" "allergyList" "table" Examples.rows,
      .field "weight" "Weight" "qty" (some "70") (some "kg") none false true true,
      .button "next" "Continue" "secondary" true none none,
      .button "sign" "Sign" "secondary" false (some "Review required") none,
      .alert "warning" "interaction" "Interaction" "passive"] }

theorem canonical_reviews : Reviews (meaning canonicalTimeline) exposed [("allergyList", Examples.rows)] := by
  unfold canonicalTimeline
  rw [timeline_meaning]
  simp [Reviews, InformationShown, meaning, active,
    baseAtoms, uiAtomsList, uiAtoms, observe, Examples.goodUi]

theorem canonical_honest (cx : Ctx) : Honest cx (meaning canonicalTimeline) := by
  unfold canonicalTimeline
  rw [timeline_meaning]
  simp [Honest, supplied, meaning, baseAtoms,
    uiAtomsList, uiAtoms, observe, ActionHonest, Examples.goodUi, uiNavAtoms, uiBannerAtom]

/-- Wrapping does not repair a violation; admission preserves rejection too. -/
theorem timeline_rejects_lying (cx : Ctx) : ¬ Honest cx (meaning (timelineScreen Examples.lyingUi)) := by
  simpa using Examples.honest_bad cx

#print axioms timeline_atoms
#print axioms timeline_meaning
#print axioms timeline_preserves
#print axioms timeline_reviews
#print axioms timeline_honest
#print axioms timeline_perception
#print axioms timeline_reachability
#print axioms canonical_reviews
#print axioms canonical_honest
#print axioms timeline_rejects_lying
end Ehr.Sem
